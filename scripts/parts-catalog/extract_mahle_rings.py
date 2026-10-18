#!/usr/bin/env python3
"""MAHLE Aftermarket Performance Piston Rings 2022 (catalog PR-40-22) -> shared parts records.

Source: Catalogs/pr-40-22.pdf at the repo root (84 pages, text layer, InDesign, PDF created
2023-01-04; saved by hand because mahle-aftermarket.com blocks fetchers). No network is used.
Printed page number = PDF page - 1.

Pages parsed (PDF numbering):
  24        Nitro-fueled rings: open-stock style rows (bore, axial, radial, material, coating, type,
            position, PN) for Top Fuel / Funny Car 4.187-4.190" bores.
  25-38     Engine ring sets, one table per heading such as
            `1/16", 1/16", 3/16" Plasma-Moly Carbon Steel Low Tension Engine Sets`
            then rows of 8 text lines: set PN, bore, top PN, top radial, second PN, second radial,
            oil PN, oil radial. The set PN suffix (.005/.030/.035/.065) is the oversize over the
            series' nominal bore; no suffix = standard bore.
  41-78     Open stock rings: rows of bore, axial height, radial wall, base material, optional face
            coating, ring type (oil tension in parentheses), position UCR/LCR/OCR, PN.
Skipped: technical pages 1-23, ring code tables 39-40, Hastings interchange 79-82,
measurement equivalents 83-84.

Records: `ring` for every engine set (spec.components carries the three component PNs, their
radial walls and, joined from open stock, their material/face/type) and `ring` for every open
stock ring (spec.position top/second/oil, one width, style "open-stock"). Fitment is Universal:
the catalog names no engine families, only bores.

Marks: `l` (bullet) after a PN = new number, `«` = discontinued (kept, spec.discontinued=true).
"B" suffix on a PN = bulk open stock packaging; it is stripped for matching and the printed form
is kept in spec.printedPn when it differs.

Usage:  python -X utf8 -I scripts/parts-catalog/extract_mahle_rings.py [--pdf PATH]
Writes only out/mahle-rings.json and out/mahle-rings.md.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

try:
    import pymupdf
except ImportError:  # older PyMuPDF
    import fitz as pymupdf

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "out")
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", "pr-40-22.pdf")
BRAND = "MAHLE"
DOC = "MAHLE Aftermarket Performance Piston Rings catalog PR-40-22 (PDF)"
EDITION = "2022 (PR-40-22, supersedes PR-40-16; PDF created 2023-01-04)"
PAGE_OFFSET = 1  # printed page = pdf page - 1

NITRO_PAGES = (24,)
SET_PAGES = range(25, 39)
OPEN_STOCK_PAGES = range(41, 79)

Q = '"”″'
SET_PN_RE = re.compile(r"^(3\d\d-\d{4})(\.\d{3})?\s*([«l]*)$")
COMP_PN_RE = re.compile(r"^(30\d-\d{4})(B?)\s*([«l]*)$")
BORE_RE = re.compile(r"^(?:(\d+\.\d+)MM / )?(\d\.\d{3})[" + Q + r"]$")
RAD_RE = re.compile(r"^(\.\d{3})[" + Q + r"]$")
WIDTH_RE = re.compile(r"^(?:(\d+)/(\d+)[" + Q + r"]|(\.\d{3,4})[" + Q + r"]|(\d+\.\d+)MM)$")
HEADING_RE = re.compile(r"^(\S+), (\S+), (\S+) (.+) Engine Sets$")
TENSION_RE = re.compile(r"\b(Ultra Low|Low|Standard|High) Tension\b")
POSITIONS = {"UCR": "top", "LCR": "second", "OCR": "oil"}
TYPE_RE = re.compile(r"^(?P<code>[A-Z]{2,4}-\d{2}[A-Z]{0,5}(?:-[A-Z]{2})?|CP-20|U-Flex)(?:\s+(?P<extra>Keystone))?(?:\s*\((?P<tension>[A-Za-z ]+)\))?$")

# heading material phrase -> (material, face, series)
SET_MATERIALS = OrderedDict([
    ("PC479 Fire-Power Ductile Iron", ("PC479 hardened ductile iron", None, "PC479 Fire-Power")),
    ("Plasma-Moly Carbon Steel", ("SAE 9254 carbon steel", "Plasma-Moly", "Plasma-Moly Steel")),
    ("Plasma-Moly Ductile Iron", ("ductile iron", "Plasma-Moly", "Plasma-Moly Ductile")),
    ("Plasma-Moly Grey Iron", ("grey iron", "Plasma-Moly", "Plasma-Moly Grey Iron")),
    ("Gas Nitride Steel", ("stainless steel", "GNS", "Gas Nitride Steel")),
    ("Grey Iron Non Coated", ("grey iron", "none", "Grey Iron")),
    ("HV385 Carbon Steel", ("SAE 9254 carbon steel", "HV385", "HV385 Steel")),
])
OS_MATERIALS = {
    "9254 Steel": "SAE 9254 carbon steel",
    "Stainless Steel": "stainless steel",
    "Grey Iron": "grey iron",
    "Ductile Iron": "ductile iron",
    "PC479": "PC479 hardened ductile iron",
    "Intermediate Grey Iron": "intermediate grey iron",
}
OS_FACES = {"Chrome", "GNS", "PVD", "PM251", "PM278", "HV385", "Plasma-Moly", "GNS / PVD"}
TENSIONS = {"standard": "standard", "std": "standard", "low": "low", "ultra low": "ultra-low", "high": "high",
            "x high": "extra-high"}
SECTION_TITLES = {
    "NITRO-FUELED PISTON RINGS": "Nitro-Fueled Piston Rings",
    "CLAIMER RACE APPLICATIONS": "Claimer Race Applications",
    "PC479 FIRE-POWER™ RING SETS": "PC479 Fire-Power Ring Sets",
    "GAS NITRIDE STEEL RING SETS": "Gas Nitride Steel Ring Sets",
    "PLASMA-MOLY STEEL RING SETS": "Plasma-Moly Steel Ring Sets",
    "PLASMA-MOLY DUCTILE RING SETS": "Plasma-Moly Ductile Ring Sets",
    "METRIC RING SETS": "Metric Ring Sets",
    "OPEN STOCK RINGS": "Open Stock Rings",
}


def num(s):
    return float(s)


def width(tok):
    """'1/16"' -> (0.0625, 'in'); '.043"' -> (0.043, 'in'); '3.0MM' -> (3.0, 'mm')."""
    m = WIDTH_RE.match(tok)
    if not m:
        return None, None
    if m.group(1):
        return round(int(m.group(1)) / int(m.group(2)), 4), "in"
    if m.group(3):
        return float(m.group(3)), "in"
    return float(m.group(4)), "mm"


def printed(tok):
    return tok.replace("”", '"').replace("″", '"')


def page_lines(doc, pno):
    return [l.strip() for l in doc[pno - 1].get_text("text").splitlines() if l.strip()]


# ----------------------------------------------------------------------------------------------
# open stock (and nitro) rows
# ----------------------------------------------------------------------------------------------

def parse_open_stock(lines, pno, qa):
    rows, skipped = [], []
    i = 0
    while i < len(lines):
        m = BORE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        j = i + 1
        while j < len(lines) and lines[j] not in POSITIONS and j - i < 9:
            j += 1
        if not (j < len(lines) and lines[j] in POSITIONS and j + 1 < len(lines) and COMP_PN_RE.match(lines[j + 1])):
            skipped.append((pno, lines[i:i + 3]))
            i += 1
            continue
        mid = lines[i + 1:j]
        if len(mid) < 4:
            skipped.append((pno, lines[i:j + 2]))
            i = j + 2
            continue
        axial, radial = mid[0], mid[1]
        toks = mid[2:]
        material = toks[0]
        face = None
        if len(toks) == 3:
            face = toks[1]
        rtype = toks[-1]
        if len(toks) > 3:
            qa.append(f"p{pno} {lines[j + 1]}: unexpected open-stock columns {toks}")
        pnm = COMP_PN_RE.match(lines[j + 1])
        rows.append({
            "page": pno, "bore": m.group(2), "boreMm": m.group(1), "axial": axial, "radial": radial,
            "material": material, "face": face, "type": rtype, "position": lines[j],
            "pn": pnm.group(1), "bulk": pnm.group(2) == "B", "marks": pnm.group(3),
        })
        i = j + 2
    return rows, skipped


def open_stock_spec(row, qa):
    spec = OrderedDict()
    spec["bore"] = num(row["bore"])
    if row["boreMm"]:
        spec["boreMm"] = num(row["boreMm"])
    pos = POSITIONS[row["position"]]
    spec["position"] = pos
    w, unit = width(row["axial"])
    if w is None:
        qa.append(f"{row['pn']}: unparsed axial height {row['axial']!r}")
    else:
        spec["width"] = w
        spec["widthUnits"] = unit
        spec[{"top": "topWidth", "second": "secondWidth", "oil": "oilWidth"}[pos]] = w
        spec["units"] = unit
    rm = RAD_RE.match(row["radial"])
    if rm:
        spec["radialWall"] = num(rm.group(1))
    else:
        qa.append(f"{row['pn']}: unparsed radial wall {row['radial']!r}")
    mat = OS_MATERIALS.get(row["material"])
    if mat is None:
        qa.append(f"{row['pn']}: unknown base material {row['material']!r} kept as printed")
        mat = row["material"].lower()
    spec["material"] = mat
    if row["face"]:
        if row["face"] not in OS_FACES:
            qa.append(f"{row['pn']}: unknown face coating {row['face']!r} kept as printed")
        spec["face"] = row["face"]
    tm = TYPE_RE.match(row["type"])
    if tm:
        spec["ringType"] = tm.group("code")
        if tm.group("extra"):
            spec["ringTypeNote"] = tm.group("extra").lower()
        if tm.group("tension"):
            t = TENSIONS.get(tm.group("tension").strip().lower())
            if t:
                spec["tension"] = t
            else:
                qa.append(f"{row['pn']}: unknown tension {tm.group('tension')!r}")
    else:
        qa.append(f"{row['pn']}: unparsed ring type {row['type']!r} kept as printed")
        spec["ringType"] = row["type"]
    spec["style"] = "open-stock"
    if "«" in row["marks"]:
        spec["discontinued"] = True
    if row["bulk"]:
        spec["printedPn"] = row["pn"] + "B"
    return spec


def open_stock_name(spec, row):
    pos = {"top": "Top ring", "second": "Second ring", "oil": "Oil ring"}[spec["position"]]
    w = printed(row["axial"]).replace("MM", " mm")
    bits = [f"{pos}, {spec['bore']:.3f} bore, {w} wide, {spec['material']}"]
    if spec.get("face"):
        bits.append(spec["face"])
    bits.append(spec.get("ringType", row["type"]))
    if spec.get("tension"):
        bits.append(f"{spec['tension']} tension")
    s = ", ".join(bits) + " (open stock)"
    if spec.get("discontinued"):
        s += " (discontinued)"
    return s


# ----------------------------------------------------------------------------------------------
# engine sets
# ----------------------------------------------------------------------------------------------

def parse_heading(text, qa):
    m = HEADING_RE.match(text)
    if not m:
        return None
    widths = []
    for tok in m.group(1, 2, 3):
        tok = tok.rstrip(",")
        w, unit = width(tok)
        if w is None:
            qa.append(f"heading {text!r}: unparsed width {tok!r}")
            return None
        widths.append((w, unit, printed(tok)))
    rest = m.group(4)
    material = face = series = None
    for phrase, (mat, fc, ser) in SET_MATERIALS.items():
        if phrase in rest:
            material, face, series = mat, fc, ser
            rest_wo = rest.replace(phrase, "").strip()
            break
    else:
        qa.append(f"heading {text!r}: unknown material phrase")
        rest_wo = rest
    tm = TENSION_RE.search(rest_wo)
    tension = TENSIONS[tm.group(1).lower()] if tm else None
    if not tm:
        qa.append(f"heading {text!r}: no oil tension")
    rrw = "Reduced Radial Wall" in rest_wo
    dykes = "Dykes" in rest_wo
    leftover = rest_wo
    for s in ("Reduced Radial Wall", "Dykes", tm.group(0) if tm else ""):
        leftover = leftover.replace(s, "")
    if leftover.strip():
        qa.append(f"heading {text!r}: unused words {leftover.strip()!r}")
    return {"text": text, "widths": widths, "material": material, "face": face, "series": series,
            "tension": tension, "rrw": rrw, "dykes": dykes}


def parse_sets(lines, pno, qa):
    rows, skipped = [], []
    heading = None
    i = 0
    while i < len(lines):
        l = lines[i]
        if l.endswith("Engine Sets"):
            heading = parse_heading(l, qa)
            if heading is None:
                qa.append(f"p{pno}: heading not understood: {l!r}")
            i += 1
            continue
        sm = SET_PN_RE.match(l)
        if sm and sm.group(1).startswith(("310", "315")):
            row = lines[i:i + 8]
            ok = (len(row) == 8 and BORE_RE.match(row[1])
                  and all(COMP_PN_RE.match(row[k]) for k in (2, 4, 6))
                  and all(RAD_RE.match(row[k]) for k in (3, 5, 7)))
            if not ok:
                skipped.append((pno, row))
                i += 1
                continue
            if heading is None:
                skipped.append((pno, row))
                qa.append(f"p{pno} {l}: set row before any heading; skipped")
                i += 8
                continue
            bm = BORE_RE.match(row[1])
            rows.append({
                "page": pno, "heading": heading, "pn": sm.group(1) + (sm.group(2) or ""),
                "base": sm.group(1), "suffix": sm.group(2), "marks": sm.group(3),
                "bore": bm.group(2), "boreMm": bm.group(1),
                "comp": [(COMP_PN_RE.match(row[k]).group(1), RAD_RE.match(row[k + 1]).group(1)) for k in (2, 4, 6)],
            })
            i += 8
            continue
        i += 1
    return rows, skipped


def set_spec(row, os_by_pn, qa):
    h = row["heading"]
    spec = OrderedDict()
    bore = num(row["bore"])
    spec["bore"] = bore
    if row["boreMm"]:
        spec["boreMm"] = num(row["boreMm"])
    oversize = num(row["suffix"]) if row["suffix"] else 0.0
    spec["oversize"] = oversize
    if not row["boreMm"]:
        spec["nominalBore"] = round(bore - oversize, 3)
    (tw, tu, tp), (sw, su, sp), (ow, ou, op) = h["widths"]
    spec["topWidth"], spec["secondWidth"], spec["oilWidth"] = tw, sw, ow
    units = {tu, su, ou}
    spec["units"] = tu if len(units) == 1 else "mixed"
    spec["widthUnits"] = {"top": tu, "second": su, "oil": ou}
    spec["widthsPrinted"] = f"{tp}, {sp}, {op}"
    comps = OrderedDict()
    for pos, (cpn, rad) in zip(("top", "second", "oil"), row["comp"]):
        c = OrderedDict([("p", cpn), ("radialWall", num(rad))])
        cands = os_by_pn.get(cpn) or []
        # a PN listed twice in open stock (303-0241): take the listing nearest the set bore
        osr = min(cands, key=lambda s: abs(s["bore"] - bore)) if cands else None
        if osr:
            for k in ("material", "face", "ringType", "tension"):
                if k in osr:
                    c[k] = osr[k]
            # file-fit sets (+.005) share their oil ring with the nominal bore, so allow .010
            if abs(osr["bore"] - bore) > 0.0105:
                qa.append(f"{row['pn']}: {pos} ring {cpn} is listed in open stock for {osr['bore']:.3f} bore, set bore {bore:.3f}")
        comps[pos] = c
    spec["components"] = comps
    top = comps["top"]
    spec["material"] = top.get("material") or h["material"]
    if h["material"] and top.get("material") and top["material"] != h["material"]:
        qa.append(f"{row['pn']}: heading material {h['material']!r} vs top ring {top['p']} open stock {top['material']!r}; open stock kept, heading in spec.headingMaterial")
        spec["headingMaterial"] = h["material"]
    face = top.get("face") or h["face"]
    if face:
        spec["face"] = face
    if "material" not in top:
        spec["materialSource"] = "heading"
    spec["oilTension"] = h["tension"]
    if comps["oil"].get("tension") and comps["oil"]["tension"] != h["tension"]:
        qa.append(f"{row['pn']}: heading tension {h['tension']} vs oil ring {comps['oil']['p']} open stock {comps['oil']['tension']}")
    spec["reducedRadialWall"] = h["rrw"]
    if h["dykes"]:
        spec["dykes"] = True
    spec["series"] = h["series"]
    # file-fit sets are listed +.005 over the nominal oversize (4.005/4.035/4.065); standard-gap
    # sets are listed at the nominal oversize (4.000/4.030/4.060). Inch sets only.
    if not row["boreMm"]:
        thou = int(round(bore * 1000))
        spec["style"] = "file-fit" if thou % 10 == 5 else "drop-in"
    if "«" in row["marks"]:
        spec["discontinued"] = True
    return spec


def set_name(spec, row):
    h = row["heading"]
    s = f"Ring set, {spec['bore']:.3f} bore, {spec['widthsPrinted']}, {spec['material']}"
    if spec.get("face") and spec["face"] != "none":
        s += f" {spec['face']}"
    if spec.get("dykes"):
        s += " dykes top"
    s += f", {spec['oilTension']} tension oil"
    if spec.get("style"):
        s += f", {spec['style']}"
    if spec.get("discontinued"):
        s += " (discontinued)"
    return s


# ----------------------------------------------------------------------------------------------
# records, validation, notes
# ----------------------------------------------------------------------------------------------

def src(page, section, pdf_name):
    return OrderedDict([("doc", DOC), ("edition", EDITION), ("file", pdf_name), ("page", page),
                        ("printedPage", page - PAGE_OFFSET), ("section", section)])


def validate(records):
    errs = []
    seen = Counter((r["p"], r["cat"], r["fit"]["fam"]) for r in records)
    for k, n in seen.items():
        if n > 1:
            errs.append(f"duplicate record {k} x{n}")
    for r in records:
        for k in ("m", "p", "cat", "fit", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r.get("fit", {}).get("fam"):
            errs.append(f"{r.get('p')}: missing fit.fam")

        def walk(o, path):
            if isinstance(o, dict):
                for kk, v in o.items():
                    walk(v, f"{path}.{kk}")
            elif isinstance(o, list):
                for ii, v in enumerate(o):
                    walk(v, f"{path}[{ii}]")
            elif isinstance(o, str):
                if o == "":
                    errs.append(f"{r['p']}: empty string at {path}")
            elif isinstance(o, float) and (o != o):
                errs.append(f"{r['p']}: NaN at {path}")
        walk(r, r["p"])
        for k in ("bore", "topWidth", "secondWidth", "oilWidth", "width", "radialWall", "oversize"):
            if k in r["spec"] and not isinstance(r["spec"][k], (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric")
    return errs


def write_notes(path, pdf_path, npages, records, sets, os_rows, skipped, qa, errs, sections, dups):
    L = []
    L.append("# MAHLE Performance Piston Rings 2022 (PR-40-22) extraction notes\n")
    L.append(f"- Source: `{os.path.basename(pdf_path)}` ({npages} pages, text layer; manual download under `Catalogs/`, no network). Edition {EDITION}.")
    L.append(f"- Extracted {dt.date.today().isoformat()} with `extract_mahle_rings.py` (PyMuPDF text; set pages {SET_PAGES.start}-{SET_PAGES.stop - 1}, nitro page {NITRO_PAGES[0]}, open stock pages {OPEN_STOCK_PAGES.start}-{OPEN_STOCK_PAGES.stop - 1}; printed page = PDF page - 1).")
    L.append(f"- {len(records)} records, all `cat: ring`, all `fit.fam: Universal` (the catalog lists rings by bore only; it names no engine families).")
    L.append(f"  - {len(sets)} engine ring sets (310-xxxx claimer, 315-xxxx performance) from the set tables.")
    L.append(f"  - {len(os_rows)} open stock rings (300/301/302/303-xxxx, one position each), {len(dups)} repeated PNs collapsed.")
    L.append("")
    L.append("## Set rows per catalog section\n")
    for sec, n in sections.items():
        L.append(f"- {sec}: {n}")
    L.append("")
    L.append("## Field notes\n")
    L.append("- Set widths come from the table heading (top, second, oil). Fractions are converted to decimal inches (1/16 = 0.0625, 5/64 = 0.0781, 3/16 = 0.1875); metric widths stay in mm. `spec.units` is `in`, `mm` or `mixed`; `spec.widthUnits` gives the unit per ring and `spec.widthsPrinted` the catalog text.")
    L.append("- `spec.oversize` is the set PN suffix (.005/.030/.035/.065 over the series' nominal bore; 0 when there is no suffix). `spec.nominalBore` = bore - oversize for inch sets.")
    L.append("- `spec.style`: inch sets listed at +.005 over an oversize step (4.005, 4.035, 4.065 ...) are MAHLE's file-fit sets; sets at the plain oversize (4.000, 4.030, 4.060 ...) are standard-gap drop-in sets. This follows the catalog's selection guide (p20: 'Std Gap Sets' vs 'File Fit Sets') and the +.005 naming convention; the set tables themselves do not print the words. Metric sets get no style.")
    L.append("- `spec.components` holds the top/second/oil ring PNs and radial walls printed in the set row, plus material/face/ringType/tension joined from the open stock listing when the PN appears there. `spec.material`/`spec.face` are taken from the top ring's open stock entry, else from the heading.")
    L.append("- Open stock rings: `spec.position` top/second/oil (UCR/LCR/OCR), `spec.width` + `spec.widthUnits` (axial height as printed), `spec.radialWall`, `spec.ringType` (MAHLE type code, e.g. RF-13PF), oil `spec.tension`, `spec.style: open-stock`.")
    L.append("- Set size is not printed anywhere in the catalog, so no `cylinders` value is emitted.")
    L.append("- `«` discontinued marks are kept as `spec.discontinued: true`; `l` new-number bullets are dropped. A printed `B` suffix (bulk packaging) is stripped from `p` and kept in `spec.printedPn`.")
    L.append("- Skipped: technical pages, ring-code tables (PDF 39-40), Hastings interchange (79-82), measurement equivalents (83-84).")
    L.append("")
    L.append(f"## Rows skipped ({len(skipped)})\n")
    for pno, row in skipped[:50]:
        L.append(f"- p{pno}: {row}")
    if not skipped:
        L.append("- none")
    L.append("")
    L.append(f"## Repeated open stock PNs ({len(dups)})\n")
    for pn, pages in dups[:60]:
        L.append(f"- {pn}: pages {pages}")
    if not dups:
        L.append("- none")
    L.append("")
    L.append(f"## QA ({len(qa)})\n")
    for q in qa[:300]:
        L.append(f"- {q}")
    if not qa:
        L.append("- none")
    L.append("")
    L.append(f"## Validation ({len(errs)} errors)\n")
    for e in errs[:50]:
        L.append(f"- {e}")
    if not errs:
        L.append("- no duplicate (p, cat, fam); every record has m p cat fit.fam src; numeric fields numeric; no empty strings")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        sys.exit(f"PDF not found: {args.pdf}")
    pdf_name = os.path.basename(args.pdf)
    qa, skipped = [], []
    doc = pymupdf.open(args.pdf)
    npages = len(doc)

    # open stock first so the sets can join to it
    os_rows = []
    for pno in list(OPEN_STOCK_PAGES) + list(NITRO_PAGES):  # main listing first; nitro page repeats some PNs
        rows, sk = parse_open_stock(page_lines(doc, pno), pno, qa)
        os_rows.extend(rows)
        skipped.extend(sk)
    sets = []
    sections = Counter()
    section = None
    for pno in SET_PAGES:
        lines = page_lines(doc, pno)
        for l in lines[:3]:
            if l in SECTION_TITLES:
                section = SECTION_TITLES[l]
        rows, sk = parse_sets(lines, pno, qa)
        for r in rows:
            r["section"] = section
            sections[section] += 1
        sets.extend(rows)
        skipped.extend(sk)
    doc.close()

    records = []
    # open stock records (dedupe by PN)
    os_by_pn = OrderedDict()
    dup_pages = defaultdict(list)
    for row in os_rows:
        spec = open_stock_spec(row, qa)
        if row["pn"] in os_by_pn:
            prev = os_by_pn[row["pn"]]
            dup_pages[row["pn"]].append(row["page"])
            diff = [f"{k} {prev['spec'].get(k)!r}/{spec.get(k)!r}" for k in ("bore", "width", "radialWall", "material", "face", "ringType", "tension", "position")
                    if prev["spec"].get(k) != spec.get(k)]
            if diff:
                qa.append(f"{row['pn']}: repeated on p{prev['page']} and p{row['page']} with different data; p{prev['page']} kept ({'; '.join(diff)})")
                listing = OrderedDict([("page", row["page"])] + [(k, spec[k]) for k in ("bore", "width", "widthUnits", "radialWall", "material", "face", "ringType", "tension", "position") if k in spec])
                prev["rec"]["spec"].setdefault("otherListings", []).append(listing)
                prev["all"].append(spec)
            prev["rec"]["src"].setdefault("alsoPages", []).append(row["page"])
            continue
        sec = "Nitro-Fueled Piston Rings" if row["page"] in NITRO_PAGES else "Open Stock Rings"
        notes = "nitro-fueled drag racing (Top Fuel / Funny Car) bores" if row["page"] in NITRO_PAGES else "listed by bore only"
        rec = OrderedDict([
            ("m", BRAND), ("p", row["pn"]), ("cat", "ring"), ("name", open_stock_name(spec, row)),
            ("fit", OrderedDict([("fam", "Universal"), ("notes", notes)])),
            ("spec", spec), ("src", src(row["page"], sec, pdf_name)), ("emissions", None),
        ])
        os_by_pn[row["pn"]] = {"spec": spec, "page": row["page"], "rec": rec, "all": [spec]}
        records.append(rec)
    os_specs = {pn: v["all"] for pn, v in os_by_pn.items()}

    set_recs = []
    seen_sets = {}
    for row in sets:
        spec = set_spec(row, os_specs, qa)
        if row["pn"] in seen_sets:
            prev = seen_sets[row["pn"]]
            qa.append(f"{row['pn']}: set listed twice (p{prev['src']['page']} and p{row['page']}); first kept")
            prev["src"].setdefault("alsoPages", []).append(row["page"])
            continue
        notes = "universal by bore; " + row["heading"]["text"].replace("”", '"')
        rec = OrderedDict([
            ("m", BRAND), ("p", row["pn"]), ("cat", "ring"), ("name", set_name(spec, row)),
            ("fit", OrderedDict([("fam", "Universal"), ("notes", notes)])),
            ("spec", spec), ("src", src(row["page"], row["section"], pdf_name)), ("emissions", None),
        ])
        seen_sets[row["pn"]] = rec
        set_recs.append(rec)
    records = set_recs + records
    missing = Counter()
    for rec in set_recs:
        for pos, c in rec["spec"]["components"].items():
            if "material" not in c:
                missing[pos] += 1
    if missing:
        qa.append(f"set component PNs not found in open stock (material/face left to heading): {dict(missing)}")

    errs = validate(records)
    dups = sorted((pn, pages) for pn, pages in dup_pages.items())
    os.makedirs(OUT, exist_ok=True)
    out = {"source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": pdf_name, "pages": npages,
                      "parsedPages": {"nitro": list(NITRO_PAGES), "sets": [SET_PAGES.start, SET_PAGES.stop - 1],
                                      "openStock": [OPEN_STOCK_PAGES.start, OPEN_STOCK_PAGES.stop - 1]},
                      "note": "manual PDF under Catalogs/; mahle-aftermarket.com blocks fetchers; no network used"},
           "extracted": dt.date.today().isoformat(), "count": len(records), "parts": records}
    with open(os.path.join(OUT, "mahle-rings.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "mahle-rings.md"), args.pdf, npages, records, set_recs, os_by_pn, skipped, qa, errs, sections, dups)
    print(f"{len(records)} records: {len(set_recs)} sets, {len(os_by_pn)} open stock ({len(os_rows)} rows, {len(dups)} repeats); "
          f"skipped {len(skipped)}; QA {len(qa)}; errors {len(errs)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
