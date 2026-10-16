"""Scat Crankshafts catalog extractor (task SCAT in CLOUD_TASKS.md).

Source: WooCommerce Store API on scatcrankshafts.com (public JSON, allowed by robots.txt).

Phase 1 (fetch): the parent-product listing and the variation listing, 100 per page, saved
verbatim under dl/scat/ (resumable; one request at a time, >= 6 s apart).
Phase 2 (parse): emit `crank`, `rod` and `rotatingAssembly` records to out/scat.json and
notes to out/scat.md. Nothing is written outside dl/ and out/.

Catalog shape (2026-10): rotating assemblies are "simple" products with a real SKU and ~25
attributes (component part numbers, stroke, rod length, bore, piston dome cc, chamber cc...).
Crankshafts and connecting rods are mostly "variable" products whose SKU is a slug; the real
part numbers are on the variations, which carry a "variation" string such as
"Stroke: 3.750, Rod Length: 6.000, Rod Journal: 2.000" that overrides the parent's attributes.

Usage: python -I extract_scat.py [--fetch-only | --parse-only] [--refetch]
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
DL = os.path.join(HERE, "dl", "scat")
OUT = os.path.join(HERE, "out")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
HOST = "https://www.scatcrankshafts.com"
API = HOST + "/wp-json/wc/store/v1/products?per_page=100&page={page}"
DELAY = 6.0
EDITION = dt.date.today().strftime("%Y-%m")

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
    """Page through one Store API listing, saving each page as dl/scat/<prefix>_NNNN.json.
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
    # Parent products (simple + variable), then the variations: a variable crank or rod product
    # carries a slug SKU; the real part numbers are on its variations.
    fetch_listing("page", API, delay, refetch, log)
    fetch_listing("var", API + "&type=variation", delay, refetch, log)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "scat_fetch_log.jsonl"), "a", encoding="utf-8") as f:
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
    """Unescape HTML entities, strip tags, collapse whitespace."""
    if s is None:
        return ""
    s = html.unescape(str(s))
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


NA = {"", "-", "–", "n/a", "na", "none", "null"}


def attrs_of(item):
    """{attribute name: [term names]} with HTML entities decoded and placeholders dropped."""
    out = {}
    for a in item.get("attributes") or []:
        name = clean(a.get("name"))
        terms = [clean(t.get("name")) for t in a.get("terms") or []]
        terms = [t for t in terms if t.lower() not in NA]
        if terms:
            out[name] = terms
    return out


def variation_attrs(v):
    """Parse 'Stroke: 3.750, Rod Length: 6.000' into {name: value}."""
    out = {}
    key = None
    for piece in clean(v.get("variation")).split(", "):
        if ": " in piece:
            key, val = piece.split(": ", 1)
            out[key.strip()] = val.strip()
        elif key:  # a value that itself contained ", "
            out[key] += ", " + piece
    return {k: v for k, v in out.items() if v.lower() not in NA}


def single(a, key):
    """The attribute's value when it is unambiguous (exactly one term), else None."""
    v = a.get(key)
    return v[0] if v and len(v) == 1 else None


def num(s):
    """First decimal number in s, or None. 'STD' -> 0."""
    if s is None:
        return None
    s = str(s).replace(",", "")
    if s.strip().upper() == "STD":
        return 0
    m = re.search(r"-?\d*\.?\d+", s)
    if not m:
        return None
    v = float(m.group())
    return int(v) if v.is_integer() and "." not in m.group() else v


def inches(s):
    v = num(s)
    return None if v is None else float(v)


def drop_none(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def norm_material(s):
    if not s:
        return None
    t = s.lower()
    if "4340" in t:
        return "4340 billet" if "billet" in t else "4340 forged"
    if "cast" in t:
        return "cast steel"
    if "chromoly" in t or "4130" in t:
        return "chromoly forged"
    return t


def norm_balance(s):
    if not s:
        return None
    t = s.lower()
    if "internal/external" in t:
        return "internal/external"
    if "internal" in t:
        return "internal"
    if "external" in t:
        return "external"
    if "neutral" in t:
        return "neutral"
    return None  # "None", "Not balanced"


def norm_seal(s):
    """-> ('1-pc'|'2-pc'|None, note)."""
    if not s:
        return None, None
    t = s.lower()
    one, two = "1-piece" in t or "1-pc" in t, "2-piece" in t or "2-pc" in t
    note = "center counterweights" if "center counterweight" in t else None
    if one and two:
        return None, note  # catalog lists both; the variation usually resolves it
    return ("1-pc" if one else "2-pc" if two else None), note


def pn_dims_crank(p):
    """Scat crank numbers encode main-stroke-rodlength[-journal]: 9-350-3750-6000, 4-426-4500-6760-2374.
    -> {stroke, minRodLength, rodJournal} from the 4-digit groups, in that order."""
    if p.count("-") < 2:
        return {}
    vals = [int(g) / 1000 for g in re.findall(r"(?<![\d.])(\d{4})(?![\d.])", p.split("-", 2)[-1])]
    out = {}
    for v in vals:  # strokes 2.8-5.0, rod lengths 4.5-8.0, journals 0.9-2.6: the ranges don't overlap
        if 2.8 <= v <= 5.0 and "stroke" not in out:
            out["stroke"] = v
        elif 4.5 <= v <= 8.0 and "minRodLength" not in out:
            out["minRodLength"] = v
        elif 0.9 <= v < 2.6 and "rodJournal" not in out:
            out["rodJournal"] = v
    return out


def pn_dims_rod(p):
    """Scat rod numbers: 2-350-5700-2100-QLSA, 2-ICR6123-2124, 2-5670-1992-981-787.
    -> {length, journal} where unambiguous. The trailing 3-digit groups (big-end width and pin) are not
    decoded: the catalog does not order them consistently."""
    if not p.startswith("2-"):
        return {}
    four = [int(g) for g in re.findall(r"(?<![\d.])(\d{4})(?![\d.])", p[2:])]
    out = {}
    lengths = [v / 1000 for v in four if 4500 <= v <= 7600]
    journals = [v / 1000 for v in four if 1500 <= v <= 2600]
    if len(lengths) == 1:
        out["length"] = lengths[0]
    if len(journals) == 1:
        out["journal"] = journals[0]
    return out


def norm_beam(s):
    if not s:
        return None
    t = s.lower()
    return "H" if "h-beam" in t or "h beam" in t else "I" if "i-beam" in t or "i beam" in t else \
        "X" if "x-beam" in t else None


# ----------------------------------------------------------------------------- fitment

SBC, BBC4, BBC6, W409, LS, LT5 = ("Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block",
                                 "Chevy W-series 348/409", "GM LS", "GM LT (Gen V)")
SBF, F351C, FFE, F460, FMOD = ("Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE", "Ford 429/460",
                               "Ford Modular")
MLA, MMAG, MBRB, M426, H57, H64 = ("Mopar LA small block", "Mopar Magnum 5.2/5.9", "Mopar B/RB big block",
                                   "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
                                   "Chrysler Gen III Hemi 6.2/6.4")
PONT, OLDS, BUBB, BU350, BUV6, CAD, AMC, JEEP6, CHV6, FRD6 = (
    "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350", "Buick V6 181-252", "Cadillac 368-500",
    "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6", "Ford 240/300 inline-6")
KNOWN = {SBC, BBC4, BBC6, W409, LS, LT5, SBF, F351C, FFE, F460, FMOD, MLA, MMAG, MBRB, M426, H57, H64, PONT,
         OLDS, BUBB, BU350, BUV6, CAD, AMC, JEEP6, CHV6, FRD6, "Ford Coyote", "Ford Godzilla 7.3",
         "Mopar Slant Six"}

# Catalog headings for engines that are not in the cam-fitment vocabulary (kept as given, flagged).
OTHER = {"flathead": "Ford Flathead V8", "model": "Ford Model A/B/T four", "4.2l v6": "Ford 4.2L V6",
         "gmc": "GMC 6.5L diesel", "holden": "Holden V8", "honda": "Honda", "subaru": "Subaru",
         "8.1l": "Chevy 8.1L Vortec big block", "vw": "VW", "audi": "Audi/VW", "toyota": "Toyota",
         "nissan": "Nissan", "mitsubishi": "Mitsubishi", "mazda": "Mazda", "fiat": "Fiat", "peugeot": "Peugeot",
         "saturn": "Saturn", "vauxhall": "Vauxhall", "le mans": "Pontiac Le Mans / Daewoo",
         "formula 1600": "Ford Kent / Cosworth four", "straight 6": "Ford inline-6 turbo (Barra)"}


def crank_families(make, engines, types, name, seal, spec=None):
    """-> list of fit.fam strings for a crankshaft."""
    mk = (make or "").lower().replace("chrylser", "chrysler")
    e = " ".join(engines).lower()
    t = " ".join(types).lower()
    n = name.lower()
    txt = f"{mk} | {e} | {t} | {n}"
    if mk == "chevy":
        if re.search(r"\blt[14]\b", txt):
            return [LT5]
        if re.search(r"\bls\d\b", e):
            return [LS]
        if "8.1" in e:
            return [OTHER["8.1l"]]
        if "409" in e:
            return [W409]
        if "big block" in t or "big block" in n or "454" in e:
            if seal == "1-pc":
                return [BBC6]
            if seal == "2-pc":
                return [BBC4]
            return [BBC4, BBC6]
        return [SBC]
    if mk == "ford":
        if "flathead" in txt:
            return [OTHER["flathead"]]
        if "model" in e:
            return [OTHER["model"]]
        if "4.2l" in e:
            return [OTHER["4.2l v6"]]
        if "4.6" in e or "modular" in t:
            return [FMOD]
        if re.search(r"\bfe\b|\b428\b", txt) and "460" not in e and "429" not in e:
            return [FFE]
        if re.search(r"\b(429|460)\b", e) or "boss 429" in t:
            fams = [F460]
            if "428" in e:
                fams.append(FFE)
            return fams
        if "cleveland" in txt and "windsor" not in txt:
            return [F351C]
        return [SBF]
    if mk == "chrysler":
        if "modern hemi" in t or "modern hemi" in n:
            return [H64]
        if "jeep" in t or "4.2l" in e:
            # Scat's "Chrysler Jeep Pro Stock" parent mixes LA 340/360 (3.580 stroke, 2.125 journal)
            # and Jeep 4.2L (3.895 stroke, 2.095 journal) cranks; split by the resolved dimensions.
            if (spec or {}).get("stroke") == 3.895 or (spec or {}).get("rodJournal") == 2.095 or "4.2l" == e:
                return [JEEP6]
            if (spec or {}).get("stroke") == 3.58 or (spec or {}).get("rodJournal") == 2.125 or re.search(r"\b(340|360)\b", e):
                return [MLA]
            return [MLA, JEEP6]
        if re.search(r"\b(426|440)\b", e) or "late hemi" in t or "rb" in t:
            return [MBRB, M426] if ("hemi" in txt or "426" in e) else [MBRB]
        if re.search(r"\b(383|400)\b", e) or '"b" block' in t:
            return [MBRB]
        return [MLA]
    if mk == "pontiac":
        return [PONT]
    if mk == "oldsmobile":
        return [OLDS]
    if mk == "buick":
        return [BUV6] if ("v6" in txt or "231" in e) else [BUBB]
    for key in ("gmc", "holden", "honda", "subaru"):
        if key in mk:
            return [OTHER[key]]
    return [f"{make} {' '.join(engines)}".strip()]


def rod_families(make, name, journal, cyl):
    """-> list of fit.fam strings for a connecting rod. The title is more reliable than Make."""
    n = name.lower()
    mk = (make or "").lower().replace("chrylser", "chrysler")
    for key in ("flathead", "model", "formula 1600", "straight 6"):
        if key in n and n.startswith("ford"):
            return [OTHER[key]]
    if n.startswith("ford"):
        if "modular" in n:
            return [FMOD]
        if "460" in n or "fe" in n.split():
            if journal is not None:
                return [FFE] if journal < 2.47 else [F460]  # FE 2.438, 429/460 2.500
            return [F460, FFE]
        if "cleveland" in n:
            return [F351C]
        return [SBF]
    if n.startswith("chevy"):
        if "ls1" in n:
            return [LS]
        if "6-cyl" in n:
            return [CHV6]
        if "big block" in n:
            return [BBC4, BBC6]
        return [SBC]  # Small Block, Stroker, Ultra HP/Lite, Q-Lite, Stock Replacement (2.000/2.100 journal)
    if n.startswith("chrysler") or n.startswith("dodge"):
        if "modern hemi" in n:
            return [H57, H64]
        if "jeep" in n:
            return [JEEP6]
        if "big block" in n or re.search(r"\b(426|440)\b", n):
            return [MBRB, M426] if journal is None or journal > 2.3 else [MBRB]
        return [MLA, MMAG]
    if n.startswith("pontiac le mans") or mk == "le mans":
        return [OTHER["le mans"]]
    if n.startswith("pontiac"):
        return [PONT]
    if n.startswith("oldsmobile"):
        return [OLDS]
    if n.startswith("buick"):
        return [BUV6] if cyl == 6 else [BUBB]
    if n.startswith("amc"):
        return [JEEP6] if cyl == 6 else [AMC]
    for key in ("audi", "vw", "toyota", "nissan", "mitsubishi", "mazda", "fiat", "peugeot", "saturn",
                "vauxhall", "holden", "honda", "subaru"):
        if n.startswith(key) or mk.startswith(key):
            return [OTHER[key]]
    return [make or name]


def assembly_families(make, engine, name, bore):
    mk = (make or "").lower()
    e = (engine or "").lower()
    n = name.lower()
    if mk.startswith("chevy"):
        if "ls" in e or "5.3" in e:
            return [LS]
        if "409" in e:
            return [W409]
        if "454" in e:
            return [BBC4, BBC6]  # rear-seal style not stated for assemblies
        return [SBC]
    if mk.startswith("ford"):
        if "239" in e:
            return [OTHER["flathead"]]
        if "4.6" in e:
            return [FMOD]
        if "fe" in e:
            return [FFE]
        if "460" in e:
            return [F460]
        if "cleveland" in n:
            return [F351C]
        return [SBF]
    if mk == "hemi":
        # Gen III Hemi bores: 5.7 = 3.917, 6.1 = 4.055, 6.2/6.4 = 4.090
        if bore is not None and bore >= 4.08:
            return [H64]
        return [H57]
    if mk == "chrysler":
        if re.search(r"\b(340|360)\b", e):
            return [MLA]
        return [MBRB]
    if mk == "jeep":
        return [JEEP6]
    if mk == "pontiac":
        return [PONT]
    if mk == "buick":
        return [BUV6]
    return [f"{make} {engine}".strip()]


def years_for(fam, seal):
    """Model years implied by family + rear-seal style, for the Chevy families only."""
    if fam == SBC and seal == "1-pc":
        return 1986, 2002
    if fam == SBC and seal == "2-pc":
        return 1955, 1985
    if fam == BBC4:
        return 1965, 1990
    if fam == BBC6:
        return 1991, None
    return None, None


def cyl_for(fam, given=None):
    if given:
        return given
    if fam in (JEEP6, CHV6, FRD6, BUV6, "Mopar Slant Six") or fam == OTHER["4.2l v6"]:
        return 6
    if fam in (OTHER["model"], OTHER["formula 1600"], OTHER["honda"], OTHER["subaru"]):
        return 4
    if fam in KNOWN or fam in (OTHER["flathead"], OTHER["holden"], OTHER["8.1l"], OTHER["gmc"]):
        return 8
    return None


# ----------------------------------------------------------------------------- records

QA = {"pn_filled": 0, "pn_conflicts": []}


def fill_from_pn(p, spec, decoded):
    """Fill spec keys the attributes left unresolved from the part-number encoding; record conflicts."""
    for k, v in decoded.items():
        if spec.get(k) is None:
            spec[k] = v
            QA["pn_filled"] += 1
        elif abs(spec[k] - v) > 0.0015:
            QA["pn_conflicts"].append(f"{p}: {k} attribute {spec[k]} vs part number {v}")


def make_record(p, cat, name_text, fam, fit_extra, spec, url):
    fit = {"fam": fam}
    fit.update(fit_extra)
    return {
        "m": "Scat", "p": p, "cat": cat, "name": name_text,
        "fit": drop_none(fit),
        "spec": drop_none(spec),
        "src": {"doc": "scatcrankshafts.com WooCommerce Store API", "edition": EDITION, "url": url},
        "emissions": None,
    }


def kind_of(item, a):
    cats = " ".join(clean(c.get("name")) for c in item.get("categories") or []).lower()
    if "apparel" in cats or "hats" in cats:
        return "apparel"
    if "Crank Part #" in a:
        return "assembly"
    if "Series" in a and "Stroke" in a:
        return "crank"
    if "Application" in a and "Rod Length" in a:
        return "rod"
    if "flexplate" in cats or "damper" in cats:
        return "damper"
    return "other"


def crank_records(parent, a, var, va):
    """One crank record per family for a parent+variation (var may be None for simple products)."""
    name = clean(parent.get("name"))
    g = lambda key: va.get(key) if va and key in va else single(a, key)  # noqa: E731
    engines = [va["Engine"]] if va and "Engine" in va else a.get("Engine", [])
    types = [va["Type"]] if va and "Type" in va else a.get("Type", [])
    seal, seal_note = norm_seal(g("Rear Main Seal"))
    if seal is None and seal_note is None and "Rear Main Seal" in a and va and "Rear Main Seal" not in va:
        seal, seal_note = norm_seal(a["Rear Main Seal"][0]) if len(a["Rear Main Seal"]) == 1 else (None, None)
    spec = {
        "stroke": inches(g("Stroke")),
        "rodJournal": inches(g("Rod Journal")),
        "minRodLength": inches(g("Rod Length")),
        "material": norm_material(g("Material")),
        "balance": norm_balance(g("Balance")),
        "rearSeal": seal,
        "snout": (g("Snout") or "").lower() or None,
        "series": g("Series"),
        "lightened": {"yes": True, "no": False}.get((g("Lightened") or "").lower()),
        "narrowBearing": {"yes": True, "no": False}.get((g("Narrow Bearing") or "").lower()),
    }
    if spec["snout"] == "standard":
        spec["snout"] = None
    url = (var or parent).get("permalink")
    p = clean((var or parent).get("sku"))
    fill_from_pn(p, spec, pn_dims_crank(p))
    bits = [f"{spec['material'] or 'steel'} crank"]
    if spec["stroke"]:
        bits.append(f"{spec['stroke']:.3f} stroke")
    if spec["rodJournal"]:
        bits.append(f"{spec['rodJournal']:.3f} rod journal")
    notes = []
    if engines:
        notes.append(" / ".join(engines) + (" main" if all(re.fullmatch(r"\d{3}", x) for x in engines) else ""))
    if seal:
        notes.append(seal + " rear main seal")
    if seal_note:
        notes.append(seal_note)
    if g("Reluctor"):
        notes.append(re.sub(r"\s*reluctor\s*(wheel)?\s*", " ", g("Reluctor"), flags=re.I).strip() + " reluctor")
    out = []
    for fam in crank_families(single(a, "Make") or (a.get("Make") or [""])[0], engines, types, name, seal, spec):
        y0, y1 = years_for(fam, seal)
        fit = {"cyl": cyl_for(fam), "y0": y0, "y1": y1, "notes": "; ".join(notes) or None}
        out.append(make_record(p, "crank", ", ".join(bits), fam, fit, spec, url))
    return out


def rod_records(parent, a, var, va):
    name = clean(parent.get("name"))
    g = lambda key: va.get(key) if va and key in va else single(a, key)  # noqa: E731
    journal = inches(g("Rod Journal"))
    cyl = num(g("Cylinders"))
    cyl = int(cyl) if cyl else None
    bolt_bits = [g("Bolt Size"), g("Bolt Material") or g("Bolt Brand"), (g("Bolt Cap") or "").lower() or None]
    bolt = " ".join(b for b in bolt_bits if b) or None
    beam = norm_beam(g("Style")) or norm_beam(name)
    spec = {
        "length": inches(g("Rod Length")),
        "journal": journal,
        "pin": inches(g("Wrist Pin Size")),
        "bigEndWidth": inches(g("Big End Width")),
        "beam": beam,
        "material": norm_material(g("Material")),
        "bolt": bolt,
        "pinEnd": (g("Wrist Pin") or "").lower() or None,
        "series": g("Application"),
        "strokerClearance": {"yes": True, "no": False}.get((g("Stroke Clearance") or g("Stroker Clearance") or "").lower()),
    }
    url = (var or parent).get("permalink")
    p = clean((var or parent).get("sku"))
    fill_from_pn(p, spec, pn_dims_rod(p))
    journal = spec["journal"]
    bits = [f"{spec['material'] or 'steel'} {beam + '-beam ' if beam else ''}rod"]
    if spec["length"]:
        bits.append(f"{spec['length']:.3f} length")
    if journal:
        bits.append(f"{journal:.3f} journal")
    out = []
    for fam in rod_families((a.get("Make") or [""])[0], name, journal, cyl):
        fit = {"cyl": cyl_for(fam, cyl)}
        out.append(make_record(p, "rod", ", ".join(bits), fam, fit, spec, url))
    return out


def assembly_records(item, a):
    name = clean(item.get("name"))
    g = lambda key: single(a, key)  # noqa: E731
    bore = inches(g("Bore"))
    ci = num(g("CI"))
    if ci is None:
        m = re.search(r"\b\d{3}\s*[–-]\s*(\d{3})\b", name) or re.search(r"\b(\d{3})\s+(?:Cast|Forged)\b", name)
        ci = int(m.group(1)) if m else None
    dome = g("cc") or g("CC")
    rs = norm_beam(g("Rod Style"))
    spec = {
        "stroke": inches(g("Crank Stroke")),
        "rodLength": inches(g("Rod Length")),
        "bore": bore,
        "oversize": inches(g("Oversize")),
        "balance": norm_balance(g("Balance")),
        "crankMaterial": (g("Crank") or g("Crank Material") or "").lower() or None,
        "rodBeam": rs,
        "pinEnd": (g("Wrist Pin") or "").lower() or None,
        "pistonTop": (g("Type") or "").lower().replace("dish flat", "dish").replace("dIsh", "dish") or None,
        "domeCc": num(dome),
        "chamberCc": num(g("Compression")),
        "pistonMfg": g("Pistons MFG"),
        "pistonClass": (g("Pistons Class") or "").lower().replace("hyperuetectic", "hypereutectic") or None,
        "ringsIncluded": {"yes": True, "no": False}.get((g("Rings Included") or "").lower()),
        "crankPn": g("Crank Part #"),
        "rodPn": g("Rod Part #"),
        "pistonPn": g("Piston Part #"),
        "ringPn": g("Ring Part #"),
        "mainBearingPn": g("MB Part #"),
        "rodBearingPn": g("Rod Bearing Part #"),
        "damperPn": g("Damper Part #"),
        "flexplatePn": g("Flexplate Part #"),
    }
    if spec["pistonTop"] and spec["pistonTop"] not in ("flat", "dish", "dome"):
        spec["pistonTop"] = None
    if spec["ringPn"] and re.search(r"incl", spec["ringPn"], re.I):  # "Incl with pistons"
        spec["ringPn"], spec["ringsIncluded"] = None, True
    for k in ("crankPn", "rodPn", "pistonPn", "ringPn", "mainBearingPn", "rodBearingPn", "damperPn", "flexplatePn"):
        if spec[k] and not re.search(r"\d", spec[k]):  # "TBD" and the like
            spec[k] = None
    bits = [f"{spec['crankMaterial'] + ' crank ' if spec['crankMaterial'] else ''}rotating assembly"]
    if ci:
        bits.append(f"{ci} ci")
    if spec["stroke"]:
        bits.append(f"{spec['stroke']:.3f} stroke")
    if spec["rodLength"]:
        bits.append(f"{spec['rodLength']:.3f} rod")
    if bore:
        bits.append(f"{bore:.3f} bore")
    make, engine = (a.get("Make") or [""])[0], g("Engine")
    out = []
    for fam in assembly_families(make, engine, name, bore):
        fit = {"ci": [int(ci)] if ci else None, "cyl": cyl_for(fam), "notes": engine or None}
        out.append(make_record(clean(item["sku"]), "rotatingAssembly", ", ".join(bits), fam, fit, spec,
                               item.get("permalink")))
    return out


def parse(items, variations):
    records, skipped = [], []
    by_parent = {}
    for v in variations:
        by_parent.setdefault(v.get("parent"), []).append(v)
    stats = {"parents": {}, "variations_used": 0}
    for item in items:
        a = attrs_of(item)
        kind = kind_of(item, a)
        stats["parents"][kind] = stats["parents"].get(kind, 0) + 1
        name = clean(item.get("name"))
        sku = clean(item.get("sku"))
        if kind == "assembly":
            records.extend(assembly_records(item, a))
            continue
        if kind in ("crank", "rod"):
            fn = crank_records if kind == "crank" else rod_records
            vs = by_parent.get(item["id"], [])
            if item.get("type") == "variable" and vs:
                for v in vs:
                    if not clean(v.get("sku")):
                        skipped.append((v.get("id"), name, "variation without sku"))
                        continue
                    records.extend(fn(item, a, v, variation_attrs(v)))
                    stats["variations_used"] += 1
            elif item.get("type") == "variable":
                skipped.append((sku, name, "variable product with no variations in the listing"))
            else:
                records.extend(fn(item, a, None, None))
            continue
        reason = {"apparel": "apparel", "damper": "flexplate/damper/counterweight (not in SCAT task scope)",
                  "other": "unclassified"}[kind]
        skipped.append((sku, name, reason))
    return records, skipped, stats


# ----------------------------------------------------------------------------- validate

REQUIRED = ("m", "p", "cat", "fit", "src")
NUMERIC = ("stroke", "mainJournal", "rodJournal", "rodJournalWidth", "bobweight", "minRodLength", "length",
           "journal", "bigEnd", "pin", "bigEndWidth", "weight", "rodLength", "bore", "domeCc", "chamberCc",
           "oversize")


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
        for k in ("ci",):
            v = r["fit"].get(k)
            if v is not None and not all(isinstance(x, int) for x in v):
                problems.append(f"{r['p']}: fit.{k} not integer list: {v!r}")
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
    records, skipped, stats = parse(items, variations)
    problems = validate(records)
    os.makedirs(OUT, exist_ok=True)
    doc = {
        "source": {"brand": "Scat", "site": HOST + "/",
                   "api": HOST + "/wp-json/wc/store/v1/products", "edition": EDITION,
                   "robots": "allowed; no Crawl-delay; 6 s between requests"},
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "scat.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_notes(items, variations, records, skipped, stats, problems)
    print(f"{len(records)} records from {len(items)} products + {len(variations)} variations; "
          f"{len(skipped)} skipped; {len(problems)} validation problems", file=sys.stderr)
    for p in problems[:50]:
        print("  !", p, file=sys.stderr)
    if problems:
        sys.exit(1)


def write_notes(items, variations, records, skipped, stats, problems):
    pages = len(glob.glob(os.path.join(DL, "page_[0-9]*.json")))
    vpages = len(glob.glob(os.path.join(DL, "var_[0-9]*.json")))
    counts = {}
    unknown = {}
    for r in records:
        counts[(r["cat"], r["fit"]["fam"])] = counts.get((r["cat"], r["fit"]["fam"]), 0) + 1
        if r["fit"]["fam"] not in KNOWN:
            unknown.setdefault(r["fit"]["fam"], set()).add(r["p"])
    by_cat = {}
    distinct = {}
    for r in records:
        by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
        distinct.setdefault(r["cat"], set()).add(r["p"])
    L = [
        "# Scat Crankshafts — extraction notes",
        "",
        f"- Extracted {dt.date.today().isoformat()} from the WooCommerce Store API, "
        f"`{HOST}/wp-json/wc/store/v1/products?per_page=100&page=N` (parents) and the same URL with "
        "`&type=variation` (variations).",
        f"- `robots.txt` fetched first: the endpoint is allowed, no `Crawl-delay`. Requests 6 s apart, one at a "
        f"time: 1 robots.txt + {pages} parent pages + {vpages} variation pages = {pages + vpages + 1} requests "
        "(one extra probe request was made while confirming the variation endpoint). Raw JSON is kept under "
        "`dl/scat/` (gitignored); the extractor is resumable from it.",
        f"- Store contents: {len(items)} parent products ({', '.join(f'{v} {k}' for k, v in sorted(stats['parents'].items()))}) "
        f"and {len(variations)} variations ({stats['variations_used']} used).",
        f"- {len(records)} records emitted: " + ", ".join(
            f"{by_cat[c]} {c} ({len(distinct[c])} distinct part numbers)" for c in sorted(by_cat)) + ".",
        "- A part that fits several families is emitted once per family with the same `p`, so the record "
        "count exceeds the part-number count.",
        "",
        "## How the catalog maps to records",
        "",
        "- **Rotating assemblies** are simple products (one SKU each). `spec` carries the component part numbers "
        "(`crankPn`, `rodPn`, `pistonPn`, `ringPn`, `mainBearingPn`, `rodBearingPn`, `damperPn`, `flexplatePn`), "
        "stroke, rod length, bore, oversize, piston top (`pistonTop`), piston dome cc (`domeCc`, negative = dish), "
        "the chamber cc the catalog quotes compression for (`chamberCc`), piston maker and class, balance, crank "
        "material, rod beam, pin end. The catalog does not state the compression ratio itself. `fit.ci` is the "
        "built displacement (the `CI` attribute).",
        "- **Crankshafts**: 71 variable parents + 8 simple. One record per variation; `p` is the variation SKU "
        "(e.g. `4-350-3750-6000-20`), and the variation string (Stroke, Rod Length, Rod Journal, Engine, Rear "
        "Main Seal, Balance, Type) overrides the parent attributes. A parent attribute with several values that "
        "the variation does not resolve (often `Balance`, sometimes `Rear Main Seal`) is omitted rather than "
        "guessed. Scat's crank \"Rod Length\" is the rod-length designation in the part number (the crank is "
        "clearanced for that rod length); it is stored as `minRodLength`. `snout` is stored only when it is not "
        "\"Standard\" (`big block chevy`, `boss 429`, `dry sump`, `ls7`). No main-journal, bobweight, or "
        "flywheel-bolt data is published through the API.",
        "- **Connecting rods**: 41 variable parents + 10 simple. One record per variation. `journal` is the crank "
        "rod-journal diameter the rod fits (Scat lists that, not the housing bore, so `bigEnd` is omitted); "
        "`bigEndWidth`, `pin`, `beam`, `material`, `bolt` (size + ARP grade + cap style), `pinEnd` "
        "(bushed/floating/pressed), `series` (Pro Sport / Pro Series / Pro Stock / Stock Replacement). "
        "Rod weight is not published.",
        "- `fit.y0`/`fit.y1` are set only for the Chevy families where the rear-seal style implies them "
        "(SBC 2-pc 1955–85, 1-pc 1986–2002; Mark IV 1965–90; Gen V/VI 1991+).",
        "- No prices, descriptions or images are stored. `name` is a short factual phrase built from the specs.",
        "",
        "## Rows per category and family",
        "",
        "| cat | fit.fam | rows |",
        "|---|---|---|",
    ]
    for (cat, fam), n in sorted(counts.items()):
        L.append(f"| {cat} | {fam} | {n} |")
    L += ["", "## Skipped products", "", f"{len(skipped)} store items were skipped:", ""]
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
            L.append(f"  - `{fam}` ({len(s)} PNs): " + ", ".join(f"`{x}`" for x in s[:8]) + (" …" if len(s) > 8 else ""))
    L += [
        "- Big-block Chevy **rotating assemblies** (Engine \"454 Main\") do not state the rear-seal style, so "
        "each is emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; the crank PN in "
        "`spec.crankPn` decides which one is right. Cranks and rods are split by seal where the catalog gives it.",
        "- Chrysler \"426 Main\" / \"440 Main\" assemblies sit in Scat's \"RB Block Wedge and Hemi\" category; "
        "they are emitted as `Mopar B/RB big block` only. Check the piston PN for 426 Hemi sets.",
        "- Chrysler \"Modern HEMI\" cranks are emitted as `Chrysler Gen III Hemi 6.2/6.4` (392 / 426 stroker); "
        "Hemi rotating assemblies are split 5.7/6.1 vs 6.2/6.4 by bore (>= 4.080 = 6.2/6.4). Modern Hemi rods "
        "are emitted for both Gen III families.",
        "- Chevy \"LT1 8-Bolt\" cranks are mapped to `GM LT (Gen V)`; confirm they are not meant for the 1992–97 LT1.",
        "- Chrysler \"RB Block Wedge + HEMI\" cranks are emitted for both `Mopar B/RB big block` and "
        "`Chrysler 426 Hemi`; small-block Chrysler rods for both `Mopar LA small block` and `Mopar Magnum 5.2/5.9` "
        "(same 2.125 journal); Ford \"460 and FE\" rods are split by journal (2.438 FE, 2.500 429/460).",
        "- Ford 351 rods (2.311 journal) are emitted as `Small-block Ford (Windsor)` only although the journal "
        "also matches 351C; Ford 351 cranks are split Windsor vs Cleveland by title.",
        "- Catalog typos were left as data where harmless (`Chrylser`, `Hyperuetectic` normalised; one "
        "Ford 302 Pro Series rod parent is tagged Make=Chevy in the store and is mapped by its title).",
        "- `crankPn` values such as `9-351-400-6200-2100W` are copied verbatim; they do not all match a crank "
        "record here because the assembly listing uses older/alternate crank numbering.",
    ]
    L.append(f"- {QA['pn_filled']} spec values that the attributes left unresolved (a parent listing several "
             "strokes or journals with no variation value) were filled from Scat's own part-number encoding "
             "(`main-stroke-rodLength[-journal]` for cranks, `length-journal` for rods). Where both were present "
             f"they were compared; the attribute value was kept and the {len(QA['pn_conflicts'])} conflicts are "
             "listed here for checking against the printed catalog:")
    for c in QA["pn_conflicts"][:40]:
        L.append(f"  - {c}")
    L.append("- 447 assemblies list rings as \"Incl with pistons\": `ringPn` is omitted and `ringsIncluded` set true. "
             "Four assemblies list the piston PN as \"TBD\" (omitted).")
    if problems:
        L.append(f"- Validation reported {len(problems)} problems (see stderr).")
    else:
        L.append("- Validation passed: every record has `m p cat fit.fam src`, no duplicate `p` within a family, "
                 "numeric fields are numbers, no empty strings.")
    with open(os.path.join(OUT, "scat.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
