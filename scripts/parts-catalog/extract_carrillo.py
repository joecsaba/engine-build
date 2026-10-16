"""CP-Carrillo diesel brochure -> shared parts records.

Source: https://www.cp-carrillo.com/files/diesel-brochure-finalv3email.pdf (4 pages).
  p2: connecting rod tables (GM Duramax, 5.9/6.7 Cummins, Ford Powerstroke) and piston tables
      (GM Duramax, 5.9 Cummins), each `Part # | ID | description`.
  p3: hybrid piston + connecting rod kits (Duramax 6.6, Cummins 5.9).
The brochure is undated. PDF metadata CreationDate is 2016-09-06 and the text says
"Coming Winter 2016".

Usage:  python -I scripts/parts-catalog/extract_carrillo.py
Re-runnable: the PDF is fetched once into dl/carrillo/ (robots.txt checked first, polite UA);
later runs parse the cached file. Writes only dl/carrillo/ and out/carrillo.json.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.robotparser as robotparser
from datetime import date

import pdfplumber

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "carrillo")
OUT = os.path.join(HERE, "out")
PDF_URL = "https://www.cp-carrillo.com/files/diesel-brochure-finalv3email.pdf"
ROBOTS_URL = "https://www.cp-carrillo.com/robots.txt"
PDF_PATH = os.path.join(DL, "diesel-brochure-finalv3email.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "CP-Carrillo"
DOC = "CP-Carrillo diesel brochure PDF (diesel-brochure-finalv3email.pdf)"
EDITION = "undated"

# ---------------------------------------------------------------- fetch

def fetch_pdf():
    """Download the brochure once. Obeys robots.txt and the 6 s per-host gap."""
    if os.path.exists(PDF_PATH) and os.path.getsize(PDF_PATH) > 0:
        return
    import requests  # only needed on first run
    os.makedirs(DL, exist_ok=True)
    headers = {"User-Agent": UA, "Accept": "application/pdf,*/*;q=0.8"}
    r = requests.get(ROBOTS_URL, headers=headers, timeout=30)
    with open(os.path.join(DL, "robots.txt"), "w", encoding="utf-8", errors="replace") as f:
        f.write(f"# status {r.status_code}\n{r.text if r.status_code == 200 else ''}")
    rp = robotparser.RobotFileParser()
    rp.parse(r.text.splitlines() if r.status_code == 200 else [])
    if not (rp.can_fetch(UA, PDF_URL) and rp.can_fetch("*", PDF_URL)):
        sys.exit("robots.txt disallows the brochure URL; stopping")
    delay = rp.crawl_delay(UA) or rp.crawl_delay("*") or 0
    time.sleep(max(6, delay))
    r = requests.get(PDF_URL, headers=headers, timeout=90)
    if r.status_code != 200 or "pdf" not in r.headers.get("content-type", ""):
        sys.exit(f"brochure fetch failed: {r.status_code} {r.headers.get('content-type')}")
    with open(PDF_PATH, "wb") as f:
        f.write(r.content)


# ---------------------------------------------------------------- fitment

CI = {
    "Duramax 6.6": 403,
    "Cummins 5.9 12V": 359,
    "Cummins 5.9 24V/CR": 359,
    "Cummins 6.7": 408,
    "Powerstroke 7.3": 444,
    "Powerstroke 6.0": 365,
    "Powerstroke 6.4": 390,
    "Powerstroke 6.7": 406,
}
CYL = {"Duramax 6.6": 8, "Powerstroke 7.3": 8, "Powerstroke 6.0": 8, "Powerstroke 6.4": 8,
       "Powerstroke 6.7": 8, "Cummins 5.9 12V": 6, "Cummins 5.9 24V/CR": 6, "Cummins 6.7": 6}
CUMMINS_59 = ["Cummins 5.9 12V", "Cummins 5.9 24V/CR"]
CUMMINS_ALL = CUMMINS_59 + ["Cummins 6.7"]

BOLTS = {"H": "WMC-H7 (H11), 220 ksi UTS", "S": "CARR-S7 (MP35N), 285 ksi UTS"}
BOLT_SHORT = {"H": "WMC-H7 bolt", "S": "CARR-S7 bolt"}
ROD_MATERIAL = "4330M forged"
PISTON_ALLOY = "2618 forged, hard anodized"
# Blanket statement on p2 for the diesel piston line.
RING_PACK = "1/16 or 2.0mm top, 2.0mm second, 3.0mm 2-pc oil"


def fit(fam, notes=None, ci=None):
    d = {"fam": fam, "ci": [ci or CI[fam]], "cyl": CYL[fam]}
    if notes:
        d["notes"] = notes
    return d


def src(url_id=None):
    d = {"doc": DOC, "edition": EDITION, "url": PDF_URL}
    if url_id:
        d["id"] = url_id
    return d


def num(s):
    return float(s) if "." in s else int(s)


# ---------------------------------------------------------------- rods

def rod_length_from_pn(pn):
    """Length is encoded as four digits in the PN: `..._6418B7H` -> 6.418, `F-PS60>-76929H` -> 6.929.
    Cross-checked against the brochure's own deltas (0.080/0.202/0.856/1.000 longer than
    stock 6.418 Duramax / 7.559 Cummins)."""
    m = re.search(r"_(\d{4})B7[HS]$", pn) or re.search(r">-7(\d{4})[HS]$", pn)
    if not m:
        raise ValueError(f"no rod length in PN {pn}")
    return int(m.group(1)) / 1000


def rod_records(pn, ident, desc, heading):
    bolt = pn[-1]
    length = rod_length_from_pn(pn)
    spec = {"length": length, "material": ROD_MATERIAL, "bolt": BOLTS[bolt]}
    name_bits = [f"{ROD_MATERIAL} rod", f"{length:.3f} length", BOLT_SHORT[bolt]]
    notes = []
    fams = []
    m = re.search(r"(\d\.\d{3}) pin", desc)
    if m:
        spec["pin"] = float(m.group(1))
    if "Duramx Pin" in desc:  # CR_A59DM: Duramax pin; 1.358 per the DH7100 kit on p3
        spec["pin"] = 1.358
        notes.append("Duramax pin, for DH7100 hybrid piston")
    if " HD" in desc:
        name_bits.append("HD")
    if "Cap Relief" in desc:
        name_bits.append("cap relief")
    if 'Deck Plate' in desc:
        notes.append("1.000 longer than stock, requires deck plate")
    if "0.080\" Longer" in desc:
        notes.append("6.4L: 5.9L crank in 6.7L block, 0.080 longer than stock")
    if "1.156 pin" in desc:
        notes.append("for DHR7030 hybrid piston")

    if heading.startswith("GM Duramax"):
        n = ["LML"] if " LML " in desc else (["HD"] if " HD " in desc else [])
        fams = [("Duramax 6.6", n)]
    elif heading.startswith("5.9/6.7 Cummins"):
        if "0.080\" Longer" in desc:
            fams = [("Cummins 6.7", [])]
        elif "5.9/6.7L" in desc:
            fams = [(f, ["brochure lists 5.9/6.7L; 12V vs 24V not distinguished"] if f != "Cummins 6.7" else [])
                    for f in CUMMINS_ALL]
        else:  # "5.9L" only
            fams = [(f, ["brochure lists 5.9L; 12V vs 24V not distinguished"]) for f in CUMMINS_59]
    elif heading.startswith("Ford Powerstroke"):
        liters = re.search(r"Powerstroke (\d\.\d)L", desc).group(1)
        fams = [(f"Powerstroke {liters}", [])]
    else:
        raise ValueError(f"unknown rod heading {heading}")

    out = []
    for fam, fam_notes in fams:
        all_notes = fam_notes + notes
        ci = 390 if "6.4L" in desc and fam == "Cummins 6.7" else None
        out.append({
            "m": BRAND, "p": pn, "cat": "rod",
            "name": ", ".join(name_bits),
            "fit": fit(fam, "; ".join(all_notes) or None, ci),
            "spec": dict(spec),
            "src": src(ident), "emissions": None,
        })
    return out


# ---------------------------------------------------------------- pistons

def piston_records(pn, ident, desc, heading):
    spec = {"alloy": PISTON_ALLOY, "ringPack": RING_PACK}
    notes = []
    m = re.match(r"(\d) cyl Chevy Duramax (\d\.\d{3}) (\d\.\d{3}) (\d+):1 Comp$", desc)
    if m:  # D7000 .. D7021
        spec.update(bore=float(m.group(2)), ch=float(m.group(3)), cr=num(m.group(4)))
    else:
        m = re.search(r"(\d\.\d{3}) Bore - ([\d.]+):1 -\.(\d{3}) Dish", desc)
        if m:  # DHR7030, DR7021, DH7100
            spec.update(bore=float(m.group(1)), cr=num(m.group(2)), dishDepth=int(m.group(3)) / 1000)
        else:  # DH7101..3: "4.020 x 2.786CH 15.25 comp - Coming Winter 2016"
            m = re.search(r"(\d\.\d{3}) x (\d\.\d{3})CH ([\d.]+) comp", desc)
            spec.update(bore=float(m.group(1)), ch=float(m.group(2)), cr=num(m.group(3)))
    m = re.search(r"(\d\.\d{3}) pin", desc)
    if m:
        spec["pin"] = float(m.group(1))
    m = re.search(r'(\d\.\d{3})" Carrillo rod', desc)
    if m:
        spec["rodLength"] = float(m.group(1))
        notes.append("hybrid piston, requires matching Carrillo rod")
    if "Coming Winter 2016" in desc:
        notes.append("announced 'Coming Winter 2016', no catalog ID")
    if "Sleeved Down" in desc:
        notes.append("sleeved-down 6.7L block")
    if "Replacement" in desc:
        notes.append("stock-replacement CH")

    if heading.startswith("GM Duramax"):
        fams = ["Duramax 6.6"]
    elif "ISB-CR" in desc:
        fams = ["Cummins 5.9 24V/CR"]
    elif "6.7L" in desc:
        fams = ["Cummins 6.7"]
    elif "5.9L" in desc:
        fams = CUMMINS_59
    else:
        raise ValueError(f"unknown piston fitment {pn}")

    name_bits = ["2618 forged piston", f"{spec['bore']:.3f} bore"]
    if "ch" in spec:
        name_bits.append(f"{spec['ch']:.3f} CH")
    name_bits.append(f"{spec['cr']}:1")
    if "dishDepth" in spec:
        name_bits.append(f"{spec['dishDepth']:.3f} dish")
    return [{
        "m": BRAND, "p": pn, "cat": "piston",
        "name": ", ".join(name_bits),
        "fit": fit(fam, "; ".join(notes) or None),
        "spec": dict(spec),
        "src": src(ident), "emissions": None,
    } for fam in fams]


# ---------------------------------------------------------------- hybrid kits

KIT_COMPONENTS = {
    # kit PN prefix -> (piston PN, rod PN by bolt letter)
    "DHR7030": ("DHR7030", {"H": "GM_B66TF_0HS_6620B7H", "S": "GM_B66TF_0HS_6620B7S"}),
    "DH7100": ("DH7100", {"H": "CR_A59DM_1HS_8415B7H", "S": "CR_A59DM_1HS_8415B7S"}),
}


def kit_records(pn, ident, desc, heading):
    desc = " ".join(desc.split())
    prefix, bolt = pn[:-4], pn[-1]
    piston, rods = KIT_COMPONENTS[prefix]
    m = re.search(r'(\d\.\d{3}) Bore - ([\d.]+):1 -\.(\d{3}) Dish (\d\.\d{3}) pin with (\d\.\d{3})" Carrillo Rod', desc)
    spec = {
        "bore": float(m.group(1)), "cr": num(m.group(2)), "dishDepth": int(m.group(3)) / 1000,
        "pin": float(m.group(4)), "rodLength": float(m.group(5)),
        "bolt": BOLTS[bolt], "alloy": PISTON_ALLOY, "rodMaterial": ROD_MATERIAL,
        "components": {"piston": piston, "rod": rods[bolt]},
    }
    fam = "Duramax 6.6" if heading.startswith("Duramax") else "Cummins 5.9 24V/CR"
    notes = "hybrid: longer rod + short-CH piston, no deck plate"
    if fam.startswith("Cummins"):
        notes += "; piston DH7100 is listed for 5.9L ISB-CR"
    name = (f"Hybrid piston + rod kit, {spec['bore']:.3f} bore, {spec['cr']}:1, "
            f"{spec['rodLength']:.3f} rod, {BOLT_SHORT[bolt]}")
    return [{
        "m": BRAND, "p": pn, "cat": "pistonKit", "name": name,
        "fit": fit(fam, notes), "spec": spec, "src": src(ident), "emissions": None,
    }]


# ---------------------------------------------------------------- parse

def parse(pdf_path):
    """Yield (page, heading, pn, id, desc) for every table row on pp 2-3."""
    with pdfplumber.open(pdf_path) as pdf:
        meta = dict(pdf.metadata)
        rows = []
        for pageno in (2, 3):
            for table in pdf.pages[pageno - 1].extract_tables():
                heading = None
                for cells in table:
                    if len(cells) != 3:
                        continue
                    pn, ident, desc = (c or "" for c in cells)
                    if pn == "Part #":
                        heading = desc
                        continue
                    if not pn.strip():
                        continue
                    rows.append((pageno, heading, pn.strip(), ident.strip(), desc.strip()))
    return meta, rows


def build(rows):
    parts, stats, skipped = [], {}, []
    for pageno, heading, pn, ident, desc in rows:
        if heading is None:
            skipped.append((pn, "row before any heading"))
            continue
        if heading.endswith("Rods"):
            recs = rod_records(pn, ident, desc, heading)
        elif heading.endswith("Pistons"):
            recs = piston_records(pn, ident, desc, heading)
        elif pageno == 3:
            recs = kit_records(pn, ident, desc, heading)
        else:
            skipped.append((pn, f"unknown heading {heading!r}"))
            continue
        s = stats.setdefault(heading, {"pns": 0, "records": 0})
        s["pns"] += 1
        s["records"] += len(recs)
        parts.extend(recs)
    return parts, stats, skipped


# ---------------------------------------------------------------- validate

def validate(parts):
    errs = []
    seen = set()

    def walk(v, path):
        if isinstance(v, str) and v == "":
            errs.append(f"empty string at {path}")
        elif isinstance(v, dict):
            for k, x in v.items():
                walk(x, f"{path}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(x, f"{path}[{i}]")

    for r in parts:
        key = (r["m"], r["p"], r["fit"]["fam"])
        if key in seen:
            errs.append(f"duplicate p within family: {key}")
        seen.add(key)
        for k in ("m", "p", "cat", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            errs.append(f"{r['p']}: missing fit.fam")
        walk(r, r["p"])
        for k, v in r["spec"].items():
            if k in ("length", "pin", "bore", "ch", "cr", "dishDepth", "rodLength") and not isinstance(v, (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for k in ("ci",):
            if not all(isinstance(x, int) for x in r["fit"][k]):
                errs.append(f"{r['p']}: fit.{k} not numeric")
    return errs


# ---------------------------------------------------------------- main

def main():
    fetch_pdf()
    meta, rows = parse(PDF_PATH)
    parts, stats, skipped = build(rows)
    errs = validate(parts)
    for e in errs:
        print("VALIDATION:", e)
    if errs:
        sys.exit(1)
    with open(PDF_PATH, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    doc = {
        "source": {
            "brand": BRAND,
            "doc": DOC,
            "url": PDF_URL,
            "edition": EDITION,
            "pdfCreationDate": meta.get("CreationDate"),
            "pdfTitle": meta.get("Title"),
            "sha256": sha,
            "pages": [2, 3],
        },
        "extracted": date.today().isoformat(),
        "count": len(parts),
        "parts": parts,
    }
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "carrillo.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    distinct = len({r["p"] for r in parts})
    print(f"wrote {out_path}: {len(parts)} records, {distinct} distinct PNs")
    for h, s in stats.items():
        print(f"  {h}: {s['pns']} PNs -> {s['records']} records")
    for pn, why in skipped:
        print(f"  skipped {pn}: {why}")
    by_cat = {}
    for r in parts:
        by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
    print("  by cat:", by_cat)


if __name__ == "__main__":
    main()
