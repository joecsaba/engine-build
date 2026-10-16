"""S&S Diesel Motorsport catalog extractor (task SS in CLOUD_TASKS.md).

Source: WooCommerce Store API on ssdiesel.com (bare host; the www certificate mismatches).
Public JSON, allowed by robots.txt (no Crawl-delay).

Phase 1 (fetch): parent-product listing and variation listing, 100 per page, saved verbatim
under dl/ss/ (resumable; one request at a time, >= 6 s apart).
Phase 2 (parse): emit `injector` and `injectionPump` records to out/ss.json and notes to
out/ss.md. Nothing is written outside dl/ and out/.

Catalog shape (2026-10): 33 parents, 291 variations. Injectors are variable products whose
"Application" attribute is the size (% over stock / TorqueMaster / SAC00) and, for the older
Cummins/Duramax lines, a "Type" attribute (New / Reman body). High-pressure pumps (CP3 in
10/12/14 mm plunger sizes, Ordnance, SuperSport, CP3 and DCR conversions for CP4 engines) are
variable products keyed by an "Application(s)" attribute. Descriptions are WPBakery shortcode
HTML; prices are integer cents and are not stored.

Usage: python -I extract_ss.py [--fetch-only | --parse-only] [--refetch]
"""
import argparse
import datetime as dt
import glob
import html
import json
import os
import re
import sys
import time
import urllib.robotparser as rp

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "ss")
OUT = os.path.join(HERE, "out")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
HOST = "https://ssdiesel.com"
API = HOST + "/wp-json/wc/store/v1/products?per_page=100&page={page}"
DELAY = 6.0
EDITION = dt.date.today().strftime("%Y-%m")
BRAND = "S&S Diesel Motorsport"
DOC = "ssdiesel.com WooCommerce Store API"

S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept": "application/json"})
_last_request = 0.0


# ----------------------------------------------------------------------------- fetch

def _wait(delay):
    global _last_request
    d = delay - (time.time() - _last_request)
    if d > 0:
        time.sleep(d)
    _last_request = time.time()


def robots_ok():
    """Fetch robots.txt, honor Crawl-delay, return (allowed, delay)."""
    _wait(DELAY)
    r = S.get(HOST + "/robots.txt", timeout=60)
    os.makedirs(DL, exist_ok=True)
    with open(os.path.join(DL, "robots.txt"), "wb") as f:
        f.write(r.content)
    p = rp.RobotFileParser()
    p.parse(r.text.splitlines() if r.status_code == 200 else [])
    url = API.format(page=1)
    allowed = p.can_fetch(UA, url) and p.can_fetch("*", url)
    cd = p.crawl_delay(UA) or p.crawl_delay("*") or 0
    return allowed, max(DELAY, float(cd))


def fetch_listing(prefix, url_tmpl, delay, refetch, log):
    """Page through one Store API listing, saving each page as dl/ss/<prefix>_NNNN.json.
    Resumable: a page already on disk (with its .meta sidecar) is not fetched again."""
    page, total_pages = 1, None
    while total_pages is None or page <= total_pages:
        path = os.path.join(DL, f"{prefix}_{page:04d}.json")
        meta_path = path + ".meta"
        if os.path.exists(path) and not refetch:
            if os.path.exists(meta_path):
                with open(meta_path, encoding="utf-8") as f:
                    total_pages = total_pages or json.load(f).get("total_pages")
            if total_pages is None:
                with open(path, encoding="utf-8") as f:
                    if len(json.load(f)) < 100:
                        break
            page += 1
            continue
        _wait(delay)
        url = url_tmpl.format(page=page)
        r = S.get(url, timeout=90)
        log.append({"url": url, "status": r.status_code, "bytes": len(r.content),
                    "at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")})
        print(f"[get] {r.status_code} {url} ({len(r.content)} bytes)", file=sys.stderr)
        if r.status_code in (403, 429) or "just a moment" in r.text[:2000].lower():
            print(f"Blocked ({r.status_code}); not retrying.", file=sys.stderr)
            sys.exit(3)
        r.raise_for_status()
        with open(path, "wb") as f:
            f.write(r.content)
        total_pages = int(r.headers.get("X-WP-TotalPages") or 1)
        meta = {"total": int(r.headers.get("X-WP-Total") or 0), "total_pages": total_pages,
                "fetched": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f)
        page += 1


def fetch(refetch=False):
    allowed, delay = robots_ok()
    if not allowed:
        print("robots.txt disallows the Store API; stopping.", file=sys.stderr)
        sys.exit(2)
    log = []
    fetch_listing("page", API, delay, refetch, log)
    fetch_listing("var", API + "&type=variation", delay, refetch, log)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "ss_fetch_log.jsonl"), "a", encoding="utf-8") as f:
        for rec in log:
            f.write(json.dumps(rec) + "\n")
    return log


def load_pages(prefix):
    items = []
    for path in sorted(glob.glob(os.path.join(DL, f"{prefix}_[0-9]*.json"))):
        with open(path, encoding="utf-8") as f:
            items.extend(json.load(f))
    return items


# ----------------------------------------------------------------------------- helpers

def clean(s):
    """Unescape HTML entities, strip WPBakery shortcodes and tags, collapse whitespace."""
    if s is None:
        return ""
    s = html.unescape(str(s))
    s = re.sub(r"\[/?[A-Za-z_0-9]+(?:\s[^\]]*)?\]", " ", s)  # [vc_row ...] [/vc_column_text]
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("’", "'").replace("‘", "'").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip()


def clean_sku(s):
    """Store SKUs are typed by hand: 'LML-CP3-TuningReq\\&#8217;d' -> "LML-CP3-TuningReq'd"."""
    return clean(s).replace("\\", "").strip()


def variation_attrs(v):
    """Parse 'Application: 100% over LB7 injector, Type: New' into {name: value}."""
    out = {}
    key = None
    for piece in clean(v.get("variation")).split(", "):
        if ": " in piece:
            key, val = piece.split(": ", 1)
            out[key.strip().lower()] = val.strip()
        elif key:
            out[key] += ", " + piece
    return out


def num(s):
    if s is None:
        return None
    m = re.search(r"-?\d[\d,]*\.?\d*", str(s))
    if not m:
        return None
    v = float(m.group().replace(",", ""))
    return int(v) if v.is_integer() else v


def drop_none(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def years_in(text):
    """'(2007.5-2018)' -> (2007, 2018, '2007.5-2018'); '(2017+)' -> (2017, None, '2017+')."""
    m = re.search(r"\((\d{4})(\.5)?\s*(?:-\s*(\d{4})(\.5)?|(\+))\)", text)
    if not m:
        return None, None, None
    y0 = int(m.group(1))
    y1 = int(m.group(3)) if m.group(3) else None
    label = m.group(0)[1:-1].replace(" ", "")
    return y0, y1, label


# ----------------------------------------------------------------------------- fitment

C59, C67, DMX, PS60, PS64, PS67 = ("Cummins 5.9 24V/CR", "Cummins 6.7", "Duramax 6.6", "Powerstroke 6.0",
                                   "Powerstroke 6.4", "Powerstroke 6.7")
KNOWN = {C59, C67, DMX, PS60, PS64, PS67, "Cummins 5.9 12V", "Powerstroke 7.3"}
CYL = {C59: 6, C67: 6, DMX: 8, PS60: 8, PS64: 8, PS67: 8, "BMW M57": 6}
# Catalog headings kept as fit.fam for parts with no family in the cam-fitment vocabulary.
BMW = "BMW M57"
UNIVERSAL = "Reverse Rotation High Pressure Pumps"  # front-mount competition pumps, engine not stated

DURAMAX_CODES = {"LB7": (2001, 2004), "LLY": (2004, 2005), "LBZ": (2006, 2007), "LMM": (2007, 2010),
                 "LML": (2011, 2016), "L5P": (2017, None)}  # as the site's own injector titles give them


def engine_of(name):
    """-> (fam, engine label, code) from a product title such as 'LMM Duramax Injectors (2007.5-2010)'."""
    n = name
    code = None
    m = re.search(r"\b(LB7|LLY|LBZ|LMM|LML|L5P)\b", n)
    if m:
        code = m.group(1)
    if "Duramax" in n:
        return DMX, f"{code} Duramax" if code else "Duramax", code
    if "Cummins" in n:
        if "5.9" in n:
            return C59, ("Late " if "Late" in n else "Early " if "Early" in n else "") + "5.9L Cummins", None
        return C67, "6.7L Cummins", None
    if "RAM" in n:
        return C67, "6.7L Cummins", None
    if "Power Stroke" in n or n.startswith("Ford"):
        if "6.4" in n:
            return PS64, "6.4L Ford Power Stroke", None
        if "6.0" in n:
            return PS60, "6.0L Ford Power Stroke", None
        return PS67, "6.7L Ford Power Stroke", None
    if "BMW" in n:
        return BMW, "BMW M57", None
    if "Reverse Rotation" in n:
        return UNIVERSAL, "reverse-rotation", None
    return None, n, None


# ----------------------------------------------------------------------------- records

def make_record(p, cat, name, fam, fit_extra, spec, url, emissions):
    fit = {"fam": fam, "cyl": CYL.get(fam)}
    fit.update(fit_extra)
    return {"m": BRAND, "p": p, "cat": cat, "name": name, "fit": drop_none(fit), "spec": drop_none(spec),
            "src": {"doc": DOC, "edition": EDITION, "url": url}, "emissions": emissions}


def kind_of(item):
    cats = {clean(c.get("name")) for c in item.get("categories") or []}
    name = clean(item.get("name"))
    if "Electronics" in cats:
        return "electronics"
    if "Injectors" in cats and item.get("type") == "variable":  # '6.4L Ford Power Stroke (2008-2010)' has no 'Injector' in its title
        return "injector"
    if re.search(r"High Pressure Pumps|CP3 Conversion|DCR Pump Conversion", name):
        return "pump"
    if "Feed Tubes" in name:
        return "feed tubes"
    if "Fuel Rail" in name:
        return "fuel rail"
    if "Filter Head" in name:
        return "filter head"
    if "Leak Prevention" in name or "Disaster Prevention" in name:
        return "fuel filter / bypass kit"
    return "other"


def flow_table(desc):
    """'250% (3700 cc/min)' statements in an injector description -> {pct: cc/min}."""
    return {int(p): int(f.replace(",", "")) for p, f in re.findall(r"(\d+)%\s*\((\d[\d,]*)\s*cc/min\)", desc)}


def injector_records(parent, var, va, qa):
    name = clean(parent.get("name"))
    desc = clean(parent.get("description"))
    fam, engine, code = engine_of(name)
    y0, y1, ylabel = years_in(name)
    app = va.get("application") or va.get("applications") or va.get("flow") or ""
    body = (va.get("type") or "").lower() or None
    p = clean_sku(var.get("sku"))
    url = var.get("permalink") or parent.get("permalink")
    flows = flow_table(desc)

    pct, grade = None, None
    m = re.search(r"(\d+)\s*%", app)
    if m:
        pct = int(m.group(1))
    elif re.search(r"\bStock\b|SAC00", app):
        pct = 0
    elif "SAC45" in app:
        pct = 45  # LB7 'SAC45' sits between the 30% and 65% sizes and its SKU is LB7-45SAC; flagged in notes
        qa.append(f"{p}: pctOver 45 inferred from the SAC45 name/SKU")
    elif "TorqueMaster" in app:
        grade = "TorqueMaster"
    elif "cc/min" in app:  # BMW: 'Flow: 2,250 cc/min'; description says 'Available sizes: 100% (2,250 cc/min)'
        flow = num(app)
        pct = next((k for k, v in flows.items() if v == flow), None)
    if "SAC00" in app or "SAC45" in app:
        grade = app.split()[0].replace("®", "")  # SAC00 / SAC45 (registered marks)
    tip = "VCO" if "VCO" in p else "SAC" if "SAC" in p else None
    if tip is None:
        tip = "SAC" if "SAC" in app else None
    spec = {
        "pctOver": pct,
        "grade": grade,
        "tip": tip,
        "nozzleFlow": num(app) if "cc/min" in app else flows.get(pct) if pct else None,
        "body": body,
        "set": True,
    }
    emissions = "unknown"
    if "SAC00" in app:
        eo = re.search(r"EO number (D-\d{3}-\d+)", desc)
        emissions = f"carb_eo:{eo.group(1)}" if eo else "unknown"

    notes = []
    if code:
        notes.append(code)
    if ylabel and (".5" in ylabel or "+" in ylabel):
        notes.append(ylabel)
    if re.search(r"High Output", app):
        notes.append("high-output rating")
    elif re.search(r"Standard Output", app):
        notes.append("standard-output rating")

    bits = [engine + (" TorqueMaster" if grade == "TorqueMaster" else "") + " injector set"]
    if pct is not None:
        bits.append(f"{pct}% over" if pct else "stock flow")
    if grade in ("SAC00", "SAC45"):
        bits.append(grade)
    if tip:
        bits.append(f"{tip} nozzle")
    if body:
        bits.append(f"{body} body")
    fit = {"y0": y0, "y1": y1, "notes": "; ".join(notes) or None}
    return [make_record(p, "injector", ", ".join(bits), fam, fit, spec, url, emissions)]


def displacement_table(desc):
    """'10mm CP3 ... (1,325 mm3/rev displacement)' statements -> {plunger mm: mm3/rev}; also
    'Ordnance 560 CP3 (560 l/hr flow rate - 1,590 mm3/rev displacement)' -> {'ORD560': (560, 1590)}."""
    t = re.sub(r"mm\s*3\s*/\s*rev", "mm3/rev", desc)
    out = {}
    for mm, disp in re.findall(r"(\d\d)mm (?:High Speed )?CP3[^()]*\((\d[\d,]*) mm3/rev", t):
        out[int(mm)] = int(disp.replace(",", ""))
    for n, lph, disp in re.findall(r"Ordnance (\d{3}) CP3 \((\d{3}) l/hr flow rate\s*-\s*(\d[\d,]*)\s*mm3/rev", t):
        out["ORD" + n] = (int(lph), int(disp.replace(",", "")))
    return out


def pump_families(name, desc):
    """-> (families, y0, y1, notes) for a high-pressure-pump product."""
    fam, _, code = engine_of(name)
    if "Cummins High Pressure Pumps" in name:
        # Bosch CP3 is the stock pump on 2003-2018 common-rail Cummins; the product states no years.
        return [C59, C67], None, None, ["CP3-equipped 5.9/6.7 common rail"]
    if "RAM" in name:
        y0, y1 = (int(x) for x in re.match(r"(\d{4})-(\d{4})", name).groups())
        return [C67], y0, y1, ["CP4.2 to CP3 conversion"]
    if "L5P" in name:
        return [DMX], 2017, None, ["L5P", "CP4.2 to CP3 conversion"]
    if "LML" in name:
        y0, y1 = DURAMAX_CODES["LML"]
        return [DMX], y0, y1, ["LML", "CP4.2 to CP3 conversion"]
    if "Duramax High Pressure Pumps" in name:
        return [DMX], None, None, ["LBZ-based CP3"]
    if "DCR" in name:
        m = re.search(r"[Ff]its (\d{4}) to (\d{4})", desc)
        return [PS67], int(m.group(1)), int(m.group(2)), ["CP4.2 to DCR conversion"]
    if "Reverse Rotation" in name:
        return [UNIVERSAL], None, None, ["front-mount reverse-rotation pump; engine not stated"]
    return [fam], None, None, []


def pump_records(parent, var, va, qa):
    """One injectionPump record per family for one variation (var is None for the simple DCR product)."""
    name = clean(parent.get("name"))
    desc = clean(parent.get("description"))
    short = clean(parent.get("short_description"))
    app = (va or {}).get("application") or (va or {}).get("applications") or ""
    vdesc = clean((var or {}).get("description"))
    url = (var or parent).get("permalink")
    p = clean_sku((var or parent).get("sku"))
    if not p and re.fullmatch(r"[A-Z0-9][A-Z0-9-]+", app):
        p = app  # 2019-2020 RAM kits: the Applications term is the part number and the SKU field is empty
        qa.append(f"{p}: part number taken from the Applications term (variation SKU field empty)")
    if " " in p:
        qa.append(f"{p}: SKU contains spaces, copied verbatim")
    fams, y0, y1, notes = pump_families(name, desc)
    table = displacement_table(desc)
    text = f"{app} | {vdesc}"

    spec = {"pump": "DCR" if "DCR" in name else "CP3", "body": "new"}
    mm = re.search(r"\b(\d\d)\s*mm\b|\b(?:CP3-)?(\d\d)(?:HS)?\b", app)
    if mm and mm.group(1) or (mm and mm.group(2) in ("10", "12", "14")):
        spec["plungerMm"] = int(mm.group(1) or mm.group(2))
        spec["displacementMm3"] = table.get(spec["plungerMm"])
    ord_ = re.search(r"Ordnance (\d{3})", app)
    if ord_:
        spec["series"] = "Ordnance " + ord_.group(1)
        lph, disp = table.get("ORD" + ord_.group(1), (None, None))
        spec["flowLph"], spec["displacementMm3"] = lph, disp
    if re.search(r"SuperSport|-SS\b", app):
        spec["series"] = "SuperSport"
    if re.search(r"High Speed|\bHS\b|\d\dHS\b", app):
        spec["highSpeed"] = True
    if "Reverse Rotation" in app or "RR" in p.split("-"):
        spec["rotation"] = "reverse"
    if "SP3000" in app:
        spec["supplyPump"] = "SP3000"
        spec["supplyFlowLph"] = 3000
    if re.search(r"\bGPD\b", app):
        spec["gearPumpDeletePlate"] = True
    if "Conversion" in name:
        spec["replacesOem"] = "CP4.2"
    if "KIT" in app or "w/o pump" in app:
        spec["pumpIncluded"] = False
    if "DCR" in name:
        d = re.search(r"([\d,]+) mm ?3 ?/revolution", short)
        spec["displacementMm3"] = int(d.group(1).replace(",", "")) if d else None
        spec["tuningRequired"] = False
    if "NOTUNE" in app or "No Tuning" in app:
        spec["tuningRequired"] = False
    elif "Tuning Req" in app:
        spec["tuningRequired"] = True
    if re.search(r"overdriven by ([\d.]+) ?x engine RPM", vdesc):
        spec["driveRatio"] = float(re.search(r"overdriven by ([\d.]+) ?x engine RPM", vdesc).group(1))
    if "LBZ based" in app or "LBZ-based" in vdesc:
        spec["base"] = "LBZ"

    emissions = "unknown"
    eo = re.search(r"EO\s*#?\s*(D-\d{3}-\d+)", vdesc) or ("DCR" in name and re.search(r"EO\s*#?\s*(D-\d{3}-\d+)", short))
    if "50 State" in app:
        eo = re.search(r"EO\s*#?\s*(D-\d{3}-\d+)", short)
    if eo:
        emissions = f"carb_eo:{eo.group(1)}"
    elif "LML" in name and re.search(r"Tuning Req", app):
        emissions = "no_eo_race_only"  # 'for competition applications which don't require after-treatment'

    label = app or name
    if label == p and vdesc:  # RAM kits: the term is the PN; the variation text opens with a title
        label = re.sub(r"^S&S ", "", vdesc.split(" • ")[0]).strip()
    label = re.sub(r"\s+w/o\s*", " without ", label)
    label = re.sub(r"\s+w/\s*", " with ", label).replace(" - ", " ")
    label = re.sub(r"\bHS\b", "high-speed", label).replace("High Speed", "high-speed")
    bits = [label]
    if spec.get("displacementMm3"):
        bits.append(f"{spec['displacementMm3']} mm3/rev")
    if spec.get("flowLph"):
        bits.append(f"{spec['flowLph']} L/hr")
    out = []
    for fam in fams:
        fit = {"y0": y0, "y1": y1, "notes": "; ".join(notes) or None}
        out.append(make_record(p, "injectionPump", ", ".join(bits), fam, fit, spec, url, emissions))
    return out


def parse(items, variations):
    records, skipped, qa = [], [], []
    by_parent = {}
    for v in variations:
        by_parent.setdefault(v.get("parent"), []).append(v)
    stats = {"parents": {}, "variations_used": 0}
    for item in items:
        kind = kind_of(item)
        stats["parents"][kind] = stats["parents"].get(kind, 0) + 1
        name = clean(item.get("name"))
        sku = clean_sku(item.get("sku")) or f"id {item['id']}"
        if kind in ("injector", "pump"):
            fn = injector_records if kind == "injector" else pump_records
            vs = by_parent.get(item["id"], [])
            if item.get("type") == "variable":
                for v in sorted(vs, key=lambda x: x["id"]):
                    va = variation_attrs(v)
                    app = va.get("application") or va.get("applications") or va.get("flow") or ""
                    if not clean_sku(v.get("sku")) and not re.fullmatch(r"[A-Z0-9][A-Z0-9-]+", app):
                        skipped.append((f"id {v['id']}", f"{name} / {app}", "variation without a part number"))
                        continue
                    if "gForce Block" in app:
                        skipped.append((clean_sku(v.get("sku")), f"{name} / {app}",
                                        "accessory (FCA mounting block, not a pump)"))
                        continue
                    records.extend(fn(item, v, va, qa))
                    stats["variations_used"] += 1
                # attribute terms with no variation behind them (listed but not orderable)
                terms = [clean(t["name"]) for a in item.get("attributes") or []
                         if clean(a["name"]).lower() in ("application", "applications") for t in a["terms"]]
                have = " ".join(clean(v.get("variation")) for v in vs)
                for t in terms:
                    if t.replace(" - ", " ") not in have.replace(" - ", " "):
                        skipped.append((f"id {item['id']}", f"{name} / {t}", "attribute term with no variation"))
            else:
                records.extend(fn(item, None, None, qa))
            continue
        reason = {"electronics": "electronics (MoTeC/Bosch ECUs, dashes, harnesses; no specs, contact for price)",
                  "feed tubes": "injector feed tubes (no record category)",
                  "fuel rail": "fuel rail (no record category; no part number in the store)",
                  "filter head": "regulated filter head (no record category)",
                  "fuel filter / bypass kit": "fuel filter housing / CP4 bypass kit (no record category)",
                  "other": "unclassified"}[kind]
        skipped.append((sku, name, reason))
    return records, skipped, stats, qa


# ----------------------------------------------------------------------------- validate

REQUIRED = ("m", "p", "cat", "fit", "src")
NUMERIC = ("pctOver", "nozzleFlow", "hpRating", "plungerMm", "displacementMm3", "flowLph", "supplyFlowLph",
           "driveRatio")


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in REQUIRED:
            if k not in r or r[k] in ("", None):
                problems.append(f"{r.get('p')}: missing {k}")
        if not r.get("fit", {}).get("fam"):
            problems.append(f"{r.get('p')}: missing fit.fam")
        key = (r["m"], r["p"], r["fit"].get("fam"))
        if key in seen:
            problems.append(f"{r['p']}: duplicate p within brand/family {key[2]}")
        seen.add(key)

        def walk(obj, path):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    walk(v, path + "." + k)
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    walk(v, f"{path}[{i}]")
            elif obj == "":
                problems.append(f"{r['p']}: empty string at {path}")
        walk(r, "")
        for k in NUMERIC:
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for k in ("y0", "y1", "cyl"):
            v = r["fit"].get(k)
            if v is not None and not isinstance(v, int):
                problems.append(f"{r['p']}: fit.{k} not integer: {v!r}")
        if r["emissions"] is not None and not re.fullmatch(r"oem_replacement|carb_eo:D-\d{3}-\d+|no_eo_race_only|unknown",
                                                           r["emissions"]):
            problems.append(f"{r['p']}: bad emissions value {r['emissions']!r}")
    return problems


# ----------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch-only", action="store_true")
    ap.add_argument("--parse-only", action="store_true")
    ap.add_argument("--refetch", action="store_true")
    args = ap.parse_args()
    if not args.parse_only:
        fetch(refetch=args.refetch)
    if args.fetch_only:
        return
    items, variations = load_pages("page"), load_pages("var")
    records, skipped, stats, qa = parse(items, variations)
    problems = validate(records)
    os.makedirs(OUT, exist_ok=True)
    doc = {
        "source": {"brand": BRAND, "site": HOST + "/", "api": HOST + "/wp-json/wc/store/v1/products",
                   "edition": EDITION, "robots": "allowed; no Crawl-delay; 6 s between requests"},
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "ss.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_notes(items, variations, records, skipped, stats, qa, problems)
    print(f"{len(records)} records from {len(items)} products + {len(variations)} variations; "
          f"{len(skipped)} skipped; {len(problems)} validation problems", file=sys.stderr)
    for p in problems[:50]:
        print("  !", p, file=sys.stderr)
    if problems:
        sys.exit(1)


def write_notes(items, variations, records, skipped, stats, qa, problems):
    pages = len(glob.glob(os.path.join(DL, "page_[0-9]*.json")))
    vpages = len(glob.glob(os.path.join(DL, "var_[0-9]*.json")))
    counts, unknown, by_cat, distinct = {}, {}, {}, {}
    for r in records:
        counts[(r["cat"], r["fit"]["fam"])] = counts.get((r["cat"], r["fit"]["fam"]), 0) + 1
        if r["fit"]["fam"] not in KNOWN:
            unknown.setdefault(r["fit"]["fam"], set()).add(r["p"])
        by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
        distinct.setdefault(r["cat"], set()).add(r["p"])
    emis = {}
    for r in records:
        emis[r["emissions"]] = emis.get(r["emissions"], 0) + 1
    L = [
        f"# {BRAND} — extraction notes",
        "",
        f"- Extracted {dt.date.today().isoformat()} from the WooCommerce Store API, "
        f"`{HOST}/wp-json/wc/store/v1/products?per_page=100&page=N` (parents) and the same URL with "
        "`&type=variation` (variations). The bare host is used: the `www` certificate does not match.",
        f"- `robots.txt` fetched first: the endpoint is allowed, no `Crawl-delay`. Requests 6 s apart, one at a "
        f"time: 1 robots.txt + {pages} parent page + {vpages} variation pages = {pages + vpages + 1} requests, plus one "
        "1-item probe request made while confirming the endpoint. Raw JSON is kept under `dl/ss/` (gitignored); "
        "`--parse-only` re-runs from it.",
        f"- Store contents: {len(items)} parent products ({', '.join(f'{v} {k}' for k, v in sorted(stats['parents'].items()))}) "
        f"and {len(variations)} variations ({stats['variations_used']} used).",
        f"- {len(records)} records emitted: " + ", ".join(
            f"{by_cat[c]} {c} ({len(distinct[c])} distinct part numbers)" for c in sorted(by_cat)) + ".",
        "- Prices (integer cents, full-set prices for injectors) are not stored. No descriptions or images are "
        "stored; `name` is a short factual phrase built from the variation and the specs.",
        "",
        "## How the catalog maps to records",
        "",
        "- **Injectors** (`injector`): one record per variation; `p` is the variation SKU (e.g. `LB7-100SAC-SET`). "
        "`spec.pctOver` is the nozzle-flow increase over stock from the Application term (the sizing convention "
        "S&S states: \"% increase in nozzle flow over stock\"); `Stock` and `SAC00` are 0. TorqueMaster sizes carry "
        "`spec.grade: \"TorqueMaster\"` and no `pctOver` (the site gives no percentage; the SKU code `10SAC`/`10VCO` "
        "is not interpreted). `spec.tip` is the nozzle style from the SKU (`SAC` sac-type, `VCO` valve-covered "
        "orifice). `spec.body` is the New/Reman Type attribute where the line offers both. `spec.nozzleFlow` "
        "(cc/min) is set only where the page states it for that size (BMW M57 100% = 2,250; 6.7 Cummins 200% = "
        "3,600; 5.9 Cummins 250% = 3,700; LLY/LBZ/LMM 250% = 3,200). `spec.set: true`: every price and SKU is a "
        "full engine set. No HP ratings are published.",
        "- **High-pressure pumps and CP4 conversions** (`injectionPump`): one record per variation. `spec.pump` is "
        "`CP3` or `DCR`; `plungerMm` is the plunger size (10/12/14 mm); `displacementMm3` (mm³/rev) and `flowLph` "
        "(Ordnance 560/650 L/hr) are taken from the product's own description lines; `highSpeed`, "
        "`rotation: reverse`, `series` (SuperSport / Ordnance), `supplyPump: SP3000` (+ `supplyFlowLph` 3000) "
        "for the bundled mechanical supply pump, `gearPumpDeletePlate` for the GPD bundles, `replacesOem: CP4.2` "
        "for conversion kits, `tuningRequired`, `pumpIncluded: false` for kit-only SKUs, `driveRatio` (RAM kits "
        "overdrive the pump 1.5× engine speed).",
        "- `emissions`: `carb_eo:D-756-2` (LB7 SAC00 injectors), `carb_eo:D-756-4` (50-state LML CP3 conversion), "
        "`carb_eo:D-756-5` (2019-2020 RAM No-Tune CP3 conversion), `carb_eo:D-756-7` (Ford 6.7 DCR conversion); "
        "the two LML competition conversion kits are `no_eo_race_only` (the page says they are for competition "
        "applications without after-treatment); everything else is `unknown` (the site makes no statement). "
        f"Counts: {', '.join(f'{v} {k}' for k, v in sorted(emis.items(), key=lambda kv: str(kv[0])))}.",
        "- Year ranges come from the product titles (`2007.5-2018` → `y0` 2007, `y1` 2018, half-year kept in "
        "`fit.notes`; `2017+` → `y0` 2017 only). The LML CP3 conversion uses the LML years from the site's own LML "
        "injector title (2011-2016). Cummins and Duramax high-pressure pumps (not conversions) state no years.",
        "",
        "## Rows per category and family",
        "",
        "| cat | fit.fam | rows |",
        "|---|---|---|",
    ]
    for (cat, fam), n in sorted(counts.items()):
        L.append(f"| {cat} | {fam} | {n} |")
    L += ["", "## Skipped", "", f"{len(skipped)} store items / variations / attribute terms were skipped:", ""]
    by_reason = {}
    for sku, name, why in skipped:
        by_reason.setdefault(why, []).append(f"`{sku}` {name}")
    for why, lst in sorted(by_reason.items()):
        L.append(f"- **{why}** ({len(lst)}): " + "; ".join(lst[:30]) + (" …" if len(lst) > 30 else ""))
    L += ["", "## Needs human QA", ""]
    if unknown:
        L.append("- Families not in the cam-fitment vocabulary (catalog heading kept in `fit.fam`):")
        for fam, skus in sorted(unknown.items()):
            s = sorted(skus)
            L.append(f"  - `{fam}` ({len(s)} PNs): " + ", ".join(f"`{x}`" for x in s[:12]) + (" …" if len(s) > 12 else ""))
    L += [
        "- **Cummins High Pressure Pumps** (`CP3-CU-*`, `6.7C-CP3-ORD*`) state no engine years; they are emitted "
        "for both `Cummins 5.9 24V/CR` and `Cummins 6.7` (the CP3 is the stock pump on 2003-2018 common-rail "
        "Cummins). The Ordnance variants are described as \"6.7L-based\". The attribute term \"Cummins 6.7 CP3\" "
        "has no variation behind it.",
        "- **Duramax High Pressure Pumps** (`CP3-DMX-*`, `LBZ-CP3-ORD*`) are LBZ-based CP3s with no years stated; "
        "`fit.y0/y1` are omitted. They fit CP3-equipped (LB7-LMM) trucks or LML/L5P trucks with a CP3 conversion.",
        "- **Reverse Rotation High Pressure Pumps** are front-mount competition pumps with no engine stated; "
        "`fit.fam` keeps the product heading. The `GF-BLOCK` (gForce FCA mounting block) variation is skipped as "
        "an accessory.",
        "- **Ford 6.7L DCR Pump Conversion**: the `Model Year` attribute says 2011-2024 but the description says "
        "\"fits 2011 to 2026\"; the description is used (`y1` 2026).",
        "- **6.4L Ford Power Stroke (2008-2010)** lists two 6.0L Motorcraft injector terms in its Application "
        "attribute with no variations behind them; they are skipped (listed above), so no `Powerstroke 6.0` rows.",
        "- **2019-2020 RAM CP3 Conversions**: the variation SKU fields are empty; the Applications terms "
        "(`RAM-CP3-NOTUNE`, `RAM-CP3-SS`, `RAM-CP3-10HS`, `RAM-CP3-12HS`, `RAM-CP3-KIT`) are used as `p`. "
        "`RAM-CP3-14HS` is listed in the attribute but has no variation.",
        "- **LML Duramax CP3 Conversions** SKUs are hand-typed in the store and copied verbatim after entity "
        "decoding: `LML-CP3 w/o pump`, `LML-CP3-TuningReq'd`, `LML-CP3-NoTuningReq'd`, `LML-CP3-CARB`. The "
        "\"H/O Pump Option\" term has no variation.",
        "- TorqueMaster injectors: the site gives no % over stock. The 2019-2021 6.7 Cummins line has Standard "
        "Output and High Output TorqueMaster sets (`-SO-`/`-HO-`), recorded in `fit.notes`.",
        "- `emissions: unknown` on the over-stock injector sizes and competition pumps is the site's silence, not "
        "a statement; treat these as not emissions-certified when linking.",
    ]
    grouped = {}
    for q in qa:
        p, msg = q.split(": ", 1)
        grouped.setdefault(msg, []).append(p)
    for msg, ps in grouped.items():
        L.append(f"- {msg}: " + ", ".join(f"`{p}`" for p in dict.fromkeys(ps)))
    if problems:
        L.append(f"- Validation reported {len(problems)} problems (see stderr).")
    else:
        L.append("- Validation passed: every record has `m p cat fit.fam src`, no duplicate `p` within a family, "
                 "numeric fields are numbers, no empty strings, `emissions` values are from the allowed set.")
    with open(os.path.join(OUT, "ss.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
