#!/usr/bin/env python3
"""Parts catalog: DART task (manual PDF, no network).

    python -X utf8 -I scripts/parts-catalog/extract_dart.py [--pdf <path>] [--debug]

Source: `Catalogs/DART VOLUME 23 - ISSUU - small.pdf` (Dart Machinery catalog Volume 23, 2023,
126 pages, text layer), saved by hand by the owner because dartheads.com blocks fetchers.
Writes out/dart.json and out/dart.md and nothing else.

Layout (pdfplumber words, x/y positions):
  * Head pages (27-42 SBC, 54-60 LS, 70-89 BBC, 98-103 SBF) carry one or more small tables in a
    left band: a series heading (`PRO1 23° 200cc - ALUMINUM (Straight Plug Heads) - 2.020”/1.600”
    VALVES`), optional chamber sub-heading (`64cc COMBUSTION CHAMBERS`), a header
    (`PART NO. CONFIGURATION FOR USE MAX. LIFT [CHAMBER CC]`) and rows
    (`11321112P 1.437” Dual Springs for Hydraulic Roller or Solid Flat Tappet Cam .650” [64]`).
    A right-hand sidebar (SPECS box, FLOW DATA @ 28" table, recommended manifolds) shares the
    same y positions, so every line is cut at the first sidebar-signature word (a `Key:` label,
    `SPECS`, `FLOW`, a flow row, a manifold part number...) and the rest is parsed as table text.
  * Block pages (14, 17-26, 46-53, 64-69, 94-97): `PART NO. DESCRIPTION [CAM LOC.] [CAM]
    [REAR SEAL] CAPS MAINS DECK BORE` rows; max bore, material, lifter bores etc. come from the
    page's SPECS box.
  * Intake pages (43, 61, 90, 104): `PART NO [USE WITH HEADS|DESCRIPTION] PORT ... DECK CARB` rows.
Short blocks, top-end kits, crankshafts, accessories and service parts are not extracted.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "DART VOLUME 23 - ISSUU - small.pdf")
OUT = os.path.join(HERE, "out")
BRAND = "Dart"
EDITION = "2023"
DOC = "Dart Machinery catalog Volume 23 (2023)"
SRC_FILE = "Catalogs/DART VOLUME 23 - ISSUU - small.pdf"
EXPECTED_PAGES = 126

FAM_SBC = "Small-block Chevy"
FAM_SBC45 = "Chevy 4.500 bore spacing small block"
FAM_LS = "GM LS"
FAM_BBC = ["Chevy Mark IV big block", "Chevy Gen VI big block"]
FAM_BB50 = "Chevy 5.0 bore spacing big block"
FAM_BB81 = "Chevy Gen VII 8.1L big block"
FAM_SBF = "Small-block Ford (Windsor)"
FAM_HEMI_EARLY = "Chrysler Gen III Hemi 5.7/6.1"
FAM_HEMI_LATE = "Chrysler Gen III Hemi 6.2/6.4"
KNOWN_FAMS = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
    "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
}

HEAD_PAGES = list(range(27, 43)) + list(range(54, 61)) + list(range(70, 90)) + list(range(98, 104))
BLOCK_PAGES = [14] + list(range(17, 27)) + list(range(46, 54)) + list(range(64, 70)) + list(range(94, 98))
INTAKE_PAGES = [43, 61, 90, 104]

# cam journal designations -> bore (inches). Standard dimensions, not printed in the catalog.
CAM_BORE = {"SBC": 1.869, "BBC": 1.949, "50mm": 1.969, "55mm": 2.165, "LS 55mm": 2.165}
# main bearing designations -> journal (inches). Printed on p49 (LS 2.560 / Ford 2.750) and p95
# (302 2.249 / 351C 2.749); SBC 350/400 and BBC are the standard sizes.
MAIN_JOURNAL = {"350": 2.449, "400": 2.649, "302": 2.249, "351C": 2.749, "LS": 2.559, "BBC": 2.749}

LIFT_RE = re.compile(r"^1?\.\d{3}[\"”]$")
INCH_RE = re.compile(r"^(\d{1,2}\.\d{3})[\"”]$")
PN_RE = re.compile(r"^\d{6,9}[A-Z0-9-]*$")
SIDEBAR_WORDS = {"SPECIFICATIONS", "SPECS", "FLOW", "RECOMMENDED", "QUICK", "FEATURES", "UPGRADE", "DART"}
# vertical tab labels printed mirrored down the page edge
TAB_WORDS = {"TELLIB", "®IMEH", "FBS", "CBB", "SL", "CBS", "SSECCA", "SDLOFINAM", "SDAEH", "SKCOLB", "STIK", "DNE",
             "POT", "TROHS", "TFAHSKNARC"}
HEADING_START = re.compile(r"^(PRO1|PRO2|SHP|RACE SERIES|IRON EAGLE|BIG CHIEF|FULL PORT)\b")
VALVES_RE = re.compile(r"(\d\.\d{3})[\"”]\s*/?\s*(\d\.\d{3})[\"”]")


# ------------------------------------------------------------------------------------------ text
def num(s):
    s = s.replace("”", "").replace("\"", "").replace("“", "").strip()
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return None


def clean_text(s):
    s = s.replace("’", "'").replace("“", "\"").replace("”", "\"")
    s = re.sub(r"P\+A\d+:I\d+ORT", "PORT", s)        # p38 spreadsheet artefact "FULL P+A34:I62ORT"
    s = s.replace("Ductlile", "Ductile")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def page_lines(page):
    words = page.extract_words(x_tolerance=3, y_tolerance=3)
    words.sort(key=lambda w: (w["top"], w["x0"]))
    lines = []
    for w in words:
        if lines and abs(lines[-1]["top"] - w["top"]) <= 3:
            lines[-1]["words"].append(w)
        else:
            lines.append({"top": w["top"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
    return lines


def repair(words):
    """Re-join tokens the text layer split by letter spacing: `18 17 503 0` (part number),
    `1.4 3 7 ”` (spring), `.8 50"` (lift), `8 7` (chamber cc), `D ual` (word)."""
    out = []
    for w in words:
        if out:
            p = out[-1]
            gap = w["x0"] - p["x1"]
            pt, wt = p["text"], w["text"]
            merge = False
            if gap <= 5.5:
                if re.fullmatch(r"\d+", pt) and re.fullmatch(r"\d+[A-Z]*", wt):
                    merge = True
                elif re.fullmatch(r"\d*\.\d+", pt) and re.fullmatch(r"\d+[\"”]?", wt):
                    merge = True
                elif re.fullmatch(r"\d*\.\d+", pt) and wt in ("”", "\""):
                    merge = True
            if gap <= 7 and re.fullmatch(r"[A-Z]", pt) and re.fullmatch(r"[a-z]+", wt):
                merge = True
            if merge:
                p["text"] = pt + wt
                p["x1"] = w["x1"]
                continue
        out.append(dict(w))
    return out


def text_of(words):
    return clean_text(" ".join(w["text"] for w in words))


def is_flow_start(ws, i):
    """Word i starts a `lift cfm cfm` sequence."""
    if not LIFT_RE.fullmatch(ws[i]["text"]):
        return False
    n = 0
    for j in range(i + 1, min(i + 4, len(ws))):
        if re.fullmatch(r"\d{2,3}", ws[j]["text"]) and ws[j]["x0"] - ws[j - 1]["x1"] < 60:
            n += 1
        else:
            break
    return n >= 2


def band_words(ws, band_left, band_max, header_right):
    """The table-band part of one line: from the part-number column up to the first sidebar
    signature (a `Key:` label, SPECS, FLOW, a flow row, a manifold part number, a big gap right
    of the table) or band_max."""
    out = []
    for i, w in enumerate(ws):
        t = w["text"]
        if w["x0"] < band_left or t in TAB_WORDS:
            continue
        if w["x0"] >= band_max:
            break
        if out:
            if t.endswith(":") or t.endswith("SPECS") or t in SIDEBAR_WORDS:
                break
            if is_flow_start(ws, i):
                break
            if t == "LIFT" and i + 1 < len(ws) and ws[i + 1]["text"] == "INTAKE":
                break
            if re.fullmatch(r"4[1-5]\d{6}", t):
                break
            if w["x0"] > header_right and w["x0"] - out[-1]["x1"] > 15:
                break
        out.append(w)
    return out


def page_spec(text, key, wrap=False):
    """Value of a `Key: value` line in the SPECS box (the colon is required so prose such as
    'rolled valve angle' never matches; the value may wrap to the next line for Material)."""
    m = re.search(re.escape(key) + r"s?\s*:\s*([^\n]*)", text, re.I)
    if not m:
        return None
    val = m.group(1).strip()
    if wrap:
        nxt = text[m.end():m.end() + 80].split("\n")
        if len(nxt) > 1 and nxt[1] and not re.search(r"[A-Za-z ]+:", nxt[1]) and len(val) < 40:
            val = (val + " " + nxt[1].strip()).strip()
    return val


def material_of(text):
    val = page_spec(text, "Material", wrap=True) or ""
    low = val.lower()
    if "grey iron" in low or "gray iron" in low or "class 30" in low:
        return "class 30 grey iron"
    if "220 bhn" in low:
        return "220 BHN cast iron"
    if "iron" in low:
        return "cast iron"
    if "rmr" in low or "alum" in low:
        return "RMR cast aluminum"
    return None


# ------------------------------------------------------------------------------------- families
def page_family(pno):
    if pno == 14:
        return "hemi"
    if 15 <= pno <= 44:
        return "sbc"
    if 45 <= pno <= 62:
        return "ls"
    if 63 <= pno <= 91:
        return "bbc"
    if 92 <= pno <= 105:
        return "sbf"
    return None


def band_of(lines, header_pred, last_header_word):
    """(band_left, band_max, header_right, headers): the table band runs from the part-number column
    to the last header word; lines are read up to 60 pt right of that (cut earlier by band_words)."""
    headers = []
    for ln in lines:
        txt = [w["text"] for w in ln["words"]]
        if header_pred(txt):
            headers.append(ln)
    if not headers:
        return None
    part_x0 = min(next(w["x0"] for w in h["words"] if w["text"] == "PART") for h in headers)
    rights = []
    for h in headers:
        ws = [w for w in h["words"] if w["x0"] >= part_x0 - 2]
        idx = None
        for i, w in enumerate(ws):
            if last_header_word(ws, i):
                idx = i
                break
        rights.append(ws[idx]["x1"] if idx is not None else ws[-1]["x1"])
    header_right = max(rights)
    return max(part_x0 - 24, 28), header_right + 60, header_right, headers


# ---------------------------------------------------------------------------------------- heads
def is_head_header(txt):
    return "PART" in txt and "CONFIGURATION" in txt


def head_last_word(ws, i):
    t = ws[i]["text"]
    if t == "CC" and i > 0 and ws[i - 1]["text"].endswith("CHAMBER"):
        return True
    if t == "SPACING":
        return True
    if t == "LIFT" and i > 0 and ws[i - 1]["text"] == "MAX.":
        return not any(w["text"].startswith("CHAMBER") for w in ws[i + 1:i + 3])
    return False


def series_name(txt):
    s = re.split(r" - | \(|\s\d\.\d{3}\"", txt)[0]
    s = s.replace("IRON EAGLE", "Iron Eagle")
    s = re.sub(r"\b(ALUMINUM|CAST IRON|IRON)\b", "", s)
    s = re.sub(r"\s+", " ", s).strip(" -")
    s = s.title()
    for a, b in (("Pro1", "PRO1"), ("Pro2", "PRO2"), ("Shp", "SHP"), ("Ls", "LS"), ("Cnc", "CNC"), ("Std", "STD"),
                 ("Lg", "LG"), ("Mmr", "MMR"), ("Bs", "BS"), ("20X", "20X"), ("Merc Style", "Merc style")):
        s = s.replace(a, b)
    s = re.sub(r"(\d)Cc\b", r"\1cc", s)
    return s


def parse_heading(txt):
    """Series heading -> dict of attributes (also used for chamber sub-headings)."""
    h = {"text": txt}
    m = VALVES_RE.search(txt)
    if m:
        h["iv"], h["ev"] = float(m.group(1)), float(m.group(2))
    m = re.search(r"\(w/\s*(\d\.\d{3})\"?\s*Intake Valve\)", txt)
    if m:
        h["iv"] = float(m.group(1))
    m = re.search(r"\b(\d{2,3})\s*[cC][cC]\b", txt)
    if m:
        h["runner"] = int(m.group(1))
    m = re.search(r"(\d{1,2}(?:\.\d)?)°", txt)
    if m:
        h["angle"] = float(m.group(1))
    if "CNC" in txt and "No Porting" not in txt:
        h["cnc"] = True
    if "ALUMINUM" in txt:
        h["material"] = "RMR cast aluminum"
    elif "IRON" in txt:
        h["material"] = "cast iron"
    if re.search(r"Straight Plug", txt, re.I):
        h["plug"] = "straight"
    elif re.search(r"Angle Plug", txt, re.I):
        h["plug"] = "angle"
    for key, val in (("CATHEDRAL", "cathedral"), ("RECTANGLE", "rectangle"), ("OVAL", "oval")):
        if key in txt:
            h["port"] = val
    if re.search(r"\bMARINE\b", txt, re.I):
        h["marine"] = True
    m = re.search(r"(\d)\s*BOLT CASTING", txt)
    if m:
        h["bolts"] = int(m.group(1))
    m = re.search(r"(\d\.\d{3})\"?\s*BORE(?: CHAMBER)?", txt)
    if m and "BORE SPACE" not in txt:
        h["chamberBore"] = float(m.group(1))
    m = re.search(r"(\d\.\d{3})\"?\s*BORE SPACE", txt)
    if m:
        h["boreSpacing"] = float(m.group(1))
    if "SOLID CASTING" in txt:
        h["casting"] = "solid"
    elif "WATER CASTING" in txt:
        h["casting"] = "water"
    if "SMC" in txt:
        h["smc"] = True
    m = re.search(r"\b([AB]) PORT EXHAUST", txt)
    if m:
        h["exhPattern"] = m.group(1)
    m = re.search(r"\((\d{2})-(\d{2}) ([^)]*)\)", txt)
    if m:
        face = m.group(3)
        if "Vortec" in face:
            h["intakeFace"] = "Vortec (96-99)"
        elif "Late Model" in face:
            h["intakeFace"] = "late model center-bolt (87-95)"
        else:
            h["intakeFace"] = "standard (55-86)"
        if "Self-Aligning" in face:
            h["selfAligningRockers"] = True
    if "MERC STYLE" in txt:
        h["merc"] = True
    if "LS7" in txt:
        h["lsStyle"] = "LS7"
    elif "LS3" in txt:
        h["lsStyle"] = "LS3"
    elif "LS1" in txt:
        h["lsStyle"] = "LS1"
    h["series"] = series_name(txt)
    return h


def parse_head_row(words, cols):
    first = words[0]["text"]
    m = re.match(r"^(\d{8})(Bare.*|C-Core.*|\d\.\d{3}[”\"].*)$", first)     # `11010020Bare`, `110111221.290”`
    if m:
        first = m.group(1)
        extra = dict(words[0])
        extra["text"] = m.group(2)
        extra["x0"] = words[0]["x0"] + 30
        words = [words[0]] + [extra] + words[1:]
    pn = first
    desc, lift, cc = [], None, None
    for w in words[1:]:
        t = w["text"]
        inzone = cols["max_x0"] is not None and w["x0"] >= cols["max_x0"] - 12
        if inzone and LIFT_RE.fullmatch(t):
            lift = num(t)
        elif inzone and re.fullmatch(r"\d{2,3}", t):
            cc = int(t)
        elif inzone and t in ("-", "call"):
            if t == "call":
                cc = "call"
        elif lift is not None or cc is not None:
            break               # anything right of the lift/chamber columns is sidebar text
        else:
            desc.append(t)
    return pn, clean_text(" ".join(desc)), lift, cc


def parse_config(desc):
    """`1.437" Dual Springs for Hydraulic Roller or Solid Flat Tappet Cam` -> spring/cam facts."""
    c = {}
    d = desc
    if re.match(r"^Bare [Hh]ead", d):
        c["bare"] = True
    m = re.match(r"^(\d\.\d{3})\"\s*(Single|Dual|Triple|Beehive)?\s*(?:Springs?)?", d)
    if m:
        c["springDia"] = float(m.group(1))
        if m.group(2):
            c["springType"] = m.group(2).lower()
        c["bare"] = False
    low = d.lower()
    types = []
    if "hydraulic flat tappet" in low:
        types.append("hydraulic_flat")
    if "hydraulic roller" in low:
        types.append("hydraulic_roller")
    if "solid flat tappet" in low:
        types.append("solid_flat")
    if "solid roller" in low:
        types.append("solid_roller")
    if types:
        c["camType"] = types[0]
        if len(types) > 1:
            c["camTypes"] = types
    m = re.search(r"(?:Bare [Hh]ead|Cam|Roller|Casting)\s*-\s*(.+)$", d)
    if m:
        c["variant"] = m.group(1).strip()
    elif re.match(r"^Bare [Hh]ead\s+(w/.+|\(.+)$", d):
        c["variant"] = re.match(r"^Bare [Hh]ead\s+(.+)$", d).group(1)
    m = re.search(r"\((Dart|Jesel) Rocker Bar Machining\)", d)
    if m:
        c["rockerBar"] = m.group(1)
    solid = bool(re.search(r"\bSolid\b$", d) or "- Solid" in d)
    if "C-Core" in d or "C Core" in d or re.search(r"\bcasting\b", d, re.I):
        c["casting"] = "C-core solid" if solid else "C-core"
        c["bare"] = True
    elif "No Porting" in d:
        c["casting"] = "unported"
    elif solid:
        c["casting"] = "solid"
    if "Titanium Valves" in d:
        c["valveMaterial"] = "titanium"
    elif "Stainless Valves" in d:
        c["valveMaterial"] = "stainless"
    if "Steel guides" in d or "steel guides" in d:
        c["steelGuides"] = True
    return c


def parse_flow(lines, header_right):
    """All `lift cfm cfm[ cfm]` sequences on the page, grouped under the nearest FLOW DATA label."""
    labels = []
    for ln in lines:
        ws = ln["words"]
        for i, w in enumerate(ws):
            if w["text"] == "FLOW" and i + 1 < len(ws) and ws[i + 1]["text"] == "DATA":
                near = [x for x in ws if x["x0"] >= max(w["x0"] - 40, header_right) and x["x0"] <= min(w["x0"] + 260, 575)
                        and x["text"] not in ("FLOW", "DATA", "@", "28”", "28\"", "WATER")]
                labels.append({"top": ln["top"], "x0": w["x0"], "label": text_of(near), "rows": []})
    rows = []
    for ln in lines:
        ws = ln["words"]
        i = 0
        while i < len(ws):
            if is_flow_start(ws, i):
                ints, j = [], i + 1
                while j < len(ws) and re.fullmatch(r"\d{2,3}", ws[j]["text"]) and ws[j]["x0"] - ws[j - 1]["x1"] < 60:
                    ints.append(int(ws[j]["text"]))
                    j += 1
                rows.append({"top": ln["top"], "x0": ws[i]["x0"], "lift": num(ws[i]["text"]), "vals": ints})
                i = j
                continue
            i += 1
    for r in rows:
        cands = [lb for lb in labels if lb["top"] < r["top"] and abs(lb["x0"] - r["x0"]) < 70]
        if not cands:
            cands = [lb for lb in labels if lb["top"] < r["top"]]
        if not cands:
            continue
        lb = max(cands, key=lambda lb: lb["top"])
        lb["rows"].append(r)
    tables = []
    for lb in labels:
        if lb["rows"]:
            lb["rows"].sort(key=lambda r: r["lift"])
            seen, uniq = set(), []
            for r in lb["rows"]:
                if r["lift"] not in seen:
                    seen.add(r["lift"])
                    uniq.append(r)
            lb["rows"] = uniq
            tables.append(lb)
    return tables


FLOW3 = {36: ("int", "exh@A", "exh@B"), 85: ("int@18", "int@14", "exh"), 86: ("int@2.47", "int@2.5", "exh")}


def flow_for(head, tables, pno):
    """Pick the flow table (and columns) for a head record."""
    if not tables:
        return None, None
    runner = head.get("intakeRunnerCc")
    iv, ev = head.get("intakeValve"), head.get("exhaustValve")
    matched, unlabeled = [], []
    for t in tables:
        lab = t["label"]
        m = re.search(r"\b(\d{3})\s*[cC][cC]\b", lab)
        mv = re.search(r"(\d\.\d{3})-(\d\.\d{3})", lab)
        if m:
            if runner == int(m.group(1)):
                matched.append(t)
        elif mv:
            if iv == float(mv.group(1)) and ev == float(mv.group(2)):
                matched.append(t)
        elif "SMC" in lab:
            if head.get("smcPort"):
                matched.append(t)
        else:
            unlabeled.append(t)
    t = matched[0] if matched else (unlabeled[0] if unlabeled else None)
    if t is None:
        return None, "no flow table printed for this configuration"
    cols = FLOW3.get(pno)
    flow = []
    for r in t["rows"]:
        v = r["vals"]
        if cols and len(v) == 3:
            entry = {"lift": r["lift"]}
            for c, val in zip(cols, v):
                key, _, sel = c.partition("@")
                if sel:
                    if key == "exh" and head.get("exhaustPattern", "A") != sel:
                        continue
                    if key == "int" and sel in ("18", "14") and head.get("valveAngle") != float(sel):
                        continue
                    if key == "int" and sel in ("2.47", "2.5") and iv != float(sel):
                        continue
                entry[key] = val
            if "int" in entry and "exh" in entry:
                flow.append(entry)
        elif len(v) >= 2:
            flow.append({"lift": r["lift"], "int": v[0], "exh": v[1]})
    if not flow:
        return None, None
    note = None
    if not matched and len(tables) > 1:
        note = "page has several flow tables; the unlabeled one was used"
    return flow, note


def head_family(fam_key, bore_spacing, series):
    if fam_key == "sbc":
        return [FAM_SBC45] if bore_spacing == 4.5 else [FAM_SBC]
    if fam_key == "ls":
        return [FAM_LS]
    if fam_key == "bbc":
        return [FAM_BB50] if bore_spacing == 5.0 else list(FAM_BBC)
    if fam_key == "sbf":
        return [FAM_SBF]
    return [series or "unknown"]


def parse_head_page(page, pno, qa, skipped, debug):
    lines = page_lines(page)
    text = page.extract_text() or ""
    fam_key = page_family(pno)
    band = band_of(lines, is_head_header, head_last_word)
    if not band:
        return []
    band_left, band_max, header_right, headers = band
    flow_tables = parse_flow(lines, header_right)
    if debug:
        print(f"p{pno}: band {band_left:.0f}-{band_max:.0f} (header right {header_right:.0f}); flow tables: " +
              "; ".join(f"[{t['label']}] {len(t['rows'])} rows" for t in flow_tables), file=sys.stderr)

    def single_inch(key):
        v = page_spec(text, key)
        if v:
            m = re.match(r"^\s*(\d\.\d{3})[\"”]?\s*$", v)
            if m:
                return float(m.group(1))
        return None

    spec_iv, spec_ev = single_inch("Intake Valve"), single_inch("Exhaust Valve")
    spec_cc = None
    v = page_spec(text, "Chamber Volume")
    if v:
        mm = re.findall(r"(\d{2,3})\s*cc", v)
        if len(mm) == 1 and " or " not in v and "," not in v and "-" not in v:
            spec_cc = int(mm[0])
    spec_cc_note = "chamber volume as printed is with titanium valves" if v and re.search(r"w/\s*Ti", v) else None
    spec_angle = None
    v = page_spec(text, "Valve Angle")
    if v:
        m = re.match(r"(\d{1,2}(?:\.\d)?)°", v)
        if m:
            spec_angle = float(m.group(1))
    spec_plug = None
    v = page_spec(text, "Plug Type")
    if v:
        low = v.lower()
        if "straight" in low and "angle" not in low:
            spec_plug = "straight"
        elif "angle" in low and "straight" not in low:
            spec_plug = "angle"
    spec_port = None
    v = page_spec(text, "Intake Port Shape")
    if v:
        spec_port = v.split()[0].lower()
    spec_exh = None
    v = page_spec(text, "Exhaust Port Location") or page_spec(text, "Exhaust Location")
    if v:
        m = re.search(r"(\.\d{3})", v)
        if m:
            spec_exh = float(m.group(1))
    spread = "spread port" in text.lower()
    material = material_of(text)
    recommended = sorted(set(re.findall(r"\b4[1-5]\d{6}\b", text)))
    shaft = bool(re.search(r"shaft mount(?:ed)? rocker|Jesel Shaft Mount", text, re.I))
    special_pistons = "special pistons" in text.lower()
    pistons_49 = "21.5° pistons" in text

    # ---- classify in-band lines: [kind, payload, top, x1]
    items = []
    for ln in lines:
        ws = repair(band_words(ln["words"], band_left, band_max, header_right))
        if not ws:
            continue
        txts = [w["text"] for w in ws]
        top, x1 = ln["top"], ws[-1]["x1"]
        if "PART" in txts and "CONFIGURATION" in txts:
            pi = txts.index("PART")
            if pi > 0:
                items.append(["heading", text_of(ws[:pi]), top, ws[pi - 1]["x1"]])
            hw = ws[pi:]
            c = {"max_x0": None, "cc_x0": None, "config_x0": None}
            for w in hw:
                if w["text"] == "CONFIGURATION":
                    c["config_x0"] = w["x0"]
                if w["text"] == "MAX.":
                    c["max_x0"] = w["x0"]
                if w["text"].startswith("CHAMBER"):
                    c["cc_x0"] = w["x0"]
            if c["max_x0"] is None and "SPACING" in txts:
                c["max_x0"] = 9999
            items.append(["header", c, top, x1])
            continue
        joined = text_of(ws)
        first = ws[0]["text"]
        # a heading's tail typeset a few points lower (p74 `(w/ 2.300" Intake Valve)`)
        if items and items[-1][0] == "heading" and abs(top - items[-1][2]) <= 5 and ws[0]["x0"] > items[-1][3]:
            items[-1][1] = clean_text(items[-1][1] + " " + joined)
            items[-1][3] = x1
            continue
        if PN_RE.match(first) or re.match(r"^\d{8}(Bare|C-Core|\d\.\d{3})", first):
            if first.startswith("1"):
                items.append(["row", ws, top, x1])
            elif not re.match(r"^[46]\d{7}", first):
                skipped.append((f"p{pno}", first, f"part number outside the head ranges: {joined}"))
            continue
        if re.match(r"^\d{2,3}cc (COMBUSTION )?CHAMBERS", joined):
            items.append(["sub", joined, top, x1])
            continue
        if HEADING_START.match(joined) or re.match(r"^Rockers\)|^\d\.\d{3}\"/\d\.\d{3}\" VALVES", joined):
            items.append(["heading", joined, top, x1])
            continue
        items.append(["other", (ws, joined), top, x1])

    # ---- join wrapped headings
    merged = []
    for kind, payload, top, x1 in items:
        if kind == "heading" and merged and merged[-1][0] == "heading":
            prev = merged[-1][1]
            if prev.endswith("-") or prev.count("(") > prev.count(")") or payload.startswith("Rockers)") \
                    or (re.match(r"^\d\.\d{3}\"/\d\.\d{3}\" VALVES", payload) and "VALVES" not in prev):
                merged[-1] = ["heading", clean_text(prev + " " + payload), merged[-1][2], x1]
                continue
        merged.append([kind, payload, top, x1])
    items = merged

    # ---- walk
    records = []
    heading = sub = cur_cols = last_row = pending = last_top = page_series = None
    for kind, payload, top, x1 in items:
        if kind == "heading":
            heading = parse_heading(payload)
            if heading.get("runner") and page_series is None:
                page_series = heading
            if payload.startswith("FULL PORT") and page_series:
                for k in ("runner", "angle", "cnc", "material", "port", "plug"):
                    if k in page_series and k not in heading:
                        heading[k] = page_series[k]
                heading["series"] = page_series["series"] + " full port"
            sub = None
            last_row = None
            continue
        if kind == "sub":
            sub = parse_heading(payload)
            last_row = None
            continue
        if kind == "header":
            cur_cols = payload
            continue
        if kind == "other":
            ws, joined = payload
            if cur_cols and cur_cols["config_x0"] is not None and abs(ws[0]["x0"] - cur_cols["config_x0"]) <= 8 \
                    and ":" not in joined and not re.match(r"^(Uses|Head|Requires|Assemblies|Heads|Note)", joined):
                if last_row is not None and last_top is not None and top - last_top < 16 and \
                        re.search(r"(Features|w/ steel|w/ Steel|-)$", last_row["desc"]):
                    last_row["desc"] = clean_text(last_row["desc"] + " " + joined)
                else:
                    pending = joined
            continue
        if heading is None or cur_cols is None:
            skipped.append((f"p{pno}", payload[0]["text"], "row before any heading/header"))
            continue
        pn, desc, lift, cc = parse_head_row(payload, cur_cols)
        if not desc and pending:
            desc = pending
        pending = None
        row = {"pn": pn, "desc": desc, "lift": lift, "cc": cc, "heading": heading, "sub": sub, "top": top}
        last_row, last_top = row, top
        records.append(row)

    # ---- build records
    out = []
    for r in records:
        h, s = r["heading"], r["sub"] or {}
        cfg = parse_config(r["desc"])
        casting = cfg.get("casting")
        is_casting = bool(casting and casting.startswith("C-core"))
        unported = casting == "unported"
        if is_casting and h.get("casting") == "solid" and "solid" not in casting:
            casting = "C-core solid"
        spec = OrderedDict()
        cc = r["cc"]
        if cc == "call":
            cc = None
            cfg["note"] = "chamber volume: call Dart"
        if cc is None and not is_casting:
            cc = s.get("runner") if s else None       # sub-heading "64cc COMBUSTION CHAMBERS"
            if cc is None and spec_cc is not None:
                cc = spec_cc
        if is_casting:
            cc = None
        iv = h.get("iv") or s.get("iv") or spec_iv
        ev = h.get("ev") or s.get("ev") or spec_ev
        runner = h.get("runner")
        if is_casting or unported:
            runner = None
            iv = ev = None
        bore_spacing = h.get("boreSpacing") or (4.5 if "4.500" in r["desc"] else None)
        spec["chamberCc"] = cc
        spec["intakeRunnerCc"] = runner
        spec["intakeValve"] = iv
        spec["exhaustValve"] = ev
        spec["maxLift"] = r["lift"]
        spec["springDia"] = cfg.get("springDia")
        spec["springType"] = cfg.get("springType")
        spec["camType"] = cfg.get("camType")
        spec["camTypes"] = cfg.get("camTypes")
        spec["valveAngle"] = h.get("angle") or spec_angle
        spec["intakePattern"] = h.get("port") or spec_port
        spec["exhaustRaised"] = spec_exh
        spec["exhaustPattern"] = {"A": "A (standard)", "B": "B (Stahl)"}.get(h.get("exhPattern"))
        spec["plugType"] = h.get("plug") or spec_plug
        spec["material"] = h.get("material") or material
        spec["cnc"] = True if (h.get("cnc") and not is_casting and not unported) else None
        spec["bare"] = bool(cfg.get("bare", r["lift"] is None and not cfg.get("springDia")))
        spec["casting"] = casting or h.get("casting")
        spec["chamberBore"] = h.get("chamberBore")
        spec["boreSpacing"] = bore_spacing
        spec["marine"] = True if (h.get("marine") or (r["pn"].endswith("M") and fam_key == "bbc")) else None
        spec["mercury525Pattern"] = True if h.get("merc") else None
        spec["smcPort"] = True if (h.get("smc") or "SMC" in r["desc"]) else None
        spec["intakeFlange"] = h.get("intakeFace")
        spec["selfAligningRockers"] = h.get("selfAligningRockers")
        spec["headBolts"] = h.get("bolts")
        spec["rockerBar"] = cfg.get("rockerBar")
        spec["valveMaterial"] = cfg.get("valveMaterial")
        spec["steelGuides"] = cfg.get("steelGuides")
        spec["variant"] = cfg.get("variant")
        spec["note"] = cfg.get("note")
        if spec_cc_note and cc == spec_cc and not r["cc"]:
            spec["chamberNote"] = spec_cc_note
        spec["configuration"] = r["desc"] or None
        spec["recommendedIntakes"] = recommended or None
        tmp = {"intakeRunnerCc": runner, "intakeValve": iv, "exhaustValve": ev, "smcPort": spec["smcPort"],
               "exhaustPattern": h.get("exhPattern"), "valveAngle": spec["valveAngle"]}
        flow, fnote = (None, None)
        if not is_casting and not unported:
            flow, fnote = flow_for(tmp, flow_tables, pno)
        if flow:
            spec["flow"] = flow
            spec["flowDepression"] = 28
        if fnote:
            spec["flowNote"] = fnote
        spec = OrderedDict((k, v) for k, v in spec.items() if v is not None and v != "")
        # fitment
        fams = head_family(fam_key, bore_spacing, h["series"])
        notes = []
        if h.get("lsStyle"):
            notes.append(f"{h['lsStyle']}-compatible" + (f" {h['port']} port" if h.get("port") else ""))
        if h.get("chamberBore"):
            notes.append(f"chamber for {h['chamberBore']:.3f} bore")
        if h.get("merc"):
            notes.append("Mercury Racing 525 exhaust bolt pattern")
        if spread and fam_key == "bbc":
            notes.append("spread port (Big Chief); needs Dart Big Chief intake and shaft rockers")
        if bore_spacing:
            notes.append(f"{bore_spacing:.3f} bore spacing block only")
        if shaft:
            notes.append("shaft-mount rockers required")
        if pistons_49 and cc == 49:
            notes.append("49cc chamber requires 21.5° pistons")
        elif special_pistons and not pistons_49:
            notes.append("special pistons required")
        if h.get("intakeFace"):
            notes.append(f"{h['intakeFace']} intake face")
        series = h["series"]
        name = f"{series} {('iron' if 'iron' in (spec.get('material') or '') else 'aluminum')} head"
        if is_casting:
            name += f", {casting} casting"
        elif unported:
            name += ", unported casting"
        else:
            if cc:
                name += f", {cc}cc"
            if iv and ev:
                name += f", {iv:.3f}/{ev:.3f} valves"
            if spec["bare"]:
                name += ", bare"
            elif cfg.get("springDia"):
                name += f", {cfg['springDia']:.3f} {cfg.get('springType', '')} springs".replace("  ", " ")
                if cfg.get("camType"):
                    name += " (" + "/".join(cfg.get("camTypes", [cfg["camType"]])).replace("_", " ") + ")"
        for fam in fams:
            rec = OrderedDict([
                ("m", BRAND), ("p", r["pn"]), ("cat", "head"), ("name", name),
                ("fit", OrderedDict([("fam", fam), ("cyl", 8)] + ([("notes", "; ".join(dict.fromkeys(notes)))] if notes else []))),
                ("spec", spec),
                ("src", OrderedDict([("doc", DOC), ("edition", EDITION), ("file", SRC_FILE), ("page", pno),
                                     ("printedPage", pno - 2), ("heading", clean_text(h["text"]))])),
                ("emissions", None),
            ])
            out.append(rec)
    return out


# --------------------------------------------------------------------------------------- blocks
def is_block_header(txt):
    return "PART" in txt and "DESCRIPTION" in txt and "DECK" in txt and "BORE" in txt and ("CAPS" in txt or "MAINS" in txt)


def block_last_word(ws, i):
    return ws[i]["text"] == "BORE"


BLOCK_HEADING_RE = re.compile(r"^([A-Z0-9²°.\"”/()\-\s]*?\b(?:IRON|ALUMINUM)\b)(.*)$")


def block_heading(joined):
    """`SPECIAL HIGH PERFORMANCE (SIAMESE) - IRON SHP SPECS` -> `SPECIAL HIGH PERFORMANCE (SIAMESE) - IRON`;
    keeps a following `(NON VVT)` / `(RACE BLOCK)` / `- DUCTILE CAP`."""
    m = BLOCK_HEADING_RE.match(joined)
    if not m or " - " not in m.group(1) and "- IRON" not in m.group(1) and "- ALUMINUM" not in m.group(1):
        return None
    head, rest = m.group(1).strip(), m.group(2).strip()
    toks = rest.split()
    extra = []
    i = 0
    while i < len(toks):
        t = toks[i]
        if t.startswith("("):
            while i < len(toks):
                extra.append(toks[i])
                if toks[i].endswith(")"):
                    break
                i += 1
            i += 1
            continue
        if t == "-" and i + 1 < len(toks) and toks[i + 1].isupper():
            extra.append(t)
            i += 1
            while i < len(toks) and toks[i].isupper() and not toks[i].endswith(":"):
                extra.append(toks[i])
                i += 1
            break
        break
    return clean_text(head + (" " + " ".join(extra) if extra else ""))


def block_family(fam_key, heading, desc):
    if fam_key == "hemi":
        return [FAM_HEMI_EARLY] if "Non VVT" in desc else [FAM_HEMI_EARLY, FAM_HEMI_LATE]
    if fam_key == "sbc":
        return [FAM_SBC45] if "4.500" in heading else [FAM_SBC]
    if fam_key == "ls":
        return [FAM_LS]
    if fam_key == "bbc":
        if "GEN V" in heading or "Gen V" in desc:
            return ["Chevy Gen VI big block"]
        return ["Chevy Mark IV big block"]
    if fam_key == "sbf":
        return [FAM_SBF]
    return ["unknown"]


def parse_block_row(words):
    toks = [w["text"] for w in words]
    pn = toks[0]
    rest = toks[1:]
    di = None
    for i in range(len(rest) - 1):
        a, b = INCH_RE.match(rest[i]), INCH_RE.match(rest[i + 1])
        if a and b and 8.0 <= float(a.group(1)) <= 12.6 and 3.6 <= float(b.group(1)) <= 4.8:
            di = i
            break
    if di is None:
        return None
    deck, bore = float(INCH_RE.match(rest[di]).group(1)), float(INCH_RE.match(rest[di + 1]).group(1))
    left = rest[:di]
    if not left:
        return None
    mains = left.pop()
    caps = None
    if left and left[-1] in ("Ductile", "Steel"):
        caps = left.pop()
        if left and left[-1] == "2-Bolt":
            caps = "2-Bolt " + caps
            left.pop()
    rear = cam = camloc = None
    while left:
        t = left[-1]
        if re.fullmatch(r"(1|2)-Piece\*?", t) or t == "Piece":
            if t == "Piece" and len(left) >= 2 and left[-2] in ("1", "2"):
                rear = left[-2] + "-Piece"
                left.pop()
                left.pop()
            else:
                rear = t.rstrip("*")
                left.pop()
            continue
        if re.fullmatch(r"(Std\.?|STD|BBC|50mm|55mm)", t) and (rear is None or cam is None):
            if rear is None and cam is None and ("Std" in t or t == "STD"):
                rear = t
            else:
                cam = t
            left.pop()
            continue
        if re.fullmatch(r"[+]?\.\d{3}[\"”]", t) and len(left) >= 2 and left[-2] == "Raised":
            camloc = "raised " + t.strip("\"”").lstrip("+")
            left.pop()
            left.pop()
            continue
        if re.fullmatch(r"[+]\.\d{3}[\"”]", t):
            camloc = "raised " + t.strip("\"”").lstrip("+")
            left.pop()
            continue
        break
    desc = clean_text(" ".join(left))
    return {"pn": pn, "desc": desc, "deck": deck, "bore": bore, "mains": mains, "caps": caps, "rear": rear,
            "cam": cam, "camloc": camloc}


def parse_block_page(page, pno, qa, skipped, debug):
    lines = page_lines(page)
    text = page.extract_text() or ""
    fam_key = page_family(pno)
    band = band_of(lines, is_block_header, block_last_word)
    if not band:
        return []
    band_left, band_max, header_right, headers = band
    has_rear_col = any("REAR" in [w["text"] for w in h["words"]] for h in headers)
    material = material_of(text)
    m = re.search(r"(\d\.\d{3})[\"”]\s*\(max\)", text)
    max_bore = float(m.group(1)) if m else None
    non_siamese_max = None
    m2 = re.search(r"Non-Siamesed:.*?(\d\.\d{3})[\"”]\s*\(max\)", text, re.S)
    if m2:
        non_siamese_max = float(m2.group(1))
    if max_bore is None:
        m = re.search(r"bored\s+to\s+(\d\.\d{3})", text)
        if m:
            max_bore = float(m.group(1))
    if max_bore is None:
        m = re.search(r"Cylinder Bores:?\s*\d\.\d{3}[\"”]\s*to\s*(\d\.\d{3})", text)
        if m:
            max_bore = float(m.group(1))
    lifter = page_spec(text, "Lifter Bore") or page_spec(text, "Lifter Provision")
    lifter_bore = None
    if lifter:
        m = re.search(r"(\d?\.\d{3})", lifter)
        if m:
            lifter_bore = float(m.group(1))
    rear_spec = page_spec(text, "Rear Seal")
    camloc_spec = page_spec(text, "Cam Location") or ""
    m = re.search(r"[Rr]aised\s*[+]?\.(\d{3})", camloc_spec)
    raised_spec = ("raised ." + m.group(1)) if m else None
    m = re.search(r"[Cc]learance(?:d)?\s+(?:for|up to)\s+(\d\.\d{3})[\"”]\s+stroke", text)
    max_stroke = float(m.group(1)) if m else None
    main_studs = bool(re.search(r"main stud", text, re.I)) or None
    if re.search(r"2-bolt #1|on 2-4 mains", text):
        caps_pattern = "4-bolt #2-4, 2-bolt #1 and #5"
    elif re.search(r"4[- ]bolt(?: main caps)? 1-5", text, re.I):
        caps_pattern = "4-bolt 1-5"
    else:
        caps_pattern = "4-bolt"
    bbc_cam_journal = bool(re.search(r"BBC cam journal|Big block camshaft bearings", text))

    heading = None
    rows = []
    for ln in lines:
        ws = repair(band_words(ln["words"], band_left, band_max, header_right))
        if not ws:
            continue
        txts = [w["text"] for w in ws]
        joined = text_of(ws)
        if is_block_header(txts):
            continue
        if re.match(r"^\d{8}", ws[0]["text"]):
            if not ws[0]["text"].startswith("31"):
                continue        # oil pan rail spacers and other accessories listed on block pages
            if heading is None:
                skipped.append((f"p{pno}", ws[0]["text"], "block row before heading"))
                continue
            row = parse_block_row(ws)
            if row is None:
                skipped.append((f"p{pno}", ws[0]["text"], f"unparsed block row: {joined}"))
                continue
            row["heading"] = heading
            rows.append(row)
            continue
        hd = block_heading(joined)
        if hd and "SPECS" not in hd and len(hd) > 8 and not hd.startswith(("CAST ", "SMALL BLOCK", "BIG BLOCK", "GEN ")):
            heading = hd
    out = []
    for r in rows:
        h = r["heading"]
        desc = r["desc"]
        spec = OrderedDict()
        spec["bore"] = r["bore"]
        mb = max_bore
        if "Non-Siamese" in desc and non_siamese_max:
            mb = non_siamese_max
        spec["maxBore"] = mb
        spec["deckHeight"] = r["deck"]
        mains = r["mains"]
        mj = mains_label = None
        if mains in ("350", "400"):
            mj, mains_label = MAIN_JOURNAL[mains], f"SBC {mains}"
        elif mains == "302":
            mj, mains_label = MAIN_JOURNAL["302"], "SBF 302"
        elif mains == "351C":
            mj, mains_label = MAIN_JOURNAL["351C"], "Ford 351C"
        elif INCH_RE.match(mains):
            mj = float(INCH_RE.match(mains).group(1))
            mains_label = "LS Next² " + ("Ford 2.750" if mj > 2.7 else "LS 2.560")
        elif fam_key == "ls":
            mj, mains_label = MAIN_JOURNAL["LS"], "LS stock"
        elif fam_key == "bbc":
            mj, mains_label = MAIN_JOURNAL["BBC"], "BBC stock"
        elif fam_key == "hemi":
            mains_label = "Gen III Hemi stock"
        spec["mainJournal"] = mj
        spec["mains"] = mains_label
        caps_mat = {"Ductile": "ductile iron", "Steel": "steel", "2-Bolt Ductile": "ductile iron"}.get(r["caps"])
        pattern = caps_pattern
        if r["caps"] == "2-Bolt Ductile":
            pattern = "2-bolt all 5"
        if fam_key in ("ls", "hemi"):
            pattern = "4-bolt 1-5"
        spec["mainCaps"] = f"{caps_mat} {pattern}" if caps_mat else None
        cam = r["cam"]
        if cam in ("BBC", "50mm", "55mm"):
            cam_journal = cam
        elif fam_key == "sbc":
            cam_journal = "BBC" if bbc_cam_journal else "SBC"
        elif fam_key == "bbc":
            cam_journal = "BBC"
        elif fam_key == "ls":
            cam_journal = "LS 55mm"
        else:
            cam_journal = "stock"
        if "-55" in r["pn"] and cam is None:
            cam_journal = "55mm"
        spec["camJournal"] = cam_journal
        spec["camBore"] = CAM_BORE.get(cam_journal)
        camloc = r["camloc"]
        if camloc is None:
            if "Raised Cam" in desc and raised_spec:
                camloc = raised_spec
            elif raised_spec and fam_key == "bbc" and ("M2" in desc or "Race Series" in desc):
                camloc = raised_spec
            else:
                camloc = "stock"
        spec["camLocation"] = camloc
        rear = r["rear"]
        if rear and not has_rear_col and re.fullmatch(r"Std\.?|STD", rear):
            rear = None             # the token was the CAM column
        if rear:
            rear = {"1-Piece": "1-pc", "2-Piece": "2-pc"}.get(rear.rstrip("*"), "stock" if ("Std" in rear or rear == "STD") else rear)
        elif rear_spec:
            low = rear_spec.lower()
            if "stock" in low:
                rear = "stock"
            elif "2-piece" in low and "1" not in low:
                rear = "2-pc"
            elif "1-piece" in low and "2" not in low:
                rear = "1-pc"
        if fam_key == "ls" and rear == "stock":
            rear = "stock LS"
        spec["rearSeal"] = rear
        spec["lifterBore"] = lifter_bore
        spec["material"] = material
        spec["siamese"] = False if ("Non-Siamese" in desc or pno == 19) else True
        spec["boreSpacing"] = 4.5 if ("4.500" in h or "4.500" in desc) else None
        if fam_key == "ls":
            spec["skirted"] = True if ("Skirted" in desc or "SKIRTED" in h) else False
        spec["maxStroke"] = max_stroke
        if main_studs and (fam_key != "sbc" or "PRO" in desc):
            spec["mainStuds"] = True
        if "VVT" in desc:
            spec["vvt"] = "non-VVT" if "Non VVT" in desc else "VVT"
        spec = OrderedDict((k, v) for k, v in spec.items() if v is not None)
        fams = block_family(fam_key, h, desc)
        notes = []
        if fam_key == "bbc":
            notes.append("Gen V/VI 1-pc rear seal and timing cover pattern" if fams == ["Chevy Gen VI big block"]
                         else "Mark IV pattern (2-pc rear seal); +.300 tall Gen VI style lifters")
        if fam_key == "hemi":
            notes.append(("non-VVT" if "Non VVT" in desc else "VVT") + " Gen III Hemi; conventional main caps, stock oil pan")
        if fam_key == "ls":
            notes.append("conventional main caps and oil pan; LS rotating assembly and heads")
            if not spec.get("skirted"):
                notes.append("non-skirted block: needs Dart oil pan rail adapters for a factory pan")
        if fam_key == "sbc" and spec.get("boreSpacing") == 4.5:
            notes.append("4.500 bore spacing; needs 4.500 bore-space heads, intake and gaskets")
        if fam_key == "sbf":
            notes.append(f"{'302' if r['deck'] < 8.5 else '351W'} deck height; {mains_label} main bearings")
        if camloc.startswith("raised") and fam_key == "sbc":
            notes.append("raised cam: needs Dart timing set / offset components")
        series = desc if desc else h.title()
        name = f"{series} block, {r['bore']:.3f} bore, {r['deck']:.3f} deck, {mains_label or mains} mains"
        if spec.get("rearSeal"):
            name += f", {spec['rearSeal']} rear seal"
        for fam in fams:
            rec = OrderedDict([
                ("m", BRAND), ("p", r["pn"]), ("cat", "block"), ("name", name),
                ("fit", OrderedDict([("fam", fam), ("cyl", 8)] + ([("notes", "; ".join(notes))] if notes else []))),
                ("spec", spec),
                ("src", OrderedDict([("doc", DOC), ("edition", EDITION), ("file", SRC_FILE), ("page", pno),
                                     ("printedPage", pno - 2), ("heading", h)])),
                ("emissions", None),
            ])
            out.append(rec)
    return out


# -------------------------------------------------------------------------------------- intakes
def is_intake_header(txt):
    return "PART" in txt and "CARB" in txt and "PORT" in txt


def intake_last_word(ws, i):
    t = ws[i]["text"]
    nxt = [w["text"] for w in ws[i + 1:i + 4]]
    if t == "CNC":
        return True
    if t == "MACHINING":
        return "CNC" not in nxt[:1]
    if t == "CARB":
        return not any(x in ("INJ.", "MACHINING", "CNC") for x in nxt)
    return False


PORT_TOKENS = {"Standard", "Raised", "Raised Runner", "File Core", "Rectangle", "Oval", "Cathedral", "Raw"}


def parse_intake_page(page, pno, qa, skipped, debug):
    lines = page_lines(page)
    fam_key = page_family(pno)
    band = band_of(lines, is_intake_header, intake_last_word)
    if not band:
        return []
    band_left, band_max, header_right, headers = band
    heading = None
    header_kind = None
    out = []
    for ln in lines:
        ws = repair(band_words(ln["words"], band_left, band_max, header_right))
        if not ws:
            continue
        txts = [w["text"] for w in ws]
        joined = text_of(ws)
        if is_intake_header(txts):
            header_kind = "ls" if "INJ." in txts else "std"
            continue
        if re.match(r"^\d{8}$", ws[0]["text"]) and len(ws) > 1:
            toks = txts[1:]
            ci = None
            for i, t in enumerate(toks):
                if t in ("4150", "4500") or (t == "N/A" and i >= 2 and toks[i - 1] == "N/A"):
                    ci = i
                    break
            if ci is None or ci < 1:
                if ws[0]["text"].startswith("4") and len(ws) > 2:
                    skipped.append((f"p{pno}", ws[0]["text"], f"no carb column: {joined}"))
                continue        # spacer kits (62xxxxxx) and picture captions are not manifolds
            carb = toks[ci]
            deck = toks[ci - 1]
            tail = toks[ci + 1:]
            body = toks[:ci - 1]
            port = None
            for k in (2, 1):
                if len(body) >= k and " ".join(body[-k:]) in PORT_TOKENS:
                    port = " ".join(body[-k:])
                    body = body[:-k]
                    break
            desc = clean_text(" ".join(body))
            low = (desc + " " + (heading or "")).lower()
            spec = OrderedDict()
            if "box ram" in low:
                itype = "tunnel-ram"
            elif "dual plane" in low:
                itype = "dual-plane"
            else:
                itype = "single-plane"
            spec["type"] = itype
            if "box ram" in low:
                spec["style"] = "box ram (top plate sold separately)"
            elif "2-pc split" in low:
                spec["style"] = "2-piece split single plane"
            spec["carbFlange"] = {"4150": "square", "4500": "dominator"}.get(carb)
            spec["carbMount"] = carb if carb != "N/A" else None
            dh = num(deck) if INCH_RE.match(deck) else None
            if deck in ("Std.", "Std", "STD"):
                dh = {"sbc": 9.025, "ls": 9.24, "bbc": 9.8}.get(fam_key)
                spec["deckAsPrinted"] = "Std."
            spec["deckHeight"] = dh
            if port:
                p = port.lower()
                spec["portStyle"] = {"standard": "standard location", "raised": "raised runner", "raised runner": "raised runner",
                                     "file core": "file core (12.5° oval port)", "rectangle": "rectangle", "oval": "oval",
                                     "cathedral": "cathedral", "raw": "raw casting"}.get(p, p)
            if port == "Raw" or carb == "N/A":
                spec["rawCasting"] = True
            if header_kind == "ls" and tail:
                if tail[0] in ("Yes", "No"):
                    spec["injectorBosses"] = tail[0] == "Yes"
                if len(tail) > 1 and tail[1] in ("Yes", "No"):
                    spec["cnc"] = tail[1] == "Yes"
            if fam_key == "sbc":
                spec["headsNote"] = desc
                if "220" in desc:
                    spec["note"] = "for 220cc-class raised-runner race heads" if "RR" in desc else "for 220cc-class race heads"
            elif "Sniper" in desc:
                spec["note"] = desc.split("-")[-1].strip() + " version"
            spec = OrderedDict((k, v) for k, v in spec.items() if v is not None)
            if fam_key == "sbc":
                fams = [FAM_SBC]
            elif fam_key == "ls":
                fams = [FAM_LS]
            elif fam_key == "bbc":
                fams = [FAM_BB81] if "8.1L" in desc else list(FAM_BBC)
            else:
                fams = [FAM_SBF]
            notes = []
            if fam_key == "sbc" and desc:
                notes.append(f"use with {desc} heads")
            if fam_key == "ls":
                notes.append(("LS7-compatible rectangle port" if ("12°" in (heading or "") or "LS7" in (heading or "")) else
                              "Dart Race Series 10° LS oval port heads only") + "; Dart LS Next deck " + deck)
            if fam_key == "bbc" and "Big Chief" in desc:
                notes.append("Dart Big Chief spread-port heads only")
            if fam_key == "bbc" and "8.1L" in desc:
                notes.append("Gen VII 8.1L Vortec cathedral port")
            if fam_key == "sbf":
                notes.append("302 (8.200 deck)" if dh and dh < 9 else "351W (9.500 deck)")
            hname = (heading or "").title().replace("Shp", "SHP").replace("Ls", "LS").replace("Pro1", "PRO1").replace("Ls7", "LS7")
            name = f"{hname} intake manifold" if hname else "intake manifold"
            if desc and fam_key != "sbc":
                name = f"{desc} intake manifold ({itype})"
            name += f", {carb} flange" if carb != "N/A" else ", raw casting"
            if dh:
                name += f", {dh:.3f} deck"
            for fam in fams:
                src = OrderedDict([("doc", DOC), ("edition", EDITION), ("file", SRC_FILE), ("page", pno), ("printedPage", pno - 2)])
                if heading:
                    src["heading"] = heading
                rec = OrderedDict([
                    ("m", BRAND), ("p", ws[0]["text"]), ("cat", "intake"), ("name", name),
                    ("fit", OrderedDict([("fam", fam), ("cyl", 8)] + ([("notes", "; ".join(notes))] if notes else []))),
                    ("spec", spec), ("src", src), ("emissions", "no_eo_race_only"),
                ])
                out.append(rec)
            continue
        if re.match(r"^(DUAL PLANE|SINGLE PLANE|PRO1 LS|RACE SERIES LS|\d+°/\d+° SINGLE PLANE|GEN 7)", joined) and joined.upper() == joined:
            heading = re.sub(r"\s+\d{8}$", "", joined)
            continue
    return out


# ----------------------------------------------------------------------------------- validation
NUMERIC_STRING_OK = {"p", "edition", "file", "heading", "carbMount", "deckAsPrinted", "configuration", "variant", "recommendedIntakes"}


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat"):
            if not r.get(k):
                problems.append(f"{r.get('p')}: missing {k}")
        if not r.get("fit", {}).get("fam"):
            problems.append(f"{r.get('p')}: missing fit.fam")
        if not r.get("src"):
            problems.append(f"{r.get('p')}: missing src")
        key = (r["cat"], r["p"], r["fit"]["fam"])
        if key in seen:
            problems.append(f"{r['p']}: duplicate within {r['fit']['fam']} ({r['cat']})")
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str):
                if o == "":
                    problems.append(f"{r['p']}: empty string at {path}")
                elif re.fullmatch(r"-?\d+(\.\d+)?", o) and re.sub(r"\[\d+\]$", "", path.split(".")[-1]) not in NUMERIC_STRING_OK:
                    problems.append(f"{r['p']}: numeric string at {path} = {o}")
        walk(r, "")
    return problems


def dedupe(records, qa_groups):
    out, seen = [], {}
    for r in records:
        key = (r["cat"], r["p"], r["fit"]["fam"])
        if key in seen:
            first = seen[key]
            if first["spec"] != r["spec"] or first["src"].get("heading") != r["src"].get("heading"):
                qa_groups[(first["src"]["page"], f"listed twice (p{first['src']['page']} `{first['src'].get('heading')}` and "
                                                 f"p{r['src']['page']} `{r['src'].get('heading')}`) with different data; "
                                                 f"the first occurrence was kept")].append(r["p"])
            continue
        seen[key] = r
        out.append(r)
    return out


# ---------------------------------------------------------------------------------------- notes
def write_notes(path, records, qa, qa_groups, skipped, pages_seen, counts_pages):
    cats = Counter(r["cat"] for r in records)
    fams = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    L = []
    L.append("# Dart — extraction notes\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_dart.py`.\n")
    L.append("## What was parsed\n")
    L.append(f"One local document, `{SRC_FILE}` (Dart Machinery catalog Volume 23, © 2023, {EXPECTED_PAGES} PDF pages, text layer), "
             "saved by hand by the owner because dartheads.com blocks fetchers. No network request was made. The extractor takes "
             "`--pdf <path>` and defaults to that file. PDF page numbers below are 1-based PDF indexes; the printed page number is "
             "two less (`src.printedPage`).\n")
    L.append("Pages used:\n")
    L.append(f"- cylinder heads: {', '.join(str(p) for p in sorted(pages_seen['head']))}")
    L.append(f"- engine blocks: {', '.join(str(p) for p in sorted(pages_seen['block']))}")
    L.append(f"- intake manifolds: {', '.join(str(p) for p in sorted(pages_seen['intake']))}")
    L.append("- not extracted: short blocks (15, 45, 92, 118), top-end kits (16, 63, 93), billet block/head brochure pages (106-107), "
             "accessories and service parts (44, 62, 91, 105, 108-117: head parts kits, valves, springs, retainers, sleeves, cam "
             "bearings, main caps, gaskets, studs), the LS and BBC crankshafts (119-120) and apparel (121). The cranks are a "
             "possible follow-up `crank` extraction (8 rows: stroke, min rod length, main and rod journal). Spring part numbers "
             "and seat/open pressures are not printed anywhere in the catalog (the head tables give only spring diameter and "
             "single/dual/triple/beehive; p116 lists spring part numbers by diameter only), so `head` records carry "
             "`springDia`/`springType` and no spring PN or pressure.\n")
    L.append("## Method\n")
    L.append("- pdfplumber `extract_words` with x/y positions. Each product page keeps its tables in a left band (the `PART NO.` "
             "column through the last header word) and a SPECS box / `FLOW DATA @ 28\" WATER` table / recommended-manifold list in "
             "a right sidebar that shares the same y positions. Every line is cut at the first sidebar signature (a `Key:` label, "
             "`SPECS`, `FLOW`, a flow row, a 4xxxxxxx manifold number, a 15 pt gap right of the table) and the left part is parsed, "
             "which is what makes the rows parseable (`extract_text` interleaves the two).")
    L.append("- Heads: series heading (`PRO1 23° 200cc - ALUMINUM (Straight Plug Heads) - 2.020\"/1.600\" VALVES`) → runner cc, "
             "valve angle, valve sizes, port shape, plug style, casting type, marine, LS style, bolt count, chamber bore; optional "
             "`64cc COMBUSTION CHAMBERS` sub-heading → chamber cc (and valves on the 18° page); header "
             "`PART NO. CONFIGURATION FOR USE MAX. LIFT [CHAMBER CC]` → column x positions; rows → part number, configuration "
             "text, max lift (from the MAX. LIFT column), chamber cc (CHAMBER CC column when present, else the sub-heading, else "
             "the page SPECS box when it prints one value). Valve sizes fall back to the SPECS box when the heading has none and "
             "the box prints a single size. `FULL PORT CNC - x.xxx\"/x.xxx\" VALVES` sub-series inherit runner cc / valve angle "
             "from the page series. Wrapped headings are re-joined (unbalanced parenthesis, trailing `-`, `Rockers)` / "
             "`x.xxx\"/x.xxx\" VALVES` continuation lines, a tail typeset a few points lower); wrapped configuration text "
             "(`... - Features` + `O Ring Ports & Fire Ring Deck`, `w/ steel` + `guides & seats`) is re-joined by its x position "
             "under the CONFIGURATION column.")
    L.append("- Split tokens from the text layer are repaired by x gap (≤ 5.5 pt): `18 17 503 0` → `18175030`, `128 111` → "
             "`128111`, `4 4 4 14 000` → `44414000`, `1.4 3 7 ”` → `1.437\"`, `.8 50\"` → `.850\"`, `8 7` → `87`, `D ual` → "
             "`Dual`; merged tokens are split (`11010020Bare`, `110111221.290”`); the p38 heading artefact `FULL P+A34:I62ORT` is "
             "read as `FULL PORT`; `Ductlile` (p67) is read as `Ductile`.")
    L.append("- Flow: every `lift cfm cfm[ cfm]` sequence on a head page is grouped under the nearest `FLOW DATA` label above it. "
             "Labels that name a runner size (`310cc`, `383cc`, `451CC CNC`), a valve pair (`w/ 2.500-1.850 valves`) or `(SMC)` "
             "are matched to the heads they describe; an unlabeled table applies to the rest of the page. Three-column tables are "
             "mapped per page: p36 intake / A-port exhaust / B-port exhaust, p85 18° intake / 14° intake / exhaust, p86 2.470 / "
             "2.500 intake / exhaust. `spec.flowDepression` = 28 for all flow arrays. C-core and unported castings get no flow.")
    L.append("- Blocks: rows `PART NO. DESCRIPTION [CAM LOC.] [CAM] [REAR SEAL] CAPS MAINS DECK BORE` are parsed from the right "
             "(deck/bore = first inch pair in range, then mains, caps, then rear seal / cam journal / cam location tokens, the "
             "rest is the description). `maxBore` is the page's `(max)` bore (or `bored to x.xxx` / `Cylinder Bores: a to b`), "
             "`material`, `lifterBore`, `rearSeal`, raised-cam offset and `maxStroke` (\"Clearance for x.xxx stroke\") come from "
             "the page SPECS box and features list. `mainJournal` and `camBore` are the standard sizes for the printed "
             "designation (`SBC 350` 2.449, `SBC 400` 2.649, LS 2.559, BBC 2.749, `SBF 302` 2.249, `351C` 2.749; cam `SBC` "
             "1.869, `BBC` 1.949, `50mm` 1.969, `55mm`/LS 2.165), with the designation kept in `mains` / `camJournal`; Gen III "
             "Hemi and SBF cam bores are not derived. `mainCaps` = cap material from the row + the bolt pattern from the page "
             "(`4-bolt #2-4, 2-bolt #1 and #5` for SHP / Little M Sportsman / 305, `4-bolt 1-5` for LS and Hemi, `4-bolt` otherwise).")
    L.append("- Intakes: `PART NO [USE WITH HEADS|DESCRIPTION] PORT ... DECK CARB [INJ. MACHINING] [CNC]` rows; `type` from the table "
             "title / description (Box Ram → `tunnel-ram` with `style`), `carbFlange` 4150 → square, 4500 → dominator, "
             "`deckHeight` as printed (`Std.` → 9.025 SBC / 9.240 LS, kept in `deckAsPrinted`), `portStyle`, LS injector-boss and "
             "CNC flags. Spacer kits, end-rail spacers and box-ram top plates are not manifolds and were skipped. `emissions` is "
             "`no_eo_race_only` for intakes (every page carries \"Not intended for sale or use with pollution controlled vehicles\").")
    L.append("- Families: pages 15-44 `Small-block Chevy` (4.500\" bore-space blocks/heads → `Chevy 4.500 bore spacing small block`, "
             "as the Brodix extractor did), 45-62 `GM LS`, 63-91 both Chevy big-block families for heads and intakes (blocks: "
             "Big M / Big M2 / aluminum / Race Series = 2-pc rear seal → `Chevy Mark IV big block`; Big M Gen V / Gen VI = 1-pc "
             "seal → `Chevy Gen VI big block`; Big Chief 5.000\" bore-space head → `Chevy 5.0 bore spacing big block`; the 8.1L "
             "manifold → `Chevy Gen VII 8.1L big block`), 92-105 `Small-block Ford (Windsor)`, p14 Gen III Hemi blocks → "
             "`Chrysler Gen III Hemi 5.7/6.1` (non-VVT) or both Gen III Hemi families (VVT). Heads sold as a pair of families "
             "share one `p`.\n")
    L.append("## Records\n")
    L.append("| cat | records |\n|---|---|")
    for c, n in sorted(cats.items()):
        L.append(f"| {c} | {n} |")
    L.append(f"| **total** | {len(records)} |\n")
    L.append("### Records per family\n")
    L.append("| cat | family | records |\n|---|---|---|")
    for (c, f), n in sorted(fams.items(), key=lambda kv: (kv[0][0], -kv[1], kv[0][1])):
        L.append(f"| {c} | {f} | {n} |")
    L.append("")
    L.append("### Rows per page\n")
    L.append("| PDF page | printed | cat | records | distinct part numbers |\n|---|---|---|---|---|")
    for (pno, cat), (n, d) in sorted(counts_pages.items()):
        L.append(f"| {pno} | {pno - 2} | {cat} | {n} | {d} |")
    L.append("")
    L.append("## Families not in the fitment list (need a decision)\n")
    for f in sorted(set(r["fit"]["fam"] for r in records if r["fit"]["fam"] not in KNOWN_FAMS)):
        L.append(f"- `{f}` ({sum(1 for r in records if r['fit']['fam'] == f)} records)")
    L.append("")
    L.append("## Rows skipped\n")
    if not skipped:
        L.append("- none")
    for where, pn, why in skipped:
        L.append(f"- {where} {pn}: {why}")
    L.append("")
    L.append("## Needs human QA\n")
    for q in qa:
        L.append(f"- {q}")
    for (pno, reason), pns in sorted(qa_groups.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        pns = list(dict.fromkeys(pns))
        L.append(f"- p{pno}: {reason}: {', '.join(pns)}")
    L.append("")
    L.append("## Validation\n")
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family and category; numeric spec fields are "
             "numbers (inches as decimals, cc as numbers); no empty strings.\n")
    L.append("- passed")
    open(path, "w", encoding="utf-8").write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    import pdfplumber

    qa, skipped = [], []
    qa_groups = defaultdict(list)
    heads, blocks, intakes = [], [], []
    pages_seen = defaultdict(set)
    with pdfplumber.open(args.pdf) as pdf:
        if len(pdf.pages) != EXPECTED_PAGES:
            qa.append(f"PDF has {len(pdf.pages)} pages, expected {EXPECTED_PAGES}; page ranges in this script may be off")
        for pno in HEAD_PAGES:
            recs = parse_head_page(pdf.pages[pno - 1], pno, qa, skipped, args.debug)
            if recs:
                pages_seen["head"].add(pno)
            heads += recs
        for pno in BLOCK_PAGES:
            recs = parse_block_page(pdf.pages[pno - 1], pno, qa, skipped, args.debug)
            if recs:
                pages_seen["block"].add(pno)
            blocks += recs
        for pno in INTAKE_PAGES:
            recs = parse_intake_page(pdf.pages[pno - 1], pno, qa, skipped, args.debug)
            if recs:
                pages_seen["intake"].add(pno)
            intakes += recs

    # recommended intakes: keep only part numbers that exist as intake records
    intake_pns = {r["p"] for r in intakes}
    for r in heads:
        ri = r["spec"].get("recommendedIntakes")
        if ri:
            ri = [p for p in ri if p in intake_pns]
            if ri:
                r["spec"]["recommendedIntakes"] = ri
            else:
                del r["spec"]["recommendedIntakes"]

    # automatic QA notes (grouped per page)
    for r in heads:
        s, pno = r["spec"], r["src"]["page"]
        casting = s.get("casting") or ""
        if casting.startswith("C-core") or casting == "unported":
            continue
        if "flow" not in s:
            qa_groups[(pno, "no flow table printed for this configuration (" + s.get("flowNote", "none on the page") + ")")].append(r["p"])
        if s.get("chamberCc") is None:
            qa_groups[(pno, "chamber cc not resolved (" + s.get("note", "SPECS box lists several sizes and the row prints none") + ")")].append(r["p"])
        if s.get("intakeValve") is None or s.get("exhaustValve") is None:
            qa_groups[(pno, "valve sizes not resolved")].append(r["p"])
        if s.get("maxLift") is None and not s.get("bare"):
            qa_groups[(pno, "assembled head printed with `-` for max lift")].append(r["p"])
    by_page = defaultdict(list)
    for r in heads:
        if "flow" in r["spec"] and not r["spec"].get("flowNote"):
            by_page[r["src"]["page"]].append(r)
    for pno, rs in sorted(by_page.items()):
        combos = {(r["spec"].get("intakeRunnerCc"), r["spec"].get("intakeValve"), r["spec"].get("exhaustValve"), json.dumps(r["spec"]["flow"])) for r in rs}
        keys = {(c[0], c[1], c[2]) for c in combos}
        flows = {c[3] for c in combos}
        if len(keys) > 1 and len(flows) < len(keys):
            qa.append(f"p{pno}: the single flow table printed on the page is applied to {len(keys)} runner/valve combinations "
                      f"({', '.join(f'{k[0]}cc {k[1]}/{k[2]}' for k in sorted(keys, key=str))}); the catalog does not say which one it was measured on")
    qa.append("p28: part 10024364 / 10024364A sit on the 170cc late-model page but their heading reads `IRON EAGLE S/S 23° 165cc (55-86 Std. Face ...)`; "
              "recorded as printed (165cc, standard face) although the configuration says `Center bolt valve covers only`")
    qa.append("p67: the second Big M2 table is titled `BIG M2 - IRON - DUCTILE CAP` but its rows read `Big M2 Steel Cap` with the same part numbers "
              "as the ductile-cap table; only the first (ductile cap) rows are kept, the steel-cap part numbers are unknown")
    qa.append("p79: 19770000 (C-core) is printed under both the 409cc and the 451cc heading; kept once under 409cc")
    qa.append("p39: SPECS box prints `Exhaust Valve: .600\"/1.625\"` (typo for 1.600); valves were taken from the table headings")
    qa.append("p57: two unlabeled-looking flow tables; the one on the heading line is labeled `(SMC)` in the sidebar and is used for the SMC-port head only")
    qa.append("Derived numbers: block `mainJournal` and `camBore` come from the printed mains/cam designation (see Method), not from a printed dimension; "
              "intake `deckHeight` for `Std.` rows is the family's standard deck")

    records = dedupe(heads + blocks + intakes, qa_groups)
    problems = validate(records)
    if problems:
        for p in problems[:80]:
            print("VALIDATION:", p, file=sys.stderr)
        raise SystemExit(f"{len(problems)} validation problems")
    counts = {}
    for r in records:
        k = (r["src"]["page"], r["cat"])
        n, d = counts.get(k, (0, set()))
        d = set(d)
        d.add(r["p"])
        counts[k] = (n + 1, d)
    counts_pages = {k: (n, len(d)) for k, (n, d) in counts.items()}

    os.makedirs(OUT, exist_ok=True)
    out = OrderedDict([
        ("source", OrderedDict([("brand", BRAND), ("doc", DOC), ("file", SRC_FILE), ("edition", EDITION),
                                ("pages", EXPECTED_PAGES),
                                ("pagesUsed", "heads 27-42, 54-60, 70-89, 98-103; blocks 14, 17-26, 46-53, 64-69, 94-97; intakes 43, 61, 90, 104"),
                                ("network", "none (manual PDF)")])),
        ("extracted", dt.date.today().isoformat()),
        ("count", len(records)),
        ("parts", records),
    ])
    with open(os.path.join(OUT, "dart.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "dart.md"), records, qa, qa_groups, skipped, pages_seen, counts_pages)
    cats = Counter(r["cat"] for r in records)
    print(f"heads={cats['head']} blocks={cats['block']} intakes={cats['intake']} total={len(records)} "
          f"qa={len(qa) + len(qa_groups)} skipped={len(skipped)}")


if __name__ == "__main__":
    main()
