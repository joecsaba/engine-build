#!/usr/bin/env python3
"""MAHLE Aftermarket Piston Rings, Light Vehicle 2019 (catalog PR-20-19) -> shared parts records.

Source: Catalogs/pr-20-19.pdf at the repo root (247 pages, text layer, InDesign, PDF created
2019-06-18; saved by hand because mahle-aftermarket.com blocks fetchers). No network is used.
Printed page number = PDF page - 1.

Layout (PDF page numbers):
  1-25      Multilingual technical pages, ring design illustrations, nomenclature. Skipped.
  26-220    Application section, one make per heading (ACURA ... WORKHORSE). Each make opens with an
            engine index (ENGINE | YEAR | BORE DIAMETER | BLOCK), skipped, then numbered blocks:
              <block no> <engine description: liters, cc, CID, head, valves, layout, bore in (mm),
                          engine manufacturer / diesel qualifiers> <block no>
              VIN Code(s): ... Engine Code(s): ...            (may wrap several lines)
              <years> <notes> <PREMIUM set PN> <STANDARD set PN> <qty req> <cyl dia in> <comp qty width> <oil qty width>
                             <oversizes>        <oversizes>                 <cyl dia mm>  <2nd comp qty width>
                             <material phrase>  <material phrase>
            Even pages (left) are shifted 71 pt left of odd pages, so columns are taken from each
            page's `YEAR NOTES PREMIUM STANDARD REQ DIA COMP OIL` header line.
  221-242   Piston ring set content listing: SET NO. | CYL. DIA. (in / mm) | ring width | facing |
            material | description/type | Cm/Oil | radial wall | qty, one line per ring (top, second,
            [third,] oil). Clean with word positions.
  243-247   Set-number -> make/block index. Redundant with the application pages; skipped.

Records: one `ring` per (set PN, fitment family). Engines of the same family served by the same set
are aggregated (ci unioned, year span, descriptions in fit.notes), as extract_king.py does. The
family is decided per set row from the engine manufacturer, CID, cylinder count, bore and the row's
years (the catalog describes engines by CID + bore, e.g. 350 CID at 4.000" is a small-block Chevy,
at 3.800" a Buick 350, at 3.875" a Pontiac 350, at 4.060" an Oldsmobile 350, at 3.898" an LS1).
Engines that map to no engine-build family keep the catalog's make heading as fit.fam.

Usage:  python -X utf8 -I scripts/parts-catalog/extract_mahle_oe_rings.py [--pdf PATH]
Writes only out/mahle-oe-rings.json and out/mahle-oe-rings.md.
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
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
SRC_FILE = "Catalogs/pr-20-19.pdf"
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "pr-20-19.pdf")
BRAND = "MAHLE"
DOC = "MAHLE Aftermarket Piston Rings Light Vehicle catalog PR-20-19 (PDF)"
EDITION = "2019 (PR-20-19; PDF created 2019-06-18)"
PAGE_OFFSET = 1  # printed page = pdf page - 1
APP_PAGES = range(26, 221)
SPEC_PAGES = range(221, 243)

US_FAMILY_ORDER = [
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
    "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
]
US_FAMILIES = set(US_FAMILY_ORDER)
# catalog make headings that are US domestic brands (for the US / import split in the notes)
US_MAKES = {
    "AMERICAN MOTORS", "AM GENERAL", "AVANTI", "BRICKLIN", "BUICK", "CADILLAC", "CHECKER", "CHEVROLET",
    "CHRYSLER", "DESOTO", "DODGE", "EAGLE", "EDSEL", "EXCALIBUR", "FARGO", "FORD", "FREIGHTLINER", "GEO",
    "GMC", "HUMMER", "INTERNATIONAL", "JEEP", "KENWORTH", "LINCOLN", "MERCURY", "MERKUR", "OLDSMOBILE",
    "PACKARD", "PETERBILT MOTOR", "PLYMOUTH", "PONTIAC", "RAM", "SATURN", "SHELBY", "STUDEBAKER", "STUTZ",
    "WORKHORSE",
}
# make heading -> engine manufacturer assumed when the engine description names none
MAKE_MFR = {
    "CHEVROLET": "GM", "GMC": "GM", "PONTIAC": "GM", "OLDSMOBILE": "GM", "BUICK": "GM", "CADILLAC": "GM",
    "SATURN": "GM", "HUMMER": "GM", "GEO": "GM", "CHECKER": "GM", "WORKHORSE": "GM",
    "FORD": "FORD", "MERCURY": "FORD", "LINCOLN": "FORD", "EDSEL": "FORD", "MERKUR": "FORD",
    "CHRYSLER": "CHRYSLER", "DODGE": "CHRYSLER", "PLYMOUTH": "CHRYSLER", "RAM": "CHRYSLER",
    "DESOTO": "CHRYSLER", "EAGLE": "CHRYSLER", "FARGO": "CHRYSLER",
    "AMERICAN MOTORS": "AMC", "INTERNATIONAL": "INTERNATIONAL",
}
MFR_ALIAS = {"GMC": "GM", "NAVISTAR": "INTERNATIONAL"}
MFR_DROP = {"TURBO", "DIESEL", "DURAMAX", "POWER-STROKE", "EUROPE"}

Q = '"”″'
RE_INT = re.compile(r"^\d{1,2}$")
RE_INCH = re.compile(r"^(\d\.\d{3})[" + Q + r"]$")
RE_MM = re.compile(r"^\(?(\d{2,3}\.\d)mm\)?$")
RE_WIDTH = re.compile(r"^(?:(\d+)/(\d+)[" + Q + r"]|(\.\d{2,4})[" + Q + r"]|(\d*\.?\d+)mm)$")
RE_RAD = re.compile(r"^(\d?\.\d{3})[" + Q + r"]$")
RE_YEARS = re.compile(r"^(\d{4})(?:-(\d{4}))?$")
RE_OS_ITEM = re.compile(r"^\+?(\.\d{2,3}|\d\.\d{1,3})(\"|MM)$")
RE_SET_PN = re.compile(r"^S?\d{4,5}(CP)?$")


def width(tok):
    """'5/64"' -> (0.0781, 'in'); '.118"' -> (0.118, 'in'); '1.2mm' -> (1.2, 'mm')."""
    m = RE_WIDTH.match(tok.replace("”", '"'))
    if not m:
        return None, None
    if m.group(1):
        return round(int(m.group(1)) / int(m.group(2)), 4), "in"
    if m.group(3):
        return float(m.group(3)), "in"
    return float(m.group(4)), "mm"


def printed(tok):
    return tok.replace("”", '"').replace("″", '"').replace("MM", " mm").replace("mm", " mm")


def page_lines(page, tol=3.5):
    """Words grouped into lines. Words of one logical row drift up to ~2.6 pt in y; distinct rows
    are at least 8 pt apart, so 3.5 pt separates them safely."""
    words = page.get_text("words")
    words.sort(key=lambda w: (round(w[1], 1), w[0]))
    lines, cur, anchor = [], [], None
    for w in words:
        if anchor is None or w[1] - anchor > tol:
            if cur:
                lines.append(cur)
            cur, anchor = [w], w[1]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    for ln in lines:
        ln.sort(key=lambda w: w[0])
    return lines


def title_make(make):
    keep = {"VW", "GMC", "TVR", "ISO", "AM"}
    return " ".join(w if w in keep else w.capitalize() for w in make.split())


# ----------------------------------------------------------------------------------------------
# set content listing (pp 221-242)
# ----------------------------------------------------------------------------------------------

def parse_spec_pages(doc, qa):
    specs = OrderedDict()
    dups = []
    for pno in SPEC_PAGES:
        cols = None
        cur = None
        for ln in page_lines(doc[pno - 1]):
            toks = [w[4] for w in ln]
            if toks[:2] == ["SET", "NO."]:
                cols = {t: w[0] for w, t in zip(ln, toks)}
                continue
            if cols is None:
                continue
            y = ln[0][1]
            if y < 90 or y > 750:
                continue
            b = defaultdict(list)
            for w in ln:
                x = w[0]
                if x < cols["CYL."] - 5:
                    b["pn"].append(w[4])
                elif x < cols["WIDTH"] - 5:
                    b["dia"].append(w[4])
                elif x < cols["FACING"] - 5:
                    b["width"].append(w[4])
                elif x < cols["MATERIAL"] - 5:
                    b["face"].append(w[4])
                elif x < cols["DESCRIPTION"] - 5:
                    b["mat"].append(w[4])
                elif x < cols["OIL"] - 5:
                    b["type"].append(w[4])
                elif x < cols["WALL"] - 5:
                    b["pos"].append(w[4])
                elif x < cols["QTY"] - 5:
                    b["rad"].append(w[4])
                else:
                    b["qty"].append(w[4])
            if b["pn"]:
                pn = " ".join(b["pn"])
                cur = {"pn": pn, "page": pno, "dia": [], "rings": []}
                if pn in specs:
                    dups.append(cur)
                else:
                    specs[pn] = cur
            if cur is None:
                qa.append(f"spec p{pno}: line before any set number: {' '.join(toks)}")
                continue
            cur["dia"] += b["dia"]
            if b["width"] or b["type"] or b["pos"]:
                cur["rings"].append({k: " ".join(b[k]) for k in ("width", "face", "mat", "type", "pos", "rad", "qty")})
            elif any(b[k] for k in ("face", "mat", "rad", "qty")):
                qa.append(f"spec p{pno} {cur['pn']}: stray tokens {dict(b)}")
    for d in dups:
        first = specs[d["pn"]]
        diff = []
        if first["dia"] != d["dia"]:
            diff.append(f"bore {first['dia']} vs {d['dia']}")
        if first["rings"] != d["rings"]:
            diff.append("ring lines differ")
        qa.append(f"spec {d['pn']}: listed twice on p{first['page']}" + (f" and p{d['page']}" if d["page"] != first["page"] else "")
                  + ("; identical" if not diff else "; first kept, second has " + ", ".join(diff)))
        first.setdefault("alsoPages", []).append(d["page"])
    return specs


def spec_components(s, qa):
    """Spec listing entry -> (bore_in, bore_mm, components list)."""
    bore_in = bore_mm = None
    for t in s["dia"]:
        m = RE_INCH.match(t)
        if m:
            bore_in = float(m.group(1))
        m = RE_MM.match(t)
        if m:
            bore_mm = float(m.group(1))
    comps = []
    ncm = sum(1 for r in s["rings"] if r["pos"] == "Cm")
    cm_names = ["top", "second", "third", "fourth"][:ncm]
    ci = 0
    for r in s["rings"]:
        c = OrderedDict()
        if r["pos"] == "Oil":
            c["position"] = "oil"
        elif r["pos"] == "Cm":
            c["position"] = cm_names[ci] if ci < len(cm_names) else f"compression{ci + 1}"
            ci += 1
        else:
            qa.append(f"spec {s['pn']}: unknown ring position {r['pos']!r}")
            c["position"] = r["pos"].lower() or "unknown"
        w, u = width(r["width"]) if r["width"] else (None, None)
        if w is None:
            qa.append(f"spec {s['pn']}: unparsed ring width {r['width']!r}")
        else:
            c["width"] = w
            c["widthUnits"] = u
            c["widthPrinted"] = printed(r["width"])
        if r["face"]:
            face = r["face"].replace("Plasme-Moly", "Plasma-Moly")
            if face != r["face"]:
                qa.append(f"spec {s['pn']}: facing printed {r['face']!r}, read as Plasma-Moly")
            c["face"] = face
        if r["mat"]:
            c["material"] = r["mat"].lower().replace("ductile cast iron", "ductile iron")
        if r["type"]:
            c["ringType"] = r["type"]
        if r["rad"]:
            m = RE_RAD.match(r["rad"].lstrip("0") if r["rad"].startswith("00") else r["rad"])
            if m:
                c["radialWall"] = float(m.group(1))
                if r["rad"].startswith("00"):
                    qa.append(f"spec {s['pn']}: radial wall printed {r['rad']!r}, read as {c['radialWall']}")
            else:
                qa.append(f"spec {s['pn']}: unparsed radial wall {r['rad']!r}")
        if r["qty"]:
            if r["qty"].isdigit():
                c["qty"] = int(r["qty"])
            else:
                qa.append(f"spec {s['pn']}: unparsed qty {r['qty']!r}")
        comps.append(c)
    return bore_in, bore_mm, comps


# ----------------------------------------------------------------------------------------------
# application pages (pp 26-220)
# ----------------------------------------------------------------------------------------------

def engine_meta(desc):
    """'5.7L 350 CID OHV 16V V8 4.000" (101.6mm) GM' -> dict."""
    d = desc.replace("( ", "(")
    m = OrderedDict()
    rest = d

    def take(pattern, key, conv=None, flags=0):
        nonlocal rest
        mm = re.search(pattern, rest, flags)
        if mm:
            m[key] = conv(mm.group(1)) if conv else mm.group(1)
            rest = rest[:mm.start()] + " " + rest[mm.end():]
        else:
            m[key] = None

    take(r"^(\d+\.\d)L\b", "liters", float)
    take(r"\b(\d{3,5}) CC\b", "cc", int)
    take(r"\b(\d{2,4}) CID\b", "cid", int)
    take(r"\b(OHV|SOHC|DOHC|L-HEAD|F-HEAD|OHC)\b", "cfg")
    take(r"\b(\d{1,2})V\b", "valves", int)
    lay = re.search(r"\b([VLHW])\s?(\d{1,2})\b", rest)
    if lay:
        m["layout"], m["cyl"] = lay.group(1), int(lay.group(2))
        rest = rest[:lay.start()] + " " + rest[lay.end():]
    else:
        m["layout"] = m["cyl"] = None
    take(r"(\d\.\d{3})[" + Q + r"]", "bore", float)
    take(r"\((\d{2,3}\.\d)mm\)", "boreMm", float)
    rest = re.sub(r"\s+", " ", rest).strip()
    m["qualifier"] = rest
    m["diesel"] = "DIESEL" in rest.upper()
    words = [w for w in rest.split() if w.upper() not in MFR_DROP]
    mfr = " ".join(words).upper()
    m["mfr"] = MFR_ALIAS.get(mfr, mfr) or None
    return m


def parse_codes(vin_text):
    """'VIN Codes: 0 (1999-2017), B (2005-2007), Engine Codes: L33 (1999-2017), L59 (2002-2007)'
    -> (vin codes, engine codes)."""
    t = re.sub(r"\s+", " ", vin_text)
    parts = re.split(r"Engine Codes?:", t, maxsplit=1)
    vin_part = re.sub(r"^.*?VIN Codes?:", "", parts[0])
    eng_part = parts[1] if len(parts) > 1 else ""

    def codes(s):
        s = re.sub(r"\([^)]*\)", "", s)
        out = []
        for tok in re.split(r"[,\s]+", s):
            tok = tok.strip()
            if tok and tok != "-" and tok not in out:
                out.append(tok)
        return out
    return codes(vin_part), codes(eng_part)


class AppParser:
    def __init__(self, doc, qa):
        self.doc = doc
        self.qa = qa
        self.make = None
        self.block = None
        self.entry = None
        self.blocks = []
        self.occ = []       # set occurrences (one per PN per row)
        self.unknown = []
        self.makes = OrderedDict()

    def run(self):
        for pno in APP_PAGES:
            self.parse_page(pno)
        self.flush_entry()
        return self.occ

    # -- page -------------------------------------------------------------------------------
    def parse_page(self, pno):
        lines = page_lines(self.doc[pno - 1])
        if not lines:
            return
        make = None
        if lines[0][0][1] < 80:
            make = " ".join(w[4] for w in lines[0])
        if make and make != self.make:
            self.flush_entry()
            self.block = None
            self.make = make
            self.makes.setdefault(make, 0)
        mode = "index"
        cols = None
        for ln in lines:
            y = ln[0][1]
            toks = [w[4] for w in ln]
            if y < 80 or y > 750:
                continue
            if toks[0] == "RING" and "OVERSIZES" in toks:
                continue
            if toks[0] == "YEAR" and "PREMIUM" in toks:
                cols = {t: w[0] for w, t in zip(ln, toks)}
                mode = "app"
                continue
            if toks[0] == "ENGINE" and "BLOCK" in toks:
                mode = "index"
                self.flush_entry()
                continue
            if mode != "app" or cols is None:
                continue
            if (ln[0][0] < cols["NOTES"] - 4 and toks[0].isdigit() and len(toks) >= 3
                    and ln[-1][0] > cols["OIL"] + 10 and toks[-1] == toks[0]):
                self.flush_entry()
                self.start_block(int(toks[0]), " ".join(toks[1:-1]), pno)
                continue
            b = self.bucket(ln, cols)
            if self.is_entry_start(b):
                self.flush_entry()
                self.start_entry(b, pno)
                continue
            if self.entry is not None:
                self.continue_entry(b, pno)
                continue
            if self.block is not None:
                text = " ".join(toks)
                if not text.startswith(("VIN", "Engine Code")) and any(RE_SET_PN.match(t) for t in toks):
                    self.unknown.append((pno, "set-like line outside an entry", text))
                else:
                    self.block["vin"] = (self.block["vin"] + " " + text).strip()
                continue
            self.unknown.append((pno, "line without block", " ".join(toks)))

    @staticmethod
    def bucket(ln, cols):
        b = defaultdict(list)
        for w in ln:
            x = w[0]
            if x < cols["NOTES"] - 4:
                k = "year"
            elif x < cols["PREMIUM"] - 4:
                k = "notes"
            elif x < cols["STANDARD"] - 4:
                k = "prem"
            elif x < cols["REQ"] - 2:
                k = "std"
            elif x < (cols["REQ"] + cols["DIA"]) / 2:
                k = "req"
            elif x < cols["COMP"] - 4:
                k = "dia"
            elif x < cols["OIL"] - 4:
                k = "comp"
            else:
                k = "oil"
            b[k].append(w[4])
        return b

    @staticmethod
    def is_entry_start(b):
        return any(RE_INT.match(t) for t in b["req"]) and any(RE_INCH.match(t) for t in b["dia"])

    # -- blocks / entries ---------------------------------------------------------------------
    def start_block(self, no, desc, pno):
        self.block = {"no": no, "make": self.make, "desc": re.sub(r"\s+", " ", desc), "page": pno,
                      "vin": "", "meta": engine_meta(desc), "rows": 0}
        self.blocks.append(self.block)
        self.makes[self.make] = self.makes.get(self.make, 0) + 1

    def start_entry(self, b, pno):
        if self.block is None:
            self.unknown.append((pno, "set row before any block", str(dict(b))))
            self.entry = None
            return
        e = {"block": self.block, "page": pno, "year": " ".join(b["year"]), "notes": [" ".join(b["notes"])] if b["notes"] else [],
             "prem": {"pn": " ".join(b["prem"]) or None, "os": "", "mat": []},
             "std": {"pn": " ".join(b["std"]) or None, "os": "", "mat": []},
             "req": None, "dia": None, "diaMm": None, "compToks": [], "oilToks": []}
        req = [t for t in b["req"] if RE_INT.match(t)]
        e["req"] = int(req[0])
        if len(b["req"]) != 1:
            self.qa.append(f"p{pno}: qty-required column has {b['req']}")
        for t in b["dia"]:
            m = RE_INCH.match(t)
            if m:
                e["dia"] = float(m.group(1))
        self.add_dims(e, b, pno)
        self.entry = e

    def add_dims(self, e, b, pno):
        for t in b["dia"]:
            m = RE_MM.match(t)
            if m:
                e["diaMm"] = float(m.group(1))
        e["compToks"] += b["comp"]
        e["oilToks"] += b["oil"]

    @staticmethod
    def pair_up(toks, pno, qa, col):
        """['4', '5/64"', '4', '5/64"'] -> [(4, '5/64"'), (4, '5/64"')]; qty and width may sit on
        different text lines, so pairing is done on the token stream."""
        pairs, qty = [], None
        for t in toks:
            if t.isdigit():
                if qty is not None:
                    qa.append(f"p{pno}: {col} column qty {qty} without a width")
                qty = int(t)
            elif RE_WIDTH.match(t.replace("”", '"')):
                pairs.append((qty, t))
                qty = None
            else:
                qa.append(f"p{pno}: unexpected {col} column token {t!r}")
        if qty is not None:
            qa.append(f"p{pno}: {col} column qty {qty} without a width")
        return pairs

    def continue_entry(self, b, pno):
        e = self.entry
        if b["year"]:
            self.qa.append(f"p{pno}: year-column text on a continuation line: {b['year']}")
        if b["notes"]:
            e["notes"].append(" ".join(b["notes"]))
        for col in ("prem", "std"):
            for t in b[col]:
                if any(ch.isdigit() for ch in t) or t.upper().startswith("STD"):
                    e[col]["os"] += t
                else:
                    e[col]["mat"].append(t)
        if b["req"]:
            self.qa.append(f"p{pno}: qty-required tokens on a continuation line: {b['req']}")
        self.add_dims(e, b, pno)

    def flush_entry(self):
        e = self.entry
        self.entry = None
        if e is None:
            return
        blk = e["block"]
        blk["rows"] += 1
        comp = self.pair_up(e["compToks"], e["page"], self.qa, "comp")
        oil_pairs = self.pair_up(e["oilToks"], e["page"], self.qa, "oil")
        oil = oil_pairs[0] if oil_pairs else None
        if len(oil_pairs) > 1:
            self.qa.append(f"p{e['page']}: more than one oil ring line {oil_pairs}")
        m = RE_YEARS.match(re.sub(r"\s*-\s*", "-", e["year"].strip()))
        if m:
            y0 = int(m.group(1))
            y1 = int(m.group(2)) if m.group(2) else y0
        else:
            y0 = y1 = None
            self.qa.append(f"p{e['page']} block {blk['make']} {blk['no']}: year text {e['year']!r} not understood")
        notes = re.sub(r"\s+", " ", " ".join(e["notes"])).strip()
        for col, grade in (("prem", "premium"), ("std", "standard")):
            c = e[col]
            if not c["pn"]:
                if c["os"] or c["mat"]:
                    self.qa.append(f"p{e['page']} block {blk['make']} {blk['no']}: {grade} column has text but no set number ({c['os']} {' '.join(c['mat'])})")
                continue
            pn = c["pn"]
            if not (RE_SET_PN.match(pn) or re.match(r"^\d{3} (RS \d{5} )?\d{2}? ?\w?N\d$", pn) or re.match(r"^\d{3}( \w+)+$", pn)):
                self.qa.append(f"p{e['page']} block {blk['make']} {blk['no']}: unusual set number {pn!r}")
            self.occ.append({
                "pn": pn, "grade": grade, "oversizes": c["os"], "appMaterial": " ".join(c["mat"]),
                "block": blk, "make": blk["make"], "page": e["page"], "y0": y0, "y1": y1, "notes": notes,
                "req": e["req"], "dia": e["dia"], "diaMm": e["diaMm"], "comp": comp, "oil": oil,
            })


# ----------------------------------------------------------------------------------------------
# family classification
# ----------------------------------------------------------------------------------------------

def near(a, b, tol=0.011):
    return a is not None and abs(a - b) <= tol


SBC_BORES = {262: (3.671,), 265: (3.736, 3.750), 267: (3.500,), 283: (3.875,), 302: (4.000,), 305: (3.736,),
             307: (3.875,), 327: (4.000,), 350: (4.000,), 400: (4.125,)}
OLDS_BORES = {260: (3.500,), 303: (3.750,), 307: (3.800,), 324: (3.875,), 330: (3.938,), 350: (4.057,),
              371: (4.000,), 394: (4.125,), 400: (4.000, 3.870), 403: (4.351, 4.120), 425: (4.125,), 455: (4.125,)}
PONTIAC_BORES = {265: (3.750,), 287: (3.750,), 301: (4.000,), 316: (3.938,), 326: (3.719,), 347: (3.938,),
                 350: (3.875,), 370: (4.062,), 389: (4.062,), 400: (4.120,), 421: (4.094,), 428: (4.120,),
                 455: (4.151,)}
BUICK_SMALL_BORES = {215: (3.500,), 300: (3.750,), 340: (3.750,), 350: (3.800,)}
BUICK_BIG_BORES = {400: (4.040,), 430: (4.188, 4.313), 455: (4.313,)}
CADILLAC_BORES = {368: (3.800,), 425: (4.082,), 472: (4.300,), 500: (4.300,)}
BUICK_V6_BORES = {181: (3.800,), 196: (3.500,), 198: (3.625,), 225: (3.750,), 231: (3.800,), 252: (3.965,)}
WINDSOR_BORES = {221: (3.500,), 255: (3.680,), 260: (3.800,), 289: (4.000,), 302: (4.000,)}
LA_BORES = {273: (3.625,), 318: (3.910,), 340: (4.040,), 360: (4.000,)}
BRB_BORES = {350: (4.060,), 361: (4.125,), 383: (4.250, 4.030), 400: (4.342,), 413: (4.188,), 440: (4.320,)}
FE_CIDS = {330, 332, 352, 359, 360, 361, 390, 391, 406, 410, 427, 428}


def bore_in(bore, cid, table):
    return cid in table and any(near(bore, b) for b in table[cid])


def families(occ, set_min_y0):
    """set_min_y0: {(pn, cid): earliest row start year} over the whole catalog. Generation splits
    that share a bore (Gen IV vs Gen V GM, 7.3 IDI vs Power Stroke) are decided per set number:
    a set that is also listed for earlier years is the earlier design."""
    blk = occ["block"]
    m = blk["meta"]
    make = blk["make"]
    cid, cyl, bore, cfg, valves, layout = m["cid"], m["cyl"], m["bore"], m["cfg"], m["valves"], m["layout"]
    mfr = m["mfr"] or MAKE_MFR.get(make)
    diesel = m["diesel"]
    y0 = occ["y0"] or 0
    y1 = occ["y1"] or 9999
    set_y0 = set_min_y0.get((occ["pn"], cid), y0)
    notes_u = (occ["notes"] or "").upper()
    qual_u = m["qualifier"].upper()
    fams = []

    def add(f):
        if f not in fams:
            fams.append(f)

    v8 = layout == "V" and cyl == 8
    l6 = layout == "L" and cyl == 6
    v6 = layout == "V" and cyl == 6
    pushrod = cfg in (None, "OHV")

    if mfr == "GM":
        if "DURAMAX" in qual_u or (cyl == 8 and valves == 32 and cid in (400, 403) and near(bore, 4.055)):
            add("Duramax 6.6")
        elif diesel:
            pass
        elif v8:
            if cid in (348, 409):
                add("Chevy W-series 348/409")
            elif cid in (366, 396, 402, 454, 502) or (cid == 427 and near(bore, 4.250)):
                if y0 <= 1990:
                    add("Chevy Mark IV big block")
                if y1 >= 1991:
                    add("Chevy Gen VI big block")
            elif cid in (293, 294) and near(bore, 3.780):
                add("GM LS")
            elif cid == 325 and near(bore, 3.780):
                # Gen V (L83) sets are listed only in 2014-2017 rows; a set that also has rows
                # starting before 2014 is a Gen III/IV set (e.g. 41859CP 1999-2014).
                add("GM LT (Gen V)" if set_y0 >= 2014 else "GM LS")
            elif cid in (346, 350) and near(bore, 3.898):
                add("GM LS")
            elif cid == 364 and near(bore, 4.000) and y0 >= 1999:
                add("GM LS")
            elif cid == 376 and near(bore, 4.065):
                add("GM LT (Gen V)" if set_y0 >= 2014 else "GM LS")
            elif cid == 427 and near(bore, 4.125) and y0 >= 2006:
                add("GM LS")
            elif cid == 265 and near(bore, 3.750) and y0 >= 1977:
                add("Pontiac V8")
            elif bore_in(bore, cid, SBC_BORES):
                add("Small-block Chevy")
            elif bore_in(bore, cid, OLDS_BORES):
                add("Oldsmobile V8")
            elif bore_in(bore, cid, PONTIAC_BORES):
                add("Pontiac V8")
            elif bore_in(bore, cid, BUICK_SMALL_BORES):
                add("Buick 350")
            elif bore_in(bore, cid, BUICK_BIG_BORES):
                add("Buick big block")
            elif bore_in(bore, cid, CADILLAC_BORES):
                add("Cadillac 368-500")
        elif l6 and cid in (194, 215, 230, 250, 292) and pushrod:
            add("Chevy inline-6")
        elif v6 and pushrod and bore_in(bore, cid, BUICK_V6_BORES):
            add("Buick V6 181-252")
    elif mfr == "FORD":
        if diesel:
            if cid == 445 and set_y0 >= 1994:  # 7.3 IDI sets (rows from 1988) stay unmapped
                add("Powerstroke 7.3")
            elif cid == 363:
                add("Powerstroke 6.0")
            elif cid == 391:
                add("Powerstroke 6.4")
            elif cid == 406:
                add("Powerstroke 6.7")
        elif v8:
            if cfg == "DOHC" and cid == 302 and near(bore, 3.630):
                add("Ford Coyote")
            elif cid in (281, 330) and cfg in ("SOHC", "DOHC") and near(bore, 3.551):
                add("Ford Modular")
            elif pushrod:
                if bore_in(bore, cid, WINDSOR_BORES):
                    add("Small-block Ford (Windsor)")
                elif cid == 351 and near(bore, 4.000):
                    add("Small-block Ford (Windsor)")
                    add("Ford 351C/351M/400")
                elif cid == 400 and near(bore, 4.000):
                    add("Ford 351C/351M/400")
                elif cid in FE_CIDS and bore is not None and bore >= 3.86:
                    add("Ford FE")
                elif cid in (370, 429, 460) and bore is not None and bore >= 4.04:
                    add("Ford 429/460")
        elif cyl == 10 and cid == 415:
            add("Ford Modular")
        elif l6 and cid in (240, 300) and near(bore, 4.000) and pushrod:
            add("Ford 240/300 inline-6")
    elif mfr == "INTERNATIONAL":
        if cid == 445 and v8 and set_y0 >= 1994:
            add("Powerstroke 7.3")
    elif mfr == "CUMMINS":
        if l6 and cid == 359:
            if valves == 12:
                add("Cummins 5.9 12V")
            elif valves == 24:
                add("Cummins 5.9 24V/CR")
            else:
                if y0 <= 1998:
                    add("Cummins 5.9 12V")
                if y1 >= 1998:
                    add("Cummins 5.9 24V/CR")
        elif l6 and cid == 408:
            add("Cummins 6.7")
    elif mfr == "CHRYSLER":
        if v8 and pushrod:
            if cid == 345 and near(bore, 3.917):
                add("Chrysler Gen III Hemi 5.7/6.1")
            elif cid == 370 and near(bore, 4.055):
                add("Chrysler Gen III Hemi 5.7/6.1")
            elif cid in (376, 392) and bore is not None and bore >= 4.08:
                add("Chrysler Gen III Hemi 6.2/6.4")
            elif cid == 426 and near(bore, 4.250):
                if "HEMI" in notes_u or y0 >= 1966:
                    add("Chrysler 426 Hemi")
                if "HEMI" not in notes_u and y0 <= 1965:
                    add("Mopar B/RB big block")
            elif bore_in(bore, cid, BRB_BORES):
                add("Mopar B/RB big block")
            elif bore_in(bore, cid, LA_BORES):
                la_start = 1967 if cid == 318 else 1964
                if y0 <= 1991 and y1 >= la_start and (cid != 360 or y0 <= 1992):
                    add("Mopar LA small block")
                if cid == 318 and y1 >= 1992:
                    add("Mopar Magnum 5.2/5.9")
                if cid == 360 and y1 >= 1993:
                    add("Mopar Magnum 5.2/5.9")
        elif l6 and pushrod:
            if cid in (170, 198, 225) and near(bore, 3.400):
                add("Mopar Slant Six")
            elif cid == 242 and near(bore, 3.875):
                add("AMC/Jeep inline-6")
    elif mfr == "AMC":
        if v8 and pushrod and cid in (290, 304, 343, 360, 390, 401):
            add("AMC V8")
        elif l6 and pushrod and cid in (199, 232, 242, 258):
            add("AMC/Jeep inline-6")
    if not fams:
        fams.append(title_make(make))
    return fams


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------

def parse_oversizes(s, pn, qa):
    s = s.replace("”", '"').replace(" ", "")
    items = [x for x in s.split(",") if x]
    out, units, suffix = [], set(), []
    for it in items:
        m = re.match(r"^(N[0-9O])\((.+)\)$", it)  # 'NO(STD)' is printed once with a letter O
        if m:
            suffix.append(m.group(1).replace("O", "0"))
            it = m.group(2)
        u = it.upper().rstrip(".")
        if u in ("STD", "N0"):
            out.append(0.0)
            if u == "N0":
                suffix.append("N0")
            continue
        m = RE_OS_ITEM.match(it.upper())
        if m:
            out.append(float(m.group(1)))
            units.add("in" if m.group(2) == '"' else "mm")
        else:
            qa.append(f"{pn}: oversize item {it!r} not understood (printed {s!r})")
    unit = units.pop() if len(units) == 1 else ("mixed" if units else "in")
    return out, unit, s, suffix


def engine_cid(meta):
    """CID as printed, else derived from cc (or liters) so every record can be filtered by ci."""
    if meta["cid"]:
        return meta["cid"], False
    if meta["cc"]:
        return int(round(meta["cc"] / 16.387064)), True
    if meta["liters"]:
        return int(round(meta["liters"] * 61.0237)), True
    return None, False


def engine_note_key(blk, occ):
    """Everything but the make, so makes sharing one engine line can be merged."""
    bits = [blk["desc"]]
    if occ["y0"]:
        bits.append(f"{occ['y0']}-{occ['y1']}" if occ["y1"] != occ["y0"] else str(occ["y0"]))
    _, codes = parse_codes(blk["vin"])
    if codes:
        shown = codes[:12]
        bits.append("engine codes " + ", ".join(shown) + (f" +{len(codes) - len(shown)} more" if len(codes) > len(shown) else ""))
    if occ["notes"]:
        bits.append(occ["notes"])
    return "; ".join(bits)


def fit_notes(occ):
    groups = OrderedDict()
    for o in occ:
        groups.setdefault(engine_note_key(o["block"], o), []).append(title_make(o["make"]))
    return " | ".join("/".join(OrderedDict.fromkeys(makes)) + " " + key for key, makes in groups.items())


def build_records(occs, specs, qa):
    groups = OrderedDict()
    fam_by_make = defaultdict(Counter)
    set_min_y0 = {}
    for o in occs:
        if o["y0"]:
            k = (o["pn"], o["block"]["meta"]["cid"])
            set_min_y0[k] = min(set_min_y0.get(k, 9999), o["y0"])
    for o in occs:
        for fam in families(o, set_min_y0):
            fam_by_make[o["make"]][fam] += 1
            key = (o["pn"], fam)
            g = groups.get(key)
            if g is None:
                g = groups[key] = {"fam": fam, "occ": [], "pages": set(), "makes": OrderedDict()}
            g["occ"].append(o)
            g["pages"].add(o["page"])
            g["makes"].setdefault(o["make"], 0)
            g["makes"][o["make"]] += 1

    spec_cache = {}
    conflicts = Counter()
    records = []
    missing_spec = set()
    for (pn, fam), g in groups.items():
        occ = g["occ"]
        first = occ[0]
        # spec listing
        s = specs.get(pn)
        if pn not in spec_cache:
            spec_cache[pn] = spec_components(s, qa) if s else (None, None, [])
        sbore, sbore_mm, comps = spec_cache[pn]
        if not s:
            missing_spec.add(pn)
        spec = OrderedDict()
        single = pn.startswith("S") or any("SINGLE CYLINDER" in (o["notes"] or "").upper() for o in occ)
        if not single and any(o["req"] != 1 for o in occ):
            qa.append(f"{pn}: qty required {sorted({o['req'] for o in occ})} on a set not marked single-cylinder")
        # bore
        dias = {o["dia"] for o in occ if o["dia"]}
        dias_mm = {o["diaMm"] for o in occ if o["diaMm"]}
        if len(dias) > 1:
            conflicts[f"{pn}: application bore differs across rows {sorted(dias)}"] += 1
        bore = sbore if sbore is not None else (sorted(dias)[0] if dias else None)
        if sbore is not None and dias and all(abs(d - sbore) > 0.0105 for d in dias):
            qa.append(f"{pn}: spec listing bore {sbore} vs application bore {sorted(dias)}")
        if bore is not None:
            spec["bore"] = bore
        bmm = sbore_mm if sbore_mm is not None else (sorted(dias_mm)[0] if dias_mm else None)
        if bmm is not None:
            spec["boreMm"] = bmm
        # oversizes (union across rows; rows of one PN normally print the same list)
        os_sets = OrderedDict()
        for o in occ:
            if o["oversizes"]:
                os_sets.setdefault(o["oversizes"], 0)
                os_sets[o["oversizes"]] += 1
        if os_sets:
            printed_os = max(os_sets, key=os_sets.get)
            vals, unit, _, suffix = parse_oversizes(printed_os, pn, qa)
            parsed = {k: tuple(parse_oversizes(k, pn, [])[0]) for k in os_sets}
            if len(set(parsed.values())) > 1:
                allv = set()
                for v in parsed.values():
                    allv.update(v)
                qa.append(f"{pn}: oversize lists differ across rows {list(os_sets)}; most common kept, union in spec.oversizesAllRows")
                spec["oversizesAllRows"] = sorted(allv)
            spec["oversizes"] = vals
            spec["oversizeUnits"] = unit
            spec["oversizesPrinted"] = printed_os
            if suffix:
                spec["oversizeSuffixes"] = suffix
        else:
            qa.append(f"{pn}: no oversize list printed")
        # ring widths: spec listing first, else application columns
        if comps:
            byp = {c["position"]: c for c in comps}
            units = set()
            wp = []
            for pos, key in (("top", "topWidth"), ("second", "secondWidth"), ("third", "thirdWidth"), ("oil", "oilWidth")):
                c = byp.get(pos)
                if c and "width" in c:
                    spec[key] = c["width"]
                    units.add(c["widthUnits"])
                    wp.append(c["widthPrinted"])
            spec["units"] = units.pop() if len(units) == 1 else "mixed"
            spec["widthsPrinted"] = ", ".join(wp)
            top = byp.get("top", {})
            if top.get("material"):
                spec["material"] = top["material"]
            if top.get("face"):
                spec["face"] = top["face"]
            if top.get("ringType"):
                spec["topRingType"] = top["ringType"]
            spec["components"] = comps
            qtys = {c.get("qty") for c in comps if c.get("qty")}
            if len(qtys) == 1:
                spec["cylinders"] = qtys.pop()
            elif qtys:
                qa.append(f"{pn}: ring quantities differ within the set {sorted(qtys)}")
            # cross-check the application widths
            app_w = []
            for q, w in first["comp"]:
                app_w.append(width(w)[0])
            if first["oil"]:
                app_w.append(width(first["oil"][1])[0])
            spec_w = [spec.get(k) for k in ("topWidth", "secondWidth", "oilWidth")]
            if len(app_w) >= 3 and None not in spec_w and [round(x, 3) if x else x for x in app_w[:2] + app_w[-1:]] != [round(x, 3) for x in spec_w]:
                qa.append(f"{pn}: application widths {app_w} vs spec listing {spec_w}")
        else:
            units = set()
            wp = []
            for i, (q, w) in enumerate(first["comp"][:3]):
                val, u = width(w)
                if val is not None:
                    spec[("topWidth", "secondWidth", "thirdWidth")[i]] = val
                    units.add(u)
                    wp.append(printed(w))
            if first["oil"]:
                val, u = width(first["oil"][1])
                if val is not None:
                    spec["oilWidth"] = val
                    units.add(u)
                    wp.append(printed(first["oil"][1]))
            if units:
                spec["units"] = units.pop() if len(units) == 1 else "mixed"
            if wp:
                spec["widthsPrinted"] = ", ".join(wp)
            qtys = {q for q, _ in first["comp"] if q} | ({first["oil"][0]} if first["oil"] and first["oil"][0] else set())
            if len(qtys) == 1:
                spec["cylinders"] = qtys.pop()
            spec["specSource"] = "application columns (set not in content listing)"
        mats = Counter(o["appMaterial"] for o in occ if o["appMaterial"])
        if mats:
            spec["appMaterial"] = mats.most_common(1)[0][0]
            if "material" not in spec:
                am = spec["appMaterial"]
                for face in ("Plasma-Moly", "Chrome", "Gas Nitride", "PVD"):
                    if am.startswith(face):
                        spec["face"] = face
                        rest = am[len(face):].strip()
                        if rest:
                            spec["material"] = rest.lower()
                        break
                else:
                    spec["material"] = am.lower()
        spec["grade"] = first["grade"]
        grades = {o["grade"] for o in occ}
        if len(grades) > 1:
            qa.append(f"{pn}: listed as premium in some rows and standard in others")
            spec["grade"] = "premium/standard"
        spec["style"] = "single-cylinder" if single else "engine-set"
        if single:
            reqs = sorted({o["req"] for o in occ})
            spec["setsPerEngine"] = reqs[0] if len(reqs) == 1 else reqs
            if pn.startswith("S") and pn[1:] in specs:
                spec["engineSetPn"] = pn[1:]
        set_notes = Counter(o["notes"] for o in occ if o["notes"])
        if set_notes:
            spec["notes"] = "; ".join(sorted(set_notes))
        # fitment
        metas = [(o["block"]["meta"], o) for o in occ]
        cid_pairs = [engine_cid(mm) for mm, _ in metas]
        cids = sorted({c for c, _ in cid_pairs if c})
        ci_derived = any(d for c, d in cid_pairs if c)
        cyls = sorted({mm["cyl"] for mm, _ in metas if mm["cyl"]})
        y0s = [o["y0"] for o in occ if o["y0"]]
        y1s = [o["y1"] for o in occ if o["y1"]]
        fit = OrderedDict()
        fit["fam"] = fam
        if cids:
            fit["ci"] = cids
            if ci_derived:
                fit["ciFromCc"] = True
        if len(cyls) == 1:
            fit["cyl"] = cyls[0]
        if y0s:
            fit["y0"] = min(y0s)
        if y1s:
            fit["y1"] = max(y1s)
        fit["notes"] = fit_notes(occ)
        codes = []
        for o in occ:
            for c in parse_codes(o["block"]["vin"])[1]:
                if c not in codes:
                    codes.append(c)
        if codes:
            fit["engineCodes"] = codes
        # name
        bits = [f"Ring set, {bore:.3f} bore" if bore is not None else "Ring set"]
        if spec.get("widthsPrinted"):
            bits.append(spec["widthsPrinted"])
        if spec.get("face") or spec.get("material"):
            bits.append(" ".join(x for x in (spec.get("face"), spec.get("material")) if x) + " top")
        if spec.get("cylinders"):
            bits.append(f"{spec['cylinders']} cyl" if not single else "single cylinder")
        bits.append(spec["grade"])
        name = ", ".join(bits)
        pages = sorted(g["pages"])
        src = OrderedDict([
            ("doc", DOC), ("edition", EDITION), ("file", SRC_FILE),
            ("page", ", ".join(str(p) for p in pages)),
            ("printedPage", ", ".join(str(p - PAGE_OFFSET) for p in pages)),
            ("section", "Application listing: " + ", ".join(f"{title_make(mk)} ({n})" for mk, n in g["makes"].items())),
        ])
        if s:
            src["specPage"] = s["page"]
        rec = OrderedDict([("m", BRAND), ("p", pn), ("cat", "ring"), ("name", name), ("fit", fit),
                           ("spec", spec), ("src", src), ("emissions", None)])
        records.append(rec)

    def order(r):
        f = r["fit"]["fam"]
        if f in US_FAMILIES:
            return (0, US_FAMILY_ORDER.index(f), r["p"])
        return (1, f, r["p"])
    records.sort(key=order)
    for c in conflicts:
        qa.append(c)
    if missing_spec:
        qa.append(f"{len(missing_spec)} set numbers not in the content listing (widths from the application columns, no per-ring material): {', '.join(sorted(missing_spec))}")
    return records, fam_by_make, missing_spec


# ----------------------------------------------------------------------------------------------
# validation / notes
# ----------------------------------------------------------------------------------------------

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
            elif isinstance(o, float) and o != o:
                errs.append(f"{r['p']}: NaN at {path}")
        walk(r, r["p"])
        for k in ("bore", "boreMm", "topWidth", "secondWidth", "thirdWidth", "oilWidth", "cylinders"):
            if k in r["spec"] and not isinstance(r["spec"][k], (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric")
        if "oversizes" in r["spec"] and not all(isinstance(v, (int, float)) for v in r["spec"]["oversizes"]):
            errs.append(f"{r['p']}: spec.oversizes not numeric")
        for k in ("ci", "cyl", "y0", "y1"):
            v = r["fit"].get(k)
            if v is not None and not (isinstance(v, (int, float)) or (isinstance(v, list) and all(isinstance(x, int) for x in v))):
                errs.append(f"{r['p']}: fit.{k} not numeric")
    return errs


def write_notes(path, pdf_path, npages, records, occs, parser, specs, fam_by_make, missing_spec, qa, errs):
    by_fam = Counter(r["fit"]["fam"] for r in records)
    pn_by_fam = defaultdict(set)
    for r in records:
        pn_by_fam[r["fit"]["fam"]].add(r["p"])
    us_fam_recs = sum(n for f, n in by_fam.items() if f in US_FAMILIES)
    heading_fams = [f for f in by_fam if f not in US_FAMILIES]
    us_heading = [f for f in heading_fams if f.upper() in US_MAKES]
    import_heading = [f for f in heading_fams if f.upper() not in US_MAKES]
    L = []
    L.append("# MAHLE Piston Rings Light Vehicle 2019 (PR-20-19) extraction notes\n")
    L.append(f"- Source: `{os.path.basename(pdf_path)}` ({npages} pages, text layer; manual download under `Catalogs/`, no network). Edition {EDITION}.")
    L.append(f"- Extracted {dt.date.today().isoformat()} with `extract_mahle_oe_rings.py` (PyMuPDF words; application pages PDF {APP_PAGES.start}-{APP_PAGES.stop - 1}, set content listing PDF {SPEC_PAGES.start}-{SPEC_PAGES.stop - 1}; printed page = PDF page - 1).")
    L.append(f"- {len(parser.blocks)} engine blocks under {len(parser.makes)} make headings; {len(occs)} set rows (one per PN per year row); {len(specs)} set numbers in the content listing.")
    L.append(f"- {len(records)} records, all `cat: ring`, one per (set PN, family); {len({r['p'] for r in records})} distinct set PNs.")
    L.append(f"  - {us_fam_recs} records in {sum(1 for f in by_fam if f in US_FAMILIES)} engine-build families (US domestic).")
    L.append(f"  - {sum(by_fam[f] for f in us_heading)} records under {len(us_heading)} US make headings (engines with no engine-build family: GM 60/90-degree V6, 4-cylinders, Cadillac HT/Northstar, GM 6.2/6.5 diesel, 8.1L, Y-block, Viper V10, flatheads, nailheads ...).")
    L.append(f"  - {sum(by_fam[f] for f in import_heading)} records under {len(import_heading)} import make headings (kept as the catalog heading).")
    L.append("")
    L.append("## Method\n")
    L.append("- Application pages: each make heading opens with an engine index (skipped) and then numbered blocks `<no> <engine description> <no>`, a VIN/engine-code line, and set rows. Columns come from the page's `YEAR NOTES PREMIUM STANDARD REQ DIA COMP OIL` header (left and right pages are offset by 71 pt). A set row starts on a line with an integer in REQ and an inch bore in DIA; the following lines carry the oversize list, the material phrase, the mm bore and the second compression ring.")
    L.append("- PREMIUM and STANDARD columns each give a set PN (`spec.grade`). `S`-prefixed numbers are single-cylinder sets (`spec.style: single-cylinder`, `spec.setsPerEngine` = qty required, `spec.engineSetPn` = the matching engine set).")
    L.append("- Set content listing (PDF 221-242) gives, per set, bore in/mm and one line per ring: width, facing, material, MAHLE type code, Cm/Oil, radial wall, qty. These go to `spec.components` (positions top/second/[third]/oil); `spec.material`/`spec.face` are the top ring's; `spec.cylinders` is the ring qty per position. The application-page material phrase is kept in `spec.appMaterial`. Application widths are cross-checked against the listing (QA below).")
    L.append("- Widths: fractions to decimal inches (5/64 = 0.0781, 3/32 = 0.0938, 3/16 = 0.1875, 1/16 = 0.0625); metric widths stay in mm; `spec.units` is `in`, `mm` or `mixed`, `spec.widthsPrinted` the catalog text. `spec.oversizes` is a numeric list (0 = STD) in `spec.oversizeUnits`; metric European numbers print `N0(STD),N1(.25mm),N2(.50mm)` where the N-suffix replaces the N0 of the PN (`spec.oversizeSuffixes`).")
    L.append("- Family: from the engine manufacturer named at the end of the description (GM, FORD, CHRYSLER, AMC, CUMMINS ...; defaulting to the make), CID, cylinders, head type, bore and the row's years. The catalog identifies GM V8s by CID + bore only, so bore tables resolve Chevy/Olds/Pontiac/Buick/Cadillac (e.g. 350 CID: 4.000 SBC, 3.800 Buick 350, 3.875 Pontiac, 4.060 Olds, 3.898 LS1). Year splits: 5.3L 325 and 6.2L 376 sets whose earliest row starts in 2014 or later -> GM LT (Gen V) (42216CP, 42217CP), sets that also have earlier rows -> GM LS (e.g. 41859CP 1999-2014, 42082CP = LS3); BBC rows <=1990 Mark IV / >=1991 Gen VI (both when spanning); 318/360 rows <=1991/1992 LA, >=1992/1993 Magnum (both when spanning; the 318 rows that start in 1957 include the poly A years, rows ending <=1966 stay unmapped); Cummins 359 without a valve count split at 1998 (both when spanning); 7.3L 445 sets with rows starting before 1994 (IDI: 41548 with the .118\" top ring) unmapped, the rest Powerstroke 7.3; 426 rows from 1966 -> 426 Hemi, <=1965 -> B/RB wedge. Ford 351 at 4.000 bore is emitted under both Windsor and 351C/351M/400 (the catalog does not separate them).")
    L.append("- Aggregation: engines of one family served by one set are merged (ci unioned, year span min/max, `fit.engineCodes` unioned, `fit.notes` = one entry per engine line/years with the makes that share it, the OE engine codes and the row note such as `Shallow Groove`). When the catalog prints only cc (most imports) `fit.ci` is derived from cc (or liters) and `fit.ciFromCc: true` is set.")
    L.append("- Skipped: technical/nomenclature pages 1-25, the per-make engine index tables, and the set-number index (PDF 243-247).")
    L.append("")
    L.append("## Records per family (engine-build families first)\n")
    for f in US_FAMILY_ORDER:
        if by_fam.get(f):
            L.append(f"- {f}: {by_fam[f]} ({len(pn_by_fam[f])} PNs)")
    missing = [f for f in US_FAMILY_ORDER if not by_fam.get(f)]
    if missing:
        L.append(f"- families with no rows in this catalog: {', '.join(missing)}")
    L.append("")
    L.append("## Records kept under the catalog make heading (no engine-build family)\n")
    L.append("US makes: " + ", ".join(f"{f} {by_fam[f]}" for f in sorted(us_heading)))
    L.append("")
    L.append("Import makes: " + ", ".join(f"{f} {by_fam[f]}" for f in sorted(import_heading)))
    L.append("")
    L.append("## Families per make heading (set rows)\n")
    for mk in parser.makes:
        c = fam_by_make.get(mk)
        if c:
            L.append(f"- {mk}: " + ", ".join(f"{f} {n}" for f, n in c.most_common()))
    L.append("")
    L.append(f"## Lines not understood ({len(parser.unknown)})\n")
    for pno, why, text in parser.unknown[:60]:
        L.append(f"- p{pno} ({why}): {text}")
    if not parser.unknown:
        L.append("- none")
    L.append("")
    L.append(f"## QA ({len(qa)})\n")
    for q in qa[:400]:
        L.append(f"- {q}")
    if len(qa) > 400:
        L.append(f"- ... {len(qa) - 400} more")
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
    qa = []
    doc = pymupdf.open(args.pdf)
    npages = len(doc)
    specs = parse_spec_pages(doc, qa)
    parser = AppParser(doc, qa)
    occs = parser.run()
    doc.close()

    records, fam_by_make, missing_spec = build_records(occs, specs, qa)
    used = {o["pn"] for o in occs}
    unused = [pn for pn in specs if pn not in used]
    if unused:
        qa.append(f"{len(unused)} content-listing sets never referenced by an application row: {', '.join(unused)}")
    qa[:] = list(OrderedDict.fromkeys(qa))
    errs = validate(records)
    os.makedirs(OUT, exist_ok=True)
    out = {"source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": SRC_FILE, "pages": npages,
                      "parsedPages": {"application": [APP_PAGES.start, APP_PAGES.stop - 1],
                                      "setContentListing": [SPEC_PAGES.start, SPEC_PAGES.stop - 1]},
                      "note": "manual PDF under Catalogs/; mahle-aftermarket.com blocks fetchers; no network used"},
           "extracted": dt.date.today().isoformat(), "count": len(records), "parts": records}
    with open(os.path.join(OUT, "mahle-oe-rings.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "mahle-oe-rings.md"), args.pdf, npages, records, occs, parser, specs,
                fam_by_make, missing_spec, qa, errs)
    by_fam = Counter(r["fit"]["fam"] for r in records)
    print(f"{len(records)} records from {len(occs)} set rows in {len(parser.blocks)} blocks; {len(specs)} listed sets; "
          f"unknown lines {len(parser.unknown)}; QA {len(qa)}; errors {len(errs)}")
    print(f"  US families: {sum(n for f, n in by_fam.items() if f in US_FAMILIES)}; heading-only: {sum(n for f, n in by_fam.items() if f not in US_FAMILIES)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
