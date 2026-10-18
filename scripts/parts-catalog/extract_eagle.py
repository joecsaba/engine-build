#!/usr/bin/env python3
"""Extract Eagle Specialty Products crankshafts, connecting rods and rotating assemblies from the
2024 rev. 4 catalog PDF saved by hand under Catalogs/ (task EAGLE-PDF in CLOUD_TASKS.md; no network).

Layout notes (PDF page = printed page; even page = left of a spread, odd = right):
  - Like the Lunati PDF, every page's text layer carries the whole two-page spread: the left page
    repeats the right page's text at x > 612, the right page repeats the left page's at x < 0.
    Spread tables (rotating assemblies: specs on the left page, kit part numbers on the right) are
    therefore read from the LEFT page's words, which keeps each row on one line; right-page words
    that are not duplicated on the left page (series headings, footnotes) are merged in at x+612.
  - Tables are found from header lines: a key cell (STROKE / LENGTH / ENGINE / APPLICATION /
    DESCRIPTION) followed by header vocabulary.  Several tables can share one line (rod table on the
    left page, crank table on the right), so each table owns an x-range and picks its own cells.
  - Rotating assemblies: `STROKE ROD PISTON [RINGS] <cc>... <bore or oversize>... <kit columns>`.
    Kit columns carry up to four header levels: series (STREET & STRIP / PRO STREET / COMPETITION,
    left-aligned over their span), group headers (balance type, rear seal, reluctor, main size,
    flexplate), UNBALANCED/BALANCED and sub-columns (24t/58t, ROMEO/WINDSOR, 400/350 MAINS ...).
    Kit numbers are root numbers (bore suffix added when ordering); `B` prefix = balanced by Eagle.
  - Cranks: `STROKE [NOTES] BOBWEIGHT [MIN. ROD] [JOURNAL] <PART NO. WT.>...`; the leading digit of
    a domestic part number gives the material (1 cast, 5 forged 4140, 4 forged 4340, 3 billet 4340).
  - Rods: grid tables under a `<journal> JOURNAL` label (`LENGTH NOTES <PART NO. WT.> x4`, columns
    SIR / FSI / CRS 3D / CRS 4D) or engine lists (`ENGINE LENGTH WEIGHT PIN SIZE NOTES PART NUMBER
    [w/ ARP 2000] [EXTREME DUTY]`).

Output: out/eagle.json (shared parts record format) and out/eagle.md (notes).  Writes nothing
outside out/.  Run with `python -X utf8 -I extract_eagle.py [--pdf PATH] [--debug]`.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

import pdfplumber

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "out")
PDF_NAME = ("ACFrOgCQO6X8rCjLnqlbaAuBcHoKeYOowo2zFNkrAXH048tiispxaf26zLoo9EEh8CJtb8Zjdhq1CwnznBj5pc8h6RUHhwHhWw7xv"
            "_MQ6Qvmp08PROhnTSweLqu8BPPnIL8v9_lFA4pBJ1Rek34C.pdf")
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", PDF_NAME)
BRAND = "Eagle"
EDITION = "2024 rev. 4"
DOC = "Eagle Specialty Products catalog 2024 rev. 4 (PDF)"
FILE = "Catalogs/" + PDF_NAME
PAGE_W = 612
FIRST_PAGE, LAST_PAGE = 8, 88          # product pages; 1-7 intro, 89-92 service parts / terms

QA = []            # human-readable QA notes
SKIPPED = Counter()


def qa(msg):
    if msg not in QA:
        QA.append(msg)


# ----------------------------------------------------------------------------- family / page maps

F_SBC = "Small-block Chevy"
F_MK4 = "Chevy Mark IV big block"
F_GEN6 = "Chevy Gen VI big block"
F_W = "Chevy W-series 348/409"
F_LS = "GM LS"
F_SBF = "Small-block Ford (Windsor)"
F_351C = "Ford 351C/351M/400"
F_FE = "Ford FE"
F_BBF = "Ford 429/460"
F_MOD = "Ford Modular"
F_COY = "Ford Coyote"
F_LA = "Mopar LA small block"
F_MAG = "Mopar Magnum 5.2/5.9"
F_BRB = "Mopar B/RB big block"
F_426 = "Chrysler 426 Hemi"
F_HEMI1 = "Chrysler Gen III Hemi 5.7/6.1"
F_HEMI2 = "Chrysler Gen III Hemi 6.2/6.4"
F_PON = "Pontiac V8"
F_OLDS = "Oldsmobile V8"
F_BUICKV6 = "Buick V6 181-252"
F_AMC6 = "AMC/Jeep inline-6"
F_CHEV6 = "Chevy inline-6"

# page -> default family (None = decided per table / per row)
PAGE_FAM = {8: F_BUICKV6, 9: None, 10: F_SBC, 11: F_SBC, 12: F_SBC, 13: F_SBC, 14: F_SBC, 15: F_SBC,
            16: F_SBC, 17: F_SBC, 18: F_SBC, 19: F_SBC, 20: F_SBC, 21: F_SBC, 22: F_SBC, 23: F_SBC,
            24: F_SBC, 25: F_SBC, 26: F_LS, 27: F_LS, 28: F_LS, 29: F_LS, 30: F_LS, 31: F_LS, 32: F_LS,
            33: F_LS, 34: F_LS, 35: F_LS, 36: None, 37: None, 38: None, 39: None, 40: F_MK4, 41: F_MK4,
            42: F_GEN6, 43: F_GEN6, 44: None, 45: None, 46: None, 47: None, 48: None, 49: F_BRB,
            50: F_LA, 51: F_LA, 52: None, 53: None, 54: F_BRB, 55: F_BRB, 56: None, 57: "Ford Flathead 8BA (catalog heading)",
            58: F_MOD, 59: F_MOD, 60: F_COY, 61: F_COY, 62: F_SBF, 63: F_SBF, 64: F_351C, 65: F_351C,
            66: F_SBF, 67: F_SBF, 68: F_BBF, 69: F_BBF, 70: F_FE, 71: F_FE, 72: None, 73: None,
            74: F_AMC6, 75: None, 76: None, 77: None, 78: None, 79: None, 80: F_OLDS, 81: F_OLDS,
            82: F_PON, 83: F_PON, 84: None, 85: None, 86: None, 87: None, 88: None}

KNOWN_FAMS = {F_SBC, F_MK4, F_GEN6, F_W, F_LS, F_SBF, F_351C, F_FE, F_BBF, F_MOD, F_COY, F_LA, F_MAG, F_BRB,
              F_426, F_HEMI1, F_HEMI2, F_PON, F_OLDS, F_BUICKV6, F_AMC6, F_CHEV6}

# cylinders per family (default 8)
CYL = {F_BUICKV6: 6, F_AMC6: 6, F_CHEV6: 6}

# engine-text -> (family, cyl) for list-style tables and import pages
ENGINE_RULES = [
    (r"\b(N54|N55)\b", "BMW N54/N55 (catalog heading)", 6),
    (r"\bM5[24]\b|\bS5[02]\b", "BMW M50/M52/S50/S52 (catalog heading)", 6),
    (r"\bM4[024]\b", "BMW M40/M42/M44 (catalog heading)", 4),
    (r"Northstar|up to 1999", "Cadillac Northstar 4.6 (catalog heading)", 8),
    (r"\bLN2\b", "Chevy 2.2 LN2 (catalog heading)", 4),
    (r"Quad ?4|\bLD9\b|\bLD2\b", "GM Quad 4 (catalog heading)", 4),
    (r"Ecotec", "GM 2.2 Ecotec (catalog heading)", 4),
    (r"4\.3.*V6", "Chevy 4.3 V6 (catalog heading)", 6),
    (r"250 CID I-6", F_CHEV6, 6),
    (r"Neon|^2\.0$", "Chrysler 2.0 Neon (catalog heading)", 4),
    (r"SRT4", "Chrysler 2.4 SRT-4 (catalog heading)", 4),
    (r"8\.0L V10|V10", "Dodge Viper V10 (catalog heading)", 10),
    (r"Pinto", "Ford 2.0 Pinto (catalog heading)", 4),
    (r"Zetec", "Ford Zetec (catalog heading)", 4),
    (r"2\.0 EcoBoost", "Ford 2.0 EcoBoost (catalog heading)", 4),
    (r"2\.3 EcoBoost", "Ford 2.3 EcoBoost (catalog heading)", 4),
    (r"3\.5/3\.7 EcoBoost", "Ford 3.5/3.7 EcoBoost (catalog heading)", 6),
    (r"MZR", "Mazda MZR 2.3 (catalog heading)", 4),
    (r"Duratec", "Ford 2.3 Duratec (catalog heading)", 4),
    (r"\bB6\b|\bBP\b|Miata", "Mazda B6/BP Miata (catalog heading)", 4),
    (r"D16|\bZC\b", "Honda D-series (catalog heading)", 4),
    (r"B16|B18|B20|long.? LS rod|special", "Honda B-series (catalog heading)", 4),
    (r"F2[02]C?|H2[23]", "Honda F/H-series (catalog heading)", 4),
    (r"K2[04]", "Honda K-series (catalog heading)", 4),
    (r"420A", "Chrysler/Mitsubishi 420A (catalog heading)", 4),
    (r"4G6[34]", "Mitsubishi 4G63/4G64 (catalog heading)", 4),
    (r"4B11", "Mitsubishi 4B11T (catalog heading)", 4),
    (r"RB2[56]", "Nissan RB25/RB26 (catalog heading)", 6),
    (r"CA18", "Nissan CA18 (catalog heading)", 4),
    (r"SR20", "Nissan SR20 (catalog heading)", 4),
    (r"VQ3[57]", "Nissan VQ35/VQ37 (catalog heading)", 6),
    (r"VG30", "Nissan VG30 (catalog heading)", 6),
    (r"KA24", "Nissan KA24 (catalog heading)", 4),
    (r"FA20|4UGSE|86GT|FR-S|BRZ", "Subaru FA20 / Toyota 4U-GSE (catalog heading)", 4),
    (r"\bEJ", "Subaru EJ20/EJ25 (catalog heading)", 4),
    (r"3TC|2TG", "Toyota 3T-C/2T-G (catalog heading)", 4),
    (r"2RZ", "Toyota 2RZ (catalog heading)", 4),
    (r"3SGTE", "Toyota 3S-GTE (catalog heading)", 4),
    (r"2JZ", "Toyota 2JZ (catalog heading)", 6),
    (r"1UZ", "Toyota 1UZ-FE (catalog heading)", 8),
    (r"7MGTE", "Toyota 7M-GTE (catalog heading)", 6),
    (r"ABA|ABF", "VW 2.0 ABA/ABF (catalog heading)", 4),
    (r"1\.8T|2\.0T", "VW/Audi 1.8T/2.0T (catalog heading)", 4),
    (r"VR6", "VW VR6 (catalog heading)", 6),
    (r"Jeep|^4\.[02]\b", F_AMC6, 6),
    (r"3\.8L V6|Buick", F_BUICKV6, 6),
]


def engine_family(text):
    """Family and cylinder count for an ENGINE/APPLICATION cell (import pages)."""
    for pat, fam, cyl in ENGINE_RULES:
        if re.search(pat, text, re.I):
            return fam, cyl
    return None, None


def fam_cyl(fam):
    if fam in CYL:
        return CYL[fam]
    for pat, f, cyl in ENGINE_RULES:
        if f == fam:
            return cyl
    return 8


# ----------------------------------------------------------------------------- pdf words -> spread lines

HEADER_KEYS = {"STROKE", "LENGTH", "ENGINE", "APPLICATION", "DESCRIPTION"}
SPEC_HEADERS = {"NOTES", "BOBWEIGHT", "BOBWT", "MIN. ROD", "MIN. ROD LENGTH", "WT", "WEIGHT", "ROD JOURNAL",
                "JOURNAL", "BALANCE", "PIN", "PIN SIZE", "ROD", "PISTON", "RINGS", "HEIGHT", "ROD WIDTH", "C/R",
                "C / R", "OD", "ID"}
PN_HEADER_RE = re.compile(r"PART|P/N|w/ ?ARP|EXTREME DUTY|LIGHTWEIGHT|RELUCTOR|MAINS?$|REAR SEAL|BALANCED|UNBAL|BAL\.|"
                          r"FLANGE|ROMEO|WINDSOR|flexplate|flywheel|^\d\d ?t\b|LONG SNOUT", re.I)
DESCRIPTIVE_RE = re.compile(r"Recommended|competition use|engines|available|upgrades|pump-gas|street vehicles|balancing|"
                            r"Order by|aspirated|include|Compression|calculated|Standard bore|Unbalanced assemblies|"
                            r"Designed for|crankshaft|rod bolts|pistons|bearings|Forged|Billet|heads \(|work with|"
                            r"photo|owner|shown|Eagle|\bis\b|\bthe\b", re.I)


def norm_header(t):
    t = t.strip().rstrip(".").upper().replace("  ", " ").replace("MIN .ROD", "MIN. ROD")
    return t


def page_words(page):
    return page.extract_words(keep_blank_chars=False, x_tolerance=1.5, y_tolerance=2)


def build_spread(pdf, lp):
    """Words of spread (left page lp, right page lp+1) in spread coordinates (0..1224)."""
    L = page_words(pdf.pages[lp - 1])
    R = page_words(pdf.pages[lp]) if lp < len(pdf.pages) else []
    out = [dict(text=w["text"], x0=w["x0"], x1=w["x1"], top=w["top"], src="L") for w in L if w["x0"] > -1]
    for w in R:
        if w["x0"] < -1:
            continue
        x0, x1 = w["x0"] + PAGE_W, w["x1"] + PAGE_W
        dup = any(abs(o["x0"] - x0) < 3 and abs(o["top"] - w["top"]) < 5 and o["text"] == w["text"] for o in out)
        if not dup:
            out.append(dict(text=w["text"], x0=x0, x1=x1, top=w["top"], src="R"))
    out.sort(key=lambda w: (w["top"], w["x0"]))
    # fragments: words within 2 pt of the previous word; then merge adjacent fragments (<= 4.5 pt apart,
    # <= 7 pt from the line start) when they do not overlap horizontally (split rows, offset text frames)
    frags = []
    for w in out:
        if frags and w["top"] - frags[-1][-1]["top"] <= 2.0:
            frags[-1].append(w)
        else:
            frags.append([w])
    lines = []
    for fr in frags:
        if lines:
            last = lines[-1]
            if fr[0]["top"] - last["last_top"] <= 4.5 and fr[0]["top"] - last["top"] <= 7.0:
                overlap = any(a["x0"] < b["x1"] + 1 and b["x0"] < a["x1"] + 1 for a in fr for b in last["words"])
                if not overlap:
                    last["words"].extend(fr)
                    last["last_top"] = fr[0]["top"]
                    continue
        lines.append({"top": fr[0]["top"], "last_top": fr[0]["top"], "words": list(fr)})
    for ln in lines:
        ws = sorted(ln["words"], key=lambda w: w["x0"])
        cells = []
        for w in ws:
            if cells and w["x0"] - cells[-1]["x1"] < 6 and w["src"] == cells[-1]["src"]:
                cells[-1]["text"] += " " + w["text"]
                cells[-1]["x1"] = w["x1"]
                cells[-1]["words"].append(w)
            else:
                cells.append(dict(text=w["text"], x0=w["x0"], x1=w["x1"], top=ln["top"], src=w["src"], words=[w]))
        for c in cells:
            c["cx"] = (c["x0"] + c["x1"]) / 2
        ln["cells"] = cells
    return lines


# ----------------------------------------------------------------------------- helpers

NUM_IN_RE = re.compile(r"^(\d\.\d{2,4})”?\*?$")
MM_RE = re.compile(r"^(\d{2,3}(?:\.\d)?)mm$")
PN_RE = re.compile(r"^[A-Z]{0,3}\d[0-9A-Z\-]{3,}[\*\^]*$")


def num(s):
    """Decimal inch value from '3.750”' / '4.625' / '.927”' / '2.1”'; None if not numeric."""
    if s is None:
        return None
    s = s.strip().replace("”", "").replace('"', "").replace("*", "").replace("^", "")
    if re.fullmatch(r"-?\d*\.\d+|\d+", s):
        return float(s)
    return None


def r3(x):
    return None if x is None else round(x + 1e-9, 4)


def is_atomic(tok):
    return bool(re.fullmatch(r"[A-Z0-9][A-Z0-9.\-*^/+”]*", tok))


def clean(s):
    return re.sub(r"\s+", " ", s.replace("”", '"').replace("“", '"').replace("’", "'")).strip()


def in_range(cell, x0, x1):
    return cell["cx"] >= x0 and cell["cx"] < x1


# ----------------------------------------------------------------------------- table detection

class Table:
    def __init__(self, page, line, key_cell, cells, x0, x1):
        self.page = page
        self.top = line["top"]
        self.key = norm_header(key_cell["text"])
        self.cells = cells                 # header cells in range (incl. key)
        self.x0, self.x1 = x0, x1
        self.cols = []
        for c in cells:
            t = norm_header(c["text"])
            if t in HEADER_KEYS:
                kind = "key"
            elif re.fullmatch(r"\d+(\.\d+)?CC", t):
                kind = "cc"
            elif re.fullmatch(r"\d{3}", t) or re.fullmatch(r"\d\.\d{3}", t) or re.fullmatch(r"\d{2,3}\.\d{1,2}", t):
                kind = "bore"
            elif t in SPEC_HEADERS or t.startswith("MIN. ROD"):
                kind = "spec"
            else:
                kind = "pn"
            self.cols.append(dict(text=c["text"], norm=t, kind=kind, cx=c["cx"], x0=c["x0"], x1=c["x1"]))
        names = {c["norm"] for c in self.cols}
        if "PISTON" in names:
            self.type = "ra"
        elif self.key == "STROKE" or ("STROKE" in names and self.key == "ENGINE"):
            self.type = "crank"
        elif self.key == "LENGTH" or "LENGTH" in names:
            self.type = "rod"
        else:
            self.type = None
        self.rows = []
        self.notes_lines = []      # text lines (cells) above the table, same half
        self.title = None
        self.bottom = None

    def col(self, *names):
        for c in self.cols:
            if c["norm"] in names:
                return c
        return None

    def cols_of(self, *names):
        return [c for c in self.cols if c["norm"] in names]


def find_tables(page, lines):
    tables = []
    for li, ln in enumerate(lines):
        cells = ln["cells"]
        keys = [c for c in cells if norm_header(c["text"]) in HEADER_KEYS and c["text"].isupper()]
        if not keys:
            continue
        vocab = [c for c in cells if norm_header(c["text"]) in SPEC_HEADERS or PN_HEADER_RE.search(c["text"])
                 or norm_header(c["text"]).startswith("MIN. ROD")]
        if len(vocab) < 2:
            continue
        # split the line into tables: a key starts a new table when a PART/WT cell was seen since the last key
        starts = []
        seen_pn = False
        prev_key = None
        for c in cells:
            t = norm_header(c["text"])
            if t in HEADER_KEYS and c["text"].isupper() and (prev_key is None or seen_pn):
                starts.append(c)
                seen_pn = False
                prev_key = c
            elif t in HEADER_KEYS and c["text"].isupper():
                continue
            elif PN_HEADER_RE.search(c["text"]) or t in ("WT", "WEIGHT"):
                seen_pn = True
        for i, kc in enumerate(starts):
            x0 = kc["x0"] - 10
            x1 = starts[i + 1]["x0"] - 10 if i + 1 < len(starts) else 1300
            hdr_cells = []
            for c in cells:
                if c["x0"] < x0 - 1 or c["x0"] >= x1:
                    continue
                if c is not kc and (re.match(r"^\d\.\d{3}”(?!\s+[A-Z])", c["text"]) or re.match(r"^\d{5,}", c["text"])
                                    or c["text"] in ("-", "--") or c["x0"] > 1195 or re.fullmatch(r"\d{4}", c["text"])
                                    or (re.search(r"[a-z]", c["text"]) and not PN_HEADER_RE.search(c["text"])
                                        and not re.fullmatch(r"\d+(\.\d+)?cc", c["text"])
                                        and norm_header(c["text"]) not in SPEC_HEADERS)):
                    x1 = min(x1, c["x0"] - 5)
                    break
                hdr_cells.append(c)
            if kc["x0"] < PAGE_W and not any(norm_header(c["text"]) == "PISTON" for c in hdr_cells if c["x0"] < PAGE_W):
                x1 = min(x1, PAGE_W)
                hdr_cells = [c for c in hdr_cells if c["x0"] < PAGE_W]
            if hdr_cells:
                x1 = min(x1, max(c["x1"] for c in hdr_cells) + 80)
            # bushing / sleeve service tables: LENGTH preceded by OD
            left = [norm_header(c["text"]) for c in cells if c["x1"] <= kc["x0"] and c["x1"] > kc["x0"] - 80]
            if "OD" in left or "ID" in left:
                continue
            t = Table(page, ln, kc, hdr_cells, x0, x1)
            if t.type is None:
                continue
            t.line_index = li
            tables.append(t)
    # table bottoms: next table whose x-range overlaps, further down
    for t in tables:
        later = [u for u in tables if u.top > t.top + 5 and not (u.x1 <= t.x0 or u.x0 >= t.x1)]
        t.bottom = min(u.top for u in later) - 1 if later else 10_000
    return tables


def assign_rows(table, lines):
    """Attach data lines (cells inside the table's x-range) to the table."""
    key_col = table.col(table.key)
    for ln in lines:
        if ln["top"] <= table.top + 4 or ln["top"] >= table.bottom:
            continue
        cells = [c for c in ln["cells"] if in_range(c, table.x0, table.x1) and c["x1"] > key_col["x0"] - 4]
        if not cells:
            continue
        table.rows.append(dict(top=ln["top"], cells=cells))


def nearest_col(table, cell, kinds=None):
    best, bd = None, 1e9
    for c in table.cols:
        if kinds and c["kind"] not in kinds:
            continue
        d = abs(c["cx"] - cell["cx"])
        if d < bd:
            best, bd = c, d
    return best, bd


def split_atomic(cell):
    """Split a merged cell such as 'SIR5400CB 525' or 'CRS5780F3D CRS5780F3D2000' into word cells."""
    toks = cell["text"].split(" ")
    if len(toks) < 2 or not all(is_atomic(t) for t in toks):
        return [cell]
    outc = []
    for w in cell["words"]:
        outc.append(dict(text=w["text"], x0=w["x0"], x1=w["x1"], cx=(w["x0"] + w["x1"]) / 2, top=cell["top"],
                         src=cell["src"], words=[w]))
    return outc


def map_cells(table, cells, kit_x0=None):
    """Map data cells to columns -> dict norm_header -> [cells].  Cells right of kit_x0 are returned apart."""
    bycol = defaultdict(list)
    kit = []
    for c in cells:
        if kit_x0 is not None and c["cx"] >= kit_x0:
            if c["cx"] < 1180:
                kit.extend(split_atomic(c))
            continue
        parts = [c]
        if " " in c["text"] and all(is_atomic(t) for t in c["text"].split(" ")):
            parts = split_atomic(c)
            # keep merged if all parts land in the same column
            cols = {nearest_col(table, p)[0]["cx"] for p in parts}
            if len(cols) == 1:
                parts = [c]
        for p in parts:
            col, d = nearest_col(table, p)
            if col is None:
                continue
            bycol[col["cx"]].append(p)
    return bycol, kit


def col_cells(bycol, col):
    return bycol.get(col["cx"], []) if col else []


def first_text(bycol, col):
    cs = col_cells(bycol, col)
    return cs[0]["text"] if cs else None


# ----------------------------------------------------------------------------- context text around tables

def context_lines(lines, table, above=260):
    """Text cells above the table header in its half of the spread (same side), newest first."""
    side_x0 = 0 if table.x0 < PAGE_W else PAGE_W
    side_x1 = PAGE_W if table.x0 < PAGE_W else 1300
    out = []
    for ln in lines:
        if ln["top"] >= table.top or ln["top"] < table.top - above:
            continue
        for c in ln["cells"]:
            if c["cx"] >= side_x0 and c["cx"] < side_x1 and c["x1"] > table.x0 - 40 and c["x0"] < table.x1 + 40:
                out.append((ln["top"], c))
    out.sort(key=lambda t: -t[0])
    return out


def footnotes(lines, table):
    """Footnote cells (* / ^ / ** ...) below the table header within its range."""
    out = []
    for ln in lines:
        if ln["top"] <= table.top or ln["top"] > table.bottom + 120:
            continue
        for c in ln["cells"]:
            if c["x1"] > table.x0 - 20 and c["x0"] < table.x1 + 20 and re.match(r"^[\*\^]+ ?\S", c["text"]):
                out.append(c["text"])
    return out


def series_lines(lines):
    """Lines holding kit series headings."""
    out = []
    for ln in lines:
        ser = [c for c in ln["cells"] if clean(c["text"]).upper() in ("STREET & STRIP", "PRO STREET", "COMPETITION")]
        if ser:
            out.append((ln["top"], ser))
    return out


# ----------------------------------------------------------------------------- parsing: pistons

BRANDS = ["SRP Pro", "Speed Pro", "Silv-O-Lite", "Race Tech", "KB Claimer", "ProTru", "Wiseco", "Diamond", "Arias",
          "Mahle", "Icon", "Ross", "Traum", "DSS", "JE", "CP", "SRP", "KB"]


def parse_piston(text):
    """'2618 JE -20cc F/I inv. dome' -> dict(brand, alloy, domeCc, top, flags, desc)."""
    t = clean(text).rstrip("*").strip()
    d = {"pistonDesc": t}
    if t.lower() == "none":
        return {"pistonsIncluded": False}
    low = t.lower()
    if re.search(r"\b2618\b", t):
        d["pistonAlloy"] = "2618"
    elif re.search(r"\b4032\b", t):
        d["pistonAlloy"] = "4032"
    elif re.search(r"hyper", low):
        d["pistonAlloy"] = "hypereutectic"
    elif re.search(r"\bcast\b", low):
        d["pistonAlloy"] = "cast"
    elif "M142P" in t:
        d["pistonAlloy"] = "M142P"
    for b in BRANDS:
        if re.search(r"(?<![A-Za-z])" + re.escape(b) + r"(?![A-Za-z])", t, re.I):
            d["pistonBrand"] = b
            break
    if "claimer" in low and "pistonBrand" not in d:
        d["pistonBrand"] = "KB"
    m = re.search(r"([+-]?)\s?(\d+(?:\.\d+)?)\s*(?:/\s*[+-]?\d+(?:\.\d+)?)?\s*cc", t)
    if not m:
        m = re.search(r"([+-])(\d+(?:\.\d+)?)\b(?!\.\d)", t)
    if m:
        v = float(m.group(2))
        sign = m.group(1)
        if sign == "-":
            v = -v
        elif sign != "+" and re.search(r"inv\.? ?dome|dish", low):
            v = -v
        d["domeCc"] = v
    mh = re.search(r"\+?(\.\d{3})”? dome", t)
    if mh:
        d["domeHeight"] = float(mh.group(1))
    if re.search(r"inv\.? ?dome|dish", low):
        d["pistonTop"] = "dish"
    elif re.search(r"flat", low):
        d["pistonTop"] = "flat"
    elif re.search(r"dome", low):
        d["pistonTop"] = "dome"
    flags = []
    if re.search(r"F\.?/?I\.?\b", t):
        flags.append("forced induction")
    if re.search(r"heavy duty|H\.D\.", t, re.I):
        flags.append("heavy duty")
    if re.search(r"gas port", low):
        flags.append("gas ported")
    if "nitrous" in low:
        flags.append("nitrous")
    if "twisted wedge" in low:
        flags.append("Twisted Wedge")
    if "9310 pin" in low:
        flags.append("9310 pin")
    if "closed chamber" in low:
        flags.append("closed chamber")
    if "open chamber" in low:
        flags.append("open chamber")
    if flags:
        d["pistonFlags"] = flags
    return d


# ----------------------------------------------------------------------------- parsing: text statements

def parse_std_bore(texts):
    """Standard bore statements -> list of (label, bore_in, bore_mm)."""
    out = []
    for t in texts:
        tt = clean(t)
        for m in re.finditer(r"Standard bore(?: size)?(?: is|:)?\s*(\d\.\d{3})\"(?:\s*\(([^)]+)\))?", tt, re.I):
            out.append((m.group(2), float(m.group(1)), None))
        for m in re.finditer(r"(\d\.\d{3})\" standard bore", tt, re.I):
            out.append((None, float(m.group(1)), None))
        for m in re.finditer(r"Standard bore(?: size)?(?: is|:)?\s*(\d{2,3}(?:\.\d)?)mm", tt, re.I):
            out.append((None, round(float(m.group(1)) / 25.4, 4), float(m.group(1))))
        for m in re.finditer(r"(\d{2,3}(?:\.\d)?)mm STANDARD BORE", tt):
            out.append((None, round(float(m.group(1)) / 25.4, 4), float(m.group(1))))
    return out


def parse_cr_basis(texts):
    d = {}
    for t in texts:
        tt = clean(t)
        if not re.search(r"compression", tt, re.I):
            continue
        m = re.search(r"(\d\.\d{3})\"? bore", tt)
        if m:
            d["crBore"] = float(m.group(1))
        m = re.search(r"(\.\d{3})\"? (?:head )?gasket", tt)
        if m:
            d["crGasket"] = float(m.group(1))
        m = re.search(r"(\d{1,2}\.\d{3})\" (?:deck|block) height", tt)
        if m:
            d["crDeckHeight"] = float(m.group(1))
    return d


# ----------------------------------------------------------------------------- rotating assemblies

SERIES_MAT = {"STREET & STRIP": "cast steel", "PRO STREET": "forged 4140", "COMPETITION": "forged 4340"}


def parse_tokens(tokens, spec, fit_notes):
    """Kit column header tokens -> spec keys."""
    for tok in tokens:
        t = clean(tok)
        u = t.upper()
        if u in ("UNBALANCED", "BALANCED", "UNBAL."):
            continue
        m = re.match(r"^(\d\d) ?t(?:\s*\+\s*LONG SNOUT)?$", t)
        if m:
            spec["reluctor"] = int(m.group(1))
            if "LONG SNOUT" in u:
                spec["snout"] = "long"
            continue
        m = re.match(r"^(\d\d) tooth reluctor \(([^)]+)\)", t)
        if m:
            spec["reluctor"] = int(m.group(1))
            fit_notes.append("reluctor years " + m.group(2))
            continue
        if "REAR SEAL" in u:
            spec["rearSeal"] = "1-pc" if u.startswith("1") else "2-pc"
            continue
        if u in ("EXTERNAL BALANCE", "EXTERNAL BAL."):
            spec["balance"] = "external"
            continue
        if u in ("INTERNAL BALANCE", "INTERNAL BAL."):
            spec["balance"] = "internal"
            continue
        if "INT/EXT" in u:
            spec["balance"] = "internal front / external rear (LT1)"
            continue
        m = re.match(r"^(\d{3}) MAINS$", u)
        if m:
            spec["mainSize"] = m.group(1)
            continue
        m = re.match(r'^(\d(?:\.\d+)?)" MAIN$', t)
        if m:
            spec["mainJournal"] = float(m.group(1))
            continue
        if u in ("ROMEO", "WINDSOR"):
            spec["block"] = t.title()
            continue
        m = re.match(r"^(\d) BOLT FLANGE$", u)
        if m:
            spec["flywheelBolts"] = int(m.group(1))
            continue
        m = re.match(r"^(\d/\d+)\" ARP (\w+) BOLTS$", t)
        if m:
            spec["rodBolt"] = m.group(1) + '" ARP ' + m.group(2)
            continue
        m = re.match(r"^(\d{3})g ROD WEIGHT$", t)
        if m:
            spec["rodWeight"] = int(m.group(1))
            continue
        if "GEN 1 & 2" in u:
            fit_notes.append("Coyote Gen 1-2 (2011-2017)")
            continue
        if "GEN 3" in u:
            fit_notes.append("Coyote Gen 3 (2018 & up), 3.700 bore only")
            continue
        if re.search(r"BOLT", u) and re.search(r"\d\d-\d\d|& up", t):
            fit_notes.append(t)
            continue
        if "TALL DECK" in u or "STANDARD DECK" in u:
            spec["deck"] = t
            continue
        fit_notes.append(t)


def extract_ra(table, lines, page, ctx):
    recs = []
    cols = table.cols
    # kit area starts at the first pn-kind header right of the last cc/bore column
    spec_kinds = [i for i, c in enumerate(cols) if c["kind"] in ("cc", "bore")]
    last_spec = max(spec_kinds) if spec_kinds else -1
    pn_cols = [c for i, c in enumerate(cols) if c["kind"] == "pn" and i > last_spec]
    if not pn_cols:
        SKIPPED["ra table without kit columns p%d" % page] += 1
        return recs
    kit_x0 = pn_cols[0]["x0"] - 10
    # header levels above the column header (between series line and header), restricted to kit area
    ser = [s for s in series_lines(lines) if s[0] < table.top and s[0] > table.top - 200]
    ser_top = max(s[0] for s in ser) if ser else table.top - 60
    series_cells = []
    if ser:
        series_cells = [c for c in max(ser, key=lambda s: s[0])[1]]
    levels = []
    for ln in lines:
        if ln["top"] <= ser_top or ln["top"] > table.top + 1:
            continue
        lv = [c for c in ln["cells"] if c["x1"] > kit_x0 - 20 and len(c["text"]) < 48
              and not DESCRIPTIVE_RE.search(c["text"]) and not re.fullmatch(r"[A-Z]{1,3}|\d{3}", c["text"])]
        lv = [c for c in lv if norm_header(c["text"]) not in HEADER_KEYS]
        if lv:
            levels.append(lv)
    # context statements
    texts = [c["text"] for _, c in ctx]
    std_bores = parse_std_bore(texts)
    # a sub-heading on the group line left of the first cc column (e.g. '318 block, 3.910" standard bore', '5.7L')
    subhead = None
    for top, c in ctx:
        if top > table.top - 30 and c["x0"] < table.x0 + 60 and c["cx"] < (cols[0]["cx"] + 150) and \
                3 < len(c["text"]) < 46 and not c["text"].endswith(",") and not DESCRIPTIVE_RE.search(c["text"]) and \
                not re.search(r"COMPRESSION|DISPLAC|ASSEMBLY|^C/R|BALANCE|WEIGHT|DECK$", c["text"]):
            subhead = clean(c["text"])
            break
    if subhead:
        std_bores = parse_std_bore([subhead]) + std_bores
    crb = parse_cr_basis(texts)
    title = None
    for top, c in ctx:
        if re.search(r"ASSEMBLIES", c["text"]) and c["text"].isupper():
            title = clean(c["text"])
            break
    desc_text = " ".join(clean(c["text"]) for top, c in ctx if top > table.top - 200)
    foot = footnotes(lines, table)
    fam_default = PAGE_FAM.get(page)
    cc_cols = [c for c in cols if c["kind"] == "cc"]
    bore_cols = [c for c in cols if c["kind"] == "bore"]
    cr_col = table.col("C/R", "C / R")
    stroke_col = table.col("STROKE")
    rod_col = table.col("ROD")
    piston_cols = table.cols_of("PISTON")
    rings_col = table.col("RINGS")
    height_col = table.col("HEIGHT")
    pin_col = table.col("PIN")
    metric = any(re.fullmatch(r"\d{2,3}\.\d{1,2}", c["norm"]) for c in bore_cols)

    for row in table.rows:
        bycol, kit = map_cells(table, row["cells"], kit_x0)
        stroke_t = first_text(bycol, stroke_col)
        if not stroke_t:
            continue
        stroke_in, stroke_mm = None, None
        if MM_RE.match(stroke_t):
            stroke_mm = float(MM_RE.match(stroke_t).group(1))
            stroke_in = round(stroke_mm / 25.4, 4)
        else:
            stroke_in = num(stroke_t)
        if stroke_in is None or stroke_in > 8:
            continue
        rod_t = first_text(bycol, rod_col) or ""
        rod_len = num(rod_t.split(" ")[0]) if rod_t else None
        rod_note = clean(" ".join(rod_t.split(" ")[1:])).strip(", ") if rod_t else ""
        pcells = col_cells(bycol, piston_cols[0]) if piston_cols else []
        piston = clean(" ".join(c["text"] for c in sorted(pcells, key=lambda c: (c["top"], c["x0"]))))
        if not piston and not kit:
            continue
        spec = OrderedDict()
        fit_notes = []
        spec["stroke"] = r3(stroke_in)
        if stroke_mm:
            spec["strokeMm"] = stroke_mm
        if rod_len:
            spec["rodLength"] = r3(rod_len)
        if rod_note:
            if re.search(r"ARP", rod_note):
                spec["rodBolt"] = "ARP " + re.sub(r".*ARP ?", "", rod_note)
            if re.search(r"XD", rod_note):
                spec["rodSeries"] = "Extreme Duty"
            if re.search(r"H-Beam|\bH$", rod_note):
                spec["rodBeam"] = "H"
            if "press-fit" in rod_note:
                spec["pinType"] = "press-fit"
            if "extreme stroke" in rod_note:
                spec["rodSeries"] = "Extreme Stroker"
            spec["rodNotes"] = rod_note
        if height_col:
            h = num(first_text(bycol, height_col))
            if h:
                spec["assemblyHeight"] = r3(h)
        pd = parse_piston(piston) if piston else {}
        spec.update(pd)
        if len(piston_cols) > 1:
            w = first_text(bycol, piston_cols[1])
            if w and re.fullmatch(r"\d{3}g", w):
                spec["pistonWeight"] = int(w[:-1])
        if pin_col:
            w = first_text(bycol, pin_col)
            if w and re.fullmatch(r"\d{2,3}g", w):
                spec["pinWeight"] = int(w[:-1])
        if rings_col:
            rg = first_text(bycol, rings_col)
            if rg:
                spec["rings"] = {"FF": "file fit", "std": "standard gap"}.get(rg, clean(rg))
        # compression ratios
        cr = OrderedDict()
        for c in cc_cols:
            v = num(first_text(bycol, c))
            if v is not None:
                cr[c["norm"].replace("CC", "").rstrip(".")] = v
        if cr:
            spec["cr"] = cr
            spec.update(crb)
        elif cr_col:
            v = num(first_text(bycol, cr_col))
            if v is not None:
                spec["crNominal"] = v
                spec.update(crb)
        # bores / displacement
        bores = []
        cis = []
        ccs = []
        avail = []
        for c in bore_cols:
            t = first_text(bycol, c)
            if not t or t in ("-", "--", "n/a", "illegal"):
                continue
            tv = num(t.rstrip("*"))
            if tv is None or tv < 100:
                if t and re.search(r"\d\.\d{3}", t):
                    fit_notes.append("bore column %s: %s" % (c["norm"], clean(t)))
                continue
            avail.append((c["norm"], tv))
        cyl = fam_cyl(ra_family(page, title, subhead, {}, [], quiet=True)[0])
        for label, tv in avail:
            if metric:
                ccs.append(int(tv))
                cis.append(int(round(tv / 16.387)))
            else:
                cis.append(int(round(tv)))
        # per-column bore in inches
        std_candidates = [b for (lab, b, mm) in std_bores]
        subfam = None
        os_avail = [(lab, tv) for lab, tv in avail if re.fullmatch(r"\d{3}", lab)]
        act_avail = [(lab, tv) for lab, tv in avail if not re.fullmatch(r"\d{3}", lab)]
        oversize = bool(os_avail)
        if oversize:
            avail = os_avail
            def pred_err(std):
                err = 0
                for lab, tv in avail:
                    b = std + int(lab) / 1000.0
                    ci_c = cyl * math.pi / 4 * b * b * stroke_in
                    ci_l = tv if not metric else tv / 16.387
                    err += abs(ci_c - ci_l) / ci_l
                return err / len(avail)
            best = None
            if std_candidates:
                best = min(std_candidates, key=pred_err)
                if pred_err(best) > 0.015:
                    # derive from the displacement numbers instead
                    best = None
            if best is None:
                ests = []
                for lab, tv in avail:
                    ci_l = tv if not metric else tv / 16.387
                    b = math.sqrt(ci_l / (cyl * math.pi / 4 * stroke_in))
                    ests.append(b - int(lab) / 1000.0)
                best = round(sum(ests) / len(ests) / 0.005) * 0.005
                if std_candidates:
                    fit_notes.append("standard bore derived from displacement (page states %s)" %
                                     "/".join("%.3f" % s for s in std_candidates))
                else:
                    fit_notes.append("standard bore derived from displacement")
            for lab, tv in avail:
                bores.append(OrderedDict(bore=r3(best + int(lab) / 1000.0), ci=int(round(tv)), oversize=lab))
            for lab, tv in act_avail:
                bores.append(OrderedDict(bore=float(lab), ci=int(round(tv))))
            spec["bore"] = r3(best)
        else:
            for lab, tv in act_avail:
                b = float(lab)
                if metric:
                    bores.append(OrderedDict(bore=r3(b / 25.4), boreMm=b, cc=int(tv), ci=int(round(tv / 16.387))))
                else:
                    bores.append(OrderedDict(bore=b, ci=int(round(tv))))
            if std_bores:
                spec["bore"] = r3(std_bores[0][1])
                if std_bores[0][2]:
                    spec["boreMm"] = std_bores[0][2]
            elif bores:
                spec["bore"] = bores[0]["bore"]
        if bores:
            spec["boreOptions"] = bores
            # displacement sanity check
            for b in bores:
                ci_c = cyl * math.pi / 4 * b["bore"] ** 2 * stroke_in
                if abs(ci_c - b["ci"]) / b["ci"] > 0.02:
                    qa("p%d kit %s: listed %d ci vs computed %.0f at %.3f bore x %.3f stroke (%d cyl)" %
                       (page, piston[:30], b["ci"], ci_c, b["bore"], stroke_in, cyl))
                    break
        # kit cells -> records
        kcells = []
        for kc in kit:
            t = kc["text"].strip()
            if t in ("-", "--", "n/a", "") or not PN_RE.match(t.replace("*", "").replace("^", "")):
                if t not in ("-", "--"):
                    SKIPPED["kit cell not a part number: %s (p%d)" % (t, page)] += 1
                continue
            marks = "".join(ch for ch in t if ch in "*^")
            pn = t.replace("*", "").replace("^", "")
            # series: right-most series heading whose x0 <= cell x0 + 12
            series = None
            for sc in sorted(series_cells, key=lambda c: c["x0"]):
                if sc["x0"] <= kc["x0"] + 12:
                    series = clean(sc["text"]).upper()
            tokens = []
            for lv in levels:
                hit = None
                for c in lv:
                    if c["x0"] - 12 <= kc["cx"] <= c["x1"] + 12:
                        hit = c
                        break
                if hit is None:
                    near = min(lv, key=lambda c: abs(c["cx"] - kc["cx"]))
                    if abs(near["cx"] - kc["cx"]) <= 45:
                        hit = near
                if hit is not None:
                    tokens.append(clean(hit["text"]))
            kcells.append(dict(pn=pn, marks=marks, series=series, tokens=tokens, x0=kc["x0"], cx=kc["cx"],
                               balanced=pn.startswith("B") and len(pn) > 4,
                               key=tuple(tk for tk in tokens if tk.upper() not in ("UNBALANCED", "BALANCED", "UNBAL."))))
        kcells.sort(key=lambda k: k["x0"])
        # pair balanced with unbalanced
        groups = []
        for k in kcells:
            if not k["balanced"]:
                groups.append(dict(base=k, bal=[]))
                continue
            based = [g for g in groups if g["base"] is not None]
            cand = [g for g in based if g["base"]["series"] == k["series"] and g["base"]["key"] == k["key"]
                    and g["base"]["x0"] < k["x0"] and not g["bal"]]
            if not cand:
                cand = [g for g in based if g["base"]["series"] == k["series"] and g["base"]["x0"] < k["x0"]]
            if cand:
                cand[-1]["bal"].append(k)
            else:
                groups.append(dict(base=None, bal=[k]))
        for g in groups:
            base = g["base"] or g["bal"][0]
            rec_spec = OrderedDict(spec)
            notes = list(fit_notes)
            series = base["series"]
            if series:
                rec_spec["series"] = series.title()
            elif re.search(r"IMCA", desc_text):
                rec_spec["series"] = "IMCA RaceSaver"
            parse_tokens(base["tokens"], rec_spec, notes)
            if g["base"] is None:
                rec_spec["balanced"] = True
            else:
                rec_spec["balanced"] = False
                bal = g["bal"]
                if len(bal) == 1:
                    rec_spec["balancedPn"] = bal[0]["pn"]
                elif bal:
                    rec_spec["balancedPns"] = OrderedDict((" ".join(b["key"]) or "balanced", b["pn"]) for b in bal)
            # crank / rod facts from the series and the table description
            mat = SERIES_MAT.get(series)
            single_series = len({k["series"] for k in kcells}) <= 1
            if single_series or not series:
                if re.search(r"Billet 4340 steel crankshaft", desc_text, re.I):
                    mat = "billet 4340"
                elif re.search(r"Forged 4340 steel crankshaft", desc_text, re.I):
                    mat = "forged 4340"
                elif re.search(r"Cast (steel )?crank", desc_text, re.I):
                    mat = "cast steel"
                m = re.search(r"Forged (\d{4}) steel ([HI])-Beam rods(?: with (\d/\d+\" ARP \d+))?", desc_text, re.I)
                if m:
                    rec_spec["rodMaterial"] = "forged " + m.group(1)
                    rec_spec["rodBeam"] = m.group(2).upper()
                    if m.group(3):
                        rec_spec.setdefault("rodBolt", m.group(3))
                if re.search(r"IMCA-legal crankshaft", desc_text):
                    notes.append("IMCA RaceSaver 305 kit")
            if base["marks"] and foot:
                for f in foot:
                    if f.startswith(base["marks"][0]):
                        ft = clean(f.lstrip("*^ "))
                        if re.search(r"4340 crank", ft):
                            mat = "forged 4340"
                        notes.append(ft)
            if mat:
                rec_spec["crankMaterial"] = mat
            if "balance" not in rec_spec:
                if re.search(r"Designed for internal balance|internal balance only", desc_text, re.I):
                    rec_spec["balance"] = "internal"
                elif re.search(r"Cast cranks? (?:are )?designed for 28 ?in-oz", desc_text, re.I):
                    if mat == "cast steel":
                        rec_spec["balance"] = "external 28 oz-in"
                    elif mat:
                        rec_spec["balance"] = "internal"
            if re.search(r"racing bearings|performance bearings", desc_text, re.I) or mat != "cast steel":
                pass
            rec_spec["bearingsIncluded"] = True
            rec_spec["ringsIncluded"] = True
            if rec_spec.get("pistonsIncluded") is False:
                rec_spec["ringsIncluded"] = False
            # family
            fams = ra_family(page, title, subhead, rec_spec, notes)
            for fam in fams:
                fit = OrderedDict(fam=fam)
                if cis:
                    fit["ci"] = sorted(set(cis))
                fit["cyl"] = fam_cyl(fam)
                fnotes = []
                if title:
                    fnotes.append("catalog section: " + title)
                if subhead and subhead != title:
                    fnotes.append(subhead)
                fnotes.extend(notes)
                if fam == F_MAG:
                    fnotes.append("catalog: for 5.9L Magnum engines use the 360 kits")
                if fnotes:
                    fit["notes"] = "; ".join(OrderedDict.fromkeys(fnotes))
                if ccs:
                    fit["cc"] = sorted(set(ccs))
                name = "%srotating assembly, %.3f stroke" % ((rec_spec.get("series", "") + " ").lstrip(), stroke_in)
                if rod_len:
                    name += ", %.3f rod" % rod_len
                name += ", " + (piston if piston and piston.lower() != "none" else "crank/rods/bearings kit (no pistons)")
                if bores:
                    name += ", bores %.3f-%.3f" % (bores[0]["bore"], bores[-1]["bore"])
                recs.append(OrderedDict(m=BRAND, p=base["pn"], cat="rotatingAssembly", name=name, fit=fit,
                                        spec=json.loads(json.dumps(rec_spec)),
                                        src=OrderedDict(doc=DOC, edition=EDITION, file=FILE, page=page),
                                        emissions=None))
    return recs


def ra_family(page, title, subhead, spec, notes, quiet=False):
    fam = PAGE_FAM.get(page)
    t = (title or "") + " " + (subhead or "")
    if page in (36, 37, 38, 39, 44, 45, 46, 47):
        if "409" in t and page in (38, 39):
            return [F_W]
        if spec.get("rearSeal") == "1-pc":
            return [F_GEN6]
        if spec.get("rearSeal") == "2-pc":
            return [F_MK4]
        if "2 piece rear seal only" in t.lower() or page in (46, 47) and "427" in t:
            spec["rearSeal"] = "2-pc"
            return [F_MK4]
        if "396" in t:
            notes.append("396/402 small-bore big block (Mark IV era); seal style not stated")
            return [F_MK4]
        return [F_MK4, F_GEN6]
    if page in (50, 51):
        if subhead and "360" in subhead:
            return [F_LA, F_MAG]
        return [F_LA]
    if page in (52, 53):
        if subhead and re.search(r"6\.2|6\.4", subhead):
            return [F_HEMI2]
        return [F_HEMI1]
    if page in (54, 55):
        if "HEMI" in t.upper():
            return [F_426]
        return [F_BRB]
    if page in (48, 49):
        return [F_BRB]          # the only kit table on the spread is the Chrysler 400 (B block) one
    if page in (58, 59):
        return [F_MOD]
    if fam:
        return [fam]
    f, cyl = engine_family(t)
    if f:
        return [f]
    if page in (72, 73):
        return ["Honda K-series (catalog heading)" if "K20" in t else "Honda F/H-series (catalog heading)"]
    if page in (76, 77):
        return ["Mitsubishi 4B11T (catalog heading)" if "4B11" in t else "Mitsubishi 4G63/4G64 (catalog heading)"]
    if page in (78, 79):
        return ["Nissan RB25/RB26 (catalog heading)" if "RB26" in t else "Nissan SR20 (catalog heading)"]
    if page in (84, 85):
        return ["Subaru EJ20/EJ25 (catalog heading)"]
    if page in (86, 87):
        return ["Toyota 2JZ (catalog heading)"]
    if not quiet:
        qa("p%d: no family for assembly table '%s'" % (page, t.strip()))
    return [(title or "unknown") + " (catalog heading)"]


# ----------------------------------------------------------------------------- cranks

def crank_material(pn, page):
    if page in (72, 73):
        return "billet 4340" if pn.startswith("3") else "4340 steel"
    if page in (76, 77):
        return "billet 4340" if pn.startswith("3") else "4340 steel"
    if page in (78, 79, 84, 85, 86, 87):
        return "billet 4340"
    d = pn[0]
    return {"1": "cast steel", "5": "forged 4140", "4": "forged 4340", "3": "billet 4340"}.get(d)


def extract_cranks(table, lines, page, ctx):
    recs = []
    cols = table.cols
    stroke_col = table.col("STROKE")
    notes_col = table.col("NOTES")
    minrod_col = next((c for c in cols if c["norm"].startswith("MIN. ROD")), None)
    journal_col = table.col("ROD JOURNAL", "JOURNAL")
    bal_col = table.col("BALANCE")
    engine_col = table.col("ENGINE")
    rodwidth_col = table.col("ROD WIDTH")
    pn_cols = [c for c in cols if c["kind"] == "pn"]
    wt_cols = table.cols_of("WT", "WEIGHT")
    bw_cols = [c for c in cols if c["norm"].startswith("BOBW")]
    # titles / statements above the table on this half
    titles = []
    statements = []
    sec_top = None
    for top, c in ctx:
        if re.search(r"CRANKSHAFTS$|CRANKS$", clean(c["text"])) and clean(c["text"]).isupper():
            sec_top = top
            break
    if sec_top is not None:
        ctx = [(top, c) for top, c in ctx if top >= sec_top - 2]
    for top, c in ctx:
        t = clean(c["text"])
        if len(t) < 60 and (t.isupper() or re.match(r"^\d\.\d{3}\" (ROD )?JOURNALS?$", t) or
                            re.search(r"MAINS|REAR SEAL|SNOUT|FLANGE|CRANKSHAFTS|CRANKS$", t)):
            titles.append((top, t))
        statements.append((top, t))
    group_titles = [t for top, t in titles if top > table.top - 40 and not re.search(r"CRANKSHAFTS|CRANKS$", t)]
    section_titles = [t for top, t in titles if re.search(r"CRANKSHAFTS|CRANKS|COUNTERWEIGHTED|LS9|SNOUT", t)]
    stmt_text = " || ".join(t for top, t in statements)
    foot = footnotes(lines, table)
    # page statements (apply to the tables below them)
    main_j = None
    rod_j = None
    for top, t in statements:
        m = re.search(r"(\d\.\d{3})\" main journal", t)
        if m and main_j is None:
            main_j = float(m.group(1))
        m = re.search(r"(\d\.\d{3})\" rod journal size", t)
        if m and rod_j is None:
            rod_j = float(m.group(1))
    default_balance = None
    if re.search(r"Designed for internal balance", stmt_text, re.I):
        default_balance = "internal"
    cast_ext = re.search(r"Cast cranks? (?:are )?designed for 28 ?in-oz", stmt_text, re.I)
    rear_seal = None
    for t in group_titles + section_titles:
        if "REAR SEAL" in t:
            rear_seal = "1-pc" if t.startswith("1") else "2-pc"
        m = re.match(r"^(\d\.\d{3})\" ROD JOURNALS$", t)
        if m:
            rod_j = float(m.group(1))
        m = re.search(r"MAINS \((\d\.\d{3})\"\)", t)
        if m:
            main_j = float(m.group(1))
    if re.search(r"either 1 pc or 2 pc rear seal", stmt_text):
        rear_seal = "1-pc or 2-pc"
    for row in table.rows:
        bycol, _ = map_cells(table, row["cells"])
        scs = col_cells(bycol, stroke_col)
        stroke_t = None
        stroke_mm = None
        for c in scs:
            if NUM_IN_RE.match(c["text"]):
                stroke_t = c["text"]
            elif MM_RE.match(c["text"]):
                stroke_mm = float(MM_RE.match(c["text"]).group(1))
        if stroke_t is None and stroke_mm is None:
            continue
        stroke = num(stroke_t) if stroke_t else round(stroke_mm / 25.4, 4)
        notes_t = clean(" ".join(c["text"] for c in col_cells(bycol, notes_col))) if notes_col else ""
        engine_t = clean(" ".join(c["text"] for c in col_cells(bycol, engine_col))) if engine_col else ""
        minrod = num(first_text(bycol, minrod_col)) if minrod_col else None
        journal = num(first_text(bycol, journal_col)) if journal_col else None
        bal_t = first_text(bycol, bal_col) if bal_col else None
        # bobweight (global or per pn column)
        for pc_i, pc in enumerate(pn_cols):
            pcells = col_cells(bycol, pc)
            for pcell in pcells:
                t = pcell["text"].strip()
                if t in ("-", "--", "") or t.lower().startswith("coming"):
                    continue
                if not PN_RE.match(t):
                    SKIPPED["crank cell not a part number: %s (p%d)" % (t, page)] += 1
                    continue
                marks = "".join(ch for ch in t if ch in "*^")
                pn = t.replace("*", "").replace("^", "")
                nxt = pn_cols[pc_i + 1]["cx"] if pc_i + 1 < len(pn_cols) else 1e9
                wt_col = next((w for w in wt_cols if pc["cx"] < w["cx"]), None)
                bw_col = next((w for w in bw_cols if pc["cx"] < w["cx"] < nxt), None)
                if bw_col is None:
                    bw_col = next((w for w in bw_cols if w["cx"] < pn_cols[0]["cx"]), None) or (bw_cols[0] if len(bw_cols) == 1 else None)
                spec = OrderedDict()
                spec["stroke"] = r3(stroke)
                if stroke_mm:
                    spec["strokeMm"] = stroke_mm
                mat = crank_material(pn, page)
                if mat:
                    spec["material"] = mat
                if pc["norm"] not in ("PART NO", "PART NUMBER", "P/N"):
                    hdr = clean(pc["text"])
                    m = re.match(r"^(?:(LS9|LARGE) )?(\d\d)t RELUCTOR$", hdr)
                    if m:
                        spec["reluctor"] = int(m.group(2))
                        if m.group(1):
                            spec["reluctorStyle"] = m.group(1).title()
                    elif hdr == "no RELUCTOR":
                        spec["reluctor"] = "none"
                    elif re.match(r"^(\d\d)t \(", hdr):
                        spec["reluctor"] = int(hdr[:2])
                        spec["reluctorYears"] = hdr[hdr.find("(") + 1:-1]
                    elif re.match(r'^(\d\.\d{3})" MAINS$', hdr):
                        spec["mainJournal"] = float(hdr[:5])
                    elif re.match(r"^(\d) BOLT", hdr):
                        spec["flywheelBolts"] = int(hdr[0])
                    elif "REAR SEAL" in hdr:
                        spec["rearSeal"] = "1-pc" if hdr.startswith("1") else "2-pc"
                    elif hdr == "LIGHTWEIGHT":
                        spec["lightweight"] = True
                    else:
                        spec["variant"] = hdr
                if "mainJournal" not in spec and main_j:
                    spec["mainJournal"] = main_j
                rj = journal or rod_j
                m = re.search(r"(\d\.\d{1,3})\" (?:rod )?journals?", notes_t)
                if m:
                    rj = float(m.group(1))
                if rj:
                    spec["rodJournal"] = r3(rj)
                if rodwidth_col:
                    w = num(first_text(bycol, rodwidth_col))
                    if w:
                        spec["rodJournalWidth"] = w
                bw = num(first_text(bycol, bw_col)) if bw_col else None
                if bw:
                    spec["bobweight"] = int(bw)
                if minrod:
                    spec["minRodLength"] = r3(minrod)
                if "rearSeal" not in spec and rear_seal:
                    spec["rearSeal"] = rear_seal
                balance = None
                if bal_t:
                    balance = bal_t
                if re.search(r"int\. front/ext\. rear", notes_t):
                    balance = "internal front / external rear"
                elif re.search(r"external balance", notes_t):
                    balance = "external"
                elif re.search(r"internal / external", notes_t):
                    balance = "internal or external"
                elif re.search(r"internal balance", notes_t):
                    balance = "internal"
                m = re.search(r"(\d{2}) in-oz", notes_t)
                if m:
                    balance = "external %s oz-in" % m.group(1)
                if balance is None:
                    if cast_ext and mat == "cast steel":
                        balance = "external 28 oz-in"
                    elif default_balance:
                        balance = default_balance
                if pn.endswith("E") and page == 8:
                    balance = "external"
                if balance:
                    spec["balance"] = balance
                wt = num(first_text(bycol, wt_col)) if wt_col else None
                if wt:
                    spec["weight"] = int(wt)
                extra = []
                if re.search(r"LONG SNOUT", " ".join(section_titles)):
                    spec["snout"] = "long 4.006"
                if re.search(r"big block snout", notes_t):
                    spec["snout"] = "big block"
                if re.search(r"9 BOLT FLANGE", " ".join(section_titles)):
                    spec["flywheelBolts"] = 9
                if re.search(r"8-bolt rear flange|8 bolt flange like", stmt_text):
                    spec["flywheelBolts"] = 8
                if re.search(r"6 bolt flange only", notes_t):
                    spec["flywheelBolts"] = 6
                if re.search(r"COUNTERWEIGHT", " ".join(section_titles)) or re.search(r"Center counterweights", stmt_text):
                    spec["centerCounterweights"] = True
                if page == 37 and pc["cx"] > 1090 + 0 and table.x0 > PAGE_W:
                    spec["centerCounterweights"] = True
                if re.search(r"LIGHTWEIGHT CRANKS", " ".join(section_titles)):
                    spec["lightweight"] = True
                if re.search(r"IMCA", " ".join(section_titles)) or "IMCA" in notes_t:
                    extra.append("IMCA legal")
                if re.search(r"pendulum undercutting option is not available", stmt_text):
                    pass
                if marks:
                    for f in foot:
                        if f.startswith(marks[0]):
                            ft = clean(f.lstrip("*^ "))
                            m = re.search(r"(\d{4}) bobweight", ft)
                            if m:
                                spec["bobweight"] = int(m.group(1))
                            if "external balance" in ft:
                                spec["balance"] = "external"
                            extra.append(ft)
                if notes_t:
                    extra.insert(0, notes_t)
                if extra:
                    spec["notes"] = "; ".join(OrderedDict.fromkeys(extra))
                fams, fnotes = crank_family(page, pn, spec, section_titles + group_titles, engine_t)
                for fam in fams:
                    fit = OrderedDict(fam=fam, cyl=fam_cyl(fam))
                    fn = list(fnotes)
                    if engine_t:
                        fn.insert(0, engine_t)
                    if fn:
                        fit["notes"] = "; ".join(OrderedDict.fromkeys(fn))
                    name = "%s crank, %.3f stroke" % (mat or "steel", stroke)
                    if spec.get("rodJournal"):
                        name += ", %.3f rod journal" % spec["rodJournal"]
                    if spec.get("mainJournal"):
                        name += ", %.3f main" % spec["mainJournal"]
                    recs.append(OrderedDict(m=BRAND, p=pn, cat="crank", name=name, fit=fit,
                                            spec=json.loads(json.dumps(spec)),
                                            src=OrderedDict(doc=DOC, edition=EDITION, file=FILE, page=page),
                                            emissions=None))
    return recs


def crank_family(page, pn, spec, titles, engine_t):
    tt = " ".join(titles)
    notes = []
    if page in (10, 11) and "HOLDEN" in tt:
        return ["Holden 308 (catalog heading)"], notes
    if page == 37:
        if "409" in tt:
            return [F_W], notes
        if spec.get("rearSeal") == "1-pc":
            return [F_GEN6], notes
        if spec.get("rearSeal") == "2-pc":
            return [F_MK4], notes
        return [F_MK4, F_GEN6], notes
    if page in (52, 53):
        if spec.get("reluctor") == 32:
            return [F_HEMI1], notes
        return [F_HEMI1, F_HEMI2], notes
    if page in (50, 51):
        if "360 MAINS" in tt:
            spec["mainSize"] = "360"
            return [F_LA, F_MAG], ["360 main size; catalog: for 5.9L Magnum use 360 parts"]
        return [F_LA], ["318/340 main size"] if page == 51 else notes
    if page in (82, 83):
        if "428" in tt:
            return [F_PON], ["428/455 main size (3.250)"]
        return [F_PON], ["400 main size (3.000)"]
    if page in (48, 49):
        return [F_BRB], notes
    if page in (58, 59):
        return [F_MOD], notes
    fam = PAGE_FAM.get(page)
    if fam:
        return [fam], notes
    f, cyl = engine_family(engine_t)
    if f:
        return [f], notes
    qa("p%d crank %s: no family (titles %s)" % (page, pn, tt))
    return [(titles[0] if titles else "unknown") + " (catalog heading)"], notes


# ----------------------------------------------------------------------------- rods

ROD_BOLT_DIA_38 = {10, 11, 20, 21, 22, 23, 26, 27, 50, 51, 62, 63, 64, 65, 66, 67, 74, 75}   # SIR rods with 3/8" bolts (page bullets)
# domestic V8 pages whose H-beam (CRS) rods use 7/16" bolts per the page bullets / headings
CRS_716_PAGES = {10, 11, 20, 21, 22, 23, 26, 27, 36, 37, 48, 49, 50, 51, 52, 53, 54, 55, 62, 63, 64, 65, 66, 67, 68, 69,
                 70, 71, 80, 81, 82, 83}


def rod_series(pn):
    if pn.startswith("SIR"):
        return "SIR I-beam", "I", "forged 5140"
    if pn.startswith("FSI"):
        return "FSI I-beam", "I", "forged 4340"
    if pn.startswith("CRS"):
        if re.search(r"4D(2000|L19)?$", pn):
            return "H-beam 4D", "H", "forged 4340 (Eagle proprietary alloy)"
        if re.search(r"XD$", pn):
            return "H-beam Extreme Duty", "H", "forged 4340"
        return "ESP H-beam 3D", "H", "forged 4340"
    return None, None, None


def extract_rods(table, lines, page, ctx):
    recs = []
    cols = table.cols
    len_col = table.col("LENGTH")
    notes_col = table.col("NOTES")
    pin_col = table.col("PIN", "PIN SIZE")
    jr_col = table.col("ROD JOURNAL")
    eng_col = table.col("ENGINE", "APPLICATION", "DESCRIPTION")
    pn_cols = [c for c in cols if c["kind"] == "pn"]
    wt_cols = table.cols_of("WT", "WEIGHT")
    # journal label / pin statement above
    journal = None
    pin_default = None
    fam_title = None
    for top, c in ctx:
        t = clean(c["text"])
        m = re.match(r'^(\d\.\d{3})" JOURNAL$', t)
        if m and journal is None and top > table.top - 60:
            journal = float(m.group(1))
        m = re.match(r'^(\.\d{3})" pin size', t)
        if m and pin_default is None:
            pin_default = float(m.group(1))
        if fam_title is None and t.isupper() and re.search(r"RODS|BMW|CADILLAC|CHEVROLET|CHRYSLER|FORD|HONDA|JEEP|MAZDA|MITSUBISHI|NISSAN|OLDSMOBILE|PONTIAC|SUBARU|TOYOTA|VOLKSWAGEN|BUICK", t):
            fam_title = t
    if page == 36 and journal == 2.1:
        journal = 2.2
        qa("p36 big-block Chevy rod table is labelled '2.100\" JOURNAL' in the catalog; Eagle BBC rods are 2.200\" "
           "(the catalog's own BBC crank listing on eaglerod.com gives a 2.2\" rod journal) - bigEnd set to 2.2, flagged")
    stmt_text = " || ".join(clean(c["text"]) for top, c in ctx if top > table.top - 200)
    foot = footnotes(lines, table)
    for row in table.rows:
        bycol, _ = map_cells(table, row["cells"])
        lcells = col_cells(bycol, len_col)
        length = None
        length_mm = None
        for c in lcells:
            for tok in c["text"].replace(",", " ").split():
                if NUM_IN_RE.match(tok) and length is None:
                    length = num(tok)
                elif MM_RE.match(tok):
                    length_mm = float(MM_RE.match(tok).group(1))
        if length is None:
            continue
        notes_t = clean(" ".join(c["text"] for c in col_cells(bycol, notes_col))) if notes_col else ""
        notes_t = "" if notes_t in ("-", "--") else notes_t
        eng_t = clean(" ".join(c["text"] for c in col_cells(bycol, eng_col))) if eng_col else ""
        pin = None
        pin_mm = None
        if pin_col:
            pt = first_text(bycol, pin_col) or ""
            if MM_RE.match(pt):
                pin_mm = float(MM_RE.match(pt).group(1))
                pin = round(pin_mm / 25.4, 4)
            else:
                pin = num(pt.split(" ")[0]) if pt else None
        m = re.search(r"(\.\d{3,4})\" (?:press-fit )?pin", notes_t)
        if m:
            pin = float(m.group(1))
        if pin is None:
            pin = pin_default
        big_end = journal
        if jr_col:
            big_end = num(first_text(bycol, jr_col)) or big_end
        m = re.search(r"(\d\.\d{1,4})\" (?:rod )?journal", notes_t)
        if m:
            big_end = float(m.group(1))
        be_width = None
        m = re.search(r"(\.\d{3,4}|\d\.\d{3})\" width", notes_t)
        if m:
            be_width = float(m.group(1))
        for pc_i, pc in enumerate(pn_cols):
            for pcell in col_cells(bycol, pc):
                t = pcell["text"].strip()
                if t in ("-", "--", ""):
                    continue
                if not PN_RE.match(t):
                    SKIPPED["rod cell not a part number: %s (p%d)" % (t, page)] += 1
                    continue
                marks = "".join(ch for ch in t + eng_t + notes_t if ch in "*^")
                pn = t.replace("*", "").replace("^", "")
                series, beam, material = rod_series(pn)
                if series is None:
                    SKIPPED["rod part number with unknown prefix: %s (p%d)" % (pn, page)] += 1
                    continue
                nxt = pn_cols[pc_i + 1]["cx"] if pc_i + 1 < len(pn_cols) else 1e9
                wt_col = next((w for w in wt_cols if pc["cx"] < w["cx"]), None)
                if wt_col is None and len(pn_cols) >= 1 and len(wt_cols) == 1 and pc_i == 0 and pc["norm"] in ("PART NO", "PART NUMBER") \
                        and wt_cols[0]["cx"] < pc["cx"] and table.key in ("ENGINE", "APPLICATION", "DESCRIPTION"):
                    wt_col = wt_cols[0]
                spec = OrderedDict()
                spec["series"] = series
                spec["length"] = r3(length)
                if length_mm:
                    spec["lengthMm"] = length_mm
                if big_end:
                    spec["bigEnd"] = r3(big_end)
                if be_width:
                    spec["bigEndWidth"] = be_width
                if pin:
                    spec["pin"] = r3(pin)
                if pin_mm:
                    spec["pinMm"] = pin_mm
                spec["beam"] = beam
                spec["material"] = material
                # bolts
                hdr = clean(pc["text"])
                grade = None
                if re.search(r"2000$", pn) or re.search(r"ARP 2000", hdr):
                    grade = "ARP 2000"
                elif re.search(r"L19$", pn) or re.search(r"L19", hdr):
                    grade = "ARP L19"
                elif re.search(r"XD$", pn) or hdr == "EXTREME DUTY":
                    grade = "ARP Custom Age 625+"
                elif re.search(r"8740$", pn):
                    grade = "ARP 8740"
                elif re.search(r"4D$", pn):
                    grade = "ARP 2000"
                elif re.search(r"Custom Age 625\+", stmt_text) and re.search(r"2000", stmt_text) and pn.endswith("3D") and re.search(r"8740, 2000", stmt_text):
                    grade = "ARP 2000"
                elif re.search(r"ARP 2000 (?:rod |capscrew )?bolts", stmt_text) and not re.search(r"8740", stmt_text):
                    grade = "ARP 2000"
                else:
                    grade = "ARP 8740"
                foot_t = " ".join(clean(f) for f in foot if marks and f.startswith(marks[0]))
                m = re.search(r"(\d/\d+)\" (?:ARP )?(?:[\w/]+ )*bolts", notes_t + " " + foot_t)
                dia = m.group(1) if m else None
                if dia is None:
                    m = re.search(r"(\d/\d+)\" ARP", notes_t + " " + foot_t)
                    dia = m.group(1) if m else None
                if dia is None:
                    if pn.startswith("SIR"):
                        dia = "3/8" if page in ROD_BOLT_DIA_38 else "7/16"
                    elif pn.startswith("FSI"):
                        dia = "7/16"
                    else:
                        dia = "7/16" if page in CRS_716_PAGES else "3/8"
                if re.search(r"4D$", pn) and page in (72, 73, 84, 85, 86, 87):
                    dia = "7/16"
                if re.search(r"(?:5/16|3/8|7/16)\" ARP 8740 / 2000", notes_t):
                    grade = "ARP 8740 or 2000"
                spec["bolt"] = '%s" %s' % (dia, grade)
                wt = num(first_text(bycol, wt_col)) if wt_col else None
                if wt and 300 < wt < 1200:
                    spec["weight"] = int(wt)
                extra = []
                if notes_t:
                    extra.append(notes_t)
                if "press-fit" in notes_t or re.search(r"P(LW)?$", pn) and pn.startswith("SIR") and "press" in notes_t:
                    spec["pinType"] = "press-fit"
                elif "bushed" in notes_t:
                    spec["pinType"] = "bushed"
                if "LIGHTWEIGHT" in hdr or (re.search(r"LW(-6)?$", pn) and re.search(r"LIGHTWEIGHT RODS", stmt_text)):
                    spec["lightweight"] = True
                if re.search(r"BST(2000)?$", pn):
                    spec["series"] = "Extreme Stroker H-beam"
                    extra.append("CNC machined for extra cam clearance; for 3.875 in. or longer stroke")
                if marks:
                    for f in foot:
                        if f.startswith(marks[0]):
                            extra.append(clean(f.lstrip("*^ ")))
                if extra:
                    spec["notes"] = "; ".join(OrderedDict.fromkeys(extra))
                fams, cyl = rod_family(page, pn, eng_t, notes_t, fam_title)
                for fam in fams:
                    fit = OrderedDict(fam=fam, cyl=cyl or fam_cyl(fam))
                    so = fit["cyl"]
                    m = re.search(r"set of (\d+)", notes_t)
                    if m:
                        so = int(m.group(1))
                    elif pn.endswith("-6"):
                        so = 6
                    spec["setOf"] = so
                    fn = []
                    if eng_t:
                        fn.append(eng_t)
                    if page in (36,):
                        fn.append("catalog section: Chevrolet big block")
                    if fn:
                        fit["notes"] = "; ".join(fn)
                    name = "%s %s-beam rod, %.3f length" % (material.split(" (")[0], beam, length)
                    if big_end:
                        name += ", %.3f journal" % big_end
                    recs.append(OrderedDict(m=BRAND, p=pn, cat="rod", name=name, fit=fit,
                                            spec=json.loads(json.dumps(spec)),
                                            src=OrderedDict(doc=DOC, edition=EDITION, file=FILE, page=page),
                                            emissions=None))
    return recs


def rod_family(page, pn, eng_t, notes_t, fam_title):
    if page == 36:
        return [F_MK4, F_GEN6], 8
    if page in (52, 53):
        if re.search(r"6\.4", eng_t):
            return [F_HEMI2], 8
        if re.search(r"stroker", eng_t):
            return [F_HEMI1, F_HEMI2], 8
        return [F_HEMI1], 8
    if page in (54, 55):
        if "hemi" in notes_t.lower():
            return [F_426], 8
        return [F_BRB], 8
    if page in (48, 49):
        if fam_title and "400" in fam_title or page == 49:
            if "V10" in (fam_title or "") or re.search(r"V10", eng_t):
                return ["Dodge Viper V10 (catalog heading)"], 10
            return [F_BRB], 8
        f, cyl = engine_family(eng_t)
        return [f or "Chrysler 4-cylinder (catalog heading)"], cyl or 4
    if page in (58, 59):
        if re.search(r"Coyote", eng_t):
            return [F_MOD, F_COY], 8
        if re.search(r"6\.8", eng_t):
            return [F_MOD], 10
        return [F_MOD], 8
    if page in (60, 61):
        return [F_COY], 8
    if page == 8 and fam_title and "BMW" in fam_title or page == 9:
        f, cyl = engine_family(eng_t)
        if f:
            return [f], cyl
        if fam_title and "CADILLAC" in fam_title or "up to 1999" in notes_t:
            return ["Cadillac Northstar 4.6 (catalog heading)"], 8
    fam = PAGE_FAM.get(page)
    if fam:
        return [fam], fam_cyl(fam)
    f, cyl = engine_family(eng_t + " " + notes_t)
    if f:
        return [f], cyl
    qa("p%d rod %s: no family (engine '%s')" % (page, pn, eng_t))
    return [(fam_title or "unknown") + " (catalog heading)"], 4


# ----------------------------------------------------------------------------- driver

def extract(pdf_path, debug=False):
    records = []
    tables_seen = []
    with pdfplumber.open(pdf_path) as pdf:
        npages = len(pdf.pages)
        for lp in range(FIRST_PAGE, LAST_PAGE + 1, 2):
            lines = build_spread(pdf, lp)
            tables = find_tables(lp, lines)
            for t in tables:
                page = lp if t.x0 < PAGE_W else lp + 1
                t.page = page
                assign_rows(t, lines)
                ctx = context_lines(lines, t)
                if debug:
                    print("p%d %-5s y=%.0f x=%.0f-%.0f cols=%s rows=%d" % (page, t.type, t.top, t.x0, t.x1,
                          [c["text"] for c in t.cols], len(t.rows)))
                before = len(records)
                if t.type == "ra":
                    records.extend(extract_ra(t, lines, page, ctx))
                elif t.type == "crank":
                    records.extend(extract_cranks(t, lines, page, ctx))
                elif t.type == "rod":
                    records.extend(extract_rods(t, lines, page, ctx))
                tables_seen.append((page, t.type, len(t.rows), len(records) - before))
    return records, tables_seen, npages


def merge_duplicates(records):
    """Same part number + family: merge (rotating assemblies listed under several sub-applications)."""
    out = OrderedDict()
    merged = 0
    for r in records:
        k = (r["p"], r["fit"]["fam"], r["cat"])
        if k not in out:
            out[k] = r
            continue
        merged += 1
        a = out[k]
        sa, sb = a["spec"], r["spec"]
        if r["cat"] == "rotatingAssembly":
            bo = {json.dumps(b, sort_keys=True): b for b in sa.get("boreOptions", [])}
            for b in sb.get("boreOptions", []):
                bo.setdefault(json.dumps(b, sort_keys=True), b)
            if bo:
                sa["boreOptions"] = sorted(bo.values(), key=lambda b: b["bore"])
            ci = sorted(set(a["fit"].get("ci", [])) | set(r["fit"].get("ci", [])))
            if ci:
                a["fit"]["ci"] = ci
            if sb.get("cr") and sb.get("crBore") != sa.get("crBore"):
                cb = sa.setdefault("crByBore", OrderedDict())
                if sa.get("crBore") is not None:
                    cb.setdefault(str(sa["crBore"]), sa.get("cr"))
                cb.setdefault(str(sb.get("crBore")), sb["cr"])
            for key in ("balancedPn", "balancedPns", "rearSeal", "reluctor", "balance"):
                if key in sb and key not in sa:
                    sa[key] = sb[key]
        na = a["fit"].get("notes", "")
        nb = r["fit"].get("notes", "")
        if nb and nb not in na:
            a["fit"]["notes"] = (na + "; " if na else "") + nb
        pa = a["src"].get("pages") or [a["src"]["page"]]
        if r["src"]["page"] not in pa:
            pa.append(r["src"]["page"])
        if len(pa) > 1:
            a["src"]["pages"] = pa
    return list(out.values()), merged


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat", "fit", "src"):
            if k not in r or r[k] in ("", None):
                problems.append("missing %s in %s" % (k, r.get("p")))
        if not r["fit"].get("fam"):
            problems.append("missing fit.fam in %s" % r["p"])
        key = (r["p"], r["fit"].get("fam"), r["cat"])
        if key in seen:
            problems.append("duplicate %s" % (key,))
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for v in o:
                    walk(v, path)
            elif isinstance(o, str) and o == "":
                problems.append("empty string at %s in %s" % (path, r["p"]))
        walk(r, "")
        for k in ("stroke", "rodJournal", "mainJournal", "minRodLength", "length", "bigEnd", "pin", "weight",
                  "bobweight", "rodLength", "bore", "domeCc"):
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append("non-numeric %s=%r in %s" % (k, v, r["p"]))
    return problems


def write_notes(records, tables_seen, merged, problems, npages, path):
    by_cat = Counter(r["cat"] for r in records)
    by_cat_fam = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    by_series = Counter((r["cat"], r["spec"].get("series") or r["spec"].get("material") or "-") for r in records)
    cover = defaultdict(Counter)
    for r in records:
        for k in r["spec"]:
            cover[r["cat"]][k] += 1
    unknown_fams = sorted({r["fit"]["fam"] for r in records if r["fit"]["fam"] not in KNOWN_FAMS})
    L = []
    L.append("# Eagle Specialty Products - extraction notes\n")
    L.append("Source: `%s` (%d PDF pages; Eagle 2024 rev. 4 catalog, text layer; saved by hand under `Catalogs/`, "
             "no network used). PDF page = printed page. Pages %d-%d parsed; pages 1-7 (intro, application guide, "
             "how-to sample tables, 4D rod teaser) and 89-92 (service parts, crank options, terms) skipped.\n"
             % (FILE, npages, FIRST_PAGE, LAST_PAGE))
    L.append("Records: %d (%d unique part numbers; a part listed for several families is repeated once per family; "
             "%d duplicate listings of the same kit under several sub-applications were merged).\n"
             % (len(records), len({r["p"] for r in records}), merged))
    L.append("## Counts\n")
    L.append("| cat | records |\n|---|---|")
    for c, n in sorted(by_cat.items()):
        L.append("| %s | %d |" % (c, n))
    L.append("\n| cat / fit.fam | records |\n|---|---|")
    for (c, f), n in sorted(by_cat_fam.items()):
        L.append("| %s / %s | %d |" % (c, f, n))
    L.append("\n| cat / series or material | records |\n|---|---|")
    for (c, s), n in sorted(by_series.items()):
        L.append("| %s / %s | %d |" % (c, s, n))
    L.append("\n### Spec coverage\n")
    for c in sorted(cover):
        n = by_cat[c]
        items = ", ".join("%s %d" % (k, v) for k, v in cover[c].most_common())
        L.append("- **%s** (%d records): %s" % (c, n, items))
    L.append("\n### Tables parsed\n")
    L.append("| page | type | rows | records |\n|---|---|---|---|")
    for page, typ, rows, n in tables_seen:
        L.append("| %d | %s | %d | %d |" % (page, typ, rows, n))
    L.append("\n## Method\n")
    L.append("- Every PDF page's text layer holds the whole two-page spread (right page repeated at x > 612 on the left "
             "page, left page at x < 0 on the right page). Spread tables are read from the left page's words so each "
             "row is one joined line; right-page-only words (series headings, footnotes) are merged in at x + 612.")
    L.append("- Tables are located from header lines (STROKE / LENGTH / ENGINE key cell plus header vocabulary); several "
             "tables may share a line, so each table owns an x-range. Data cells are mapped to the nearest column "
             "header; merged cells such as `SIR5400CB 525` are split by word position.")
    L.append("- Rotating assemblies: one record per unbalanced kit root number; the Eagle-balanced number (`B` prefix) "
             "is `spec.balancedPn` (or `balancedPns` keyed by flexplate/flywheel variant). Kits listed only in balanced "
             "form carry the `B` number as `p` with `balanced: true`. Kit numbers are root numbers: the bore suffix "
             "(`000`, `030` ...) is appended when ordering. `boreOptions` lists the bores/displacements the catalog "
             "offers the kit in; `bore` is the standard bore (page statement, cross-checked against the listed "
             "displacements, or derived from them when the page states none). `cr` is keyed by chamber cc and was "
             "calculated by Eagle at `crBore` with a `crGasket` thick gasket on an uncut block; a kit repeated on "
             "several pages with different reference bores keeps the first `cr` and gets `crByBore`.")
    L.append("- Series -> crank material follows the catalog's how-to page: Street & Strip = cast steel crank, Pro Street "
             "= forged 4140, Competition = forged 4340; footnoted kits (`*uses 4340 crankshaft`) are overridden; "
             "single-series import/Hemi/RB tables take the material from the table text (billet vs forged 4340, "
             "and the rod beam/material where stated). Rod type is NOT stated for the domestic multi-series kit tables "
             "and is left out.")
    L.append("- Cranks: material from the leading digit of the part number (1 cast steel, 5 forged 4140, 4 forged 4340, "
             "3 billet 4340; import billet/4340 tables by heading). Main/rod journal sizes come only from page "
             "statements, journal columns, notes or main-size headings. Reluctor, long snout, 9-bolt flange, centre "
             "counterweights, rear seal come from table/column headings. `bobweight` is Eagle's 'bobweight of crank when "
             "new +/- 2%'. `minRodLength` is the catalog's minimum rod length column.")
    L.append("- Rods: prefix gives the line (SIR = forged 5140 I-beam per the FE/AMC kit text, FSI = 4340 I-beam per the "
             "back-cover text, CRS = forged 4340 H-beam; 3D/4D design generation, XD Extreme Duty, LW lightweight). "
             "`bigEnd` is the journal size from the `<size> JOURNAL` table label, ROD JOURNAL column or notes. Bolt "
             "grade from the part-number suffix/column (2000, L19, XD = Custom Age 625+, 4D = ARP 2000, otherwise "
             "ARP 8740); bolt diameter from the page bullet text per rod line (SIR 3/8 on small-block pages, 7/16 "
             "on big-block pages; FSI and domestic CRS 7/16; 4/6-cylinder CRS 3/8 unless noted).")
    L.append("- Skipped: how-to sample tables (p4-5), 4D teaser list (p6), flexplates, rear-seal adapters, spacer "
             "bearings, pilot bushings, crank machining options, rod bolts, pin bushings, alignment sleeves.")
    L.append("\n## Families outside the fitment list (catalog heading used)\n")
    for f in unknown_fams:
        L.append("- %s (%d records)" % (f, sum(1 for r in records if r["fit"]["fam"] == f)))
    L.append("\n## Skipped cells\n")
    for k, v in SKIPPED.most_common():
        L.append("- %s x%d" % (k, v))
    L.append("\n## QA (%d notes)\n" % len(QA))
    for q in QA:
        L.append("- " + q)
    L.append("\n## Validation\n")
    if problems:
        for p in problems[:50]:
            L.append("- PROBLEM: " + p)
    else:
        L.append("- OK: no duplicate part numbers within a family, all records have m/p/cat/fit.fam/src, numeric fields "
                 "are numbers, no empty strings.")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--debug", action="store_true")
    a = ap.parse_args()
    records, tables_seen, npages = extract(a.pdf, a.debug)
    records, merged = merge_duplicates(records)
    problems = validate(records)
    # standing QA notes (catalog limitations, not parser faults)
    qa("Kit numbers are root numbers; the bore suffix (boreOptions[].oversize or the actual bore) must be appended when "
       "ordering. One record per unbalanced root; Eagle-balanced numbers are in balancedPn/balancedPns (88 kits exist "
       "only in balanced form and carry the B number as p).")
    qa("Rod type (I-beam vs H-beam, bolts) is not stated for the domestic Street & Strip / Pro Street / Competition kit "
       "tables, so rodBeam/rodMaterial are set only where the table text names them (Hemi, RB, FE, AMC, Olds, imports).")
    qa("Crank rod-journal and main-journal sizes are recorded only where the catalog states them (page statements, "
       "JOURNAL columns, MAINS headings, notes); e.g. the SBC 305/350 and LS crank tables do not state them.")
    qa("p20-21 IMCA RaceSaver 305 kits: five kit column groups share only two header variants (3/8\" ARP 2000 / 540 g rod "
       "vs 7/16\" ARP 8740 / 580 g rod); what else distinguishes groups 1/3/5 is not printed - all five numbers kept.")
    qa("p38 396/402 small-bore big-block kits filed under Mark IV only (Mark IV-era engines; seal style not stated).")
    qa("p36 big-block rods and the p50-51 360-main Mopar parts are emitted under two families each (Mark IV + Gen VI; "
       "LA + Magnum per the catalog's '5.9L Magnum use 360 kits' note).")
    qa("Import rods/cranks/kits (Honda, Mitsubishi, Nissan, Subaru, Toyota, BMW, VW, Mazda, Ford/Chevy/Chrysler "
       "4-cylinder) use the catalog heading as fit.fam with '(catalog heading)' and need a family decision.")
    qa("Rod bolt diameter comes from the page bullet text per rod line (see Method); grade from the part-number suffix. "
       "Treat bolt as B-grade data.")
    os.makedirs(OUT, exist_ok=True)
    data = OrderedDict(source=OrderedDict(brand=BRAND, doc=DOC, edition=EDITION, file=PDF_NAME, pages=npages,
                                          note="manual PDF under Catalogs/; eaglerod.com not crawled"),
                       extracted=dt.date.today().isoformat(), count=len(records), parts=records)
    with open(os.path.join(OUT, "eagle.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    write_notes(records, tables_seen, merged, problems, npages, os.path.join(OUT, "eagle.md"))
    print("records:", len(records), Counter(r["cat"] for r in records))
    print("merged duplicates:", merged, "problems:", len(problems), "qa notes:", len(QA))
    for p in problems[:20]:
        print("  PROBLEM", p)


if __name__ == "__main__":
    main()
