#!/usr/bin/env python3
"""Extract King Engine Bearings sets from the 2017-2018 Europe-edition catalog PDF.

Source: `Catalogs/King-catalog-201-2018-Europe-2.pdf` (983 pp, text layer; saved by hand, no network).
Output: out/king.json (records in the shared parts format) and out/king.md (notes).

Layout (see "How to Use This Catalog", PDF p20): makes are alphabetical (printed pp 1-549 =
PDF pp 372-920). Each make opens with an Engine Index (engine -> panel "Line" number), then
numbered panels. A panel lists one or more engines (description, years, cc, bore x stroke,
cyl) followed by bearing rows: King set number + undersizes, optional notes ("Optional to
...", "narrow", "with dowel hole"), shell part numbers, qty, crank positions, crankshaft
diameter min/max, housing diameter min/max, length and wall thickness, each in inches (upper
line) and mm (lower line). Flanged main sets carry a "crank flange length mm" table by
undersize. The Numerical Listing (printed 589+) only maps set -> make/panel, and the "King
Racing Line" pages are graphics without text, so everything comes from the panels.

One `bearing` record per (set number, fitment family). Engines of the same family that use
the same set are aggregated (ci list, year span, descriptions in fit.notes). Engines that do
not map to an engine-build family keep the catalog make heading as fit.fam.

Re-runnable; writes nothing outside out/. Run with `python -X utf8 -I`.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

import pymupdf

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
SRC_FILE = "Catalogs/King-catalog-201-2018-Europe-2.pdf"
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "King-catalog-201-2018-Europe-2.pdf")
BRAND = "King"
DOC = "King Engine Bearings catalog 2017-2018, Europe edition (PDF, manual download)"
EDITION = "2017-2018"
APP_FIRST, APP_LAST = 372, 920  # PDF pages holding printed application pages 1-549
PRINTED_OFFSET = 371

SET_POSITION = {"CR": "rod", "MB": "main", "CS": "cam", "TW": "thrust"}
POS_LABEL = {"rod": "rod bearing set", "main": "main bearing set", "cam": "cam bearing set",
             "thrust": "thrust washer set"}

# Bearing-material legend, catalog pp XI-XIV (PDF pp 12-15). Keyed by the set-number suffix.
SERIES_MATERIAL = {
    "AM": "K-783 aluminum bimetal (Al20Sn1Cu, no overlay)",
    "SI": "K-788 aluminum-silicon bimetal (Al12Sn2.5Si1Cu, no overlay)",
    "SM": "K-789 aluminum bimetal (Al7Sn2Si1.5CuMnCr, no overlay)",
    "CA": "upper K-794 copper-lead trimetal / lower K-783 aluminum bimetal",
    "CP": "K-794 copper-lead trimetal (Cu23Pb3.5Sn, Pb10Sn3Cu overlay)",
    "XA": "upper K-795 copper-lead trimetal / lower K-788 aluminum bimetal",
    "SX": "K-795 copper-lead trimetal (Cu21Pb4.5Sn, Pb10Sn3Cu overlay)",
    "SV": "upper K-796 silver-overlay lead-free trimetal / lower K-794/795/796",
    "SP": "upper K-624 sputter-overlay trimetal / lower K-794/795/796",
    "HP": "K-787 Alecular aluminum bimetal (racing)",
    "XP": "K-798 pMax Black copper-lead trimetal (racing)",
    "GP": "K-805 silver-overlay lead-free trimetal (racing)",
}
# Order used for output: US domestic families first (brief order), then catalog headings A-Z.
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
US_MAKES = {"American Motors", "Chrysler", "Cummins", "Ford", "General Motors", "Hummer",
            "International", "International Truck", "Jeep"}

RE_SET1 = re.compile(r"^(CR|MB|CS|TW)(\d{2,5})([A-Z]{0,5})$")
RE_SET_PREFIX = re.compile(r"^(CR|MB|CS|TW)$")
RE_SET_NUM = re.compile(r"^(\d{2,5})([A-Z]{0,5})$")
RE_RANGE = re.compile(r"^(\d+\.\d+)/(\d+\.\d+)$")
RE_NUM = re.compile(r"^\d+\.\d+$")
RE_YEARS = re.compile(r"(\d\d)/(\d{4})\s*-\s*(?:(\d\d)/(\d{4}))?")
RE_UNDERSIZE = re.compile(r"^(STD|STDX|STDG|STDR|\.?\d{3}X?|\d\.\d+X?|\d\.\d+R)(/|$)")
RE_FLANGE_ROW = re.compile(r"^(STD|\d{3}|\d\.\d+)$")
RE_PART = re.compile(r"^[A-Z]{1,2}\s?\d{2,5}[A-Z]{0,2}(?:[/-][A-Z0-9]{1,4})*$")
RE_CID = re.compile(r"^(\d{2,3})([WC]?)\s*(?:CID|CI\b|CU\.? ?IN|cu\.in|Chevrolet|Oldsmobile|Pontiac|Buick|Cadillac)", re.I)
RE_LITER = re.compile(r"(\d{1,2}\s?\.\s?\d)\s*-?\s*Liter", re.I)


# ----------------------------------------------------------------------------------------------
# page geometry
# ----------------------------------------------------------------------------------------------
class Cols:
    """Column boundaries derived from the 'King Set No. ... Wall' header of a page."""

    def __init__(self, hw):
        self.set_x = hw["King"] - 51
        self.part_x = hw["Part"] - 12
        self.qty_x = hw["Qty."] - 12
        self.pos_x = hw["Position"] - 6
        self.crank_x = hw["Crankshaft"] - 12
        self.housing_x = hw["Housing"] - 17
        self.length_x = hw["Length"] - 11
        self.wall_x = hw["Wall"] - 14
        self.years_x = self.crank_x - 70

    def col(self, x):
        if x < self.set_x + 12:
            return "set"
        if x < self.part_x:
            return "mid"
        if x < self.qty_x:
            return "part"
        if x < self.pos_x:
            return "qty"
        if x < self.crank_x:
            return "pos"
        if x < self.housing_x:
            return "crank"
        if x < self.length_x:
            return "housing"
        if x < self.wall_x:
            return "length"
        return "wall"


def page_words(page):
    """Words as dicts, with the catalog's overlapping ghost letters removed."""
    raw = [{"x0": w[0], "y0": w[1], "x1": w[2], "y1": w[3], "t": w[4]} for w in page.get_text("words")]
    raw.sort(key=lambda w: (w["y0"], w["x0"]))
    drop = set()
    n = len(raw)
    for i in range(n):
        a = raw[i]
        for j in range(i + 1, n):
            b = raw[j]
            if b["y0"] - a["y0"] > 3:
                break
            ov = min(a["x1"], b["x1"]) - max(a["x0"], b["x0"])
            if ov <= 0:
                continue
            wa, wb = a["x1"] - a["x0"], b["x1"] - b["x0"]
            if ov > 0.4 * min(wa, wb):
                # drop the shorter token (ghost letters are 1-2 characters)
                if len(a["t"]) < len(b["t"]):
                    drop.add(i)
                elif len(b["t"]) < len(a["t"]):
                    drop.add(j)
    return [w for k, w in enumerate(raw) if k not in drop]


def make_lines(words, tol=3.0):
    lines = []
    cur, anchor = [], None
    for w in words:
        if anchor is None or w["y0"] - anchor > tol:
            if cur:
                lines.append(cur)
            cur, anchor = [w], w["y0"]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    for ln in lines:
        ln.sort(key=lambda w: w["x0"])
    return lines


def find_header(lines):
    for ln in lines:
        toks = {w["t"]: w["x0"] for w in ln}
        if all(k in toks for k in ("King", "Part", "Qty.", "Position", "Crankshaft", "Housing", "Length", "Wall")):
            return Cols(toks), ln[0]["y0"]
    return None, None


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def num(s):
    try:
        return float(s)
    except ValueError:
        return None


def decimals(s):
    return len(s.split(".")[1]) if "." in s else 0


def dims_from(colmap):
    """colmap: {col: [tokens]} -> (unit, dims dict) or None."""
    d = {}
    votes = Counter()
    for col in ("crank", "housing", "length", "wall"):
        toks = [t for t in colmap.get(col, []) if RE_RANGE.match(t) or RE_NUM.match(t)]
        if not toks:
            continue
        t = toks[0]
        first = t.split("/")[0]
        dp = decimals(first)
        if col in ("crank", "housing"):
            votes["in" if dp >= 4 else "mm"] += 1
        elif col == "length":
            votes["in" if dp == 3 else "mm"] += 1
        else:
            votes["in" if dp >= 4 else "mm"] += 1
        d[col] = t
    if not d:
        return None
    unit = "in" if votes["in"] >= votes["mm"] else "mm"
    return unit, d


def parse_range(t):
    m = RE_RANGE.match(t)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        return (min(a, b), max(a, b))
    v = num(t)
    return (v, v) if v is not None else None


def clean(s):
    return re.sub(r"\s+", " ", s).strip(" ,")


# ----------------------------------------------------------------------------------------------
# parser
# ----------------------------------------------------------------------------------------------
class Parser:
    def __init__(self, doc, pages, debug=False):
        self.doc = doc
        self.pages = pages
        self.debug = debug
        self.cols = None
        self.make = None
        self.mode = "index"
        self.panel = None
        self.panels = []
        self.cur = None
        self.sets = []  # set occurrences
        self.log = Counter()
        self.unknown = []
        self.makes_seen = OrderedDict()
        self.index_lines = 0

    # -- entry -------------------------------------------------------------------------------
    def run(self):
        for pno in self.pages:
            self.parse_page(pno)
        self.finish_set()
        return self.sets, self.panels

    def parse_page(self, pno):
        page = self.doc[pno - 1]
        printed = pno - PRINTED_OFFSET
        words = page_words(page)
        lines = make_lines(words)
        cols, hy = find_header(lines)
        if cols:
            self.cols = cols
        elif self.cols is None:
            self.log["page without header before any header"] += 1
            return
        else:
            self.log["page without header (reused previous columns)"] += 1
        c = self.cols
        # running head (make name) at the top of the page
        head = [w["t"] for w in words if w["y0"] < 60 and w["x0"] < 300]
        if head and not any(ch.isdigit() for ch in "".join(head)) and head[0] != "Engine":
            self.set_make(" ".join(head))
        for ln in lines:
            y = ln[0]["y0"]
            toks = [w["t"] for w in ln]
            if toks[:2] == ["Engine", "Index:"]:
                self.set_make(" ".join(toks[2:]))
                self.mode = "index"
                self.finish_set()
                continue
            if y < 62:
                continue
            if hy is not None and hy - 2 <= y <= hy + 14:
                continue  # header + Diameter/Thickness line
            if y > 700 and len(toks) == 1 and toks[0].isdigit():
                continue  # page number
            text = " ".join(toks)
            if self.is_engine_line(ln, toks):
                self.handle_engine(ln, toks, printed)
                continue
            if self.mode == "index":
                self.index_lines += 1
                continue
            first = ln[0]
            if c.col(first["x0"]) == "set" and self.set_number(toks):
                self.handle_set(ln, toks, printed)
                continue
            if self.mode == "engine":
                xs = [w["x0"] for w in ln]
                if all(c.set_x + 12 <= x < c.crank_x - 40 for x in xs) and self.panel and self.panel["engines"]:
                    self.panel["engines"][-1]["desc"] += " " + text
                    continue
                self.unknown.append((pno, "engine-mode", text))
                self.log["unknown line in engine mode"] += 1
                continue
            if self.mode == "set" and self.cur is not None:
                self.handle_set_subline(ln, toks, pno)
                continue
            self.unknown.append((pno, self.mode, text))
            self.log["unknown line (no current set)"] += 1

    def set_make(self, name):
        name = clean(name)
        if not name:
            return
        if name != self.make:
            self.make = name
            self.makes_seen.setdefault(name, 0)

    # -- engine lines --------------------------------------------------------------------------
    def is_engine_line(self, ln, toks):
        if "cyl" not in toks:
            return False
        i = toks.index("cyl")
        if i == 0 or not toks[i - 1].isdigit():
            return False
        return ("cc" in toks) or bool(RE_YEARS.search(" ".join(toks)))

    def handle_engine(self, ln, toks, printed):
        c = self.cols
        self.finish_set()
        panel_no = None
        if ln[0]["x0"] < c.set_x + 12 and toks[0].isdigit():
            panel_no = int(toks[0])
            toks = toks[1:]
            ln = ln[1:]
        i_cyl = toks.index("cyl")
        cyl = int(toks[i_cyl - 1])
        trailing = toks[i_cyl + 1:]
        toks = toks[:i_cyl - 1]
        cc = bore = stroke = None
        if "cc" in toks:
            i_cc = toks.index("cc")
            cc = num(toks[i_cc - 1]) if i_cc > 0 else None
            mid = toks[i_cc + 1:]
            toks = toks[:i_cc - 1]
        else:
            mid = []
            # bore X stroke sit right before cyl when cc is missing
            if len(toks) >= 3 and toks[-2] == "X":
                mid = toks[-3:]
                toks = toks[:-3]
        if len(mid) >= 3 and mid[1] == "X":
            bore, stroke = num(mid[0]), num(mid[2])
        head = " ".join(toks)
        y0 = y1 = None
        m = RE_YEARS.search(head)
        if m:
            y0 = int(m.group(2))
            y1 = int(m.group(4)) if m.group(4) else None
            desc = head[:m.start()] + head[m.end():]
        else:
            desc = head
        eng = {"desc": clean(desc), "y0": y0, "y1": y1, "cc": cc, "bore": bore, "stroke": stroke,
               "cyl": cyl, "make": self.make, "page": printed}
        if panel_no is not None or self.mode != "engine" or self.panel is None:
            if panel_no is None:
                self.log["engine line without panel number started a panel"] += 1
            self.panel = {"no": panel_no, "make": self.make, "page": printed, "engines": [], "sets": []}
            self.panels.append(self.panel)
            self.makes_seen[self.make] = self.makes_seen.get(self.make, 0) + 1
        self.panel["engines"].append(eng)
        self.mode = "engine"
        if trailing and not (len(trailing) == 1 and trailing[0].isdigit()):
            self.log["engine line trailing tokens"] += 1

    # -- set lines -----------------------------------------------------------------------------
    def set_number(self, toks):
        m = RE_SET1.match(toks[0])
        if m:
            return m.group(1), m.group(2), m.group(3), 1
        if len(toks) >= 2 and RE_SET_PREFIX.match(toks[0]):
            m2 = RE_SET_NUM.match(toks[1])
            if m2:
                return toks[0], m2.group(1), m2.group(2), 2
        return None

    def handle_set(self, ln, toks, printed):
        self.finish_set()
        prefix, number, suffix, used = self.set_number(toks)
        self.cur = {
            "p": f"{prefix}{number}{suffix}", "prefix": prefix, "suffix": suffix,
            "panel": self.panel, "page": printed, "undersize": [], "notes": [], "shells": [],
            "dims": [], "flange": OrderedDict(), "optionalTo": None,
        }
        self.mode = "set"
        self.handle_set_subline(ln[used:], toks[used:], None, first=True)

    def handle_set_subline(self, ln, toks, pno, first=False):
        c = self.cols
        cur = self.cur
        colmap = defaultdict(list)
        for w in ln:
            colmap[c.col(w["x0"])].append(w["t"])
        y = ln[0]["y0"] if ln else None
        left = colmap.get("set", []) + colmap.get("mid", [])
        # part / qty / pos tokens that are not part-like are really note text spilling right
        part_toks = colmap.get("part", [])
        part = " ".join(part_toks)
        if part and not RE_PART.match(part):
            # try joining a lone letter prefix with the number ("W 140/PR")
            left += part_toks
            part = ""
        qty_toks = colmap.get("qty", [])
        qty = None
        if qty_toks:
            if qty_toks[0].isdigit():
                n = int(qty_toks[0])
                unit = qty_toks[1] if len(qty_toks) > 1 else ""
                qty = {"n": n, "pairs": unit.lower().startswith("pair")}
                extra = [t for t in qty_toks[2:]]
            else:
                extra = qty_toks
            left += extra
        pos_toks = colmap.get("pos", [])
        pos = None
        if pos_toks:
            good = [t for t in pos_toks if re.match(r"^[\d,\-]+$", t)]
            bad = [t for t in pos_toks if t not in good]
            pos = "".join(good) if good else None
            left += bad
        dims = dims_from(colmap)
        # non-numeric spill into dims columns
        for col in ("crank", "housing", "length", "wall"):
            left += [t for t in colmap.get(col, []) if not (RE_RANGE.match(t) or RE_NUM.match(t))]
        # left-hand text: undersizes, flange rows, notes
        if left:
            if colmap.get("set") and len(left) >= 2 and (RE_FLANGE_ROW.match(left[0]) or re.match(r"^/\d{3}\d{3}$", left[0])) and RE_RANGE.match(left[1]) and not first:
                key = left[0]
                if re.match(r"^/\d{3}\d{3}$", key):  # printed artifact such as "/050010"
                    cur["notes"].append(f"flange row printed as {key}")
                    key = key[-3:]
                cur["flange"][key] = left[1]
                rest = left[2:]
                if rest:
                    cur["notes"].append(" ".join(rest))
            else:
                text = " ".join(left)
                tok0 = text.split()[0]
                if RE_UNDERSIZE.match(tok0) and ("/" in tok0 or len(text.split()) == 1 or first or not colmap.get("set")):
                    cur["undersize"].extend(u for u in tok0.split("/") if u)
                    rest = text.split()[1:]
                    if rest:
                        cur["notes"].append(" ".join(rest))
                else:
                    if text.startswith("Optional to"):
                        m = re.match(r"Optional to ((?:CR|MB|CS|TW) ?\d+[A-Z]*)", text)
                        if m:
                            cur["optionalTo"] = m.group(1).replace(" ", "")
                    cur["notes"].append(text)
        if pos and not part and not qty and cur["shells"] and cur["shells"][-1]["pno"] == pno                 and y is not None and cur["shells"][-1]["y"] is not None and 0 < y - cur["shells"][-1]["y"] <= 12                 and (cur["shells"][-1]["pos"] or "").endswith((",", "-")):
            cur["shells"][-1]["pos"] += pos  # wrapped crank-position list ("1,2,3,4," + "5")
        elif part or qty or pos:
            cur["shells"].append({"part": part or None, "qty": qty, "pos": pos, "y": y, "pno": pno,
                                  "in": None, "mm": None})
        if dims:
            unit, d = dims
            cur["dims"].append({"unit": unit, "d": d, "y": y, "pno": pno})
            if first:
                # dims on the set line belong to the shell on the same line
                pass

    def finish_set(self):
        cur = self.cur
        if cur is None:
            return
        self.cur = None
        # merge lower-half part numbers into the preceding shell
        shells = []
        for sh in cur["shells"]:
            if shells and sh["qty"] is None and sh["pos"] is None and sh["part"] and shells[-1]["part"] \
                    and sh["pno"] == shells[-1]["pno"] and sh["y"] is not None and shells[-1]["y"] is not None \
                    and 0 <= sh["y"] - shells[-1]["y"] <= 12:
                shells[-1]["part"] += "/" + sh["part"]
                continue
            shells.append(sh)
        # pair dims lines with shells (nearest in y on the same page)
        orphans = []
        for dl in cur["dims"]:
            best, bestd = None, 99
            for sh in shells:
                if sh["pno"] != dl["pno"] or sh["y"] is None or dl["y"] is None:
                    continue
                dy = abs(sh["y"] - dl["y"])
                if dy <= 9 and dy < bestd and sh[dl["unit"]] is None:
                    best, bestd = sh, dy
            if best is None:
                # second pass: allow a shell that already has this unit if nothing else is near
                orphans.append(dl)
            else:
                best[dl["unit"]] = dl["d"]
        if not shells and orphans:
            shells.append({"part": None, "qty": None, "pos": None, "y": None, "pno": None, "in": None, "mm": None})
        for dl in orphans:
            placed = False
            for sh in shells:
                if sh[dl["unit"]] is None:
                    sh[dl["unit"]] = dl["d"]
                    placed = True
                    break
            if not placed:
                self.log["dims line could not be attached to a shell"] += 1
        cur["shells"] = shells
        # de-dupe notes, join wrapped "Optional to ... (" + "[pMax Black])"
        notes = []
        for n in cur["notes"]:
            n = clean(n)
            if not n:
                continue
            if notes and (n.startswith("[") or notes[-1].endswith(("Trimetal", "Bimetal", "(")) or n.endswith("])")):
                notes[-1] = notes[-1] + " " + n
            else:
                notes.append(n)
        cur["notes"] = list(OrderedDict.fromkeys(notes))
        cur["undersize"] = list(OrderedDict.fromkeys(cur["undersize"]))
        if not cur["undersize"] and cur["flange"]:
            # flanged main sets list their undersizes only as the rows of the flange-length table
            cur["undersize"] = list(cur["flange"].keys())
            cur["undersizeFromFlangeTable"] = True
        if cur["panel"] is None:
            self.log["set without panel (skipped)"] += 1
            self.unknown.append((cur["page"], "set-no-panel", cur["p"]))
            return
        cur["panel"]["sets"].append(cur)
        self.sets.append(cur)


# ----------------------------------------------------------------------------------------------
# fitment families
# ----------------------------------------------------------------------------------------------
def near(v, target, tol=0.012):
    return v is not None and abs(v - target) <= tol


def panel_journals(panel):
    """Max inch crank diameter of the panel's main and rod sets (None if absent)."""
    out = {"main": None, "rod": None}
    for s in panel["sets"]:
        pos = SET_POSITION.get(s["prefix"])
        if pos not in ("main", "rod"):
            continue
        for sh in s["shells"]:
            if sh["in"] and "crank" in sh["in"]:
                r = parse_range(sh["in"]["crank"])
                h = parse_range(sh["in"]["housing"]) if "housing" in sh["in"] else None
                if h and r and h[1] and r[1] and h[1] < r[1]:
                    continue  # crank/housing columns swapped in print; do not infer from it
                if r and r[1] and r[1] > 0.5:
                    if out[pos] is None or r[1] > out[pos]:
                        out[pos] = r[1]
    return out


def engine_meta(e):
    d = e["desc"]
    m = RE_CID.match(d) or re.match(r"^(\d{3})([WC])\b", d)
    cid = int(m.group(1)) if m else None
    m2 = RE_LITER.search(d)
    liters = float(m2.group(1).replace(" ", "")) if m2 else None
    return cid, liters, d.upper()


def families(make, e, panel, journals, panel_cids):
    cid, liters, D = engine_meta(e)
    cyl, y0, y1 = e["cyl"], e["y0"], e["y1"]
    gas = "DIESEL" not in D
    mj, rj = journals["main"], journals["rod"]
    fams = []

    def add(f):
        if f not in fams:
            fams.append(f)

    def mj_is(v):
        return mj is None or near(mj, v)

    if make in ("General Motors", "Hummer"):
        bbc = near(mj, 2.75) and near(rj, 2.20)
        ls = near(mj, 2.559) and near(rj, 2.10)
        if "DURAMAX" in D:
            add("Duramax 6.6")
        elif cyl == 8 and cid in (348, 409):
            add("Chevy W-series 348/409")
        elif cyl == 8 and cid in (366, 396, 402, 427, 454, 502) and (bbc or (mj is None and near(rj, 2.20))):
            if (y0 or 0) <= 1990:
                add("Chevy Mark IV big block")
            if (y1 or 9999) >= 1991:
                add("Chevy Gen VI big block")
        elif cyl == 8 and (ls or (cid in (293, 294, 325, 346, 364, 376, 427) and
                                  (("GEN III" in D or "GEN IV" in D) or (mj is None and near(rj, 2.10))))):
            add("GM LS")
        elif cyl == 8 and cid in (368, 425, 472, 500):
            add("Cadillac 368-500")
        elif cyl == 8 and cid is not None:
            # GM V8 families the catalog does not name, resolved from the panel journals:
            # SBC 2.45/2.10 (2.30/2.00 small journal, 400: 2.65/2.10); Olds small 2.50/2.125,
            # Olds big 3.00/2.50; Pontiac 3.00/2.25 (326-400) and 3.25/2.25 (421-455);
            # Pontiac 265/301 3.00/2.00; Buick 300-350 3.00/2.00; Buick 400-455 3.25/2.25.
            if gas and cid in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400) and \
                    ((near(rj, 2.10) and (mj_is(2.45) or near(mj, 2.65))) or (near(rj, 2.00) and near(mj, 2.30))):
                add("Small-block Chevy")
            elif cid in (260, 307, 330, 350, 403) and near(rj, 2.125) and mj_is(2.50):
                add("Oldsmobile V8")
            elif near(rj, 2.50) and near(mj, 3.00):
                add("Oldsmobile V8")
            elif cid in (303, 324) and near(rj, 2.25):
                add("Oldsmobile V8")
            elif gas and cid in (265, 301) and near(rj, 2.00) and mj_is(3.00) and (y0 or 0) >= 1977:
                add("Pontiac V8")
            elif gas and cid in (300, 340, 350) and near(rj, 2.00) and mj_is(3.00):
                add("Buick 350")
            elif gas and near(rj, 2.25) and near(mj, 3.00) and cid in (326, 350, 389, 400):
                add("Pontiac V8")
            elif gas and near(rj, 2.25) and (cid in (287, 316, 347, 370) or panel_cids & {287, 316, 347, 370}) and mj is None:
                add("Pontiac V8")
            elif gas and near(rj, 2.25) and (cid in (421, 428) or panel_cids & {421, 428}) and mj_is(3.25):
                add("Pontiac V8")
            elif gas and near(rj, 2.25) and near(mj, 3.25) and cid in (400, 430, 455):
                add("Buick big block")
        elif cyl == 6 and cid in (194, 215, 230, 250, 292) and near(mj, 2.30) and (near(rj, 2.00) or near(rj, 2.10)):
            add("Chevy inline-6")
        elif cyl == 6 and cid in (181, 196, 198, 204, 225, 231, 252) and (near(rj, 2.25) or near(rj, 2.00)) and mj_is(2.50):
            add("Buick V6 181-252")
    elif make in ("Ford", "International", "International Truck"):
        diesel8 = (not gas) and cyl == 8
        fe = near(mj, 2.749) and near(rj, 2.4388)
        if "T444E" in D or (diesel8 and cid == 444) or ("7.3L DIRECT INJECTION" in D) or ("7.3" in D and "POWER" in D and diesel8):
            add("Powerstroke 7.3")
        elif "VT365" in D or (diesel8 and (cid == 365 or (liters == 6.0 and (y0 or 0) >= 2003))):
            add("Powerstroke 6.0")
        elif "MAXXFORCE 7" in D or (diesel8 and (cid == 391 or (liters == 6.4 and (y0 or 0) >= 2008))):
            add("Powerstroke 6.4")
        elif diesel8 and liters == 6.7 and (y0 or 0) >= 2011:
            add("Powerstroke 6.7")
        elif make == "International Truck" and re.search(r"\b6-(232|258)\b", D):
            add("AMC/Jeep inline-6")
        elif make == "Ford" and cyl == 8 and gas:
            if "99FR" in D or ("COYOTE" in D) or (cid == 302 and "DOHC" in D and (y0 or 0) >= 2011):
                add("Ford Coyote")
            elif cid in (281, 330, 415) and any(k in D for k in ("SOHC", "DOHC", "TRITON", "IN TECH", "MODULAR", "32 VALVES", "24 VALVES")) and "OHV" not in D:
                add("Ford Modular")
            elif "CLEVELAND" in D or "MODIFIED" in D or (cid == 400 and "OHV" in D):
                add("Ford 351C/351M/400")
            elif cid in (221, 255, 260, 289, 302) and "OHV" in D:
                add("Small-block Ford (Windsor)")
            elif cid == 351 and ("WINDSOR" in D or re.match(r"^351W\b", D)):
                add("Small-block Ford (Windsor)")
            elif cid in (330, 332, 352, 359, 360, 361, 389, 390, 391, 406, 410, 427, 428) and "OHV" in D and (fe or mj is None):
                add("Ford FE")
            elif cid in (370, 429, 460) and "OHV" in D:
                add("Ford 429/460")
        elif make == "Ford" and cyl == 10 and gas and cid == 415:
            add("Ford Modular")
        elif make == "Ford" and cyl == 6 and gas and cid in (240, 300) and "OHV" in D:
            add("Ford 240/300 inline-6")
    elif make in ("Chrysler", "Jeep", "American Motors", "Cummins"):
        amc_v8 = cid in (290, 304, 343, 360, 390, 401) and make in ("Jeep", "American Motors") and \
            (near(mj, 2.749) or near(rj, 2.0955) or near(rj, 2.248))
        if "CUMMINS" in D or make == "Cummins":
            six = cyl == 6
            is59 = cid == 359 or liters == 5.9 or "5.9" in D
            if six and (cid == 408 or liters == 6.7 or "6.7" in D):
                add("Cummins 6.7")
            elif six and is59 and ("24 VALVES" in D or "ISB" in D or "QSB" in D):
                add("Cummins 5.9 24V/CR")
            elif six and is59 and ("12 VALVES" in D or "6BT" in D or "6B" in D or (y1 or 9999) <= 1998):
                add("Cummins 5.9 12V")
        elif cyl == 8 and "HEMI" in D:
            if cid == 426:
                add("Chrysler 426 Hemi")
            elif cid in (345, 370) or liters in (5.7, 6.1):
                add("Chrysler Gen III Hemi 5.7/6.1")
            elif cid in (376, 392) or liters in (6.2, 6.4):
                add("Chrysler Gen III Hemi 6.2/6.4")
        elif cyl == 8 and gas and amc_v8:
            add("AMC V8")
        elif cyl == 8 and gas and "OHV" in D and cid in (273, 318, 340, 360) and make in ("Chrysler", "Jeep") and near(rj, 2.125):
            if (y0 or 0) <= 1991:
                add("Mopar LA small block")
            if cid in (318, 360) and (y1 or 9999) >= 1992:
                add("Mopar Magnum 5.2/5.9")
        elif cyl == 8 and gas and cid in (350, 361, 383, 400, 403, 413, 426, 440) and make == "Chrysler" and near(rj, 2.375):
            add("Mopar B/RB big block")
        elif cyl == 6 and gas and cid in (170, 198, 225) and near(mj, 2.75) and near(rj, 2.1875):
            add("Mopar Slant Six")
        elif cyl == 6 and gas and cid in (225, 231) and near(mj, 2.50) and (near(rj, 2.25) or near(rj, 2.00)):
            add("Buick V6 181-252")
        elif cyl == 6 and gas and cid in (199, 232, 242, 258) and "OHV" in D and make in ("Jeep", "American Motors") and near(mj, 2.50):
            add("AMC/Jeep inline-6")
        elif cyl == 8 and gas and make == "Jeep" and cid == 350 and near(mj, 3.00) and near(rj, 2.00):
            add("Buick 350")
    if not fams:
        fams.append(make or "Unknown make")
    return fams


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def shell_record(sh):
    r = OrderedDict()
    if sh["part"]:
        r["part"] = sh["part"]
    if sh["qty"]:
        r["pairs" if sh["qty"]["pairs"] else "pieces"] = sh["qty"]["n"]
    if sh["pos"]:
        r["journals"] = sh["pos"].rstrip(",-")
    for unit in ("in", "mm"):
        d = sh[unit]
        if not d:
            continue
        for col, key in (("crank", "journal"), ("housing", "housing"), ("length", "width"), ("wall", "thickness")):
            if col not in d:
                continue
            rng = parse_range(d[col])
            if rng is None:
                continue
            k = key + ("Mm" if unit == "mm" else "")
            if col in ("crank", "housing"):
                if rng[1] and rng[1] > 0:
                    r[k] = rng[1]
                    if rng[0] != rng[1]:
                        r[k + "Min"] = rng[0]
            else:
                if rng[1] and rng[1] > 0:
                    r[k] = rng[1]
    return r


def engine_note(e):
    bits = [e["desc"]]
    if e["y0"]:
        bits.append(f"{e['y0']}-{e['y1'] if e['y1'] else ''}")
    if e["cc"]:
        bits.append(f"{int(e['cc'])} cc")
    if e["bore"] and e["stroke"]:
        bits.append(f"{e['bore']:g} x {e['stroke']:g} mm")
    return ", ".join(bits)


def build_records(sets, panels):
    groups = OrderedDict()  # (p, fam) -> data
    conflicts = Counter()
    first_spec = {}
    fam_by_make = defaultdict(Counter)
    for s in sets:
        panel = s["panel"]
        journals = panel_journals(panel)
        panel_cids = set()
        for e in panel["engines"]:
            cid, _, _ = engine_meta(e)
            if cid:
                panel_cids.add(cid)
        for e in panel["engines"]:
            fams = families(panel["make"], e, panel, journals, panel_cids)
            for fam in fams:
                fam_by_make[panel["make"]][fam] += 1
                key = (s["p"], fam)
                g = groups.get(key)
                if g is None:
                    g = groups[key] = {"set": s, "fam": fam, "make": panel["make"], "engines": [],
                                       "pages": set(), "panels": set()}
                g["engines"].append(e)
                g["pages"].add(s["page"])
                g["panels"].add((panel["make"], panel["no"]))
        # spec consistency check across occurrences of the same set
        sig = json.dumps([shell_record(sh) for sh in s["shells"]], sort_keys=True)
        if s["p"] in first_spec and first_spec[s["p"]] != sig:
            conflicts[s["p"]] += 1
        first_spec.setdefault(s["p"], sig)

    records = []
    for (p, fam), g in groups.items():
        s = g["set"]
        pos = SET_POSITION[s["prefix"]]
        shells = [shell_record(sh) for sh in s["shells"]]
        shells = [sh for sh in shells if sh]
        main = next((sh for sh in shells if "journal" in sh or "housing" in sh), shells[0] if shells else {})
        spec = OrderedDict()
        spec["position"] = pos
        spec["series"] = s["suffix"] or None
        base = None
        for cand in (s["suffix"], s["suffix"][:2]):
            if cand in SERIES_MATERIAL:
                base = cand
                break
        spec["material"] = SERIES_MATERIAL.get(base) if base else None
        notes_l = " ".join(s["notes"]).lower()
        if "coated" in notes_l or ("coated" in notes_l):
            spec["coated"] = True
        for k in ("journal", "journalMin", "housing", "housingMin", "width", "thickness",
                  "journalMm", "journalMmMin", "housingMm", "housingMmMin", "widthMm", "thicknessMm"):
            if k in main:
                spec[k] = main[k]
        if "pairs" in main:
            spec["pairs"] = main["pairs"]
        elif "pieces" in main:
            spec["pieces"] = main["pieces"]
        if s["undersize"]:
            spec["undersize"] = s["undersize"]
            if s.get("undersizeFromFlangeTable"):
                spec["undersizeFromFlangeTable"] = True
        if s["optionalTo"]:
            spec["optionalTo"] = s["optionalTo"]
        if s["flange"]:
            spec["flangeLengthMm"] = OrderedDict(s["flange"])
        if len(shells) == 1:
            if shells[0].get("part"):
                spec["shell"] = shells[0]["part"]
            if shells[0].get("journals"):
                spec["journals"] = shells[0]["journals"]
        elif shells:
            spec["shells"] = shells
        if s["notes"]:
            spec["notes"] = "; ".join(s["notes"])
        # fitment
        engines = g["engines"]
        cids = sorted({engine_meta(e)[0] for e in engines if engine_meta(e)[0]})
        cyls = sorted({e["cyl"] for e in engines if e["cyl"]})
        y0s = [e["y0"] for e in engines if e["y0"]]
        y1s = [e["y1"] for e in engines if e["y1"]]
        open_ended = any(e["y0"] and not e["y1"] for e in engines)
        fit = OrderedDict()
        fit["fam"] = fam
        if cids:
            fit["ci"] = cids
        if len(cyls) == 1:
            fit["cyl"] = cyls[0]
        if y0s:
            fit["y0"] = min(y0s)
        if y1s and not open_ended:
            fit["y1"] = max(y1s)
        notes = list(OrderedDict.fromkeys(engine_note(e) for e in engines))
        prefix = "" if fam == g["make"] else g["make"] + ": "
        fit["notes"] = prefix + " | ".join(notes)
        # name
        if pos == "thrust":
            jn = f", {main['journal']:.4f} in crank" if "journal" in main else ""
            name = f"King thrust washer set{jn}"
        else:
            jn = f", {main['journal']:.4f} in journal" if main.get("journal") else ""
            ser = f", {s['suffix']} series" if s["suffix"] else ""
            name = f"King {POS_LABEL[pos]}{ser}{jn}"
        rec = OrderedDict()
        rec["m"] = BRAND
        rec["p"] = p
        rec["cat"] = "bearing"
        rec["name"] = name
        rec["fit"] = fit
        rec["spec"] = spec
        rec["src"] = OrderedDict([("doc", DOC), ("edition", EDITION), ("file", SRC_FILE),
                                  ("page", ", ".join(str(x) for x in sorted(g["pages"]))),
                                  ("panel", ", ".join(f"{m} {n}" for m, n in sorted(g["panels"], key=lambda t: (t[0], t[1] or 0))))])
        rec["emissions"] = None
        records.append(rec)

    def order(r):
        f = r["fit"]["fam"]
        if f in US_FAMILIES:
            return (0, US_FAMILY_ORDER.index(f), r["p"])
        return (1, f or "", r["p"])

    records.sort(key=order)
    return records, conflicts, fam_by_make


# ----------------------------------------------------------------------------------------------
# validation / QA
# ----------------------------------------------------------------------------------------------
def walk(obj, path, problems):
    if isinstance(obj, dict):
        for k, v in obj.items():
            walk(v, f"{path}.{k}", problems)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f"{path}[{i}]", problems)
    elif isinstance(obj, str):
        if obj == "":
            problems.append(f"empty string at {path}")
    elif isinstance(obj, bool) or obj is None:
        pass
    elif isinstance(obj, (int, float)):
        if obj != obj:
            problems.append(f"NaN at {path}")


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat", "fit", "src"):
            if k not in r or r[k] in (None, ""):
                problems.append(f"{r.get('p')}: missing {k}")
        if "fam" not in r["fit"] or not r["fit"]["fam"]:
            problems.append(f"{r['p']}: missing fit.fam")
        key = (r["p"], r["fit"]["fam"])
        if key in seen:
            problems.append(f"duplicate p within family: {key}")
        seen.add(key)
        for k in ("journal", "housing", "width", "thickness"):
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append(f"{r['p']}: spec.{k} not numeric")
        walk(r, r["p"], problems)
    return problems


def qa_checks(records):
    qa = Counter()
    examples = defaultdict(list)
    for r in records:
        sp = r["spec"]
        j, h, w, t = sp.get("journal"), sp.get("housing"), sp.get("width"), sp.get("thickness")
        if j and h and h <= j:
            qa["housing <= journal (print or parse error)"] += 1
            examples["housing <= journal"].append(r["p"])
        if t and t > 0.25:
            qa["wall thickness > 0.25 in (misprint, e.g. 0.7990)"] += 1
            examples["wall > 0.25"].append(r["p"])
        if j and h and t and abs((h - j) / 2 - t) > 0.012 and sp["position"] != "thrust":
            qa["(housing-journal)/2 differs from wall by > .012"] += 1
            examples["wall mismatch"].append(r["p"])
        if sp["position"] != "cam" and j is None and sp["position"] != "thrust":
            qa["main/rod set without crank diameter"] += 1
            examples["no journal"].append(r["p"])
        if not sp.get("undersize"):
            qa["no undersize list"] += 1
        if sp.get("material") is None:
            qa[f"series without material legend ({sp.get('series')})"] += 1
    return qa, examples


# ----------------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--pages", help="PDF page range a-b (default: all application pages)")
    ap.add_argument("--debug", action="store_true", help="write out/king_debug.json with raw sets and unknown lines")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    doc = pymupdf.open(args.pdf)
    if args.pages:
        a, b = (int(x) for x in args.pages.split("-"))
        pages = range(a, b + 1)
    else:
        pages = range(APP_FIRST, APP_LAST + 1)
    parser = Parser(doc, pages, debug=args.debug)
    sets, panels = parser.run()
    records, conflicts, fam_by_make = build_records(sets, panels)
    problems = validate(records)
    qa, qa_examples = qa_checks(records)
    os.makedirs(OUT, exist_ok=True)
    today = dt.date.today().isoformat()
    out = OrderedDict([
        ("source", OrderedDict([
            ("brand", "King Engine Bearings"), ("doc", DOC), ("edition", EDITION), ("file", SRC_FILE),
            ("pages", len(doc)), ("pagesUsed", f"PDF {pages.start}-{pages.stop - 1} (printed {pages.start - PRINTED_OFFSET}-{pages.stop - 1 - PRINTED_OFFSET})"),
            ("network", "none (manual PDF)")])),
        ("extracted", today), ("count", len(records)), ("parts", records)])
    with open(os.path.join(OUT, "king.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    if args.debug:
        dbg = {"unknown": parser.unknown[:2000], "log": parser.log,
               "sets": [{k: v for k, v in s.items() if k != "panel"} | {"panel": s["panel"]["no"], "make": s["panel"]["make"]} for s in sets[:3000]]}
        with open(os.path.join(OUT, "king_debug.json"), "w", encoding="utf-8") as f:
            json.dump(dbg, f, ensure_ascii=False, indent=1, default=str)
    write_notes(records, sets, panels, parser, conflicts, fam_by_make, problems, qa, qa_examples, today, pages)
    print(f"sets parsed: {len(sets)}  panels: {len(panels)}  records: {len(records)}  problems: {len(problems)}")
    for k, v in parser.log.most_common():
        print(f"  log: {v:6d}  {k}")
    if problems:
        print("VALIDATION PROBLEMS:")
        for p in problems[:40]:
            print("  ", p)


def write_notes(records, sets, panels, parser, conflicts, fam_by_make, problems, qa, qa_examples, today, pages):
    by_fam = Counter(r["fit"]["fam"] for r in records)
    by_pos = Counter(r["spec"]["position"] for r in records)
    by_series = Counter(r["spec"]["series"] for r in records)
    us_records = [r for r in records if r["fit"]["fam"] in US_FAMILIES]
    us_sets = {r["p"] for r in us_records}
    all_sets = {r["p"] for r in records}
    us_make_records = [r for r in records if r["fit"]["fam"] in US_MAKES]
    pos_us = Counter(r["spec"]["position"] for r in us_records)
    series_us = Counter(r["spec"]["series"] for r in us_records)
    fam_pos = defaultdict(Counter)
    for r in records:
        fam_pos[r["fit"]["fam"]][r["spec"]["position"]] += 1
    lines = []
    w = lines.append
    w(f"# King Engine Bearings — extraction notes ({today})")
    w("")
    w("## Source and method")
    w("")
    w(f"- File: `{SRC_FILE}` — King Engine Bearings catalog 2017-2018, Europe edition, 983 PDF pages,")
    w("  text layer (no OCR). Saved by hand into `Catalogs/`; no network used.")
    w(f"- Parsed PDF pages {pages.start}-{pages.stop - 1} (printed application pages {pages.start - PRINTED_OFFSET}-{pages.stop - 1 - PRINTED_OFFSET}, makes Acura → Volvo).")
    w("  The Numerical Listing (printed 589+) only maps set number → make/panel and the Interchange")
    w("  (printed 550-588) maps competitor numbers, so neither was needed; the \"King Racing Line\"")
    w("  pages (CLIV-CLXIX) are graphics with no text layer and contain no data to extract.")
    w("- Each page's columns are calibrated from its `King Set No. | Part No. | Qty. | Position |")
    w("  Crankshaft | Housing | Length | Wall` header; words are assigned to columns by x position")
    w("  (PyMuPDF `get_text(\"words\")`). The catalog prints ghost letters from a hidden layer on top")
    w("  of engine descriptions; they are removed by bounding-box overlap.")
    w("- A panel = engine description line(s) (`NNN CID ... years cc bore X stroke cyl`) followed by")
    w("  set rows. Set rows start with `CR` (rod), `MB` (main), `CS` (cam) or `TW` (thrust washer);")
    w("  undersizes follow the set number; shell part numbers, qty, crank positions and dimensions")
    w("  (inch line, mm line) are paired to shells by vertical proximity. Panels and sets continue")
    w("  across page breaks.")
    w("- `p` is the King set number with the catalog's inner space removed (`CR 439AM` → `CR439AM`).")
    w("- `spec.journal`/`housing` are the maximum (nominal) inch values of the printed min/max crank")
    w("  and housing diameters; `journalMin`/`housingMin` keep the minimum; `*Mm` keys carry the mm")
    w("  values. `width` is the catalog's bearing length and `thickness` the wall at crown (inches).")
    w("  Thrust washers have no length in the catalog (printed 0.000); for a thrust washer set")
    w("  `journal` is the crank thrust-face diameter range and `housing` the washer's outer seat.")
    w("  Flanged main sets carry the flange shell (`F...`) as an extra entry in `spec.shells`;")
    w("  when the catalog lists undersizes only as rows of the flange-length table,")
    w("  `undersizeFromFlangeTable: true` is set.")
    w("- `spec.undersize` keeps the catalog tokens: decimals are mm (`0.25`, `0.5`), three-digit")
    w("  tokens are inch thousandths (`010` = .010\"), `STDX`/`...X` = extra clearance, `STDG`/`STDR`")
    w("  as printed. `flangeLengthMm` is the catalog's \"crank flange length mm\" table by undersize.")
    w("- `spec.series` is the set-number suffix; `material` comes from the catalog's material legend")
    w("  (pp XI-XIV) for the base code (AM, SI, SM, CA, CP, XA, SX, SV, SP, HP, XP, GP). Composite")
    w("  racing suffixes (XPC, XPN, XPND, XPNC, XPG, HPN, HPND, HPT) are mapped by their first two")
    w("  letters; what the extra letters mean is only given by the row notes (`narrow`, `narrow,")
    w("  with dowel hole`, `(high performance, coated)`), which are kept in `spec.notes`. The catalog")
    w("  never prints the trade name pMaxKote; `coated: true` is set when the row note says coated.")
    w("  `BB`/`BX`/`BBX` (cam bearings) are not in the legend → material null.")
    w("- Families: one record per (set, family). GM/Mopar/Jeep V8 and six families that the")
    w("  catalog does not name (Chevy vs Olds vs Pontiac vs Buick 350; slant six vs Buick 225 V6 in")
    w("  Jeeps) are resolved from the panel's own main/rod journal diameters; big-block Chevy")
    w("  panels spanning 1965-1999 get both Mark IV and Gen VI records; Chrysler 318/360 panels")
    w("  spanning 1992+ get both LA and Magnum records. Engines with no engine-build family keep")
    w("  the catalog make heading as `fit.fam` (listed below).")
    w("")
    w("## Counts")
    w("")
    w(f"- Panels parsed: {len(panels)} across {len(parser.makes_seen)} makes; set occurrences: {len(sets)};")
    w(f"  distinct set numbers: {len(all_sets)}; records (set × family): {len(records)}.")
    w(f"- Records in US engine-build families: {len(us_records)} ({len(us_sets)} distinct set numbers);")
    w(f"  records left under a US make heading with no family: {len(us_make_records)};")
    w(f"  records under European/import make headings: {len(records) - len(us_records) - len(us_make_records)}.")
    w("")
    w("### By position")
    w("")
    w("| position | all records | US-family records |")
    w("|---|---:|---:|")
    for k in ("main", "rod", "cam", "thrust"):
        w(f"| {k} | {by_pos.get(k, 0)} | {pos_us.get(k, 0)} |")
    w("")
    w("### By series (set-number suffix)")
    w("")
    w("| series | all records | US-family records | material (legend) |")
    w("|---|---:|---:|---|")
    for k, v in by_series.most_common():
        base = k if k in SERIES_MATERIAL else (k[:2] if k and k[:2] in SERIES_MATERIAL else None)
        w(f"| {k} | {v} | {series_us.get(k, 0)} | {SERIES_MATERIAL.get(base, '—') if base else '—'} |")
    w("")
    w("### By family (US engine-build families)")
    w("")
    w("| family | records | main | rod | cam | thrust |")
    w("|---|---:|---:|---:|---:|---:|")
    for f in US_FAMILY_ORDER:
        if by_fam.get(f):
            fp = fam_pos[f]
            w(f"| {f} | {by_fam[f]} | {fp.get('main', 0)} | {fp.get('rod', 0)} | {fp.get('cam', 0)} | {fp.get('thrust', 0)} |")
    missing = [f for f in US_FAMILY_ORDER if not by_fam.get(f)]
    w("")
    w("US families with no King set in this edition: " + ", ".join(missing) + ".")
    w("")
    w("### US makes: engines left under the make heading (no engine-build family)")
    w("")
    w("| make | engine lines mapped to a family | records left under the make heading |")
    w("|---|---:|---:|")
    for mk in sorted(US_MAKES):
        fr = sum(v for f, v in fam_by_make[mk].items() if f in US_FAMILIES)
        hr = by_fam.get(mk, 0)
        w(f"| {mk} | {fr} | {hr} |")
    w("")
    w("Notable US engines deliberately left under the make heading because the engine-build family")
    w("list has no slot for them: Ford Y-block 239-312 and 6.9/7.3 IDI diesels, Ford 144-250 small")
    w("sixes, 2.3 Lima/HSC, Vulcan/Essex/Duratec V6; Chrysler poly A 277-326 (shares the LA panel),")
    w("3.9 Magnum V6, 4.7 PowerTech, Viper V10, 2.7/3.2/3.5 V6; GM 2.5 Iron Duke, Chevy 90-degree V6")
    w("(200-262), 6.2/6.5 Detroit diesel, 8.1 Vortec (Gen VII), Northstar, Cadillac HT4100/4.5/4.9,")
    w("Buick/Olds 215 aluminum V8, stovebolt 235/261; AMC 150 four; Jeep 134/226/230 and 3.7;")
    w("International/International Truck IDI 6.9/7.3 and tractor diesels; Cummins 4B, ISF and C/8.3.")
    w("")
    w("### Catalog headings used as fit.fam (European / import / other)")
    w("")
    others = [(f, v) for f, v in sorted(by_fam.items()) if f not in US_FAMILIES]
    w(", ".join(f"{f} ({v})" for f, v in others))
    w("")
    w("## Skipped / parser log")
    w("")
    w(f"- Engine Index lines skipped (engine → panel cross-reference, redundant with the panels): {parser.index_lines}.")
    for k, v in parser.log.most_common():
        w(f"- {k}: {v}")
    if parser.unknown:
        w(f"- Unclassified lines (first 25 of {len(parser.unknown)}):")
        for pno, mode, text in parser.unknown[:25]:
            w(f"  - PDF p{pno} [{mode}]: {text[:110]}")
    w("")
    w("## QA")
    w("")
    w(f"- Validation problems: {len(problems)}" + ("" if not problems else " — " + "; ".join(problems[:10])))
    w(f"- Set numbers whose dimensions differ between panels (first occurrence kept): {len(conflicts)}"
      + (" — " + ", ".join(list(conflicts)[:15]) if conflicts else ""))
    for k, v in qa.most_common():
        w(f"- {k}: {v}")
    for k, ex in qa_examples.items():
        w(f"  - {k}: {', '.join(sorted(set(ex))[:12])}")
    w("- Catalog misprints are kept as printed (e.g. a cam-shell wall of 0.7990 in / 20.295 mm on the")
    w("  GM Gen III/IV CS5171 rows, a 2.6500/2.1670 crank range on CS5503); see the QA counts above.")
    w("- `spec.shells` for multi-shell sets (upper/lower halves, flange shell, thrust washers listed")
    w("  under one set number, e.g. MB5283XP) is best-effort: wrapped position lists and lower-half")
    w("  rows without dimensions can appear as extra entries. Top-level journal/housing/width/")
    w("  thickness always come from the first shell that carries dimensions.")
    w("- Year spans come from the catalog's month/year ranges per engine; open-ended ranges drop `y1`.")
    w("- Edition is European 2017-2018: US coverage ends around model year 2010-2012, so there are no")
    w("  Gen V LT, Coyote Gen 2+, Godzilla, Gen III Hemi 6.4, Powerstroke 6.7 or Cummins 6.7 (2013+) rows")
    w("  unless listed in the family table above.")
    with open(os.path.join(OUT, "king.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
