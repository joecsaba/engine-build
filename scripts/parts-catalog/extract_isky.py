#!/usr/bin/env python3
"""Extract Isky Racing Cams catalogs (manual PDFs in Catalogs/) into the shared parts record format.

Sources (no network; the owner downloaded the PDFs by hand):
  - Catalogs/IskyCatalog.pdf (186 pp, text layer; 2025 upload, contents copyright 2016)
      cam application pages 72-167 (+ marine 168-171, Mega-cam / Super-cam summaries 68-71)
      -> `cam` records with durations, lift, lash, RPM range, lobe center, lifter type and the
         facing page's "Recommended Valve Train Components" kit part numbers
      retainers pp 42-43 -> `retainer`; lifters pp 10, 13-15, 17-19, 21-25 -> `lifter`
  - Catalogs/ISKY-Valve-Spring-Spec-Book.pdf (20 pp, August 2009) -> `spring` records
  - Catalogs/Isky-Import-Catalog.pdf (19 pp) -> only parsed with --include-import (import makes)
  - Catalogs/ISKY-Master-Lobe-List.pdf has no text layer (scanned images) and is skipped.

Output: out/isky.json and out/isky.md. Writes nothing else. Run with `python -X utf8 -I`.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
CATALOGS = os.path.join(REPO, "Catalogs")
BRAND = "Isky"
MAIN_DEFAULT = os.path.join(CATALOGS, "IskyCatalog.pdf")
SPRINGS_DEFAULT = os.path.join(CATALOGS, "ISKY-Valve-Spring-Spec-Book.pdf")
IMPORT_DEFAULT = os.path.join(CATALOGS, "Isky-Import-Catalog.pdf")
LOBES_FILE = os.path.join(CATALOGS, "ISKY-Master-Lobe-List.pdf")

MAIN_EDITION = "2016 (PDF uploaded 2025-08)"
SPRING_EDITION = "2009-08"
MAIN_SRC = "Isky Racing Cams master catalog (IskyCatalog.pdf, 2025 upload; contents copyright 2016)"
SPRING_SRC = "Isky Valve Spring Spec Book (August 2009)"

CAM_PAGES = range(72, 168)
MARINE_PAGES = range(168, 172)
RETAINER_PAGES = (42, 43)

KNOWN_FAMS = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six",
}

NUMERIC_SPEC = (
    "durAdvInt", "durAdvExh", "dur050Int", "dur050Exh", "valveLiftInt", "valveLiftExh", "rr", "rrExh",
    "lsa", "lash", "lashExh", "rpmLow", "rpmHigh", "od", "id", "idInner", "installedHt", "coilBind",
    "seatLb", "openLb", "rate", "maxLift", "bodyDia", "rollerDia", "innerStepDia", "outerStepDia",
    "midStepDia", "stem", "pushrodLength", "seatLbMax", "openLbMax", "rpmLimit",
)


# ----------------------------------------------------------------------------------------------
# generic helpers
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def num(s):
    """'.436"' -> 0.436, '114°' -> 114, '1,200' -> 1200; None when not numeric."""
    if s is None:
        return None
    t = s.strip().rstrip('"”°º+#').replace(",", "")
    if re.fullmatch(r"-?\d*\.\d+|-?\d+", t):
        v = float(t)
        return int(v) if v.is_integer() and "." not in t else v
    return None


def page_spans(page):
    """Text spans with geometry: dicts with text, x0, y0, x1, y1, size, bold."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            for s in ln["spans"]:
                t = s["text"].replace(" ", " ").strip()
                if not t:
                    continue
                x0, y0, x1, y1 = s["bbox"]
                out.append({"text": t, "x0": x0, "y0": y0, "x1": x1, "y1": y1, "size": s["size"],
                            "bold": "Bold" in s["font"] or "bold" in s["font"]})
    out.sort(key=lambda s: (round(s["y0"]), s["x0"]))
    return out


def page_words(page):
    out = []
    for w in page.get_text("words"):
        x0, y0, x1, y1, t = w[:5]
        t = t.strip()
        if t:
            out.append({"text": t, "x0": x0, "y0": y0, "x1": x1, "y1": y1, "xc": (x0 + x1) / 2, "yc": (y0 + y1) / 2})
    out.sort(key=lambda w: (round(w["yc"]), w["x0"]))
    return out


def group_lines(items, tol=3.0, key="y0"):
    lines = []
    for s in sorted(items, key=lambda s: (s[key], s["x0"])):
        if lines and abs(s[key] - lines[-1]["y"]) <= tol:
            lines[-1]["items"].append(s)
        else:
            lines.append({"y": s[key], "items": [s]})
    for ln in lines:
        ln["items"].sort(key=lambda s: s["x0"])
        ln["text"] = " ".join(s["text"] for s in ln["items"])
    return lines


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
def families_for(make, heading):
    """-> list of (family, known) for a cam-page section heading. Unknown families keep the catalog's own words."""
    h = heading.upper()
    mk = make.upper()
    def U(name):
        return [(name, False)]
    if "AMERICAN MOTORS" in mk:
        if "6-CYL" in h or "6 CYL" in h:
            return [("AMC/Jeep inline-6", True)]
        return [("AMC V8", True)]
    if mk.startswith("BUICK"):
        if "400" in h and "455" in h:
            return [("Buick big block", True)]
        if "350" in h and "V-8" in h:
            return [("Buick 350", True)]
        if "1961-67" in h or "215" in h:
            return U("Buick 215/300/340 V8 (1961-67)")
        if "198-225" in h:
            return U("Buick V6 198-225 (1962-71)")
        if "V-6" in h or "V6" in h:
            return [("Buick V6 181-252", True)]
        return U("Buick " + heading)
    if mk.startswith("CORVAIR"):
        return U("Chevy Corvair flat-6")
    if mk.startswith("CHEVY II"):
        if "4 CYL" in h:
            return U("Chevy 153 inline-4")
        return [("Chevy inline-6", True)]
    if mk.startswith("CHEVROLET") or mk.startswith("CHEVY"):
        if "409" in h:
            return [("Chevy W-series 348/409", True)]
        if "292" in h and "6-CYL" in h:
            return [("Chevy inline-6", True)]
        if "LS-1" in h:
            return [("GM LS", True)]
        if "GEN 6" in h or "GEN. 6" in h or "1996-UP" in h:
            return [("Chevy Gen VI big block", True)]
        if "BIG BLOCK" in h or "396-402" in h:
            return [("Chevy Mark IV big block", True)]
        if "60°" in h or "173" in h or "2.8L" in h:
            return U("Chevy 60-degree V6 2.8/3.1")
        if "4.3L" in h or "262 CU" in h:
            return U("Chevy 90-degree V6 4.3")
        if "200-229" in h or "3.8L" in h:
            return U("Chevy 90-degree V6 200/229")
        if "CORVAIR" in h:
            return U("Chevy Corvair flat-6")
        if "SMALL BLOCK" in h or "LT-1" in h or "265-283" in h or "305-350" in h:
            return [("Small-block Chevy", True)]
        return U("Chevrolet " + heading)
    if "HEMI" in mk or ("MOPAR" in mk and "HEMI" in h):
        if "426" in h or "426" in mk:
            return [("Chrysler 426 Hemi", True)]
        return U("Chrysler early Hemi 331/354/392")
    if mk.startswith("CHRYS") or mk.startswith("MOPAR"):
        if "“B”" in h or '"B"' in h or "383" in h or "440" in h:
            return [("Mopar B/RB big block", True)]
        if "“A”" in h or '"A"' in h or "273" in h or "318" in h or "340" in h:
            return [("Mopar LA small block", True)]
        return U("Chrysler " + heading)
    if mk.startswith("FORD"):
        if "FLATHEAD" in h:
            return U("Ford flathead V8")
        if "2000CC" in h:
            return U("Ford 2.0 OHC (Pinto)")
        if "2300CC" in h:
            return U("Ford 2.3 OHC (Lima)")
        if "2600" in h or "2800" in h:
            return U("Ford Cologne V6 2.6/2.8")
        if "3.8L" in h or "232" in h:
            return U("Ford Essex V6 3.8")
        if "Y - BLOCK" in h or "Y-BLOCK" in h or "272-292-312" in h:
            return U("Ford Y-block V8")
        if "144-170-200" in h:
            return U("Ford 144-200 inline-6")
        if "240-300" in h:
            return [("Ford 240/300 inline-6", True)]
        if "250 CU" in h and "6 CYL" in h:
            return U("Ford 250 inline-6")
        if "CLEVELAND" in h or "BOSS-351" in h or "351M" in h:
            return [("Ford 351C/351M/400", True)]
        if "BOSS" in mk or "BOSS" in h:
            return [("Small-block Ford (Windsor)", True)]
        if "221-260-289-302" in h or "WINDSOR" in h or "302 H.O" in h:
            return [("Small-block Ford (Windsor)", True)]
        if "352-360" in h or "390" in h or "428" in h:
            return [("Ford FE", True)]
        if "429" in h or "460" in h:
            return [("Ford 429/460", True)]
        return U("Ford " + heading)
    if mk.startswith("INTERNATIONAL"):
        return U("International Harvester V8 304/345/392")
    if mk.startswith("OLDSMOBILE"):
        if "215" in h:
            return U("Olds/Buick 215 aluminum V8")
        return [("Oldsmobile V8", True)]
    if mk.startswith("PONTIAC"):
        if "151" in h or "IRON DUKE" in h:
            return U("Pontiac Iron Duke 151")
        return [("Pontiac V8", True)]
    return U(f"{make} {heading}".strip())


def marine_family(label):
    u = label.upper()
    if "BIG BLOCK CHEVY" in u:
        return ("Chevy Mark IV big block", True)
    if "SMALL BLOCK CHEVY" in u:
        return ("Small-block Chevy", True)
    if "OLDSMOBILE" in u:
        return ("Oldsmobile V8", True)
    if "429/460" in u:
        return ("Ford 429/460", True)
    return (label, False)


def summary_family(label):
    """Application labels of the Mega-cam (p71) and Super-cam (p68-69) summary tables."""
    u = label.upper().replace("  ", " ")
    rules = [
        ("SMALL BLOCK CHEVY", "Small-block Chevy"), ("CHEVY V8 SMALL BLOCK", "Small-block Chevy"),
        ("CHEVY V-8 SMALL BLOCK", "Small-block Chevy"), ("BIG BLOCK CHEVY", "Chevy Mark IV big block"),
        ("CHEVY V8 BIG BLOCK", "Chevy Mark IV big block"), ("CHEVY V-8 BIG BLOCK", "Chevy Mark IV big block"),
        ("FORD 429/460", "Ford 429/460"), ("429-460", "Ford 429/460"),
        ("FORD 360/390/428", "Ford FE"), ("330-360-390", "Ford FE"),
        ("FORD 289/302", "Small-block Ford (Windsor)"), ("221-260-289-302", "Small-block Ford (Windsor)"),
        ("351 WINDSOR", "Small-block Ford (Windsor)"),
        ("CLEVELAND", "Ford 351C/351M/400"), ("351/400", "Ford 351C/351M/400"),
        ("OLDS", "Oldsmobile V8"), ("PONTIAC", "Pontiac V8"),
        ("CHRYSLER “B”", "Mopar B/RB big block"), ("383-413-426-440", "Mopar B/RB big block"), ("383-440", "Mopar B/RB big block"),
        ("CHRYSLER “A”", "Mopar LA small block"), ("273-340", "Mopar LA small block"),
        ("AMERICAN MOTORS 6", "AMC/Jeep inline-6"), ("199-233-258", "AMC/Jeep inline-6"),
        ("BUICK V-6", "Buick V6 181-252"), ("BUICK V6", "Buick V6 181-252"),
        ("CHEVY II 6", "Chevy inline-6"), ("194-230-250", "Chevy inline-6"),
    ]
    for key, fam in rules:
        if key in u:
            return (fam, True)
    unknown = {
        "CHEVY V6, 90°": "Chevy 90-degree V6 200/229", "CHEVY V-6, 90°": "Chevy 90-degree V6 200/229",
        "CHEVROLET V6, 60°": "Chevy 60-degree V6 2.8/3.1", "CHEVROLET V-6, 60°": "Chevy 60-degree V6 2.8/3.1",
        "CHEVY II 4": "Chevy 153 inline-4", "BUICK V8 215": "Buick 215/300/340 V8 (1961-67)",
        "BUICK V8 1968": "Buick 350",
    }
    for key, fam in unknown.items():
        if key in u:
            return (fam, fam in KNOWN_FAMS)
    return (label, False)


def parse_ci(heading):
    """Displacement list from a heading: '265-283-302-305-307-327-350-400 cu. in.' -> [265, ...]."""
    h = heading.replace("*", "")
    out = []
    for m in re.finditer(r"(?<![\d.])(\d{3}(?:-\d{3})+|\d{3})(?=\s*(?:cu\.?\s*in|c\.i\.|Jeep|and|&|Cleveland|Windsor|Truck|Engines|engines|Even|Odd|“|\(|Gen|,|/|$))", h):
        for v in m.group(1).split("-"):
            v = int(v)
            if 140 <= v <= 520 and v not in out and not (1930 <= v):
                out.append(v)
    return out


def parse_years(heading):
    h = heading
    m = re.search(r"\(?(19\d\d)\s*(?:-|–|—|and|&)?\s*(up|UP|Up|later|\d\d|19\d\d)?\)?", h)
    if not m:
        return None, None
    y0 = int(m.group(1))
    y1 = None
    g = m.group(2)
    if g and g.isdigit():
        y1 = int(g) if len(g) == 4 else 1900 + int(g)
    if y1 is not None and y1 < y0:
        y1 = None
    return y0, y1


def parse_cyl(heading):
    h = heading.upper()
    if "V-8" in h or "V8" in h:
        return 8
    if re.search(r"6[- ]CYL|6 CYL|V-6|V6|FLAT-6|6-CYLINDER", h):
        return 6
    if re.search(r"4[- ]CYL|4 CYL|4-CYLINDER", h):
        return 4
    return None


# ----------------------------------------------------------------------------------------------
# cam application pages
# ----------------------------------------------------------------------------------------------
PN_RE = re.compile(r"^\*?(\d{3,6}[A-Z]{0,3}\d{0,2}(?:/\d{1,3})?(?:-\d{1,2})?(?:RAD)?|\d{3,4}[A-Z]?-[A-Z]{1,3}|\d{3,4}-[A-Z]{1,3}\d?)$")
NUM_RE = re.compile(r"(?:(\d{3,5})-(\d{4,5})\s+)?(\.\d{3})\s+(\.\d{3})\s+(\d{3})[°º]\s+(\d{3})[°º](?:\s+(\d{3})[°º])?")
GRIND_2ND = {"HL", "HYD", "MEGA", "MECH", "Supercam", "SUPERCAM", "Mega-cam", "Mega", "cam", "#1", "#2", "Super", "HYDRAULIC"}
TYPE_WORDS = {"HYDRAULIC", "SOLID", "ROLLER", "MECHANICAL", "RACE", "LIFTER"}
SIDEBAR_RE = re.compile(r"^(HYDRAULIC|SOLID|ROLLER|MECHANICAL|LIFTER|SERIES|Cast Iron Billet|Steel Billet|STEEL|BILLET|HI-REV SERIES|OVAL TRACK|STREET|&|STRIP|\(HYDRAULIC & SOLID\)|\(ROLLER\)|SOLID LIFTER|HYDRAULIC ROLLER)$")


RR_FALLBACK = {}  # family -> most common rr over the sections that print one (filled in main)
PN_COLUMN_LABELS = {
    124: ["three-bolt cam", "single-bolt cam"], 126: ["three-bolt cam", "single-bolt cam"],
    132: ["up to 1983, 2600cc", "up to 1983, 2800cc", "1984 & up, 2800cc"],
    134: ["1982-83", "1984 & up"], 138: ["1932-48 (21-A)", "1949-53 (8-BA)"], 166: ["3-bearing block", "5-bearing block"],
}


def cam_type_for(words, lash, grind, sidebar, qa, where):
    w = set(words)
    sb = set(sidebar)
    roller = "ROLLER" in w or (grind or "").upper().startswith("RR") or ("ROLLER" in sb and not (w & {"HYDRAULIC", "SOLID", "MECHANICAL"}) and "ROLLER" not in w and "SOLID" not in sb and "HYDRAULIC" not in sb and False)
    if not w and "ROLLER" in sb and not ({"SOLID", "MECHANICAL"} & sb):
        roller = True
    if "SOLID" in w or "MECHANICAL" in w:
        hyd = False
    elif "HYDRAULIC" in w:
        hyd = True
    elif lash is not None:
        hyd = lash == 0
    elif "HYDRAULIC" in sb and not ({"SOLID", "MECHANICAL"} & sb):
        hyd = True
    else:
        hyd = False
    if lash is not None and hyd and lash > 0:
        qa.append(f"{where}: typed hydraulic by the row's type word but lash is {lash}")
    if lash is not None and not hyd and lash == 0 and ("SOLID" in w or "MECHANICAL" in w):
        qa.append(f"{where}: typed solid by the row's type word but lash is .000")
    return ("hydraulic" if hyd else "solid") + ("_roller" if roller else "_flat")


def same_pn_shape(first, tok):
    """Second part-number column: '160125' after '165125', '817700' after '217700', '1601-TA' after '1651-TA', or a dash placeholder."""
    if tok in ("—", "N/A", "-"):
        return True
    f = first.lstrip("*")
    if re.match(r"^\d{5,6}", f):
        return bool(re.match(r"^\*?\d{5,6}", tok)) and len(re.sub(r"\D", "", tok)) >= 5
    if re.match(r"^\d{3,4}-[A-Z]", f):
        return bool(re.fullmatch(r"\d{3,4}-[A-Z]{1,3}\d?", tok)) and len(tok) == len(f)
    return False


def grind_from(tokens):
    """Tokens between the part number(s) and the numeric tail -> (grind, leftover)."""
    if not tokens:
        return None, []
    g = [tokens[0]]
    rest = tokens[1:]
    if rest and (rest[0] in GRIND_2ND or re.fullmatch(r"[A-Z]{2,5}(?:-[A-Z])?", rest[0]) or re.fullmatch(r"#\d", rest[0])):
        g.append(rest[0])
        rest = rest[1:]
    return " ".join(g), rest


def parse_section_rows(spans, y_top, y_bot, where, qa, skipped):
    """Spec rows inside one engine section. Returns rows (dicts) and the list of PN-column header lines."""
    sec = [s for s in spans if y_top <= s["y0"] < y_bot]
    # anchors: part-number spans in the left column
    anchors = []
    for s in sec:
        if s["x0"] < 46 and 7.5 <= s["size"] <= 10.5:
            tok = s["text"].split()[0]
            if PN_RE.match(tok) and not re.fullmatch(r"\d{2,3}", tok) and not re.fullmatch(r"(?:19|20)\d\d(?:-\d\d)?", tok):
                anchors.append(s)
    anchors.sort(key=lambda s: s["y0"])
    # de-duplicate anchors on the same y (dual PN columns inside one span are one anchor already)
    uniq = []
    for a in anchors:
        if uniq and abs(a["y0"] - uniq[-1]["y0"]) < 4:
            continue
        uniq.append(a)
    anchors = uniq
    # numeric lines that precede the first anchor belong to no part number
    first_y = anchors[0]["y0"] if anchors else y_bot
    for s in sec:
        if s["y0"] < first_y - 6 and NUM_RE.search(s["text"]) and s["x0"] < 200:
            skipped.append((where, "(no part number)", f"spec line '{s['text'].strip()[:60]}' has no part-number line above it"))
    # PN column header lines (e.g. 'Three  SIngle' / 'Bolt  Bolt', '1982-83  1984 &up')
    header_lines = []
    pn_hdr = [s for s in sec if s["x0"] < 60 and s["text"].startswith("Part No") and s["y0"] < first_y]
    if pn_hdr:
        for s in sec:
            if pn_hdr[0]["y0"] < s["y0"] < first_y - 4 and s["x0"] < 60 and s["size"] <= 9.5 and not NUM_RE.search(s["text"]) and not s["text"].startswith(("Cam Only", "Part No", "Grind", "Lift", "EX.", "INT.", "Valve", "PART NO")):
                header_lines.append(s["text"])
    rows = []
    for i, a in enumerate(anchors):
        y0 = a["y0"] - 6
        y1 = anchors[i + 1]["y0"] - 6 if i + 1 < len(anchors) else y_bot
        band = [s for s in sec if y0 <= s["y0"] < y1]
        # keep the row's own columns: left column words, bold type words, and numeric spec lines
        keep = []
        for s in band:
            prose = s["size"] < 8.95 and re.search(r"[a-z]", s["text"]) and len(s["text"].split()) >= 2 and s["x0"] > 60
            if NUM_RE.search(s["text"]):
                keep.append(s)
            elif prose:
                continue
            elif re.search(r"\d{3}[°º]", s["text"]) and s["x0"] < 560:
                keep.append(s)
            elif s["x0"] < 126 and s["size"] <= 10.6:
                keep.append(s)
        lines = group_lines(keep, tol=3.5)
        num_lines = [ln for ln in lines if NUM_RE.search(ln["text"])]
        if not num_lines:
            skipped.append((where, a["text"].split()[0], "part number without a spec line"))
            continue
        am = NUM_RE.search(a["text"])
        anchor_tokens = (a["text"][:am.start()] if am else a["text"]).split()
        pns = [anchor_tokens[0]]
        k = 1
        while k < len(anchor_tokens) and same_pn_shape(pns[0], anchor_tokens[k]):
            pns.append(anchor_tokens[k])
            k += 1
        grind_tokens = anchor_tokens[k:]
        type_words = []
        int_m = exh_m = None
        int_y = None
        for ln in lines:
            m = NUM_RE.search(ln["text"])
            toks = ln["text"][:m.start()].split() if m else ln["text"].split()
            if a in ln["items"]:
                toks = toks[len(anchor_tokens):]
            if m:
                if int_m is None:
                    int_m, int_y = m, ln["y"]
                    grind_tokens += [t for t in toks if t.upper() not in TYPE_WORDS]
                    type_words += [t for t in toks if t.upper() in TYPE_WORDS]
                elif exh_m is None:
                    exh_m = m
                    type_words += [t for t in toks if t.upper().rstrip(".") in TYPE_WORDS]
                else:
                    qa.append(f"{where} {pns[0]}: more than two spec lines in the row band; extra line ignored")
            else:
                tw = [t for t in toks if t.upper() in TYPE_WORDS]
                type_words += tw
                if int_y is None or ln["y"] <= int_y + 2:
                    grind_tokens += [t for t in toks if t.upper() not in TYPE_WORDS and t not in ("•",)]
        # a second part-number column printed as its own span
        while grind_tokens and same_pn_shape(pns[0], grind_tokens[0]) and not re.fullmatch(r"[A-Z]+", grind_tokens[0]):
            pns.append(grind_tokens.pop(0))
        grind, leftover = grind_from(grind_tokens)
        if leftover and len(leftover) <= 2 and not re.search(r"[a-z]{3}", " ".join(leftover)):
            grind = (grind + " " + " ".join(leftover)).strip()
            leftover = []
        rpm_lo, rpm_hi = num(int_m.group(1)), num(int_m.group(2))
        row = {
            "pns": pns, "grind": grind, "typeWords": sorted({t.upper().rstrip(".") for t in type_words}),
            "rpmLow": rpm_lo, "rpmHigh": rpm_hi,
            "liftInt": num(int_m.group(3)), "lashInt": num(int_m.group(4)),
            "advInt": num(int_m.group(5)), "d050Int": num(int_m.group(6)), "lc": num(int_m.group(7)),
            "y": a["y0"], "star": a["text"].startswith("*"),
        }
        if exh_m:
            row.update({"liftExh": num(exh_m.group(3)), "lashExh": num(exh_m.group(4)),
                        "advExh": num(exh_m.group(5)), "d050Exh": num(exh_m.group(6))})
            if exh_m.group(7) and row["lc"] is None:
                row["lc"] = num(exh_m.group(7))
        else:
            qa.append(f"{where} {pns[0]}: only one spec line (intake) found; exhaust values left empty")
        if leftover and not re.search(r"[a-z]{3}", " ".join(leftover)):
            qa.append(f"{where} {pns[0]}: unparsed tokens before the spec numbers: {' '.join(leftover)[:50]}")
        rows.append(row)
    return rows, header_lines


def section_header(spans, y_top, y_bot, make_span):
    """Heading text, sidebar tags and rocker-ratio statements of a section that starts at make_span."""
    sec = [s for s in spans if y_top <= s["y0"] < y_bot]
    first_row_y = y_bot
    for s in sec:
        if s["x0"] < 60 and s["text"].startswith("Part No"):
            first_row_y = s["y0"]
            break
    head = []
    for s in sec:
        if s is make_span or s["text"] == "•":
            continue
        if s["y0"] <= make_span["y0"] + 48 and s["x0"] > make_span["x1"] - 2 and 9.5 <= s["size"] <= 17.9 and "Rocker Ratio" not in s["text"] and s["text"] != "RACING CAMS":
            head.append(s)
    head.sort(key=lambda s: (round(s["y0"] / 6), s["x0"]))
    heading = " ".join(s["text"] for s in head)
    heading = re.sub(r"\s+", " ", heading).strip(" •")
    if not re.search(r"\d|Engine|ENGINE|Cyl", heading):
        # the engine line is printed elsewhere on the page (p98/p100 style) -> look for it anywhere in the section
        for s in sec:
            if s["x0"] > 95 and 10 <= s["size"] <= 13 and re.search(r"V-?8|V-?6|cu\. ?in|Cyl|ENGINE|Engine", s["text"]) and s["text"] != "RACING CAMS":
                heading = (heading + " " + s["text"]).strip()
                break
    sidebar = []
    for s in sec:
        if s["x0"] < 60 and s["y0"] < first_row_y and 9.5 <= s["size"] <= 18.5 and s is not make_span:
            t = s["text"].strip()
            if SIDEBAR_RE.match(t) or t.upper() in TYPE_WORDS:
                sidebar.append(t.upper())
    ratios = []
    for s in sec:
        if "Rocker Ratio" in s["text"] and s["size"] >= 14:
            for m in re.finditer(r"(\d\.\d+)\s*:\s*1", s["text"]):
                tag = "EXH" if "EX" in s["text"].split("Rocker Ratio")[-1] else ("INT" if "INT" in s["text"] else None)
                ratios.append((float(m.group(1)), tag, s["y0"]))
    # (HYDRAULIC & SOLID) / (ROLLER) labels next to two ratios (Iron Duke page)
    labels = [(s["y0"], s["text"]) for s in sec if s["x0"] < 60 and s["text"] in ("(HYDRAULIC & SOLID)", "(ROLLER)")]
    rr_by_kind = {}
    if labels and len(ratios) >= 2:
        for y, lab in labels:
            nearest = min(ratios, key=lambda r: abs(r[2] - y))
            rr_by_kind["roller" if "ROLLER" in lab else "flat"] = nearest[0]
    return heading, sidebar, ratios, rr_by_kind, first_row_y


def parse_cam_page(page, pno, qa, skipped):
    """-> list of sections: {make, heading, sidebar, ratios, rows, y_top, y_bot}."""
    spans = page_spans(page)
    makes = [s for s in spans if s["size"] >= 20 and s["x0"] < 100 and s["y0"] < 700]
    if pno in MARINE_PAGES:
        makes = [s for s in spans if s["size"] >= 16 and "Rocker Ratio" in s["text"]]
    sections = []
    page_bottom = 760
    for i, mk in enumerate(makes):
        y_top = mk["y0"] - 8
        y_bot = makes[i + 1]["y0"] - 8 if i + 1 < len(makes) else page_bottom
        if pno in MARINE_PAGES:
            m = re.match(r"^(.*?)\s{2,}(\d\.\d+)\s*:1 Rocker Ratio", mk["text"])
            label = m.group(1).strip() if m else mk["text"]
            ratios = [(float(m.group(2)), None, mk["y0"])] if m else []
            where = f"p{pno} {label}"
            rows, hdr = parse_section_rows(spans, y_top, y_bot, where, qa, skipped)
            sections.append({"make": "MARINE", "heading": label, "sidebar": [], "ratios": ratios, "rrByKind": {},
                             "rows": rows, "pnHeaders": hdr, "page": pno, "marine": True})
            continue
        heading, sidebar, ratios, rr_by_kind, first_row_y = section_header(spans, y_top, y_bot, mk)
        where = f"p{pno} {mk['text']}"
        rows, hdr = parse_section_rows(spans, max(y_top, first_row_y - 30) if first_row_y < y_bot else y_top, y_bot, where, qa, skipped)
        sections.append({"make": mk["text"], "heading": heading, "sidebar": sidebar, "ratios": ratios,
                         "rrByKind": rr_by_kind, "rows": rows, "pnHeaders": hdr, "page": pno, "marine": False})
    return sections


# ----------------------------------------------------------------------------------------------
# kit pages ("Recommended Valve Train Components")
# ----------------------------------------------------------------------------------------------
KIT_KINDS = [
    ("LIFTER", "lifters"), ("PUSHROD", "pushrods"), ("LOCAT", "springLocators"), ("SHIM", "shims"), ("SPRING", "springs"),
    ("RETAINER", "retainers"), ("STUD", "rockerStuds"), ("ARMS", "rockerArms"), ("POLY", "polyLocks"),
    ("TIMING", "timingSet"), ("SET", "timingSet"), ("VALVE LOCK", "valveLocks"), ("SEAL", "valveSeals"),
    ("REV", "revKit"), ("THRUST", "thrustBumper"), ("BUMP", "thrustBumper"), ("SPROCK", "lockPlate"), ("PLATE", "lockPlate"),
    ("GEAR", "distGear"), ("DIST", "distGear"), ("LOCKS", "valveLocks"),
]
PAGE_KIND = {"10-25": "lifters", "11-14": "lifters", "15-25": "lifters", "44-48": "pushrods", "27-41": "springs", "51": "shims",
             "42": "retainers", "42-43": "retainers", "43": "retainers", "49": "polyLocks", "56-57": "timingSet", "53": "valveLocks",
             "52": "valveSeals", "54": "revKit", "55": "thrustBumper", "56": "distGear", "57": "timingSet"}
KIT_PN_RE = re.compile(r"^\*?\d{3,6}[A-Z]{0,3}\d{0,2}(?:/\d{1,3})?(?:-\d{1,2})?(?:RAD)?$|^\d{3,4}-[A-Z]{2,3}$")


def parse_kit_page(page, pno, qa):
    """-> list of kit sections (same order as the facing spec page): {make, rows:[{kitPns:[..], cols:{kind: value}}]}."""
    spans = page_spans(page)
    words = page_words(page)
    makes = [s for s in spans if s["size"] >= 20 and s["x0"] < 100 and s["y0"] < 700]
    if pno in MARINE_PAGES:
        return []
    # footnote legend: lines like ' B      Requires cylinder heads be machined with Isky #568 Hole Saw'
    legend = {}
    for ln in group_lines([sp for sp in spans if sp["size"] <= 11 and sp["y0"] > 150], tol=3.0):
        text = "   ".join(sp["text"] for sp in ln["items"])
        for m in re.finditer(r"(?:^|\s{2,})([A-Z])\s+(?=[A-Z0-9#])(.*?)(?=\s{2,}[A-Z]\s+[A-Z0-9#]|$)", text):
            txt = re.sub(r"\s+\d{2,3}$", "", m.group(2).strip())
            if len(txt) > 6 and re.search(r"[a-z]", txt) and m.group(1) not in legend:
                legend[m.group(1)] = txt[:90]
    sections = []
    for i, mk in enumerate(makes):
        y_top = mk["y0"] - 8
        y_bot = makes[i + 1]["y0"] - 8 if i + 1 < len(makes) else 760
        ws = [w for w in words if y_top <= w["yc"] < y_bot]
        # column anchors: 'P.' page references
        anchors = []
        for j, w in enumerate(ws):
            if w["text"] in ("P.", "P") and j + 1 < len(ws) and re.fullmatch(r"\d{2}(?:-\d{2})?", ws[j + 1]["text"]) and abs(ws[j + 1]["yc"] - w["yc"]) < 3:
                anchors.append({"x": (w["x0"] + ws[j + 1]["x1"]) / 2, "y": w["yc"], "ref": ws[j + 1]["text"]})
            elif re.fullmatch(r"P\.\d{2}(?:-\d{2})?", w["text"]):
                anchors.append({"x": w["xc"], "y": w["yc"], "ref": w["text"][2:]})
        if not anchors:
            continue
        hdr_y = min(a["y"] for a in anchors)
        # kit P/N columns: 'KIT P/N' header pairs; else the 'P/N' word
        pn_cols = []
        for j, w in enumerate(ws):
            if w["text"] == "P/N" and w["yc"] < hdr_y + 4:
                pn_cols.append(w["xc"] - 8)
        if not pn_cols:
            pn_cols = [40.0]
        # header words above the anchors -> kind per anchor
        hdr_words = [w for w in ws if hdr_y - 34 <= w["yc"] < hdr_y - 2]
        cols = []
        for a in anchors:
            words_here = [w["text"].upper() for w in hdr_words if abs(w["xc"] - a["x"]) < 26]
            text = " ".join(words_here)
            kind = None
            for key, k in KIT_KINDS:
                if key in text:
                    kind = k
                    break
            if kind == "valveLocks" and "POLY" in text:
                kind = "polyLocks"
            if kind is None:
                kind = PAGE_KIND.get(a["ref"])
            if kind is None:
                qa.append(f"p{pno} kit table: column 'P. {a['ref']}' ({text}) has no known kind; ignored")
                continue
            cols.append({"x": a["x"], "kind": kind, "hdr": text})
        # header words that have no 'P.' reference under them (e.g. 'ALUMINUM RETAINERS' on p159) still make a column
        for w in hdr_words:
            t = w["text"].upper().rstrip(".")
            if t in ("LIFTERS", "PUSHRODS", "SPRINGS", "SHIMS", "RETAINERS", "SEALS") and all(abs(w["xc"] - c["x"]) > 30 for c in cols) and w["xc"] > min(pn_cols) + 60:
                cols.append({"x": w["xc"], "kind": {"LIFTERS": "lifters", "PUSHRODS": "pushrods", "SPRINGS": "springs", "SHIMS": "shims", "RETAINERS": "retainers", "SEALS": "valveSeals"}[t], "hdr": t})
        if not cols:
            continue
        first_col_x = min(c["x"] for c in cols)
        # which kit P/N column is the CL (cam & lifter) kit
        cl_col = None
        for k, x in enumerate(pn_cols):
            if any("LIFTER" in w["text"].upper() for w in hdr_words if abs(w["xc"] - x - 8) < 22):
                cl_col = k
        # rows: kit part numbers in the leftmost column region
        row_ws = [w for w in ws if w["yc"] > hdr_y + 6 and w["x0"] < min(110, first_col_x - 30) and KIT_PN_RE.match(w["text"]) and not re.fullmatch(r"\d{2,3}", w["text"])]
        rows = []
        for w in row_ws:
            if rows and abs(w["yc"] - rows[-1]["y"]) < 4:
                continue
            rows.append({"y": w["yc"]})
        # the legend / footer below the table ends the last row band
        legend_y = y_bot
        for ln in group_lines([s for s in spans if y_top <= s["y0"] < y_bot], tol=3.0):
            caps_note = len(re.findall(r"[A-Z]{4,}", ln["text"])) >= 3
            if rows and ln["y"] > rows[-1]["y"] + 4 and (re.match(r"^[A-Z]\s+[A-Z0-9#]", ln["text"]) or re.search(r"[a-z]{3,}", ln["text"]) or caps_note or any(it["size"] > 10.5 for it in ln["items"])):
                legend_y = min(legend_y, ln["y"] - 2)
        pitch = sorted(b["y"] - a["y"] for a, b in zip(rows, rows[1:]))
        pitch = pitch[len(pitch) // 2] if pitch else 30
        for r_i, r in enumerate(rows):
            y0 = r["y"] - 5
            y1 = rows[r_i + 1]["y"] - 5 if r_i + 1 < len(rows) else min(y_bot, legend_y, r["y"] + 1.6 * pitch)
            band = [w for w in ws if y0 <= w["yc"] < y1 and w["yc"] > hdr_y + 6]
            cells = defaultdict(list)
            kit_pns = {}
            for w in band:
                t = w["text"]
                if re.fullmatch(r"[A-Z]", t) or t in ("—", "-", "--", "N/A", "◊") or re.fullmatch(r"\(\d+\)|\(\d+|pcs\)|\(\d+pcs\)", t):
                    continue
                if w["xc"] < first_col_x - 20 and (KIT_PN_RE.match(t) or t.startswith("CL-")):
                    # which kit P/N column
                    ci = min(range(len(pn_cols)), key=lambda k: abs(pn_cols[k] - w["xc"])) if len(pn_cols) > 1 else 0
                    if t.startswith("CL-") or (cl_col is not None and ci == cl_col):
                        kit_pns.setdefault("camLifterKit", t if t.startswith("CL-") else "CL-" + t)
                    else:
                        kit_pns.setdefault(ci, t)
                    continue
                if w["xc"] < first_col_x - 20:
                    continue
                c = min(cols, key=lambda c: abs(c["x"] - w["xc"]))
                if abs(c["x"] - w["xc"]) > 45:
                    continue
                kind = c["kind"]
                if pno in (125, 127) and kind == "pushrods" and re.fullmatch(r"16[12]3", t):
                    kind = "timingSetByBoltPattern"  # floating 'TIMING SET three bolt / single bolt' block on the Chrysler B pages
                cells[kind].append(t)
            kit = {}
            foot = {}
            for kind, toks in cells.items():
                val = " ".join(toks).replace("# ", "#").replace("MINUS ", "-").replace("Minus ", "-").replace("Plus ", "+").strip()
                val = re.sub(r"\(\d+\)", "", val).strip()
                val, letters = strip_footnotes(val, legend)
                if letters:
                    foot[kind] = letters
                if val:
                    kit[kind] = val
            if foot:
                kit["footnotes"] = {k: [f"{l}: {legend[l]}" for l in v] for k, v in foot.items()}
            rows[r_i] = {"kitPns": [kit_pns.get(k) for k in range(len(pn_cols))], "camLifterKit": kit_pns.get("camLifterKit"), "kit": kit, "y": r["y"]}
        rows = [r for r in rows if "kit" in r and (any(r["kitPns"]) or r["kit"])]
        sections.append({"make": mk["text"], "rows": rows, "page": pno})
    return sections


PROTECTED_SUFFIX = ("RHM", "HYRT", "STA", "LRK", "TS", "HY", "ST", "TI", "SC", "VSL", "DGS", "TB", "LP", "TKA", "TKB", "BK", "HG", "AHY", "RH", "RT", "EZX", "H", "VSL")


def strip_footnotes(val, legend):
    """'8005-AB' with legend {B: ...} -> ('8005-A', ['B']); '300-TS N' -> ('300-TS', ['N']); '203-HGG' -> ('203-HG', ['G']).
    Real part numbers whose last letters form a known suffix (707-STA, 3672RHM, 3607-ST) are left alone."""
    letters = []
    parts = val.split()
    while len(parts) > 1 and re.fullmatch(r"[A-Z]", parts[-1]) and parts[-1] in legend:
        letters.insert(0, parts.pop())
    val = " ".join(parts)
    for _ in range(2):
        if not val or val[-1] not in legend:
            break
        rem = val[:-1]
        tail = re.search(r"[A-Z]+$", val)
        if tail and tail.group(0) in PROTECTED_SUFFIX:
            break
        if re.fullmatch(r"\d{3,4}|\d{3}/\d{3}|\d{3,4}-[A-Z]{1,2}|(?:VS|VL|PL|IVS)-[\d/]+|\d{3,4}-[A-Z]{1,3}-?\d{0,3}", rem):
            letters.insert(0, val[-1])
            val = rem
        else:
            break
    return val, letters


def match_kits(spec_rows, kit_rows, where, qa):
    """Pair kit-page rows with spec rows: by order when the counts agree, else by part-number suffix."""
    if not kit_rows:
        return
    if len(kit_rows) == len(spec_rows):
        for sr, kr in zip(spec_rows, kit_rows):
            sr["kit"] = kr
        return
    # suffix match: 201256 <-> 200256 ; 135125 <-> 134025/135025 ; 201SL1 <-> 200SL1 ; 201-TKA <-> 200-TKA
    def key(pn):
        pn = pn.lstrip("*")
        return re.sub(r"^\d{3}", "", pn)
    by_key = defaultdict(list)
    for kr in kit_rows:
        for kp in kr["kitPns"]:
            if kp:
                by_key[key(kp)].append(kr)
    matched = 0
    for sr in spec_rows:
        k = key(sr["pns"][0])
        cands = by_key.get(k) or by_key.get(k.replace("1", "0", 1))
        if cands:
            sr["kit"] = cands[0]
            matched += 1
    qa.append(f"{where}: {len(spec_rows)} cam rows vs {len(kit_rows)} kit rows; matched {matched} by part-number suffix")


# ----------------------------------------------------------------------------------------------
# cam records
# ----------------------------------------------------------------------------------------------
def rr_for(section, ctype):
    ratios = section["ratios"]
    by_kind = section.get("rrByKind") or {}
    if by_kind:
        return by_kind.get("roller" if ctype.endswith("roller") else "flat"), None
    if not ratios:
        return None, None
    ints = [r for r in ratios if r[1] == "INT"]
    exhs = [r for r in ratios if r[1] == "EXH"]
    if ints and exhs:
        return ints[0][0], exhs[0][0]
    return ratios[0][0], None


def cam_records(sections, qa, pdf_rel):
    recs = OrderedDict()  # (pn, fam) -> record
    for sec in sections:
        pno = sec["page"]
        heading = sec["heading"]
        if sec.get("marine"):
            fams = [marine_family(heading)]
            ci, y0, y1, cyl = [], None, None, 8
        else:
            fams = families_for(sec["make"], heading)
            ci = parse_ci(heading)
            y0, y1 = parse_years(heading)
            cyl = parse_cyl(heading)
        if len(sec["ratios"]) > 1 and not sec.get("rrByKind") and not any(r[1] for r in sec["ratios"]):
            qa.append(f"p{pno} {sec['make']}: several rocker ratios printed ({[r[0] for r in sec['ratios']]}); first used")
        material = "cast iron" if "CAST IRON BILLET" in sec["sidebar"] else ("steel billet" if ("STEEL BILLET" in sec["sidebar"] or ("STEEL" in sec["sidebar"] and "BILLET" in sec["sidebar"]) or "STEEL BILLET" in heading.upper()) else None)
        series = "oval track" if "OVAL TRACK" in sec["sidebar"] or "OVAL TRACK" in heading.upper() else None
        for row in sec["rows"]:
            where = f"p{pno} {row['pns'][0]}"
            ctype = cam_type_for(row["typeWords"], row["lashInt"], row["grind"], sec["sidebar"], qa, where)
            rr, rr_exh = rr_for(sec, ctype)
            rr_note = None
            if rr is None and fams and fams[0][0] in RR_FALLBACK:
                rr = RR_FALLBACK[fams[0][0]]
                rr_note = "rocker ratio not printed in this section; taken from the family's other sections of the catalog"
            kit = row.get("kit") or {}
            for ci_pn, pn in enumerate(row["pns"]):
                if pn in ("—", "N/A", "-"):
                    continue
                pn = pn.lstrip("*")
                col_note = None
                if len(row["pns"]) > 1:
                    labels = PN_COLUMN_LABELS.get(pno)
                    if labels and len(labels) == len(row["pns"]):
                        col_note = labels[ci_pn]
                    elif sec.get("pnHeaders"):
                        col_note = f"part-number column {ci_pn + 1} of {len(row['pns'])} (header: {' / '.join(sec['pnHeaders'])})"
                    else:
                        col_note = f"part-number column {ci_pn + 1} of {len(row['pns'])}"
                kit_pn = None
                if kit and kit.get("kitPns"):
                    kps = [k for k in kit["kitPns"] if k]
                    if len(kit["kitPns"]) == len(row["pns"]) and len(row["pns"]) > 1:
                        kit_pn = kit["kitPns"][ci_pn]
                    elif kps:
                        kit_pn = kps[0]
                spec = clean({
                    "durAdvInt": row["advInt"], "durAdvExh": row.get("advExh"),
                    "dur050Int": row["d050Int"], "dur050Exh": row.get("d050Exh"),
                    "valveLiftInt": row["liftInt"], "valveLiftExh": row.get("liftExh"),
                    "rr": rr, "rrExh": rr_exh, "rrNote": rr_note,
                    "lsa": row["lc"],
                    "lash": row["lashInt"], "lashExh": row.get("lashExh") if row.get("lashExh") != row["lashInt"] else None,
                    "type": ctype, "rpmLow": row["rpmLow"], "rpmHigh": row["rpmHigh"],
                    "grind": row["grind"], "material": material, "series": series,
                    "kitPn": kit_pn, "camLifterKitPn": kit.get("camLifterKit"),
                    "kit": clean(kit.get("kit") or {}) or None,
                })
                for fam, known in fams:
                    key = (pn, fam)
                    notes = []
                    if col_note:
                        notes.append(col_note)
                    if row.get("star"):
                        notes.append("marked * in the catalog: see the page note (variant available)")
                    if fam == "Small-block Ford (Windsor)" and "BOSS" in heading.upper():
                        notes.append("Boss 302 listing")
                    if sec.get("marine"):
                        notes.append("marine application page")
                    if key in recs:
                        prev = recs[key]
                        app = {"page": pno, "section": heading[:80], "rpmLow": row["rpmLow"], "rpmHigh": row["rpmHigh"]}
                        if kit_pn:
                            app["kitPn"] = kit_pn
                        if kit.get("kit"):
                            app["kit"] = clean(kit["kit"])
                        prev["spec"].setdefault("applications", [])
                        if not prev["spec"]["applications"]:
                            prev["spec"]["applications"].append({"page": prev["src"]["page"], "section": prev["src"].get("section", "")[:80], "rpmLow": prev["spec"].get("rpmLow"), "rpmHigh": prev["spec"].get("rpmHigh"), **({"kitPn": prev["spec"]["kitPn"]} if prev["spec"].get("kitPn") else {}), **({"kit": prev["spec"]["kit"]} if prev["spec"].get("kit") else {})})
                        prev["spec"]["applications"].append(app)
                        for k in ("durAdvInt", "durAdvExh", "dur050Int", "dur050Exh", "valveLiftInt", "valveLiftExh", "lsa", "type"):
                            if spec.get(k) != prev["spec"].get(k) and spec.get(k) is not None and prev["spec"].get(k) is not None:
                                qa.append(f"{pn} ({fam}): listed on p{prev['src']['page']} and p{pno} with different {k} ({prev['spec'].get(k)} vs {spec.get(k)}); first kept")
                        if sec.get("marine") and "marine application page" not in (prev["fit"].get("notes") or ""):
                            prev["fit"]["notes"] = ((prev["fit"].get("notes") + "; ") if prev["fit"].get("notes") else "") + "also listed on the marine page"
                        continue
                    name = f"{ctype.replace('_', ' ')} cam, {row['grind'] or 'grind n/a'}, {row['d050Int']}/{row.get('d050Exh') or row['d050Int']} @ .050, {row['lc']} LC"
                    recs[key] = {
                        "m": BRAND, "p": pn, "cat": "cam", "name": name,
                        "fit": clean({"fam": fam, "ci": ci or None, "cyl": cyl, "y0": y0, "y1": y1, "notes": "; ".join(notes) or None}),
                        "spec": dict(spec),
                        "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": pno, "section": f"{sec['make']} • {heading}".strip(" •")[:120]},
                        "emissions": None, "_known": known,
                    }
    return list(recs.values())


# ----------------------------------------------------------------------------------------------
# summary tables p68-71 (Super-cams, Mega-cams): supplement for part numbers not on the engine pages
# ----------------------------------------------------------------------------------------------
def parse_summary_pages(doc, qa):
    rows = []
    # p71 Mega-cams: label? camPN kitPN grind Hyd. lift adv 050 LC
    p71 = re.compile(r"(\d{6})\s+(\d{6})\s+(\d{3}-Mega[- ]cam)\s+Hyd\.\s+(\.\d{3})[”\"]\s+(\d{3})°\s+(\d{3})°\s+(\d{3})°")
    page = doc[70]
    label = None
    for ln in group_lines(page_spans(page), tol=3.5):
        t = ln["text"]
        m = p71.search(t)
        pre = t[:m.start()].strip() if m else t.strip()
        if m:
            if pre and not re.fullmatch(r"[\d\s]*", pre):
                label = pre
            rows.append({"page": 71, "label": label, "pn": m.group(1), "kitPn": m.group(2), "grind": m.group(3), "lift": num(m.group(4)),
                         "adv": num(m.group(5)), "d050": num(m.group(6)), "lc": num(m.group(7)), "type": "hydraulic_flat"})
        elif re.search(r"[A-Za-z]", t) and len(t) < 40 and not t.startswith(("APPLICATION", "CAM", "ISKY", "All Cam", "PART")):
            # continuation of a wrapped application label ('Single Bolt', '“3-Bolt”', 'Cleveland V8', '360 V8')
            if label and rows and rows[-1]["label"] == label and t.strip() not in label:
                label = label + " " + t.strip()
                rows[-1]["label"] = label
    # p68 single-pattern Super-cams: PN grind lift adv LC lifter timing  (grind = '256 Supercam')
    p68 = re.compile(r"(\*?\d{6})\s+(\d{3} Super ?cam)\s+(\.\d{3})\s+(\d{3})°\s+(\d{3})°(?:\s+(\d{3,4}-?[A-Z]{1,3}))?(?:\s+(\d{3,4}-?[A-Z]{2,3}|N/A))?")
    label = None
    for ln in group_lines(page_spans(doc[67]), tol=3.5):
        t = ln["text"]
        m = p68.search(t)
        if m:
            pre = t[:m.start()].strip()
            if pre:
                label = pre
            rows.append({"page": 68, "label": label, "pn": m.group(1).lstrip("*"), "grind": m.group(2), "lift": num(m.group(3)), "adv": num(m.group(4)),
                         "lc": num(m.group(5)), "lifters": m.group(6), "timingSet": m.group(7) if m.group(7) != "N/A" else None, "type": "hydraulic_flat"})
        elif re.search(r"[A-Za-z]", t) and len(t) < 40 and rows and rows[-1]["page"] == 68 and not t.startswith(("APPLICATION", "PART")):
            label = (label or "") + " " + t.strip()
            rows[-1]["label"] = label.strip()
    # p69 dual-pattern Super-cams: line 1 'PN 256/262 .425 256° 110° lifter timing', line 2 'HYD .435 262°'
    p69a = re.compile(r"(\d{6}/\d{2,3})\s+(256/262)\s+(\.\d{3})\s+(\d{3})°\s+(\d{3})°(?:\s+(\d{3,4}-?[A-Z]{1,3}))?(?:\s+(\d{3,4}-?[A-Z]{2,3}|N/A))?")
    p69b = re.compile(r"HYD\s+(\.\d{3})\s+(\d{3})°")
    label = None
    last = None
    for ln in group_lines(page_spans(doc[68]), tol=3.5):
        t = ln["text"]
        m = p69a.search(t)
        if m:
            pre = t[:m.start()].strip()
            label = pre or label
            last = {"page": 69, "label": label, "pn": m.group(1), "grind": m.group(2), "lift": num(m.group(3)), "adv": num(m.group(4)),
                    "lc": num(m.group(5)), "lifters": m.group(6), "timingSet": m.group(7) if m.group(7) != "N/A" else None, "type": "hydraulic_flat"}
            rows.append(last)
            continue
        m2 = p69b.search(t)
        if m2 and last:
            last["liftExh"], last["advExh"] = num(m2.group(1)), num(m2.group(2))
            pre = t[:m2.start()].strip()
            if pre and last["label"] and pre not in last["label"]:
                last["label"] = last["label"] + " " + pre
    return rows


def summary_records(rows, existing, qa, pdf_rel, rr_by_fam):
    """Records for summary-table part numbers that have no engine-page listing; kit PNs for those that do."""
    out = []
    for r in rows:
        fam, known = summary_family(r["label"] or "")
        key = (r["pn"], fam)
        if key in existing:
            rec = existing[key]
            if r.get("kitPn") and not rec["spec"].get("kitPn"):
                rec["spec"]["kitPn"] = r["kitPn"]
            if r.get("lifters") and not (rec["spec"].get("kit") or {}).get("lifters"):
                rec["spec"].setdefault("kit", {})["lifters"] = r["lifters"]
            if r.get("timingSet") and not (rec["spec"].get("kit") or {}).get("timingSet"):
                rec["spec"].setdefault("kit", {})["timingSet"] = r["timingSet"]
            continue
        # the same cam may be listed on the engine pages under a different family string: skip if any family has it
        if any(k[0] == r["pn"] for k in existing):
            continue
        rr = rr_by_fam.get(fam)
        spec = clean({
            "durAdvInt": r["adv"], "durAdvExh": r.get("advExh", r["adv"]),
            "dur050Int": r.get("d050"), "dur050Exh": r.get("d050"),
            "valveLiftInt": r["lift"], "valveLiftExh": r.get("liftExh", r["lift"]),
            "rr": rr, "lsa": r["lc"], "lash": 0, "type": r["type"], "grind": r["grind"],
            "kitPn": r.get("kitPn"), "kit": clean({"lifters": r.get("lifters"), "timingSet": r.get("timingSet")}) or None,
        })
        notes = f"from the p{r['page']} summary table only (no engine-page listing); exhaust values assumed equal to intake for single-pattern grinds" if r["page"] != 69 else "from the p69 dual-pattern Super-cam table only"
        if rr:
            notes += f"; rr taken from this family's engine pages"
        out.append({
            "m": BRAND, "p": r["pn"], "cat": "cam",
            "name": f"hydraulic flat cam, {r['grind']}, {r['adv']}/{r.get('advExh', r['adv'])} adv, {r['lc']} LC",
            "fit": clean({"fam": fam, "notes": notes}),
            "spec": spec,
            "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": r["page"], "section": (r["label"] or "")[:80]},
            "emissions": None, "_known": known,
        })
        existing[key] = out[-1]
    return out


# ----------------------------------------------------------------------------------------------
# spring spec book
# ----------------------------------------------------------------------------------------------
SPRING_LABELS = ["O.D. Outer", "I.D. Outer", "I.D. Inner", "Installed Height", "Max Net Valve Lift", "Spring Rate", "Type", "Color Code", "Damper", "Material"]
RETAINER_LABELS = ["7o Titanium Retainer 5/16", "7o Titanium Retainer 11/32", "7o Titanium Retainer 3/8", "10o Titanium Retainer",
                   "Super 7o Titanium Retainer", "7o Steel Retainer 5/16", "7o Steel Retainer 11/32", "7o Steel Retainer 3/8",
                   "10o Steel Retainer", "Super 7o Steel Retainer", 'Spring O.D. Cup .630"', 'Spring I.D. locater .570"', 'Spring I.D. locater .630"']


def parse_spring_book(path, qa):
    import pymupdf
    doc = pymupdf.open(path)
    cols = []
    for pno in range(3, len(doc) + 1):
        lines = [l.strip() for l in doc[pno - 1].get_text("text").splitlines()]
        lines = [l for l in lines if l]
        try:
            i = lines.index("Part No.")
        except ValueError:
            qa.append(f"spring book p{pno}: no 'Part No.' row; page skipped")
            continue
        j = lines.index("O.D. Outer")
        pns = lines[i + 1:j]
        n = len(pns)
        if n == 0 or n > 6:
            qa.append(f"spring book p{pno}: {n} part-number cells; page skipped")
            continue
        data = {pn: {"pn": pn, "page": pno, "col": k + 1, "loads": OrderedDict(), "retainers": []} for k, pn in enumerate(pns)}
        pos = j
        def take(label):
            nonlocal pos
            if lines[pos] != label:
                return None
            vals = lines[pos + 1:pos + 1 + n]
            pos += 1 + n
            return vals
        for lab in SPRING_LABELS:
            vals = take(lab)
            if vals is None:
                qa.append(f"spring book p{pno}: expected '{lab}' at line {pos}, found '{lines[pos]}'")
                break
            for pn, v in zip(pns, vals):
                data[pn][lab] = v
        # load rows: '2.250"' values... '2.250" '
        while pos < len(lines) and re.fullmatch(r'\d\.\d{3}"', lines[pos]):
            h = lines[pos][:-1]
            vals = lines[pos + 1:pos + 1 + n]
            pos += 1 + n
            if pos < len(lines) and lines[pos].startswith(h):
                pos += 1
            for pn, v in zip(pns, vals):
                if v != "-":
                    data[pn]["loads"][h] = num(v)
        vals = take("Coil Bind")
        if vals:
            for pn, v in zip(pns, vals):
                data[pn]["Coil Bind"] = v
        else:
            qa.append(f"spring book p{pno}: 'Coil Bind' row not where expected")
        for lab in RETAINER_LABELS:
            if pos < len(lines) and lines[pos] == lab:
                vals = take(lab)
                for pn, v in zip(pns, vals):
                    if v != "-":
                        data[pn]["retainers"].append({"pn": v, "kind": lab.replace("7o", "7°").replace("10o", "10°")})
        cols.extend(data.values())
    return cols


def interp(loads, h):
    """Load at height h from the tabulated loads (exact or linear between neighbours). -> (value, exact)."""
    pts = sorted(((float(k), v) for k, v in loads.items() if v is not None), reverse=True)
    for k, v in pts:
        if abs(k - h) < 1e-6:
            return v, True
    above = [(k, v) for k, v in pts if k > h]
    below = [(k, v) for k, v in pts if k < h]
    if above and below:
        k1, v1 = above[-1]
        k0, v0 = below[0]
        return round(v1 + (v0 - v1) * (k1 - h) / (k1 - k0)), False
    return None, False


def spring_records(cols, fams_by_pn, qa, path_rel):
    out = []
    for c in cols:
        pn = c["pn"]
        od, idd, idi = num(c.get("O.D. Outer")), num(c.get("I.D. Outer")), num(c.get("I.D. Inner"))
        inst = num(c.get("Installed Height"))
        ml_raw = c.get("Max Net Valve Lift") or ""
        ml = num(ml_raw.split("/")[0]) if ml_raw else None
        rate_raw = c.get("Spring Rate") or ""
        rate = num(rate_raw.split("/")[0]) if rate_raw else None
        cb = num(c.get("Coil Bind"))
        typ = (c.get("Type") or "").lower()
        seat, seat_exact = interp(c["loads"], inst) if inst else (None, False)
        open_lb, open_exact = (interp(c["loads"], round(inst - ml, 3)) if inst and ml else (None, False))
        spec = clean({
            "od": od, "id": idd, "idInner": idi, "installedHt": inst, "maxLift": ml,
            "maxLiftNote": f"catalog prints {ml_raw}" if "/" in ml_raw else None,
            "rate": rate, "rateNote": f"catalog prints {rate_raw}" if "/" in rate_raw else None,
            "coilBind": cb, "seatLb": seat, "openLb": open_lb,
            "openLbNote": None if open_lb is None else ("load table value at installed height - max net lift" if open_exact else "interpolated from the load table at installed height - max net lift"),
            "seatLbNote": None if seat is None or seat_exact else "interpolated from the load table at the installed height",
            "type": typ or None, "dual": typ in ("dual", "triple") if typ else None,
            "damper": {"YES": True, "NO": False}.get((c.get("Damper") or "").upper()),
            "colorCode": c.get("Color Code"), "material": c.get("Material"),
            "loads": OrderedDict((k, v) for k, v in c["loads"].items()) or None,
            "retainers": c["retainers"] or None,
        })
        if seat is None and inst:
            qa.append(f"spring {pn}: installed height {inst} outside the tabulated load range; seatLb empty")
        fams = fams_by_pn.get(pn) or fams_by_pn.get(pn.replace("-", " ")) or [("Universal", False)]
        for fam, known in fams:
            out.append({
                "m": BRAND, "p": pn, "cat": "spring",
                "name": f"{typ or 'valve'} spring, {od} OD, {inst} installed, {seat}/{open_lb} lb" if seat else f"{typ or 'valve'} spring, {od} OD, {inst} installed",
                "fit": clean({"fam": fam, "notes": "family from the cam kits that recommend this spring" if fam != "Universal" else "no engine family stated in the spring spec book"}),
                "spec": dict(spec),
                "src": {"doc": SPRING_SRC, "edition": SPRING_EDITION, "file": path_rel, "page": c["page"], "column": c["col"]},
                "emissions": None, "_known": known if fam != "Universal" else True,
            })
    return out


# ----------------------------------------------------------------------------------------------
# retainers pp 42-43
# ----------------------------------------------------------------------------------------------
RET_PN_RE = re.compile(r"^(\*?\d{2,4}-(?:ST|STA|Ti|TI|TI/10|ST/10)(?:\s*DEG)?(?:/10 DEG)?)\b")
STEM = {"5/16": 0.3125, "11/32": 0.34375, "3/8": 0.375}


def parse_retainers(doc, qa, pdf_rel):
    out = []
    for pno in RETAINER_PAGES:
        text = doc[pno - 1].get_text("text")
        lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines()]
        lines = [l for l in lines if l]
        # table region: from the header 'PART NO. SIZE APPLICATION ...' to '* 10 DEGREE VALVE LOCKS'
        try:
            start = next(i for i, l in enumerate(lines) if l.startswith("PART NO.") and "SIZE" in l)
        except StopIteration:
            qa.append(f"p{pno}: retainer table header not found")
            continue
        stop = next((i for i, l in enumerate(lines) if l.startswith("* 10 DEGREE")), len(lines))
        rows, cur = [], None
        for l in lines[start + 1:stop]:
            m = re.match(r"^(\*?\d{2,4}-(?:STA|ST|Ti|TI))(/10 DEG)?\s+(5/16|11/32|3/8|ALL)\s+(.*)$", l)
            if m:
                cur = {"pn": (m.group(1) + (m.group(2) or "")).lstrip("*"), "stem": m.group(3), "text": m.group(4), "page": pno, "ten": bool(m.group(2))}
                rows.append(cur)
            elif cur:
                cur["text"] += " " + l
        material = "4130 chrome moly steel" if pno == 42 else "titanium"
        for r in rows:
            t = r["text"]
            dims = {}
            for m in re.finditer(r"(\.\d{3})\s*\((I|O|M)\)", t):
                dims[m.group(2)] = num(m.group(1))
            locks = sorted(set(re.findall(r"\*?VL-[\w/-]+", t)))
            # application segment = text before the first dimension, plus text between dims on later lines
            seg = re.split(r"\.\d{3}\s*\((?:I|O|M)\)", t)
            app_text = " ".join(s for s in seg)
            app_text = re.sub(r"\*?VL-[\w/-]+|N/A|\b5/16\b|\b11/32\b|\b3/8\b|\(Bead lock on late model|LS-1 Small Block Chevy V8\)", " ", app_text)
            springs, notes = [], []
            for tok in [x.strip() for x in re.split(r",|\s{1,}", app_text) if x.strip()]:
                if re.fullmatch(r"\d{3,4}(?:-[A-Z]{1,2})?(?:/\d{2,3})?(?:-SP|-PLUS|-D|-DO|-DR)?|\d{3,4}", tok):
                    if not re.fullmatch(r"19\d\d", tok):
                        springs.append(tok)
                elif tok in ("PLUS", "+", "--") and springs:
                    springs[-1] = springs[-1] + (" PLUS" if tok == "PLUS" else "")
                else:
                    notes.append(tok)
            note = " ".join(notes).strip(" .")
            note = re.sub(r"\s+", " ", note)
            spec = clean({
                "material": material, "stem": STEM.get(r["stem"]), "stemNote": "all stem sizes (lock-dependent)" if r["stem"] == "ALL" else None,
                "lockAngle": 10 if r["ten"] else 7, "innerStepDia": dims.get("I"), "outerStepDia": dims.get("O"), "midStepDia": dims.get("M"),
                "locks": locks or None, "fitsSprings": springs or None,
            })
            out.append({
                "m": BRAND, "p": r["pn"], "cat": "retainer",
                "name": f"{'titanium' if pno == 43 else 'steel'} retainer, {r['stem']} stem, {dims.get('O')} OD step" if dims.get("O") else f"{'titanium' if pno == 43 else 'steel'} retainer, {r['stem']} stem",
                "fit": clean({"fam": "Universal", "notes": ("retainer; fitment is by spring part number" + (f"; catalog note: {note}" if note else ""))}),
                "spec": spec,
                "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": pno},
                "emissions": None, "_known": True,
            })
    return out


# ----------------------------------------------------------------------------------------------
# lifters pp 10, 13-15, 17-19, 21-25
# ----------------------------------------------------------------------------------------------
def lifter_fams(text):
    u = text.upper()
    fams = []
    def add(f, known=True):
        if (f, known) not in fams:
            fams.append((f, known))
    if "LS-1" in u or "LS1" in u:
        add("GM LS")
    if "SMALL BLOCK CHEVY" in u or "SMALL BLOCK" in u and "CHEVY" in u or ("CHEVROLET" in u and "V-8" in u and "409" not in u):
        add("Small-block Chevy")
    if ("BIG BLOCK" in u and "CHEVY" in u) or ("CHEVROLET" in u and "V-8" in u and "409" not in u and "SMALL" not in u):
        add("Chevy Mark IV big block")
    if "409" in u:
        add("Chevy W-series 348/409")
    if "PONTIAC" in u and "151" not in u and "4-CYL" not in u:
        add("Pontiac V8")
    if "OLDS" in u:
        add("Oldsmobile V8")
    if "429" in u or "460" in u:
        add("Ford 429/460")
    if re.search(r"289|302|351", u) and "FORD" in u:
        add("Small-block Ford (Windsor)")
    if "CLEVELAND" in u:
        add("Ford 351C/351M/400")
    if "352" in u or "390" in u or "428" in u or "FE" in u.split():
        add("Ford FE")
    if "240-300" in u:
        add("Ford 240/300 inline-6")
    if "HEMI" in u:
        add("Chrysler 426 Hemi")
    if "“B”" in u or '"B"' in u or "383-440" in u or "440" in u:
        add("Mopar B/RB big block")
    if "“A”" in u or '"A"' in u or "273-318-340-360" in u or "318" in u:
        add("Mopar LA small block")
    if "ALL CHRYSLER" in u:
        add("Mopar LA small block"); add("Mopar B/RB big block"); add("Chrysler 426 Hemi")
    if "ALL FORD V-8" in u:
        add("Small-block Ford (Windsor)"); add("Ford 351C/351M/400"); add("Ford FE"); add("Ford 429/460")
    if "230-250" in u or "IN-LINE 6" in u:
        add("Chevy inline-6")
    if "144-170-200" in u:
        add("Ford 144-200 inline-6", False)
    if "V-6" in u and "CHEVY" in u:
        add("Chevy 90-degree V6 200/229", False)
    return fams


def parse_lifters(doc, qa, skipped, pdf_rel):
    out = []
    # p10: 'Part No. Description' lists
    text10 = [re.sub(r"\s+", " ", l).strip() for l in doc[9].get_text("text").splitlines()]
    text10 = [l for l in text10 if l]
    rows, cur = [], None
    for l in text10:
        m = re.match(r"^(SO \d{3}H|\d{3,4}(?:-A)?-HY|\d{3,4}-H)\s+(.*)$", l)
        if m:
            cur = {"pn": m.group(1), "desc": m.group(2)}
            rows.append(cur)
        elif cur and (l.startswith(("Plus", "*", "Lincoln", "Ford", "Pontiac", "Chevy")) and len(l) < 70):
            cur["desc"] += " " + l
        else:
            cur = None
    for r in rows:
        style = "hydraulic_flat" if r["pn"].endswith("HY") else "solid_flat"
        body = num(re.search(r"\((\.\d{3})[”\"] dia", r["desc"]).group(1)) if re.search(r"\((\.\d{3})[”\"] dia", r["desc"]) else None
        fams = lifter_fams(r["desc"]) or [("Universal", True)]
        for fam, known in fams:
            out.append({"m": BRAND, "p": r["pn"], "cat": "lifter", "name": f"{style.replace('_', ' ')} lifter, set of 16",
                        "fit": clean({"fam": fam, "notes": r["desc"][:120]}),
                        "spec": clean({"style": style, "bodyDia": body, "qty": 16, "specialOiling": True if r["pn"].startswith("SO") else None}),
                        "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": 10}, "emissions": None, "_known": known})
    # p13-14: HPx hydraulic rollers (12 pt rows: PN, application (1-2 spans), pushrod, seat/open, rpm)
    for pno, series in ((13, "HPx Silver (needle bearing)"), (14, "HPx Gold (EZ-Roll)")):
        spans = [s for s in page_spans(doc[pno - 1]) if 11.5 <= s["size"] <= 12.5]
        anchors = [s for s in spans if re.fullmatch(r"\d{4}-HYRT", s["text"])]
        for i, a in enumerate(anchors):
            y1 = anchors[i + 1]["y0"] - 3 if i + 1 < len(anchors) else a["y0"] + 30
            band = [s for s in spans if a["y0"] - 3 <= s["y0"] < y1 and s is not a]
            app = " ".join(s["text"] for s in band if 150 <= s["x0"] < 283 and not re.search(r"203-|”|int/", s["text"]))
            push = " ".join(s["text"] for s in band if 270 <= s["x0"] < 400 and re.search(r"203-|”|int/", s["text"]))
            loads = next((s["text"] for s in band if re.fullmatch(r"\d{3}/\d{3}#", s["text"])), None)
            rpm = next((s["text"] for s in band if "RPM" in s["text"]), None)
            if not app:
                app = "application text not read"
                qa.append(f"p{pno} lifter {a['text']}: application column not read; family Universal")
            fams = lifter_fams(app) or [("Universal", True)]
            seat, opn = (num(loads.split("/")[0]), num(loads.split("/")[1])) if loads else (None, None)
            for fam, known in fams:
                out.append({"m": BRAND, "p": a["text"], "cat": "lifter", "name": f"hydraulic roller lifter, {series}",
                            "fit": clean({"fam": fam, "notes": app}),
                            "spec": clean({"style": "hydraulic_roller", "series": series, "pushrod": push or None, "seatLbMax": seat, "openLbMax": opn,
                                           "rpmLimit": num(rpm.split()[0]) if rpm else None, "linkBar": True}),
                            "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": pno}, "emissions": None, "_known": known})
    # p15: Durathon solid rollers
    for l in doc[14].get_text("text").splitlines():
        m = re.match(r"^\s*(.+?)\s+(\d{3,4}-RHM?)\s+(Centerline.*)$", re.sub(r"\s+", " ", l))
        if m:
            fams = lifter_fams(m.group(1)) or [(m.group(1), False)]
            for fam, known in fams:
                out.append({"m": BRAND, "p": m.group(2), "cat": "lifter", "name": "solid roller lifter, Durathon, .842 body",
                            "fit": clean({"fam": fam, "notes": m.group(1)}),
                            "spec": {"style": "solid_roller", "series": "Durathon", "bodyDia": 0.842, "linkBar": True, "pushrodSeat": m.group(3).split("(")[0].strip().lower()},
                            "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": 15}, "emissions": None, "_known": known})
    # p17-19, 21-25: Red Zone solid rollers (PN | body dia | roller dia | body type | pushrod | length | rev kit)
    base_app = {}
    row_re = re.compile(r"^(\.\d{3})[”\"]\s+(\.?\d{3})[”\"]\s+(STEEL “[AB]”|ALUMINUM TOP|STEEL)\s*(.*)$")
    for pno in (17, 18, 19, 21, 22, 23, 24, 25):
        spans = page_spans(doc[pno - 1])
        labels = [s for s in spans if s["x0"] < 75 and 9.6 <= s["size"] <= 10.6 and s["y0"] > 60 and not s["text"].startswith("(") and s["text"].isupper()]
        # group adjacent label spans into blocks
        blocks = []
        for s in sorted(labels, key=lambda s: s["y0"]):
            if blocks and s["y0"] - blocks[-1]["y1"] < 14:
                blocks[-1]["text"] += " " + s["text"]
                blocks[-1]["y1"] = s["y1"]
            else:
                blocks.append({"text": s["text"], "y0": s["y0"], "y1": s["y1"]})
        pn_spans = [s for s in spans if 150 <= s["x0"] <= 175 and 8.5 <= s["size"] <= 9.5 and re.fullmatch(r"\d{3,4}[-A-Z0-9/]*", s["text"]) and re.search(r"[A-Z]|-\d{3}", s["text"])]
        series = "Red Zone" + (" EZ-Roll X" if pno in (21, 22, 23) else (" EZ-Roll Max" if pno in (24, 25) else ""))
        for a in pn_spans:
            vals = [s for s in spans if abs(s["y0"] - a["y0"]) < 3 and s["x0"] > a["x1"] - 2]
            txt = re.sub(r"\s+", " ", " ".join(s["text"] for s in vals)).strip()
            m = row_re.match(txt)
            if not m:
                skipped.append((f"p{pno}", a["text"], f"lifter row not understood: '{txt[:60]}'"))
                continue
            rest = m.group(4).split()
            push = length = rev = None
            for tok in rest:
                if re.fullmatch(r"\d{3,4}-?[A-Z]+(?:-\.\d{3}”)?|203-96|1235-L|1235-L-\.350”", tok) and push is None and not tok.endswith("LRK"):
                    push = tok
                elif re.fullmatch(r"-?\d\.\d{3}”|-\.\d{3}”", tok):
                    length = num(tok.rstrip("”"))
                elif tok.endswith("LRK"):
                    rev = tok
            app = None
            if blocks:
                # the label block whose vertical span (extended halfway to its neighbours) contains the row
                for bi, b in enumerate(blocks):
                    top = (blocks[bi - 1]["y1"] + b["y0"]) / 2 if bi > 0 else 0
                    bot = (b["y1"] + blocks[bi + 1]["y0"]) / 2 if bi + 1 < len(blocks) else 800
                    if top <= a["y0"] < bot:
                        app = b["text"]
                        break
            base = re.sub(r"(EZX|EZMAX|EZJR)$", "", a["text"].replace("-", "").replace("/", ""))
            if pno in (17, 18, 19) and app:
                base_app[a["text"].replace("-", "").replace("/", "")] = app
            elif not app or pno >= 21:
                app = base_app.get(base) or app
            if not app:
                app = "application not printed on the row"
                qa.append(f"p{pno} lifter {a['text']}: application label not found; family Universal")
            fams = lifter_fams(app) or [("Universal", True)]
            for fam, known in fams:
                out.append({"m": BRAND, "p": a["text"], "cat": "lifter", "name": f"solid roller lifter, {series}, {m.group(1)} body",
                            "fit": clean({"fam": fam, "notes": app}),
                            "spec": clean({"style": "solid_roller", "series": series, "bodyDia": num(m.group(1)), "rollerDia": num("." + m.group(2).lstrip(".")),
                                           "body": m.group(3).replace("“", "").replace("”", "").lower(), "pushrod": push, "pushrodLength": length,
                                           "revKit": rev, "linkBar": True,
                                           "bearing": "EZ-Roll X solid raceway" if pno in (21, 22, 23) else ("EZ-Roll Max solid raceway" if pno in (24, 25) else "needle")}),
                            "src": {"doc": MAIN_SRC, "edition": MAIN_EDITION, "file": pdf_rel, "page": pno}, "emissions": None, "_known": known})
    # one record per (pn, fam)
    seen, uniq = set(), []
    for r in out:
        k = (r["p"], r["fit"]["fam"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    return uniq


# ----------------------------------------------------------------------------------------------
# validation / notes
# ----------------------------------------------------------------------------------------------
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
        key = (rec["m"], rec["p"], rec["cat"], rec["fit"]["fam"])
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
    return errs


def write_notes(path, args, sections, records, skipped, qa, errs, unknown, spring_cols, summary_rows, import_note):
    by_cat = Counter(r["cat"] for r in records)
    cams = [r for r in records if r["cat"] == "cam"]
    L = ["# Isky — extraction notes", ""]
    L += [f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_isky.py` from the manual PDFs in `Catalogs/` (no network).", ""]
    L += ["## Sources", "",
          f"- `{os.path.relpath(args.pdf, REPO)}`: 186 pp, text layer. The PDF was uploaded to iskycams.com in 2025-08 but its contents are the 2016 edition (copyright line on p5). Cam application pages 72–167, marine cams 168–171, Super-cam / Mega-cam summary tables 68–71, retainers 42–43, lifters 10, 13–15, 17–19, 21–25.",
          f"- `{os.path.relpath(args.springs, REPO)}`: 20 pp, text layer, dated August 2009 (cover). One ruled table per page, up to six springs per page, loads tabulated every 0.050\".",
          f"- `{os.path.relpath(LOBES_FILE, REPO)}`: 8 pp of scanned images with no text layer; not parsed (would need OCR).",
          f"- `{os.path.relpath(args.imp, REPO)}`: 19 pp; {import_note}",
          "", f"Records: {len(records)} ({', '.join(f'{k} {v}' for k, v in sorted(by_cat.items()))})", ""]
    L += ["## How the cam pages were parsed", "",
          "- Each engine section starts with a 24 pt make name (`CHEVROLET`, `FORD`, `CHRYS-PLYM-DODGE`...); the engine line to its right is the heading (`V-8 265-283-...-400 cu. in. engines (SMALL BLOCK) (1957-87)`). On pages where the engine line is printed elsewhere (p98, p100 style) the first 10–13 pt span naming an engine inside the section is used. Spec rows are anchored on the part-number span in the left column; the row band runs to the next part number. Inside a band the two spec lines are matched with `[RPM-RPM] lift lash adv° .050° [LC°]` (intake, then exhaust); the words between the part number and the numbers are the grind, the bold words on the exhaust line (`HYDRAULIC`, `SOLID`, `ROLLER`, `MECHANICAL`) give the lifter type. The APPLICATION prose column is not stored.",
          "- `spec.type`: HYDRAULIC → hydraulic, SOLID/MECHANICAL → solid; ROLLER (row word, or grind `RR-...`) → roller. Rows with no type word (p118 Gen 6 style) take the section's sidebar words, then the lash (`.000` → hydraulic). Flagged below when the row's type word disagrees with the lash.",
          "- `spec.rr` is the ratio printed in the section's `n:1 Rocker Ratio` banner (the lift column is valve lift at that ratio). Hemi p128 prints `1.57:1 INT.` / `1.52:1 EX.` → `rr`/`rrExh`; Iron Duke p166 prints one ratio for hydraulic & solid and another for roller cams. Sections without a banner (flathead p138, Hemi) have no `rr`.",
          "- `spec.lsa` is the catalog's `Lobe Center` column (Isky uses the term for the lobe separation angle; no intake centerline is printed). `spec.lash` is the intake lash (hot); `lashExh` only when different. `spec.grind` is the Grind No./Type cell (`256-SUPERCAM`, `RR-640/56-60`, `262/270 HL`).",
          "- Dual part-number columns (Chrysler B three-bolt/single-bolt p124–127, Ford V6 by year p132/134, flathead 21-A/8-BA p138, Iron Duke p166) give one record per part number with the column label in `fit.notes`.",
          "- Kits: the facing odd page's `Recommended Valve Train Components` table is read by word position: the `P. nn` page references under each header give the column anchors and the header words give the kind (lifters, pushrods, springs, shims, retainers, poly locks / rocker studs / rocker arms, timing set, valve locks, valve seals, spring locators, rev kit, thrust bumper, lock plate, distributor gear). Kit rows are paired with the spec rows by order when the row counts agree, otherwise by part-number suffix (`201256` ↔ `200256`); mismatches are flagged. `spec.kitPn` = Cam & Complete Kit P/N, `spec.camLifterKitPn` = the CL- kit, `spec.kit` = the component part numbers (footnote letters stripped).",
          "- `fit.ci` = the displacements in the section heading, `fit.y0/y1` its year range, `fit.cyl` from `V-8` / `6-Cyl` / `4 Cyl`. Family mapping is by make + heading keywords (see `families_for`); headings outside the fitment list keep the catalog's words and are listed below. The 2016 catalog has an LS-1 hydraulic roller section (p96, 1.7:1) → `GM LS`; no Ford Modular.",
          "- The same part number printed in two sections of one family (e.g. 135125 for AMC 304/360 and 290-401, 201271 on p90 and p98, marine listings) is one record: the first listing's specs are kept and `spec.applications` lists every page/section with its RPM range and kit; differing durations/lift are flagged.",
          f"- Summary tables: p71 Mega-cams (cam-only PN + Cam & Kit PN) and p68–69 Super-cams (single and dual pattern, with lifter and timing-set PNs) were read as a supplement: {len(summary_rows)} rows; they add `kitPn`/kit lifters to engine-page records and create records only for part numbers that have no engine-page listing (flagged in `fit.notes`).",
          "- Material (`cast iron` / `steel billet`) and `series: oval track` come from the section sidebar when printed.",
          "- Known kit-cell quirks left as printed: Buick pages 75/77/81 print pushrods with year qualifiers (`233 (1970 & UP) 1193-A (1968-69)`, `1033-A (CI)`); the Chrysler B kit pages 125/127 have a floating `TIMING SET three bolt / single bolt 1613 / 1623` block stored as `kit.timingSetByBoltPattern`; marine kit pages 169/171 (vertical lists) and the 409 (p83), Pinto (p131 first table), Y-block, 240-300 six and International kit tables are only partly or not readable, so those cams have no `kit`.",
          "- Spring spec book pp 16–19 use a different (kit) layout and were not parsed (`1005-W/206-G`, `VWE-005`, `455/456`, `JA-005`... columns); the kit springs `625/626`, `1005-W`, `206-G`, `185-G`, `805-D` therefore have no spring record. Red Zone EZ-Roll variants on p21/p25 whose base part number is spelled differently (`372EZJR`, `376180904EZMAX`...) and three HPx Gold rows on p14 have no readable application and are `Universal`.",
          ""]
    L += ["## Springs", "",
          f"- Spring spec book pp 3–20: {len(spring_cols)} columns (one spring each). `od`/`id` = O.D./I.D. Outer, `idInner`, `installedHt`, `maxLift` = Max Net Valve Lift (first value when two are printed, note kept), `rate`, `coilBind`, `type` (single/dual/triple), `dual`, `damper`, `colorCode`, `material`, `loads` = the load table keyed by height (string keys), `retainers` = the retainer / seat-cup / locator part numbers listed under the spring with their row label.",
          "- `seatLb` = tabulated load at the installed height; `openLb` = load at installed height − max net lift (exact table value when that height is tabulated, otherwise linear interpolation between the two neighbouring 0.050\" rows; `openLbNote`/`seatLbNote` say which).",
          "- The spec book gives no engine fitment. A spring's `fit.fam` is the set of families of the cams whose kits recommend it (one record per family); springs no kit references are `Universal`.",
          "- The main catalog's spring pages 27–41 are prose and kit blurbs (LS-1 beehives 165-A/195-A/4905, Honda kits...) and were not parsed; the spec book covers the catalog springs.",
          ""]
    L += ["## Retainers and lifters", "",
          "- Retainers pp 42–43: rows `PN | stem | spring application | inner/outer step dia | 7° lock | Super-7 lock`. `spec.stem` as a decimal (5/16, 11/32, 3/8; `ALL` → `stemNote`), `lockAngle` 7 or 10 (`/10 DEG`), `innerStepDia`/`outerStepDia`/`midStepDia`, `locks`, `fitsSprings` (the spring part numbers in the application cell). The small gram-weight table at the bottom of p42 is not parsed.",
          "- Lifters: p10 flat tappets (`202-HY`, `222-HY`, `392-HY`, `432-HY`, `3912-HY`, `3912-A-HY`, `692-HY`, solids `202-H`, `3102-H`, `382-H`, special-oiling `SO 202H`/`SO 382H`) with families from the description; p13–14 HPx hydraulic rollers (application, pushrod, max seat/open load, RPM limit); p15 Durathon solid rollers; p17–19 Red Zone solid rollers and p21–25 their EZ-Roll X / EZ-Roll Max variants (`bodyDia`, `rollerDia`, body type, pushrod, length, rev kit; application from the page's left-hand label block or from the base part number on p17–19). Harley `100EZR/200EZR/300EZR` (p14) are not automotive and were left out.",
          ""]
    if unknown:
        L += ["## Families not in the fitment list (need a decision)", ""]
        L += [f"- `{u}` ({sum(1 for r in records if r['fit']['fam'] == u)} records)" for u in unknown]
        L.append("")
    L += ["## Rows per family", "", "| cat | family | records |", "|---|---|---|"]
    for (cat, fam), n in sorted(Counter((r["cat"], r["fit"]["fam"]) for r in records).items()):
        L.append(f"| {cat} | {fam} | {n} |")
    L += ["", "## Cam sections", "", "| page | make | heading | rr | rows | kit rows matched |", "|---|---|---|---|---|---|"]
    for sec in sections:
        n = len(sec["rows"])
        k = sum(1 for r in sec["rows"] if r.get("kit"))
        rr = "/".join(str(r[0]) for r in sec["ratios"]) or ""
        L.append(f"| {sec['page']} | {sec['make']} | {sec['heading'][:70]} | {rr} | {n} | {k} |")
    cov = Counter()
    for r in cams:
        for k in ("durAdvInt", "dur050Int", "dur050Exh", "valveLiftInt", "valveLiftExh", "lsa", "lash", "rr", "rpmLow", "type", "grind", "kitPn", "kit"):
            if r["spec"].get(k) is not None:
                cov[k] += 1
    L += ["", "## Cam spec coverage", "", f"{len(cams)} cam records: " + ", ".join(f"{k} {v}" for k, v in cov.items()), ""]
    L += ["## Rows skipped", ""]
    L += [f"- {w} {pn}: {why}" for w, pn, why in skipped] or ["- none"]
    L += ["", "## Needs human QA", ""]
    L += [f"- {q}" for q in qa] or ["- nothing flagged"]
    L += ["", "## Validation", ""]
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a category and family; numeric spec fields are numbers (inches as decimals); no empty strings.")
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
    ap.add_argument("--pdf", default=MAIN_DEFAULT, help="IskyCatalog.pdf")
    ap.add_argument("--springs", default=SPRINGS_DEFAULT, help="ISKY-Valve-Spring-Spec-Book.pdf")
    ap.add_argument("--import", dest="imp", default=IMPORT_DEFAULT, help="Isky-Import-Catalog.pdf (only used with --include-import)")
    ap.add_argument("--include-import", action="store_true", help="also parse the import-car catalog (not done by default)")
    ap.add_argument("--debug-pages", default=None, help="comma-separated PDF pages: print parsed cam rows and exit")
    args = ap.parse_args()
    import pymupdf

    os.makedirs(OUT, exist_ok=True)
    qa, skipped = [], []
    doc = pymupdf.open(args.pdf)
    pdf_rel = os.path.relpath(args.pdf, REPO).replace("\\", "/")

    if args.debug_pages:
        for pno in [int(p) for p in args.debug_pages.split(",")]:
            if pno % 2 == 1 and pno not in MARINE_PAGES:
                for sec in parse_kit_page(doc[pno - 1], pno, qa):
                    print(f"KIT p{pno} {sec['make']}: {len(sec['rows'])} rows")
                    for r in sec["rows"]:
                        print("   ", r["kitPns"], r["camLifterKit"], r["kit"])
                continue
            for sec in parse_cam_page(doc[pno - 1], pno, qa, skipped):
                print(f"p{pno} [{sec['make']}] {sec['heading']!r} sidebar={sec['sidebar']} ratios={[r[0] for r in sec['ratios']]} hdr={sec['pnHeaders']}")
                for r in sec["rows"]:
                    print("   ", r["pns"], r["grind"], r["typeWords"], r["rpmLow"], r["rpmHigh"], r["liftInt"], r.get("liftExh"), r["lashInt"], r["advInt"], r.get("advExh"), r["d050Int"], r.get("d050Exh"), r["lc"])
        for s in skipped:
            print("SKIP", s)
        for q in qa:
            print("QA", q)
        return

    # cam pages: even page = specs, odd page = kits (same section order)
    sections = []
    pages = list(CAM_PAGES) + list(MARINE_PAGES)
    for pno in pages:
        if pno in MARINE_PAGES:
            if pno % 2 == 1:
                continue
            secs = parse_cam_page(doc[pno - 1], pno, qa, skipped)
            sections.extend(secs)
            continue
        if pno % 2 == 1:
            continue
        secs = parse_cam_page(doc[pno - 1], pno, qa, skipped)
        secs = [s for s in secs if s["rows"]]
        kits = parse_kit_page(doc[pno], pno + 1, qa) if pno + 1 <= len(doc) else []
        kits = [k for k in kits if k["rows"]]
        if secs and kits:
            if len(kits) == len(secs):
                for s, k in zip(secs, kits):
                    if s["make"].split()[0] != k["make"].split()[0]:
                        qa.append(f"p{pno}/{pno + 1}: section make mismatch between spec page ({s['make']}) and kit page ({k['make']}); kits paired by order anyway")
                    match_kits(s["rows"], k["rows"], f"p{pno}/{pno + 1} {s['make']}", qa)
            else:
                # pair by make name order, then leftovers by order
                used = set()
                for s in secs:
                    for ki, k in enumerate(kits):
                        if ki not in used and k["make"].split()[0] == s["make"].split()[0]:
                            match_kits(s["rows"], k["rows"], f"p{pno}/{pno + 1} {s['make']}", qa)
                            used.add(ki)
                            break
                qa.append(f"p{pno}/{pno + 1}: {len(secs)} spec sections vs {len(kits)} kit sections; paired by make name")
        elif secs and not kits:
            qa.append(f"p{pno}: {sum(len(s['rows']) for s in secs)} cam rows but no kit table found on p{pno + 1}")
        sections.extend(secs)
    # page 70 (SBC 114° lobe-centre Mega/oval track grinds) is a one-line-per-row table under the SBC heading
    p70 = parse_cam_page(doc[69], 70, qa, skipped)
    for s in p70:
        if s["rows"]:
            s["ratios"] = s["ratios"] or [(1.5, None, 0)]
            qa.append("p70: rocker ratio not printed on the page; 1.5:1 taken from the small-block Chevy section pages")
            sections.append(s)

    fam_rr = defaultdict(Counter)
    for sec in sections:
        fams = [marine_family(sec["heading"])] if sec.get("marine") else families_for(sec["make"], sec["heading"])
        if sec["ratios"] and len(sec["ratios"]) == 1:
            for fam, _ in fams:
                fam_rr[fam][sec["ratios"][0][0]] += len(sec["rows"])
    for fam, c in fam_rr.items():
        RR_FALLBACK[fam] = c.most_common(1)[0][0]
    records = cam_records(sections, qa, pdf_rel)
    existing = OrderedDict(((r["p"], r["fit"]["fam"]), r) for r in records)
    rr_by_fam = {}
    for fam in {r["fit"]["fam"] for r in records}:
        c = Counter(r["spec"].get("rr") for r in records if r["fit"]["fam"] == fam and r["spec"].get("rr"))
        if c:
            rr_by_fam[fam] = c.most_common(1)[0][0]
    summary_rows = parse_summary_pages(doc, qa)
    records += summary_records(summary_rows, existing, qa, pdf_rel, rr_by_fam)

    # springs: families from the cam kits
    fams_by_pn = defaultdict(OrderedDict)
    for rec in records:
        kit = rec["spec"].get("kit") or {}
        apps = rec["spec"].get("applications") or []
        for k in [kit] + [a.get("kit") or {} for a in apps]:
            sp = k.get("springs")
            if sp:
                sp = re.sub(r"\(\d+\s*pcs?\)|\(\d+\)|\(\d{4}-\d{2}\)|\(single\)", " ", sp)
                for s in re.findall(r"\d{3,4}(?:-[A-Z]{1,2})?(?:/\d{3,4}(?:-[A-Z])?)?|[A-Z]{2,3}-\d{3}", sp):
                    fams_by_pn[s].setdefault(rec["fit"]["fam"], rec["_known"])
    # kit spring cells carry footnote letters ('6005 B', '8005-A B', '9705 R'): resolve to spec-book PNs
    spring_cols = parse_spring_book(args.springs, qa)
    book_pns = {c["pn"] for c in spring_cols}
    resolved = defaultdict(OrderedDict)
    for s, fams in fams_by_pn.items():
        cand = [s, s.replace("-", ""), re.sub(r"-[A-Z]$", "", s), re.sub(r"[A-Z]$", "", s), re.sub(r"-?[A-Z]$", "", s) + "-A", s + "-D"]
        cand += [b for b in book_pns if "/" in b and s in b.split("/")]
        hit = next((c for c in cand if c in book_pns), None)
        if hit is None:
            m = re.match(r"^(\d{3,4})", s)
            if m:
                hit = next((c for c in cand if c in book_pns), None) or (m.group(1) if m.group(1) in book_pns else None)
        if hit is None:
            qa.append(f"kit spring '{s}' not found in the spring spec book")
            continue
        for fam, known in fams.items():
            resolved[hit].setdefault(fam, known)
    records += spring_records(spring_cols, {k: list(v.items()) for k, v in resolved.items()}, qa, os.path.relpath(args.springs, REPO).replace("\\", "/"))

    records += parse_retainers(doc, qa, pdf_rel)
    records += parse_lifters(doc, qa, skipped, pdf_rel)

    import_note = "not parsed (import makes: BMC, BMW, Datsun, Honda, Jaguar, Mitsubishi, MG, Opel, Porsche/VW, Toyota, Triumph, Volvo; none in the fitment list). Pass --include-import to attempt it."
    if args.include_import:
        import_note = "requested with --include-import but no parser is implemented for its older mixed-case layout; nothing extracted."
        qa.append("import catalog: --include-import given but the import layout parser is not implemented")

    for r in records:
        r["fit"]["fam"] = re.sub(r"\s+", " ", r["fit"]["fam"]).strip(" •-")
        if not r["fit"]["fam"]:
            r["fit"]["fam"] = "Unknown (heading not readable)"
            r["_known"] = False
    unknown = sorted({r["fit"]["fam"] for r in records if not r.get("_known", True)})
    for r in records:
        r.pop("_known", None)
    # drop helper keys that are not part of the format
    errs = validate(records)
    out = {
        "source": {
            "brand": BRAND, "edition": MAIN_EDITION,
            "docs": {"catalog": pdf_rel, "springs": os.path.relpath(args.springs, REPO).replace("\\", "/"),
                     "import": os.path.relpath(args.imp, REPO).replace("\\", "/") + " (not parsed)",
                     "lobes": os.path.relpath(LOBES_FILE, REPO).replace("\\", "/") + " (scanned, no text layer; skipped)"},
            "fetched": None,
            "notes": "manual PDFs in Catalogs/: master catalog (2016 contents, uploaded 2025-08), valve spring spec book (2009-08)",
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "isky.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_notes(os.path.join(OUT, "isky.md"), args, sections, records, skipped, qa, errs, unknown, spring_cols, summary_rows, import_note)
    by_cat = Counter(r["cat"] for r in records)
    print(f"sections: {len(sections)}; records: {len(records)} {dict(by_cat)}; skipped: {len(skipped)}; QA items: {len(qa)}; validation errors: {len(errs)}")
    for e in errs[:50]:
        print("  VALIDATION:", e)
    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
