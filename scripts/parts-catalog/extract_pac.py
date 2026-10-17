#!/usr/bin/env python3
"""Extract PAC Racing Springs valve springs, spring kits, retainers, locks, seats and shims from the
PAC Master Product Catalog Vol. 24 (May 2024) PDF, saved by hand under Catalogs/ (the site blocks
fetchers; no network is used).

Pages (printed page numbers match PDF page numbers):
  9-37   valve spring tables (one text row per spring; diameter columns differ per page) and the
         "Spring loads and heights" tables (one column per spring; parsed by word x-position)
  38     late-model cross reference (spring PN -> engine family)
  41     spring kits (loads + component PNs)
  44-47  retainers (300/400/500/600/700 series), 48-49 valve locks, 50-51 seats and shims
Skipped: motorcycle springs (p40), Harley kits, tools (p52).

Output: out/pac.json (shared parts record format) and out/pac.md (notes).
Writes nothing outside out/. Run with `python -X utf8 -I`.
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
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", "PAC_CATALOG_VOL_24_05.06.24 REVISED ISSUU.pdf")
BRAND = "PAC Racing Springs"
EDITION = "2024-05 (Vol. 24, revised 05.06.24)"
DOC = "PAC Racing Springs Master Product Catalog Vol. 24 (PDF)"

# ----------------------------------------------------------------------------------------------
# page layouts
# ----------------------------------------------------------------------------------------------
# diameter columns that precede the seat load on each spring-table page
L_OUT_MID_IN = ["od", "id", "idMiddle", "idInner"]          # dual/triple, middle may be NA
L_OUT_IN = ["od", "id", "idInner"]                          # dual
L_OUT_DAMP_IN = ["od", "id", "damper", "idInner"]           # dual or single with damper column
L_TOP_BOTTOM = ["odTop", "odBottom", "idTop", "idBottom"]   # conical page 9
L_BOTTOM_TOP = ["odBottom", "idBottom", "odTop", "idTop"]   # beehive/conical pages 26, 32-35
SPRING_PAGES = {
    9: ("1400", "Conical", L_TOP_BOTTOM),
    10: ("1200", "Drag Race", L_OUT_MID_IN), 11: ("1200", "Drag Race", L_OUT_MID_IN),
    12: ("1300", "Drag Race Dual", L_OUT_IN), 13: ("1300", "Drag Race Dual", L_OUT_IN),
    14: ("1300", "Drag Race Dual", L_OUT_IN), 15: ("1300", "Drag Race Dual", L_OUT_IN),
    16: ("1300", "Drag Race Triple", L_OUT_MID_IN), 17: ("1300", "Drag Race Triple", L_OUT_MID_IN),
    18: ("1300", "Drag Race Triple", L_OUT_MID_IN), 19: ("1300", "Drag Race Triple", L_OUT_MID_IN),
    20: ("1200", "Circle Track Endurance", L_OUT_DAMP_IN), 21: ("1200", "Circle Track Endurance", L_OUT_DAMP_IN),
    22: ("1300", "Circle Track Dual", L_OUT_DAMP_IN), 23: ("1300", "Circle Track Dual", L_OUT_DAMP_IN),
    24: ("1300", "Circle Track Dual", L_OUT_DAMP_IN), 25: ("1300", "Circle Track Dual", L_OUT_DAMP_IN),
    26: ("1400", "Specialty & Class Specific", L_BOTTOM_TOP), 27: ("1400", "Specialty & Class Specific", L_BOTTOM_TOP),
    28: ("1900", "Hot Rod", L_OUT_DAMP_IN), 29: ("1900", "Hot Rod", L_OUT_DAMP_IN),
    30: ("Diesel", "Diesel", L_OUT_IN),
    32: ("1200", "Ovate Beehive", L_BOTTOM_TOP), 33: ("1200", "Ovate Beehive", L_BOTTOM_TOP),
    34: ("RPM", "Beehive RPM", L_BOTTOM_TOP), 35: ("RPM", "Beehive RPM", L_BOTTOM_TOP),
    36: ("RPM", "Dual RPM", L_OUT_DAMP_IN), 37: ("RPM", "Dual RPM", L_OUT_DAMP_IN),
}
# sub-tables lower on a page with a different diameter layout: page -> [(y_from, layout)]
LAYOUT_BELOW = {26: [(360, L_OUT_IN, "1500", "Circle Track Endurance"), (539, L_OUT_IN, "1400", "Specialty & Class Specific")]}
XREF_PAGE = 38
KIT_PAGE = 41
RETAINER_PAGES = (44, 45, 46, 47)
LOCK_PAGES = (48, 49)
SEAT_PAGES = (50, 51)

RETAINER_MATERIAL = {"3": "chrome moly steel", "4": "titanium 6Al-4V", "5": "titanium Ti-17",
                     "6": "tool steel", "7": "tool steel (aerospace alloy)"}
RETAINER_SERIES_KEY = {"3": "steel300", "4": "ti400", "5": "ti500", "6": "toolSteel600", "7": "toolSteel700"}

SPRING_PN_RE = re.compile(r"^\*?(PAC-(?:\d{4}|D\d{3})[A-Z]{0,2})$")
KIT_PN_RE = re.compile(r"^(PAC-KS\d{2})$")
RET_PN_RE = re.compile(r"^(PAC-R\d{3})$")
LOCK_PN_RE = re.compile(r"^(PAC-LR?\d{4})$")
SEAT_PN_RE = re.compile(r"^(PAC-S\d{3}X?)$")
LOADTBL_PN_RE = re.compile(r"^PAC-[A-Z]*\d{3,4}[A-Zx]{0,2}$")
R_TOKEN_RE = re.compile(r"^(?:PAC-)?(R\d{3})[,;]?$")
S_TOKEN_RE = re.compile(r"^(?:PAC-)?(S\d{3}X?)[,;]?$")
DEC_RE = re.compile(r"^\d?\.\d{2,4}$")
INT_RE = re.compile(r"^\d{1,4}$")
HEADER_WORDS = {"Retainers", "Seats", "Closed)", "Open)", "Bind", "Comments", "Lift", "Rate", "(Valve", "Spring", "Max",
                "OD", "ID", "Outer", "Middle", "Inner", "Damper", "Height", "Load", "Installed", "Open", "Part", "No.",
                "Series", "PAC", "300", "400", "500", "600", "Coil", "Coi", "TOP", "BOTTOM", "Bottom", "Top", "End", "Valve",
                "Diameters", "Loads", "Recommended", "Matching", "Components", "Oen)", "Included", "Locks", "Seals"}

# comment text -> engine families (fit.fam strings from cam-fitment.json)
FAM_RULES = [
    (re.compile(r"\bLS\d?\b|\bLS applications", re.I), ["GM LS"]),
    (re.compile(r"Gen V GM LT|\bLT\b"), ["GM LT (Gen V)"]),
    (re.compile(r"\bSBC\b"), ["Small-block Chevy"]),
    (re.compile(r"\bBBC\b|Big block"), ["Chevy Mark IV big block", "Chevy Gen VI big block"]),
    (re.compile(r"\bAMC\b"), ["AMC V8"]),
    (re.compile(r"Coyote"), ["Ford Coyote"]),
    (re.compile(r"FMOD|4\.6L|5\.4L"), ["Ford Modular"]),
    (re.compile(r"Godzilla"), ["Ford Godzilla 7.3"]),
    (re.compile(r"Cummins"), ["Cummins 5.9 24V/CR"]),
    (re.compile(r"Powerstroke 6\.0/6\.4"), ["Powerstroke 6.0", "Powerstroke 6.4"]),
    (re.compile(r"Duramax"), ["Duramax 6.6"]),
    (re.compile(r"Gen V Hemi"), ["Gen V Hemi (catalog heading)"]),
    (re.compile(r"(?<!Gen V )\bHemi\b"), ["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"]),
]
XREF_FAMS = {  # page 38 heading (make, group, sub-label) -> families
    ("GM", "LS Beehive", None): ["GM LS"], ("GM", "LS Beehive RPM", None): ["GM LS"],
    ("GM", "LS Dual HYD Roller Hot Rod", None): ["GM LS"], ("GM", "LS Dual HYD Roller RPM", None): ["GM LS"],
    ("GM", "LS Dual Solid Roller", None): ["GM LS"], ("GM", "LT", None): ["GM LT (Gen V)"],
    ("Ford", "FMOD 2V", None): ["Ford Modular"], ("Ford", "FMOD 3V", None): ["Ford Modular"],
    ("Ford", "FMOD 4.6 4V", None): ["Ford Modular"],
    ("Ford", "FMOD Coyote", "GEN 1 & 2"): ["Ford Coyote"], ("Ford", "FMOD Coyote", "GEN 3"): ["Ford Coyote"],
    ("Ford", "FMOD 4.6 & 5.0 Coyote Race", None): ["Ford Modular", "Ford Coyote"],
    ("Ford", "GT500", "INTAKE"): ["Ford Modular"], ("Ford", "GT500", "EXHAUST"): ["Ford Modular"],
    ("Ford", "Godzilla", None): ["Ford Godzilla 7.3"],
    ("Dodge", "HEMI", "03-07 5.7 & 6.1 LITER"): ["Chrysler Gen III Hemi 5.7/6.1"],
    ("Dodge", "HEMI", "6.4 LITER"): ["Chrysler Gen III Hemi 6.2/6.4"],
    ("Dodge", "HEMI", "GEN 3 5.7 & 6.1 LITER"): ["Chrysler Gen III Hemi 5.7/6.1"],
    ("Dodge", "Viper", None): ["Dodge Viper V10 (catalog heading)"],
}
KNOWN_FAMS = {"Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "GM LS", "GM LT (Gen V)",
              "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "AMC V8", "Chrysler Gen III Hemi 5.7/6.1",
              "Chrysler Gen III Hemi 6.2/6.4", "Cummins 5.9 24V/CR", "Powerstroke 6.0", "Powerstroke 6.4", "Duramax 6.6"}


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def num(s):
    if s is None:
        return None
    t = str(s).strip().rstrip('"”').replace(",", "").lstrip("+")
    if re.fullmatch(r"-?\d*\.\d+|-?\d+", t):
        v = float(t)
        return int(v) if v.is_integer() and "." not in t else v
    return None


def undouble(tok):
    """'DDuuaall' (bold heading printed twice, dedupe missed) -> 'Dual'."""
    if len(tok) >= 4 and len(tok) % 2 == 0 and tok[0::2] == tok[1::2]:
        return tok[0::2]
    return tok


def page_words(page):
    """Facing pages share one text layer: the left page carries the right half at x > 612 and the right page
    carries the left half at x < 0. Parse uncropped, drop x < 0 (already parsed from the left page)."""
    pg = page.dedupe_chars(tolerance=1)
    words = [w for w in pg.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False) if w["x0"] >= -2]
    for w in words:
        w["text"] = undouble(w["text"])
        w["yc"] = (w["top"] + w["bottom"]) / 2
        w["xc"] = (w["x0"] + w["x1"]) / 2
    return words


def group_lines(words, tol=3.0):
    lines = []
    for w in sorted(words, key=lambda w: (w["yc"], w["x0"])):
        if lines and abs(w["yc"] - lines[-1]["yc"]) <= tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"yc": w["yc"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
        ln["text"] = " ".join(w["text"] for w in ln["words"])
        ln["toks"] = [w["text"] for w in ln["words"]]
        ln["top"] = min(w["top"] for w in ln["words"])
        ln["bottom"] = max(w["bottom"] for w in ln["words"])
    return lines


def is_header_line(ln):
    return all(t in HEADER_WORDS or re.fullmatch(r"\(?[A-Za-z/]+\)?", t) and t in HEADER_WORDS for t in ln["toks"])


def is_table_break(ln):
    t = ln["text"]
    return bool(re.search(r"SPECIFICATIONS|S ?P ?E ?C ?I ?F|Spring Diameters|wiseco\.com|R ?A ?C ?I ?N ?G ?S ?P ?R|Featuring", t)) \
        or bool(re.fullmatch(r"(Single|Dual|Triple) Springs?", t)) or bool(re.match(r"^\*(?!PAC-)[A-Za-z]", t)) \
        or bool(re.fullmatch(r"[A-Za-z&/ ]{3,40} Springs", t)) or bool(re.search(r"\b\d{4} Series\b", t))


def nearest(xc, cols):
    best, bd = None, 1e9
    for i, cx in enumerate(cols):
        d = abs(xc - cx)
        if d < bd:
            best, bd = i, d
    return best, bd


# ----------------------------------------------------------------------------------------------
# spring tables
# ----------------------------------------------------------------------------------------------
def parse_spring_page(words, pno, layout, qa):
    """Return (rows, load_tables). rows: dicts with pn, dia tokens, loads, rate, coil, lift, retainers, seats, comment."""
    lines = group_lines(words)
    rows, loads = [], {}
    comments_x = None
    subhead = None
    row_lines = []
    for i, ln in enumerate(lines):
        toks = ln["toks"]
        if "Comments" in toks:
            comments_x = ln["words"][toks.index("Comments")]["x0"]
        m = re.fullmatch(r"(Single|Dual|Triple) Springs?", ln["text"])
        if m:
            subhead = m.group(1).lower()
        if toks[:2] == ["Part", "No."] and len(toks) > 2 and LOADTBL_PN_RE.match(toks[2]):
            parse_load_table(lines, i, loads, pno, qa)
            continue
        if SPRING_PN_RE.match(toks[0]) and len(toks) > 4 and "@" in toks:
            row_lines.append((i, ln, comments_x, subhead))
    # bands: words between neighbouring part-number rows belong to the row (wrapped retainer lists / comments)
    for k, (i, ln, cx, subhead) in enumerate(row_lines):
        # top bound: previous row midpoint, or the header/table break above
        if k > 0 and row_lines[k - 1][0] > _last_break(lines, i):
            top = (row_lines[k - 1][1]["yc"] + ln["yc"]) / 2
        else:
            j = i - 1
            while j >= 0 and not (is_header_line(lines[j]) or is_table_break(lines[j])):
                j -= 1
            top = lines[j]["bottom"] if j >= 0 else 0
        if k + 1 < len(row_lines) and _last_break(lines, row_lines[k + 1][0]) < i:
            bottom = (row_lines[k + 1][1]["yc"] + ln["yc"]) / 2
        else:
            j = i + 1
            while j < len(lines) and not (is_table_break(lines[j]) or is_header_line(lines[j])):
                j += 1
            bottom = lines[j]["top"] if j < len(lines) else 1e9
        band = [w for w in words if top < w["yc"] < bottom]
        lay, series_group = layout, None
        for y_from, l2, ser, grp in LAYOUT_BELOW.get(pno, []):
            if ln["yc"] > y_from:
                lay, series_group = l2, (ser, grp)
        row = parse_spring_row(ln, band, cx, lay, pno, qa)
        if row:
            row["subhead"] = subhead
            row["seriesGroup"] = series_group
            rows.append(row)
    return rows, loads


def _last_break(lines, i):
    j = i - 1
    while j >= 0 and not is_table_break(lines[j]):
        j -= 1
    return j


def parse_spring_row(ln, band, comments_x, layout, pno, qa):
    toks = ln["toks"]
    pn = SPRING_PN_RE.match(toks[0]).group(1)
    starred = toks[0].startswith("*")
    # locate "seat @ height" and "open @ height"
    ats = [i for i, t in enumerate(toks) if t == "@"]
    if len(ats) < 2:
        qa.append(f"p{pno} {pn}: could not find two load pairs in '{ln['text']}'")
        return None
    a1, a2 = ats[0], ats[1]
    dia = toks[1:a1 - 1]
    seat, inst = num(toks[a1 - 1]), num(toks[a1 + 1])
    openlb, openht = num(toks[a2 - 1]), num(toks[a2 + 1])
    rest = toks[a2 + 2:]
    rest_words = ln["words"][a2 + 2:]
    if openht is not None and openht < 0.5:
        qa.append(f"p{pno} {pn}: open height printed as '{toks[a2 + 1]}' (typo); stored null")
        openht = None
    # repeated part number column on some pages
    consumed = {id(w) for w in ln["words"][:a2 + 2]}
    rest2 = []
    for t, w in zip(rest, rest_words):
        if t.lstrip("*") == pn:
            consumed.add(id(w))
        else:
            rest2.append((t, w))
    nums = [(t, w) for t, w in rest2 if INT_RE.match(t) or DEC_RE.match(t)]
    rate = coil = lift = None
    if len(nums) >= 3:
        rate, coil, lift = num(nums[0][0]), num(nums[1][0]), num(nums[2][0])
        consumed |= {id(w) for _, w in nums[:3]}
    else:
        qa.append(f"p{pno} {pn}: expected rate/coil bind/max lift after loads, got {rest}")
    if rate is not None and rate < 50:
        qa.append(f"p{pno} {pn}: rate {rate} looks wrong")
    # diameter columns
    dia_map = {}
    if len(dia) == len(layout):
        for k, v in zip(layout, dia):
            dia_map[k] = v
    else:
        qa.append(f"p{pno} {pn}: {len(dia)} diameter tokens {dia} for layout {layout}; diameters read from wrapped cells where possible")
        # wrapped "a / b" diameters (PAC-1902): numbers in the band left of the seat-load column
        seat_x = ln["words"][a1 - 1]["x0"]
        extra = [w["text"] for w in sorted(band, key=lambda w: (w["yc"], w["x0"])) if w["x0"] < seat_x - 2 and w["yc"] != ln["yc"]]
        decs = [t for t in extra if DEC_RE.match(t) or re.fullmatch(r"\d\.\d{3}", t)]
        if "damper" in layout and len(dia) == len(layout) - 2 and len(decs) == 4:
            # two OD and two ID values printed as "a / b": beehive-type (top / bottom)
            od = sorted(num(x) for x in decs[0::2]) if False else None
            vals = [num(x) for x in decs]
            # printed order on the page: top row "odA / idA /", bottom row "odB idB"
            dia_map = {"odTop": min(vals[0], vals[2]), "odBottom": max(vals[0], vals[2]),
                       "idTop": min(vals[1], vals[3]), "idBottom": max(vals[1], vals[3]),
                       "damper": dia[0], "idInner": dia[1]}
            qa.append(f"p{pno} {pn}: diameters {vals} read as top/bottom OD/ID pairs (beehive printed over two lines); verify")
        else:
            for k, v in zip(layout, dia):
                dia_map[k] = v
    # retainers / seats / comment from the band (and the row line itself)
    rets, seats, comment_words = defaultdict(list), [], []
    for w in sorted(band, key=lambda w: (w["yc"], w["x0"])):
        if id(w) in consumed:
            continue
        t = w["text"]
        # the Comments header word is centred in its column; comment text starts ~45-55 pt left of it
        in_comment_col = comments_x is not None and w["x0"] >= comments_x - 62
        m = R_TOKEN_RE.match(t)
        if m and (comments_x is None or w["x0"] < comments_x - 20):
            rets[m.group(1)[1]].append("PAC-" + m.group(1))
            continue
        m = S_TOKEN_RE.match(t)
        if m and (comments_x is None or w["x0"] < comments_x - 20):
            seats.append("PAC-" + m.group(1))
            continue
        if t in ("NA", "N/A"):
            continue
        if in_comment_col:
            comment_words.append(w)
            continue
        if t == "*" or INT_RE.match(t) or DEC_RE.match(t) or t in ("/", "Yes", "No"):
            continue  # NA cell, wrapped diameter cell (handled above) or a stray numeric
        qa.append(f"p{pno} {pn}: unexpected token '{t}' left of the comments column; ignored")
    comment = " ".join(w["text"] for w in comment_words).strip()
    comment = re.sub(r"\s+", " ", comment)
    return {"pn": pn, "page": pno, "starred": starred, "dia": dia_map, "seatLb": seat, "installedHt": inst,
            "openLb": openlb, "openHt": openht, "rate": rate, "coilBind": coil, "maxLift": lift,
            "retainers": {RETAINER_SERIES_KEY.get(k, k): sorted(set(v)) for k, v in rets.items()},
            "seats": sorted(set(seats)), "comment": comment}


def parse_load_table(lines, i, loads, pno, qa):
    """Lines from the 'Part No. PAC-…' header down to the next break: Mass/Freq/Coil Bind rows and height rows."""
    hdr = lines[i]
    cols, seen_pn = [], set()
    for w in hdr["words"]:
        t = w["text"].lstrip("*")
        if not LOADTBL_PN_RE.match(t):
            continue
        t = re.sub(r"x$", "X", t)
        if t in seen_pn:
            qa.append(f"p{pno} load table: column header {t} printed twice; second column ignored (catalog error)")
            t = t + "#dup"
        seen_pn.add(t)
        cols.append((t, w["xc"]))
    xs = [x for _, x in cols]
    for t, _ in cols:
        loads.setdefault(t, {"loads": {}, "page": pno})
    spacing = min((b - a) for a, b in zip(xs, xs[1:])) if len(xs) > 1 else 50
    for ln in lines[i + 1:]:
        toks = ln["toks"]
        if toks[:2] == ["Part", "No."] or is_table_break(ln):
            break
        label = None
        if toks[0] in ("Mass", "Frequency", "Outer", "Middle", "Inner", "Coil"):
            label = {"Mass": "mass", "Frequency": "freqOuter", "Outer": "freqOuter", "Middle": "freqMiddle",
                     "Inner": "freqInner", "Coil": "coilBindTbl"}[toks[0]]
            vals = [w for w in ln["words"] if INT_RE.match(w["text"]) or DEC_RE.match(w["text"]) or re.fullmatch(r"\d+\.\d", w["text"])]
            vals = [w for w in vals if not (toks[0] == "Mass" and w["text"] == "(g)")]
        elif re.fullmatch(r"\d\.\d{3}", toks[0]):
            heights = [w for w in ln["words"] if re.fullmatch(r"\d\.\d{3}", w["text"]) and w["x0"] < xs[0] - 8 or
                       (re.fullmatch(r"\d\.\d{3}", w["text"]) and any(abs(w["xc"] - x) > spacing * 0.45 for x in xs) and
                        nearest(w["xc"], xs)[1] > spacing * 0.45)]
            hs = {w["text"] for w in heights}
            if len(hs) != 1:
                qa.append(f"p{pno} load table: height row '{ln['text'][:60]}' has heights {sorted(hs)}; skipped")
                continue
            label = toks[0]
            vals = [w for w in ln["words"] if INT_RE.match(w["text"]) and w not in heights]
        else:
            continue
        for w in vals:
            k, d = nearest(w["xc"], xs)
            if d > spacing * 0.6:
                qa.append(f"p{pno} load table: value {w['text']} at x={w['xc']:.0f} not under any part number (row {label}); dropped")
                continue
            pn = cols[k][0]
            v = num(w["text"])
            if label in ("mass", "freqOuter", "freqMiddle", "freqInner", "coilBindTbl"):
                if label in loads[pn] and loads[pn][label] != v:
                    qa.append(f"p{pno} load table: {pn} {label} has two values {loads[pn][label]} / {v}")
                loads[pn][label] = v
            else:
                if label in loads[pn]["loads"] and loads[pn]["loads"][label] != v:
                    qa.append(f"p{pno} load table: {pn} @ {label} has two values {loads[pn]['loads'][label]} / {v}")
                loads[pn]["loads"][label] = v
    for t, _ in cols:
        prune_loads(loads[t]["loads"], t, pno, qa)


def prune_loads(ld, pn, pno, qa):
    """Loads rise steadily as the height falls. A value far from the line through its neighbours is a merged or
    truncated digit string (e.g. '5434' for 434, '10' for 1100); drop the worst offender and repeat."""
    for _ in range(6):
        pts = sorted((float(h), v) for h, v in ld.items())
        if len(pts) < 4:
            return
        # robust straight-line fit (Theil-Sen): load is close to linear in height for a valve spring
        slopes = sorted((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]) for i in range(len(pts)) for j in range(i + 1, len(pts)))
        m = slopes[len(slopes) // 2]
        offs = sorted(v - m * h for h, v in pts)
        b = offs[len(offs) // 2]
        # near free length the real curve flattens towards zero, so only judge points where the line predicts > 60 lb
        bad = [(abs(v - (m * h + b)), h, v, m * h + b) for h, v in pts
               if m * h + b > 60 and abs(v - (m * h + b)) > max(100, 0.3 * abs(m * h + b))]
        if not bad:
            return
        dev, h, v, exp = max(bad)
        key = f"{h:.3f}"
        qa.append(f"p{pno} load table: {pn} @ {key} = {v} is off the load line (~{exp:.0f}); dropped as a merged/truncated digit string")
        del ld[key]


# ----------------------------------------------------------------------------------------------
# page 38 cross reference
# ----------------------------------------------------------------------------------------------
def parse_xref(words, qa):
    """Three make columns; bold group headings (doubled text) and plain sub-labels; PNs listed below each."""
    out = defaultdict(list)  # pn -> [(make, group, sub)]
    cols = {"GM": (0, 190), "Ford": (190, 380), "Dodge": (380, 1000)}
    lines = group_lines(words, tol=2.5)
    for make, (x0, x1) in cols.items():
        group, sub = None, None
        for ln in lines:
            ws = [w for w in ln["words"] if x0 <= w["xc"] < x1]
            if not ws:
                continue
            text = " ".join(w["text"] for w in ws)
            if text in ("GM", "Ford", "Dodge", "Part No.") or "Late Model" in text or "RACING" in text or re.fullmatch(r"\d+", text):
                continue
            pns = [w["text"] for w in ws if re.fullmatch(r"(PAC-)?\d{4}[A-Zx]{0,2}", w["text"])]
            if pns and len(pns) == len(ws):
                for p in pns:
                    p = p.upper()
                    if not p.startswith("PAC-"):
                        p = "PAC-" + p
                    out[p].append((make, group, sub))
                continue
            # heading or sub-label
            if re.fullmatch(r"(GEN [0-9& ]+|INTAKE|EXHAUST|[0-9.\- &A-Z]+LITER)", text):
                sub = text
            else:
                group, sub = text, None
    fams = {}
    for pn, keys in out.items():
        fl = []
        for key in keys:
            f = XREF_FAMS.get(key)
            if f is None:
                qa.append(f"p38 cross reference: no family mapping for heading {key} ({pn})")
                f = [f"{key[1]} (catalog heading)"]
            for x in f:
                if (x, key) not in fl:
                    fl.append((x, key))
        fams[pn] = fl
    return fams


# ----------------------------------------------------------------------------------------------
# kits, retainers, locks, seats
# ----------------------------------------------------------------------------------------------
def parse_kits(words, qa):
    lines = group_lines(words)
    kits, heading = [], None
    for i, ln in enumerate(lines):
        if re.search(r"Series\s*[-–]+\s*", ln["text"]) and "Kit" in ln["text"]:
            heading = ln["text"].strip()
        toks = ln["toks"]
        if not KIT_PN_RE.match(toks[0]):
            continue
        m = re.match(r"^(PAC-KS\d{2}) (\d+) @ (\d\.\d{3}) (\d+) @ (\d\.\d{3}) (\d+) (\d\.\d{3}) (\d\.\d{3,4}) (\S+) (R\d{3}) (S\d{3}X?) (L\d{4}|OE) (Yes|No)\s*(.*)$", ln["text"])
        if not m:
            qa.append(f"p41 kit row not parsed: '{ln['text']}'")
            continue
        comment = m.group(14).strip()
        # wrapped comment on the line above/below without a part number
        for j in (i - 1, i + 1):
            if 0 <= j < len(lines) and not KIT_PN_RE.match(lines[j]["toks"][0]) and lines[j]["words"][0]["x0"] > 400 and not is_header_line(lines[j]):
                if abs(lines[j]["yc"] - ln["yc"]) < 12:
                    comment = (lines[j]["text"] + " " + comment) if j < i else (comment + " " + lines[j]["text"])
        kits.append({"pn": m.group(1), "seatLb": int(m.group(2)), "installedHt": float(m.group(3)), "openLb": int(m.group(4)),
                     "openHt": float(m.group(5)), "rate": int(m.group(6)), "coilBind": float(m.group(7)), "maxLift": float(m.group(8)),
                     "spring": "PAC-" + m.group(9), "retainer": "PAC-" + m.group(10), "seat": "PAC-" + m.group(11),
                     "lock": ("PAC-" + m.group(12)) if m.group(12) != "OE" else "OE", "seals": m.group(13) == "Yes",
                     "comment": re.sub(r"\s+", " ", comment), "heading": heading, "page": KIT_PAGE})
    return kits


def parse_retainers(words, pno, qa):
    lines = group_lines(words)
    rows, style = [], None
    for ln in lines:
        t = ln["text"]
        m = re.match(r"^(Beehive|Dual Spring|Single Spring|Triple Spring|Solid Stop)\b.*(Series|Retainers)$", t)
        if m:
            style = {"Beehive": "beehive", "Dual Spring": "dual", "Single Spring": "single", "Triple Spring": "triple",
                     "Solid Stop": "solid stop"}[m.group(1)]
            continue
        toks = ln["toks"]
        if not RET_PN_RE.match(toks[0]):
            continue
        dia, i = [], 1
        while i < len(toks) and (re.fullmatch(r"\d\.\d{3}", toks[i]) or toks[i] == "NA"):
            dia.append(num(toks[i]) if toks[i] != "NA" else None)
            i += 1
        lock = []
        while i < len(toks) and not re.fullmatch(r"\d{1,2}\.\d", toks[i]):
            lock.append(toks[i])
            i += 1
        if i >= len(toks) or len(dia) < 2:
            qa.append(f"p{pno} retainer row not parsed: '{t}'")
            continue
        weight = num(toks[i])
        comment = " ".join(toks[i + 1:])
        lock_type = " ".join(lock)
        ang = re.findall(r"\d+", lock_type)
        rows.append({"pn": toks[0], "dia": dia, "lockType": lock_type or None, "lockAngle": int(ang[-1]) if ang else None,
                     "weight": weight, "comment": comment, "style": style, "page": pno})
    return rows


LOCK_RE = re.compile(r"^(PAC-LR?\d{4}) (\d+/\d+\"|\d+mm) (?:.*? )??(STD 10|STD 8|STD 7|MINI 8|LS-1|FMOD A|FMOD B) (\d+) (Square|Radius|Triple Radius) "
                     r"(STD|[+-]0?\.\d+|Top Lock) (Titanium|Steel(?: \((?:OE|Oe)\))?)$", re.I)


def parse_locks(words, pno, qa):
    rows = []
    for ln in group_lines(words):
        if not LOCK_PN_RE.match(ln["toks"][0]):
            continue
        m = LOCK_RE.match(ln["text"])
        if not m:
            qa.append(f"p{pno} lock row not parsed: '{ln['text']}'")
            continue
        size = m.group(2)
        if size.endswith("mm"):
            stem = round(int(size[:-2]) / 25.4, 4)
        else:
            a, b = size.rstrip('"').split("/")
            stem = round(int(a) / int(b), 4)
        ih = m.group(6)
        rows.append({"pn": m.group(1), "valveStem": size, "valveStemIn": stem, "lockType": m.group(3).upper().replace("MINI", "MINI"),
                     "lockAngle": int(m.group(4)), "groove": m.group(5).lower(), "installedHtOffset": 0 if ih == "STD" else (num(ih) if ih != "Top Lock" else None),
                     "topLock": ih == "Top Lock", "material": "titanium" if m.group(7).lower().startswith("tit") else "steel",
                     "oe": "(o" in m.group(7).lower(), "lashCapRecess": m.group(1).startswith("PAC-LR"), "page": pno})
    return rows


def parse_seats(words, pno, qa):
    rows, section, thickness = [], None, None
    for ln in group_lines(words):
        t = ln["text"]
        if re.match(r"^(Step Seats|Chome Moly Spring Seats|Chrome Moly Spring Seats|Tool Steel Seats|Spring Shims|SPRING SHIM KITS)", t):
            section = {"Step": "step seat", "Chome": "spring seat", "Chrome": "spring seat", "Tool": "tool steel seat",
                       "Spring": "shim", "SPRING": "shim kit"}[t.split()[0]]
            continue
        toks = ln["toks"]
        if toks[0].startswith("PAC-KS9"):
            m = re.match(r"^(PAC-KS9\d) (\d\.\d{3}) Dia Shim Kit-? \((\d+) pcs total\) (\d\.\d{3}) (S\d{3}) (S\d{3}) (S\d{3}) (S\d{3})$", t)
            if not m:
                qa.append(f"p{pno} shim kit row not parsed: '{t}'")
                continue
            rows.append({"pn": m.group(1), "type": "shim kit", "od": float(m.group(2)), "id": float(m.group(4)), "pieces": int(m.group(3)),
                         "shims": {"0.015": "PAC-" + m.group(5), "0.020": "PAC-" + m.group(6), "0.030": "PAC-" + m.group(7), "0.050": "PAC-" + m.group(8)},
                         "page": pno})
            continue
        if not SEAT_PN_RE.match(toks[0]):
            continue
        vals = []
        i = 1
        while i < len(toks) and (re.fullmatch(r"\d?\.\d{3,4}", toks[i]) or toks[i] == "NA"):
            vals.append(None if toks[i] == "NA" else num(toks[i]))
            i += 1
        rest = toks[i:]
        pn = toks[0]
        if section == "step seat" and len(vals) == 5:
            rows.append({"pn": pn, "type": "step seat", "od": vals[0], "step1": vals[1], "step2": vals[2], "step3": vals[3], "id": vals[4],
                         "forRetainers": ["PAC-" + r.strip(",") for r in rest if re.fullmatch(r"R\d{3},?", r)], "page": pno})
        elif section in ("spring seat", "tool steel seat") and len(vals) == 4:
            spring_id = vals[1]
            if spring_id is not None and spring_id < 0.2:
                qa.append(f"p{pno} {pn}: spring ID printed as '{toks[2]}' (typo); stored null")
                spring_id = None
            rows.append({"pn": pn, "type": section, "od": vals[0], "springId": spring_id, "id": vals[2], "thickness": vals[3],
                         "material": "tool steel" if section == "tool steel seat" or pn.endswith("X") else "chrome moly steel", "page": pno})
        elif section == "shim" and len(vals) == 3:
            rows.append({"pn": pn, "type": "shim", "od": vals[0], "id": vals[1], "thickness": vals[2], "page": pno})
        else:
            qa.append(f"p{pno} seat row not parsed ({section}): '{t}'")
    return rows


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def src(page):
    return {"doc": DOC, "edition": EDITION, "file": "Catalogs/PAC_CATALOG_VOL_24_05.06.24 REVISED ISSUU.pdf", "page": page}


def spring_type(row, layout, group):
    d = row["dia"]
    def val(k):
        return num(d.get(k)) if d.get(k) not in (None, "NA", "Yes", "No") else None
    if not any(val(k) for k in d) and re.search(r"beehive", row["comment"], re.I):
        return "beehive"
    if "odTop" in d or "odBottom" in d:
        if "Conical" in group or re.search(r"conical", row["comment"], re.I):
            return "conical"
        return "beehive"
    if val("idMiddle") is not None and val("idInner") is not None:
        return "triple"
    if row.get("subhead") == "single":
        return "single"
    if val("idInner") is not None:
        return "dual"
    return "single"


def families_for_spring(row, xref, qa):
    fams = []
    for rx, fl in FAM_RULES:
        if rx.search(row["comment"]):
            for f in fl:
                if f not in [x[0] for x in fams]:
                    c = row["comment"]
                    fams.append((f, "catalog comment: " + (c if len(c) <= 70 else c[:67].rsplit(" ", 1)[0] + "...")))
    for f, key in xref.get(row["pn"], []):
        if f not in [x[0] for x in fams]:
            fams.append((f, f"p38 late-model cross reference: {key[0]} {key[1]}" + (f" {key[2]}" if key[2] else "")))
    if row["pn"] == "PAC-D100" and "6.4" in row["comment"]:
        qa.append(f"{row['pn']}: catalog says 'Cummins 5.9/6.4L 24V'; there is no 6.4L Cummins (6.7 probable) - mapped to Cummins 5.9 24V/CR only")
    if not fams:
        return [("Universal", "no engine family stated in the catalog table")]
    return fams


def spring_records(rows, loads, xref, kits, qa):
    recs, seen, coil_diffs = [], {}, []
    by_pn = OrderedDict()
    for r in rows:
        if r["pn"] in by_pn:
            a = by_pn[r["pn"]]
            if (a["seatLb"], a["installedHt"], a["rate"]) != (r["seatLb"], r["installedHt"], r["rate"]):
                qa.append(f"{r['pn']}: listed on p{a['page']} and p{r['page']} with different numbers; p{a['page']} kept")
            else:
                a.setdefault("alsoPages", []).append(r["page"])
            continue
        by_pn[r["pn"]] = r
    for pn, r in by_pn.items():
        series, group, layout = SPRING_PAGES[r["page"]]
        if r.get("seriesGroup"):
            series, group = r["seriesGroup"]
        d = r["dia"]
        def val(k):
            v = d.get(k)
            return num(v) if v not in (None, "NA", "Yes", "No") else None
        typ = spring_type(r, layout, group)
        damper = None
        if "damper" in d:
            damper = True if d["damper"] == "Yes" else (False if d["damper"] in ("No", "NA") else None)
        ld = loads.get(pn, {})
        od = val("od") if "od" in d else val("odBottom")
        id_ = val("id") if "id" in d else val("idBottom")
        if "odTop" in d and "odBottom" in d and val("odTop") and val("odBottom") and val("odTop") > val("odBottom"):
            qa.append(f"{pn}: top OD {val('odTop')} > bottom OD {val('odBottom')}; check column order on p{r['page']}")
        spec = clean({
            "type": typ, "series": series, "group": group,
            "od": od, "id": id_, "odTop": val("odTop"), "idTop": val("idTop"), "idMiddle": val("idMiddle"), "idInner": val("idInner"),
            "installedHt": r["installedHt"], "seatLb": r["seatLb"], "openLb": r["openLb"], "openHt": r["openHt"],
            "rate": r["rate"], "coilBind": r["coilBind"], "maxLift": r["maxLift"],
            "dual": typ in ("dual", "triple"), "triple": True if typ == "triple" else None, "damper": damper,
            "weight": ld.get("mass"), "freqOuter": ld.get("freqOuter"), "freqMiddle": ld.get("freqMiddle"), "freqInner": ld.get("freqInner"),
            "loads": ld.get("loads") or None,
            "retainers": r["retainers"] or None, "seats": r["seats"] or None,
            "application": r["comment"] if r["comment"] and len(r["comment"]) <= 90 else None,
            "lowLoadVersion": True if pn.endswith("L") and re.search(r"Low load", r["comment"], re.I) else None,
            "highLoadVersion": True if pn.endswith("H") and re.search(r"High load", r["comment"], re.I) else None,
            "stockEliminatorOnly": True if r["starred"] else None,
        })
        if r["comment"] and len(r["comment"]) > 90:
            spec["application"] = r["comment"][:87].rsplit(" ", 1)[0] + "..."
        # cross checks between the two tables
        if ld.get("coilBindTbl") is not None and r["coilBind"] is not None and abs(ld["coilBindTbl"] - r["coilBind"]) > 0.0015:
            coil_diffs.append(f"{pn} ({r['coilBind']} / {ld['coilBindTbl']})")
            spec["coilBindLoadTable"] = ld["coilBindTbl"]
        if ld.get("loads") and r["installedHt"] is not None:
            key = f"{r['installedHt']:.3f}"
            if key in ld["loads"] and r["seatLb"] is not None and abs(ld["loads"][key] - r["seatLb"]) > max(6, 0.04 * r["seatLb"]):
                qa.append(f"{pn}: seat load {r['seatLb']} @ {key} in the spec row but the load table says {ld['loads'][key]}")
        if r["installedHt"] is not None and r["coilBind"] is not None and r["maxLift"] is not None and r["installedHt"] - r["coilBind"] + 0.0005 < r["maxLift"]:
            qa.append(f"{pn}: max lift {r['maxLift']} exceeds installed height - coil bind ({r['installedHt'] - r['coilBind']:.3f})")
        name = f"{typ} valve spring, {od} OD, {r['installedHt']} installed" if od else f"{typ} valve spring, {r['installedHt']} installed"
        fams = families_for_spring(r, xref, qa)
        pages = [r["page"]] + r.get("alsoPages", [])
        for fam, note in fams:
            rec = {"m": BRAND, "p": pn, "cat": "spring", "name": name,
                   "fit": clean({"fam": fam, "notes": note}),
                   "spec": spec, "src": src(r["page"]), "emissions": None}
            if len(pages) > 1:
                rec["src"]["alsoPages"] = pages[1:]
            recs.append(rec)
        seen[pn] = True
    if coil_diffs:
        qa.append(f"coil bind differs between the spec row and the load table (spec row / table; spec row kept in coilBind, table value in "
                  f"coilBindLoadTable) for {len(coil_diffs)} springs: " + ", ".join(coil_diffs))
    # springs that only appear in the p38 cross reference or in a kit row
    kit_by_spring = {}
    for k in kits:
        kit_by_spring.setdefault(k["spring"], k)
    for pn, fl in xref.items():
        if pn in seen:
            continue
        k = kit_by_spring.get(pn)
        spec = {}
        if k:
            spec = clean({"installedHt": k["installedHt"], "seatLb": k["seatLb"], "openLb": k["openLb"], "openHt": k["openHt"],
                          "rate": k["rate"], "coilBind": k["coilBind"], "maxLift": k["maxLift"],
                          "specSource": f"spring kit {k['pn']} row on p41 (no spring table row in this catalog)"})
        qa.append(f"{pn}: listed only on the p38 cross reference" + (f"; loads taken from kit {k['pn']}" if k else "; no specifications in this catalog"))
        for fam, key in fl:
            recs.append({"m": BRAND, "p": pn, "cat": "spring", "name": f"valve spring {pn} (cross reference only)",
                         "fit": {"fam": fam, "notes": f"p38 late-model cross reference: {key[0]} {key[1]}" + (f" {key[2]}" if key[2] else "")},
                         "spec": spec, "src": src(XREF_PAGE), "emissions": None})
        seen[pn] = True
    for pn, k in kit_by_spring.items():
        if pn in seen:
            continue
        if "Harley" in k["comment"]:
            continue
        qa.append(f"{pn}: spring appears only inside kit {k['pn']} (p41); emitted with the kit's loads")
        recs.append({"m": BRAND, "p": pn, "cat": "spring", "name": f"valve spring {pn} (from kit {k['pn']})",
                     "fit": {"fam": "GM LS" if "LS" in k["comment"] else "Universal", "notes": f"kit comment: {k['comment'][:60]}"},
                     "spec": clean({"installedHt": k["installedHt"], "seatLb": k["seatLb"], "openLb": k["openLb"], "openHt": k["openHt"],
                                    "rate": k["rate"], "coilBind": k["coilBind"], "maxLift": k["maxLift"],
                                    "specSource": f"spring kit {k['pn']} row on p41"}),
                     "src": src(KIT_PAGE), "emissions": None})
        seen[pn] = True
    return recs


def kit_records(kits, qa, skipped):
    recs, seen = [], set()
    for k in kits:
        if k["pn"] in seen:
            qa.append(f"{k['pn']}: kit listed twice on p41 (second time under '{k['heading']}'); first row kept")
            continue
        seen.add(k["pn"])
        if "Harley" in k["comment"]:
            skipped.append(f"{k['pn']}: Harley-Davidson kit (motorcycle), out of scope")
            continue
        typ = "beehive" if "Beehive" in (k["heading"] or "") and k["spring"] not in ("PAC-1204X", "PAC-1205X") else "dual"
        fam = "GM LS" if "LS" in k["comment"] else "Universal"
        spec = clean({"type": "kit", "springType": typ, "installedHt": k["installedHt"], "seatLb": k["seatLb"], "openLb": k["openLb"],
                      "openHt": k["openHt"], "rate": k["rate"], "coilBind": k["coilBind"], "maxLift": k["maxLift"],
                      "dual": typ == "dual",
                      "kit": clean({"spring": k["spring"], "retainer": k["retainer"], "seat": k["seat"], "lock": k["lock"], "seals": k["seals"]}),
                      "aftermarketHeads": True if "Aftermarket" in k["comment"] else None,
                      "series": (k["heading"] or "").split(" Series")[0] or None,
                      "application": k["comment"][:90] if k["comment"] else None})
        recs.append({"m": BRAND, "p": k["pn"], "cat": "spring", "name": f"{typ} valve spring kit ({k['spring']} + retainers, seats, locks)",
                     "fit": {"fam": fam, "notes": f"kit comment: {k['comment'][:80]}"}, "spec": spec, "src": src(KIT_PAGE), "emissions": None})
    return recs


def retainer_records(rows, qa):
    recs = []
    for r in rows:
        series = r["pn"][5]
        fits = ["PAC-" + x for x in re.findall(r"\b(1\d{3}[A-Zx]?)\b", r["comment"])]
        dia = r["dia"] + [None] * (4 - len(r["dia"]))
        spec = clean({
            "type": "retainer", "style": r["style"], "series": series + "00", "material": RETAINER_MATERIAL.get(series),
            "od": dia[0], "diaB": dia[1], "diaC": dia[2], "diaD": dia[3],
            "lockType": r["lockType"], "lockAngle": r["lockAngle"], "weight": r["weight"],
            "fitsSprings": fits or None,
            "note": r["comment"] if r["comment"] and not fits else None,
        })
        if r["lockType"] and re.search(r"HEMI|Godzilla|MC-7|FMOD|LS", r["lockType"]):
            spec["lockTypeNote"] = "engine-specific lock cone"
        fam, note = "Universal", "retainer; fitment is by spring part number"
        if re.search(r"Mini Cooper", r["comment"]):
            fam, note = "Mini Cooper Gen 2 (catalog heading)", r["comment"]
        elif re.search(r"v-rod", r["comment"], re.I):
            fam, note = "Harley V-Rod (catalog heading)", r["comment"]
        elif "Godzilla" in (r["lockType"] or ""):
            fam, note = "Ford Godzilla 7.3", r["comment"]
        elif "HEMI" in (r["lockType"] or ""):
            fam, note = "Chrysler Gen III Hemi 6.2/6.4", r["comment"]
        name = f"{r['style'] or ''} spring retainer, {RETAINER_MATERIAL.get(series)}, {dia[0]} OD".strip()
        recs.append({"m": BRAND, "p": r["pn"], "cat": "retainer", "name": name, "fit": {"fam": fam, "notes": note},
                     "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs


def lock_records(rows):
    recs = []
    for r in rows:
        spec = clean({"type": "lock", "valveStem": r["valveStem"], "valveStemIn": r["valveStemIn"], "lockType": r["lockType"],
                      "lockAngle": r["lockAngle"], "groove": r["groove"], "installedHtOffset": r["installedHtOffset"],
                      "topLock": True if r["topLock"] else None, "material": r["material"], "oeStyle": True if r["oe"] else None,
                      "lashCapRecess": True if r["lashCapRecess"] else None})
        off = "std height" if r["installedHtOffset"] == 0 else ("top lock" if r["topLock"] else f"{r['installedHtOffset']:+.3f} height")
        fam = "GM LS" if r["lockType"] == "LS-1" else ("Ford Modular" if r["lockType"].startswith("FMOD") else "Universal")
        recs.append({"m": BRAND, "p": r["pn"], "cat": "retainer",
                     "name": f"valve lock, {r['valveStem']} stem, {r['lockType']} {r['lockAngle']} deg, {r['groove']} groove, {off}, {r['material']}",
                     "fit": {"fam": fam, "notes": "valve lock; fitment is by stem size and retainer cone"},
                     "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs


def seat_records(rows):
    recs = []
    for r in rows:
        spec = {k: v for k, v in r.items() if k not in ("pn", "page")}
        spec = clean(spec)
        if r["type"] == "step seat":
            name = f"step spring seat, {r['od']} OD, {r['id']} ID"
        elif r["type"] in ("spring seat", "tool steel seat"):
            name = f"{r['material']} spring seat, {r['od']} OD, {r['springId']} spring ID, {r['thickness']} thick" if r.get("springId") else \
                f"{r['material']} spring seat, {r['od']} OD, {r['thickness']} thick"
        elif r["type"] == "shim":
            name = f"spring shim, {r['od']} OD, {r['id']} ID, {r['thickness']} thick"
        else:
            name = f"spring shim kit, {r['od']} OD, {r['id']} ID, {r['pieces']} pcs"
        recs.append({"m": BRAND, "p": r["pn"], "cat": "retainer", "name": name,
                     "fit": {"fam": "Universal", "notes": "spring seat/shim; fitment is by spring and guide diameter"},
                     "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs


# ----------------------------------------------------------------------------------------------
# validate / notes
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("coilBindLoadTable", "od", "id", "odTop", "idTop", "idMiddle", "idInner", "installedHt", "coilBind", "seatLb", "openLb", "openHt", "rate",
                "maxLift", "weight", "freqOuter", "freqMiddle", "freqInner", "diaB", "diaC", "diaD", "lockAngle", "valveStemIn",
                "installedHtOffset", "springId", "thickness", "step1", "step2", "step3", "pieces")


def validate(records):
    errs, seen = [], set()
    for rec in records:
        for k in ("m", "p", "cat", "src"):
            if not rec.get(k):
                errs.append(f"{rec.get('p')}: missing {k}")
        if not rec.get("fit", {}).get("fam"):
            errs.append(f"{rec.get('p')}: missing fit.fam")
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
        loads = rec["spec"].get("loads")
        if loads is not None and (not isinstance(loads, dict) or not all(isinstance(v, (int, float)) for v in loads.values())):
            errs.append(f"{rec['p']}: spec.loads malformed")
    return errs


def write_notes(path, pdf_path, npages, records, spring_rows, loads, kits, rets, locks, seats, skipped, qa, errs):
    by_cat = Counter(r["cat"] for r in records)
    by_fam = Counter(r["fit"]["fam"] for r in records)
    by_type = Counter((r["cat"], r["spec"].get("type")) for r in records)
    by_page = Counter(r["page"] for r in spring_rows)
    uniq = len({r["p"] for r in records})
    cov = Counter()
    springs = [r for r in records if r["cat"] == "spring" and r["spec"].get("type") != "kit"]
    for r in springs:
        for k in ("od", "id", "installedHt", "seatLb", "openLb", "rate", "coilBind", "maxLift", "loads", "retainers", "weight"):
            if r["spec"].get(k) is not None:
                cov[k] += 1
    L = []
    L.append("# PAC Racing Springs - extraction notes\n")
    L.append(f"Source: `{os.path.relpath(pdf_path, os.path.dirname(os.path.dirname(BASE)))}` ({npages} pages, catalog Vol. 24, revised 2024-05-06; "
             "saved by hand under `Catalogs/`, no network used). Printed page numbers match PDF page numbers.\n")
    L.append(f"Records: {len(records)} ({uniq} unique part numbers; a part listed for several engine families is repeated once per family).\n")
    L.append("## Counts\n")
    L.append("| cat | records |\n|---|---|")
    for c, n in sorted(by_cat.items()):
        L.append(f"| {c} | {n} |")
    L.append("\n| cat / spec.type | records |\n|---|---|")
    for (c, t), n in sorted(by_type.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        L.append(f"| {c} / {t} | {n} |")
    L.append("\n| fit.fam | records |\n|---|---|")
    for f, n in sorted(by_fam.items(), key=lambda x: -x[1]):
        L.append(f"| {f} | {n} |")
    L.append("\n### Spring table rows per page\n")
    L.append("| page | series / group | rows |\n|---|---|---|")
    for p in sorted(by_page):
        L.append(f"| {p} | {SPRING_PAGES[p][0]} {SPRING_PAGES[p][1]} | {by_page[p]} |")
    L.append(f"\nLoad-vs-height tables parsed for {len(loads)} part numbers; kits {len(kits)} rows; retainers {len(rets)}; locks {len(locks)}; seats/shims {len(seats)}.\n")
    L.append("### Spec coverage (springs with a table row)\n")
    L.append("| key | springs with value | of |\n|---|---|---|")
    for k in ("od", "id", "installedHt", "seatLb", "openLb", "rate", "coilBind", "maxLift", "loads", "retainers", "weight"):
        L.append(f"| {k} | {cov[k]} | {len(springs)} |")
    L.append("\n## Method\n")
    L.append("- Spring tables: one text row per spring (`PN  diameters  seat @ installed  open @ open-height  [PN]  rate  coil bind  max lift  "
             "retainers  seats  comment`). Diameter columns differ per page and are mapped by a per-page layout table in the script; "
             "wrapped retainer lists and comments are collected from the band between neighbouring rows, split at the x of the `Comments` header.")
    L.append("- Load tables (`Spring loads and heights`): one column per part number; each value is assigned to the nearest part-number "
             "column by x-position. Mass and natural frequency rows are kept (`weight`, `freqOuter/Middle/Inner`). Coil bind and the "
             "seat load at installed height are cross-checked against the spec row (differences are listed below).")
    L.append("- `maxLift` is PAC's own published value (not computed). `dual` is true for dual and triple springs; `damper` only where "
             "the page has a Damper column. Beehive/conical springs store the large end as `od`/`id` and the small end as `odTop`/`idTop`.")
    L.append("- Fitment: `Universal` unless the row comment names an engine or the p38 late-model cross reference lists the spring. "
             "Comment text is kept short in `spec.application`.")
    L.append("- Retainers: `cat: retainer`, `spec.type: retainer`; locks `spec.type: lock`; seats/shims `spec.type: step seat | spring seat | "
             "tool steel seat | shim | shim kit`. Retainer `fitsSprings` is PAC's own 'Fits 1211, 1215 ...' list.")
    L.append("- Spring kits (p41): `cat: spring`, `spec.type: kit`, component part numbers under `spec.kit`.\n")
    L.append("## Skipped\n")
    for s in skipped:
        L.append(f"- {s}")
    L.append("- p40 motorcycle springs (PAC-MX1xx/MX2xx, 12 rows): powersports, out of scope.")
    L.append("- p52 valvetrain tools (installed height gauges, calibration springs), p53-56 terms and order forms.")
    L.append("- Unknown-family headings kept verbatim in `fit.fam` with '(catalog heading)': see the family table above.\n")
    L.append(f"## QA ({len(qa)} notes)\n")
    for q in qa:
        L.append(f"- {q}")
    L.append(f"\n## Validation\n")
    L.append("- OK: no duplicate part numbers within a family, all records have m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings."
             if not errs else "\n".join(f"- ERROR: {e}" for e in errs))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    qa, skipped = [], []
    spring_rows, loads = [], {}
    kits, rets, locks, seats = [], [], [], []
    xref = {}
    with pdfplumber.open(args.pdf) as pdf:
        npages = len(pdf.pages)
        for pno in sorted(set(SPRING_PAGES) | {XREF_PAGE, KIT_PAGE} | set(RETAINER_PAGES) | set(LOCK_PAGES) | set(SEAT_PAGES)):
            words = page_words(pdf.pages[pno - 1])
            if pno in SPRING_PAGES:
                rows, ld = parse_spring_page(words, pno, SPRING_PAGES[pno][2], qa)
                spring_rows.extend(rows)
                for k, v in ld.items():
                    if k in loads and v["loads"] and loads[k]["loads"] and v["loads"] != loads[k]["loads"]:
                        qa.append(f"{k}: load table repeated on p{loads[k]['page']} and p{pno} with different values; p{loads[k]['page']} kept")
                        continue
                    if k in loads:
                        for kk, vv in v.items():
                            if kk != "loads" and kk not in loads[k]:
                                loads[k][kk] = vv
                        continue
                    loads[k] = v
            elif pno == XREF_PAGE:
                xref = parse_xref(words, qa)
            elif pno == KIT_PAGE:
                kits = parse_kits(words, qa)
            elif pno in RETAINER_PAGES:
                rets.extend(parse_retainers(words, pno, qa))
            elif pno in LOCK_PAGES:
                locks.extend(parse_locks(words, pno, qa))
            elif pno in SEAT_PAGES:
                seats.extend(parse_seats(words, pno, qa))
    records = []
    records += spring_records(spring_rows, loads, xref, kits, qa)
    records += kit_records(kits, qa, skipped)
    records += retainer_records(rets, qa)
    records += lock_records(locks)
    records += seat_records(seats)
    # load-table part numbers with no spec row
    table_only = sorted(k for k in set(loads) - {r["pn"] for r in spring_rows} if "#dup" not in k)
    for pn in table_only:
        qa.append(f"{pn}: appears in a load table (p{loads[pn]['page']}) but has no spec row")
    # the right-hand page of a spread repeats the left page's load table: keep one note per finding
    seen_qa, deduped = set(), []
    for q in qa:
        key = re.sub(r"^p\d+ ", "", q)
        if key not in seen_qa:
            seen_qa.add(key)
            deduped.append(q)
    qa = deduped
    errs = validate(records)
    os.makedirs(OUT, exist_ok=True)
    out = {"source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": os.path.basename(args.pdf), "pages": npages,
                      "note": "manual PDF under Catalogs/; pacracingsprings.com blocks fetchers"},
           "extracted": dt.date.today().isoformat(), "count": len(records), "parts": records}
    with open(os.path.join(OUT, "pac.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "pac.md"), args.pdf, npages, records, spring_rows, loads, kits, rets, locks, seats, skipped, qa, errs)
    print(f"{len(records)} records ({len({r['p'] for r in records})} unique PNs); springs {len(spring_rows)} rows, load tables {len(loads)}, "
          f"kits {len(kits)}, retainers {len(rets)}, locks {len(locks)}, seats {len(seats)}; QA {len(qa)}; errors {len(errs)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
