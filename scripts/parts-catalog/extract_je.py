#!/usr/bin/env python3
"""Extract JE / SRP shelf pistons from the JE Pistons catalog PDF (manual download, no network).

Source: Catalogs/JE22_catalog_FINAL_all pages - V2 - 09.09.25.pdf (2025 V2 printing of the 2022
catalog, 204 pp, text layer). Output: out/je.json (shared parts record format) and out/je.md (notes).

Scope (CLOUD_TASKS.md "JE"): domestic shelf pistons by engine family, PDF pages 13-109:
  13-63  JE (Chevy LS/LT/SB/BB, Ford Modular/SB/EcoBoost/BB/FE/Pinto, Mopar, Top Fuel, Buick GN, NASCAR)
  65-84  SRP Professional (LS, SBC, GM 602/604, Windsor, Modular/Coyote)
  87-109 SRP (LS, SBC, BBC, Mopar, Ford, Pontiac/Olds)
Not extracted: p62 NHRA Stock Eliminator list (PN/model/year only, two interleaved columns, no
dimensions), pp 110-153 sport compact (no fitment family), rings/pins/gaskets/accessories, forms.

Layout: each section has an ALL-CAPS heading, marketing prose, a sub-heading
`<series> Std Bore: <bore> Ring package designed for: <rings>`, a rotated column header whose
chamber-cc labels are read with PyMuPDF, then one text row per part:
`PN CID bore stroke rod [blockHeight | deckDist] CH CR... dome [weight] [deckClr] footnotes oversize
[engine] [ringSet] [gasket]`. Rows are read with pdfplumber; the two libraries share page coordinates.

Run with `python -X utf8 -I`. Writes nothing outside out/.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
from collections import Counter, OrderedDict

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
PDF_DEFAULT = os.path.join(REPO, "Catalogs", "JE22_catalog_FINAL_all pages - V2 - 09.09.25.pdf")
DOC = "JE Pistons catalog, 2022 edition, V2 printing 09.09.25 (PDF, manual download)"
EDITION = "2025"
PAGES = range(13, 110)
SKIP_PAGES = {32, 46, 58, 62, 64, 85, 86}  # chapter intros, NHRA PN list, SRP marketing

# ----------------------------------------------------------------------------------------------
# regexes
# ----------------------------------------------------------------------------------------------
PN_RE = re.compile(r"^\d{6}$")
CID_RE = re.compile(r"^\d{3}$")
GEO_RE = re.compile(r"^[+-]?\d*\.\d{2,4}$")  # bore / stroke / rod / block height / CH / deck dist
CR_RE = re.compile(r"^(\d{1,2}(?:\.\d{1,2})?)(?::1)?$")
DOME_RE = re.compile(r"^[+-]?\d{1,3}(\.\d{1,3})?$")
WEIGHT_RE = re.compile(r"^\d{1,3}$")
DECKCLR_RE = re.compile(r"^([+-]?\d\.\d{3}|N/A)$")
OVERSIZE_RE = re.compile(r"^(STD|\.{1,2}\d{2,4}|0\.\d{1,3})$")
ENGINE_RE = re.compile(r"^(LS\d|LSX|LS|LT\d|L9\d)$")
GASKET_RE = re.compile(r"^(GM|FD|CR)\d{4}-\d{3}\*{0,2}$")
RINGSET_RE = re.compile(r"^[A-Z]{1,3}\d[A-Z0-9]*-[0-9][0-9A-Z]*(-[0-9A-Z]+)*$")
FRAG_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-]*[/*\-]?\*?$")  # multi-line ring-set / gasket cell piece
CHAMBER_RE = re.compile(r"^(\d+(?:\.\d+)?)cc$")
SUB_RE = re.compile(r"Std Bore:|Ring package designed for:")
PINPN_RE = re.compile(r"(?<![\d.])(\d{3})-2[0-9]{3}-\d+")  # 927-2250-15-51C -> .927
PIN_CODES = {"C": 0.927, "D": 0.912, "E": 0.990, "F": 1.040, "H": 1.094, "K": 0.945, "P": 0.975}
FOOT_WORDS = {
    "A": "fits 3.480 and 3.500 stroke", "B": "oil rail support included", "BL": "Boostline combo kit available",
    "J": "3mm oil ring", "L": "limited quantities", "M": "made to order", "S": "solid dome",
    "W": "428 crankshaft", "X": "angle milled heads", "T": "accepts turbo and nitrous", "V": "accepts nitrous",
    "FSR": "forged side relief", "Ultra": "Ultra Series", "2618": "2618 alloy", "4032": "4032 alloy",
    "U": "not designed for turbo or nitrous (sport-compact legend; letter not in the domestic legend)",
}
NOT_HEADINGS = {"JEPISTONS.COM", "SNOTSIP", "EJ", "JE", "PISTONS", "PRS", "SRP", "PROFESSIONAL", "ENGINEERED BY",
                "LANOISSEFORP", "714-898-9763", "FRONT OF ENGINE", "WITH 3D MILLING", "R R", "R L", "FORD", "MOPAR",
                "SPORT", "COMPACT"}
HEADER_WORDS = {"Compression", "Ratio", "Head", "Cubic", "Centimeters", "Part", "#", "Stroke", "Footnote", "Oversize",
                "Inches", "Bore", "Size", "Rod", "Length", "Block", "Height", "Comp.", "Comp", "Distance", "Dist.", "Dome",
                "Volume", "Gram", "Weight", "Ring", "Set", "Recom\xad", "Recom-", "mended", "Pro", "Seal", "Gasket", "Deck",
                "Clearance", "Recommended"}


# ----------------------------------------------------------------------------------------------
# PDF access
# ----------------------------------------------------------------------------------------------
def page_data(pdf_path, pages):
    """Yield (pno, lines, words): pdfplumber text lines (text/top/bottom) and PyMuPDF horizontal words."""
    import pdfplumber
    import pymupdf

    doc = pymupdf.open(pdf_path)
    with pdfplumber.open(pdf_path) as pl:
        for pno in pages:
            lines = [(l["text"].strip(), l["top"], l["bottom"]) for l in pl.pages[pno - 1].extract_text_lines()]
            words = [(w[4], w[0], w[1], w[2], w[3]) for w in doc[pno - 1].get_text("words")]
            yield pno, lines, words


def chambers_in_band(words, top, bottom):
    """Chamber-cc column headers (and their labels) printed between 'Head Cubic Centimeters' and
    'Compression Ratio'. Returns [(cc, label)] left to right."""
    band = [w for w in words if top - 1 <= (w[2] + w[4]) / 2 <= bottom + 1]
    ccs = sorted([w for w in band if CHAMBER_RE.match(w[0])], key=lambda w: w[1])
    out = []
    for k, cc in enumerate(ccs):
        x_lo = cc[1] - 12
        x_hi = ccs[k + 1][1] - 12 if k + 1 < len(ccs) else cc[3] + 25
        lab = [w for w in band if w is not cc and not CHAMBER_RE.match(w[0]) and w[0] not in HEADER_WORDS
               and x_lo <= w[1] < x_hi and w[2] < cc[4] + 2]
        lab.sort(key=lambda w: (round(w[2]), w[1]))
        out.append((CHAMBER_RE.match(cc[0]).group(1), " ".join(w[0] for w in lab) or None))
    return out


# ----------------------------------------------------------------------------------------------
# sections
# ----------------------------------------------------------------------------------------------
class Section:
    def __init__(self, heading, page, parent=None):
        self.heading = heading
        self.page = page
        self.parent = parent
        self.sub = None
        self.std_bores = []
        self.std_bore_text = None
        self.ring_pack = None
        self.rings_included = None
        self.sub_pin = None
        self.sub_alloy = None
        self.alloy_hint = None
        self.pins = []  # pin diameters named in the section prose ("Pin #927-2250-15-51C")
        self.pins_by_rod = {}  # "Pin #945-... For use with 6.098 Rod Length" -> {6.098: 0.945}
        self.notes = []
        self.chambers = []
        self.rows = []
        self.has_rows = False


def series_for(page, foot):
    if page <= 63:
        return "JE Ultra Series" if "Ultra" in foot else "JE"
    if page <= 84:
        return "SRP Professional 2618" if "2618" in foot else "SRP Professional"
    return "SRP 2618" if "2618" in foot else "SRP"


def brand_for(page):
    return "JE" if page <= 63 else "SRP"


def parse_sub(text, sec):
    """'350 SERIES Std Bore: 4.000 Pin Dia: .927” Ring package designed for: 1/16, 1/16, 3/16 Rings'"""
    name = re.split(r"\s*Std Bore:|\s*Ring package designed for:", text)[0].strip()
    sec.sub = re.sub(r"\s*Continued$", "", name) or None
    m = re.search(r"Std Bore:\s*(.*?)\s*(?:Pin Dia:|Ring package designed for:|$)", text)
    if m and m.group(1):
        sec.std_bore_text = m.group(1)
        sec.std_bores = [float(x) for x in re.findall(r"\d\.\d{3}", m.group(1))]
    m = re.search(r"Pin Dia:\s*(\d?\.\d{3})", text) or re.search(r"(\d?\.\d{3})[”\"]?\s*[xX]\s*2\.\d{3}[”\"]?\s*Pin\b", text)
    if m:
        sec.sub_pin = float(m.group(1))
    m = re.search(r"Ring package designed for:\s*(.*)$", text)
    if m and m.group(1).strip():
        rp = m.group(1).strip()
        sec.rings_included = True if re.search(r"Included", rp, re.I) else sec.rings_included
        rp = re.sub(r"\s*(Premium )?Rings?( Included)?\b.*$", "", rp, flags=re.I).strip()
        rp = re.sub(r"(?<=\d)MM", "mm", rp)
        rp = re.sub(r"(?<![\d.])(\d)mm\b", r"\1.0mm", rp)
        sec.ring_pack = rp or None
    m = re.search(r"\((4032|2618)\b", text)
    if m:
        sec.sub_alloy = m.group(1)


def is_heading(text):
    if text in NOT_HEADINGS or len(text) > 70 or text.endswith(".") or text.endswith(":"):
        return False
    if text != text.upper() or not re.search(r"[A-Z]{3}", text):
        return False
    if text.startswith(("•", "*", "JE ", "SRP ")) or FRAG_RE.match(text) or re.match(r"^\d{6}", text):
        return False
    if re.search(r"\d\.\d{3} \d\.\d{3}", text):  # p46/p58 spec tables
        return False
    return True


# ----------------------------------------------------------------------------------------------
# rows
# ----------------------------------------------------------------------------------------------
def is_row(tokens):
    if len(tokens) < 3 or not PN_RE.match(tokens[0]):
        return False
    t1 = tokens[1]
    return bool(CID_RE.match(t1) and GEO_RE.match(tokens[2])) or t1 == "**" or bool(GEO_RE.match(t1))


def to_float(tok):
    return float(tok.replace("..", ".")) if tok not in ("EITHER", "-", "N/A") else None


def parse_row(tokens, sec, pno, qa, skipped):
    line = " ".join(tokens)
    row = {"page": pno, "pn": tokens[0], "line": line, "cid": None, "bore": None, "stroke": None, "rod": None,
           "deckHeight": None, "deckDist": None, "ch": None, "crs": [], "dome": None, "crownText": None,
           "weight": None, "deckClr": None, "foot": [], "oversize": None, "engine": None, "ringSet": None,
           "gasket": None, "frag": None, "anyBore": False}
    body = list(tokens[1:])

    # --- right end: gasket, ring set, engine tag, oversize
    while body and body[-1] == "N/A":
        body.pop()
    if body and GASKET_RE.match(body[-1]):
        row["gasket"] = body.pop()
    if body and RINGSET_RE.match(body[-1]) and not CR_RE.match(body[-1]):
        row["ringSet"] = body.pop()
    if body and ENGINE_RE.match(body[-1]):
        row["engine"] = body.pop()
    if body and OVERSIZE_RE.match(body[-1]):
        tok = body.pop()
        row["oversize"] = 0.0 if tok == "STD" else to_float(tok)

    # --- left end: CID / bore / geometry
    i = 0
    if body and CID_RE.match(body[0]):
        row["cid"] = int(body[0])
        i = 1
    elif body and body[0] == "**":
        row["anyBore"] = True
        i = 1
    geo = []
    while i < len(body) and (GEO_RE.match(body[i]) or body[i] == "EITHER"):
        geo.append(body[i])
        i += 1
    vals = [to_float(g) for g in geo]
    n = len(geo)
    if row["anyBore"]:
        names = {4: ["stroke", "rod", "deckHeight", "ch"], 3: ["stroke", "rod", "ch"]}.get(n)
    elif row["cid"] is None:
        names = {2: ["bore", "ch"], 4: ["bore", "stroke", "rod", "ch"], 5: ["bore", "stroke", "rod", "deckHeight", "ch"]}.get(n)
        if n >= 4:
            qa.append(f"p{pno} {row['pn']}: no cubic-inch column printed (line: `{line}`)")
    else:
        names = {5: ["bore", "stroke", "rod", "deckHeight", "ch"], 4: ["bore", "stroke", "rod", "ch"]}.get(n)
    if not names:
        skipped.append((pno, line, f"unexpected geometry token count {n}: {geo}"))
        return None
    for k, v, g in zip(names, vals, geo):
        if k == "deckHeight" and v is not None and (g.startswith(("+", "-")) or abs(v) < 1):
            row["deckDist"] = v  # printed in the Block Height / Deck column as +/-.0xx
        else:
            row[k] = v
    if row["bore"] is not None and not (2.5 < row["bore"] < 5.2):
        qa.append(f"p{pno} {row['pn']}: bore {row['bore']} out of range (line: `{line}`)")
    if row["ch"] is not None and not (0.7 < row["ch"] < 2.6):
        qa.append(f"p{pno} {row['pn']}: CH {row['ch']} out of range (line: `{line}`)")

    # --- compression ratios (one per chamber header), dome, weight, deck clearance
    # The run of decimal tokens after CH is <CR per chamber header> + <dome volume>; the dome is
    # the last one (CRs and positive domes look alike, so the run length, not the header, decides).
    n_ch = len(sec.chambers)
    run = []
    while i < len(body) and (DOME_RE.match(body[i]) or CR_RE.match(body[i]) or body[i] in ("-", "N/A")):
        t = body[i]
        if WEIGHT_RE.match(t) and (int(t) >= 100 or int(t) == 0 or len(run) >= n_ch + 1):
            break  # gram weight (CR / dome integers are < 100; '0' is an unprinted weight)
        if re.search(r"\.\d{3}$", t) and (len(run) >= n_ch + 1 or not t.startswith("-")):
            break  # 3-decimal value after the dome = Deck Clearance column (SRP Ford pages)
        run.append(t)
        i += 1
    crown_txt = []
    while i < len(body) and body[i] in ("Flat", "Top", "Dish", "Head", "Tall", ".187"):
        crown_txt.append(body[i])
        i += 1
    if crown_txt:
        row["crownText"] = " ".join(crown_txt)

    def cr_val(t):
        m = CR_RE.match(t)
        return float(m.group(1)) if m else None

    if n_ch and len(run) > n_ch + 1 and len([t for t in run if t not in ("-", "N/A")]) == n_ch + 1:
        run = [t for t in run if t not in ("-", "N/A")]  # dash printed in an empty spacer column (p60)
    if len(run) == n_ch + 1 or (n_ch == 0 and len(run) == 1) or (row["anyBore"] and len(run) == 1):
        row["crs"], row["dome"] = [cr_val(t) for t in run[:-1]], float(run[-1])
    elif len(run) == n_ch and n_ch and run[-1].startswith("-"):
        row["crs"], row["dome"] = [cr_val(t) for t in run[:-1]], float(run[-1])
        qa.append(f"p{pno} {row['pn']}: {len(run) - 1} CR values printed for {n_ch} chamber headers {[c for c, _ in sec.chambers]}; keyed to the first headers (line: `{line}`)")
    elif len(run) == n_ch:
        row["crs"] = [cr_val(t) for t in run]
        if n_ch:
            qa.append(f"p{pno} {row['pn']}: CR columns present but no dome volume (line: `{line}`)")
    elif run:
        row["crs"], row["dome"] = [cr_val(t) for t in run[:-1]], float(run[-1])
        qa.append(f"p{pno} {row['pn']}: {len(run) - 1} CR values but {n_ch} chamber headers {[c for c, _ in sec.chambers]} (line: `{line}`)")
    if i < len(body) and WEIGHT_RE.match(body[i]):
        w = int(body[i])
        row["weight"] = w or None
        if w == 0:
            qa.append(f"p{pno} {row['pn']}: weight printed as 0 g, dropped (line: `{line}`)")
        i += 1
        if i < len(body) and WEIGHT_RE.match(body[i]) and int(body[i]) == w:
            i += 1  # weight printed twice (p87)
    elif i < len(body) and body[i] == "TBD":
        i += 1  # weight not yet published
    if i < len(body) and DECKCLR_RE.match(body[i]):
        row["deckClr"] = to_float(body[i])
        i += 1

    # --- what is left is the footnote column
    rest = " ".join(body[i:])
    foot = []
    for tok in re.split(r"\s*,\s*", rest.strip()):
        tok = tok.strip()
        if not tok or tok == "N/A":
            continue
        if re.match(r"^\.\d{3} Pin$", tok):
            foot.append(tok)
        elif tok in FOOT_WORDS or tok in PIN_CODES:
            foot.append(tok)
        elif tok in ("Flat Top", "Dish"):
            row["crownText"] = tok
        else:
            for sub in tok.split():  # "D M" without commas
                if sub in FOOT_WORDS or sub in PIN_CODES or re.match(r"^\.\d{3}$", sub):
                    foot.append(sub)
                else:
                    qa.append(f"p{pno} {row['pn']}: unexpected token '{sub}' in footnote column (line: `{line}`)")
    row["foot"] = foot
    return row


# ----------------------------------------------------------------------------------------------
# PDF -> rows
# ----------------------------------------------------------------------------------------------
def parse_pdf(pdf_path, pages, qa, skipped):
    rows, sections = [], []
    sec = None
    pending_frag = None
    last_row = None

    def new_section(text, pno):
        nonlocal sec
        parent = None
        if sec and not sec.has_rows:  # the previous heading was a chapter/series title without its own rows
            parent = (sec.parent + " / " if sec.parent else "") + sec.heading
        elif sec and sec.parent and sec.page == pno:  # sibling tables under the same title on the same page
            parent = sec.parent
        s = Section(text, pno, parent)
        if sec:  # tables without their own column header keep the previous chamber-cc columns
            s.chambers = list(sec.chambers)
        if sec and not sec.has_rows:  # carry prose facts of an empty parent heading (e.g. NASCAR series)
            s.pins, s.alloy_hint, s.notes = list(sec.pins), sec.alloy_hint, list(sec.notes)
        sections.append(s)
        sec = s

    for pno, lines, words in page_data(pdf_path, pages):
        if pno in SKIP_PAGES:
            continue
        for li, (text, top, bottom) in enumerate(lines):
            if not text:
                continue
            tokens = text.split()
            if is_row(tokens):
                if sec is None:
                    skipped.append((pno, text, "row before any heading"))
                    continue
                row = parse_row(tokens, sec, pno, qa, skipped)
                if row:
                    row["section"], row["sub"], row["parent"], row["sectionPage"] = sec.heading, sec.sub, sec.parent, sec.page
                    row["chambers"] = list(sec.chambers)
                    if pending_frag:
                        row["frag"] = pending_frag
                        pending_frag = None
                    sec.rows.append(row)
                    sec.has_rows = True
                    rows.append(row)
                    last_row = row
                continue
            if text.startswith("Head Cubic Centimeters") and sec is not None:
                cr_line = next((l for l in lines[li + 1:li + 4] if l[0].startswith("Compression Ratio")), None)
                sec.chambers = chambers_in_band(words, top, cr_line[2] if cr_line else bottom + 30)
                continue
            if text.startswith("Compression Ratio") or text.startswith("Part #"):
                continue
            if FRAG_RE.match(text) and re.search(r"\d", text) and re.search(r"[A-Z]", text) and len(text) <= 14:
                if last_row is not None and last_row["frag"] and last_row["frag"].endswith(("/", "-")):
                    last_row["frag"] += text
                else:
                    pending_frag = text
                continue
            if SUB_RE.search(text):
                if sec is None:
                    continue
                if sec.has_rows:  # a new sub-table within the section: reset per-sub facts
                    s = Section(sec.heading, sec.page, sec.parent)
                    s.pins, s.alloy_hint, s.notes, s.chambers = list(sec.pins), sec.alloy_hint, list(sec.notes), list(sec.chambers)
                    sections.append(s)
                    sec = s
                parse_sub(text, sec)
                continue
            if is_heading(text):
                if sec and not sec.has_rows and (text.endswith(" SERIES") or text.startswith(sec.heading)):
                    sec.sub = text  # "TOP FUEL" -> "TOP FUEL SERIES"
                    continue
                new_section(text, pno)
                last_row = None
                continue
            if sec is None:
                continue
            # prose: pin part numbers, alloy, ring inclusion, starred notes
            for m in PINPN_RE.finditer(text):
                d = int(m.group(1)) / 1000
                if 0.8 <= d <= 1.2 and d not in sec.pins:
                    sec.pins.append(d)
                mr = re.search(r"For (?:use with )?(\d\.\d{3})[”\"]? Rod", text[m.end():])
                if mr:
                    sec.pins_by_rod[float(mr.group(1))] = d
            for m in re.finditer(r"(\d?\.\d{3})[”\"]?\s*[xX]\s*2\.\d{3}[”\"]?\s*pin\b|ACCEPT (\.\d{3})” DIA PIN", text, re.I):
                d = float(m.group(1) or m.group(2))
                if 0.8 <= d <= 1.2 and d not in sec.pins:
                    sec.pins.append(d)
            if re.search(r"\b4032\b", text):
                sec.alloy_hint = "4032"
            elif re.search(r"\b2618\b", text):
                sec.alloy_hint = "2618"
            if re.search(r"rings?\b.*\(sold separately\)|rings? \(sold separately\)|Rings Sold Separately", text, re.I):
                sec.rings_included = False
            elif re.search(r"^Rings Included|Rings Included:|Ring Set Included|Premium Rings Included", text, re.I):
                sec.rings_included = True
            if text.startswith("*") and len(text) < 160:
                sec.notes.append(text.lstrip("* ").rstrip("."))
    return rows, sections


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
SBC = ("Small-block Chevy", 8, True)
BBC = [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
SBF = ("Small-block Ford (Windsor)", 8, True)


def families_for(heading, page):
    h = heading.upper()
    if "ECOBOOST" in h:
        if "2.3" in h:
            return [("Ford EcoBoost 2.3L", 4, False)]
        return [("Ford EcoBoost 3.5L", 6, False)]
    if "PINTO" in h or "2300" in h:
        return [("Ford 2300 Pinto", 4, False)]
    if "FLAT HEAD" in h:
        return [("Ford Flathead V8", 8, False)]
    if h.startswith(("TOP FUEL", "BLOWN ALCOHOL")):
        return [(heading, 8, False)]
    if "BUICK" in h:
        return [("Buick V6 181-252", 6, True)]
    if "HELLCAT" in h or "6.2L HEMI" in h or "6.4L HEMI" in h:
        return [("Chrysler Gen III Hemi 6.2/6.4", 8, True)]
    if "5.7L HEMI" in h or "6.1L HEMI" in h:
        return [("Chrysler Gen III Hemi 5.7/6.1", 8, True)]
    if "426 HEMI" in h:
        return [("Chrysler 426 Hemi", 8, True)]
    if re.search(r"\b440\b|383 WEDGE", h):
        return [("Mopar B/RB big block", 8, True)]
    if "S/B CHRYSLER" in h or "SMALL BLOCK 318" in h or "SMALL BLOCK 340" in h or "CHRYSLER W-2" in h:
        return [("Mopar LA small block", 8, True)]
    if "CLEVELAND" in h:
        return [("Ford 351C/351M/400", 8, True)]
    if "“FE”" in h or re.search(r"\bFE\b", h) or "427/428" in h or "390/428" in h:
        return [("Ford FE", 8, True)]
    if re.search(r"\b460\b", h):
        return [("Ford 429/460", 8, True)]
    if re.search(r"BOSS 302|WINDSOR|351W|331/347|302/|351 N HEAD|TWISTED WEDGE|SMALL BLOCK FORD", h):
        return [SBF]
    if "COYOTE" in h or "VOODOO" in h:
        return [("Ford Coyote", 8, True)]
    if "MODULAR" in h or "GT500" in h:
        return [("Ford Modular", 8, True)]
    if "PONTIAC" in h:
        return [("Pontiac V8", 8, True)]
    if "OLDSMOBILE" in h:
        return [("Oldsmobile V8", 8, True)]
    if re.search(r"\bLT[14]\b|GEN V\b", h):
        return [("GM LT (Gen V)", 8, True)]
    if re.search(r"\bLS\d?\b|\bLSX\b|L92|VORTEC|GM LS", h):
        return [("GM LS", 8, True)]
    if re.search(r"\b60[24]\b|SMALL BLOCK CHEVY", h):
        return [SBC]
    if re.search(r"\bBBC\b|B/B|BIG BLOCK|\b396\b|\b502\b|\b572\b|\b632\b|427 OPEN CHAMBER", h):
        return BBC
    # chapter fallback (catalog table of contents)
    if 13 <= page <= 31 or 69 <= page <= 76 or 87 <= page <= 91:
        return [SBC]
    if 32 <= page <= 45 or 91 <= page <= 95:
        return BBC
    if 47 <= page <= 53 or 82 <= page <= 84:
        return [("Ford Modular", 8, True)]
    if 53 <= page <= 55 or 76 <= page <= 82 or 97 <= page <= 108:
        return [SBF]
    if 59 <= page <= 60 or 95 <= page <= 96:
        return [("Mopar LA small block", 8, True)]
    if 65 <= page <= 68:
        return [("GM LS", 8, True)]
    return [(heading, None, False)]


def parse_years(text):
    y0 = y1 = None
    for m in re.finditer(r"\b(19\d\d|20\d\d)\s*[-–]\s*(20\d\d|19\d\d)\b", text):
        a, b = int(m.group(1)), int(m.group(2))
        y0 = a if y0 is None else min(y0, a)
        y1 = b if y1 is None else max(y1, b)
    for m in re.finditer(r"\b(20\d\d)\+", text):
        a = int(m.group(1))
        y0 = a if y0 is None else min(y0, a)
    return y0, y1


# ----------------------------------------------------------------------------------------------
# rows -> records
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def crown_word(heading, dome):
    h = heading.upper()
    if dome is None:
        return "crown"
    if dome > 0.5:
        return "dome"
    if dome < -8:
        return "inverted dome" if "INVERTED" in h else "dish"
    return "flat top"


def row_pin(row, sec_pins, heading, page):
    foot = row["foot"]
    for f in foot:
        m = re.match(r"^(\.\d{3}) Pin$", f)
        if m:
            return float(m.group(1)), "footnote"
    for f in foot:
        if f in PIN_CODES and f != "F":
            return PIN_CODES[f], "footnote"
    if "F" in foot:
        trad = not re.search(r"\bLS|\bLT|MODULAR|COYOTE|VOODOO|ECOBOOST|HEMI GEN|GT500|VORTEC", heading.upper()) and page not in range(13, 21)
        if trad and (not sec_pins or 1.04 in sec_pins):
            return 1.04, "footnote"
    if row.get("subPin"):
        return row["subPin"], "sub-heading"
    if len(sec_pins) == 1:
        return sec_pins[0], "section pin part number"
    if row.get("rod") in row.get("pinsByRod", {}):
        return row["pinsByRod"][row["rod"]], "section pin part number by rod length"
    return None, None


def build_records(rows, sections, qa):
    sec_by_rows = {}
    for s in sections:
        for r in s.rows:
            sec_by_rows[id(r)] = s
    by_key, order = {}, []
    for r in rows:
        s = sec_by_rows[id(r)]
        r["subPin"], r["pinsByRod"] = s.sub_pin, s.pins_by_rod
        pin, pin_src = row_pin(r, s.pins, s.heading, r["page"])
        foot = r["foot"]
        foot_alloy = next((f for f in foot if f in ("2618", "4032")), None)
        alloy = foot_alloy or s.sub_alloy or s.alloy_hint or ("2618" if r["page"] <= 63 else "4032")
        alloy_src = "footnote" if foot_alloy else ("section" if (s.sub_alloy or s.alloy_hint) else "series default")
        ring_set = r["ringSet"]
        gasket = r["gasket"]
        if r["frag"]:
            frag = r["frag"].rstrip("/")
            if re.match(r"^(GM|FD|CR)\d{4}", frag):
                gasket = (gasket + "/" if gasket else "") + frag
            elif ring_set is None:
                ring_set = frag
            else:
                qa.append(f"p{r['page']} {r['pn']}: unplaced multi-line cell '{r['frag']}' (line: `{r['line']}`)")
        gaskets = [g.rstrip("*") for g in re.split(r"/", gasket)] if gasket else None
        cr = None
        if r["crs"]:
            keys = [c for c, _ in r["chambers"]]
            if len(keys) != len(r["crs"]):
                keys = keys[:len(r["crs"])] + [f"col{j + 1}" for j in range(len(keys), len(r["crs"]))]
            cr = {k: v for k, v in zip(keys, r["crs"]) if v is not None} or None
        cr_labels = [f"{c}cc = {lab}" for c, lab in r["chambers"] if lab] or None
        for fam, cyl, known in families_for(s.heading, r["page"]):
            key = (brand_for(r["page"]), fam, r["pn"])
            combo = clean({"ci": r["cid"], "stroke": r["stroke"], "rodLength": r["rod"], "deckHeight": r["deckHeight"],
                           "deckDistance": r["deckDist"], "cr": cr, "crNote": "; ".join(cr_labels) if cr_labels else None,
                           "weight": r["weight"], "ringSet": ring_set, "headGasket": gaskets})
            if key not in by_key:
                by_key[key] = {"fam": fam, "cyl": cyl, "known": known, "first": r, "sec": s, "pin": pin, "pinSrc": pin_src,
                               "alloy": alloy, "alloySrc": alloy_src, "combos": [combo], "sections": OrderedDict(), "bores": []}
                order.append(key)
            e = by_key[key]
            e["sections"][s.heading] = True
            if r["bore"] is not None and r["bore"] not in e["bores"]:
                e["bores"].append(r["bore"])
            if combo not in e["combos"]:
                e["combos"].append(combo)
            f = e["first"]
            if f is not r:
                for k in ("ch", "dome", "bore"):
                    if f.get(k) != r.get(k):
                        qa.append(f"PN {r['pn']} ({fam}): `{k}` differs between p{f['page']} ({f.get(k)}) and p{r['page']} ({r.get(k)}) — catalog inconsistency, first value kept")

    records = []
    for key in order:
        e = by_key[key]
        r, s, fam, cyl = e["first"], e["sec"], e["fam"], e["cyl"]
        for c in e["combos"]:
            if c.get("ci") and c.get("stroke") and cyl and r["bore"]:
                calc = math.pi / 4 * r["bore"] ** 2 * c["stroke"] * cyl
                if abs(calc - c["ci"]) > max(4, 0.02 * calc):
                    qa.append(f"PN {r['pn']} p{r['page']}: catalog CID {c['ci']} vs computed {calc:.0f} ({r['bore']} bore x {c['stroke']} stroke x {cyl}) — check row")
        first = e["combos"][0]
        foot = r["foot"]
        notes = []
        if s.parent:
            notes.append(s.parent)
        if s.sub:
            notes.append(s.sub)
        if s.std_bore_text and len(s.std_bores) != 1:
            notes.append("std bore: " + s.std_bore_text)
        notes += s.notes
        if r["engine"]:
            notes.append(r["engine"])
        others = [h for h in e["sections"] if h != s.heading]
        if others:
            notes.append("also listed under: " + "; ".join(others))
        foot_notes = [FOOT_WORDS[f] for f in foot if f in FOOT_WORDS and f not in ("B", "M", "A", "Ultra", "2618", "4032", "L")]
        y0, y1 = parse_years(s.heading + " | " + (s.sub or ""))
        spec = clean({
            "bore": r["bore"],
            "boreOptions": sorted(e["bores"]) if len(e["bores"]) > 1 else None,
            "boreRange": next(([float(a), float(b)] for n in s.notes for a, b in re.findall(r"bore sizes from (\d\.\d{3}) - (\d\.\d{3})", n)), None) if r["anyBore"] else None,
            "stdBore": s.std_bores[0] if len(s.std_bores) == 1 else None,
            "oversize": r["oversize"],
            "stroke": first.get("stroke"),
            "strokeOptions": [3.48, 3.5] if "A" in foot else None,
            "rodLength": first.get("rodLength"),
            "ch": r["ch"],
            "pin": e["pin"],
            "domeCc": r["dome"],
            "crownNote": r["crownText"],
            "alloy": e["alloy"],
            "weight": first.get("weight"),
            "cr": first.get("cr"),
            "crNote": first.get("crNote"),
            "deckHeight": first.get("deckHeight"),
            "deckDistance": first.get("deckDistance"),
            "deckClearance": r["deckClr"],
            "ringPack": s.ring_pack,
            "ringsIncluded": s.rings_included,
            "ringSet": first.get("ringSet"),
            "headGasket": first.get("headGasket"),
            "oilSupportRails": True if "B" in foot else None,
            "madeToOrder": True if "M" in foot or r["anyBore"] else None,
            "limitedQuantity": True if "L" in foot else None,
            "series": series_for(r["page"], foot),
            "note": "; ".join(foot_notes) or None,
        })
        if len(e["combos"]) > 1:
            spec["applications"] = [clean({k: c.get(k) for k in ("ci", "stroke", "rodLength", "deckHeight", "deckDistance", "cr", "weight", "ringSet", "headGasket")}) for c in e["combos"]]
        bore_s = f"{r['bore']:.3f} bore" if r["bore"] else ("any bore (made to order)" if r["anyBore"] else "bore n/a")
        dome_s = f" {r['dome']:+.1f}cc".replace("+", "") if r["dome"] is not None else ""
        ch_s = f", {r['ch']} CH" if r["ch"] else ""
        name = f"{spec['series']} forged piston, {bore_s}, {crown_word(s.heading, r['dome'])}{dome_s}{ch_s}"
        ci = sorted({c["ci"] for c in e["combos"] if c.get("ci")})
        records.append({
            "m": key[0],
            "p": r["pn"],
            "cat": "piston",
            "name": name,
            "fit": clean({"fam": fam, "ci": ci or None, "cyl": cyl, "y0": y0, "y1": y1, "notes": "; ".join(notes) or None}),
            "spec": spec,
            "src": {"doc": DOC, "edition": EDITION, "file": os.path.relpath(PDF_DEFAULT, REPO).replace(os.sep, "/"), "page": r["page"], "section": s.heading},
            "emissions": None,
            "_known": e["known"],
            "_pinSrc": e["pinSrc"],
            "_alloySrc": e["alloySrc"],
        })
    return records


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("bore", "stdBore", "oversize", "stroke", "rodLength", "ch", "pin", "domeCc", "weight", "deckHeight", "deckDistance", "deckClearance")


def validate(records):
    errs, seen = [], set()
    for rec in records:
        for k in ("m", "p", "cat"):
            if not rec.get(k):
                errs.append(f"{rec.get('p')}: missing {k}")
        if not rec.get("fit", {}).get("fam"):
            errs.append(f"{rec.get('p')}: missing fit.fam")
        if not rec.get("src"):
            errs.append(f"{rec.get('p')}: missing src")
        key = (rec["m"], rec["p"], rec["fit"]["fam"])
        if key in seen:
            errs.append(f"duplicate p within family: {key}")
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str) and o == "":
                errs.append(f"{rec['p']}: empty string at {path}")
            elif isinstance(o, float) and (math.isnan(o) or math.isinf(o)):
                errs.append(f"{rec['p']}: bad number at {path}")

        walk(rec, rec["p"])
        for k in NUMERIC_SPEC:
            v = rec["spec"].get(k)
            if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float))):
                errs.append(f"{rec['p']}: spec.{k} is not a number: {v!r}")
        for k in ("boreOptions", "boreRange", "strokeOptions"):
            v = rec["spec"].get(k)
            if v is not None and (not isinstance(v, list) or not all(isinstance(x, (int, float)) for x in v)):
                errs.append(f"{rec['p']}: spec.{k} is not a list of numbers: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and (not isinstance(cr, dict) or not all(isinstance(v, (int, float)) for v in cr.values())):
            errs.append(f"{rec['p']}: spec.cr malformed: {cr!r}")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, pdf_path, rows, sections, records, skipped, qa, errs, unknown):
    fam_recs, brand_recs = Counter(), Counter()
    cov = Counter()
    for rec in records:
        fam_recs[(rec["m"], rec["fit"]["fam"])] += 1
        brand_recs[rec["m"]] += 1
        for k in ("ch", "domeCc", "pin", "cr", "weight", "ringPack", "stroke", "rodLength"):
            if rec["spec"].get(k) is not None:
                cov[k] += 1
    pin_src = Counter(r["_pinSrc"] or "none" for r in records)
    alloy_src = Counter(r["_alloySrc"] for r in records)
    sec_rows = OrderedDict()
    for s in sections:
        if s.rows:
            k = (s.page, s.heading)
            sec_rows[k] = sec_rows.get(k, 0) + len(s.rows)

    n = len(records)
    L = ["# JE Pistons / SRP — extraction notes", ""]
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_je.py` from `{os.path.relpath(pdf_path, REPO)}` (local file, no network).")
    L += ["", "## What was parsed", ""]
    L.append(f"PDF pages {PAGES.start}–{PAGES.stop - 1} (printed page numbers are the same), skipping {sorted(SKIP_PAGES)} (chapter intros, the NHRA Stock Eliminator PN list, SRP marketing). "
             f"{len(rows)} table rows parsed into {n} records ({', '.join(f'{b}: {c}' for b, c in brand_recs.items())}). "
             "A record is one part number in one fitment family; a part number printed under several stroke/rod rows (e.g. 207419, 258200) becomes one record whose `spec.stroke / rodLength / cr / deckHeight` are the first row and `spec.applications` lists all rows.")
    L.append("")
    L.append("Not extracted: p62 NHRA Approved Stock Eliminator (PN / model / year / HP / CID only, two interleaved columns, no dimensions); pp 110–153 sport compact / European (no fitment family in the list); pp 154–203 rings, pins, locks, gaskets, apparel, order forms. The separate powersports catalog is ignored per the brief.")
    L += ["", "### Column mapping", ""]
    L += [
        "Catalog columns: `Part # | Cubic Inches | Bore Size | Stroke | Rod Length | Block Height (or Deck Dist.) | Comp. Distance | Compression Ratio at <chamber cc>... | Dome Volume | Gram Weight | [Deck Clearance] | Footnote | Oversize | [engine] | Recommended Ring Set | Pro Seal Head Gasket`. SRP Professional / SRP tables have no Block Height column; Top Fuel / Blown Alcohol rows carry only bore, CH, weight and ring set.",
        "",
        "- `spec.bore`, `stroke`, `rodLength`, `ch` (Comp. Distance), `domeCc` (Dome Volume: negative = dish / inverted dome, positive = dome), `weight` (grams) are the printed values. `spec.oversize` is the Oversize column (`STD` = 0). `spec.stdBore` is the sub-heading's `Std Bore:` when it names one bore.",
        "- The Block Height column prints either the block deck height the CR was computed at (→ `spec.deckHeight`, e.g. 9.240 LS, 9.000/9.020 SBC, 9.780/10.180 BBC) or a signed piston-to-deck distance (`+.009` → `spec.deckDistance`, positive = crown above deck).",
        "- Compression ratios are keyed by the chamber cc read from the rotated column header (PyMuPDF words between `Head Cubic Centimeters` and `Compression Ratio`): `spec.cr = {\"64\": 10.6, \"68\": 10.1, \"70\": 9.9}`. Headers that label the chambers (`42cc = (99+ PI 2V)`) are kept in `spec.crNote`. Tables that continue under a new sub-heading without a header inherit the previous chamber list.",
        "- `spec.pin`: from the `.927 Pin` / `.945 Pin` footnote text, from footnote letters (C .927, D .912, E .990, H 1.094, K .945, P .975; F = 1.040 only in traditional domestic sections where the section's listed pins allow it, because JE also uses F for FSR), from the sub-heading `Pin Dia:`, or from the pin part number in the section's `Includes:` lines when that section names exactly one pin diameter (`Pin #927-2250-15-51C` → .927). Sections that list two pins (LS with .945 for 6.098 rods and .927 for 6.125 rods) get no pin unless the row says so.",
        f"  Pin sources over the records: {dict(pin_src)}.",
        "- `spec.alloy`: `2618` footnote or a section/sub-heading statement (`426 SERIES (4032 ALUMINUM ALLOY)`, `Forged from 4032 ...`) when present; otherwise the catalog's series default — JE shelf pistons 2618 (p9 'Shelf piston terminology', p3 Ultra Series), SRP and SRP Professional 4032 (p64 'The SRP difference'). "
        f"Sources over the records: {dict(alloy_src)}. Treat `series default` as catalog-level, not row-level, information.",
        "- `spec.ringPack` is the sub-heading's `Ring package designed for:` (`1/16, 1/16, 3/16`, `1.2, 1.5, 3.0mm`, `.043, .043, 3.0mm`); `spec.ringsIncluded` only when the section says so (SRP Professional: included; SRP: sold separately; JE: not stated → omitted). `spec.ringSet` / `spec.headGasket` are the recommended JE Pro Seal part numbers (two-line left/right Modular gaskets become a list).",
        "- Footnotes → `spec.oilSupportRails` (B), `madeToOrder` (M), `limitedQuantity` (L), `strokeOptions` (A = fits 3.480 and 3.500), `series` (Ultra / SRP Pro 2618), other letters (J, S, T, V, W, X, BL, FSR) as text in `spec.note`.",
        "- NASCAR 'any bore, made to order' rows (`265258 **`) have no bore: `spec.boreRange` = the bore span from the section note, `madeToOrder: true`.",
        "- `cat` is `piston` for every record; the catalog sells no piston+rod kits (Boostline 'combo kits available' is only a footnote). `m` is `JE` for pp 13–63 and `SRP` for the SRP Professional / SRP chapters (JE-owned brand; flip `brand_for()` if one brand is preferred). `emissions` is `null`.",
    ]
    L += ["", "### Family mapping", ""]
    L += [
        "- Heading keywords first (LS/LT/Vortec → `GM LS` / `GM LT (Gen V)`; 440 / 383 wedge → `Mopar B/RB big block`; S/B Chrysler, 318/340/360, W-2 → `Mopar LA small block`; Hellcat / 6.2L / 6.4L Hemi → `Chrysler Gen III Hemi 6.2/6.4`; 426 Hemi; Cleveland; FE; 460 → `Ford 429/460`; Boss 302 / Windsor / 331-347 / 351W / Twisted Wedge → `Small-block Ford (Windsor)`; Coyote / Voodoo → `Ford Coyote`; Modular / GT500 5.8 / 6.2 SOHC → `Ford Modular`; Pontiac; Oldsmobile; Buick Grand National → `Buick V6 181-252`), then the catalog chapter (table of contents page ranges) for headings like `23º TOUR SERIES GP` or `EDELBROCK® DOME`.",
        "- Big-block Chevy sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same convention as MAHLE; drop one if the consumer treats them as one family).",
        "- `FORD 2013-2014 GT500 MODULAR 5.8L` and `FORD 2010-2017 MODULAR SOHC 6.2L` follow the catalog into `Ford Modular`; the 6.2 'Boss' is not a true Modular — decide whether it needs its own family.",
        "- Years only where the heading states them (Coyote 2011-2017 / 2018+, GT500 2013-2014, 6.2L 2010-2017, EcoBoost 2010-2017 / 2017+).",
    ]
    if unknown:
        L.append(f"- **Families not in the fitment list** (`fit.fam` = catalog heading or a descriptive name; needs a decision): {', '.join('`' + u + '`' for u in unknown)}.")
    L += ["", "## Spec coverage", "", "| field | records with a value |", "|---|---|"]
    L += [f"| {k} | {cov[k]} / {n} |" for k in ("stroke", "rodLength", "ch", "pin", "domeCc", "cr", "weight", "ringPack")]
    L += ["", "## Rows per section (PDF page where the table starts)", "", "| page | section | rows |", "|---|---|---|"]
    L += [f"| {p} | {h} | {c} |" for (p, h), c in sec_rows.items()]
    L += ["", "## Records per brand and family", "", "| brand | family | records |", "|---|---|---|"]
    L += [f"| {b} | {f} | {c} |" for (b, f), c in sorted(fam_recs.items(), key=lambda kv: (kv[0][0], -kv[1], kv[0][1]))]
    L.append(f"| **total** | | {n} |")
    L += ["", "## Rows skipped", ""]
    L += [f"- p{p}: {why}: `{line}`" for p, line, why in skipped] or ["- none"]
    L += ["", "## Needs human QA", ""]
    L += [f"- {q}" for q in qa] or ["- nothing flagged"]
    L += ["", "## Validation", ""]
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a brand and family; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.")
    L.append("")
    L += ["- passed"] if not errs else [f"- {e}" for e in errs]
    L.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


# ----------------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", default=PDF_DEFAULT, help="path to the JE catalog PDF")
    ap.add_argument("--pages", help="debug: comma-separated PDF pages to parse instead of the full range")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    pages = [int(p) for p in args.pages.split(",")] if args.pages else list(PAGES)

    os.makedirs(OUT, exist_ok=True)
    qa, skipped = [], []
    rows, sections = parse_pdf(args.pdf, pages, qa, skipped)
    records = build_records(rows, sections, qa)
    unknown = sorted({r["fit"]["fam"] for r in records if not r["_known"]})
    errs = validate(records)
    write_notes(os.path.join(OUT, "je.md"), args.pdf, rows, sections, records, skipped, qa, errs, unknown)
    for r in records:
        for k in ("_known", "_pinSrc", "_alloySrc"):
            r.pop(k, None)

    out = {
        "source": {"brand": "JE / SRP", "doc": DOC, "edition": EDITION, "file": os.path.relpath(args.pdf, REPO).replace(os.sep, "/"),
                   "pages": f"PDF pages {PAGES.start}-{PAGES.stop - 1}"},
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "je.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"rows parsed: {len(rows)}; records: {len(records)}; skipped lines: {len(skipped)}; QA items: {len(qa)}; validation errors: {len(errs)}")
    for e in errs[:50]:
        print("  VALIDATION:", e)
    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
