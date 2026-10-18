#!/usr/bin/env python3
"""Extract ARP engine fastener kits from the ARP 2026 catalog PDF (saved by hand under Catalogs/;
the site blocks fetchers and its /api/ is robots-disallowed, so no network is used).

Layout: most pages are "application row x product column" grids. Part numbers (ddd-dddd) are
clustered into columns by x-position; the columns are labelled from the header phrases above
them (Hex / 12-Point, (complete) / (2-PC), 2-Bolt / 4-Bolt, Part No., ...). Rows are the bands
between the horizontal rule lines / shaded row rectangles; a band can hold a multi-line
application whose part numbers sit on the middle line. Bold capital lines are make/family
section headings and carry over page breaks. Two-up pages (main studs, diesel) are split at x.

Pages used (printed page numbers = PDF page numbers):
  43-44  aftermarket rod bolts SAE / metric (dimensional tables, Universal)
  46-52  OEM-replacement rod bolt grid (8 columns), 55-57 rod bolt torque & stretch chart
  59-71  head studs (4 columns + material column), 73-77 head bolts (6 columns)
  79-82  main studs (two-up, 2-/4-bolt), 84-85 main bolts (4 columns)
  87     rocker arm studs, 89 / 142 rocker pedestal studs
  90-91  valve cover, 94-95 header, 96-97 oil pan, 97 oil pump, 98-99 front cover / water pump
  104-105 intake manifold, 108-109 harmonic damper, 110 square-drive damper + oil pump driveshaft
  112-113 cam bolts + cam tower, 116-118 flywheel, 119 flexplate, 122 bellhousing
  138-142 diesel (head studs/bolts, rod bolts, main studs, damper, exhaust, valve cover,
          flywheel/flexplate)
Skipped on purpose: accessory studs, header collector bolts, water pump pulley, motor mount,
starter, fuel pump, seal plate, accessory cam drive, carburetor/air cleaner/distributor/float
bowl/coil/thermostat/blower, alternator, fuel pump pushrod, engine & accessory kits, Porsche/VW
engine case kits, driveline (torque converter, ring gear, carrier, rear cover, clutch, pressure
plate, transmission, pulleys, drive plates, brake hats, wheel studs), circle track, powersports,
SAE/metric stainless bulk bolts, nuts, washers, tools, ring compressors, apparel.

Output: out/arp.json (shared parts record format) and out/arp.md. Writes nothing outside out/.
Run with `python -X utf8 -I`.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from bisect import bisect_right
from collections import Counter, OrderedDict, defaultdict

import pdfplumber

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "out")
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", "ARPCatalog.pdf")
BRAND = "ARP"
DOC = "ARP 2026 Catalog (PDF)"
EDITION = "2026 (file dated 2025-11-03)"

PN_RE = re.compile(r"^\d{3}-\d{4}$")
BOLD = "AvenirNext-Bold"
DEMI = "DemiBold"

# ----------------------------------------------------------------------------------------------
# column label sets
# ----------------------------------------------------------------------------------------------
def L(**kw):
    return kw

ROD8 = [
    L(productLine="High Performance 8740", material="8740 chromoly", pack="complete set"),
    L(productLine="High Performance 8740", material="8740 chromoly", pack="2-piece pack"),
    L(productLine="High Performance Wave-Loc 8740", material="8740 chromoly", pack="complete set", shank="Wave-Loc"),
    L(productLine="High Performance Wave-Loc 8740", material="8740 chromoly", pack="2-piece pack", shank="Wave-Loc"),
    L(productLine="Pro Wave-Loc ARP2000", material="ARP2000", pack="complete set", shank="Wave-Loc"),
    L(productLine="Pro Wave-Loc ARP2000", material="ARP2000", pack="2-piece pack", shank="Wave-Loc"),
    L(productLine="Pro Series ARP2000", material="ARP2000", pack="complete set"),
    L(productLine="Pro Series ARP2000", material="ARP2000", pack="2-piece pack"),
]
HEADSTUD4 = [
    L(productLine="Pro Series", nuts="hex"),
    L(productLine="Pro Series", nuts="hex", undercut=True),
    L(productLine="Pro Series", nuts="12-point"),
    L(productLine="Pro Series", nuts="12-point", undercut=True),
]
HEADBOLT6 = [
    L(productLine="High Performance", material="8740 chromoly", headStyle="hex", tensilePsi=180000),
    L(productLine="High Performance", material="8740 chromoly", headStyle="12-point", tensilePsi=180000),
    L(productLine="Pro Series", material="8740 chromoly", headStyle="hex", tensilePsi=190000),
    L(productLine="Pro Series", material="8740 chromoly", headStyle="12-point", tensilePsi=190000),
    L(productLine="ARP Stainless", material="stainless", headStyle="hex"),
    L(productLine="ARP Stainless", material="stainless", headStyle="12-point"),
]
HEADBOLT6_LS = [  # page 74 LS-series sub-header: 8740 (190,000) / ARP2000 (220,000) / Polished Inconel (220,000)
    L(productLine="8740 (190,000 psi)", material="8740 chromoly", headStyle="hex", tensilePsi=190000),
    L(productLine="8740 (190,000 psi)", material="8740 chromoly", headStyle="12-point", tensilePsi=190000),
    L(productLine="ARP2000 (220,000 psi)", material="ARP2000", headStyle="hex", tensilePsi=220000),
    L(productLine="ARP2000 (220,000 psi)", material="ARP2000", headStyle="12-point", tensilePsi=220000),
    L(productLine="Polished Inconel (220,000 psi)", material="Inconel", headStyle="hex", tensilePsi=220000),
    L(productLine="Polished Inconel (220,000 psi)", material="Inconel", headStyle="12-point", tensilePsi=220000),
]
MAINSTUD2 = [L(mainCaps="2-bolt"), L(mainCaps="4-bolt")]
MAINBOLT4 = [
    L(productLine="High Performance", material="8740 chromoly", mainCaps="2-bolt", tensilePsi=180000),
    L(productLine="High Performance", material="8740 chromoly", mainCaps="4-bolt", tensilePsi=180000),
    L(productLine="Pro Series", material="8740 chromoly", mainCaps="2-bolt", tensilePsi=190000),
    L(productLine="Pro Series", material="8740 chromoly", mainCaps="4-bolt", tensilePsi=190000),
]
ROCKER3 = [
    L(productLine="High Performance", material="8740 chromoly", pack="full set"),
    L(productLine="High Performance", material="8740 chromoly", pack="2-pack"),
    L(productLine="Pro Series", material="8740 chromoly", pack="full set"),
]
STUDBOLT8 = [
    L(kitType="stud kit", finish="black oxide", material="8740 chromoly", nuts="hex"),
    L(kitType="stud kit", finish="black oxide", material="8740 chromoly", nuts="12-point"),
    L(kitType="stud kit", finish="polished", material="stainless", nuts="hex"),
    L(kitType="stud kit", finish="polished", material="stainless", nuts="12-point"),
    L(kitType="bolt kit", finish="black oxide", material="8740 chromoly", headStyle="hex"),
    L(kitType="bolt kit", finish="black oxide", material="8740 chromoly", headStyle="12-point"),
    L(kitType="bolt kit", finish="polished", material="stainless", headStyle="hex"),
    L(kitType="bolt kit", finish="polished", material="stainless", headStyle="12-point"),
]
BOSS4 = [
    L(finish="black oxide", material="8740 chromoly", headStyle="hex"),
    L(finish="black oxide", material="8740 chromoly", headStyle="12-point"),
    L(finish="polished", material="stainless", headStyle="hex"),
    L(finish="polished", material="stainless", headStyle="12-point"),
]
INTAKE6 = [
    L(kitType="bolt kit", finish="black oxide", material="8740 chromoly", headStyle="hex"),
    L(kitType="bolt kit", finish="black oxide", material="8740 chromoly", headStyle="12-point"),
    L(kitType="stud kit", finish="black oxide", material="8740 chromoly"),
    L(kitType="bolt kit", finish="polished", material="stainless", headStyle="hex"),
    L(kitType="bolt kit", finish="polished", material="stainless", headStyle="12-point"),
    L(kitType="bolt kit", finish="black oxide", material="8740 chromoly", headStyle="12-point", drilled=True, productLine="NASCAR drilled"),
]
PN1 = [L()]
PRO1 = [L(productLine="Pro Series", material="8740 chromoly", tensilePsi=190000)]
HPPRO2 = [
    L(productLine="High Performance", material="8740 chromoly", tensilePsi=180000),
    L(productLine="Pro Series", material="8740 chromoly", tensilePsi=190000),
]
EXH3 = [
    L(kitType="bolt kit", material="stainless", headStyle="12-point"),
    L(kitType="bolt kit", material="stainless", headStyle="hex"),
    L(kitType="stud kit", material="stainless", nuts="12-point"),
]
VC2 = [L(headStyle="hex"), L(headStyle="12-point")]

A_HEX = r"^(Hex|12-Point)$"
A_PARTNO = r"^Part No\.$"

# ----------------------------------------------------------------------------------------------
# table blocks: page, y-range, x-range (None = whole), halves split x, anchors regex, columns
# ----------------------------------------------------------------------------------------------
def B(page, app, anchors, cols, y0=40, y1=745, x0=30, x1=575, split=None, extras=None,
      section=None, group_xmax=None, headers_at=None, overrides=None, diesel=False, note=None):
    return dict(page=page, app=app, anchors=anchors, cols=cols, y0=y0, y1=y1, x0=x0, x1=x1, split=split,
                extras=extras or [], section=section, group_xmax=group_xmax,
                headers_at=headers_at, overrides=overrides or [], diesel=diesel, note=note)

# inline dimension columns, located by their header phrase (ordered left to right)
X_HEADSTYLE = [("headStyleCode", r"^(Head|Style)$")]
X_MATERIAL = [("material", r"^Material$")]
X_ROCKER = [("lengthB", r"^B$"), ("lengthC", r"^C$"), ("lengthD", r"^D$"), ("threadTop", r"^E$"), ("threadBase", r"^F$")]
X_QSL = [("qty", r"^Qty\.?$"), ("size", r"^Size$"), ("length", r"^(STUD OAL|BOLT UHL|STUD|OAL|BOLT|UHL)$")]
X_UTS = [("uhl", r"^UHL$"), ("thread", r"^Thread$"), ("socket", r"^Socket$")]
X_UT = [("uhl", r"^UHL$"), ("thread", r"^Thread Size$")]
X_TL = [("thread", r"^Thread Size$"), ("length", r"^(Stud OAL|Bolt UHL)$")]

BLOCKS = []
BLOCKS += [B(46, "rod bolt", r"^\((complete|2-PC)\)$", ROD8, y0=380, extras=X_HEADSTYLE)]
BLOCKS += [B(p, "rod bolt", r"^\((complete|2-PC)\)$", ROD8, extras=X_HEADSTYLE) for p in range(47, 53)]
BLOCKS += [B(p, "head stud", r"^(Hex Nuts|12-Point Nuts|U/C Studs)$", HEADSTUD4, extras=X_MATERIAL) for p in range(59, 72)]
BLOCKS += [B(73, "head bolt", A_HEX, HEADBOLT6, y0=270)]
BLOCKS += [B(74, "head bolt", A_HEX, HEADBOLT6, overrides=[("CHEVROLET, SMALL BLOCK - LS SERIES", HEADBOLT6_LS)])]
BLOCKS += [B(p, "head bolt", A_HEX, HEADBOLT6) for p in (75, 76, 77)]
BLOCKS += [B(p, "main stud", r"^(2-Bolt|4-Bolt)$", MAINSTUD2, split=(312 if p % 2 else 292), y1=(598 if p == 82 else 745)) for p in (79, 80, 81, 82)]
BLOCKS += [B(p, "main bolt", r"^(2-Bolt Main|4-Bolt Main)$", MAINBOLT4) for p in (84, 85)]
BLOCKS += [B(87, "rocker arm stud", r"^(Full Set|2-Pack|Pro Series)$", ROCKER3, y1=705, extras=X_ROCKER, section="UNIVERSAL")]
BLOCKS += [B(89, "rocker pedestal stud", A_PARTNO, PN1, y0=695, section="DODGE/RAM", diesel=True)]
BLOCKS += [B(90, "valve cover", A_HEX, STUDBOLT8, y0=455, extras=X_QSL),
           B(91, "valve cover", A_HEX, STUDBOLT8, extras=X_QSL)]
BLOCKS += [B(94, "header bolt/stud", A_HEX, STUDBOLT8, y0=390, extras=X_QSL),
           B(95, "header bolt/stud", A_HEX, STUDBOLT8, extras=X_QSL)]
BLOCKS += [B(96, "oil pan", A_HEX, STUDBOLT8, y0=420), B(97, "oil pan", A_HEX, STUDBOLT8, y1=430, headers_at=96)]
BLOCKS += [B(97, "oil pump", A_HEX, BOSS4, y0=595)]
BLOCKS += [B(98, "front cover/water pump", A_HEX, STUDBOLT8, y0=280),
           B(99, "front cover/water pump", A_HEX, STUDBOLT8, y1=330)]
BLOCKS += [B(104, "intake manifold", r"^(Hex|12-Point|NASCAR|Stud)$", INTAKE6, y0=335),
           B(105, "intake manifold", r"^(Hex|12-Point|NASCAR|Stud)$", INTAKE6, y1=600)]
BLOCKS += [B(108, "harmonic damper bolt", A_PARTNO, PRO1, y0=450, extras=X_UTS),
           B(109, "harmonic damper bolt", A_PARTNO, PRO1, extras=X_UTS)]
BLOCKS += [B(110, "harmonic damper bolt (square drive)", A_PARTNO, PRO1, y0=125, y1=300, x0=340),
           B(110, "oil pump driveshaft", A_PARTNO, PN1, y0=625, x1=300),
           B(110, "oil pump driveshaft", A_PARTNO, PN1, y0=585, x0=300)]
BLOCKS += [B(112, "cam bolt", r"^(High Perf\.|Pro Series)$", HPPRO2, y0=255, extras=X_UTS),
           B(113, "cam bolt", r"^(High Perf\.|Pro Series)$", HPPRO2, y1=340, extras=X_UTS),
           B(113, "cam tower bolt/stud", r"^(High Perf\.|Pro Series)$", HPPRO2, y0=435, extras=X_UTS)]
BLOCKS += [B(116, "flywheel bolt", A_PARTNO, PRO1, y0=450, extras=X_UT),
           B(117, "flywheel bolt", A_PARTNO, PRO1, extras=X_UT),
           B(118, "flywheel bolt", A_PARTNO, PRO1, extras=X_UT),
           B(119, "flexplate bolt", A_PARTNO, PRO1, y0=240, extras=X_UT)]
BLOCKS += [B(122, "bellhousing", A_HEX, BOSS4, y0=385, extras=X_TL)]
# diesel section
BLOCKS += [B(138, "head stud", A_PARTNO, PN1, y0=445, split=295, diesel=True),
           B(139, "head stud", A_PARTNO, PN1, y0=85, y1=440, split=300, diesel=True),
           B(139, "head bolt", A_PARTNO, PN1, y0=470, y1=570, split=300, diesel=True),
           B(139, "rod bolt", A_PARTNO, PN1, y0=600, split=300, diesel=True),
           B(140, "main stud", A_PARTNO, PN1, y0=85, y1=540, split=295, diesel=True),
           B(140, "harmonic damper bolt", A_PARTNO, PN1, y0=580, diesel=True, section="DIESEL"),
           B(141, "exhaust manifold", r"^(12 Pt|Hex)$", EXH3, y0=95, y1=560, group_xmax=165, diesel=True),
           B(141, "valve cover", A_HEX, VC2, y0=590, split=310, diesel=True),
           B(142, "flywheel bolt", A_PARTNO, PRO1, y0=90, y1=365, extras=X_UT, diesel=True, section="DIESEL"),
           B(142, "rocker pedestal stud", A_PARTNO, PN1, y0=400, y1=455, section="DODGE/RAM", diesel=True)]

SKIPPED = [
    ("92", "accessory studs"), ("93", "header collector bolts (dimensional bulk hardware)"),
    ("99 bottom", "water pump pulley studs/bolts"), ("100-103, 105-107, 111", "motor mount, starter, fuel pump, seal plate, "
     "accessory cam drive, carburetor, air cleaner, distributor, carburetor float bowl, coil bracket, thermostat housing, "
     "blower, alternator, fuel pump pushrod"), ("82 bottom", "Porsche/Subaru/Toyota engine case kits"),
    ("88-89 top", "Perma-Loc rocker arm adjusters"), ("114-115", "engine & accessory kits"),
    ("120-121, 123-127", "torque converter, ring gear, carrier, rear end cover, clutch cover, pressure plate, transmission "
     "case/pan, lower pulley, drive plate, sprint car drive pins, brake hat"), ("128-136", "wheel studs, circle track"),
    ("142 bottom", "ring compressors"), ("143", "powersports"), ("144-178", "SAE/metric stainless bolts, nuts, washers, "
     "insert washers, weld bungs, bulk bins, lube, tools, apparel"), ("37", "general torque recommendations by diameter (not per part number)"),
]

# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def clean_text(s):
    s = s.replace("˝", '"').replace("”", '"').replace("’", "'").replace("–", "-")
    s = re.sub(r"(\d) \.(\d)", r"\1.\2", s)          # "2 .8L" -> "2.8L"
    s = re.sub(r"(\d)\. (\d)", r"\1.\2", s)          # "2. 8L" -> "2.8L"
    s = re.sub(r"\( \.", "(.", s)
    s = re.sub(r"\s+\.\)", ".)", s)
    s = re.sub(r" \.(\d)", r" .\1", s)
    s = re.sub(r"(\w) \.(?=\s|$)", r"\1.", s)        # "No ." -> "No."
    s = re.sub(r"\s+,", ",", s)
    s = re.sub(r"\s{2,}", " ", s)
    return s.strip(" .;,")


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def frac_in(s):
    """'7/16' -> 0.4375, '1-1/16' -> 1.0625, '3/8-16' -> 0.375 (diameter of fractional thread)."""
    m = re.match(r"^(?:(\d+)-)?(\d+)/(\d+)(?:-\d+)?$", s)
    if not m:
        return None
    whole = int(m.group(1) or 0)
    return round(whole + int(m.group(2)) / int(m.group(3)), 4)


THREAD_RE = r"(?:M\d+(?:\.\d+)? ?x ?\d+(?:\.\d+)?|\d+/\d+-\d+|\d+/\d+|M\d+|\d+-\d+)"


def thread_info(th):
    """Return (threadString, diameterIn or None, diameterMm or None)."""
    if not th:
        return None, None, None
    t = re.sub(r"\s*x\s*", "x", th.strip())
    m = re.match(r"^M(\d+(?:\.\d+)?)(?:x([\d.]+))?$", t)
    if m:
        return t, None, float(m.group(1))
    d = frac_in(t)
    return t, d, None


def years(text):
    y0 = y1 = None
    m = re.search(r"((?:19|20)\d\d)\s*-\s*'?((?:19|20)?\d\d)\b", text)
    if m:
        y0 = int(m.group(1))
        b = m.group(2)
        y1 = int(b) if len(b) == 4 else int(str(y0)[:2] + b)
        if y1 < y0:
            y1 += 100
        return y0, y1
    m = re.search(r"'(\d\d)\s*-\s*'(\d\d)\b", text)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        y0 = 1900 + a if a > 30 else 2000 + a
        y1 = 1900 + b if b > 30 else 2000 + b
        return y0, y1
    m = re.search(r"\(?((?:19|20)\d\d)\s*&\s*(later|up|newer)", text)
    if m:
        return int(m.group(1)), None
    m = re.search(r"\(?((?:19|20)\d\d)\s*&\s*(earlier|prior|older)", text)
    if m:
        return None, int(m.group(1))
    return None, None


MATERIAL_WORDS = [
    (r"Custom Age 625\+|CA ?625\+|CA625", "Custom Age 625+"),
    (r"ARP ?2000", "ARP2000"), (r"ARP ?3\.5", "ARP3.5"), (r"\bL19\b", "L19"),
    (r"Inconel", "Inconel"), (r"Stainless", "stainless"), (r"\b8740\b", "8740 chromoly"),
]


def material_in(text):
    for pat, mat in MATERIAL_WORDS:
        if re.search(pat, text, re.I):
            return mat
    return None


def strip_material(text):
    t = re.sub(r"\s*-?\s*(?:Custom Age 625\+|CA ?625\+|CA625|ARP ?2000|ARP ?3\.5|\bL19\b)(?:\s*\(2[12]0,000 psi\))?", "", text)
    return clean_text(t)


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
FAM_CYL = {
    "Small-block Chevy": 8, "Chevy Mark IV big block": 8, "Chevy Gen VI big block": 8, "Chevy W-series 348/409": 8,
    "GM LS": 8, "GM LT (Gen V)": 8, "Small-block Ford (Windsor)": 8, "Ford 351C/351M/400": 8, "Ford FE": 8,
    "Ford 429/460": 8, "Ford Modular": 8, "Ford Coyote": 8, "Ford Godzilla 7.3": 8, "Mopar LA small block": 8,
    "Mopar Magnum 5.2/5.9": 8, "Mopar B/RB big block": 8, "Chrysler 426 Hemi": 8, "Chrysler Gen III Hemi 5.7/6.1": 8,
    "Chrysler Gen III Hemi 6.2/6.4": 8, "Pontiac V8": 8, "Oldsmobile V8": 8, "Buick big block": 8, "Buick 350": 8,
    "Buick V6 181-252": 6, "Cadillac 368-500": 8, "AMC V8": 8, "AMC/Jeep inline-6": 6, "Chevy inline-6": 6,
    "Ford 240/300 inline-6": 6, "Mopar Slant Six": 6, "Cummins 5.9 12V": 6, "Cummins 5.9 24V/CR": 6, "Cummins 6.7": 6,
    "Duramax 6.6": 8, "Powerstroke 7.3": 8, "Powerstroke 6.0": 8, "Powerstroke 6.4": 8, "Powerstroke 6.7": 8,
}
KNOWN_FAMS = set(FAM_CYL)
ACRO = {"bmw", "amc", "bmc", "gm", "gmc", "kb", "svo", "ls", "lt", "vw", "mgb", "drce", "sohc", "dohc", "fe", "ii", "iii", "iv", "v6", "v8", "v10"}


def nice(s):
    s = re.sub(r"\s*-\s*SEE .*$", "", s)
    s = re.sub(r"\s*-\s*BELLHOUSING.*$", "", s)
    s = re.sub(r"\s*\(SIDE BOLTS.*\)$", "", s)
    s = s.replace(",", "")
    words = []
    for w in s.lower().split():
        if "/" in w:
            words.append("/".join(x.upper() if x in ACRO else x[:1].upper() + x[1:] for x in w.split("/")))
        elif w in ACRO:
            words.append(w.upper())
        elif w in ("and", "to", "with", "w/"):
            words.append(w)
        else:
            words.append(w[:1].upper() + w[1:])
    return " ".join(words)


def H(label):
    return f"{label} (catalog heading)"


def numbers3(text):
    return [int(n) for n in re.findall(r"(?<![\d.])([1-7]\d\d)(?![\d.])", text)]


SBC_N = {262, 265, 267, 283, 302, 305, 307, 327, 350, 400}
BBC_N = {366, 396, 402, 427, 454, 502, 572}
W_N = {348, 409}
SBF_N = {221, 255, 260, 289, 302, 351}
FE_N = {330, 332, 352, 360, 361, 390, 406, 410, 427, 428}
BBF_N = {429, 460, 514}
LA_N = {273, 318, 340, 360}
BRB_N = {361, 383, 400, 413, 426, 440}
HEMI_N = {426, 472, 528, 572}
PONT_N = {265, 287, 301, 326, 350, 389, 400, 421, 428, 455}
OLDS_N = {260, 307, 330, 350, 400, 403, 425, 455}
AMC8_N = {290, 304, 343, 360, 390, 401}
AMC6_N = {199, 232, 258}
CHEV6_N = {194, 230, 250, 292}
FORD6_N = {240, 300}
SLANT_N = {170, 198, 225}
CAD_N = {368, 425, 472, 500}


NON_MAKE_HEADINGS = {"CAST ALUMINUM COVERS", "STAMPED STEEL COVERS", "UNIVERSAL", "FLYWHEEL BOLTS", "FLEXPLATE BOLTS", "DIESEL"}


def make_from_text(t):
    if re.search(r"Chev|SBC|BBC|\bLS\b|LS[1-9]|LT1|Mark IV|Mark V|Vortec|Duramax|\bGM\b|SB ?2", t):
        return "CHEVROLET"
    if re.search(r"Ford|SVO|Windsor|351|Power ?Stroke|Coyote|Modular", t):
        return "FORD"
    if "Pontiac" in t:
        return "PONTIAC"
    if re.search(r"Olds", t):
        return "OLDSMOBILE"
    if "Buick" in t:
        return "BUICK"
    if re.search(r"Chrysler|Mopar|Dodge|Hemi|Cummins", t):
        return "CHRYSLER"
    return None


def families(section, text, diesel=False):
    """Return list of fit.fam strings for an application row."""
    text = re.sub(r"\(except[^)]*\)", "", text or "")
    sec = (section or "").upper().strip()
    base = re.sub(r"\s*-\s*(LS SERIES|LT SERIES|BELLHOUSING.*|SEE .*)$", "", sec).strip()
    base = re.sub(r"\s*\(SIDE BOLTS.*\)$", "", base).strip()
    t = text or ""
    T = t.lower()
    nums = set(numbers3(t))
    fams = []

    def add(*fs):
        for f in fs:
            if f and f not in fams:
                fams.append(f)

    # ---- diesel keywords win regardless of section
    if "duramax" in T:
        if re.search(r"\b2\.8", t):
            return [H("Duramax 2.8L")]
        return ["Duramax 6.6"]
    if re.search(r"power ?stroke", T):
        if re.search(r"7\.3", t): add("Powerstroke 7.3")
        if re.search(r"6\.0", t): add("Powerstroke 6.0")
        if re.search(r"6\.4", t): add("Powerstroke 6.4")
        if re.search(r"6\.7", t): add("Powerstroke 6.7")
        return fams or [H("Ford Power Stroke")]
    if "international" in T and re.search(r"7\.3|6\.9", t):
        return [H("Ford/International IDI diesel")]
    if "cummins" in T or base in ("CUMMINS", "DODGE/RAM") or (diesel and base == "DODGE"):
        if re.search(r"4BT|\b3\.9L", t):
            return [H("Cummins 3.9L 4BT")]
        if re.search(r"\bIS[LFV]|\bC8\.3|\b8\.[39]L", t):
            return [H("Cummins ISB/ISL/ISF industrial")]
        if "12v" in T: add("Cummins 5.9 12V")
        if "24v" in T or re.search(r"1998 & later|2004 & later|late '97|2003|VP44|common rail", t, re.I): add("Cummins 5.9 24V/CR")
        if re.search(r"6\.7", t): add("Cummins 6.7")
        if fams:
            return fams
        if re.search(r"5\.9", t):
            return ["Cummins 5.9 12V", "Cummins 5.9 24V/CR"]
        return [H("Cummins")]
    if base == "CATERPILLAR" or "caterpillar" in T or re.search(r"\bC15\b", t):
        return [H("Caterpillar")]
    if base in ("CHEVROLET/GMC",) and re.search(r"6\.2L", t):
        return [H("GM 6.2L diesel")]

    # ---- Chevrolet
    if base.startswith("CHEVROLET") or base in ("GENERAL MOTORS", "CHEVROLET/GMC"):
        ls = re.search(r"LS Series|Gen III/IV|Gen III/LS|Gen III LS|\bLS[1-79X]\b|LSA\b|LSX|Gen IV|Motown LS|LS Next|Warhawk LS|RHS", t)
        lt = re.search(r"Gen V\b|LT1/LT4|\bLT4\b|LT-series", t)
        if sec.endswith("LT SERIES") or lt:
            return ["GM LT (Gen V)"]
        if sec.endswith("LS SERIES") or ls:
            return ["GM LS"]
        if "BIG BLOCK" in base or re.search(r"big block|\bBBC\b", T):
            if nums & W_N or re.search(r"\bW\b", t):
                return ["Chevy W-series 348/409"]
            if re.search(r"8\.1|8100|\b496\b|Vortec", t):
                return [H("Chevy 8.1L Vortec big block")]
            if re.search(r"Mark V\b|Mark VI|Mark V &|Gen VI|\b502\b", t) and not re.search(r"Mark IV", t):
                return ["Chevy Gen VI big block"]
            if re.search(r"Mark IV", t) and not re.search(r"Mark V|Mark VI", t):
                return ["Chevy Mark IV big block"]
            return ["Chevy Mark IV big block", "Chevy Gen VI big block"]
        if base in ("CHEVROLET", "CHEVROLET/GMC") and re.search(r"V6 & V8|V6 and V8", t):
            return ["Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", H("Chevrolet V6")]
        if "CYLINDER" in base or re.search(r"inline[ -]?6|\bV6\b|4-cylinder|Vega|Corvair|Cosworth|Ecotec|Quad 4|2\.0L|2\.2L|2\.4L|2\.8L|3\.4L|3\.8L|4\.3L", t):
            if nums & CHEV6_N or re.search(r"inline[ -]?6", T):
                return ["Chevy inline-6"]
            if re.search(r"\bV6\b|4\.3|2\.8L|3\.4L|60°|90°", t):
                return [H("Chevrolet V6")]
            return [H("Chevrolet 4-cylinder")]
        if base == "CHEVROLET" or base == "CHEVROLET/GMC":
            if nums & W_N:
                return ["Chevy W-series 348/409"]
            big = bool(nums & BBC_N) or re.search(r"big block|\bBB\b|Mark IV|Mark V|Mark VI", t, re.I)
            small = bool(nums & SBC_N) or re.search(r"small block|\bSB\b|SBC|Vortec|Tuned Port|SB ?2|Rocket", t, re.I)
            allv8 = re.search(r"All V8|V6 & V8|V8", t) and not big and not small
            if big: add("Chevy Mark IV big block", "Chevy Gen VI big block")
            if small: add("Small-block Chevy")
            if allv8 or (not fams):
                add("Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block")
            return fams
        # CHEVROLET, SMALL BLOCK (and anything left)
        return ["Small-block Chevy"]

    # ---- Chrysler / Dodge / Mopar
    if base.startswith("CHRYSLER") or base in ("DODGE", "DODGE/RAM", "CHRYSLER DODGE", "CHRYSLER/DODGE", "MOPAR"):
        if re.search(r"Viper|V10|V-10", t):
            return [H("Dodge Viper V10")]
        if re.search(r"Slant Six|slant 6", t, re.I) or nums & SLANT_N and "CYLINDER" in base:
            return ["Mopar Slant Six"]
        if re.search(r"KB Hemi|Top Fuel", t, re.I):
            return [H("Top Fuel / KB Hemi")]
        if re.search(r"Gen III Hemi|5\.7L|6\.1L|6\.4L|6\.2L|Hellcat|Demon", t) and not re.search(r"Gen II", t):
            if re.search(r"5\.7|6\.1", t): add("Chrysler Gen III Hemi 5.7/6.1")
            if re.search(r"6\.2|6\.4", t): add("Chrysler Gen III Hemi 6.2/6.4")
            return fams or ["Chrysler Gen III Hemi 5.7/6.1"]
        if "CYLINDER" in base or re.search(r"\b2\.[0245]L|\b1\.[68]L|Neon|SRT-4|4-cylinder", t):
            return [H("Chrysler 4-cylinder")]
        if re.search(r"354-392|331|early Hemi|Gen I Hemi", t):
            add(H("Chrysler early Hemi 331-392"))
        if re.search(r"426.{0,30}Hemi|Hemi.{0,10}426|Gen II", t):
            add("Chrysler 426 Hemi")
        if nums & LA_N or re.search(r"\bLA\b|small block", t, re.I) and "BIG" not in base:
            add("Mopar LA small block")
        if re.search(r"Magnum", t):
            add("Mopar Magnum 5.2/5.9")
        if nums & BRB_N or "BIG BLOCK" in base or re.search(r"\bRB\b|\bB/RB\b|big block|Wedge", t) and not nums & LA_N:
            if not (nums == {426} and "Hemi" in t):
                add("Mopar B/RB big block")
        if fams:
            return fams
        if "SMALL BLOCK" in base:
            return ["Mopar LA small block"]
        return [H(nice(base))]

    # ---- Ford
    if base.startswith("FORD"):
        if re.search(r"Godzilla|7\.3L", t) and "GODZILLA" in base or "GODZILLA" in base:
            return ["Ford Godzilla 7.3"]
        if "COYOTE" in base or re.search(r"Coyote|5\.0L \(20|5\.2L|Voodoo|Predator", t):
            return ["Ford Coyote"]
        if "MODULAR" in base or re.search(r"Modular|4\.6L|5\.4L|6\.8L|Triton", t):
            return ["Ford Modular"]
        if "FLATHEAD" in base or re.search(r"Flathead", t, re.I):
            return [H("Ford Flathead V8")]
        if re.search(r"Y block|Y-block", t, re.I) or nums & {239, 256, 272, 292, 312} and "SMALL" in base:
            return [H("Ford Y-block")]
        if "CYLINDER" in base or re.search(r"EcoBoost|Zetec|Duratec|Pinto|Lima|2\.0L|2\.3L|1\.6L|2\.5L|2\.7L|3\.5L|Cyclone|3\.0L", t):
            if nums & FORD6_N or re.search(r"inline[ -]?6|\b300 cid|\b240", t, re.I):
                return ["Ford 240/300 inline-6"]
            if re.search(r"Model A|Model B", t):
                return [H("Ford Model A/B 4-cylinder")]
            return [H("Ford 4, 5 and 6-cylinder")]
        if re.search(r"351C|351M|400M|Cleveland|351-400M|\b400\b(?! ?hp)", t):
            add("Ford 351C/351M/400")
        if nums & FE_N or re.search(r"\bFE\b", t):
            add("Ford FE")
        if nums & BBF_N or re.search(r"385 series|Boss 429", t):
            add("Ford 429/460")
        if nums & SBF_N or re.search(r"351W|Windsor|\b5\.0L?\b|\bSVO\b|Boss 302|small block", t, re.I):
            add("Small-block Ford (Windsor)")
        if re.search(r"289-460|260-460", t):
            add("Small-block Ford (Windsor)", "Ford FE", "Ford 429/460")
        if fams:
            return fams
        if "SMALL BLOCK" in base:
            return ["Small-block Ford (Windsor)"]
        if "BIG BLOCK" in base:
            return [H("Ford big block")]
        return [H("Ford")]

    # ---- other domestic
    if base == "PONTIAC":
        if re.search(r"Super Duty 4|4 cylinder|4-cylinder|2\.5L|Iron Duke|Tempest 4", t, re.I):
            return [H("Pontiac 4-cylinder")]
        if re.search(r"3800|\bV6\b|3\.8L|231", t):
            return [H("Pontiac/Buick 3800 V6")]
        return ["Pontiac V8"]
    if base == "OLDSMOBILE":
        if re.search(r"Quad 4|2\.3L|2\.4L|4-cylinder", t, re.I):
            return [H("Oldsmobile Quad 4")]
        if re.search(r"DRCE", t):
            return [H("Oldsmobile DRCE")]
        return ["Oldsmobile V8"]
    if base == "BUICK":
        if re.search(r"\bV6\b|3\.8|Stage|231|252|Grand National|turbo", t, re.I):
            add("Buick V6 181-252")
        if re.search(r"\b215\b|Rover", t):
            add(H("Buick/Rover 215 aluminum V8"))
        if re.search(r"nail ?head|\b401\b|\b425\b|\b364\b", t, re.I):
            add(H("Buick Nailhead 364-425"))
        if re.search(r"\b455\b|\b430\b|\b400\b|big block", t, re.I):
            add("Buick big block")
        if re.search(r"\b350\b|\b300\b|\b340\b", t) and "Buick/Rover" not in " ".join(fams):
            add("Buick 350")
        if re.search(r"All V6 & V8|V6 & V8", t):
            add("Buick V6 181-252", "Buick 350", "Buick big block")
        return fams or [H("Buick")]
    if base == "CADILLAC":
        if nums & CAD_N:
            return ["Cadillac 368-500"]
        return [H("Cadillac 331-429")]
    if base == "AMC":
        if nums & AMC6_N or re.search(r"inline[ -]?6|4\.0L|4\.2L|6-cylinder", t, re.I):
            return ["AMC/Jeep inline-6"]
        return ["AMC V8"]
    if base == "JEEP":
        if nums & AMC6_N or re.search(r"4\.0L|4\.2L|inline[ -]?6|\b258\b|6-cyl", t, re.I):
            return ["AMC/Jeep inline-6"]
        if nums & AMC8_N or re.search(r"\b304\b|\b360\b|\b401\b", t):
            return ["AMC V8"]
        return [H("Jeep")]
    if base in ("UNIVERSAL",) or base.startswith("UNIVERSAL"):
        return ["Universal"]
    if base == "TOP FUEL":
        return [H("Top Fuel / KB Hemi")]
    if base == "DIESEL" or diesel:
        if re.search(r"Oldsmobile|5\.7L \(350", t):
            return ["Oldsmobile V8"]
        if re.search(r"GMC 6\.2|6\.2L", t):
            return [H("GM 6.2L diesel")]
        if re.search(r"Nissan|YD25", t):
            return [H("Nissan diesel")]
        return [H("Diesel")]
    if not base:
        return [H("Unlabelled section")]
    return [H(nice(base))]


def ci_from(text, fams):
    """Displacement list from 'cid' numbers / hyphenated chains, only for known domestic families."""
    if not fams or all(f not in KNOWN_FAMS or f.startswith(("Cummins", "Duramax", "Powerstroke", "GM L", "Ford Mod", "Ford Coy", "Ford God", "Chrysler Gen III")) for f in fams):
        return None
    out = []
    for chain in re.findall(r"(?<![\d.])((?:[1-7]\d\d)(?:-[1-7]\d\d)*)(?![\d.])\s*(?:cid|cu|\b)", text):
        parts = [int(x) for x in chain.split("-")]
        if len(parts) == 1 and not re.search(rf"\b{parts[0]}\s*(?:cid|cu)", text) and not re.search(rf"\b{parts[0]}-\d", text) and not re.search(rf"\b{parts[0]}(W|C|M)\b", text):
            # lone 3-digit number without 'cid' and not a displacement code: accept only if a known displacement
            if parts[0] not in (SBC_N | BBC_N | W_N | SBF_N | FE_N | BBF_N | LA_N | BRB_N | HEMI_N | PONT_N | OLDS_N | AMC8_N | AMC6_N | CHEV6_N | FORD6_N | SLANT_N | CAD_N | {455, 430, 364, 401, 425, 215}):
                continue
        for p in parts:
            if 100 <= p <= 700 and p not in out:
                out.append(p)
    for m in re.finditer(r"(?<![\d.])([1-7]\d\d)(W|C)\b", text):
        v = int(m.group(1))
        if v not in out:
            out.append(v)
    return out or None


# ----------------------------------------------------------------------------------------------
# page parsing
# ----------------------------------------------------------------------------------------------
def page_words(pg):
    ws = pg.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False, extra_attrs=["fontname", "size"])
    out = []
    for w in ws:
        if "ZapfDingbats" in w["fontname"]:
            continue
        if w["top"] < 40 or w["top"] > 745:
            continue
        w["cx"] = (w["x0"] + w["x1"]) / 2
        w["bold"] = BOLD in w["fontname"]
        w["demi"] = DEMI in w["fontname"]
        w["pn"] = bool(PN_RE.match(w["text"]))
        out.append(w)
    return out


def group_lines(words, tol=2.5):
    lines = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if lines and abs(lines[-1]["top"] - w["top"]) <= tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
        ln["text"] = " ".join(w["text"] for w in ln["words"])
        ln["pn"] = any(w["pn"] for w in ln["words"])
        ln["bold"] = any(w["bold"] for w in ln["words"]) and not ln["pn"]
        ln["bottom"] = max(w["bottom"] for w in ln["words"])
    return lines


def phrases(line, gap=6):
    out = []
    for w in line["words"]:
        if out and w["x0"] - out[-1]["x1"] <= gap:
            out[-1]["text"] += " " + w["text"]
            out[-1]["x1"] = w["x1"]
        else:
            out.append({"text": w["text"], "x0": w["x0"], "x1": w["x1"], "top": w["top"]})
    for p in out:
        p["text"] = re.sub(r"\s+\.", ".", p["text"]).strip()
        p["cx"] = (p["x0"] + p["x1"]) / 2
    return out


def separators(pg, x0, x1, y0, y1):
    ys = set()
    for ln in pg.lines:
        if abs(ln["y0"] - ln["y1"]) < 1 and ln["x1"] - ln["x0"] > 60:
            ov = min(ln["x1"], x1) - max(ln["x0"], x0)
            if ov > 0.5 * (ln["x1"] - ln["x0"]) and y0 - 3 <= ln["top"] <= y1 + 3:
                ys.add(round(ln["top"], 1))
    for r in pg.rects:
        if 8 <= r["height"] <= 60 and r["width"] > 100:
            ov = min(r["x1"], x1) - max(r["x0"], x0)
            if ov > 0.5 * r["width"]:
                for y in (r["top"], r["bottom"]):
                    if y0 - 3 <= y <= y1 + 3:
                        ys.add(round(y, 1))
    return sorted(ys)


class QA:
    def __init__(self):
        self.items = defaultdict(list)

    def add(self, kind, msg):
        self.items[kind].append(msg)


def cluster_centers(xs, tol=12):
    out = []
    for x in sorted(xs):
        if out and x - out[-1][-1] <= tol:
            out[-1].append(x)
        else:
            out.append([x])
    return [sum(c) / len(c) for c in out]


def parse_block(pdf, blk, state, qa, rows_out):
    """Parse one table block (possibly two halves). Appends row dicts to rows_out."""
    pg = pdf.pages[blk["page"] - 1]
    words_all = [w for w in page_words(pg) if blk["x0"] <= w["cx"] <= blk["x1"] and blk["y0"] <= w["top"] <= blk["y1"]]
    halves = [(blk["x0"], blk["split"]), (blk["split"], blk["x1"])] if blk["split"] else [(blk["x0"], blk["x1"])]
    header_pg = pdf.pages[blk["headers_at"] - 1] if blk.get("headers_at") else None
    block_rows = []
    labels = []  # (y, text, section) group labels for blocks with group_xmax
    for hx0, hx1 in halves:
        words = [w for w in words_all if hx0 <= w["cx"] < hx1]
        if not words:
            continue
        lines = group_lines(words)
        first_data = next((ln["top"] for ln in lines if ln["pn"] or ln["bold"]), None)
        if first_data is None:
            qa.add("empty-block", f"p{blk['page']} x{hx0}-{hx1}: no data lines")
            continue
        hdr_lines = [ln for ln in lines if ln["top"] < first_data - 1]
        if header_pg is not None:  # continuation page without its own header: borrow the previous page's header
            hw = [w for w in page_words(header_pg) if hx0 <= w["cx"] < hx1 and w["top"] < 480]
            hdr_lines = [ln for ln in group_lines(hw) if ln["top"] > 420]
        hdr_phr = [p for ln in hdr_lines for p in phrases(ln)]
        # the data zone starts at the first rule below the "Application" header line, or at the first data line
        app_hdr = next((p for p in hdr_phr if p["text"] == "Application"), None)
        header_end = first_data
        if app_hdr is not None and header_pg is None:
            below = [y for y in separators(pg, hx0, hx1, app_hdr["top"] + 2, blk["y1"]) if y > app_hdr["top"] + 2]
            last_hdr = max(ln["top"] for ln in hdr_lines) if hdr_lines else app_hdr["top"]
            if below and last_hdr < below[0] < first_data:
                header_end = below[0]
        anc = re.compile(blk["anchors"])
        col_cx = cluster_centers([p["cx"] for p in hdr_phr if anc.match(p["text"])])
        cols = blk["cols"]
        if len(col_cx) != len(cols):
            pnx = cluster_centers([w["x0"] + 16 for w in words if w["pn"]])
            qa.add("anchors", f"p{blk['page']} x{hx0}-{hx1} {blk['app']}: {len(col_cx)} header anchors for {len(cols)} columns "
                              f"(header: {[p['text'] for p in hdr_phr][:12]}); PN clusters {[round(c) for c in pnx]}")
            if len(pnx) == len(cols):
                col_cx = pnx
            elif not col_cx:
                continue
        first_col_x0 = min(col_cx) - 16
        # inline extra columns: header x-ranges -> intervals bounded by midpoints
        ex = []
        for key, pat in blk["extras"]:
            ph = [p for p in hdr_phr if re.match(pat, p["text"])]
            if ph:
                x0 = min(p["x0"] for p in ph)
                x1 = max(p["x1"] for p in ph)
                ex.append([key, x0, x1, (x0 + x1) / 2, None, None])
        ex.sort(key=lambda e: e[3])
        for i, e in enumerate(ex):
            e[4] = (ex[i - 1][3] + e[3]) / 2 if i > 0 else e[1] - 14
            e[5] = (e[3] + ex[i + 1][3]) / 2 if i + 1 < len(ex) else min(e[2] + 20, first_col_x0 - 12)
        app_right = ex[0][4] if ex else first_col_x0 - 12
        # separators and bands
        seps = separators(pg, hx0, hx1, header_end - 2, blk["y1"])
        body = [ln for ln in lines if ln["top"] >= header_end - 1]
        for ln in body:
            if ln["bold"]:
                seps.append(round(ln["top"] - 1.5, 1))
                seps.append(round(ln["bottom"] + 1.0, 1))
        seps = sorted(set(seps))
        bands = defaultdict(list)
        for ln in body:
            cy = (ln["top"] + ln["bottom"]) / 2
            bands[bisect_right(seps, cy)].append(ln)
        active_cols = state.get("active_cols") if state.get("active_cols_page") == blk["page"] else None
        active_cols = active_cols or cols
        for bi in sorted(bands):
            blines = bands[bi]
            bold_lines = [ln for ln in blines if ln["bold"]]
            pn_lines = [ln for ln in blines if ln["pn"]]
            other = [ln for ln in blines if not ln["bold"] and not ln["pn"]]
            items = [("heading", ln["top"], ln) for ln in bold_lines]
            if pn_lines:
                assigned = {id(ln): [ln] for ln in pn_lines}
                for ln in other:
                    near = min(pn_lines, key=lambda p: abs(p["top"] - ln["top"]))
                    if abs(near["top"] - ln["top"]) <= 14:
                        assigned[id(near)].append(ln)
                    else:
                        items.append(("text", ln["top"], [ln]))
                for ln in pn_lines:
                    items.append(("row", ln["top"], assigned[id(ln)]))
            elif other:
                items.append(("text", other[0]["top"], other))
            items.sort(key=lambda it: it[1])
            for kind, _, payload in items:
                if kind == "heading":
                    htxt = clean_text(" ".join(w["text"] for w in payload["words"] if w["bold"])) or clean_text(payload["text"])
                    if re.search(r"\bSEE\b", htxt):
                        continue
                    state["section"] = htxt
                    active_cols = cols
                    for sec_name, oc in blk["overrides"]:
                        if htxt.upper() == sec_name:
                            active_cols = oc
                    state["active_cols"], state["active_cols_page"] = active_cols, blk["page"]
                    continue
                rlines = sorted(payload, key=lambda ln: ln["top"])
                rwords = [w for ln in rlines for w in ln["words"]]
                if blk["group_xmax"]:
                    gw = [w for w in rwords if w["x1"] <= blk["group_xmax"]]
                    if gw:
                        labels.append(((min(w["top"] for w in gw) + max(w["bottom"] for w in gw)) / 2,
                                       clean_text(" ".join(w["text"] for w in sorted(gw, key=lambda w: (w["top"], w["x0"])))),
                                       state.get("section", "")))
                        rwords = [w for w in rwords if w not in gw]
                if kind == "text":
                    txt = clean_text(" ".join(w["text"] for w in rwords))
                    if len(txt) > 3 and not re.match(r"^(NOTE|\*|Scan|These parts|Fits most|8740 ARP2000)", txt):
                        qa.add("orphan", f"p{blk['page']}: '{txt[:80]}'")
                    continue
                pns = [w for w in rwords if w["pn"] and w["x0"] >= first_col_x0 - 12]
                extras, app_words, stray = {}, [], []
                for w in rwords:
                    if w in pns:
                        continue
                    hit = next((e[0] for e in ex if e[4] <= w["cx"] < e[5]), None)
                    if hit:
                        extras.setdefault(hit, []).append(w)
                    elif w["cx"] < app_right or w["x0"] < first_col_x0 - 30:
                        app_words.append(w)
                    else:
                        stray.append(w["text"])
                app_text = clean_text(" ".join(" ".join(w["text"] for w in ln["words"] if w in app_words) for ln in rlines))
                if stray:
                    qa.add("stray", f"p{blk['page']} '{app_text[:50]}': {stray}")
                cells = []
                for w in pns:
                    cx = w["x0"] + 16
                    i = min(range(len(col_cx)), key=lambda i: abs(col_cx[i] - cx))
                    if abs(col_cx[i] - cx) > 30:
                        qa.add("column-distance", f"p{blk['page']} {w['text']}: {abs(col_cx[i]-cx):.0f}pt from nearest column")
                    cells.append((i, w["text"], w["demi"]))
                block_rows.append(dict(page=blk["page"], block=blk, section=state.get("section") or blk.get("section") or "",
                                       app=app_text, y=rlines[0]["top"],
                                       extras={k: clean_text(" ".join(w["text"] for w in sorted(v, key=lambda w: (w["top"], w["x0"])))) for k, v in extras.items()},
                                       cells=cells, cols=active_cols, group=None))
    if blk["group_xmax"] and labels:
        # merge label fragments that sit on consecutive lines, then give each row the nearest label of its section
        labels.sort()
        merged = []
        for y, txt, sec in labels:
            if merged and y - merged[-1][0] <= 12 and merged[-1][2] == sec:
                merged[-1] = ((merged[-1][0] + y) / 2, merged[-1][1] + " " + txt, sec)
            else:
                merged.append((y, txt, sec))
        for r in block_rows:
            cands = [(abs(y - r["y"]), txt) for y, txt, sec in merged if sec == r["section"]]
            if cands:
                r["group"] = min(cands)[1]
    rows_out.extend(block_rows)


# ----------------------------------------------------------------------------------------------
# field parsers for inline trailing columns
# ----------------------------------------------------------------------------------------------
DEC = r"\d*\.\d{2,3}"


def length_val(s):
    """'1.750' -> 1.75 ; '30mm (1.181 in.)' -> 1.181 ; '1.825 / 2.115' -> [1.825, 2.115]"""
    if not s:
        return None
    m = re.search(rf"\(\s*({DEC}) in", s)
    if m:
        return float(m.group(1))
    parts = re.findall(DEC, s)
    if "mm" in s and parts:
        return None
    if len(parts) == 1:
        return float(parts[0])
    if len(parts) > 1:
        return [float(p) for p in parts]
    return None


def mm_val(s):
    m = re.match(r"^(\d+)mm", s or "")
    return int(m.group(1)) if m else None


# ----------------------------------------------------------------------------------------------
# dedicated parsers: aftermarket rod bolts (p43 SAE, p44 metric), torque chart (p55-57)
# ----------------------------------------------------------------------------------------------
def parse_aftermarket_sae(pdf, qa):
    pg = pdf.pages[42]
    words = page_words(pg)
    lines = group_lines(words)
    dims_re = re.compile(rf"^({DEC}) ({DEC}) ({DEC}) ({DEC}) (\d+/\d+) ({DEC})\s*(.*)$")
    dims_lines, pn_lines, labels = [], [], []
    for ln in lines:
        txt = clean_text(ln["text"])
        if ln["pn"]:
            pn_lines.append((ln, txt))
        m = dims_re.match(re.sub(r"^\d+/\d+ ", "", txt))
        if m:
            dims_lines.append((ln["top"], m))
        if re.fullmatch(r"(1/4|5/16|3/8|7/16)", txt) and ln["words"][0]["x0"] < 95:
            labels.append((ln["top"], txt))
    out = []
    for ln, txt in pn_lines:
        txt2 = re.sub(r"^\d+/\d+ ", "", txt)
        m = dims_re.match(txt2)
        if m:
            rest = m.group(7)
        else:
            near = min(dims_lines, key=lambda d: abs(d[0] - ln["top"]))
            if abs(near[0] - ln["top"]) > 12:
                qa.add("p43", f"no dims for line '{txt}'")
                continue
            m = near[1]
            rest = txt2
        mm = re.match(r"^(.*?)\s*(\d{1,2})\s+(\d{3}-\d{4})(?:\s+(\d{3}-\d{4}))?", rest)
        if not mm:
            qa.add("p43", f"unparsed '{rest}'")
            continue
        material = clean_text(mm.group(1)) or (m.group(7).split()[0] if m.group(7) else "")
        material = re.sub(r"ARP3\.5", "ARP3.5", material)
        uhl, tl, grip, hh, wrench, collar = (float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4)),
                                             m.group(5), float(m.group(6)))
        thread = {"5/16": "1/4", "3/8": "5/16", "1/2": "7/16"}.get(wrench)
        if thread is None:
            thread = "3/8" if collar < 0.60 else "7/16"
        qty = int(mm.group(2))
        for pn, pack in ((mm.group(3), "complete set"), (mm.group(4), "2-piece pack")):
            if pn:
                out.append(dict(pn=pn, material=material, pack=pack, qty=qty, uhl=uhl, threadLength=tl, gripLength=grip,
                                headHeight=hh, wrench=wrench, collar=collar, thread=thread, top=ln["top"],
                                demi=any(w["demi"] for w in ln["words"] if w["pn"])))
    # sanity: label y must fall inside its group's y range
    for lab_y, lab in labels:
        ys = [r["top"] for r in out if r["thread"] == lab]
        if not ys or not (min(ys) - 10 <= lab_y <= max(ys) + 10):
            qa.add("p43", f"thread-size group '{lab}' label at y={lab_y:.0f} outside rows {min(ys) if ys else None}-{max(ys) if ys else None}")
    return out


def parse_aftermarket_metric(pdf, qa):
    pg = pdf.pages[43]
    words = page_words(pg)
    lines = group_lines(words)
    seps = sorted(set(round(l["top"], 1) for l in pg.lines if abs(l["y0"] - l["y1"]) < 1 and 130 < l["x0"] < 145 and l["x1"] < 210))
    bands = defaultdict(list)
    for ln in lines:
        if ln["top"] < 125:
            continue
        bands[bisect_right(seps, (ln["top"] + ln["bottom"]) / 2)].append(ln)
    out = []
    row_re = re.compile(rf"(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+(?:\.\d+)?) (\d+MM) (\d+(?:\.\d+)?) (\S+) (\d{{3}}-\d{{4}})$")
    for bi in sorted(bands):
        blines = bands[bi]
        label = None
        for ln in blines:
            t = clean_text(" ".join(w["text"] for w in ln["words"] if w["x0"] < 200 and w["demi"]))
            m = re.match(r"^(M\d+(?:\.\d+)? X \d+(?:\.\d+)?)", t)
            if m:
                label = m.group(1).replace(" X ", "x")
        for ln in blines:
            if not ln["pn"]:
                continue
            t = clean_text(" ".join(w["text"] for w in ln["words"] if w["x0"] >= 200))
            m = row_re.search(t)
            if not m:
                qa.add("p44", f"unparsed '{t}'")
                continue
            out.append(dict(pn=m.group(8), thread=label, uhlMm=float(m.group(1)), threadLengthMm=float(m.group(2)),
                            gripLengthMm=float(m.group(3)), headHeightMm=float(m.group(4)), wrench=m.group(5).lower(),
                            collarMm=float(m.group(6)), material=m.group(7).replace("CA625+", "Custom Age 625+"),
                            demi=any(w["demi"] for w in ln["words"] if w["pn"])))
            if label is None:
                qa.add("p44", f"no thread-size label for {m.group(8)}")
    return out


def parse_torque_chart(pdf, qa):
    out = {}
    for pno in (55, 56, 57):
        pg = pdf.pages[pno - 1]
        text = " ".join(w["text"] for w in sorted(page_words(pg), key=lambda w: (round(w["top"]), w["x0"])))
        for m in re.finditer(r"(\d{3}-\d{4})\s+\.(\d{4})\s*-\s*\.(\d{4})\s+(\d{2,3})\b", text):
            pn = m.group(1)
            rec = dict(stretchMin=float("0." + m.group(2)), stretchMax=float("0." + m.group(3)), torque=int(m.group(4)), page=pno)
            if pn in out and out[pn] != rec:
                qa.add("torque", f"{pn} listed twice with different values {out[pn]} vs {rec}")
            out.setdefault(pn, rec)
    return out


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def compact(d):
    out = OrderedDict()
    for k, v in d.items():
        if v is None or v == "" or v == [] or v == {}:
            continue
        out[k] = v
    return out


def make_record(pn, application, name, fam, spec, page, section, notes, ci=None, y0=None, y1=None, status=None):
    fit = compact(OrderedDict([("fam", fam), ("ci", ci), ("cyl", FAM_CYL.get(fam)), ("y0", y0), ("y1", y1), ("notes", notes)]))
    spec = compact(spec)
    spec["application"] = application
    if status:
        spec["status"] = status
    src = compact(OrderedDict([("doc", DOC), ("edition", EDITION), ("file", "Catalogs/ARPCatalog.pdf"), ("page", page), ("section", section or None)]))
    return OrderedDict([("m", BRAND), ("p", pn), ("cat", "fastener"), ("name", name), ("fit", fit), ("spec", spec), ("src", src), ("emissions", None)])


def short(s, n=70):
    s = s.strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + "…"


def build_records(rows, torque, qa):
    recs = []
    unknown_fams = Counter()
    for r in rows:
        blk = r["block"]
        app_kind = blk["app"]
        text = r["app"]
        fields = {k: v for k, v in r["extras"].items() if k not in ("material", "headStyleCode")}
        if fields.get("qty"):
            m = re.search(r"\b(\d{1,3})\b", fields["qty"])
            rest = re.sub(r"\b\d{1,3}\b", "", fields.pop("qty")).strip()
            if m:
                fields["qty"] = int(m.group(1))
            if rest:
                text = clean_text(text + " " + rest)
        if any(k not in ("material", "headStyleCode") for k, _ in blk["extras"]) and not fields:
            qa.add("fields", f"p{r['page']} {app_kind}: no inline dimensions found for '{r['app'][:70]}'")
        if app_kind == "flywheel bolt" and r["section"].upper().startswith("FLEXPLATE"):
            app_kind = "flexplate bolt"
        if app_kind == "harmonic damper bolt" and "washer" in text.lower() and "bolt" not in text.lower():
            app_kind = "harmonic damper washer"
        # material / qualifiers from text
        mat_text = material_in(text) if re.search(r"ARP ?2000|625|L19|ARP ?3\.5|Inconel", text) else None
        mat_col = r["extras"].get("material")
        if mat_col:
            mat_col = material_in(mat_col) or mat_col
        app_clean = strip_material(text) if mat_text else text
        # application refinement for mixed tables
        application = app_kind
        if app_kind == "front cover/water pump":
            tl = text.lower()
            if "alternator" in tl:
                continue  # accessory
            if "water pump" in tl and ("timing" in tl or "cover" in tl):
                application = "front cover/water pump"
            elif "water pump" in tl:
                application = "water pump"
            elif "timing" in tl or "cover" in tl:
                application = "front cover"
            elif "seal plate" in tl:
                application = "rear main seal plate"
            else:
                application = "front cover"
        if app_kind == "cam tower bolt/stud":
            application = "cam tower stud" if "stud" in text.lower() else "cam tower bolt"
        if app_kind == "header bolt/stud":
            application = "header"
        fams = families(r["section"], (r["group"] + " " if r["group"] else "") + text, diesel=blk["diesel"])
        if blk.get("section") == "UNIVERSAL" or not r["section"] or r["section"].upper() in NON_MAKE_HEADINGS:
            make = make_from_text(text)
            fams = families(make, text) if make else ["Universal"]
        y0, y1 = years(text)
        notes_base = app_clean
        if r["section"].upper() in NON_MAKE_HEADINGS - {"UNIVERSAL", "DIESEL"}:
            notes_base = f"{nice(r['section'])}: {app_clean}"
        if r["group"]:
            notes_base = f"{r['group']}: {app_clean}"
        hs = r["extras"].get("headStyleCode")
        for i, pn, demi in r["cells"]:
            if i >= len(r["cols"]):
                qa.add("column-index", f"p{r['page']} {pn}: column {i} beyond {len(r['cols'])}")
                continue
            col = dict(r["cols"][i])
            spec = OrderedDict()
            spec["productLine"] = col.get("productLine")
            material = mat_text or mat_col or col.get("material")
            if application in ("main stud", "head stud") and not material:
                material = "8740 chromoly"
            if application in ("rod bolt",) and blk["diesel"] and not material:
                material = None
            spec["material"] = material
            if col.get("undercut"):
                spec["undercutStuds"] = True
            spec["headStyle"] = col.get("headStyle")
            spec["nutStyle"] = col.get("nuts")
            spec["kitType"] = col.get("kitType") or ("stud kit" if application in ("head stud", "main stud", "rocker arm stud", "rocker pedestal stud") else None)
            spec["finish"] = col.get("finish")
            spec["pack"] = col.get("pack")
            spec["shank"] = col.get("shank")
            spec["mainCaps"] = col.get("mainCaps")
            spec["tensilePsi"] = col.get("tensilePsi")
            if col.get("drilled"):
                spec["drilled"] = True
            if hs:
                spec["headStyleCode"] = hs
            # inline fields
            th, d_in, d_mm = thread_info(fields.get("thread"))
            if fields.get("size"):
                th2, d2, m2 = thread_info(fields["size"])
                th, d_in, d_mm = th or th2, d_in or d2, d_mm or m2
            spec["thread"] = th
            spec["diameter"] = d_in
            spec["diameterMm"] = d_mm
            if application == "rod bolt":
                m = re.search(r'(\d+/\d+)"', text)
                if m:
                    spec["diameter"] = frac_in(m.group(1))
            if fields.get("uhl"):
                lv = length_val(fields["uhl"])
                if lv is not None:
                    spec["uhl"] = lv
                mv = mm_val(fields["uhl"])
                if mv:
                    spec["uhlMm"] = mv
            if fields.get("length"):
                lv = length_val(fields["length"])
                key = "studOal" if (col.get("kitType") == "stud kit" or application in ("rocker pedestal stud",)) else "uhl"
                if lv is not None:
                    spec[key] = lv
                mv = mm_val(fields["length"])
                if mv:
                    spec[key + "Mm"] = mv
            if fields.get("qty"):
                spec["qty"] = fields["qty"]
            if fields.get("socket"):
                spec["socket"] = fields["socket"]
            for k in ("lengthB", "lengthC", "lengthD"):
                if fields.get(k):
                    v = [float(x) for x in re.findall(DEC, fields[k])]
                    spec[k] = v[0] if len(v) == 1 else v
            if fields.get("threadTop"):
                spec["threadTop"], spec["threadBase"] = fields["threadTop"], fields["threadBase"]
            if application == "rod bolt" and pn in torque:
                tq = torque[pn]
                spec["torque"] = tq["torque"]
                spec["stretchMin"], spec["stretchMax"] = tq["stretchMin"], tq["stretchMax"]
                spec["torqueLube"] = "ARP Ultra-Torque"
            if application == "rod bolt" and r["section"].upper().startswith("DIESEL"):
                pass
            pl = spec.get("productLine") or ""
            if application == "rod bolt" and blk["diesel"] and not pl:
                pl = ""
            name_core = f"{pl} {application}".strip()
            if not name_core.endswith(("bolt", "stud", "kit", "bolts", "studs", "cover", "pan", "pump", "manifold", "housing", "driveshaft", "bellhousing")):
                name_core += " kit"
            elif application in ("valve cover", "oil pan", "oil pump", "intake manifold", "bellhousing", "exhaust manifold", "header", "front cover", "water pump", "front cover/water pump", "rear main seal plate"):
                name_core = f"{application} {col.get('kitType') or 'fastener kit'}"
                if col.get("material") == "stainless" or material == "stainless":
                    name_core = "stainless " + name_core
            name = f"{name_core}, {short(app_clean)}" if app_clean else name_core
            status = "new for 2026 (catalog lists in blue: in development)" if demi else None
            for fam in fams:
                if fam.endswith("(catalog heading)"):
                    unknown_fams[fam] += 1
                ci = ci_from(text, [fam])
                recs.append(make_record(pn, application, name, fam, dict(spec), r["page"], r["section"], notes_base or None,
                                        ci=ci, y0=y0, y1=y1, status=status))
    return recs, unknown_fams


def aftermarket_records(sae, metric, torque):
    recs = []
    for r in sae:
        spec = OrderedDict([("productLine", "aftermarket rod bolt (SAE)"), ("material", r["material"]), ("pack", r["pack"]),
                            ("qty", r["qty"]), ("thread", r["thread"]), ("diameter", frac_in(r["thread"])), ("uhl", r["uhl"]),
                            ("threadLength", r["threadLength"]), ("gripLength", r["gripLength"]), ("headHeight", r["headHeight"]),
                            ("wrench", r["wrench"]), ("collarDiameter", r["collar"])])
        if r["pn"] in torque:
            spec["torque"] = torque[r["pn"]]["torque"]
            spec["stretchMin"], spec["stretchMax"] = torque[r["pn"]]["stretchMin"], torque[r["pn"]]["stretchMax"]
            spec["torqueLube"] = "ARP Ultra-Torque"
        name = f"{r['material']} rod bolts {r['thread']} x {r['uhl']:.3f} UHL ({r['pack']})"
        recs.append(make_record(r["pn"], "rod bolt", name, "Universal", spec, 43, "Aftermarket Connecting Rod Bolts - SAE",
                                "for aftermarket connecting rods; verify dimensions against the rod", status="new for 2026 (catalog lists in blue: in development)" if r["demi"] else None))
    for r in metric:
        spec = OrderedDict([("productLine", "aftermarket rod bolt (metric)"), ("material", r["material"]), ("pack", "1-piece kit"),
                            ("thread", r["thread"]), ("diameterMm", float(re.match(r"M([\d.]+)", r["thread"]).group(1)) if r["thread"] else None),
                            ("uhlMm", r["uhlMm"]), ("threadLengthMm", r["threadLengthMm"]), ("gripLengthMm", r["gripLengthMm"]),
                            ("headHeightMm", r["headHeightMm"]), ("wrench", r["wrench"]), ("collarDiameterMm", r["collarMm"])])
        if r["pn"] in torque:
            spec["torque"] = torque[r["pn"]]["torque"]
            spec["stretchMin"], spec["stretchMax"] = torque[r["pn"]]["stretchMin"], torque[r["pn"]]["stretchMax"]
            spec["torqueLube"] = "ARP Ultra-Torque"
        name = f"{r['material']} rod bolt {r['thread'] or ''} x {r['uhlMm']}mm UHL (1 piece)".replace("  ", " ")
        recs.append(make_record(r["pn"], "rod bolt", name, "Universal", spec, 44, "Aftermarket Connecting Rod Bolts - Metric",
                                "for aftermarket connecting rods; verify dimensions against the rod", status="new for 2026 (catalog lists in blue: in development)" if r["demi"] else None))
    return recs


def dedupe(recs, qa):
    seen = {}
    out = []
    merged = 0
    for r in recs:
        key = (r["p"], r["fit"]["fam"])
        if key in seen:
            first = seen[key]
            merged += 1
            fp = first["src"].get("page")
            pg = r["src"].get("page")
            if pg != fp:
                also = first["src"].setdefault("alsoPages", [])
                if pg not in also:
                    also.append(pg)
            n1, n2 = first["fit"].get("notes", ""), r["fit"].get("notes", "")
            if n2 and n2 not in n1:
                first["fit"]["notes"] = f"{n1}; {n2}" if n1 else n2
            if r["spec"].get("application") != first["spec"].get("application"):
                qa.add("dup-application", f"{r['p']} {r['fit']['fam']}: {first['spec'].get('application')} vs {r['spec'].get('application')}")
            for k, v in r["spec"].items():
                first["spec"].setdefault(k, v)
            continue
        seen[key] = r
        out.append(r)
    qa.add("merged", f"{merged} duplicate (part, family) rows merged into the first occurrence")
    return out


def validate(records):
    errs = []
    keys = Counter()
    for r in records:
        for k in ("m", "p", "cat"):
            if not r.get(k):
                errs.append(f"missing {k}: {r}")
        if not r["fit"].get("fam"):
            errs.append(f"missing fit.fam: {r['p']}")
        if not r["src"]:
            errs.append(f"missing src: {r['p']}")
        keys[(r["p"], r["fit"]["fam"])] += 1

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str):
                if o == "":
                    errs.append(f"empty string at {path} in {r['p']}")
            elif isinstance(o, bool):
                pass
            elif o is None:
                if path not in (".emissions",):
                    errs.append(f"null at {path} in {r['p']}")
        walk(r, "")
        for k in ("diameter", "uhl", "studOal", "torque", "stretchMin", "stretchMax", "qty", "tensilePsi", "diameterMm"):
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float, list)):
                errs.append(f"non-numeric {k}={v!r} in {r['p']}")
        for k in ("ci", "cyl", "y0", "y1"):
            v = r["fit"].get(k)
            if v is not None and not isinstance(v, (int, float, list)):
                errs.append(f"non-numeric fit.{k}={v!r} in {r['p']}")
    dups = [k for k, n in keys.items() if n > 1]
    if dups:
        errs.append(f"duplicate (p, fam): {dups[:10]}")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, records, rows, qa, unknown_fams, sae, metric, torque, errs):
    L = []
    L.append("# ARP - extraction notes\n")
    L.append(f"Source: `Catalogs/ARPCatalog.pdf` (ARP 2026 catalog, 180 pages, text layer; file dated 2025-11-03; saved by hand, "
             f"no network used). Printed page numbers match PDF page numbers.\n")
    L.append(f"Records: {len(records)} ({len(set(r['p'] for r in records))} unique part numbers; a part that fits several "
             f"families is repeated once per family, e.g. big-block Chevy rows are emitted for both `Chevy Mark IV big block` "
             f"and `Chevy Gen VI big block`).\n")
    L.append("## Method\n")
    L.append("- Words from pdfplumber (`x_tolerance=1.5`); ZapfDingbats stock/warning icons dropped. Part numbers are the "
             "`ddd-dddd` words; each is assigned to the nearest column centre.")
    L.append("- Column centres come from the header phrases above the grid (`(complete)`/`(2-PC)`, `Hex`/`12-Point`, "
             "`Hex Nuts`/`U/C Studs`, `2-Bolt`/`4-Bolt`, `Part No.`, ...). Column meaning (product line, material, head/nut style, "
             "stud vs bolt kit, finish, 2-/4-bolt mains) is a fixed label list per table type, so an empty column on a page cannot "
             "shift the others. Page 74's LS-series sub-header (8740 190,000 psi / ARP2000 / Polished Inconel) overrides the page header for that section.")
    L.append("- Rows are the bands between horizontal rule lines and shaded row rectangles; bold capital lines are make/family "
             "section headings (carried across pages; `XXX - SEE ...` cross-references ignored). A band with several part-number "
             "lines is split by nearest line; multi-line application text is joined in reading order.")
    L.append("- Two-up pages (main studs 79-82, diesel 138-141) are split at x before line grouping.")
    L.append("- Inline dimension columns (UHL, thread size, socket size, qty, stud OAL / bolt UHL, rocker-stud lengths) are "
             "split off the application text by regex from the right; what cannot be split stays in `fit.notes` and is listed under QA.")
    L.append("- Aftermarket rod bolts (p43 SAE, p44 metric) have their own parsers; SAE thread size is derived from wrench and collar "
             "size because the size labels sit beside the groups (verified against the label positions). The rod bolt torque / stretch "
             "chart (pp55-57, ARP Ultra-Torque) is joined to rod-bolt records by part number.")
    L.append("- Material: column label, or the `Material` column on head-stud pages, or an ARP2000 / Custom Age 625+ / L19 token in "
             "the application text (then stripped from the text). Head and main studs without a stated material are 8740 chromoly per the section intro.")
    L.append("- Part numbers printed in bold/blue (the catalog's 'new kits for 2026 ... still in development' list) get `spec.status`.")
    L.append("- `fit.fam` uses the brief's family list; everything else carries the catalog heading as `<Heading> (catalog heading)`. "
             "`fit.ci` is taken from `cid` numbers / hyphen chains in the application text for the domestic families only; a pair like "
             "`265-400 cid` is a range in the catalog but is stored as the two printed numbers.\n")
    # counts
    L.append("## Counts\n")
    L.append("| spec.application | records | unique PNs |\n|---|---|---|")
    byapp = defaultdict(list)
    for r in records:
        byapp[r["spec"]["application"]].append(r["p"])
    for a, ps in sorted(byapp.items(), key=lambda kv: -len(kv[1])):
        L.append(f"| {a} | {len(ps)} | {len(set(ps))} |")
    L.append("")
    L.append("| fit.fam | records |\n|---|---|")
    fams = Counter(r["fit"]["fam"] for r in records)
    for f, n in fams.most_common():
        L.append(f"| {f} | {n} |")
    L.append("")
    L.append("### Rows per page / section\n")
    L.append("| page | table | section headings seen | rows | PNs |\n|---|---|---|---|---|")
    per = OrderedDict()
    for r in rows:
        key = (r["page"], r["block"]["app"])
        d = per.setdefault(key, {"rows": 0, "pns": 0, "secs": []})
        d["rows"] += 1
        d["pns"] += len(r["cells"])
        if r["section"] and r["section"] not in d["secs"]:
            d["secs"].append(r["section"])
    for (pg, app), d in per.items():
        L.append(f"| {pg} | {app} | {', '.join(d['secs'])[:140]} | {d['rows']} | {d['pns']} |")
    L.append(f"| 43 | rod bolt (aftermarket SAE) | Universal | {len(sae)//1} PN cells | {len(sae)} |")
    L.append(f"| 44 | rod bolt (aftermarket metric) | Universal | {len(metric)} | {len(metric)} |")
    L.append(f"| 55-57 | torque/stretch chart | - | {len(torque)} PNs | joined to {sum(1 for r in records if 'torque' in r['spec'])} records |")
    L.append("")
    L.append("## Skipped\n")
    for pg, what in SKIPPED:
        L.append(f"- p{pg}: {what}")
    L.append("- Rows whose application text names an alternator (inside the front cover / water pump table) are dropped as accessory hardware.")
    L.append("- Cross-reference headings (`DATSUN - SEE NISSAN, PAGE 50`) produce no rows.\n")
    L.append("## Unknown families (catalog heading kept in fit.fam)\n")
    for f, n in unknown_fams.most_common():
        L.append(f"- {f}: {n}")
    L.append("")
    L.append("## QA\n")
    if errs:
        L.append("Validation errors:")
        for e in errs:
            L.append(f"- {e}")
    else:
        L.append("Validation: no duplicate (part, family), all records have m/p/cat/fit.fam/src, no empty strings, numeric fields numeric.\n")
    L.append("Things a human should check:")
    L.append("- `Chevy 8.1L Vortec big block`, `Buick/Rover 215`, `Buick Nailhead`, `Ford Y-block`, `Chrysler early Hemi 331-392`, "
             "`Top Fuel / KB Hemi`, Cummins 4BT / ISB / ISL / ISF and the import makes are not in the family list and carry the catalog heading.")
    L.append("- Big-block Chevy rows are duplicated to both Mark IV and Gen VI unless the text says Mark IV / Mark V-VI / 502; "
             "`348, 409` rows go to the W-series family.")
    L.append("- Chrysler `383-400-413-440 Wedge & 354-392 Hemi` rows are emitted for B/RB and the early-Hemi heading; "
             "`318-440 Wedge` intake rows for both LA and B/RB.")
    L.append("- Head-bolt page 74 LS rows use the LS sub-header materials; the 435-/434- stainless columns elsewhere are labelled "
             "`ARP Stainless` from the page header although the LS sub-header calls the same 4xx column Polished Inconel.")
    L.append("- Rocker-arm stud dimension letters B/C/D/E/F follow the page 86 drawing (B/C/D lengths, E top thread, F base thread); "
             "cells like `1.3, 0.820` (two alternatives) are stored as lists.")
    L.append("- Page 44 metric row `M10 X 1.25 ... 4.5 mm UHL` is printed as 4.5 (probably 44.5); stored as printed.")
    L.append("- Application text often names head castings / block brands (Brodix, Dart, World) that are not fitment families; "
             "they stay in `fit.notes`.")
    for kind in sorted(qa.items):
        if kind == "merged":
            L.append(f"- {qa.items[kind][0]}")
    for kind in sorted(qa.items):
        if kind == "merged":
            continue
        L.append(f"\n### {kind} ({len(qa.items[kind])})\n")
        for m in qa.items[kind][:80]:
            L.append(f"- {m}")
        if len(qa.items[kind]) > 80:
            L.append(f"- ... {len(qa.items[kind]) - 80} more")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        sys.exit(f"PDF not found: {args.pdf}")
    os.makedirs(args.out, exist_ok=True)
    qa = QA()
    rows = []
    state = {}
    with pdfplumber.open(args.pdf) as pdf:
        last_page, prev_app = None, None
        for blk in BLOCKS:
            # section headings carry across consecutive pages of the same table type only
            if not (blk["app"] == prev_app and last_page is not None and blk["page"] - last_page <= 1):
                state["section"] = blk.get("section") or ""
                state.pop("active_cols", None)
            if blk.get("section"):
                state["section"] = blk["section"]
            parse_block(pdf, blk, state, qa, rows)
            last_page, prev_app = blk["page"], blk["app"]
        sae = parse_aftermarket_sae(pdf, qa)
        metric = parse_aftermarket_metric(pdf, qa)
        torque = parse_torque_chart(pdf, qa)
    recs, unknown = build_records(rows, torque, qa)
    recs = aftermarket_records(sae, metric, torque) + recs
    recs = dedupe(recs, qa)
    errs = validate(recs)
    out = OrderedDict([
        ("source", OrderedDict([("brand", BRAND), ("doc", DOC), ("file", os.path.basename(args.pdf)), ("edition", EDITION),
                                ("pages", 180), ("url", "https://cdn.arp-bolts.com/ARPCatalog.pdf (saved by hand; not fetched)")])),
        ("extracted", dt.date.today().isoformat()),
        ("count", len(recs)),
        ("parts", recs),
    ])
    with open(os.path.join(args.out, "arp.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(args.out, "arp.md"), recs, rows, qa, unknown, sae, metric, torque, errs)
    print(f"records: {len(recs)}  unique PNs: {len(set(r['p'] for r in recs))}  rows: {len(rows)}")
    for k, v in sorted(qa.items.items()):
        print(f"  QA {k}: {len(v)}")
    if errs:
        print("VALIDATION ERRORS:", len(errs))
        for e in errs[:20]:
            print("   ", e)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
