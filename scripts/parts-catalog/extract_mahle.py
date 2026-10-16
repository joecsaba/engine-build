#!/usr/bin/env python3
"""Extract MAHLE Motorsport piston sets from the 2026 Racing Components Application Guide PDF.

Source: https://www.us.mahle.com/media/usa/motorsports/2026-mms-ap-guide-digital.pdf (44 pp, text).
Output: out/mahle.json (records in the shared parts format) and out/mahle.md (notes).

Scope (per CLOUD_TASKS.md): gas piston sets (SBC, LS, LT, COPO, BBC, SBF, Cleveland, Ford Modular /
Coyote / Voodoo / Godzilla, BBF, FE, Mopar SB/BB, Gen III Hemi, Olds, Pontiac, Ford EcoBoost) and diesel
piston sets (Cummins, Powerstroke, Duramax). Import sport-compact sections (Audi, BMW, Honda, Mazda,
Mitsubishi, Nissan, Subaru, Toyota, VW) are parsed by the same code but only emitted with
--include-imports, because the engine-build fitment families do not cover them.

Re-runnable: the PDF is downloaded once into dl/mahle/ and reused; --offline skips the network entirely.
Writes nothing outside dl/ and out/. Run with `python -I`.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
import time
from collections import Counter, OrderedDict

BASE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(BASE, "dl", "mahle")
OUT = os.path.join(BASE, "out")
HOST = "https://www.us.mahle.com"
PDF_URL = HOST + "/media/usa/motorsports/2026-mms-ap-guide-digital.pdf"
PDF_PATH = os.path.join(DL, "2026-mms-ap-guide-digital.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "MAHLE"
DOC = "MAHLE Motorsport 2026 Racing Components Application Guide (PDF)"
EDITION = "2026"
PISTON_PAGES = range(6, 35)  # PDF pages 6-34 = printed pages 1-29 (pistons); 35+ are rings/pins/apparel
PRINTED_OFFSET = 5

# ----------------------------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------------------------
_last_request = 0.0


def fetch(url, dest, log):
    """Download url to dest unless it already exists. One request at a time, >= 6 s apart."""
    global _last_request
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        log.append(f"cached: {url} -> {os.path.relpath(dest, BASE)}")
        return dest
    import requests  # imported lazily so --offline needs no network libs

    wait = 6.0 - (time.time() - _last_request)
    if wait > 0:
        time.sleep(wait)
    r = requests.get(url, headers={"User-Agent": UA}, timeout=120)
    _last_request = time.time()
    log.append(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
    if r.status_code != 200:
        raise SystemExit(f"{url}: HTTP {r.status_code}; not retrying")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(r.content)
    return dest


def check_robots(log):
    path = fetch(HOST + "/robots.txt", os.path.join(DL, "robots.txt"), log)
    txt = open(path, encoding="utf-8", errors="replace").read()
    agent, disallow, delay = None, [], None
    for line in txt.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        k, v = (s.strip() for s in line.split(":", 1))
        k = k.lower()
        if k == "user-agent":
            agent = v
        elif agent == "*" and k == "disallow" and v:
            disallow.append(v)
        elif agent == "*" and k == "crawl-delay":
            delay = float(v)
    pdf_path = PDF_URL[len(HOST):]
    for d in disallow:
        if pdf_path.startswith(d):
            raise SystemExit(f"robots.txt disallows {d}; stopping")
    log.append(f"robots.txt: '*' group disallows {disallow}; crawl-delay {delay}")
    return delay


# ----------------------------------------------------------------------------------------------
# page text
# ----------------------------------------------------------------------------------------------
def page_lines(pdf_path):
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        for pno in PISTON_PAGES:
            txt = pdf.pages[pno - 1].extract_text() or ""
            yield pno, [l.rstrip() for l in txt.splitlines()]


# ----------------------------------------------------------------------------------------------
# parsing helpers
# ----------------------------------------------------------------------------------------------
PN_RE = re.compile(r"^(\d{7,9})(\*{0,2})$")
ALLOY_RE = re.compile(r"^(4032|2618|M\d{3}\+?P?|Steel)$")
CR_RE = re.compile(r"^\d{1,2}\.\d$")
NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")
DOME_RE = re.compile(r"^(-?\d+(?:\.\d+)?)cc$")
GEO_RE = re.compile(r"^(\d+(?:\.\d+)?)(mm)?([RB])?$")
CHAMBER_RE = re.compile(r"^(\d+(?:\.\d+)?)cc?$")
MM = 25.4
CARRY_KEYS = ("stroke", "strokes", "rod", "rods", "ch", "chFlag", "pin", "dome", "alloy", "meas", "cmin", "cmax", "mto", "mm")

# Lines that carry no part facts (column headers, footers, marketing).
BOILERPLATE = (
    "Cubic Bore Stroke", "Inches Height Diam.", "Bore Stroke Rod Comp", "Height Diam. Vol",
    "888-255-1942", "MAHLEmotorsport.com", "Meas. = The location", "“Min” and “Max”",
    "Compression Ratio - calculated at zero deck", "Compression Heights with", "*Example:",
    "Application continues", "Sport Compact POWERPAK Applications", "Diesel POWERPAK Applications",
    "Victory IN a Box", "GET MORE OUT OF", "YOUR ENGINE", "FIND THE EDGE", "BBUUIILLDD", "SOMETHING",
    "GGRREEAATT", "Domes compatible with popular", "Focused attention on", "Revised casting with",
    "Shelf stock version", "Incremental bore sizes available", "(Check out our",
)

# Lines that start a new application section.
HEADING_RE = re.compile(
    r"^(SMALL BLOCK|BIG BLOCK|SBC |LS \d|LS COMBO|LSX Large|LS3 FLAT|LT \d|NHRA LEGAL|GM 60[24] Crate|FORD\b|Ford \d|"
    r"HEMI|TOP ALCOHOL HEMI|CUMMINS|GM \d\.\dL|AUDI|BMW|HONDA|MAZDA|MITSUBISHI|NISSAN|SUBARU|TOYOTA|VOLKSWAGEN)"
)
SUBHEADING_RE = re.compile(r"^(Standard Deck|Tall Deck|\d{4}(?:-\d{4})? COPO)\b")
RING_TRIPLE = r"(?:[\d.]+(?:mm|”)?|1/16”|3/16”)"
RING_RE = re.compile(rf"({RING_TRIPLE}(?:, {RING_TRIPLE}){{2}})\s*(?:File Fit |Drop-in )?(?:Performance )?Ring", re.I)
RINGSET_PN_RE = re.compile(r"Ring Set \(([A-Za-z0-9x\-]+)\) Included")
IMPORT_MAKES = ("AUDI", "BMW", "HONDA", "MAZDA", "MITSUBISHI", "NISSAN", "SUBARU", "TOYOTA", "VOLKSWAGEN")


def is_row(tokens):
    if len(tokens) < 2 or not PN_RE.match(tokens[-1]):
        return False
    t0 = tokens[0]
    return bool(re.match(r"^\d{3}$", t0) or re.match(r"^\d+(\.\d+)?mm$", t0))


def normalise_tokens(tokens):
    """Join split tokens: '-' + '4.1cc' -> '-4.1cc'; '92.8' + 'mm' -> '92.8mm';
    'Dependent Upon Bore Size' -> DEPENDENT; 'made to order' -> MTO."""
    out, i = [], 0
    while i < len(tokens):
        t = tokens[i]
        nxt = tokens[i + 1] if i + 1 < len(tokens) else None
        if t == "-" and nxt and nxt.endswith("cc"):
            out.append("-" + nxt)
            i += 2
        elif nxt == "mm" and NUM_RE.match(t):
            out.append(t + "mm")
            i += 2
        elif " ".join(tokens[i:i + 4]).lower() == "dependent upon bore size":
            out.append("DEPENDENT")
            i += 4
        elif " ".join(tokens[i:i + 3]) == "made to order":
            out.append("MTO")
            i += 3
        else:
            out.append(t)
            i += 1
    return out


def geo_value(tok):
    """'3.480/3.500' -> (3.48, [3.48, 3.5], None, None); '1.062R' -> (1.062, None, 'R', None);
    '92.8mm' -> (3.6535, None, None, 92.8). Returns (value_in, options, flag, mm)."""
    if tok == "-":
        return None, None, None, None
    if "/" in tok:
        parts = [geo_value(p) for p in tok.split("/")]
        vals = [p[0] for p in parts]
        return vals[0], vals, None, None
    m = GEO_RE.match(tok)
    if not m:
        return None, None, None, None
    v = float(m.group(1))
    mm = None
    if m.group(2):
        mm = v
        v = round(v / MM, 4)
    return v, None, m.group(3), mm


def classify_geo(geo):
    """Map 0-4 geometry tokens (between bore and crown volume/weight) to stroke/rod/ch/pin.
    The catalog prints only the columns that change; which ones they are follows from count and size."""
    vals = [geo_value(t)[0] or 0 for t in geo]
    n = len(geo)
    if n == 4:
        names = ["stroke", "rod", "ch", "pin"]
    elif n == 3:
        names = ["rod", "ch", "pin"] if vals[0] >= 5 else ["stroke", "rod", "ch"]
    elif n == 2:
        names = ["ch", "pin"] if vals[0] < 3 else ["stroke", "rod"]
    elif n == 1:
        names = ["ch"] if vals[0] < 3 else ["stroke"]
    else:
        names = []
    return dict(zip(names, geo))


def parse_chambers(line):
    """Split trailing chamber-volume column headers off a header line.
    '... Ring Set Included 58cc 64cc 70cc' -> (['58', '64', '70'], '... Ring Set Included')."""
    toks = line.split()
    found = []
    loose = line.startswith("CR calculated") or "Ring" in line or "Included" in line or SUBHEADING_RE.match(line) or "Various" in line
    while toks:
        t = toks[-1]
        m = CHAMBER_RE.match(t)
        if m:
            found.insert(0, m.group(1))
        elif loose and t in ("Stock", "Various"):
            found.insert(0, t.lower())
        elif loose and NUM_RE.match(t) and not found and len(toks) > 2 and toks[-2] in ("thickness", "gasket"):
            found.insert(0, t)
        else:
            break
        toks.pop()
    return found, " ".join(toks).strip()


def parse_years(text):
    """(y0, y1) from year ranges stated in a heading / note; None where absent."""
    y0 = y1 = None

    def upd(a, b):
        nonlocal y0, y1
        if a is not None:
            y0 = a if y0 is None else min(y0, a)
        if b is not None:
            y1 = b if y1 is None else max(y1, b)

    def yy(s):
        v = int(s)
        return 2000 + v if v < 50 else 1900 + v

    for m in re.finditer(r"\b(19\d\d|20\d\d)\s*[-–]\s*(19\d\d|20\d\d|\d\d)\b", text):
        b = m.group(2)
        upd(int(m.group(1)), int(b) if len(b) == 4 else yy(b))
    for m in re.finditer(r"\b(19\d\d|20\d\d)\+", text):
        upd(int(m.group(1)), None)
    for m in re.finditer(r"\((\d{4})(?:, (\d{4}))?(?:, (\d{4}))? COBRA JET\)", text):
        ys = [int(y) for y in m.groups() if y]
        upd(min(ys), max(ys))
    for m in re.finditer(r"(?:^|\| )(20\d\d) COPO", text):
        upd(int(m.group(1)), int(m.group(1)))
    for m in re.finditer(r"[‘'](\d\d)-(\d\d)\b", text):
        upd(yy(m.group(1)), yy(m.group(2)))
    for m in re.finditer(r"\b(0\d)(?:\.5)?-(0\d|1\d)\b(?! ?[A-Za-z]*mm)", text):  # 03-04, 04.5-07
        upd(yy(m.group(1)), yy(m.group(2)))
    for m in re.finditer(r"\b(0\d)\+ bowl", text):
        upd(yy(m.group(1)), None)
    if "LB7, LLY, LBZ, LMM, LGH, LML" in text:
        upd(2001, 2016)
    if "Fits L5P ONLY" in text:
        upd(2017, None)
    return y0, y1


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
def families_for(heading):
    """[(family, cylinders, known_family)] for a section heading."""
    h = heading.upper()
    if h.startswith(("SMALL BLOCK CHEVY", "SBC ", "GM 604 CRATE", "GM 602 CRATE")):
        return [("Small-block Chevy", 8, True)]
    if h.startswith(("LS ", "LSX", "LS3", "NHRA LEGAL COPO")):
        return [("GM LS", 8, True)]
    if h.startswith("LT "):
        return [("GM LT (Gen V)", 8, True)]
    if h.startswith("BIG BLOCK CHEVY"):
        return [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
    if h.startswith("SMALL BLOCK FORD CLEVELAND"):
        return [("Ford 351C/351M/400", 8, True)]
    if h.startswith("SMALL BLOCK FORD"):
        return [("Small-block Ford (Windsor)", 8, True)]
    if "GODZILLA" in h:
        return [("Ford Godzilla 7.3", 8, True)]
    if "COYOTE" in h or "VOODOO" in h or ("5.0L" in h and "MODULAR" in h):
        return [("Ford Coyote", 8, True)]
    if "MODULAR" in h:
        return [("Ford Modular", 8, True)]
    if h.startswith("BIG BLOCK FORD"):
        return [("Ford 429/460", 8, True)]
    if h.startswith("FORD FE"):
        return [("Ford FE", 8, True)]
    if h.startswith("SMALL BLOCK MOPAR"):
        return [("Mopar LA small block", 8, True)]
    if h.startswith("BIG BLOCK MOPAR"):
        return [("Mopar B/RB big block", 8, True)]
    if h.startswith("TOP ALCOHOL HEMI"):
        return [("Top Alcohol Hemi", 8, False)]
    if "HEMI" in h and ("5.7" in h or "6.1" in h):
        return [("Chrysler Gen III Hemi 5.7/6.1", 8, True)]
    if "HEMI" in h and "6.4" in h:
        return [("Chrysler Gen III Hemi 6.2/6.4", 8, True)]
    if "OLDSMOBILE" in h:
        return [("Oldsmobile V8", 8, True)]
    if "PONTIAC" in h:
        return [("Pontiac V8", 8, True)]
    if h.startswith("FORD") and ("ECOBOOST" in h or "ZETEC" in h):
        m = re.search(r"(ECOBOOST|ZETEC) (\d\.\dL)", h)
        fam = f"Ford {'EcoBoost' if m.group(1) == 'ECOBOOST' else 'Zetec'} {m.group(2)}" if m else heading
        return [(fam, 4, False)]
    if h.startswith("CUMMINS 5.9"):
        fams = []
        if "12V" in h:
            fams.append(("Cummins 5.9 12V", 6, True))
        if "24V" in h:
            fams.append(("Cummins 5.9 24V/CR", 6, True))
        return fams or [("Cummins 5.9 12V", 6, True), ("Cummins 5.9 24V/CR", 6, True)]
    if h.startswith("CUMMINS 6.7"):
        return [("Cummins 6.7", 6, True)]
    if "POWERSTROKE" in h:
        m = re.search(r"(\d\.\d)L", h)
        return [(f"Powerstroke {m.group(1)}", 8, True)]
    if "DURAMAX" in h:
        return [("Duramax 6.6", 8, True)]
    return [(heading, None, False)]


def is_import(heading):
    return heading.upper().startswith(IMPORT_MAKES)


# ----------------------------------------------------------------------------------------------
# PDF -> rows
# ----------------------------------------------------------------------------------------------
class Section:
    def __init__(self, heading, page):
        self.heading = heading
        self.page = page
        self.sub = None
        self.chambers = []
        self.notes = []
        self.ring_pack = None
        self.rings_included = None
        self.ring_set = None
        self.cr_note = None
        self.cr_overrides = {}
        self.footnotes = {}
        self.rows = []
        self.carry = {}


def parse_pdf(pdf_path, qa, skipped):
    rows = []
    section = None

    def flush(sec):
        """Section finished: resolve footnotes and fill section-level facts the rows did not snapshot."""
        if not sec:
            return
        for r in sec.rows:
            fn = sec.footnotes.get(r["stars"])
            if r["stars"] and not fn:
                qa.append(f"p{r['page']} {r['pn']}: footnote marker '{'*' * r['stars']}' has no matching footnote in section '{sec.heading}'")
            r["footnote"] = fn
            r["sectionNotes"] = list(sec.notes)
            for k, v in (("ringPack", sec.ring_pack), ("ringsIncluded", sec.rings_included), ("ringSet", sec.ring_set), ("crNote", sec.cr_note)):
                if r.get(k) is None:
                    r[k] = v
            ov = sec.cr_overrides.get((r.get("stroke"), r.get("rod")))
            if ov:
                r["crNote"] = ov
            rows.append(r)
        sec.rows = []

    for pno, lines in page_lines(pdf_path):
        for raw in lines:
            line = raw.strip()
            if not line:
                continue
            tokens = normalise_tokens(line.split())
            if is_row(tokens):
                if section is None:
                    skipped.append((pno, line, "row before any heading"))
                    continue
                row = parse_row(tokens, section, pno, qa, skipped)
                if row:
                    section.rows.append(row)
                continue
            if line.startswith(BOILERPLATE):
                continue
            if HEADING_RE.match(line) and not SUBHEADING_RE.match(line):
                flush(section)
                section = Section(line, pno)
                continue
            if section is None:
                continue
            chambers, text = parse_chambers(line)
            if chambers:
                section.chambers = chambers
            if SUBHEADING_RE.match(line):
                section.sub = text
                rm = RING_RE.search(text)
                if rm:
                    section.ring_pack = ring_pack(rm.group(1))
                continue
            m = re.match(r"^(\*{1,2})\s*(.+)$", line)
            if m:
                section.footnotes[len(m.group(1))] = m.group(2).strip().rstrip(".")
                continue
            if re.search(r"\bring", text, re.I) and re.search(r"include|sold separately", text, re.I):
                rm = RING_RE.search(text)
                if rm:
                    section.ring_pack = ring_pack(rm.group(1))
                pm = RINGSET_PN_RE.search(text)
                if pm:
                    section.ring_set = pm.group(1)
                section.rings_included = not re.search(r"not included|sold separately", text, re.I)
                rest = re.sub(r"\s*-?\s*Ring Set \([A-Za-z0-9x\-]+\) Included\.?", "", text).strip(" -")
                rest = re.sub(rf"^(Requires )?{RING_TRIPLE}(?:, {RING_TRIPLE}){{2}} ?(File Fit |Drop-in )?(Performance )?Ring Set (Included?|\(Not Included[^)]*\))\.?\s*,?\s*", "", rest, flags=re.I).strip()
                if "sold separately" in text:
                    rest = "rings sold separately"
                if rest.startswith("Per Regulation"):
                    rest = "SCCA: requires OEM rings (not included)"
                if rest and len(rest) > 3:
                    section.notes.append(rest)
                continue
            if line.startswith("Does not include rings"):
                section.rings_included = False
                section.notes.append(text.rstrip("."))
                continue
            if text.startswith("CR calculated"):
                section.cr_note = text
                continue
            m = re.match(r"^(\d\.\d{3}) / (\d\.\d{3}) (CR calculated.*)$", text)
            if m:  # CR basis for one stroke/rod combination of the section
                section.cr_overrides[(float(m.group(1)), float(m.group(2)))] = m.group(3)
                continue
            if text:
                section.notes.append(text)
    flush(section)
    return rows


def ring_pack(s):
    """'1.0mm, 1.0mm, 2.0mm' -> '1.0, 1.0, 2.0mm'; '1/16”, 1/16”, 3/16”' unchanged."""
    return re.sub(r"mm(?=,)", "", s).replace("”", '"')


def parse_row(tokens, sec, pno, qa, skipped):
    line = " ".join(tokens)
    m = PN_RE.match(tokens[-1])
    pn, stars = m.group(1), len(m.group(2))
    body = tokens[:-1]
    row = {"page": pno, "section": sec.heading, "sub": sec.sub, "pn": pn, "stars": stars, "line": line,
           "ringPack": sec.ring_pack, "ringsIncluded": sec.rings_included, "ringSet": sec.ring_set, "crNote": sec.cr_note}
    if len(pn) != 9:
        qa.append(f"p{pno}: part number '{pn}' is not 9 digits as printed (line: `{line}`)")

    if body[0].endswith("mm"):
        row["cid"] = None
        bore, _, _, bore_mm = geo_value(body[0])
        rest = body[1:]
    else:
        row["cid"] = int(body[0])
        bore, _, _, bore_mm = geo_value(body[1])
        rest = body[2:]
    row["bore"], row["boreMm"] = bore, bore_mm
    carry = sec.carry

    if not rest:  # custom-order continuation: only CID, bore, PN
        if not carry:
            skipped.append((pno, line, "continuation row with nothing to inherit"))
            return None
        row.update({k: carry.get(k) for k in CARRY_KEYS})
        row["weight"], row["cr"] = None, {}
        return row

    if rest[0] == "MTO":
        after = [t for t in rest if t != "MTO"]
        row.update(stroke=None, strokes=None, rod=None, rods=None, ch=None, chFlag=None, pin=None, dome=None, mto=True, weight=None, mm={})
        parse_tail(after, row, carry, sec, qa, pno, line)
        sec.carry = {k: row.get(k) for k in CARRY_KEYS}
        return row

    wi = next((i for i, t in enumerate(rest) if re.fullmatch(r"\d+", t)), None)  # weight = first integer
    if wi is None:
        skipped.append((pno, line, "no weight column found"))
        return None
    pre, wt, after = rest[:wi], int(rest[wi]), rest[wi + 1:]
    dome_tok = None
    if pre and pre[-1].endswith("cc"):
        dome_tok, pre = pre[-1], pre[:-1]
    geo = classify_geo(pre)
    if pre and not geo:
        skipped.append((pno, line, f"unexpected geometry token count {len(pre)}"))
        return None

    row["mto"] = False
    row["mm"] = dict(carry.get("mm") or {})
    for key in ("stroke", "rod", "ch", "pin"):
        opt_key = {"stroke": "strokes", "rod": "rods", "ch": "chFlag"}.get(key)
        if key in geo:
            v, alts, flag, mm = geo_value(geo[key])
            row[key] = v
            if mm is not None:
                row["mm"][key] = mm
            if opt_key:
                row[opt_key] = alts if key != "ch" else flag
        else:
            if key not in carry:
                skipped.append((pno, line, f"missing {key} and nothing to inherit"))
                return None
            row[key] = carry[key]
            if opt_key:
                row[opt_key] = carry.get(opt_key)
    if dome_tok:
        dm = DOME_RE.match(dome_tok)
        row["dome"] = float(dm.group(1)) if dm else None
    elif "dome" in carry:
        row["dome"] = carry["dome"]
    else:
        skipped.append((pno, line, "missing crown volume and nothing to inherit"))
        return None
    row["weight"] = wt
    parse_tail(after, row, carry, sec, qa, pno, line)
    sec.carry = {k: row.get(k) for k in CARRY_KEYS}
    return row


def parse_tail(after, row, carry, sec, qa, pno, line):
    """Compression-ratio columns, then optional alloy + clearance measure/min/max."""
    crs, i = [], 0
    while i < len(after) and not ALLOY_RE.match(after[i]):
        t = after[i]
        if CR_RE.match(t):
            crs.append(float(t))
        elif t == "DEPENDENT":
            row["crDependsOnBore"] = True
        elif t == "Stock":
            row["crIsStock"] = True
        elif t == "-":
            crs.append(None)
        else:
            qa.append(f"p{pno} {row['pn']}: unexpected token '{t}' in CR columns (line: `{line}`)")
        i += 1
    tail = after[i:]
    if tail:
        if len(tail) != 4:
            qa.append(f"p{pno} {row['pn']}: expected alloy + 3 clearance values, got {tail} (line: `{line}`)")
        row["alloy"] = tail[0]
        vals = [float(t) if NUM_RE.match(t) else None for t in tail[1:4]]
        vals += [None] * (3 - len(vals))
        row["meas"], row["cmin"], row["cmax"] = vals
    else:
        for k in ("alloy", "meas", "cmin", "cmax"):
            row[k] = carry.get(k)
    cr = {}
    crs_num = [c for c in crs if c is not None]
    if crs_num:
        chambers = sec.chambers
        if len(chambers) == len(crs):
            cr = {k: v for k, v in zip(chambers, crs) if v is not None}
        else:
            qa.append(f"p{pno} {row['pn']}: {len(crs)} CR values but chamber headers {chambers} (line: `{line}`)")
            keys = chambers + [f"col{j + 1}" for j in range(len(chambers), len(crs))]
            cr = {k: v for k, v in zip(keys, crs) if v is not None}
    row["cr"] = cr


# ----------------------------------------------------------------------------------------------
# rows -> records
# ----------------------------------------------------------------------------------------------
def crown_word(heading, dome):
    h = heading.upper()
    if "INVERTED DOME" in h:
        return "inverted dome"
    if "FLAT TOP" in h and "DOME" not in h and "DISH" not in h:
        return "flat top"
    if dome is None:
        return "crown"
    if dome > 0.5:
        return "dome"
    if dome < -8:
        return "bowl" if any(k in h for k in ("CUMMINS", "POWERSTROKE", "DURAMAX")) else "dish"
    return "flat top"


def material_word(heading):
    h = heading.upper()
    if "MONOTHERM" in h or "STEEL" in h:
        return "forged steel"
    if "CAST" in h:
        return "cast"
    return "forged"


def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def build_records(rows, include_imports, qa, skipped_imports):
    """One record per (family, PN); the same PN under several bore/stroke/rod combos -> spec.applications."""
    by_key, order = {}, []
    for r in rows:
        if is_import(r["section"]) and not include_imports:
            skipped_imports.append(r)
            continue
        for fam, cyl, known in families_for(r["section"]):
            key = (fam, r["pn"])
            combo = clean({
                "ci": r["cid"], "stroke": r["stroke"], "strokeOptions": r.get("strokes"), "rodLength": r["rod"],
                "rodLengthOptions": r.get("rods"), "cr": r["cr"] or None, "crNote": r.get("crNote"), "weight": r["weight"],
            })
            if key not in by_key:
                by_key[key] = {"fam": fam, "cyl": cyl, "known": known, "first": r, "combos": [combo], "sections": OrderedDict(), "bores": [r["bore"]]}
                order.append(key)
            e = by_key[key]
            e["sections"][r["section"]] = True
            if combo not in e["combos"]:
                e["combos"].append(combo)
            f = e["first"]
            if f is not r:
                if r["bore"] not in e["bores"]:
                    e["bores"].append(r["bore"])
                    if f.get("crDependsOnBore") or r.get("crDependsOnBore"):
                        qa.append(f"PN {r['pn']} ({fam}): catalog lists one NHRA part number for bores {sorted(e['bores'])} (made to order, CR depends on bore); recorded as `spec.boreOptions`, `spec.bore` = first")
                    else:
                        qa.append(f"PN {r['pn']} ({fam}): `bore` differs between p{f['page']} ({f['bore']}) and p{r['page']} ({r['bore']}) — catalog inconsistency, first value kept, all in `spec.boreOptions`")
                for k in ("ch", "pin", "dome", "alloy", "meas", "cmin", "cmax"):
                    if f.get(k) != r.get(k):
                        qa.append(f"PN {r['pn']} ({fam}): `{k}` differs between p{f['page']} ({f.get(k)}) and p{r['page']} ({r.get(k)}) — catalog inconsistency, first value kept")

    records = []
    for key in order:
        e = by_key[key]
        r, fam, cyl = e["first"], e["fam"], e["cyl"]
        for c in e["combos"]:
            if c.get("ci") and c.get("stroke") and cyl and r["bore"]:
                calc = math.pi / 4 * r["bore"] ** 2 * c["stroke"] * cyl
                if abs(calc - c["ci"]) > max(4, 0.02 * calc):
                    qa.append(f"PN {r['pn']} p{r['page']}: catalog CID {c['ci']} vs computed {calc:.0f} ({r['bore']} bore x {c['stroke']} stroke x {cyl}) — check row")
        ci = sorted({c["ci"] for c in e["combos"] if c.get("ci")})
        notes = []
        if r["sub"]:
            notes.append(r["sub"])
        notes += r.get("sectionNotes") or []
        others = [s for s in e["sections"] if s != r["section"]]
        if others:
            notes.append("also listed under: " + "; ".join(others))
        y0, y1 = parse_years(" | ".join([r["section"], r["sub"] or ""] + (r.get("sectionNotes") or [])))
        first = e["combos"][0]
        weights = sorted({c["weight"] for c in e["combos"] if c.get("weight")})
        if len(weights) > 1:
            qa.append(f"PN {r['pn']} ({fam}): weight printed as {weights} g in different rows; first kept")
        metric = dict(r.get("mm") or {})
        if r.get("boreMm"):
            metric = {"bore": r["boreMm"], **metric}
        spec = clean({
            "bore": r["bore"],
            "boreOptions": sorted(b for b in e["bores"] if b) if len(e["bores"]) > 1 else None,
            "stroke": first.get("stroke"),
            "strokeOptions": first.get("strokeOptions"),
            "rodLength": first.get("rodLength"),
            "rodLengthOptions": first.get("rodLengthOptions"),
            "ch": r["ch"],
            "pin": r["pin"],
            "domeCc": r["dome"],
            "alloy": r["alloy"],
            "weight": r["weight"],
            "cr": first.get("cr"),
            "crDependsOnBore": True if r.get("crDependsOnBore") else None,
            "crNote": first.get("crNote") or ("stock compression ratio" if r.get("crIsStock") else None),
            "ringPack": r.get("ringPack"),
            "ringsIncluded": r.get("ringsIncluded"),
            "ringSet": r.get("ringSet"),
            "clearanceMeasure": r["meas"],
            "clearanceMin": r["cmin"],
            "clearanceMax": r["cmax"],
            "oilSupportRails": True if r.get("chFlag") == "R" else None,
            "pinButtons": True if r.get("chFlag") == "B" else None,
            "madeToOrder": True if r.get("mto") else None,
            "metric": metric or None,
            "note": r.get("footnote"),
        })
        if len(e["combos"]) > 1:
            spec["applications"] = [clean({
                **{k: c.get(k) for k in ("ci", "stroke", "strokeOptions", "rodLength", "rodLengthOptions", "cr")},
                "crNote": c.get("crNote") if c.get("crNote") != first.get("crNote") else None,
            }) for c in e["combos"]]
        bore_s = f"{r['bore']:.3f}" if r["bore"] else "?"
        if r.get("mto"):
            name = f"{material_word(r['section'])} piston set, {bore_s} bore, made to order"
        else:
            dome_s = f" {r['dome']:+.1f}cc".replace("+", "") if r["dome"] is not None else ""
            name = f"{material_word(r['section'])} piston set, {bore_s} bore, {crown_word(r['section'], r['dome'])}{dome_s}, {r['ch']} CH"
        records.append({
            "m": BRAND,
            "p": r["pn"],
            "cat": "piston",
            "name": name,
            "fit": clean({"fam": fam, "ci": ci or None, "cyl": cyl, "y0": y0, "y1": y1, "notes": "; ".join(notes) or None}),
            "spec": spec,
            "src": {"doc": DOC, "edition": EDITION, "url": PDF_URL, "page": r["page"], "printedPage": r["page"] - PRINTED_OFFSET, "section": r["section"]},
            "emissions": None,
            "_known": e["known"],
        })
    return records


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("bore", "stroke", "rodLength", "ch", "pin", "domeCc", "weight", "clearanceMeasure", "clearanceMin", "clearanceMax")
NUMERIC_LIST_SPEC = ("boreOptions", "strokeOptions", "rodLengthOptions")


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
        for k in NUMERIC_LIST_SPEC:
            v = rec["spec"].get(k)
            if v is not None and (not isinstance(v, list) or not all(isinstance(x, (int, float)) for x in v)):
                errs.append(f"{rec['p']}: spec.{k} is not a list of numbers: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and (not isinstance(cr, dict) or not all(isinstance(v, (int, float)) for v in cr.values())):
            errs.append(f"{rec['p']}: spec.cr malformed: {cr!r}")
        for c in rec["spec"].get("applications", []):
            for k in ("ci", "stroke", "rodLength"):
                v = c.get(k)
                if v is not None and not isinstance(v, (int, float)):
                    errs.append(f"{rec['p']}: applications.{k} is not a number: {v!r}")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, log, rows, records, skipped, skipped_imports, qa, errs, unknown, args):
    fam_rows, fam_recs = Counter(), Counter()
    for r in rows:
        if is_import(r["section"]) and not args.include_imports:
            continue
        for fam, _, _ in families_for(r["section"]):
            fam_rows[fam] += 1
    for rec in records:
        fam_recs[rec["fit"]["fam"]] += 1
    sections = OrderedDict()
    for r in rows:
        k = (r["page"], r["section"])
        sections[k] = sections.get(k, 0) + 1
    n_rows_emitted = sum(1 for r in rows if args.include_imports or not is_import(r["section"]))

    L = ["# MAHLE Motorsport — extraction notes", ""]
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_mahle.py`" + (" with `--include-imports`" if args.include_imports else "") + ".")
    L += ["", "## What was fetched", ""]
    L.append("Two requests to `www.us.mahle.com` (robots.txt, then the PDF), 6 s apart, UA `engine-build.com catalog research (contact: joecsaba@gmail.com)`:")
    L += [f"- {l}" for l in log]
    L.append("")
    L.append("robots.txt (`*` group) disallows only `/search` and `/survey/`, no Crawl-delay. The guide is one 44-page text PDF; no product pages were crawled. The PDF is kept in `dl/mahle/` (gitignored); `--offline` re-parses it without the network.")
    L += ["", "## What was parsed", ""]
    L.append(f"PDF pages 6–34 (printed pages 1–29): every table line ending in a part number. {len(rows)} rows parsed, {n_rows_emitted} in scope, {len(records)} records. A record is one part number in one fitment family; a part number the catalog lists under several bore/stroke/rod combinations becomes one record whose `spec.stroke / rodLength / cr` are the first combination and `spec.applications` lists all of them.")
    L.append("")
    L.append("Not extracted: pages 35–38 (ring sets, pins, rails, expanders: bore × description × PN tables, a possible follow-up as `ring` records), 39 (apparel), 40–44 (custom-order form, tech notes).")
    L += ["", "### Column mapping", ""]
    L.append("Catalog columns: `Cubic Inches | Bore | Stroke | Rod | Comp Height | Pin Diam. | Crown Vol | Wght G | Compression Ratio (one column per chamber cc) | Alloy | Clearance Meas. | Min | Max | Guide Part No.`")
    L.append("")
    L += [
        "- `Clearance Meas.` is where piston-to-wall clearance is measured (inches up from the bottom of the skirt), **not** a ring width; the feasibility sample had mislabeled it `ring_pack_in`. Stored as `spec.clearanceMeasure`, `clearanceMin`, `clearanceMax` (inches, over the skirt coating).",
        "- Ring pack comes from the section header (`1.0, 1.0, 2.0mm File Fit Performance Ring Set Included`) → `spec.ringPack`, `spec.ringsIncluded`; diesel sections name the ring-set PN → `spec.ringSet`.",
        "- Compression-ratio columns are keyed by the chamber cc printed in the section header: `spec.cr = {\"58\": 11.1, \"64\": 10.3, \"70\": 9.6}`. Sections that state their deck/gasket assumption carry it in `spec.crNote` (a per-combination override, e.g. Hemi 5.7 `3.800 / 6.125`, sits on that entry of `spec.applications`); otherwise the catalog default applies (zero deck, 0.040\" gasket). NHRA-legal rows print `Dependent Upon Bore Size` → `spec.crDependsOnBore: true` and no `cr`; where one NHRA part number covers several bores, `spec.boreOptions` lists them.",
        "- Continuation rows (CID, bore, weight, CR, PN only) inherit stroke / rod / CH / pin / crown volume / alloy / clearance from the previous full row (fill-down), as the catalog lays them out. Partial rows that restate only some columns are classified by count and magnitude (rod ≥ 5\", stroke ≥ 3\", CH < 3\").",
        "- Compression heights printed with `R` include oil support rails → `spec.oilSupportRails: true`; `B` (Top Alcohol Hemi) = pin retaining buttons → `spec.pinButtons`.",
        "- `Crown Vol` → `spec.domeCc`: negative = dish / valve reliefs / diesel bowl, positive = dome.",
        "- Stroke or rod printed as `3.480/3.500` → `spec.stroke` = first value, `spec.strokeOptions` = both (same for `rodLengthOptions`).",
        "- Custom-order diesel rows (`made to order`) carry only bore, alloy and clearance → `spec.madeToOrder: true`.",
        "- Sport-compact rows are metric; stored in inches (4 dp) with the catalog mm values in `spec.metric`.",
        "- `spec.weight` = catalog `Wght G` (grams, per piston). `spec.note` = the row's `*`/`**` footnote (alloy, gas ports, hard-anodized groove, deck height). `fit.notes` = the section's factual sub-lines (head compatibility, pin honing, deck, drop-in notes) plus the sub-heading.",
        "- `cat` is `piston` for every record (the brief's piston spec carries `ringPack`); `ringsIncluded: false` marks the sets sold without rings (NHRA-legal, Elite Sportsman, GM 604 crate).",
        "- `emissions` is `null` (internal engine parts).",
    ]
    L += ["", "### Family mapping", ""]
    L += [
        "- `BIG BLOCK CHEVY` sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same pistons; the generations share bore spacing and deck heights). Drop one if the catalog consumer treats them as one family.",
        "- `CUMMINS 5.9L ... 12V or 24V (Custom Order)` is emitted under both `Cummins 5.9 12V` and `Cummins 5.9 24V/CR`.",
        "- `FORD 5.0L MODULAR ...`, `COYOTE`, `VOODOO` → `Ford Coyote`; `FORD MODULAR 4.6 / 5.4` → `Ford Modular`; `SMALL BLOCK FORD CLEVELAND` → `Ford 351C/351M/400`.",
        "- `NHRA LEGAL COPO CAMARO` (LS-based 302 / 350 / 396 / 427) → `GM LS`; `GM 602 / 604 crate` → `Small-block Chevy`.",
        "- `HEMI 5.7L` / `6.1L` → `Chrysler Gen III Hemi 5.7/6.1`; `6.4L` → `Chrysler Gen III Hemi 6.2/6.4`.",
        "- `SMALL BLOCK MOPAR (LA) 340, 360` → `Mopar LA small block` only; not duplicated into `Mopar Magnum 5.2/5.9` (catalog requires aftermarket rods, Magnum fit not stated).",
        "- Years (`fit.y0` / `y1`) only where the catalog states them: Cobra Jet and COPO model years, Coyote `2018+`, Olds `'65-67`, Cummins `03-04` / `04.5-07` bowls, Duramax LB7–LML = 2001–2016, L5P = 2017+.",
    ]
    if unknown:
        L.append(f"- **Families not in the fitment list** (`fit.fam` = catalog heading; needs a decision): {', '.join('`' + u + '`' for u in unknown)}.")
    L += ["", "## Rows per section (PDF page where the section starts)", "", "| page | section | rows |", "|---|---|---|"]
    L += [f"| {p} | {s} | {n} |" for (p, s), n in sections.items()]
    L += ["", "## Rows and records per family", "", "| family | rows | records |", "|---|---|---|"]
    L += [f"| {fam} | {fam_rows[fam]} | {fam_recs[fam]} |" for fam in sorted(fam_recs, key=lambda f: (-fam_recs[f], f))]
    L.append(f"| **total** | {sum(fam_rows.values())} | {len(records)} |")
    L += ["", "## Rows skipped", ""]
    if skipped_imports:
        imp = Counter(r["section"] for r in skipped_imports)
        L.append(f"- {len(skipped_imports)} import sport-compact rows (PDF pp 27–31) parse cleanly but are not emitted: the brief's gas list stops at EcoBoost and the fitment family list has no import engines. `--include-imports` emits them with `fit.fam` = catalog heading. Sections: " + "; ".join(f"{s} ({n})" for s, n in imp.items()) + ".")
    L += [f"- p{p}: {why}: `{line}`" for p, line, why in skipped]
    if not skipped and not skipped_imports:
        L.append("- none")
    L += ["", "## Needs human QA", ""]
    L += [f"- {q}" for q in qa] or ["- nothing flagged"]
    L += ["", "## Validation", ""]
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.")
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
    ap.add_argument("--offline", action="store_true", help="do not touch the network; parse dl/mahle/ as is")
    ap.add_argument("--include-imports", action="store_true", help="also emit import sport-compact sections (fit.fam = catalog heading)")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    log = []
    if not args.offline:
        check_robots(log)
        fetch(PDF_URL, PDF_PATH, log)
    elif not os.path.exists(PDF_PATH):
        raise SystemExit(f"--offline but {PDF_PATH} is missing")
    else:
        log.append(f"offline: parsed {os.path.relpath(PDF_PATH, BASE)}")

    qa, skipped, skipped_imports = [], [], []
    rows = parse_pdf(PDF_PATH, qa, skipped)
    records = build_records(rows, args.include_imports, qa, skipped_imports)
    unknown = sorted({r["fit"]["fam"] for r in records if not r.pop("_known")})
    errs = validate(records)

    out = {
        "source": {
            "brand": BRAND, "doc": DOC, "edition": EDITION, "url": PDF_URL,
            "pages": f"PDF pages {PISTON_PAGES.start}-{PISTON_PAGES.stop - 1} (printed {PISTON_PAGES.start - PRINTED_OFFSET}-{PISTON_PAGES.stop - 1 - PRINTED_OFFSET})",
            "fetched": dt.datetime.fromtimestamp(os.path.getmtime(PDF_PATH), dt.timezone.utc).date().isoformat(),
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "mahle.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_notes(os.path.join(OUT, "mahle.md"), log, rows, records, skipped, skipped_imports, qa, errs, unknown, args)
    print(f"rows parsed: {len(rows)}; records: {len(records)}; skipped lines: {len(skipped)}; "
          f"import rows held back: {len(skipped_imports)}; QA items: {len(qa)}; validation errors: {len(errs)}")
    for e in errs[:50]:
        print("  VALIDATION:", e)
    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
