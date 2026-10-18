#!/usr/bin/env python3
"""MAHLE Aftermarket Performance Gaskets 2022 (catalog GA-40-22) -> shared parts records.

Source: Catalogs/ga-40-22_web.pdf at the repo root (63 pages, text layer, InDesign, PDF created
2022-11-02; saved by hand because mahle-aftermarket.com blocks fetchers). No network is used.
Printed page number = PDF page - 2.

Page layout (product section, PDF pages 9-55):
  running head (y~20)  |  make heading (y~81, e.g. `CHEVROLET V8 SMALL BLOCK (cont.)`)
  engine line `262, 265, ... 400 Engines`  |  table title `Cylinder Head Gaskets`
  header `Part No | Application Notes | ... | Thickness` in one of three layouts
  rows: PN at the left margin, cells placed by column x; notes and materials wrap onto extra lines
Three header layouts (word x-positions are fixed by the InDesign template, odd/even pages shift
by 44 pt): head gaskets (Combustion Seal, Bore, Thickness, Volume), port gaskets (Port Size, Port
Shape, Thickness) and plain gaskets (Materials/Construction, Thickness). Words are assigned to
columns by their x offset from the Part No column.
PDF 50-55 are the miscellaneous sections (intake sheet, carb base, collector, axle cover,
supercharger burst plate); there the "engine" line is a sub-heading such as `Holley 4150 Open`.
Skipped: technical pages 1-8, Fel-Pro / SCE / Cometic interchange tables 56-63.

Records: `headGasket` from "Cylinder Head Gaskets" tables (bore, thickness, material MLS /
composite / steel shim, volumeCc, side L/R from the notes) and `gasket` from every other table
(spec.type intake / exhaust header / valve cover / oil pan / timing cover / ..., material,
thickness, port size and shape). fit.fam from the make + engine heading using the brief's family
list; unknown families keep the catalog heading as `MAKE: engine` and are flagged in the notes.

Usage:  python -X utf8 -I scripts/parts-catalog/extract_mahle_gaskets.py [--pdf PATH]
Writes only out/mahle-gaskets.json and out/mahle-gaskets.md.
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
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", "ga-40-22_web.pdf")
BRAND = "MAHLE"
DOC = "MAHLE Aftermarket Performance Gaskets catalog GA-40-22 (PDF)"
EDITION = "2022 (GA-40-22, supersedes GA-40-20; PDF created 2022-11-02)"
PAGE_OFFSET = 2  # printed page = pdf page - 2
PRODUCT_PAGES = range(9, 56)
MISC_PAGES = range(50, 56)

Q = '"”″'
PN_RE = re.compile(r"^[A-Z]{0,2}\d{4,6}[A-Z]{0,3}$")
INCH_RE = re.compile(r"^(\d*\.\d+)[" + Q + r"]+$")  # one PN prints a doubled inch mark (.080”″)
DEC_RE = re.compile(r"^\d+(\.\d+)?$")
CONT_RE = re.compile(r"\s*\((cont|continued)\.?\)\s*$", re.I)
YEARS_RE = re.compile(r"\b(19\d\d|20\d\d)\s*-\s*(19\d\d|20\d\d|Present)\b")
SINGLE_YEAR_RE = re.compile(r"\b(19\d\d|20\d\d)\b")

# header word sequence -> column name and left boundary relative to the Part No data column
LAYOUTS = {
    ("Part", "No", "Application", "Notes", "Port", "Size", "Materials/Construction", "Port", "Shape", "Thickness"):
        [("pn", -20), ("notes", 60), ("portSize", 190), ("construction", 265), ("portShape", 370), ("thickness", 450)],
    ("Part", "No", "Application", "Notes", "Materials/Construction", "Thickness"):
        [("pn", -20), ("notes", 60), ("construction", 210), ("thickness", 440)],
    ("Part", "No", "Application", "Notes", "Combustion", "Seal", "Materials/Construction", "Bore", "Thickness", "Volume"):
        [("pn", -20), ("notes", 60), ("seal", 160), ("construction", 235), ("bore", 330), ("thickness", 395), ("volume", 455)],
}
PN_HEADER_TO_DATA = 27  # "Part" header x0 minus the PN data x0

# table title -> (cat, type)
TITLE_TYPES = [
    ("cylinder head", ("headGasket", None)),
    ("intake manifold", ("gasket", "intake")),
    ("intake gasket sheet", ("gasket", "intake sheet material")),
    ("intake blank", ("gasket", "intake")),
    ("valley cover", ("gasket", "valley cover")),
    ("exhaust header", ("gasket", "exhaust header")),
    ("header gasket", ("gasket", "exhaust header")),
    ("exhaust collector", ("gasket", "exhaust collector")),
    ("valve cover", ("gasket", "valve cover")),
    ("oil pan", ("gasket", "oil pan")),
    ("timing cover", ("gasket", "timing cover")),
    ("front cover", ("gasket", "timing cover")),
    ("rear main seal", ("gasket", "rear main seal")),
    ("rear seal", ("gasket", "rear main seal")),
    ("carb base", ("gasket", "carb base")),
    ("distributor", ("gasket", "distributor")),
    ("thermostat", ("gasket", "thermostat housing")),
    ("water outlet", ("gasket", "water outlet")),
    ("water pump outlet", ("gasket", "water outlet")),
    ("fuel pump", ("gasket", "fuel pump")),
    ("axle housing", ("gasket", "differential cover")),
    ("supercharger burst", ("gasket", "supercharger burst plate")),
]
# construction text keywords -> normalized material
MATERIALS = [
    ("multi-layered steel", "MLS"),
    ("stainless steel", "steel shim"),
    ("graphite", "graphite composite"),
    ("steel core", "steel-core composite"),
    ("cork", "cork"),
    ("molded rubber", "molded rubber"),
    ("rubberized fiber", "rubberized fiber"),
    ("laminated fiber", "fiber"),
    ("fiber", "fiber"),
    ("composite", "composite"),
    ("viton", "viton"),
    ("silicone", "silicone"),
    ("rubber", "rubber"),
    ("copper", "copper"),
]
MAKE_CYL = {"V8": 8, "V6": 6, "L6": 6, "L4": 4, "HEMI": 8, "COYOTE": 8, "MODULAR": 8}


def famset(make, engine):
    """(families, flagged) from the catalog make heading and engine line."""
    mk = make.upper()
    eng = (engine or "").upper()
    unknown = ([f"{make}: {engine}" if engine else make], True)
    if mk.startswith("AMC V8"):
        return ["AMC V8"], False
    if mk == "BUICK V6":
        return ["Buick V6 181-252"], False
    if mk == "BUICK V8":
        if "455" in eng or "430" in eng:
            return ["Buick big block"], False
        if "350" in eng:
            return ["Buick 350"], False
        return unknown
    if mk == "CHEVROLET L6":
        return ["Chevy inline-6"], False
    if mk == "CHEVROLET V8 LS":
        return ["GM LS"], False
    if mk == "CHEVROLET V8 SMALL BLOCK":
        return ["Small-block Chevy"], False
    if mk == "CHEVROLET V8 BIG BLOCK":
        return ["Chevy Mark IV big block", "Chevy Gen VI big block"], False
    if mk == "CHRYSLER V8 HEMI":
        if "426" in eng:
            return ["Chrysler 426 Hemi"], False
        if "5.7" in eng or "6.1" in eng:
            return ["Chrysler Gen III Hemi 5.7/6.1"], False
        if "6.2" in eng or "6.4" in eng:
            return ["Chrysler Gen III Hemi 6.2/6.4"], False
        return unknown
    if mk == "CHRYSLER V8 SMALL BLOCK":
        return ["Mopar LA small block"], False
    if mk == "CHRYSLER V8 BIG BLOCK":
        if "HEMI" in eng:
            return ["Chrysler 426 Hemi"], False
        return ["Mopar B/RB big block"], False
    if mk.startswith("CHRYSLER V8 NITRO"):
        return ["Chrysler 426 Hemi"], True  # aftermarket nitro/alcohol Hemi blocks; review
    if mk == "CUMMINS":
        if "6BT" in eng or "12V" in eng:
            return ["Cummins 5.9 12V"], False
        if "6.7" in eng:
            return ["Cummins 6.7"], False
        if "5.9" in eng:
            return ["Cummins 5.9 24V/CR"], False
        return unknown
    if mk == "FORD L6":
        return ["Ford 240/300 inline-6"], False
    if mk == "FORD V8 DOHC COYOTE":
        return ["Ford Coyote"], False
    if mk in ("FORD V8 SOHC MODULAR", "FORD V8 MODULAR SOHC / DOHC"):
        return ["Ford Modular"], False
    if mk == "FORD V8 SMALL BLOCK":
        if "351C" in eng or "351M" in eng or "BOSS" in eng:
            return ["Ford 351C/351M/400"], False
        return ["Small-block Ford (Windsor)"], False
    if mk == "FORD V8 BIG BLOCK":
        if "429" in eng or "460" in eng:
            return ["Ford 429/460"], False
        if "390" in eng or "428" in eng or "352" in eng:
            return ["Ford FE"], False
        return unknown
    if mk == "OLDSMOBILE V8":
        return ["Oldsmobile V8"], False
    if mk == "PONTIAC V8":
        return ["Pontiac V8"], False
    return unknown


def num(s):
    return float(s)


def inch(tok):
    m = INCH_RE.match(tok)
    return num(m.group(1)) if m else None


def strip_cont(s):
    return CONT_RE.sub("", s).strip()


def norm_text(s):
    return s.replace("”", '"').replace("″", '"').replace("’", "'")


# ----------------------------------------------------------------------------------------------
# page geometry
# ----------------------------------------------------------------------------------------------

class Line:
    __slots__ = ("y", "words", "x0", "text")

    def __init__(self, y, words):
        self.y = y
        self.words = sorted(words, key=lambda w: w[0])
        self.x0 = self.words[0][0]
        self.text = " ".join(w[4] for w in self.words)


def page_lines(page, tol=2.5):
    ws = [w for w in page.get_text("words") if w[4].strip() and w[4] != "•"]
    ws.sort(key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    rows = []
    for w in ws:
        yc = (w[1] + w[3]) / 2
        if rows and abs(rows[-1][0] - yc) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([yc, [w]])
    return [Line(y, r) for y, r in rows if 40 < y < 725]


def header_layout(line):
    key = tuple(w[4] for w in line.words)
    if key in LAYOUTS:
        return LAYOUTS[key]
    if key[:2] == ("Part", "No"):
        return "unknown"
    return None


class Table:
    def __init__(self, page, layout, pn_x, title, make, engine):
        self.page, self.layout, self.pn_x = page, layout, pn_x
        self.title, self.make, self.engine = title, make, engine
        self.rows = []

    def col_for(self, x0):
        rel = x0 - self.pn_x
        name = self.layout[0][0]
        for cname, left in self.layout:
            if rel >= left:
                name = cname
        return name

    def add_words(self, words, row):
        for w in words:
            row["cells"].setdefault(self.col_for(w[0]), []).append(w[4])


def parse_page(page, pno, state, qa, skipped):
    """Walk the page's lines; returns the list of tables found (rows filled)."""
    lines = page_lines(page)
    tables = []
    if not lines:
        return tables
    # make heading = first body line; a new make resets the engine sub-heading
    make = strip_cont(lines[0].text)
    if make.upper() != (state["make"] or "").upper():
        state["make"], state["engine"] = make, None
    make = state["make"]
    table, row = None, None
    for idx, ln in enumerate(lines[1:], start=1):
        lay = header_layout(ln)
        if lay is not None:
            table, row = None, None
            if lay == "unknown":
                qa.append(f"p{pno}: unknown table header {ln.text!r}; table skipped")
                continue
            title = strip_cont(lines[idx - 1].text) if idx >= 1 else None
            pn_x = ln.words[0][0] - PN_HEADER_TO_DATA

            def heading_like(l):
                return l.x0 <= pn_x + 3 and not PN_RE.match(l.words[0][4]) and header_layout(l) is None

            if idx >= 2 and lines[idx - 2].y > 90 and heading_like(lines[idx - 2]):
                # the line above the title is the engine line / misc sub-heading; the line above
                # that, when it is also a margin heading, is a make heading starting mid-page
                if idx >= 3 and heading_like(lines[idx - 3]) and (lines[idx - 3].y > 90 or idx - 3 == 0):
                    new_make = strip_cont(lines[idx - 3].text)
                    if new_make.upper() != (state["make"] or "").upper():
                        state["make"], state["engine"] = new_make, None
                    make = state["make"]
                state["engine"] = strip_cont(lines[idx - 2].text)
            table = Table(pno, lay, pn_x, title, make, state["engine"])
            tables.append(table)
            continue
        if table is None:
            continue
        at_margin = ln.x0 <= table.pn_x + 3
        if at_margin:
            first = ln.words[0][4]
            if PN_RE.match(first):
                row = {"pn": first, "cells": {}, "y": ln.y}
                table.rows.append(row)
                table.add_words(ln.words[1:], row)
            else:
                table, row = None, None  # next title / heading
            continue
        if row is None:
            if ln.text not in ("New Number",):
                skipped.append((pno, ln.text))
            continue
        table.add_words(ln.words, row)
    return tables


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------

def classify(title, qa, seen_titles):
    t = (title or "").lower()
    for key, ct in TITLE_TYPES:
        if key in t:
            return ct
    if title not in seen_titles:
        qa.append(f"table title {title!r} not mapped to a gasket type; stored as printed")
        seen_titles.add(title)
    return "gasket", t or "unknown"


def material_for(construction):
    c = construction.lower()
    for key, mat in MATERIALS:
        if key in c:
            return mat
    return None


def parse_notes(notes):
    """years and side from the application-notes text."""
    out = {}
    m = YEARS_RE.search(notes)
    if m:
        out["y0"] = int(m.group(1))
        out["y1"] = None if m.group(2) == "Present" else int(m.group(2))
    low = notes.lower()
    if "left side" in low:
        out["side"] = "L"
    elif "right side" in low:
        out["side"] = "R"
    return out


def ci_from_engine(engine):
    if not engine:
        return []
    cis = []
    for tok in re.findall(r"\b(\d{3})(?:W|C|M|CJ|SCJ)?\b", engine):
        v = int(tok)
        if 150 <= v <= 650 and v not in cis:
            cis.append(v)
    return cis


def build_records(tables, pdf_name, qa):
    records = []
    index = {}
    seen_titles = set()
    unknown_fams = Counter()
    for t in tables:
        cat, gtype = classify(t.title, qa, seen_titles)
        misc = t.page in MISC_PAGES
        if misc:
            fams, flagged = ["Universal"], False
        else:
            fams, flagged = famset(t.make, t.engine)
        if flagged:
            unknown_fams[tuple(fams)] += len(t.rows)
        for r in t.rows:
            cells = {k: " ".join(v) for k, v in r["cells"].items()}
            pn = r["pn"]
            spec = OrderedDict()
            notes = norm_text(cells.get("notes", "")).strip()
            construction = norm_text(cells.get("construction", "")).strip()
            if cat == "headGasket":
                b = inch(cells.get("bore", ""))
                if b is None:
                    qa.append(f"{pn} p{t.page}: head gasket without a bore ({cells.get('bore')!r})")
                else:
                    spec["bore"] = b
                th = inch(cells.get("thickness", ""))
                if th is not None:
                    spec["thickness"] = th
                elif cells.get("thickness"):
                    qa.append(f"{pn} p{t.page}: unparsed thickness {cells['thickness']!r}")
                mat = material_for(construction)
                if mat is None:
                    qa.append(f"{pn} p{t.page}: head gasket construction {construction!r} not mapped")
                if mat in ("graphite composite",):
                    mat = "composite"
                if mat:
                    spec["material"] = mat
                if construction:
                    spec["construction"] = construction
                vol = cells.get("volume", "")
                if DEC_RE.match(vol):
                    spec["volumeCc"] = num(vol)
                elif vol:
                    qa.append(f"{pn} p{t.page}: unparsed volume {vol!r}")
                if cells.get("seal"):
                    spec["combustionSeal"] = norm_text(cells["seal"]).lower()
                nt = parse_notes(notes)
                if "side" in nt:
                    spec["side"] = nt["side"]
                name = f"{spec.get('material', 'head')} head gasket".replace("MLS head", "MLS head")
                if "bore" in spec:
                    name += f", {spec['bore']:.3f} bore"
                if "thickness" in spec:
                    name += f", {spec['thickness']:.3f} thick"
                if "side" in spec:
                    name += f", {'left' if spec['side'] == 'L' else 'right'} side"
            else:
                spec["type"] = gtype
                mat = material_for(construction)
                if mat is None and construction:
                    qa.append(f"{pn} p{t.page}: construction {construction!r} not mapped to a material")
                if mat:
                    spec["material"] = mat
                if construction:
                    spec["construction"] = construction
                th = inch(cells.get("thickness", ""))
                if th is not None:
                    spec["thickness"] = th
                elif cells.get("thickness"):
                    qa.append(f"{pn} p{t.page}: unparsed thickness {cells['thickness']!r}")
                ps = norm_text(cells.get("portSize", "")).strip()
                if ps:
                    pm = re.match(r'^(\d*\.\d+)"+\s*x\s*(\d*\.\d+)"+$', ps)
                    if pm:
                        spec["portSize"] = ps
                        spec["portWidth"], spec["portHeight"] = num(pm.group(1)), num(pm.group(2))
                    elif INCH_RE.match(ps):
                        spec["portSize"] = ps
                        spec["portDia"] = inch(ps)
                    else:
                        # e.g. "Trim to Fit": a note printed in the port-size column
                        notes = (notes + "; " + ps).strip("; ")
                if cells.get("portShape"):
                    spec["portShape"] = norm_text(cells["portShape"]).lower()
                nt = parse_notes(notes)
                name = f"{gtype} gasket"
                if mat:
                    name += f", {mat}"
                if "thickness" in spec:
                    name += f", {spec['thickness']:.3f} thick"
                if "portSize" in spec:
                    name += f", {spec['portSize']} port"
                if t.title and "set" in t.title.lower():
                    spec["set"] = True
            if misc and t.engine:
                spec["application"] = norm_text(t.engine)
            for fam in fams:
                key = (pn, cat, fam)
                if key in index:
                    prev = index[key]
                    prev["src"].setdefault("alsoPages", [])
                    if t.page not in prev["src"]["alsoPages"] and t.page != prev["src"]["page"]:
                        prev["src"]["alsoPages"].append(t.page)
                    if prev["spec"] != spec:
                        qa.append(f"{pn}: listed twice for {fam} (p{prev['src']['page']} and p{t.page}) with different specs; first kept")
                    continue
                fit = OrderedDict([("fam", fam)])
                cis = ci_from_engine(t.engine) if not misc else []
                if cis:
                    fit["ci"] = cis
                cyl = None
                for tok, c in MAKE_CYL.items():
                    if tok in t.make.upper().split() or (tok in ("COYOTE", "MODULAR") and tok in t.make.upper()):
                        cyl = c
                if t.make.upper() == "CUMMINS":
                    cyl = 6
                if cyl and not misc:
                    fit["cyl"] = cyl
                if "y0" in nt:
                    fit["y0"] = nt["y0"]
                    if nt["y1"]:
                        fit["y1"] = nt["y1"]
                fnotes = []
                if not misc:
                    fnotes.append(f"{t.make}: {t.engine}" if t.engine else t.make)
                if notes:
                    fnotes.append(notes)
                if fnotes:
                    fit["notes"] = "; ".join(fnotes)
                rec = OrderedDict([
                    ("m", BRAND), ("p", pn), ("cat", cat), ("name", name), ("fit", fit), ("spec", spec),
                    ("src", OrderedDict([("doc", DOC), ("edition", EDITION), ("file", pdf_name), ("page", t.page),
                                         ("printedPage", t.page - PAGE_OFFSET), ("table", t.title)])),
                    ("emissions", None),
                ])
                index[key] = rec
                records.append(rec)
    return records, unknown_fams


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
            elif isinstance(o, str) and o == "":
                errs.append(f"{r['p']}: empty string at {path}")
        walk(r, r["p"])
        for k in ("bore", "thickness", "volumeCc", "portWidth", "portHeight", "portDia"):
            if k in r["spec"] and not isinstance(r["spec"][k], (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric")
    return errs


def write_notes(path, pdf_path, npages, records, tables, skipped, qa, errs, unknown_fams):
    by_cat = Counter(r["cat"] for r in records)
    by_fam = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    by_type = Counter(r["spec"].get("type") for r in records if r["cat"] == "gasket")
    by_title = Counter(t.title for t in tables)
    uniq = len({r["p"] for r in records})
    L = ["# MAHLE Performance Gaskets 2022 (GA-40-22) extraction notes", ""]
    L.append(f"- Source: `{os.path.basename(pdf_path)}` ({npages} pages, text layer; manual download under `Catalogs/`, no network). Edition {EDITION}.")
    L.append(f"- Extracted {dt.date.today().isoformat()} with `extract_mahle_gaskets.py` (PyMuPDF words placed into columns by x offset; product pages PDF {PRODUCT_PAGES.start}-{PRODUCT_PAGES.stop - 1}, printed page = PDF page - 2).")
    L.append(f"- {len(tables)} tables parsed, {sum(len(t.rows) for t in tables)} rows, {len(records)} records ({uniq} unique PNs; one record per family for BBC Mark IV / Gen VI).")
    L.append(f"- By cat: " + ", ".join(f"{k} {v}" for k, v in sorted(by_cat.items())))
    L.append("")
    L.append("## Records by family\n")
    for (cat, fam), n in sorted(by_fam.items()):
        L.append(f"- {cat} / {fam}: {n}")
    L.append("")
    L.append("## Gasket types\n")
    for k, v in sorted(by_type.items(), key=lambda kv: -kv[1]):
        L.append(f"- {k}: {v}")
    L.append("")
    L.append("## Tables by title\n")
    for k, v in sorted(by_title.items(), key=lambda kv: -kv[1]):
        L.append(f"- {k}: {v}")
    L.append("")
    L.append("## Field notes\n")
    L.append("- `headGasket.spec.material`: Multi-Layered Steel -> `MLS`; Graphite -> `composite`; the single-layer `Stainless Steel` .020 gaskets (1178BS etc.) -> `steel shim`. The printed text is kept in `spec.construction`; `spec.combustionSeal` = `stopper` where printed; `spec.volumeCc` from the Volume column; `spec.side` L/R from 'Left Side' / 'Right Side' in the notes.")
    L.append("- `gasket.spec.type` comes from the table title (intake, exhaust header, exhaust collector, valve cover, oil pan, timing cover, rear main seal, valley cover, carb base, distributor, thermostat housing, water outlet, fuel pump, differential cover, supercharger burst plate, intake sheet material). `spec.set` = true when the title says 'Sets'.")
    L.append("- `gasket.spec.material` is a keyword normalisation of the printed construction (fiber, steel-core composite, graphite composite, cork, molded rubber, rubberized fiber, viton, silicone); `spec.construction` keeps the printed text. Port size `1.100\" x 2.200\"` -> `portWidth`/`portHeight`; a single value -> `portDia`; `spec.portShape` as printed.")
    L.append("- `fit.fam`: make + engine heading mapped to the brief's family list. Chevrolet big block rows are emitted twice (Mark IV and Gen VI). `CHRYSLER V8 NITRO and ALCOHOL / 426 Hemi Engines` is mapped to `Chrysler 426 Hemi` (aftermarket nitro/alcohol Hemi blocks) and flagged below. `fit.ci` lists the displacements in the engine heading; `fit.y0/y1` only when the notes give a year range; `fit.notes` = catalog heading + application notes. Miscellaneous-section parts (PDF 50-55) are `Universal` with the sub-heading in `spec.application`.")
    L.append("- Years written '2015 - Present' give `y0` only. New-number bullets are dropped; the catalog has no discontinued marks.")
    L.append("- Skipped: technical pages 1-8 and the Fel-Pro / SCE / Cometic interchange tables (PDF 56-63).")
    L.append("")
    L.append(f"## Families not in the brief's list ({sum(unknown_fams.values())} rows, catalog heading kept)\n")
    for fams, n in sorted(unknown_fams.items()):
        L.append(f"- {' / '.join(fams)}: {n}")
    if not unknown_fams:
        L.append("- none")
    L.append("")
    L.append(f"## Lines skipped ({len(skipped)})\n")
    for pno, text in skipped[:60]:
        L.append(f"- p{pno}: {text}")
    if not skipped:
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
    qa, skipped, tables = [], [], []
    state = {"make": None, "engine": None}
    doc = pymupdf.open(args.pdf)
    npages = len(doc)
    for pno in PRODUCT_PAGES:
        tables.extend(parse_page(doc[pno - 1], pno, state, qa, skipped))
    doc.close()
    empty = [f"p{t.page} {t.title!r}" for t in tables if not t.rows]
    if empty:
        qa.append(f"tables with no rows: {empty}")
    records, unknown_fams = build_records(tables, pdf_name, qa)
    errs = validate(records)
    os.makedirs(OUT, exist_ok=True)
    out = {"source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": pdf_name, "pages": npages,
                      "parsedPages": [PRODUCT_PAGES.start, PRODUCT_PAGES.stop - 1],
                      "note": "manual PDF under Catalogs/; mahle-aftermarket.com blocks fetchers; no network used"},
           "extracted": dt.date.today().isoformat(), "count": len(records), "parts": records}
    with open(os.path.join(OUT, "mahle-gaskets.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "mahle-gaskets.md"), args.pdf, npages, records, tables, skipped, qa, errs, unknown_fams)
    by_cat = Counter(r["cat"] for r in records)
    print(f"{len(records)} records ({len({r['p'] for r in records})} unique PNs) from {len(tables)} tables / "
          f"{sum(len(t.rows) for t in tables)} rows: {dict(by_cat)}; skipped lines {len(skipped)}; QA {len(qa)}; errors {len(errs)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
