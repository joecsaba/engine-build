#!/usr/bin/env python3
"""Extract CLEVITE engine bearings from the MAHLE Aftermarket light-vehicle catalog EB-20-26.

Source: `Catalogs/eb-20-26_web.pdf` (Engine Bearings Light Vehicle 2026, catalog EB-20-26, 1,007 PDF
pages, text layer; saved by hand, no network). Output: out/clevite.json (shared parts record
format) and out/clevite.md (notes).

Layout ("How to use this catalog", printed pp 4-5): makes are alphabetical (printed pp 98-974 =
PDF pp 99-975). Each make opens with an engine-data table and a model table (8 pt rows, skipped:
they only cross-reference engine -> block number), then numbered blocks. A block = one or more
engine lines (9 pt bold: `5.7L 350 CID OHV 16V V8 General Motors Chevrolet VIN Code: 'L'
(1977-1981)` with bore x stroke at the right) followed by bearing rows under the COUNTER DATA /
SHOP DATA header: position label, material designation, part number (bold = orderable set/pair,
regular = individual shell contained in the set above), available undersizes, standard shaft
diameter, vertical oil clearance, max wall, housing bore, max length (all inches). `NOTE:` and
`For Years:` lines belong to the row above. Blocks continue across pages ("(cont.)").

The page-layout logic reuses the shop tool's extractor (C:\\Enoch Shop\\server\\tools\\
clevite_extract.py, read only): column x's from the header labels, rows grouped by y, block
numbers as 9.8 pt digits at the left. Added here: wrapped cells (`2.10385/2.104` + `80`,
`.7` + `5mm`), multi-range VIN-code years, set-level `For Years`, bold/regular part-number
font to tell sets from shells, families, records and QA.

One `bearing` record per (printed part number, fitment family). Engines of the same family that
use the same part are aggregated (ci list, year span, descriptions in fit.notes). Engines that do
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
SRC_FILE = "Catalogs/eb-20-26_web.pdf"
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "eb-20-26_web.pdf")
SHOP_JSON = r"C:\Enoch Shop\server\data\clevite-bearings.json"  # read only, cross-check
BRAND = "Clevite"
DOC = "MAHLE Aftermarket CLEVITE Engine Bearings Light Vehicle catalog EB-20-26 (PDF, manual download)"
EDITION = "2026"
APP_FIRST, APP_LAST = 99, 975      # PDF pages of the application section (printed 98-974)
NUM_FIRST, NUM_LAST = 976, 1005    # numerical listings (printed 975-1004), used for QA only
PRINTED_OFFSET = 1                 # printed page = PDF page - 1

# Part-number legend, printed p26 ("Part number identification") and p27 (material designations).
PREFIX_POSITION = {"CB": "rod", "MS": "main", "MB": "main", "SH": "cam", "TW": "thrust", "223": "pinBushing",
                   "SM": "shim"}
SUFFIX_LEGEND = {
    "A": "steel-backed lead-free aluminum-silicon alloy, no overlay",
    "AL": "solid cast aluminum (AL-1) or steel-backed aluminum alloy lining (AL-3/4/5/6)",
    "AP": "A and P materials in one set (see A and P)",
    "B": "steel-backed conventional babbitt lining",
    "C": "steel-backed copper-lead lining",
    "G": "steel-backed copper matrix with lead-tin babbitt infiltrant",
    "P": "steel-backed copper-lead intermediate layer with electroplated lead-tin-copper overlay (TM-1/TM-77/TM-112)",
    "R": "resizable to standard (cam bearing: extra bore stock in the ID)",
    "S": "set number",
    "W": "thrust washer",
}
MATERIAL_LEGEND = {
    "AL-1": "solid cast aluminum alloy",
    "AL-3": "steel-backed aluminum alloy without overlay",
    "AL-4": "steel-backed aluminum alloy with babbitt overlay",
    "AL-5": "steel-backed lead-free aluminum-silicon alloy without overlay",
    "AL-6": "steel-backed aluminum-silicon alloy without overlay",
    "B": "rolled bronze",
    "B-1": "steel-backed tin or lead base conventional babbitt (nominal .020 in)",
    "B-2": "steel-backed tin or lead base micro-babbitt lining (nominal .006 in)",
    "C-1": "steel-backed copper-lead matrix without overlay",
    "TM-1": "steel-backed copper-lead matrix with overlay",
    "TM-77": "steel-backed copper-lead intermediate layer with electroplated lead-base overlay (trimetal)",
    "TM-112": "steel-backed copper-lead intermediate layer with electroplated lead-base overlay (trimetal)",
    "Steel back/alloy": "steel-backed alloy thrust washer",
}

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
US_MAKES = {"AM GENERAL TRUCK", "AMERICAN MOTORS", "AVANTI", "CHRYSLER", "CHRYSLER TRUCK", "DODGE",
            "DODGE TRUCK", "FORD", "FORD TRUCK", "GMC", "GMC TRUCK", "JEEP TRUCK", "RAM TRUCK", "SRT",
            "STUDEBAKER"}
MAKE_GROUP = {"GMC": "GM", "GMC TRUCK": "GM", "AM GENERAL TRUCK": "GM", "AVANTI": "GM",
              "FORD": "Ford", "FORD TRUCK": "Ford",
              "CHRYSLER": "Chrysler", "CHRYSLER TRUCK": "Chrysler", "DODGE": "Chrysler", "DODGE TRUCK": "Chrysler",
              "RAM TRUCK": "Chrysler", "SRT": "Chrysler", "JEEP TRUCK": "Chrysler",
              "AMERICAN MOTORS": "AMC"}

COLS = {  # header label -> column name (labels are the second line of each two-line header)
    "POSITION": "pos", "MATERIAL": "mat", "NUMBER": "part", "UNDERSIZES": "us",
    "DIAMETER": "shaft", "CLEARANCE": "clear", "WALL": "wall", "BORE": "housing", "LENGTH": "len",
}
DATA_COLS = ("us", "shaft", "clear", "wall", "housing", "len")

RE_PART = re.compile(r"^(CB|MS|MB|SH|TW|SM|223)-?(\d{2,6})([A-Z]{0,4}\d?)(\((\d+|F)\))?$")
RE_RANGE = re.compile(r"^(\d*\.\d+)/(\d*\.\d+)$")
RE_RANGE_TRUNC = re.compile(r"^(\d*\.\d+)/$")  # printed truncated ("1.8898/"): one value known
RE_NUM = re.compile(r"^\d*\.\d+$")
RE_ENGINE_START = re.compile(r"^(\d+\.\d+L|\d+ CID|\d+ CC)(\s|$)")
RE_BORE_STROKE = re.compile(r'^(\d+\.\d+)"/([\d.]+)mm x (\d+\.\d+)"/([\d.]+)mm$')
RE_PAREN = re.compile(r"\(([^()]*)\)")
RE_YEAR = re.compile(r"\b(19\d\d|20\d\d)\b")
RE_FOR_YEARS = re.compile(r"^For Years:\s*(.*)$")


def fnum(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def rng(s):
    m = RE_RANGE_TRUNC.match(s or "")
    if m:
        return [float(m.group(1)), float(m.group(1))]
    m = RE_RANGE.match(s or "")
    if not m or not m.group(2):
        return None
    a, b = float(m.group(1)), float(m.group(2))
    return [min(a, b), max(a, b)]


def clean(s):
    return re.sub(r"\s+", " ", s or "").strip(" ,")


# ----------------------------------------------------------------------------------------------
# page geometry (from the shop extractor)
# ----------------------------------------------------------------------------------------------
def page_lines(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            t = " ".join(s["text"] for s in l["spans"]).strip()
            out.append({"x": l["bbox"][0], "y": l["bbox"][1], "size": spans[0]["size"],
                        "bold": "Bold" in spans[0]["font"], "text": t})
    return out


def columns(lines):
    cols = {}
    for l in lines:
        if l["text"] in COLS and l["size"] < 8:
            cols[COLS[l["text"]]] = l["x"]
    return cols if len(cols) >= 8 else None


def col_of(x, cols):
    best, dist = None, 1e9
    for name, cx in cols.items():
        d = abs(x - cx)
        if d < dist:
            best, dist = name, d
    return best if dist < 12 else None


# ----------------------------------------------------------------------------------------------
# parser
# ----------------------------------------------------------------------------------------------
class Parser:
    def __init__(self, doc, pages):
        self.doc = doc
        self.pages = pages
        self.blocks = []
        self.cur = None       # current block
        self.part = None      # current set/pair row
        self.last_row = None  # last data row dict (set or shell) for wrapped cells
        self.last_y = None
        self.last_pno = None
        self.maker = None
        self.log = Counter()
        self.unknown = []
        self.makers = OrderedDict()

    cache = None  # optional {pno: lines} dict (--cache) to skip PyMuPDF text extraction on reruns

    def lines_of(self, pno):
        if self.cache is not None and pno in self.cache:
            return self.cache[pno]
        lines = page_lines(self.doc[pno - 1])
        if self.cache is not None:
            self.cache[pno] = lines
        return lines

    def run(self):
        for pno in self.pages:
            self.parse_page(pno)
        return [b for b in self.blocks if b["parts"]]

    def parse_page(self, pno):
        lines = self.lines_of(pno)
        cols = columns(lines)
        makers = sorted((l["y"], clean(l["text"])) for l in lines if l["size"] >= 14 and clean(l["text"]))
        if makers and makers[0][0] < 95:
            self.maker = makers[0][1]
            self.makers.setdefault(self.maker, 0)
        if not cols:
            if any(9.3 <= l["size"] <= 10.3 and l["text"].isdigit() and l["x"] < 130 for l in lines):
                self.log["page with block numbers but no column header (skipped)"] += 1
                self.unknown.append((pno, "no-header", ""))
            else:
                self.log["page without bearing rows (index tables)"] += 1
            return
        # A page can carry two sections: a make's last blocks, then the next make's heading (15 pt,
        # mid-page), its engine/model tables and a second column header. Each header starts a segment
        # that runs to the next 15 pt heading; the segment's make is the last heading above it.
        header_ys = sorted(l["y"] for l in lines if l["text"] == "POSITION" and l["size"] < 8)
        if len(header_ys) > 1:
            self.log["page with two column headers (two makes)"] += 1
        for hy in header_ys:
            above = [mk for y, mk in makers if y < hy]
            if above:
                self.maker = above[-1]
                self.makers.setdefault(self.maker, 0)
            below = [y for y, _ in makers if y > hy]
            seg_end = min(below) - 1 if below else 750
            header_bottom = hy + 14
            body = sorted((l for l in lines if header_bottom < l["y"] < seg_end), key=lambda l: (round(l["y"]), l["x"]))
            self.parse_rows(body, cols, pno)

    def parse_rows(self, body, cols, pno):
        rows, last_y = [], None
        for l in body:
            if last_y is None or abs(l["y"] - last_y) > 2.5:
                rows.append([])
            rows[-1].append(l)
            last_y = l["y"]
        pending_pos = None
        for row in rows:
            texts = [l["text"] for l in row]
            y = row[0]["y"]
            # block number: 9.8 pt digits at the left (repeated at the right)
            big = [l for l in row if 9.3 <= l["size"] <= 10.3 and l["text"].isdigit() and l["x"] < cols["mat"]]
            if big:
                num = int(big[0]["text"])
                if self.cur is not None and self.cur["maker"] == self.maker and self.cur["block"] == num:
                    self.cur["pages"].add(pno - PRINTED_OFFSET)
                else:
                    self.cur = {"maker": self.maker, "block": num, "engines": [], "parts": [],
                                "page": pno - PRINTED_OFFSET, "pages": {pno - PRINTED_OFFSET}}
                    self.blocks.append(self.cur)
                    self.makers[self.maker] = self.makers.get(self.maker, 0) + 1
                    self.part = None
                    self.last_row = None
                    pending_pos = None
            if self.cur is None:
                self.log["row before any block on the page (skipped)"] += 1
                continue
            # engine lines: 9 pt bold
            eng = [l for l in row if 8.6 <= l["size"] <= 9.4 and l["bold"]]
            data = [l for l in row if 7.2 <= l["size"] <= 7.8]
            for l in eng:
                t = l["text"]
                if t.endswith("CYL") or t.endswith("(cont.)") or t in ("COUNTER DATA", "SHOP DATA"):
                    continue
                bs = RE_BORE_STROKE.match(t)
                if bs:
                    if self.cur["engines"]:
                        e = self.cur["engines"][-1]
                        if e.get("bore") is None:
                            e["bore"], e["boreMm"] = float(bs.group(1)), float(bs.group(2))
                            e["stroke"], e["strokeMm"] = float(bs.group(3)), float(bs.group(4))
                    continue
                if l["x"] > cols["shaft"]:
                    self.log["engine-size text at the right (ignored)"] += 1
                    continue
                if RE_ENGINE_START.match(t) or not self.cur["engines"]:
                    self.cur["engines"].append({"name": t})
                else:
                    e = self.cur["engines"][-1]
                    e["name"] += ("" if e["name"].endswith("-") and t[:1].isdigit() else " ") + t
            if not data:
                continue
            cells = OrderedDict()
            bold_part = False
            for l in data:
                c = col_of(l["x"], cols)
                if c is None:
                    self.log["7.5 pt text outside the columns"] += 1
                    self.unknown.append((pno, "nocol", l["text"]))
                    continue
                cells[c] = (cells.get(c, "") + " " + l["text"]).strip()
                if c == "part" and l["bold"]:
                    bold_part = True
            if not cells:
                continue
            close = self.last_y is not None and self.last_pno == pno and 0 < y - self.last_y <= 11.5
            first = data[0]
            # NOTE / For Years lines (position column, bold)
            if "pos" in cells and (cells["pos"].startswith("NOTE:") or cells["pos"].startswith("For Years")):
                if self.part is not None:
                    m = RE_FOR_YEARS.match(cells["pos"])
                    if m:
                        self.part["forYears"] = clean(m.group(1))
                        self.part["_noting"] = "years"
                    else:
                        self.part["notes"].append(cells["pos"][5:].strip())
                        self.part["_noting"] = "note"
                    extra = [v for k, v in cells.items() if k != "pos"]
                    if extra:
                        self.log["note row with cells in other columns"] += 1
                else:
                    self.log["note without a current part"] += 1
                self.last_y, self.last_pno = y, pno
                continue
            if "part" not in cells:
                # continuation of a note / For Years (wrapped text at the position column)
                if self.part is not None and self.part.get("_noting") and list(cells) == ["pos"] and close:
                    if self.part["_noting"] == "years":
                        self.part["forYears"] += " " + cells["pos"]
                    else:
                        self.part["notes"][-1] += " " + cells["pos"]
                    self.last_y, self.last_pno = y, pno
                    continue
                # second line of a position label ("Bearing Set") or a material ("back/alloy"), possibly
                # together with wrapped data cells (undersizes `.7`+`5mm`, shaft `2.10385/2.104`+`80`)
                if self.part is not None and close and not self.part.get("_noting") and self.last_row is not None:
                    label_ok = self.last_row is self.part or not (set(cells) & {"pos", "mat"})
                    if label_ok:
                        if "pos" in cells:
                            self.part["position"] += " " + cells["pos"]
                        if "mat" in cells:
                            self.part["material"] = ((self.part["material"] or "") + " " + cells["mat"]).strip()
                        wrapped = False
                        for k, v in cells.items():
                            if k in DATA_COLS:
                                self.last_row["cells"][k] = (self.last_row["cells"].get(k, "") + v).replace(" ", "")
                                wrapped = True
                        if wrapped:
                            self.log["wrapped cell joined to the row above"] += 1
                        self.last_y, self.last_pno = y, pno
                        continue
                if "pos" in cells and len(cells) == 1:
                    pending_pos = (pending_pos + " " + cells["pos"]) if pending_pos else cells["pos"]
                    self.last_y, self.last_pno = y, pno
                    continue
                self.log["unclassified row"] += 1
                self.unknown.append((pno, "row", " | ".join(f"{k}={v}" for k, v in cells.items())))
                self.last_y, self.last_pno = y, pno
                continue
            pn = cells["part"].replace(" ", "")
            if pn.endswith("in") and RE_PART.match(pn[:-2]):
                pn = pn[:-2]  # printed "SH315in" (stray 'in' after a cam shell number)
                self.log["trailing 'in' stripped from a part number"] += 1
            if not RE_PART.match(pn):
                self.log["part cell not part-like"] += 1
                self.unknown.append((pno, "part", cells["part"]))
                self.last_y, self.last_pno = y, pno
                continue
            if self.part is not None:
                self.part["_noting"] = None
            if bold_part or "pos" in cells or pending_pos:
                pos = cells.get("pos") or pending_pos or ""
                if pending_pos and cells.get("pos"):
                    pos = pending_pos + " " + cells["pos"]
                self.part = {"position": pos, "material": cells.get("mat"), "pn": pn, "cells": cells,
                             "shells": [], "notes": [], "page": pno - PRINTED_OFFSET, "bold": bold_part,
                             "_noting": None}
                if not bold_part:
                    self.log["set row with regular-weight part number"] += 1
                self.cur["parts"].append(self.part)
                self.last_row = self.part
                pending_pos = None
            else:
                if self.part is None:
                    self.log["shell row without a set (skipped)"] += 1
                    self.unknown.append((pno, "shell-no-set", pn))
                else:
                    sh = {"pn": pn, "cells": cells, "material": cells.get("mat")}
                    self.part["shells"].append(sh)
                    self.last_row = sh
            self.last_y, self.last_pno = y, pno


# ----------------------------------------------------------------------------------------------
# post-processing of blocks
# ----------------------------------------------------------------------------------------------
def parse_years(text):
    """All 4-digit years inside parentheses -> (min, max) or (None, None)."""
    ys = []
    for grp in RE_PAREN.findall(text):
        ys += [int(y) for y in RE_YEAR.findall(grp)]
    if not ys:
        return None, None
    return min(ys), max(ys)


def finish_engine(e):
    name = clean(e["name"])
    y0, y1 = parse_years(name)
    vin = None
    m = re.search(r"\bVIN Code:\s*(.*)$", name)
    if m:
        vin = clean(m.group(1))
        base = name[:m.start()]
    else:
        base = name
    # trailing year group(s) on the base
    base = clean(RE_PAREN.sub(lambda mm: "" if RE_YEAR.search(mm.group(1)) else mm.group(0), base))
    D = base.upper()
    m = re.match(r"^(\d+\.\d+)L\b", base)
    liters = float(m.group(1)) if m else None
    m = re.search(r"\b(\d{2,3}) CID\b", base)
    cid = int(m.group(1)) if m else None
    m = re.search(r"\b(\d{3,5}) CC\b", base)
    cc = int(m.group(1)) if m else None
    if cid is None and cc:
        cid = int(round(cc / 16.387))
        e["cidFromCc"] = True
    m = re.search(r"\b([LVHWF])(\d{1,2})\b", base)
    cyl = int(m.group(2)) if m else None
    layout = m.group(1) if m else None
    m = re.search(r"\b(\d{1,2})V\b", base)
    valves = int(m.group(1)) if m else None
    head = next((k for k in ("DOHC", "SOHC", "OHV") if re.search(rf"\b{k}\b", D)), None)
    diesel = "DIESEL" in D or "TURBO" in D and "DIESEL" in D
    e.update({"desc": base, "vin": vin, "y0": y0, "y1": y1, "liters": liters, "cid": cid, "cc": cc,
              "cyl": cyl, "layout": layout, "valves": valves, "head": head, "diesel": diesel})
    return e


def finish_part(p):
    cells = p["cells"]
    m = RE_PART.match(p["pn"])
    p["prefix"], p["number"], p["suffix"], p["qualifier"] = m.group(1), m.group(2), m.group(3), m.group(5)
    us = cells.get("us", "").replace(" ", "")
    p["undersize"] = [u for u in us.split(",") if u]
    p["dims"] = dims(cells)
    for sh in p["shells"]:
        m2 = RE_PART.match(sh["pn"])
        sh["suffix"], sh["qualifier"] = m2.group(3), m2.group(5)
        sh["dims"] = dims(sh["cells"])
        sh["undersize"] = [u for u in sh["cells"].get("us", "").replace(" ", "").split(",") if u]
    pos = p["position"].lower()
    pm = re.search(r"\((\d+)\)", p["position"])
    p["pieces"] = int(pm.group(1)) if pm else (int(p["qualifier"]) if p["qualifier"] and p["qualifier"].isdigit() else None)
    if "rod" in pos:
        kind = "rod"
    elif "main" in pos:
        kind = "main"
    elif "camshaft" in pos or "cam " in pos:
        kind = "cam"
    elif "thrust" in pos:
        kind = "thrust"
    elif "balance" in pos:
        kind = "balanceShaft"
    elif "auxiliary" in pos:
        kind = "auxShaft"
    elif "pin" in pos or "bushing" in pos:
        kind = "pinBushing"
    else:
        kind = PREFIX_POSITION.get(p["prefix"], "other")
    p["kind"] = kind
    if "pair" in pos:
        p["pack"] = "pair"
    elif "set" in pos:
        p["pack"] = "set"
    elif p["prefix"] in ("MB", "223") or (p["prefix"] == "SH" and not p["suffix"].endswith("S")):
        p["pack"] = "individual"
    else:
        p["pack"] = "set"
    p["notes"] = [clean(n) for n in p["notes"] if clean(n)]
    p.pop("_noting", None)
    p.pop("cells", None)
    for sh in p["shells"]:
        sh.pop("cells", None)
    return p


def dims(cells):
    d = OrderedDict()
    r = rng(cells.get("shaft"))
    if r:
        d["journal"], d["journalMin"] = r[1], r[0]
    elif RE_NUM.match(cells.get("shaft", "")):
        d["journal"] = float(cells["shaft"])
    c = rng(cells.get("clear"))
    if c:
        d["clearance"] = c
    if RE_NUM.match(cells.get("wall", "")):
        d["thickness"] = float(cells["wall"])
    h = rng(cells.get("housing"))
    if h:
        d["housing"], d["housingMin"] = h[1], h[0]
    elif RE_NUM.match(cells.get("housing", "")):
        d["housing"] = float(cells["housing"])
    if RE_NUM.match(cells.get("len", "")):
        d["width"] = float(cells["len"])
    for k in ("shaft", "clear", "wall", "housing", "len"):
        v = cells.get(k, "")
        if v and not (RE_RANGE.match(v) or RE_NUM.match(v)):
            if RE_RANGE_TRUNC.match(v):
                d.setdefault("truncated", []).append(f"{k}={v}")
            else:
                d.setdefault("unparsed", []).append(f"{k}={v}")
    return d


def part_journal(p):
    """Max standard shaft diameter printed for a part (set row or its shells), or None."""
    best = None
    for j in [p["dims"].get("journal")] + [sh["dims"].get("journal") for sh in p["shells"]]:
        if j and j > 0.5 and (best is None or j > best):
            best = j
    return best


def block_journals(block):
    """Distinct rod and main journal clusters of a block (tolerance .012 in). A block whose engines
    are a generic line such as "5.7L 350 CID V8" can list the rod and main sets of several divisions
    side by side; such a block is "mixed" and only a part's own journal can place it."""
    out = {"rod": [], "main": []}
    for p in block["parts"]:
        if p["kind"] not in ("rod", "main"):
            continue
        j = part_journal(p)
        if j and not any(near(j, k) for k in out[p["kind"]]):
            out[p["kind"]].append(j)
    out["mixed"] = len(out["rod"]) > 1 or len(out["main"]) > 1
    return out


def journals_for_part(p, bj):
    """(rod, main) journals to resolve a part's family: the part's own journal for its position, the
    block's journal for the other position when the block has exactly one."""
    pj = part_journal(p)
    rj = pj if p["kind"] == "rod" else (bj["rod"][0] if len(bj["rod"]) == 1 else None)
    mj = pj if p["kind"] == "main" else (bj["main"][0] if len(bj["main"]) == 1 else None)
    return {"rod": rj, "main": mj, "mixed": bj["mixed"] and pj is None}


# ----------------------------------------------------------------------------------------------
# fitment families
# ----------------------------------------------------------------------------------------------
def near(v, target, tol=0.012):
    return v is not None and abs(v - target) <= tol


def bs_near(e, bore, stroke, tol=0.02):
    return e.get("bore") is not None and abs(e["bore"] - bore) <= tol and abs(e["stroke"] - stroke) <= tol


def code_in(e, *codes):
    toks = set(re.findall(r"[A-Z0-9]+", e["desc"].upper()))
    return any(c in toks for c in codes)


def families(block, e, journals):
    """List of engine-build families for one engine line of a block (empty = unresolved).

    The catalog never prints the words Diesel, Hemi, Duramax, Power Stroke, Coyote or Modular in an
    engine line, so diesels and modern families are recognised from CID/liters, valve count, head
    layout, RPO/engine codes and years; the block's rod/main journals and bore x stroke settle the
    GM/Ford/Mopar V8 families that share a displacement.
    """
    make = block["maker"]
    D = e["desc"].upper()
    if "GENERAL MOTORS" in D or any(k in D for k in ("CHEVROLET", "OLDSMOBILE", "PONTIAC", "BUICK", "CADILLAC")):
        grp = "GM"
    elif re.search(r"\bFORD\b", D):
        grp = "Ford"
    elif "CHRYSLER" in D:
        grp = "Chrysler"
    elif re.search(r"\bAMC\b", D):
        grp = "AMC"
    else:
        grp = MAKE_GROUP.get(make)
    cid, liters, cyl, y0, y1 = e["cid"], e["liters"], e["cyl"], e["y0"], e["y1"]
    head, valves = e["head"], e["valves"]
    rj, mj = journals["rod"], journals["main"]
    block_cids = {x["cid"] for x in block["engines"] if x["cid"]}
    fams = []

    def add(f):
        if f not in fams:
            fams.append(f)

    def mj_is(v, tol=0.012):
        return mj is None or near(mj, v, tol)

    def rj_is(v, tol=0.012):
        return rj is None or near(rj, v, tol)

    def head_in(*hs):
        return head in hs or head is None

    def bs_any(pairs):
        return any(bs_near(e, b, s) for b, s in pairs)

    LS_CODES = ("LS1", "LS2", "LS3", "LS6", "LS7", "LS9", "LSA", "LQ4", "LQ9", "LR4", "LM7", "L59", "LM4", "L33",
                "LH6", "LY5", "LMG", "LC9", "LH8", "LH9", "L76", "L77", "L92", "L9H", "L99", "LY6", "L96", "LY2", "L20",
                "LFA", "LMF", "LS4", "L94", "LZ1", "LC8", "L98")
    LT_CODES = ("LT1", "LT2", "LT4", "LT5", "LT6", "L83", "L84", "L86", "L87", "L8T", "L82", "L8B")

    if "CUMMINS" in D:
        if cid == 408 or liters == 6.7:
            add("Cummins 6.7")
        elif cid == 359 or liters == 5.9:
            if valves == 24 or (valves is None and (y0 or 0) >= 1998):
                add("Cummins 5.9 24V/CR")
            if valves == 12 or (valves is None and (y0 or 0) <= 1997):
                add("Cummins 5.9 12V")
        return fams
    if grp == "GM":
        if cyl == 8 and cid in (400, 403) and valves == 32 and (y0 or 0) >= 2001:
            add("Duramax 6.6")
        elif cyl == 8 and cid in (348, 409) and (y1 or 0) <= 1965:
            add("Chevy W-series 348/409")
        elif cyl == 8 and cid in (366, 396, 402, 427, 454, 502) and rj_is(2.20) and mj_is(2.75) and not code_in(e, "LS7"):
            if (y0 or 0) <= 1990:
                add("Chevy Mark IV big block")
            if (y1 or 9999) >= 1991:
                add("Chevy Gen VI big block")
        elif cyl == 8 and code_in(e, *LT_CODES) and (y0 or 0) >= 2014:
            add("GM LT (Gen V)")
        elif cyl == 8 and (code_in(e, *LS_CODES)
                           or (near(mj, 2.559) and near(rj, 2.10) and cid in (293, 294, 325, 346, 350, 364, 376, 427))
                           or (cid in (293, 294, 325, 346, 364, 376, 427) and (y0 or 0) >= 1997 and head_in("OHV")
                               and valves in (16, None) and rj_is(2.10) and mj_is(2.559))):
            if (y0 or 0) >= 2014 and cid in (325, 376, 400) and not code_in(e, *LS_CODES):
                add("GM LT (Gen V)")
            else:
                add("GM LS")
        elif cyl == 8 and cid in (368, 425, 472, 500) and ("CADILLAC" in D or rj_is(2.50) and mj_is(3.25)) \
                and (y1 or 0) <= 1984 and (y0 or 9999) >= 1968:
            add("Cadillac 368-500")
        elif cyl == 8 and cid is not None and (y0 or 0) >= 1955 and not (cid in (379, 395) and (y0 or 0) >= 1982):
            # GM V8 families resolved from the division name, then the block's journals, then bore x stroke.
            # SBC 2.45/2.10 (2.30/2.00 small journal; 400: 2.65/2.10); Olds 2.50/2.125 (big 3.00/2.50, 350
            # diesel 3.00/2.125); Pontiac 3.00/2.25 (326-400), 3.25/2.25 (421-455), 265/301 3.00/2.00; Buick
            # 300-350 3.00/2.00; Buick 400-455 3.25/2.25.
            div = next((k for k in ("CHEVROLET", "OLDSMOBILE", "PONTIAC", "BUICK", "CADILLAC") if k in D), None)
            sbc_bs = bs_any(((4.00, 3.48), (3.74, 3.48), (3.88, 3.25), (4.00, 3.25), (4.00, 3.00), (3.74, 3.00),
                             (3.50, 3.48), (3.67, 3.10), (3.88, 3.00), (3.75, 3.00), (3.74, 3.10), (3.50, 3.39)))
            olds_bs = bs_any(((4.06, 3.39), (3.50, 3.39), (3.80, 3.39), (3.94, 3.39), (4.35, 3.39), (4.13, 4.25),
                              (4.00, 3.98), (3.87, 4.25), (4.13, 3.98), (4.00, 3.69), (4.06, 3.98), (3.94, 3.44),
                              (3.75, 3.44), (4.13, 3.69)))
            pont_bs = bs_any(((3.88, 3.75), (4.06, 3.75), (4.12, 4.00), (4.15, 4.21), (3.72, 3.75), (4.09, 3.75),
                              (3.75, 3.25), (3.56, 3.25), (3.94, 3.56), (4.12, 3.75), (3.78, 3.00), (4.00, 3.75)))
            buick_bs = bs_any(((3.80, 3.85), (3.75, 3.40), (3.75, 3.85)))
            bbuick_bs = bs_any(((4.04, 3.90), (4.19, 3.90), (4.31, 3.90)))
            if div == "CHEVROLET" and cid in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400):
                add("Small-block Chevy")
            elif div == "OLDSMOBILE" and cid in (260, 307, 330, 350, 394, 400, 403, 425, 455):
                add("Oldsmobile V8")
            elif div == "PONTIAC" and cid in (265, 287, 301, 316, 326, 347, 350, 370, 389, 400, 421, 428, 455):
                add("Pontiac V8")
            elif div == "BUICK" and cid in (300, 340, 350):
                add("Buick 350")
            elif div == "BUICK" and cid in (400, 430, 455):
                add("Buick big block")
            elif cid in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400) and (rj is not None or mj is not None) and \
                    (rj_is(2.10) and (mj_is(2.45) or near(mj, 2.65)) or rj_is(2.00) and near(mj, 2.30)) and \
                    not (rj is None and (olds_bs or pont_bs or buick_bs)):
                add("Small-block Chevy")
            elif cid in (260, 307, 330, 350, 403) and near(rj, 2.125) and (mj_is(2.50) or near(mj, 3.00)):
                add("Oldsmobile V8")
            elif cid in (394, 400, 425, 455) and near(rj, 2.50) and mj_is(3.00):
                add("Oldsmobile V8")
            elif cid in (303, 324, 371) and near(rj, 2.25) and mj_is(2.50):
                add("Oldsmobile V8")
            elif cid in (265, 301) and near(rj, 2.00) and mj_is(3.00) and (y0 or 0) >= 1977:
                add("Pontiac V8")
            elif cid in (300, 340, 350) and near(rj, 2.00) and mj_is(3.00) and (y0 or 0) >= 1964:
                add("Buick 350")
            elif cid in (287, 316, 326, 347, 350, 370, 389, 400) and near(rj, 2.25) and mj_is(3.00) and not bbuick_bs:
                add("Pontiac V8")
            elif cid in (421, 428) and near(rj, 2.25) and mj_is(3.25):
                add("Pontiac V8")
            elif cid in (400, 430, 455) and near(rj, 2.25) and mj_is(3.25) and bbuick_bs:
                add("Buick big block")
            elif cid == 455 and near(rj, 2.25) and mj_is(3.25) and pont_bs:
                add("Pontiac V8")
            elif not journals.get("mixed") and ((rj is None and mj is None) or (rj is None and near(mj, 3.00))):
                # cam-bearing-only blocks (and main-only 3.00 blocks shared by Pontiac/Olds/Buick): bore x stroke
                if cid in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400) and sbc_bs and mj is None:
                    add("Small-block Chevy")
                elif cid in (260, 307, 330, 350, 394, 400, 403, 425, 455) and olds_bs:
                    add("Oldsmobile V8")
                elif cid in (287, 316, 326, 347, 350, 370, 389, 400, 421, 428, 455) and pont_bs:
                    add("Pontiac V8")
                elif cid in (300, 340, 350) and buick_bs:
                    add("Buick 350")
                elif cid in (400, 430, 455) and bbuick_bs:
                    add("Buick big block")
                elif cid in (265, 301) and (y0 or 0) >= 1977 and bs_near(e, 4.00, 3.00):
                    add("Pontiac V8")
        elif cyl == 6 and e["layout"] == "L" and cid in (194, 215, 230, 235, 250, 261, 292) and (y0 or 0) >= 1962 and \
                mj_is(2.30) and (rj_is(2.00) or near(rj, 2.10)):
            add("Chevy inline-6")
        elif cyl == 6 and e["layout"] == "V" and cid in (181, 196, 198, 204, 225, 231, 252) and \
                (rj_is(2.25) or near(rj, 2.00)) and mj_is(2.50) and not code_in(e, "LB4", "LG3") and "CHEVROLET" not in D:
            add("Buick V6 181-252")
    elif grp == "Ford":
        if cyl == 8 and cid in (444, 445) and (y1 or 0) >= 1994 and (y0 or 0) <= 2003 and (y1 or 0) <= 2003:
            # the catalog prints one 1988-2003 line for the 7.3 IDI and the 7.3 Power Stroke (shared bearings)
            add("Powerstroke 7.3")
        elif cyl == 8 and cid in (444, 445) and (y0 or 0) >= 2020:
            add("Ford Godzilla 7.3")
        elif cyl == 8 and cid in (363, 365) and valves == 32 and (y0 or 0) >= 2003:
            add("Powerstroke 6.0")
        elif cyl == 8 and cid in (390, 391) and valves == 32 and (y0 or 0) >= 2008:
            add("Powerstroke 6.4")
        elif cyl == 8 and cid in (406, 409) and valves == 32 and (y0 or 0) >= 2011:
            add("Powerstroke 6.7")
        elif cyl == 8:
            if cid in (302, 305) and head == "DOHC" and (y0 or 0) >= 2011:
                add("Ford Coyote")
            elif cid in (281, 330, 331) and (head in ("SOHC", "DOHC") or near(rj, 2.0867) or near(mj, 2.6577)) and (y0 or 0) >= 1991:
                add("Ford Modular")
            elif cid == 351 and ("CLEVELAND" in D or "MODIFIED" in D):
                add("Ford 351C/351M/400")
            elif cid == 400 and head_in("OHV") and rj_is(2.311) and mj_is(2.9994) and (y0 or 0) >= 1971:
                add("Ford 351C/351M/400")
            elif cid == 351 and "WINDSOR" in D:
                add("Small-block Ford (Windsor)")
            elif cid == 351 and near(mj, 2.749) and rj_is(2.311):
                add("Ford 351C/351M/400")
            elif cid == 351 and head_in("OHV") and near(rj, 2.311) and mj is None:
                # unnamed 351 rod block: CB-831 is shared by the Windsor, Cleveland and Modified 351s
                add("Small-block Ford (Windsor)")
                add("Ford 351C/351M/400")
            elif cid == 351 and head_in("OHV") and rj is None and mj is None and block_cids & {221, 255, 260, 289, 302}:
                add("Small-block Ford (Windsor)")
            elif cid == 351 and head_in("OHV") and rj is None and mj is None and block_cids & {400}:
                add("Ford 351C/351M/400")
            elif cid in (221, 255, 260, 289, 302) and head_in("OHV") and rj_is(2.1228) and mj_is(2.2482) and (y0 or 0) >= 1962:
                add("Small-block Ford (Windsor)")
            elif cid in (330, 332, 352, 359, 360, 361, 389, 390, 391, 406, 410, 427, 428) and head_in("OHV") and \
                    rj_is(2.4388) and mj_is(2.749) and (y0 or 0) >= 1958 and (y1 or 0) <= 1978:
                add("Ford FE")
            elif cid in (370, 429, 460) and head_in("OHV") and rj_is(2.4992) and mj_is(2.9994) and (y0 or 0) >= 1968:
                add("Ford 429/460")
        elif cyl == 10 and cid in (413, 415) and head in ("SOHC", "DOHC"):
            add("Ford Modular")
        elif cyl == 6 and e["layout"] == "L" and cid in (240, 300) and head_in("OHV") and mj_is(2.3982) and rj_is(2.1228):
            add("Ford 240/300 inline-6")
    elif grp == "Chrysler":
        if cyl == 8:
            if cid == 426 and (y0 or 0) >= 1963 and rj_is(2.375) and mj_is(2.75):
                # the catalog files the 426 wedge and the 426 Hemi in the same B/RB blocks (shared CB-527P rods)
                add("Mopar B/RB big block")
                add("Chrysler 426 Hemi")
            elif cid in (345, 370) and head_in("OHV") and (y0 or 0) >= 2003 and valves in (16, None) and rj_is(2.125) and mj_is(2.559):
                add("Chrysler Gen III Hemi 5.7/6.1")
            elif cid in (376, 392) and head_in("OHV") and (y0 or 0) >= 2011 and rj_is(2.125) and mj_is(2.559):
                add("Chrysler Gen III Hemi 6.2/6.4")
            elif make == "JEEP TRUCK" and cid in (290, 304, 343, 360, 390, 401) and (y0 or 0) >= 1966 and \
                    (rj_is(2.0955) or near(rj, 2.2485)) and (mj_is(2.7474) or near(mj, 2.4986)):
                add("AMC V8")
            elif cid in (273, 318, 340, 360) and head != "DOHC" and rj_is(2.125) and (mj_is(2.50) or near(mj, 2.81)) and (y0 or 0) >= 1964:
                magnum = cid in (318, 360) and (y1 or 0) >= 1992
                la = (y0 or 0) <= 1992 and not ((y0 or 0) >= 1992 and code_in(e, "MAGNUM"))
                if la or not magnum:
                    add("Mopar LA small block")
                if magnum:
                    add("Mopar Magnum 5.2/5.9")
            elif cid in (350, 361, 383, 400, 413, 440) and rj_is(2.375) and (mj_is(2.625) or near(mj, 2.75)) and (y0 or 0) >= 1958:
                add("Mopar B/RB big block")
        elif cyl == 6:
            if e["layout"] == "L" and cid in (170, 198, 225) and head_in("OHV") and rj_is(2.1875) and mj_is(2.75) and (y0 or 0) >= 1960:
                add("Mopar Slant Six")
            elif e["layout"] == "V" and cid in (225, 231) and mj_is(2.50) and (rj_is(2.25) or near(rj, 2.00)) and make == "JEEP TRUCK":
                add("Buick V6 181-252")
            elif e["layout"] == "L" and cid in (199, 232, 242, 258) and make == "JEEP TRUCK" and head_in("OHV") and \
                    mj_is(2.50) and rj_is(2.0955) and (y0 or 0) >= 1965:
                add("AMC/Jeep inline-6")
        elif cyl == 8 and make == "JEEP TRUCK" and cid == 350 and near(mj, 3.00) and near(rj, 2.00):
            add("Buick 350")
    elif grp == "AMC":
        if cyl == 8 and cid in (290, 304, 343, 360, 390, 401) and (y0 or 0) >= 1966:
            add("AMC V8")
        elif cyl == 6 and cid in (199, 232, 242, 258) and (y0 or 0) >= 1964 and mj_is(2.50) and rj_is(2.0955):
            add("AMC/Jeep inline-6")
    return fams


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def engine_note(e, make):
    bits = [e["desc"]]
    if e.get("vin"):
        bits.append("VIN " + e["vin"])
    elif e["y0"]:
        bits.append(f"{e['y0']}-{e['y1']}" if e["y1"] and e["y1"] != e["y0"] else str(e["y0"]))
    if e.get("bore") is not None:
        bits.append(f"{e['bore']:g} x {e['stroke']:g} in")
    return f"{make}: " + ", ".join(bits)


def suffix_legend(suffix, prefix):
    s = suffix or ""
    if s.endswith("S") and prefix in ("SH", "TW", "MS", "CB") and len(s) > 1:
        s = s[:-1]
    if s in SUFFIX_LEGEND:
        return SUFFIX_LEGEND[s]
    return None


def shell_record(sh):
    r = OrderedDict()
    r["part"] = sh["pn"]
    if sh.get("qualifier") == "F":
        r["flanged"] = True
    if sh.get("material"):
        r["material"] = sh["material"]
    for k in ("journal", "journalMin", "clearance", "thickness", "housing", "housingMin", "width"):
        if k in sh["dims"]:
            r[k] = sh["dims"][k]
    if sh.get("undersize"):
        r["undersize"] = sh["undersize"]
    return r


def fill_from_twins(blocks):
    """Shop data is printed only on the STD row of a bearing: undersize-only rows (".25mm,.50mm", "40")
    and some pair/set twins print none. Copy it from another printing of the same bearing number
    (same prefix, number and suffix; the "(n)" qualifier is only the pack size)."""
    by_base = {}
    for b in blocks:
        for p in b["parts"]:
            base = f"{p['prefix']}-{p['number']}{p['suffix']}"
            if p["dims"].get("journal") or any(sh["dims"].get("journal") for sh in p["shells"]):
                by_base.setdefault(base, p)
            if p.get("material"):
                by_base.setdefault(base + "#mat", p["material"])
    filled = Counter()
    for b in blocks:
        for p in b["parts"]:
            base = f"{p['prefix']}-{p['number']}{p['suffix']}"
            src = by_base.get(base)
            if src is not None and src is not p and not (p["dims"].get("journal") or any(sh["dims"].get("journal") for sh in p["shells"])):
                p["dims"] = dict(src["dims"])
                if not p["shells"] and src["shells"]:
                    p["shells"] = [dict(sh) for sh in src["shells"]]
                p["dimsFrom"] = src["pn"]
                filled["dims"] += 1
            if not p.get("material") and by_base.get(base + "#mat"):
                p["material"] = by_base[base + "#mat"]
                p["materialFrom"] = base
                filled["material"] += 1
    return filled


def build_records(blocks):
    filled = fill_from_twins(blocks)
    groups = OrderedDict()   # (pn, fam) -> group
    sig_first = {}
    conflicts = Counter()
    fam_by_make = defaultdict(Counter)
    unresolved = defaultdict(Counter)
    for b in blocks:
        bj = block_journals(b)
        b["journals"] = bj
        engine_fams = [set() for _ in b["engines"]]
        for p in b["parts"]:
            sig = json.dumps([p["dims"], [sh["dims"] for sh in p["shells"]]], sort_keys=True)
            if p["pn"] in sig_first and sig_first[p["pn"]] != sig:
                conflicts[p["pn"]] += 1
            sig_first.setdefault(p["pn"], sig)
            pj = journals_for_part(p, bj)
            for i, e in enumerate(b["engines"]):
                fams = families(b, e, pj)
                engine_fams[i].update(fams)
                for fam in fams or [b["maker"]]:
                    key = (p["pn"], fam)
                    g = groups.get(key)
                    if g is None:
                        g = groups[key] = {"part": p, "fam": fam, "engines": [], "pages": set(), "blocks": set(),
                                           "notes": []}
                    g["engines"].append((b["maker"], e, p.get("forYears")))
                    g["pages"].add(p["page"])
                    g["blocks"].add((b["maker"], b["block"]))
                    for n in p["notes"]:
                        if n not in g["notes"]:
                            g["notes"].append(n)
        for e, fams in zip(b["engines"], engine_fams):
            if not fams:
                fam_by_make[b["maker"]][b["maker"]] += 1
                if b["maker"] in US_MAKES:
                    unresolved[b["maker"]][e["desc"]] += 1
            for f in fams:
                fam_by_make[b["maker"]][f] += 1
    records = []
    for (pn, fam), g in groups.items():
        p = g["part"]
        spec = OrderedDict()
        spec["position"] = p["kind"]
        spec["pack"] = p["pack"]
        if p["pieces"]:
            spec["pieces"] = p["pieces"]
        series = p["suffix"] or None
        spec["series"] = series
        sl = suffix_legend(p["suffix"], p["prefix"])
        if sl:
            spec["seriesDesc"] = sl
        mat = clean(p["material"]) if p["material"] else None
        if mat == "ERROR:#":
            mat = None
            spec["materialMisprint"] = "ERROR:#"
        spec["material"] = mat
        if mat and mat in MATERIAL_LEGEND:
            spec["materialDesc"] = MATERIAL_LEGEND[mat]
        main = p["dims"] if p["dims"].get("journal") or p["dims"].get("housing") else None
        if main is None:
            for sh in p["shells"]:
                if sh["dims"].get("journal") or sh["dims"].get("housing"):
                    main = sh["dims"]
                    break
        main = main or p["dims"]
        for k in ("journal", "journalMin", "clearance", "thickness", "housing", "housingMin", "width"):
            if k in main:
                spec[k] = main[k]
        if main is not p["dims"] and p["dims"].get("thickness") and "thickness" not in spec:
            spec["thickness"] = p["dims"]["thickness"]
        if p["undersize"]:
            spec["undersize"] = p["undersize"]
        notes_l = " ".join(g["notes"]).lower()
        if "coated" in notes_l:
            spec["coated"] = True
        if p["qualifier"] == "F" or any(sh.get("qualifier") == "F" for sh in p["shells"]):
            spec["flanged"] = True
        if p["shells"]:
            spec["shells"] = [shell_record(sh) for sh in p["shells"]]
        if g["notes"]:
            spec["notes"] = "; ".join(g["notes"])
        if main.get("unparsed"):
            spec["unparsed"] = main["unparsed"]
        if main.get("truncated"):
            spec["truncated"] = main["truncated"]
        if p.get("dimsFrom"):
            spec["dimsFrom"] = p["dimsFrom"]
        # fitment
        engines = g["engines"]
        cids = sorted({e["cid"] for _, e, _ in engines if e["cid"]})
        cyls = sorted({e["cyl"] for _, e, _ in engines if e["cyl"]})
        # a set-level "For Years:" line narrows the set to those years within its own block only
        y0s, y1s = [], []
        for _, e, fy in engines:
            if fy:
                ys = [int(y) for y in RE_YEAR.findall(fy)]
                if ys:
                    y0s.append(min(ys))
                    y1s.append(max(ys))
                    continue
            if e["y0"]:
                y0s.append(e["y0"])
            if e["y1"]:
                y1s.append(e["y1"])
        fit = OrderedDict()
        fit["fam"] = fam
        if cids:
            fit["ci"] = cids
        if len(cyls) == 1:
            fit["cyl"] = cyls[0]
        if y0s:
            fit["y0"] = min(y0s)
            if y1s:
                fit["y1"] = max(y1s)
        notes = list(OrderedDict.fromkeys(engine_note(e, mk) + (f" [set for years {fy}]" if fy else "")
                                          for mk, e, fy in engines))
        if len(notes) > 12:
            notes = notes[:12] + [f"+{len(notes) - 12} more engines"]
        fit["notes"] = " | ".join(notes)
        # name
        pos_label = {"rod": "rod bearing", "main": "main bearing", "cam": "cam bearing", "thrust": "thrust washer",
                     "pinBushing": "piston pin bushing", "balanceShaft": "balance shaft bearing",
                     "auxShaft": "auxiliary shaft bearing"}.get(p["kind"], "bearing")
        pack = {"set": " set", "pair": " pair", "individual": ""}[p["pack"]]
        ser = f", {series} series" if series and p["kind"] in ("rod", "main") else ""
        matn = f" ({mat})" if mat else ""
        jn = f", {spec['journal']:.4f} in journal" if spec.get("journal") and p["kind"] != "thrust" else ""
        name = f"Clevite {pos_label}{pack}{ser}{matn}{jn}"
        rec = OrderedDict()
        rec["m"] = BRAND
        rec["p"] = pn
        rec["cat"] = "bearing"
        rec["name"] = name
        rec["fit"] = fit
        rec["spec"] = spec
        rec["src"] = OrderedDict([("doc", DOC), ("edition", EDITION), ("file", SRC_FILE),
                                  ("page", ", ".join(str(x) for x in sorted(g["pages"]))),
                                  ("block", ", ".join(f"{m} {n}" for m, n in sorted(g["blocks"])))])
        rec["emissions"] = None
        records.append(rec)

    def order(r):
        f = r["fit"]["fam"]
        if f in US_FAMILIES:
            return (0, US_FAMILY_ORDER.index(f), r["p"])
        return (1, f, r["p"])

    records.sort(key=order)
    return records, conflicts, fam_by_make, unresolved, filled


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
    elif isinstance(obj, (int, float)) and not isinstance(obj, bool):
        if obj != obj:
            problems.append(f"NaN at {path}")


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat", "fit", "src"):
            if k not in r or r[k] in (None, ""):
                problems.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
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
    ex = defaultdict(list)
    for r in records:
        sp = r["spec"]
        j, h, w, t = sp.get("journal"), sp.get("housing"), sp.get("width"), sp.get("thickness")
        if j and h and h <= j and sp["position"] != "thrust":
            qa["housing <= journal (print or parse error)"] += 1
            ex["housing <= journal"].append(r["p"])
        if j and h and t and sp["position"] in ("rod", "main", "cam") and abs((h - j) / 2 - t) > 0.012:
            qa["(housing-journal)/2 differs from max wall by > .012"] += 1
            ex["wall mismatch"].append(r["p"])
        if sp["position"] in ("rod", "main") and j is None:
            qa["rod/main part without standard shaft diameter"] += 1
            ex["no journal"].append(r["p"])
        if sp.get("unparsed"):
            qa["shop-data cell not parsed as a number"] += 1
            ex["unparsed cell"].append(r["p"])
        if not sp.get("undersize"):
            qa["no undersize list"] += 1
            ex["no undersize"].append(r["p"])
        if sp.get("material") is None and sp["position"] in ("rod", "main"):
            qa["rod/main part without material designation"] += 1
            ex["no material"].append(r["p"])
        if sp.get("materialMisprint"):
            qa["material printed as ERROR:#"] += 1
            ex["ERROR:#"].append(r["p"])
    return qa, ex


def numerical_listing_pns(doc):
    """Part numbers of the numerical listings (QA cross-check of application-section coverage)."""
    pns = {"CB": set(), "MS": set(), "MB": set(), "SH": set(), "TW": set(), "223": set()}
    for pno in range(NUM_FIRST, NUM_LAST + 1):
        if pno > len(doc):
            break
        for l in page_lines(doc[pno - 1]):
            if 6.7 <= l["size"] <= 7.3:
                t = l["text"].replace(" ", "")
                m = RE_PART.match(t)
                if m:
                    pns[m.group(1)].add(t)
    return pns


def shop_crosscheck(blocks):
    """Compare with the shop tool's earlier extraction of the same catalog (read only)."""
    if not os.path.exists(SHOP_JSON):
        return {"available": False}
    try:
        with open(SHOP_JSON, encoding="utf-8") as f:
            shop = json.load(f)
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "error": str(exc)}
    sb = shop.get("blocks", [])
    shop_pns = {p["partNumber"].replace(" ", "") for b in sb for p in b["parts"]}
    shop_ind = {i["partNumber"].replace(" ", "") for b in sb for p in b["parts"] for i in p.get("individual", [])}
    my_pns = {p["pn"] for b in blocks for p in b["parts"]}
    my_ind = {sh["pn"] for b in blocks for p in b["parts"] for sh in p["shells"]}
    return {"available": True, "shopBlocks": len(sb), "shopParts": sum(len(b["parts"]) for b in sb),
            "shopEngines": sum(len(b["engines"]) for b in sb), "shopDistinctSetPns": len(shop_pns),
            "shopDistinctShellPns": len(shop_ind),
            "myBlocks": len(blocks), "myParts": sum(len(b["parts"]) for b in blocks),
            "myEngines": sum(len(b["engines"]) for b in blocks), "myDistinctSetPns": len(my_pns),
            "myDistinctShellPns": len(my_ind),
            "setPnsOnlyInShop": sorted(shop_pns - my_pns)[:40], "setPnsOnlyHere": sorted(my_pns - shop_pns)[:40],
            "shellPnsOnlyInShop": sorted(shop_ind - my_ind)[:40], "shellPnsOnlyHere": sorted(my_ind - shop_ind)[:40]}


# ----------------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--pages", help="PDF page range a-b (default: application section)")
    ap.add_argument("--debug", action="store_true", help="write out/clevite_debug.json with raw blocks and unknown lines")
    ap.add_argument("--cache", help="pickle file (outside the repo) caching page text lines to speed up reruns")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    doc = pymupdf.open(args.pdf)
    if args.pages:
        a, b = (int(x) for x in args.pages.split("-"))
        pages = range(a, b + 1)
    else:
        pages = range(APP_FIRST, min(APP_LAST, len(doc)) + 1)
    parser = Parser(doc, pages)
    if args.cache:
        import pickle
        if os.path.exists(args.cache):
            with open(args.cache, "rb") as f:
                parser.cache = pickle.load(f)
        else:
            parser.cache = {}
    blocks = parser.run()
    if args.cache:
        with open(args.cache, "wb") as f:
            pickle.dump(parser.cache, f)
    for b in blocks:
        b["engines"] = [finish_engine(e) for e in b["engines"]]
        # the same engine is reprinted when a block continues on the next page
        seen, uniq = set(), []
        for e in b["engines"]:
            k = (e["name"], e.get("bore"))
            if k not in seen:
                seen.add(k)
                uniq.append(e)
        b["engines"] = uniq
        b["parts"] = [finish_part(p) for p in b["parts"]]
        b["pages"] = sorted(b["pages"])
    records, conflicts, fam_by_make, unresolved, filled = build_records(blocks)
    problems = validate(records)
    qa, qa_ex = qa_checks(records)
    num_pns = numerical_listing_pns(doc) if not args.pages else None
    shop = shop_crosscheck(blocks)
    os.makedirs(OUT, exist_ok=True)
    today = dt.date.today().isoformat()
    out = OrderedDict([
        ("source", OrderedDict([
            ("brand", "MAHLE Aftermarket / CLEVITE"), ("doc", DOC), ("edition", EDITION), ("file", SRC_FILE),
            ("pages", len(doc)),
            ("pagesUsed", f"PDF {pages.start}-{pages.stop - 1} (printed {pages.start - PRINTED_OFFSET}-{pages.stop - 1 - PRINTED_OFFSET})"),
            ("network", "none (manual PDF)")])),
        ("extracted", today), ("count", len(records)), ("parts", records)])
    with open(os.path.join(OUT, "clevite.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    if args.debug:
        dbg = {"log": parser.log, "unknown": parser.unknown[:3000], "blocks": blocks}
        with open(os.path.join(OUT, "clevite_debug.json"), "w", encoding="utf-8") as f:
            json.dump(dbg, f, ensure_ascii=False, indent=1, default=str)
    write_notes(records, blocks, parser, conflicts, fam_by_make, unresolved, problems, qa, qa_ex, num_pns, shop, today, pages, filled)
    print(f"blocks: {len(blocks)}  parts: {sum(len(b['parts']) for b in blocks)}  records: {len(records)}  problems: {len(problems)}")
    for k, v in parser.log.most_common():
        print(f"  log: {v:6d}  {k}")
    if problems:
        print("VALIDATION PROBLEMS:")
        for p in problems[:40]:
            print("  ", p)


def write_notes(records, blocks, parser, conflicts, fam_by_make, unresolved, problems, qa, qa_ex, num_pns, shop, today, pages, filled):
    by_fam = Counter(r["fit"]["fam"] for r in records)
    by_pos = Counter(r["spec"]["position"] for r in records)
    by_series = Counter((r["spec"]["series"] or "—") for r in records)
    by_mat = Counter((r["spec"].get("material") or "—") for r in records)
    us = [r for r in records if r["fit"]["fam"] in US_FAMILIES]
    us_pns = {r["p"] for r in us}
    all_pns = {r["p"] for r in records}
    pos_us = Counter(r["spec"]["position"] for r in us)
    series_us = Counter((r["spec"]["series"] or "—") for r in us)
    fam_pos = defaultdict(Counter)
    for r in records:
        fam_pos[r["fit"]["fam"]][r["spec"]["position"]] += 1
    parts_total = sum(len(b["parts"]) for b in blocks)
    engines_total = sum(len(b["engines"]) for b in blocks)
    pos_parts = Counter(p["kind"] for b in blocks for p in b["parts"])
    app_pns = {p["pn"] for b in blocks for p in b["parts"]}
    shell_pns = {sh["pn"] for b in blocks for p in b["parts"] for sh in p["shells"]}
    lines = []
    w = lines.append
    w(f"# CLEVITE (MAHLE Aftermarket) engine bearings — extraction notes ({today})")
    w("")
    w("## Source and method")
    w("")
    w(f"- File: `{SRC_FILE}` — MAHLE Aftermarket CLEVITE Engine Bearings Light Vehicle catalog EB-20-26")
    w("  (supersedes EB-20-18), 1,007 PDF pages, text layer (no OCR). Saved by hand into `Catalogs/`; no")
    w("  network used. The owner approved this catalog for the public site on 2026-10-17 (MAHLE's")
    w("  published catalog); the earlier shop-only restriction applied to the shop tool's copy.")
    w(f"- Parsed PDF pages {pages.start}-{pages.stop - 1} (printed {pages.start - PRINTED_OFFSET}-{pages.stop - 1 - PRINTED_OFFSET}, makes Acura → Volvo).")
    w("  The numerical listings (printed 975-1004) only map part number → make/block and list set")
    w("  contents, so they were used for a coverage cross-check, not as a data source. Front matter")
    w("  (failure analysis, clearance tables, legends on printed pp 26-27) supplied the suffix and")
    w("  material legends below.")
    w("- Shop extractor reuse: the brief pointed at `C:\\Enoch Shop\\lambda-shop\\tools\\clevite_extract.py`;")
    w("  the script actually lives at `C:\\Enoch Shop\\server\\tools\\clevite_extract.py` (output")
    w("  `C:\\Enoch Shop\\server\\data\\clevite-bearings.json`). Both were read, nothing there was modified.")
    w("  Its page logic was copied: column x positions from the `POSITION | MATERIAL | NUMBER | UNDERSIZES |")
    w("  DIAMETER | CLEARANCE | WALL | BORE | LENGTH` header labels, rows grouped by y (2.5 pt), block")
    w("  numbers as 9.8 pt digits left of the material column, engine lines as 9 pt bold, `NOTE:` lines")
    w("  attached to the row above, blocks continued across pages by maker + number. Added here:")
    w("  wrapped cells are joined to the row above (the shop version dropped `.7`+`5mm` undersizes and")
    w("  `2.10385/2.104`+`80` shaft ranges), bold vs regular part-number font decides set/pair vs")
    w("  individual shell, `For Years:` lines are kept per set, VIN-code lines with several year ranges")
    w("  give min/max years (the shop version took only the first range), engine lines that wrap are")
    w("  joined before parsing, and 9 pt headings (`8 CYL (cont.)`) no longer leak into position labels.")
    w("- `p` is the part number as printed with inner spaces removed: `CB-663P(8)` is the 8-cylinder set")
    w("  and `CB-663P` the pair; both are orderable numbers in the catalog and both are kept")
    w("  (`spec.pack` = `set`/`pair`/`individual`, `spec.pieces` from the label or the `(n)` qualifier).")
    w("  Individual main/cam shells and thrust washers printed under a set are kept in `spec.shells`")
    w("  (part, flanged, journal, clearance, thickness, housing, width), not as their own records.")
    w("- Shop data is printed in inches (also for metric engines): `journal` = max of the standard shaft")
    w("  diameter range (`journalMin` = min), `clearance` = [min, max] vertical oil clearance,")
    w("  `thickness` = max wall at crown, `housing` = max bearing OD / housing bore (`housingMin`),")
    w("  `width` = max bearing length. For a main set the top-level values come from the first shell")
    w("  that carries dimensions; thrust washer sets carry the washer's thickness as `thickness`.")
    w("- `spec.undersize` keeps the catalog tokens: `STD`, bare numbers are inch thousandths (`10` =")
    w("  .010 in, `1` = .001 in), `.25mm`/`.50mm`/`.75mm` metric.")
    w("- `spec.series` is the part-number suffix (legend printed p26): A = lead-free aluminum-silicon")
    w("  bimetal, P = copper-lead trimetal with lead-tin-copper overlay, G = copper matrix with babbitt")
    w("  infiltrant, AL = aluminum lining, AP = A and P mixed, C = copper-lead, S = set, W = thrust washer,")
    w("  `(F)` = flanged shell. `spec.material` is the printed designation (AL-5, TM-77, B-1, ...) with")
    w("  the p27 legend in `materialDesc`. This is the OE-replacement light-vehicle catalog: the H/HN/HX/")
    w("  V/K performance series are not listed in it (they are in the separate Clevite performance")
    w("  catalog), so no record carries those series. `coated: true` is set when a row note says")
    w("  coated (MAHLE polymer / F1 coated shells).")
    w("- Families: one record per (part number, family). GM/Ford/Chrysler engine lines are resolved from")
    w("  the description (CID/liters, cylinders, OHV/SOHC/DOHC, valve count, division name, RPO or")
    w("  engine code, years, diesel), then the block's own rod/main journal diameters (SBC 2.10/2.45,")
    w("  LS 2.10/2.559, BBC 2.20/2.75, Olds 2.125/2.50, Pontiac 2.25/3.00-3.25, Buick 350 2.00/3.00,")
    w("  Windsor 2.1228/2.2482, Cleveland 2.311/2.749, FE 2.4388/2.749, 429/460 2.4992/2.9994, LA 2.125/")
    w("  2.50-2.81, B/RB 2.375/2.625-2.75, Gen III Hemi 2.125/2.559, AMC V8 2.0955/2.7474), then bore x")
    w("  stroke for cam-bearing-only blocks (the GM 350s: Chevy 4.00 x 3.48, Olds 4.06 x 3.39, Pontiac")
    w("  3.88 x 3.75, Buick 3.80 x 3.85). A block whose engines span two families (an LS1 rod block")
    w("  shared with SBC, a 318/360 block spanning LA and Magnum years, a 1965-1999 big-block Chevy")
    w("  block) yields one record per family for the same part number. Engines with no engine-build")
    w("  family keep the catalog make heading as `fit.fam` (listed below).")
    w("  Catalog quirks handled on purpose: the 426 wedge and 426 Hemi share B/RB blocks (CB-527P rods),")
    w("  so 426 lines carry both families; unnamed 351 rod blocks (CB-831, 2.311 journal shared by the")
    w("  Windsor, Cleveland and Modified 351) carry both Ford 351 families while unnamed 351 main-only")
    w("  blocks stay under the make heading; the 7.3 International line spans 1988-2003 (IDI and Power")
    w("  Stroke share the bearings) and is filed as Powerstroke 7.3; the LS1 is printed as a 350 CID")
    w("  3.90 x 3.62 engine and resolved by its RPO code. No 7.3 Godzilla (445 CID, 2020+) line exists in")
    w("  this edition.")
    w("- `fit.y0/y1` span all VIN-code year ranges of the engines aggregated under the record; where a")
    w("  block prints a set-level `For Years:` line, that block's engines contribute those years instead")
    w("  and the line is quoted in `fit.notes` (`[set for years ...]`).")
    w("- Mixed blocks: a generic engine line such as `5.7L 350 CID V8 (1968-1974)` can head a block that")
    w("  lists Chevrolet, Pontiac, Oldsmobile and Buick rod and main sets side by side. Families are")
    w("  therefore resolved per part from the part's own journal (the block's journal is used for the")
    w("  other position only when the block has a single one); cam sets and thrust washers in a mixed")
    w("  block stay under the make heading rather than being guessed from bore x stroke.")
    w("- The maker named in the engine description (`General Motors`, `Ford`, `Chrysler`, `AMC`) decides")
    w("  the rule set, so GM engines under the ISUZU, SAAB TRUCK and AM GENERAL TRUCK headings resolve")
    w("  to GM LS / Small-block Chevy and merge into the same record as the GMC printing.")
    w("  `fit.notes` lists up to 12 engine descriptions with their VIN codes/years and bore x stroke.")
    w("")
    w("## Counts")
    w("")
    w(f"- Blocks parsed: {len(blocks)} across {len(parser.makers)} make headings; engine lines: {engines_total};")
    w(f"  set/pair rows: {parts_total} (rod {pos_parts.get('rod', 0)}, main {pos_parts.get('main', 0)}, cam {pos_parts.get('cam', 0)},")
    w(f"  thrust {pos_parts.get('thrust', 0)}, pin bushing {pos_parts.get('pinBushing', 0)}, balance shaft {pos_parts.get('balanceShaft', 0)},")
    w(f"  auxiliary shaft {pos_parts.get('auxShaft', 0)}); distinct orderable part numbers: {len(app_pns)}; distinct shell numbers")
    w(f"  inside sets: {len(shell_pns)}.")
    w(f"- Records (part number × family): {len(records)}; in US engine-build families: {len(us)} ({len(us_pns)} distinct part")
    w(f"  numbers); left under a US make heading with no family: {sum(by_fam.get(m, 0) for m in US_MAKES)};")
    w(f"  under import make headings: {len(records) - len(us) - sum(by_fam.get(m, 0) for m in US_MAKES)}.")
    w("")
    w("### By position")
    w("")
    w("| position | all records | US-family records |")
    w("|---|---:|---:|")
    for k in ("rod", "main", "cam", "thrust", "pinBushing", "balanceShaft", "auxShaft", "other"):
        if by_pos.get(k):
            w(f"| {k} | {by_pos.get(k, 0)} | {pos_us.get(k, 0)} |")
    w("")
    w("### By series (part-number suffix)")
    w("")
    w("| series | all records | US-family records | legend |")
    w("|---|---:|---:|---|")
    for k, v in by_series.most_common():
        base = k[:-1] if k.endswith("S") and len(k) > 1 else k
        w(f"| {k} | {v} | {series_us.get(k, 0)} | {SUFFIX_LEGEND.get(k) or SUFFIX_LEGEND.get(base) or '—'} |")
    w("")
    w("### By material designation")
    w("")
    w("| material | records | legend |")
    w("|---|---:|---|")
    for k, v in by_mat.most_common():
        w(f"| {k} | {v} | {MATERIAL_LEGEND.get(k, '—')} |")
    w("")
    w("### By family (US engine-build families)")
    w("")
    w("| family | records | rod | main | cam | thrust | other |")
    w("|---|---:|---:|---:|---:|---:|---:|")
    for f in US_FAMILY_ORDER:
        if by_fam.get(f):
            fp = fam_pos[f]
            other = sum(v for k, v in fp.items() if k not in ("rod", "main", "cam", "thrust"))
            w(f"| {f} | {by_fam[f]} | {fp.get('rod', 0)} | {fp.get('main', 0)} | {fp.get('cam', 0)} | {fp.get('thrust', 0)} | {other} |")
    missing = [f for f in US_FAMILY_ORDER if not by_fam.get(f)]
    w("")
    w("US families with no record: " + (", ".join(missing) if missing else "none") + ".")
    w("")
    w("### US makes: engine lines left under the make heading (no engine-build family)")
    w("")
    w("| make heading | engine lines mapped to a family | engine lines unresolved | records under the heading |")
    w("|---|---:|---:|---:|")
    for mk in sorted(US_MAKES):
        fr = sum(v for f, v in fam_by_make[mk].items() if f in US_FAMILIES)
        ur = sum(unresolved[mk].values())
        w(f"| {mk} | {fr} | {ur} | {by_fam.get(mk, 0)} |")
    w("")
    w("Unresolved US engine descriptions (distinct, most frequent first):")
    w("")
    allu = Counter()
    for mk, c in unresolved.items():
        for d, n in c.items():
            allu[f"{mk}: {d}"] += n
    for d, n in allu.most_common(60):
        w(f"- {d} ({n})")
    if len(allu) > 60:
        w(f"- ... {len(allu) - 60} more")
    w("")
    w("### Catalog headings used as fit.fam (import / other)")
    w("")
    others = [(f, v) for f, v in sorted(by_fam.items()) if f not in US_FAMILIES]
    w(", ".join(f"{f} ({v})" for f, v in others))
    w("")
    w("## Skipped / parser log")
    w("")
    w("- Engine-data and model tables at the start of each make (8 pt rows: engine → block number) were")
    w("  skipped; they are a cross-reference to the blocks, which were parsed in full.")
    w("- Numerical listings (printed 975-1004) and front matter were not turned into records.")
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
    w(f"- Rows that print no shop data (undersize-only rows, some pair/set twins) filled from another printing")
    w(f"  of the same bearing number (`spec.dimsFrom`): {filled.get('dims', 0)}; materials filled the same way: {filled.get('material', 0)}.")
    w(f"- Part numbers whose shop data differs between blocks (first occurrence kept): {len(conflicts)}"
      + (" — " + ", ".join(list(conflicts)[:20]) if conflicts else ""))
    for k, v in qa.most_common():
        w(f"- {k}: {v}")
    for k, e in qa_ex.items():
        w(f"  - {k}: {', '.join(sorted(set(e))[:12])}")
    if num_pns:
        w("- Coverage against the numerical listings (part numbers printed there vs. seen in the")
        w("  application blocks; a number only in the listing means a block was missed or the listing")
        w("  carries a number no block prints):")
        for pre, label, mine in (("CB", "rod sets/pairs", app_pns), ("MS", "main sets", app_pns),
                                 ("SH", "cam sets", app_pns), ("TW", "thrust washer sets", app_pns),
                                 ("223", "pin bushings", app_pns), ("MB", "individual main bearings", shell_pns)):
            listed = {x for x in num_pns.get(pre, set())}
            if pre == "SH":
                listed = {x for x in listed if x.endswith("S")}
                mine_p = {x for x in mine if x.startswith("SH") and x.endswith("S")}
            elif pre == "CB":
                mine_p = {x for x in mine if x.startswith("CB")}
            elif pre == "MB":
                mine_p = {x for x in mine if x.startswith("MB")}
            else:
                mine_p = {x for x in mine if x.startswith(pre)}
            only_listed = sorted(listed - mine_p)
            only_mine = sorted(mine_p - listed)
            w(f"  - {label}: listing {len(listed)}, blocks {len(mine_p)}, only in listing {len(only_listed)}"
              + (f" ({', '.join(only_listed[:12])}{'...' if len(only_listed) > 12 else ''})" if only_listed else "")
              + f", only in blocks {len(only_mine)}"
              + (f" ({', '.join(only_mine[:12])}{'...' if len(only_mine) > 12 else ''})" if only_mine else ""))
    if shop.get("available"):
        w("- Cross-check with the shop tool's extraction of the same PDF (read only):")
        w(f"  - shop: {shop['shopBlocks']} blocks, {shop['shopEngines']} engines, {shop['shopParts']} set/pair rows,")
        w(f"    {shop['shopDistinctSetPns']} distinct set/pair numbers, {shop['shopDistinctShellPns']} distinct shell numbers;")
        w(f"    here: {shop['myBlocks']} blocks, {shop['myEngines']} engines, {shop['myParts']} rows, {shop['myDistinctSetPns']} set/pair")
        w(f"    numbers, {shop['myDistinctShellPns']} shell numbers.")
        w(f"  - set/pair numbers only in the shop file: {len(shop['setPnsOnlyInShop'])}"
          + (" — " + ", ".join(shop["setPnsOnlyInShop"][:20]) if shop["setPnsOnlyInShop"] else ""))
        w(f"  - set/pair numbers only here: {len(shop['setPnsOnlyHere'])}"
          + (" — " + ", ".join(shop["setPnsOnlyHere"][:20]) if shop["setPnsOnlyHere"] else ""))
        w(f"  - shell numbers only in the shop file: {len(shop['shellPnsOnlyInShop'])}"
          + (" — " + ", ".join(shop["shellPnsOnlyInShop"][:20]) if shop["shellPnsOnlyInShop"] else ""))
        w(f"  - shell numbers only here: {len(shop['shellPnsOnlyHere'])}"
          + (" — " + ", ".join(shop["shellPnsOnlyHere"][:20]) if shop["shellPnsOnlyHere"] else ""))
    else:
        w("- Shop tool extraction not available for cross-check" + (f" ({shop.get('error')})" if shop.get("error") else "") + ".")
    w("- Catalog misprints are kept as printed and flagged in the QA counts above (housing ranges printed")
    w("  max/min reversed such as `2.6530/2.6522`, a material printed as `ERROR:#`, an occasional")
    w("  `0.0005/0.0005` clearance). Nothing was corrected by hand.")
    w("- Year spans are model years from the catalog's VIN-code lists; engines without a printed year")
    w("  have no `y0`/`y1`. Rod sets shared across many engines carry the widest span.")
    w("- Family assignment for GM 350/400/455 V8s without a division name relies on the block's journal")
    w("  diameters and bore x stroke as described above; the unresolved list shows what was left under")
    w("  the make heading rather than guessed.")
    with open(os.path.join(OUT, "clevite.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
