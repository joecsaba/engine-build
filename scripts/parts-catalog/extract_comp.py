#!/usr/bin/env python3
"""Extract COMP Cams lobes, valve springs and camshafts from the two published catalog PDFs.

Sources (Edelbrock Group S3 bucket; PDFs only, no product pages are crawled):
  - COMP-Lobe-Catalog.pdf (180 pp): ruled lobe tables -> `lobe` records
  - COMP-Catalog.pdf (356 pp):
      * valve spring quick reference (pdf p291) + master chart (pdf pp 299-309) -> `spring`
      * cam application spreads (pdf pp 10-227, specialty pp 228-233) -> `cam` with `kit`

Output: out/comp.json (shared parts record format) and out/comp.md (notes).
Re-runnable: PDFs are downloaded once into dl/comp/ and reused; --offline skips the network.
Writes nothing outside dl/ and out/. Run with `python -I`.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(BASE, "dl", "comp")
OUT = os.path.join(BASE, "out")
HOST = "https://edelbrock-files-v1.s3-us-west-1.amazonaws.com"
DOCS = OrderedDict([
    ("lobes", HOST + "/catalogs/COMP-Lobe-Catalog.pdf"),
    ("catalog", HOST + "/catalogs/COMP-Catalog.pdf"),
])
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "COMP Cams"
MIN_GAP = 6.0
PAGE_W = 621.0  # catalog page width
SPREAD_SHIFT = 603.0  # the facing page's words sit 603 pt to the right on an even page (18 pt overlap); measured
RIGHT_X = 600.0  # words at x >= RIGHT_X belong to the facing (components) page

# ----------------------------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------------------------
_last_request = 0.0


def fetch(url, dest, log, allow_missing=False):
    """Download url to dest unless cached. One request at a time, >= 6 s apart. Never retries a 403."""
    global _last_request
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        log.append(f"cached: {url} -> {os.path.relpath(dest, BASE)}")
        return dest
    import requests

    for attempt in range(3):
        wait = MIN_GAP - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=300)
        except requests.exceptions.ConnectionError as e:
            _last_request = time.time()
            log.append(f"GET {url} -> connection error ({e.__class__.__name__}), attempt {attempt + 1}")
            time.sleep(2 ** (attempt + 1))
            continue
        _last_request = time.time()
        log.append(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
        if r.status_code != 200:
            if allow_missing and r.status_code in (403, 404):
                return None
            raise SystemExit(f"{url}: HTTP {r.status_code}; not retrying")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(r.content)
        return dest
    raise SystemExit(f"{url}: gave up after repeated connection errors")


def check_robots(log):
    """S3 answers 403 AccessDenied for a missing robots.txt object; that is 'no robots file', not a block."""
    path = os.path.join(DL, "robots.txt")
    if not os.path.exists(path):
        got = fetch(HOST + "/robots.txt", path, log, allow_missing=True)
        if got is None:
            log.append("robots.txt: not published on the bucket (S3 AccessDenied for the key) -> no rules, default 6 s gap")
            with open(path, "w", encoding="utf-8") as f:
                f.write("")
            return
    txt = open(path, encoding="utf-8", errors="replace").read()
    if not txt.strip():
        log.append("robots.txt: empty / not published -> no rules")
        return
    for line in txt.splitlines():
        if line.lower().startswith("disallow") and "catalogs" in line.lower():
            raise SystemExit("robots.txt disallows /catalogs; stopping")
        if line.lower().startswith("crawl-delay"):
            log.append("robots.txt: " + line.strip())


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
NUM_RE = re.compile(r"^-?\d*\.?\d+$")


def num(s):
    """'.2600' -> 0.26, '110°' -> 110, '240-4' -> None (use rated_dur). Returns int when integral."""
    if s is None:
        return None
    s = str(s).strip().replace("°", "").replace('"', "").replace(",", "").rstrip("*")
    if not NUM_RE.match(s):
        return None
    v = float(s)
    return int(v) if v.is_integer() and "." not in s else round(v, 4)


def clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\n", " ")).strip()


def slug(label):
    words = re.sub(r"[^A-Za-z0-9 ]+", " ", label).split()
    if not words:
        return "col"
    out = words[0].lower() + "".join(w.capitalize() for w in words[1:])
    return out


# ----------------------------------------------------------------------------------------------
# lobes
# ----------------------------------------------------------------------------------------------
LOBE_SECTIONS = [  # (first pdf page, type) -- catalog page = pdf page - 2
    (13, "hydraulic_flat"), (20, "hydraulic_roller"), (50, "solid_flat"), (73, "solid_roller"),
    (144, "ohc_follower"), (157, "ohc_direct"), (162, None),
]
TABLE_SETTINGS = {"vertical_strategy": "lines", "horizontal_strategy": "lines"}


def lobe_type_for_page(pn):
    t = None
    for start, typ in LOBE_SECTIONS:
        if pn >= start:
            t = typ
    return t


def lobe_column_keys(h0, h1):
    """Map the two header rows of a lobe table to spec keys per column."""
    keys = []
    group = ""
    for j in range(len(h0)):
        g = clean(h0[j])
        if g:
            group = g
        sub = clean(h1[j]) if j < len(h1) else ""
        gu, su = group.upper(), sub.upper().replace('"', "").replace(" ", "")
        key = None
        if gu == "LOBE #":
            key = "lobeNo"
        elif gu.startswith("RATED DURA"):
            key = "ratedDur"
            if su.startswith("@"):
                key = "dur" + su[2:].lstrip(".").zfill(3)  # @.006 -> dur006
        elif gu == "DURATION IN DEGREES":
            if su.startswith("@"):
                key = "dur" + su[2:].lstrip(".").zfill(3)
            elif su in ("INTAKE-EXHAUST", "INTAKE−EXHAUST"):
                key = "lobeNo"  # the header text sits over the lobe # column on these tables
            else:
                key = "ratedDur"
        elif gu == "LOBE LIFT":
            key = "lobeLift"
        elif gu == "TAPPET LIFT @ TDC":
            key = "tdcLift" + su.replace("°", "") if su else "tdcLift"
        elif gu == "VALVE LIFT @ TDC":
            key = "tdcValveLift" + su.replace("°", "") if su else "tdcValveLift"
        elif gu.startswith("THEORETICAL VALVE LIFT"):
            key = ("ratio:" + su) if su else "valveLift"
        elif gu == "VALVE LIFT":
            key = "valveLift"
        elif gu == "GROSS VALVE LIFT":
            key = "grossValveLift"
        elif gu.startswith("CHECKING DURATION") or gu.startswith("LOBE CHECK DURATION"):
            key = "dur050Check"
        elif gu == "CHECK DURATION TAPPET":
            key = "dur050Check"
        elif gu == "CHECK LIFT TAPPET":
            key = "checkLiftTappet"
        elif gu == "LIFT W/ FIXED RATIO":
            key = ("ratio:" + su) if su else "valveLift"
        elif gu == "MINIMUM TAPPET O.D.":
            key = "minTappetDia"
        elif gu == "MINIMUM BCR":
            key = "minBaseCircle"
        elif gu == "INTAKE/EXHAUST":
            key = "intExh"
        elif gu == "CAMSHAFT TYPE":
            key = "family"
        else:
            key = slug(gu + " " + sub)
        keys.append(key)
    return keys


def parse_lobes(pdf, stats):
    import pdfplumber  # noqa: F401

    records = []
    seen = {}  # lobeNo -> record
    dups_same, dups_conflict = 0, []
    unknown_keys = Counter()
    per_type = Counter()
    inherited = 0
    last_keys = None
    last_h0 = None
    last_family = None
    for pn in range(13, 162):
        page = pdf.pages[pn - 1]
        typ = lobe_type_for_page(pn)
        if typ is None:
            continue
        tables = page.find_tables(TABLE_SETTINGS)
        page_words = page.extract_words()
        for t in tables:
            rows = t.extract()
            if not rows or not rows[0]:
                continue
            h0 = [clean(c) for c in rows[0]]
            if "LOBE #" in h0 and "PAGE #" in h0:
                continue  # index pages
            if "LOBE #" in h0:
                keys = lobe_column_keys(rows[0], rows[1] if len(rows) > 1 else [])
                data = rows[2:]
                last_keys = keys
                last_h0 = rows[0]
            elif any(re.match(r"^@ ?\.\d{3}", c) for c in h0) and last_h0 is not None and len(rows[0]) == len(last_h0):
                # continuation table that repeats only the sub-header row (new rocker ratios); group row from the previous table
                keys = lobe_column_keys(last_h0, rows[0])
                data = rows[1:]
                last_keys = keys
                inherited += 1
            else:
                # header-less continuation table (same column layout as the previous table)
                if last_keys is None:
                    stats["lobe_tables_skipped"] = stats.get("lobe_tables_skipped", 0) + 1
                    continue
                if len(rows[0]) == len(last_keys) - 1:
                    keys = last_keys[1:]  # no CAMSHAFT TYPE column
                elif len(rows[0]) == len(last_keys):
                    keys = last_keys
                else:
                    stats["lobe_tables_skipped"] = stats.get("lobe_tables_skipped", 0) + 1
                    continue
                data = rows
                inherited += 1
            # family label: words inside column 0 of the table (merged cell, not returned by extract)
            family = None
            if keys and keys[0] == "family" and t.rows and t.rows[0].cells and t.rows[0].cells[0]:
                cx0, _, cx1, _ = t.rows[0].cells[0]
                x0, top, x1, bottom = t.bbox
                ws = [w for w in page_words if w["x0"] >= cx0 - 1 and w["x1"] <= cx1 + 1 and w["top"] >= top and w["bottom"] <= bottom and w.get("upright", True)]
                ws = [ln_w for ln in group_lines(sorted(ws, key=lambda w: (w["top"], w["x0"])), tol=3.0) for ln_w in ln["words"]]
                txt = clean(" ".join(w["text"] for w in ws))
                txt = re.sub(r"^CAMSHAFT TYPE\s*", "", txt)
                txt = re.sub(r"\b[A-Z]{5,}\b(?=\s*$)", "", txt).strip()  # rotated side-tab noise at the end
                family = txt or None
            if family:
                last_family = family
            else:
                family = last_family
            raw_mode = "grossValveLift" in keys  # Ford Modular XE follower tables: header cells do not line up with the values
            for r in data:
                cells = [clean(c) for c in r]
                rec = {}
                ratios = {}
                if raw_mode:
                    li = keys.index("lobeNo")
                    lobe = cells[li].replace(" ", "") if li < len(cells) else ""
                    if lobe and re.match(r"^[0-9][0-9A-Z-]*$", lobe) and lobe not in seen:
                        spec = OrderedDict([("lobeNo", lobe), ("type", typ)])
                        if family:
                            spec["family"] = family
                        spec["rawValues"] = [c for i, c in enumerate(cells) if i != li and keys[i] != "family" and c]
                        spec["rawHeader"] = [clean(h0[i]) + (" " + clean(rows[1][i]) if len(rows) > 1 and rows[1][i] else "")
                                             for i in range(len(cells)) if i != li and keys[i] != "family"] if "LOBE #" in h0 else []
                        record = OrderedDict([
                            ("m", BRAND), ("p", lobe), ("cat", "lobe"),
                            ("name", (re.sub(r"\s*Rated Duration.*$", "", family or "").replace("™", "").strip() or "OHC") + " lobe (values unparsed, see rawValues)"),
                            ("fit", OrderedDict([("fam", "Universal"), ("notes", "cam lobe profile; table header ambiguous, values kept raw for QA")])),
                            ("spec", spec),
                            ("src", OrderedDict([("doc", "COMP Cams Master Lobe Profile Catalog (COMP-Lobe-Catalog.pdf)"), ("edition", EDITION["lobes"]),
                                                 ("url", DOCS["lobes"]), ("page", pn - 2)])),
                            ("emissions", None),
                        ])
                        seen[lobe] = record
                        records.append(record)
                        per_type[typ] += 1
                        stats["lobe_raw_rows"] = stats.get("lobe_raw_rows", 0) + 1
                    continue
                for j, c in enumerate(cells):
                    if j >= len(keys):
                        break
                    k = keys[j]
                    if not c or c.upper() == "N/A" or k == "family":
                        continue
                    if k == "lobeNo":
                        rec["lobeNo"] = c.replace(" ", "")
                    elif k == "ratedDur":
                        rec["ratedDur"] = c
                    elif k.startswith("ratio:"):
                        v = num(c)
                        if v is not None:
                            ratios[k[6:]] = v
                    elif k == "intExh":
                        rec["intExh"] = c
                    else:
                        v = num(c)
                        if v is None:
                            if re.match(r"^\d+-\d+$", c) and k.startswith("dur"):
                                rec[k] = int(c.split("-")[0])
                            else:
                                unknown_keys[(k, c)] += 1
                        else:
                            rec[k] = v
                lobe = rec.get("lobeNo")
                if not lobe or not re.match(r"^[0-9][0-9A-Z-]*$", lobe):
                    continue
                spec = OrderedDict()
                spec["lobeNo"] = lobe
                rd = rec.get("ratedDur")
                if rd:
                    m = re.match(r"^(\d{3})(?:-(\w+))?$", rd)
                    if m:
                        spec["durAdv"] = int(m.group(1))
                        spec["ratedDur"] = rd
                    else:
                        v = num(rd)
                        if v is not None:
                            spec["durAdv"] = v
                        else:
                            spec["ratedDur"] = rd
                for k in ("dur006", "dur010", "dur020", "dur050", "dur053", "dur200", "dur050Check", "lobeLift", "valveLift",
                          "grossValveLift", "checkLiftTappet", "minTappetDia", "minBaseCircle",
                          "tdcLift98", "tdcLift102", "tdcLift106", "tdcLift110", "tdcLift114",
                          "tdcValveLift106", "tdcValveLift110", "intExh"):
                    if k in rec:
                        spec[k] = rec[k]
                if "durAdv" not in spec and "dur006" in spec:
                    spec["durAdv"] = spec["dur006"]
                for k, v in rec.items():
                    if k not in spec and k not in ("lobeNo", "ratedDur"):
                        spec[k] = v
                for r_, v in ratios.items():
                    r2 = r_.replace(".", "")
                    if r_ in ("1.5", "1.6", "1.7"):
                        spec["valveLift" + r2] = v
                if ratios:
                    spec["valveLiftByRatio"] = OrderedDict((k, ratios[k]) for k in sorted(ratios, key=float))
                spec["type"] = typ
                if family:
                    spec["family"] = family
                    m = re.search(r"Rated Duration @ (\.\d+)", family)
                    if m:
                        spec["durAdvAt"] = float(m.group(1))
                    m = re.search(r"(\.\d{3})\" Min\. Dia", family)
                    if m:
                        spec["minTappetDia"] = float(m.group(1))
                    m = re.search(r"Journal = ([A-Z,…\s]+?)(?:\s+MI|\s*$)", family)
                    if m:
                        spec["journalCodes"] = clean(m.group(1))
                fam_short = re.sub(r"\s*Rated Duration.*$", "", family or "").replace("™", "").strip() or None
                name_bits = [typ.replace("_", " ") + " lobe"]
                if fam_short:
                    name_bits.insert(0, fam_short)
                if "durAdv" in spec:
                    name_bits.append(f"{spec['durAdv']} adv")
                if "dur050" in spec:
                    name_bits.append(f"{spec['dur050']} @ .050")
                if "lobeLift" in spec:
                    name_bits.append(f"{spec['lobeLift']:.3f} lobe lift")
                record = OrderedDict([
                    ("m", BRAND), ("p", lobe), ("cat", "lobe"),
                    ("name", ", ".join(name_bits)),
                    ("fit", OrderedDict([("fam", "Universal"), ("notes", "cam lobe profile; core/journal per lobe catalog section")])),
                    ("spec", spec),
                    ("src", OrderedDict([("doc", "COMP Cams Master Lobe Profile Catalog (COMP-Lobe-Catalog.pdf)"), ("edition", EDITION["lobes"]),
                                         ("url", DOCS["lobes"]), ("page", pn - 2)])),
                    ("emissions", None),
                ])
                if lobe in seen:
                    prev = seen[lobe]
                    same = True
                    for k, tol in (("durAdv", 0), ("dur050", 0), ("lobeLift", 0.0015)):
                        if k in prev["spec"] and k in spec and abs(prev["spec"][k] - spec[k]) > tol:
                            same = False
                    if same:
                        dups_same += 1
                        for k, v in spec.items():  # same lobe listed again (another section / rocker ratios): merge extra columns
                            if k == "valveLiftByRatio":
                                merged = OrderedDict(prev["spec"].get(k, {}))
                                merged.update(v)
                                prev["spec"][k] = OrderedDict((kk, merged[kk]) for kk in sorted(merged, key=float))
                            elif k not in prev["spec"] and k != "family":
                                prev["spec"][k] = v
                    else:
                        dups_conflict.append((lobe, prev["src"]["page"], pn - 2))
                    continue
                seen[lobe] = record
                records.append(record)
                per_type[typ] += 1
    # cross-check against the catalog's own index (pp 160-176): every lobe number with its page
    index_nums = set()
    for pn in range(162, 179):
        txt = pdf.pages[pn - 1].extract_text() or ""
        for m in re.finditer(r"\b(\d{4,5}[A-Z]?(?:-\d{4,5})?)\s+(\d{1,3})\b", txt):
            index_nums.add(m.group(1))
    got = set(seen)
    stats["lobe_index_unique"] = len(index_nums)
    stats["lobe_index_missing"] = sorted(index_nums - got)
    stats["lobe_not_in_index"] = sorted(got - index_nums)
    stats["lobe_dups_identical"] = dups_same
    stats["lobe_dups_conflict"] = dups_conflict
    stats["lobe_unknown_cells"] = unknown_keys
    stats["lobe_per_type"] = per_type
    stats["lobe_headerless_tables"] = inherited
    return records


# ----------------------------------------------------------------------------------------------
# springs
# ----------------------------------------------------------------------------------------------
def split_pair(s):
    """'.943/1.105' -> (0.943, 1.105); '1.320' -> (None, 1.32)."""
    s = clean(s).replace(" ", "")
    if "/" in s:
        a, b = s.split("/", 1)
        return num(a), num(b)
    return None, num(s)


def pn_list(s):
    return [p for p in re.split(r"[,\s]+", clean(s)) if p and p.upper() != "N/A"]


def parse_springs(pdf, stats):
    springs = OrderedDict()
    flagged = []
    # --- master chart, pdf pp 299-309, one spring per column
    for pn in range(299, 310):
        page = pdf.pages[pn - 1]
        tables = page.extract_tables(TABLE_SETTINGS)
        if not tables:
            continue
        t = tables[0]
        lab_idx = 0 if (t[0][0] or "").strip().startswith("PART") else len(t[0]) - 1
        labels = [clean(r[lab_idx]) if lab_idx < len(r) else "" for r in t]
        for j in range(len(t[0])):
            if j == lab_idx:
                continue
            pn_raw = clean(t[0][j])
            if not pn_raw:
                continue
            p = pn_raw
            if re.match(r"^26\d{4}$", p):  # footnote superscript merged into a 5-digit PN
                flagged.append(f"master chart p{pn - 2}: part number '{p}' read as '{p[:-1]}' (trailing footnote digit)")
                p = p[:-1]
            spec = springs.setdefault(p, OrderedDict())
            loads = OrderedDict()
            ret = OrderedDict()
            for i, lab in enumerate(labels):
                if i == 0 or j >= len(t[i]):
                    continue
                c = clean(t[i][j])
                if not c or c.upper() == "N/A":
                    continue
                L = lab.lower()
                if L == "# of springs":
                    spec["type"] = c.replace("™", "")
                elif L == "installed height":
                    spec["installedHt"] = num(c)
                elif L == "o.d. of outer":
                    top, base = split_pair(c)
                    spec["od"] = base
                    if top is not None:
                        spec["odTop"] = top
                elif L == "i.d. of outer":
                    top, base = split_pair(c)
                    spec["id"] = base
                    if top is not None:
                        spec["idTop"] = top
                elif L == "i.d. of inner":
                    a, b = split_pair(c)
                    if a is not None:
                        spec["idMiddle"] = a
                        spec["idInner"] = b
                    else:
                        spec["idInner"] = b
                elif L.startswith("spring rate"):
                    spec["rate"] = num(c)
                elif L == "damper":
                    spec["damper"] = c.lower().startswith("y")
                elif re.match(r"^\d\.\d{3}$", lab):
                    v = num(c)
                    if v is not None:
                        loads[lab] = v
                elif L == "maximum coil bind height":
                    spec["coilBind"] = num(c)
                elif L.startswith("ti. ret. (std"):
                    ret["titaniumStd"] = pn_list(c)
                elif L.startswith("ti. ret. (light"):
                    ret["titaniumLight"] = pn_list(c)
                elif L.startswith("steel ret."):
                    ret["steelStd"] = pn_list(c)
                elif L.startswith("tool steel ret."):
                    ret["toolSteelLight"] = pn_list(c)
                elif L.startswith("seat .570"):
                    spec["seat570"] = pn_list(c)
                elif L.startswith("seat .630"):
                    spec["seat630"] = pn_list(c)
                elif L.startswith("spring cup"):
                    spec["locator"] = pn_list(c)
                elif L == "shims":
                    spec["shims"] = pn_list(c)
            if loads:
                spec["loads"] = loads
            if ret:
                spec["retainers"] = ret
            spec["_page"] = pn - 2
    stats["spring_master_chart"] = len(springs)
    # --- quick reference, pdf p291 (cropped to its own page)
    page = pdf.pages[290].crop((0, 0, PAGE_W, pdf.pages[290].height))
    tables = page.extract_tables(TABLE_SETTINGS)
    group = None
    qr = 0
    conflicts = 0
    for r in (tables[0] if tables else []):
        cells = [clean(c) for c in r]
        if cells[0] and all(not c for c in cells[1:]):
            group = cells[0].title()
            continue
        if len(cells) < 12 or not cells[11] or cells[0] == "MAX LIFT":
            continue
        p = cells[11]
        qr += 1
        spec = springs.setdefault(p, OrderedDict())
        qr_only = "installedHt" not in spec
        if qr_only:
            spec["_qr_only"] = True
        qv = {
            "maxLift": num(cells[0]), "od": num(cells[1]), "odTop": num(cells[2]), "id": num(cells[3]), "idTop": num(cells[4]),
            "seatLb": num(cells[5]), "installedHt": num(cells[6]), "openLb": num(cells[7]), "openHt": num(cells[8]),
            "coilBind": num(cells[9]), "rate": num(cells[10]),
        }
        for k, v in qv.items():
            if v is None:
                continue
            if not qr_only and k in ("od", "odTop", "id", "idTop"):
                # the quick reference measures the assembly (ID of base = innermost ID); the chart has the outer spring
                continue
            if k in spec and spec[k] != v:
                conflicts += 1
                spec.setdefault("_conflicts", []).append(f"{k}: chart {spec[k]} vs quick-ref {v}")
                continue
            spec[k] = v
        if group:
            spec["group"] = group
    stats["spring_quick_ref"] = qr
    stats["spring_conflicts"] = conflicts
    # --- records
    records = []
    for p, spec in springs.items():
        if p.upper() in ("PART #", ""):
            continue
        typ = spec.get("type") or ("Beehive" if spec.get("odTop") and spec.get("od") and spec["odTop"] < spec["od"] else None)
        if "seatLb" not in spec and spec.get("loads") and spec.get("installedHt") is not None:
            key = f"{spec['installedHt']:.3f}"
            if key in spec["loads"]:
                spec["seatLb"] = spec["loads"][key]
        dual = (typ or "").lower() in ("double", "triple", "dual conical")
        out = OrderedDict()
        for k in ("type", "od", "odTop", "id", "idTop", "idMiddle", "idInner", "installedHt", "coilBind", "seatLb", "openLb", "openHt", "rate",
                  "maxLift", "damper", "loads", "retainers", "seat570", "seat630", "locator", "shims", "group"):
            if k in spec and spec[k] is not None:
                out[k] = spec[k]
        out["dual"] = dual
        if "damper" not in out:
            out["damper"] = False if typ else None
            if out["damper"] is None:
                del out["damper"]
        if typ:
            out["type"] = typ
        notes = "no engine family stated; valve spring chart"
        if spec.get("_qr_only"):
            notes += "; quick-reference table only (not in master chart)"
        if spec.get("_conflicts"):
            notes += "; chart vs quick-ref mismatch: " + "; ".join(spec["_conflicts"])
            flagged.append(f"spring {p}: " + "; ".join(spec["_conflicts"]))
        name = f"{(typ or 'valve').lower()} valve spring"
        if "od" in out:
            name += f", {out['od']:.3f} OD"
        if "installedHt" in out:
            name += f", {out['installedHt']:.3f} installed"
        records.append(OrderedDict([
            ("m", BRAND), ("p", p), ("cat", "spring"), ("name", name),
            ("fit", OrderedDict([("fam", "Universal"), ("notes", notes)])),
            ("spec", out),
            ("src", OrderedDict([("doc", "COMP Cams Master Reference Guide (COMP-Catalog.pdf), valve spring master chart pp 297-307 and quick reference p 289"),
                                 ("edition", EDITION["catalog"]), ("url", DOCS["catalog"]), ("page", spec.get("_page", 289))])),
            ("emissions", None),
        ]))
    stats["spring_flags"] = flagged
    return records


# ----------------------------------------------------------------------------------------------
# cams
# ----------------------------------------------------------------------------------------------
HEADER_FONTS = ("HelveticaNeue-CondensedBold", "HelveticaNeueLTStd-MdCn")
SERIES_FONT = "HelveticaNeueLTStd-Bd"
HEADING_FONT = "HelveticaNeue-CondensedBold"
PN_FONT = "HelveticaNeueLTStd-HvCn"
DROP_FONT_SUBSTR = ("ThCn",)  # side tabs and page numbers

KIT_LABELS = OrderedDict([
    ("K KIT", "kKit"), ("SK KIT", "skKit"), ("CL KIT", "clKit"), ("RP KIT", "rpKit"), ("P KIT", "pKit"), ("SP KIT", "spKit"), ("SP+ KIT", "spPlusKit"),
    ("LIFTERS", "lifters"), ("TIMING SET", "timingSet"), ("ROCKER ARMS", "rockers"), ("PUSHRODS", "pushrods"), ("VALVE SPRINGS", "springs"),
    ("STEEL RETAINERS", "retainers"), ("RETAINERS", "retainers"), ("RET.", "retainers"), ("VALVE LOCKS", "locks"), ("VALVE SEALS", "seals"),
    ("LASH CAPS", "lashCaps"), ("REV KIT", "revKit"), ("DIST. GEAR", "distGear"), ("STUD GIRDLES", "studGirdles"),
    ("CAM PHASER LIMITER KIT", "phaserLimiterKit"), ("PHASER LIMITER KIT", "phaserLimiterKit"), ("CAM PHASER LOCK KIT", "phaserLockKit"),
    ("CAM GEAR SET", "camGearSet"), ("VALVE SPRING KITS", "springKits"), ("SPRING KITS", "springKits"), ("BEEHIVE SPRING KITS", "beehiveSpringKits"),
    ("SPRING LOCATORS", "springLocators"), ("SPRING SEATS", "springSeats"),
    ("CATHEDRAL PORT ROCKER ARMS", "rockersCathedralPort"), ("RECTANGULAR PORT ROCKER ARMS", "rockersRectangularPort"),
])


def kit_key(label):
    L = re.sub(r"\s+", " ", label.replace("™", "").replace("-", " ").strip().upper())
    for k, v in KIT_LABELS.items():
        if L == k:
            return v
    for k, v in KIT_LABELS.items():
        if L.endswith(" " + k):
            return v
    if L in ("REV", "KIT REV"):
        return "revKit"
    if L.endswith("TOOL STEEL"):
        return "retainersToolSteel"
    if L.endswith("TITANIUM"):
        return "retainersTitanium"
    if L.endswith("STEEL"):
        return "retainersSteel"
    return slug(L)


def spread_words(pdf, even_pn):
    """All words of a two-page spread, right page shifted by one page width; de-duplicated."""
    out = {}
    for pn, shift in ((even_pn, 0.0), (even_pn + 1, SPREAD_SHIFT)):
        if pn > len(pdf.pages):
            continue
        for w in pdf.pages[pn - 1].extract_words(extra_attrs=["size", "fontname"]):
            if not w.get("upright", True):
                continue
            x0, x1 = w["x0"] + shift, w["x1"] + shift
            if x0 < -1 or x1 > PAGE_W + SPREAD_SHIFT + 1:
                continue
            key = (w["text"], round(x0 / 3), round(w["top"]))
            if key in out:
                continue
            out[key] = {"text": w["text"], "x0": x0, "x1": x1, "top": w["top"], "bottom": w["bottom"], "size": w["size"],
                        "font": w["fontname"].split("+")[-1], "xc": (x0 + x1) / 2}
    return sorted(out.values(), key=lambda w: (w["top"], w["x0"]))


def page_words(pdf, pn):
    out = []
    for w in pdf.pages[pn - 1].extract_words(extra_attrs=["size", "fontname"]):
        if not w.get("upright", True) or w["x0"] < -1 or w["x1"] > PAGE_W + 1:
            continue
        out.append({"text": w["text"], "x0": w["x0"], "x1": w["x1"], "top": w["top"], "bottom": w["bottom"], "size": w["size"],
                    "font": w["fontname"].split("+")[-1], "xc": (w["x0"] + w["x1"]) / 2})
    return sorted(out, key=lambda w: (w["top"], w["x0"]))


def group_lines(words, tol=2.2):
    lines = []
    for w in words:
        if lines and abs(w["top"] - lines[-1]["top"]) <= tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
        ln["text"] = " ".join(w["text"] for w in ln["words"])
    return lines


def build_left_anchors(hw):
    """Spec column anchors from the header words of one header block (left page)."""
    inex = [w for w in hw if w["text"] in ("IN.", "IN", "EX.", "EX")]
    if inex:
        low = max(w["top"] for w in inex)  # the IN./EX. row is the last header line; 'DURATION IN DEGREES' sits higher
        inex = [w for w in inex if low - w["top"] <= 3.5]
    ins = sorted([w for w in inex if w["text"].startswith("IN")], key=lambda w: w["x0"])
    exs = sorted([w for w in inex if w["text"].startswith("EX")], key=lambda w: w["x0"])
    pairs = list(zip(ins, exs))
    groups = []
    for w in hw:
        t = w["text"].upper()
        if t == "SETTING":
            groups.append(("lash", w["xc"]))
        elif t == "ADVERTISED":
            groups.append(("durAdv", w["xc"]))
        elif re.match(r"^\.0\d\d\"?$", t):
            groups.append(("dur050" if t.startswith(".050") else "dur" + t.strip('"').lstrip("."), w["xc"]))
        elif t == "LIFT":
            groups.append(("valveLift", w["xc"]))
        elif t == "CENTERLINE":
            groups.append(("centerline", w["xc"]))
    anchors = OrderedDict()
    used = set()
    for a, b in pairs:
        pc = (a["xc"] + b["xc"]) / 2
        best = None
        for gi, (g, gx) in enumerate(groups):
            if gi in used:
                continue
            d = abs(gx - pc)
            if best is None or d < best[0]:
                best = (d, gi, g)
        if best is None or best[0] > 60:
            continue
        used.add(best[1])
        anchors[best[2] + "Int"] = a["xc"]
        anchors[best[2] + "Exh"] = b["xc"]
    for w in hw:
        t = w["text"].upper()
        if t == "RANGE":
            anchors["rpm"] = w["xc"]
        elif t == "PART":
            anchors["pn"] = w["xc"] + 8
        elif t == "GRIND":
            anchors["grind"] = w["xc"] + 8
        elif t in ("ANGLE", "ANGLE**"):
            anchors["lsa"] = w["xc"]
    if "rpm" not in anchors:
        for w in hw:
            if w["text"].upper() == "OPERATING":
                anchors["rpm"] = w["xc"]
    rr = None
    rr_exh = None
    for i, w in enumerate(hw):
        if w["text"].upper() == "W/":
            nxt = [v for v in hw if v["x0"] > w["x0"] and abs(v["top"] - w["top"]) < 3]
            nxt.sort(key=lambda v: v["x0"])
            if nxt:
                m = re.match(r"^(\d\.\d+)(?:/(\d\.\d+))?$", nxt[0]["text"])
                if m:
                    rr = float(m.group(1))
                    rr_exh = float(m.group(2)) if m.group(2) else None
    return anchors, rr, rr_exh


def build_right_columns(data_words, header_words):
    """Cluster right-page data words into columns and label them with the header words above."""
    pts = sorted(data_words, key=lambda w: w["xc"])
    cols = []
    for w in pts:
        if cols and w["xc"] - cols[-1]["xs"][-1] <= 16:
            cols[-1]["xs"].append(w["xc"])
            cols[-1]["x0"] = min(cols[-1]["x0"], w["x0"])
            cols[-1]["x1"] = max(cols[-1]["x1"], w["x1"])
        else:
            cols.append({"xs": [w["xc"]], "x0": w["x0"], "x1": w["x1"]})
    for c in cols:
        c["xc"] = sum(c["xs"]) / len(c["xs"])
        c["labels"] = []
    for w in sorted(header_words, key=lambda w: (w["top"], w["x0"])):
        if w["size"] >= 13:
            continue  # the engine heading repeated on the right page
        hits = [c for c in cols if min(c["x1"], w["x1"]) - max(c["x0"], w["x0"]) > 0.25 * (w["x1"] - w["x0"])]
        if not hits:
            best = min(cols, key=lambda c: abs(c["xc"] - w["xc"])) if cols else None
            if best is not None and abs(best["xc"] - w["xc"]) <= 28:
                hits = [best]
        for hit in hits:
            hit["labels"].append(w["text"])
    for c in cols:
        c["label"] = " ".join(c["labels"]).strip()
        c["key"] = kit_key(c["label"]) if c["label"] else "col"
    return cols


def nearest(anchors, xc, maxd=40):
    best = None
    for k, ax in anchors.items():
        d = abs(ax - xc)
        if best is None or d < best[0]:
            best = (d, k)
    if best is None or best[0] > maxd:
        return None
    return best[1]


CAM_TYPE_RE = [
    (re.compile(r"hydraulic.*flat tappet", re.I), "hydraulic_flat"),
    (re.compile(r"(mechanical|solid).*flat tappet", re.I), "solid_flat"),
    (re.compile(r"hydraulic.*roller|hydraulic.*follower", re.I), "hydraulic_roller"),
    (re.compile(r"(mechanical|solid).*roller|(mechanical|solid).*follower", re.I), "solid_roller"),
]


def cam_type_from(series, grind, lash_int):
    for rx, t in CAM_TYPE_RE:
        if series and rx.search(series):
            return t
    g = (grind or "").upper()
    hyd = (lash_int is None) or (isinstance(lash_int, str) and lash_int.lower().startswith("hyd"))
    if re.search(r"HR\d*$|HR-|HR\b", g):
        return "hydraulic_roller"
    if re.search(r"R\d*$|R-\d", g):
        return "solid_roller" if not hyd else "hydraulic_roller"
    return "hydraulic_flat" if hyd else "solid_flat"


# engine heading -> family (ordered; first match wins). cyl taken from the heading when stated.
FAMILY_MAP = [
    (r"AMERICAN MOTORS 199-258", ["AMC/Jeep inline-6"]),
    (r"AMERICAN MOTORS 290-401", ["AMC V8"]),
    (r"CHRYSLER 170-225", ["Mopar Slant Six"]),
    (r"CHRYSLER 273-360|CHRYSLER V8 273-360", ["Mopar LA small block"]),
    (r"CHRYSLER (V8 )?383-440", ["Mopar B/RB big block"]),
    (r"DODGE 5\.7L & 6\.1L HEMI", ["Chrysler Gen III Hemi 5.7/6.1"]),
    (r"DODGE 5\.7L & 6\.4L HEMI", ["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"]),
    (r"CHRYSLER (V8 )?426 HEMI", ["Chrysler 426 Hemi"]),
    (r"FORD 240-300", ["Ford 240/300 inline-6"]),
    (r"FORD 4\.6L & 5\.4L SOHC|FORD 4\.6L, 5\.4L & 5\.8L DOHC|FORD 4\.6L? (&|AND) 5\.4L", ["Ford Modular"]),
    (r"FORD COYOTE", ["Ford Coyote"]),
    (r"FORD (V8 )?221-302|FORD 5\.0L 8 CYL|FORD (V8 )?351W|FORD (V8 )?289-302|FORD 302", ["Small-block Ford (Windsor)"]),
    (r"FORD (V8 )?351C", ["Ford 351C/351M/400"]),
    (r"FORD (V8 )?352-428|FORD FE", ["Ford FE"]),
    (r"FORD (V8 )?429, 460|FORD (V8 )?429-460|FORD 429/460", ["Ford 429/460"]),
    (r"FORD 7\.3L? GODZILLA|GODZILLA", ["Ford Godzilla 7.3"]),
    (r"BUICK 181-252|BUICK GRAND NATIONAL 231|BUICK V6 231|BUICK STAGE II EVEN FIRE", ["Buick V6 181-252"]),
    (r"BUICK 350 ", ["Buick 350"]),
    (r"BUICK 400, 430, 455|BUICK 400-455", ["Buick big block"]),
    (r"CADILLAC 425, 472, 500|CADILLAC 472", ["Cadillac 368-500"]),
    (r"CHEVROLET 194-250 C\.I\. 6 CYL|CHEVROLET 194-250", ["Chevy inline-6"]),
    (r"CHEVROLET (V8 )?262-400|CHEVROLET 305-350 C\.I\. 8 CYL|GM LT1 & LT4 350|CHEVROLET 265-400|CHEVROLET 283-400", ["Small-block Chevy"]),
    (r"GM LS[ 0-9]|GM LS GEN|LS ENGINE", ["GM LS"]),
    (r"GM LT1 GEN V|GM LT GEN V|GEN V LT", ["GM LT (Gen V)"]),
    (r"CHEVROLET 348-409", ["Chevy W-series 348/409"]),
    (r"CHEVROLET 396-454|CHEVROLET (V8 )?396-454", ["Chevy Mark IV big block"]),
    (r"CHEVROLET GEN VI 454 & 502|GEN VI", ["Chevy Gen VI big block"]),
    (r"DURAMAX", ["Duramax 6.6"]),
    (r"OLDSMOBILE (V8 )?260-455|OLDSMOBILE (V8 )?330-455", ["Oldsmobile V8"]),
    (r"PONTIAC (V8 )?265-455|PONTIAC (V8 )?326-455", ["Pontiac V8"]),
]


def heading_fit(heading):
    """Parse an engine heading like 'CHEVROLET 262-400 C.I. 8 CYL. 1958-1998' into fit fields."""
    h = clean(heading).replace("(CONTINUED)", "").strip()
    hu = h.upper()
    fams = None
    for rx, f in FAMILY_MAP:
        if re.search(rx, hu):
            fams = f
            break
    fit = OrderedDict()
    m = re.search(r"\b(\d{1,3}(?:,? ?(?:&|,) ?\d{1,3})+)\b\s*(?:C\.I\.|V8|CU)", hu)
    m2 = re.search(r"\b(\d{3})-(\d{3})\s*C\.I\.", hu) or re.search(r"\b(\d{3})-(\d{3})\b(?!\s*(?:OHC|OHV|CC|HP|LBS))", hu)
    if m:
        fit["ci"] = sorted({int(x) for x in re.findall(r"\d{1,3}", m.group(1))})
    elif m2 and int(m2.group(1)) < int(m2.group(2)) and int(m2.group(1)) >= 100 and not re.search(r"\b(19|20)\d\d-", m2.group(0)):
        fit["ciRange"] = [int(m2.group(1)), int(m2.group(2))]
    else:
        m3 = re.search(r"\b(\d{3})\s*C\.I\.", hu)
        if m3:
            fit["ci"] = [int(m3.group(1))]
    liters = re.findall(r"(\d\.\d)L", hu)
    if liters:
        fit["liters"] = sorted({float(x) for x in liters})
    mc = re.search(r"\b(\d{1,2})\s*CYL", hu)
    if mc:
        fit["cyl"] = int(mc.group(1))
    elif "V8" in hu or "HEMI" in hu or "COYOTE" in hu or "LS" in hu.split() or "LT1" in hu:
        fit["cyl"] = 8
    elif re.search(r"\bV6\b|6 CYL", hu):
        fit["cyl"] = 6
    my = re.search(r"\b(19\d\d|20\d\d)\s*(?:½)?\s*-\s*(19\d\d|20\d\d|PRESENT|UP)", hu)
    if my:
        fit["y0"] = int(my.group(1))
        if my.group(2).isdigit():
            fit["y1"] = int(my.group(2))
    return fams, fit, h


def parse_rpm(tokens):
    s = " ".join(tokens)
    m = re.search(r"(\d{3,5})\s*(?:to|-|–)\s*(\d{3,5})", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def is_lead_line(ln):
    """First line of an entry description: bold lead word at the left margin (HYDRAULIC −, SOLID −, DOHC –, ROLLER ...)."""
    left = [w for w in ln["words"] if w["x0"] < RIGHT_X]
    return bool(left) and left[0]["x0"] < 70 and left[0]["font"] == "HelveticaNeueLTStd-BdCn" and left[0]["size"] >= 7.5


def parse_cam_spread(words, pn_even, stats, specialty=False, heading0=None, single_page=False):
    """Parse one spread (or one single page) into cam rows. Returns (rows, last heading)."""
    words = [w for w in words if not any(s in w["font"] for s in DROP_FONT_SUBSTR) and w["top"] > 60]
    if single_page:
        words = [w for w in words if w["x0"] < RIGHT_X]
    lines = group_lines(words)
    rows = []
    heading = heading0
    series = None
    anchors, rr, rr_exh, cols = None, None, None, []
    header_buf = []
    carb_note = None
    section = None
    sections = []

    def flush():
        nonlocal section
        if section and section["lines"]:
            sections.append(section)
        section = None

    right_data_all = [w for w in words if w["x0"] >= RIGHT_X and w["font"] not in HEADER_FONTS and w["size"] >= 7.5
                      and w["font"] != SERIES_FONT and w["font"] != "HelveticaLTStd-Roman" and w["top"] < 725
                      and (w["text"].upper() == "N/A" or (re.match(r"^[A-Z0-9][A-Z0-9/\-.+*]*$", w["text"]) and re.search(r"\d", w["text"])))]
    for ln in lines:
        ws = ln["words"]
        left = [w for w in ws if w["x0"] < RIGHT_X]
        if not left:
            if section is not None:
                section["lines"].append(ln)
            continue
        big = [w for w in left if w["size"] >= 13 and w["font"] == HEADING_FONT]
        if big and not specialty:
            flush()
            txt = " ".join(w["text"] for w in big).replace("(CONTINUED)", "").strip()
            if not txt:
                continue
            heading = txt
            header_buf = []
            anchors = None
            continue
        if specialty and re.search(r"CUSTOM GRINDS AVAILABLE", ln["text"]) and left[0]["x0"] < 100:
            flush()
            heading = re.sub(r"\s*CUSTOM GRINDS AVAILABLE.*$", "", ln["text"]).strip()
            m = re.search(r"\((\d{2,3}-000-\d)\)", ln["text"])
            stats["specialty_custom_pn"][heading] = m.group(1) if m else None
            continue
        hdr = [w for w in ws if w["font"] in HEADER_FONTS and w["size"] <= 8.5]
        if hdr and len(hdr) >= max(1, len(ws) // 2):
            flush()
            header_buf.extend(hdr)
            anchors = None
            continue
        if header_buf and anchors is None:
            a, rr_, rre_ = build_left_anchors([w for w in header_buf if w["x0"] < RIGHT_X])
            if "pn" in a:
                anchors, rr, rr_exh = a, rr_, rre_
                cols = build_right_columns(right_data_all, [w for w in header_buf if w["x0"] >= RIGHT_X]) if not specialty else []
            header_buf = []
        ser = [w for w in left if w["font"] == SERIES_FONT and w["size"] >= 8.5]
        if ser and ser[0]["x0"] < 70:
            flush()
            series = " ".join(w["text"] for w in ser).replace("™", "").replace(" ,", ",")
            series = re.sub(r"\s+", " ", series).strip()
            carb_note = "C.A.R.B. approved per catalog footnote" if re.search(r"C\.A\.R\.B|50-State|CARB EO", series) else None
            continue
        if anchors is None:
            continue
        cutoff = min(anchors.values()) - 6
        if left[0]["x0"] < 70 and left[0]["size"] <= 7.2 and left[0]["font"] == "HelveticaLTStd-Roman":
            flush()
            continue  # footnotes
        data = [w for w in ws if (w["x1"] > cutoff and w["x0"] < RIGHT_X and w["size"] >= 6) or (w["x0"] >= RIGHT_X and w["size"] >= 6)]
        if not data and not is_lead_line(ln):
            continue
        if section is None:
            section = {"lines": [], "heading": heading, "series": series, "anchors": anchors, "rr": rr, "rr_exh": rr_exh,
                       "cols": cols, "carb": carb_note, "cutoff": cutoff}
        section["lines"].append(ln)
    flush()

    def is_pn_word(w, anchors, cutoff):
        if w["x0"] >= RIGHT_X or w["x1"] <= cutoff or w["size"] < 6:
            return False
        if nearest(anchors, w["xc"]) != "pn":
            return False
        return (w["font"] == PN_FONT or specialty) and re.match(r"^[A-Z]{0,4}-?\d{2,6}(-[A-Z0-9]{1,6})*\*?$", w["text"]) is not None

    for sec in sections:
        anchors = sec["anchors"]
        pn_lines = []
        for i, ln in enumerate(sec["lines"]):
            pws = [w for w in ln["words"] if is_pn_word(w, anchors, sec["cutoff"])]
            if pws:
                pn_lines.append((i, ln["top"], pws[0]["text"].rstrip("*")))
        if not pn_lines:
            stats["bands_without_pn"] += len(sec["lines"])
            continue
        # entry boundaries: each entry's description starts with a bold lead word at the left margin
        # ("HYDRAULIC −", "SOLID −", "DOHC –", "ROLLER" ...); the first component row shares that line.
        blocks = []
        for ln in sec["lines"]:
            if is_lead_line(ln) or not blocks:
                blocks.append([ln])
                if len(blocks) > 1 and blocks[-2]:
                    # a part number printed on the line just above the description's lead line belongs to this entry
                    prev_ln = blocks[-2][-1]
                    left_data = [w for w in prev_ln["words"] if w["x0"] < RIGHT_X and w["x1"] > sec["cutoff"] and w["size"] >= 6]
                    if left_data and ln["top"] - prev_ln["top"] <= 6.5 and all(is_pn_word(w, anchors, sec["cutoff"]) for w in left_data):
                        blocks[-2].pop()
                        blocks[-1].insert(0, prev_ln)
                        if not blocks[-2]:
                            del blocks[-2]
            else:
                blocks[-1].append(ln)
        entries = []
        for blk in blocks:
            pls = [(ln["top"], [w["text"].rstrip("*") for w in ln["words"] if is_pn_word(w, anchors, sec["cutoff"])]) for ln in blk]
            pls = [(t, p) for t, p in pls if p]
            if not pls:
                stats["bands_without_pn"] += len(blk)
                continue
            if len(pls) > 1 and pls[-1][0] - pls[0][0] > 14:
                # no usable lead words here: fall back to midpoints between part-number lines
                for k, (top, pns) in enumerate(pls):
                    lo = -1e9 if k == 0 else (pls[k - 1][0] + top) / 2
                    hi = 1e9 if k == len(pls) - 1 else (top + pls[k + 1][0]) / 2
                    lns = [ln for ln in blk if lo <= ln["top"] < hi and abs(ln["top"] - top) <= 24]
                    entries.append({"pn": pns[0], "extra_pns": pns[1:], "top": top, "lines": lns})
            else:
                pns = []
                for _, p in pls:
                    pns.extend(x for x in p if x not in pns)
                entries.append({"pn": pns[0], "extra_pns": pns[1:], "top": pls[0][0], "lines": blk})
        prev = None
        for e in entries:
            colvals = defaultdict(list)
            kit = OrderedDict()
            core = []
            for ln in e["lines"]:
                for w in ln["words"]:
                    if w["size"] < 6 or w["font"] in HEADER_FONTS:
                        continue
                    if w["x0"] >= RIGHT_X:
                        if not sec["cols"] or w["font"] == "HelveticaLTStd-Roman" or w["size"] < 7.5:
                            continue
                        if not (w["text"].upper() == "N/A" or (re.match(r"^[A-Z0-9][A-Z0-9/\-.+*]*$", w["text"]) and re.search(r"\d", w["text"]))):
                            continue
                        col = None
                        for c in sec["cols"]:
                            if c["x0"] - 6 <= w["xc"] <= c["x1"] + 6:
                                col = c
                                break
                        if col is None:
                            col = min(sec["cols"], key=lambda c: abs(c["xc"] - w["xc"]))
                        v = w["text"].rstrip("*")
                        if v.upper() in ("N/A", "N/A*", "—", "-"):
                            continue
                        kit.setdefault(col["key"], [])
                        if v not in kit[col["key"]]:
                            kit[col["key"]].append(v)
                        continue
                    if w["x1"] <= sec["cutoff"]:
                        continue
                    k = nearest(anchors, w["xc"])
                    if k is None:
                        continue
                    colvals[k].append(w)
            pn = e["pn"]
            others = [w["text"].rstrip("*") for w in colvals.get("pn", []) if w["text"].rstrip("*") != pn]
            core = [o for o in others if not re.match(r"^\d{1,2}(,\d{1,2})*$", o) and not re.match(r"^[A-Z]{0,4}-?\d{2,6}(-[A-Z0-9]{1,6})*$", o)]

            def vals(key):
                ws = sorted(colvals.get(key, []), key=lambda w: (w["top"], w["x0"]))
                return [w["text"] for w in ws]

            grind = None
            glines = sorted(colvals.get("grind", []), key=lambda w: (w["top"], w["x0"]))
            by_line = OrderedDict()
            for w in glines:
                if re.match(r"^\d{1,2}(,\d{1,2})*$", w["text"]):
                    continue
                by_line.setdefault(round(w["top"]), []).append(w["text"].rstrip("*"))
            cands = [" ".join(v) for v in by_line.values()]
            if cands:
                grind = max(cands, key=len)
                core.extend(c for c in cands if c != grind)
            rpm_lo, rpm_hi = parse_rpm(vals("rpm"))
            lash_i = vals("lashInt")
            lash_e = vals("lashExh")
            spec = OrderedDict()
            variants = OrderedDict()

            def numeric_series(key):
                """Column values in reading order: numbers tagged by an optional letter (D/N)."""
                toks = vals(key)
                out = []
                i = 0
                while i < len(toks):
                    v = num(toks[i])
                    if v is None and re.match(r"^\d{3}-\d{1,2}$", toks[i]):  # specialty pages: '296-7' = 296 adv, lobe family 7
                        v = int(toks[i].split("-")[0])
                    if v is not None:
                        tag = None
                        if i + 1 < len(toks) and re.match(r"^[A-Z]$", toks[i + 1]):
                            tag = toks[i + 1]
                            i += 1
                        out.append((v, tag))
                    i += 1
                return out

            numeric_keys = [k for k in anchors if k not in ("pn", "grind", "rpm", "lashInt", "lashExh")]
            for k in numeric_keys:
                ser = numeric_series(k)
                if not ser:
                    continue
                spec[k] = ser[0][0]
                if len(ser) > 1:
                    if all(tag for _, tag in ser):
                        for v, tag in ser:
                            variants.setdefault(tag, OrderedDict())[k] = v
                    else:
                        stats["multi_value_cells"] += 1
                        stats.setdefault("multi_value_samples", []).append((pn_even - 2, pn, k, [v for v, _ in ser]))
            if variants and len(variants) > 1:
                spec["specVariants"] = variants
            lash_int = lash_i[0] if lash_i else None
            lash_exh = lash_e[0] if lash_e else None
            for key, val in (("lashInt", lash_int), ("lashExh", lash_exh)):
                v = num(val) if val else None
                if v is not None:
                    spec[key] = v
            if "lashInt" in spec or "lashExh" in spec:
                spec["lash"] = spec.get("lashInt", spec.get("lashExh"))
            inherited = False
            if "dur050Int" not in spec and "dur053Int" not in spec and "valveLiftInt" not in spec and prev is not None and abs(prev["top"] - e["top"]) <= 12:
                # a second part number printed under the first (same cam on another core); it shares the specs
                base = prev["spec"]
                for k, v in base.items():
                    if k not in ("kit", "core"):
                        spec[k] = v
                if grind is None:
                    grind = base.get("grind")
                if rpm_lo is None:
                    rpm_lo, rpm_hi = base.get("rpmLow"), base.get("rpmHigh")
                lash_int = lash_int or base.get("_lash_int")
                for k, v in base.get("kit", {}).items():
                    kit.setdefault(k, [])
                    for x in v:
                        if x not in kit[k]:
                            kit[k].append(x)
                inherited = True
            typ = cam_type_from(sec["series"], grind, lash_int) if not specialty else None
            if specialty:
                first = e["lines"][0]["words"][0]["text"].upper() if e["lines"] and e["lines"][0]["words"] else ""
                g = (grind or "").upper()
                if first == "HYDRAULIC":
                    typ = "hydraulic_roller" if "HR" in g else "hydraulic_flat"
                elif first == "SOLID":
                    typ = "solid_flat"
                elif first == "ROLLER":
                    typ = "hydraulic_roller" if "HR" in g else "solid_roller"
                else:
                    typ = cam_type_from(None, grind, None)
            out = OrderedDict()
            for k in ("durAdvInt", "durAdvExh", "dur050Int", "dur050Exh", "dur053Int", "dur053Exh", "valveLiftInt", "valveLiftExh", "lsa",
                      "centerlineInt", "centerlineExh", "lash", "lashInt", "lashExh"):
                if k in spec:
                    out[k] = spec[k]
            if "centerlineInt" in out:
                out["icl"] = out["centerlineInt"]
            if sec["rr"] is not None:
                out["rr"] = sec["rr"]
                if sec["rr_exh"] is not None:
                    out["rrExh"] = sec["rr_exh"]
            out["type"] = typ
            if rpm_lo is not None:
                out["rpmLow"], out["rpmHigh"] = rpm_lo, rpm_hi
            if grind:
                out["grind"] = grind
            if sec["series"]:
                out["series"] = sec["series"]
            if core:
                out["core"] = " ".join(core)
            if "specVariants" in spec:
                out["specVariants"] = spec["specVariants"]
            if inherited:
                out["sharesSpecsWith"] = prev["pn"]
            if kit:
                # spring-kit columns labelled by retainer material hold *-KIT numbers
                fixed = OrderedDict()
                for k, v in kit.items():
                    if k in ("retainersSteel", "retainersToolSteel", "retainersTitanium") and all(x.upper().endswith("-KIT") for x in v):
                        k = "springKits" + k[len("retainers"):]
                    fixed.setdefault(k, [])
                    fixed[k].extend(x for x in v if x not in fixed[k])
                out["kit"] = fixed
            rows.append({"pn": pn, "heading": sec["heading"], "spec": out, "carb": sec["carb"], "page": pn_even - 2})
            for extra in e.get("extra_pns", []):
                # a second part number printed in the same entry (same cam on another core / firing order); shares the row
                out2 = OrderedDict((k, v) for k, v in out.items() if k != "_lash_int")
                out2["sharesSpecsWith"] = pn
                rows.append({"pn": extra, "heading": sec["heading"], "spec": out2, "carb": sec["carb"], "page": pn_even - 2})
            out["_lash_int"] = lash_int
            prev = {"pn": pn, "top": e["top"], "spec": out}
    for r in rows:
        r["spec"].pop("_lash_int", None)
    return rows, heading


def parse_cams(pdf, stats):
    stats.setdefault("bands_without_pn", 0)
    stats.setdefault("bands_bad_pn", [])
    stats.setdefault("multi_value_cells", 0)
    stats.setdefault("specialty_custom_pn", OrderedDict())
    stats.setdefault("rows_per_page", OrderedDict())
    rows = []

    def is_spec_page(pn):
        return any(w["text"] == "APPLICATIONS/CAMSHAFTS" and 0 <= w["x0"] < RIGHT_X for w in pdf.pages[pn - 1].extract_words())

    for pn in range(10, 228, 2):
        if is_spec_page(pn + 1):
            # two spec pages facing each other (import engines): no components page, parse each on its own
            rs, _ = parse_cam_spread(page_words(pdf, pn), pn, stats, single_page=True)
            rs2, _ = parse_cam_spread(page_words(pdf, pn + 1), pn + 1, stats, single_page=True)
            for r in rs2:
                r["page"] = pn - 1
            rs = rs + rs2
            stats["single_spec_pages"] = stats.get("single_spec_pages", []) + [pn - 2, pn - 1]
        else:
            words = spread_words(pdf, pn)
            rs, _ = parse_cam_spread(words, pn, stats)
        stats["rows_per_page"][pn - 2] = len(rs)
        rows.extend(rs)
    heading = None
    for pn in range(228, 234):
        words = page_words(pdf, pn)
        rs, heading = parse_cam_spread(words, pn, stats, specialty=True, heading0=heading)
        stats["rows_per_page"][pn - 2] = len(rs)
        for r in rs:
            r["page"] = pn - 2
            r["specialty"] = True
            rows.append(r)
    stats["cam_rows"] = len(rows)
    # cross-check: every bold part-number word on the spec pages should have produced a row
    got = {r["pn"] for r in rows}
    unmatched = []
    for pn in range(10, 228):
        for w in pdf.pages[pn - 1].extract_words(extra_attrs=["fontname", "size"]):
            if 0 <= w["x0"] < RIGHT_X and w["fontname"].endswith("HvCn") and w["size"] >= 7 and w["top"] > 100 \
                    and re.match(r"^[A-Z]{0,4}-?\d{2,6}(-[A-Z0-9]{1,6})*\*?$", w["text"]) and w["text"].rstrip("*") not in got:
                unmatched.append((pn - 2, w["text"].rstrip("*")))
    stats["cam_pn_unmatched"] = unmatched
    records = []
    seen = set()
    dup_rows = 0
    unknown = Counter()
    per_fam = Counter()
    no_heading = 0
    for r in rows:
        if not r["heading"]:
            no_heading += 1
            continue
        fams, fit, htxt = heading_fit(r["heading"])
        if not fams:
            fams = [htxt]
            unknown[htxt] += 1
        sp = r["spec"]
        t = sp.get("type") or "cam"
        name = {"hydraulic_flat": "hydraulic flat tappet", "solid_flat": "solid flat tappet", "hydraulic_roller": "hydraulic roller",
                "solid_roller": "solid roller"}.get(t, t) + " cam"
        if sp.get("grind"):
            name += f", {sp['grind']} grind"
        if "dur050Int" in sp and "dur050Exh" in sp:
            name += f", {sp['dur050Int']}/{sp['dur050Exh']} @ .050"
        if "lsa" in sp:
            name += f", {sp['lsa']} LSA"
        for fam in fams:
            key = (r["pn"], fam)
            if key in seen:
                dup_rows += 1
                continue
            seen.add(key)
            f = OrderedDict([("fam", fam)])
            for k in ("ci", "ciRange", "liters", "cyl", "y0", "y1"):
                if k in fit:
                    f[k] = fit[k]
            notes = "catalog section: " + htxt
            if r["carb"]:
                notes += "; " + r["carb"]
            if r.get("specialty"):
                notes += "; specialty listing (custom grinds section)"
            f["notes"] = notes
            records.append(OrderedDict([
                ("m", BRAND), ("p", r["pn"]), ("cat", "cam"), ("name", name), ("fit", f), ("spec", sp),
                ("src", OrderedDict([("doc", "COMP Cams Master Reference Guide (COMP-Catalog.pdf), camshaft application pages"),
                                     ("edition", EDITION["catalog"]), ("url", DOCS["catalog"]), ("page", r["page"])])),
                ("emissions", None),
            ]))
            per_fam[fam] += 1
    stats["cam_dup_rows"] = dup_rows
    stats["cam_unknown_families"] = unknown
    stats["cam_per_family"] = per_fam
    stats["cam_rows_without_heading"] = no_heading
    return records


# ----------------------------------------------------------------------------------------------
# validation + output
# ----------------------------------------------------------------------------------------------
def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat", "src"):
            if not r.get(k):
                problems.append(f"missing {k}: {r.get('p')}")
        if not r.get("fit", {}).get("fam"):
            problems.append(f"missing fit.fam: {r.get('p')}")
        key = (r["m"], r["p"], r["fit"]["fam"], r["cat"])
        if key in seen:
            problems.append(f"duplicate: {key}")
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str):
                if o == "":
                    problems.append(f"empty string at {path} ({r['p']})")
            elif isinstance(o, float) and (o != o):
                problems.append(f"NaN at {path}")

        walk(r, r["p"])
    return problems


EDITION = {"lobes": "", "catalog": ""}


def pdf_edition(pdf, fallback):
    md = pdf.metadata or {}
    for k in ("ModDate", "CreationDate"):
        v = md.get(k)
        if v and re.match(r"D:\d{6}", v):
            return v[2:6] + "-" + v[6:8]
    return fallback


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="do not touch the network; parse cached PDFs")
    args = ap.parse_args()
    import pdfplumber

    log = []
    os.makedirs(DL, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    paths = {}
    if not args.offline:
        check_robots(log)
    for key, url in DOCS.items():
        dest = os.path.join(DL, url.rsplit("/", 1)[-1])
        if args.offline:
            if not os.path.exists(dest):
                raise SystemExit(f"--offline but {dest} is missing")
            paths[key] = dest
        else:
            paths[key] = fetch(url, dest, log)
    today = dt.date.today().isoformat()
    stats = OrderedDict()
    pdfs = {k: pdfplumber.open(v) for k, v in paths.items()}
    EDITION["lobes"] = pdf_edition(pdfs["lobes"], today[:7])
    EDITION["catalog"] = pdf_edition(pdfs["catalog"], today[:7])
    stats["pages"] = {k: len(p.pages) for k, p in pdfs.items()}

    lobes = parse_lobes(pdfs["lobes"], stats)
    springs = parse_springs(pdfs["catalog"], stats)
    cams = parse_cams(pdfs["catalog"], stats)
    records = cams + springs + lobes
    problems = validate(records)
    stats["validation_problems"] = problems
    if problems:
        print("VALIDATION PROBLEMS:", len(problems), file=sys.stderr)
        for p in problems[:40]:
            print("  ", p, file=sys.stderr)

    out = OrderedDict([
        ("source", OrderedDict([
            ("brand", BRAND),
            ("edition", OrderedDict([("lobes", EDITION["lobes"]), ("catalog", EDITION["catalog"])])),
            ("docs", DOCS), ("fetched", today),
            ("notes", "COMP Cams Master Lobe Profile Catalog and Master Reference Guide PDFs from the Edelbrock Group S3 bucket; no product pages crawled"),
        ])),
        ("extracted", today), ("count", len(records)), ("parts", records),
    ])
    with open(os.path.join(OUT, "comp.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(records, stats, log, today, args.offline)
    print(f"wrote {len(records)} records: cams {len(cams)}, springs {len(springs)}, lobes {len(lobes)}")


def write_notes(records, stats, log, today, offline):
    cats = Counter(r["cat"] for r in records)
    L = []
    L.append("# COMP Cams — extraction notes\n")
    L.append(f"Extracted {today} by `scripts/parts-catalog/extract_comp.py`.\n")
    L.append("## What was fetched\n")
    n_get = sum(1 for l in log if l.startswith("GET"))
    L.append(f"{n_get} HTTP requests to `{HOST}`, one at a time, >= 6 s apart, UA `{UA}`"
             + (" (this run: --offline, cached PDFs only)" if offline else "") + ":\n")
    for l in log:
        L.append(f"- {l}")
    L.append("")
    L.append("The bucket publishes no `robots.txt` (S3 answers 403 AccessDenied for the missing key; the PDFs themselves return 200). "
             "Only the two catalog PDFs named in CLOUD_TASKS.md were downloaded; no compcams.com pages were requested. "
             "Downloads live in `dl/comp/` (gitignored); `--offline` re-parses them without the network.\n")
    L.append("| doc | url | pages | edition (PDF metadata) |")
    L.append("|---|---|---|---|")
    for k, u in DOCS.items():
        L.append(f"| {k} | {u} | {stats['pages'][k]} | {EDITION[k]} |")
    L.append("")
    L.append("## Records\n")
    L.append("| cat | records |")
    L.append("|---|---|")
    for c, n in cats.most_common():
        L.append(f"| {c} | {n} |")
    L.append(f"| **total** | {len(records)} |")
    L.append("")
    L.append("### Cams per family\n")
    L.append("| family | records |")
    L.append("|---|---|")
    for fam, n in stats["cam_per_family"].most_common():
        L.append(f"| {fam} | {n} |")
    L.append("")
    L.append("### Lobes per section\n")
    L.append("| type | records |")
    L.append("|---|---|")
    for t, n in stats["lobe_per_type"].most_common():
        L.append(f"| {t} | {n} |")
    L.append("")
    L.append("## How each source was parsed\n")
    L.append("- **Lobes** (`COMP-Lobe-Catalog.pdf`, catalog pp 11-159): pdfplumber `lines` strategy on every ruled table. The two header rows map "
             "columns to keys (rated/advertised duration, duration @ .006/.010/.020/.050/.200, lobe lift, tappet lift @ TDC at 106/110/114 deg, "
             "theoretical valve lift at the three rocker ratios printed for that table). `valveLift15/16/17` are filled when those ratios are "
             "printed; every ratio column is also kept in `valveLiftByRatio`. The merged first column (family, rated-duration tappet lift, minimum "
             "tappet diameter, journal suffix codes) is read from the words inside the cell and stored in `spec.family`; header-less continuation "
             f"tables ({stats['lobe_headerless_tables']}) inherit the previous table's layout. `type` comes from the catalog section "
             "(hydraulic flat tappet pp 11-17, hydraulic roller 18-47, solid flat tappet 48-70, solid roller 71-141, OHC pivoting follower "
             "142-154 = `ohc_follower`, OHC direct acting 155-159 = `ohc_direct`). Lobes for intake/exhaust pairs keep the printed pair "
             "number as `p` (e.g. `8374-8375`). Rated duration strings such as `240-4` are kept in `ratedDur` with `durAdv` = 240. "
             "The index pages (160-176) are not parsed.")
    L.append("- **Springs** (`COMP-Catalog.pdf`): master chart catalog pp 297-307 (one spring per column: type, installed height, OD/ID, inner ID, "
             "rate, damper, loads at each height, maximum coil bind height, retainer/seat/locator/shim part numbers) merged with the quick "
             "reference table on p 289 (max lift, installed load = `seatLb`, open load/height, coil bind, rate, application group). Beehive/conical "
             "`a/b` diameters are stored as top (`odTop`/`idTop`) and base (`od`/`id`); triple springs store `idMiddle`/`idInner`. "
             "`seatLb` is the load at installed height. The single/dual/triple listing tables on pp 291-296 were not used (same data, and the "
             "even pages' ruled columns merge under pdfplumber).")
    L.append("- **Cams** (`COMP-Catalog.pdf`, catalog pp 8-225 + specialty pp 226-231): each even PDF page carries the words of the whole two-page "
             "spread (specs on the left page, kit components on the right page at x >= 621 pt). Words are binned by x to anchors derived from "
             "the header words of each engine section (valve setting in/ex, RPM range, part #, grind #, advertised in/ex, @ .050 in/ex, valve lift "
             "in/ex at the rocker ratio printed in the header = `rr`, LSA; centerline in/ex on the import pages). Entries are vertical bands of lines "
             "closer than 7.5 pt. Component columns are clustered from the right-page data words and labelled with the header words above them; "
             "known labels map to `kit.kKit/skKit/clKit/rpKit/lifters/timingSet/rockers/pushrods/springs/retainers/locks/seals/...`, others keep a "
             "camel-case slug of the printed label. Every kit value is a list because many entries print two component rows (e.g. a standard and a "
             "Magnum rocker/pushrod/spring set). Footnote superscripts (font size < 6) are dropped. The description text left of the valve-setting "
             "column is not stored (marketing text). Cam type is read from the series heading (Hydraulic/Mechanical x Flat Tappet/Roller/Follower), "
             "falling back to the grind suffix and valve setting.")
    L.append("")
    L.append("## Skipped rows and QA items\n")
    L.append(f"- Cam entry bands without a part number (e.g. LS truck identification tables, core notes): {stats['bands_without_pn']}.")
    if stats["bands_bad_pn"]:
        L.append(f"- Cam bands whose part-number token did not look like a part number (dropped): {', '.join(stats['bands_bad_pn'][:30])}")
    L.append(f"- Cam rows repeated under the same family (same PN listed again, e.g. marine/towing re-listings with another RPM range; first kept): {stats['cam_dup_rows']}.")
    L.append(f"- Cam rows with no engine heading above them (dropped): {stats['cam_rows_without_heading']}.")
    L.append(f"- Cam spec cells with several untagged values (first kept): {stats['multi_value_cells']}.")
    L.append(f"- Catalog pages parsed as stand-alone spec pages (no components page facing them): {stats.get('single_spec_pages', [])}.")
    L.append(f"- Lobe rows kept raw (`spec.rawValues`) because the table header does not line up with the values: {stats.get('lobe_raw_rows', 0)} "
             "(Ford Modular XE follower lobes, catalog pp 145-147).")
    L.append(f"- Lobe tables skipped because no column layout could be inherited: {stats.get('lobe_tables_skipped', 0)}.")
    L.append(f"- Cross-check against the catalog's bold part-number words on the spec pages: {len(stats['cam_pn_unmatched'])} not matched by a record"
             + (" (" + ", ".join(f"p{p} {x}" for p, x in stats["cam_pn_unmatched"][:30]) + ")" if stats["cam_pn_unmatched"] else "") + ".")
    L.append(f"- Cross-check against the lobe catalog's own index (pp 160-176): {stats['lobe_index_unique']} lobe numbers indexed; "
             f"not extracted: {stats['lobe_index_missing'] or 'none'}; extracted but not indexed: {stats['lobe_not_in_index'] or 'none'}.")
    if stats.get("multi_value_samples"):
        L.append("- Multi-value cell samples (catalog page, part, column, values): " + "; ".join(f"p{p} {pn} {k} {v}" for p, pn, k, v in stats["multi_value_samples"][:12]))
    L.append(f"- Lobe numbers listed twice with identical specs (second dropped): {stats['lobe_dups_identical']}.")
    if stats["lobe_dups_conflict"]:
        L.append(f"- Lobe numbers listed twice with different specs (first kept; QA): " + ", ".join(f"{l} (pp {a}/{b})" for l, a, b in stats["lobe_dups_conflict"]))
    if stats["lobe_unknown_cells"]:
        items = ", ".join(f"{k}={v!r}" for (k, v), n in list(stats["lobe_unknown_cells"].items())[:20])
        L.append(f"- Lobe cells that were not numeric and were dropped: {items}")
    L.append(f"- Springs: {stats['spring_master_chart']} part numbers in the master chart, {stats['spring_quick_ref']} in the quick reference, "
             f"{stats['spring_conflicts']} value conflicts between the two (listed on the records).")
    for f in stats["spring_flags"]:
        L.append(f"- {f}")
    L.append("- `specVariants` on GM AFM/VVT cams: the catalog prints two spec rows per cam tagged D and N (the two lobe sets); the first printed "
             "row fills the main keys, both are kept under `specVariants` for QA.")
    L.append("- 4-pattern cams (e.g. 35-561-44, catalog p 76) print two untagged spec rows (the two lobe patterns); only the first row is stored "
             "(counted above as multi-value cells). QA if per-pattern specs are wanted.")
    L.append("- Honda/Acura B-series VTEC cams (57100-57400, catalog p 222) print VTEC/primary/secondary lobe columns for intake and exhaust; "
             "those columns are not parsed, so the records carry only lash, RPM range and type.")
    L.append("- `sharesSpecsWith`: a second part number printed inside an entry (same cam on another core, e.g. 12-246-20 under 12-246-3) "
             "gets a record with the entry's specs and kit.")
    L.append("- Lobe 13943 (catalog p 25) is printed as a second `13942` row in the PDF text, so it is missing; lobe 5128 is printed twice on p 12 "
             "with rated duration 265 and 273 (first kept).")
    L.append("- Lobe `type` values `ohc_follower` / `ohc_direct` are outside the four planner cam types (overhead-cam lobes); springs and lobes use "
             "`fit.fam = Universal`.")
    L.append("- `fit.ciRange` (e.g. `[262, 400]`) is used when the heading gives a displacement range; `fit.ci` only when it lists displacements.")
    L.append("- Mopar 273-360 (1964-2002) is filed under `Mopar LA small block` only (the Magnum 5.2/5.9 shares the heading but needs the roller "
             "cams); Chevrolet 396-454 (1967-1996) under `Chevy Mark IV big block` only; GM LT1/LT4 1995-1997 under `Small-block Chevy`.")
    L.append("- Cams: `emissions` is null; C.A.R.B.-approved series headings are noted in `fit.notes` only. No delete parts exist in these documents.")
    L.append("")
    L.append("### Engine headings outside the planner vocabulary (kept as `fit.fam`)\n")
    L.append("| heading | cam records |")
    L.append("|---|---|")
    for h, n in stats["cam_unknown_families"].most_common():
        L.append(f"| {h} | {n} |")
    L.append("")
    if stats["validation_problems"]:
        L.append("### Validation problems\n")
        for p in stats["validation_problems"]:
            L.append(f"- {p}")
    else:
        L.append("Validation: no duplicate (part, family) within the brand, every record has m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings.")
    with open(os.path.join(OUT, "comp.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
