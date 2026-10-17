#!/usr/bin/env python3
"""Extract Wiseco shelf pistons from the Wiseco automotive catalog PDF (manual download, no network).

Source: Catalogs/Wiseco22_Auto_catalog_Final web.pdf (2022, 220 pp, text layer). Output: out/wiseco.json
(shared parts record format) and out/wiseco.md (notes).

Scope (CLOUD_TASKS.md "WISECO"): domestic shelf piston kits, PDF pages 4-111:
  4-41  LS / LT / small-block Chevy       42-69 big-block Chevy       70-81 Chrysler (Gen III Hemi, LA, B/RB, 426)
  82-93 Ford (2300, Windsor, Modular, Coyote, Godzilla)   94-111 Pro Tru Street (AMC, Buick, Chevy, Mopar, Ford, Jeep, Olds)
Not extracted: pp 112-183 sport compact / European (no fitment family), 184+ accessories, technology, apparel.
Every catalog page is printed twice in the PDF (page n and n+1 carry the same tables); rows are de-duplicated.

Layout: a title line, bullet lines (alloy, rings, pin, CR basis), then a header block
`Compression Ratio At: / Bore Comp 0 Deck Std Deck Avg Gram ... / Kit Part # Stroke Rod Volume 58cc 62cc ... /
Size Ht. at Ht. Wt. ...`, then one text row per kit:
K-series: `PN bore CH stroke rod zeroDeckHt stdDeckHt [weight] dome CR... pinPN pinSpecs ringSet ringSpecs [skirt]
[valve pockets] [lock] [sleeve] [K1 rod] [K1 crank]`
Pro Tru:  `PN bore [CID] CH stroke rod [weight] dome CR... [pinPN pinSpecs] ringSet ringSpecs replPiston [lock] [sleeve] ...`

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
PDF_DEFAULT = os.path.join(REPO, "Catalogs", "Wiseco22_Auto_catalog_Final web.pdf")
BRAND = "Wiseco"
DOC = "Wiseco Performance Products 2022 automotive catalog (PDF, manual download)"
EDITION = "2022"
PAGES = range(4, 112)

PN_RE = re.compile(r"^(?=.*\d)[A-Z]{1,3}\d{2,5}[A-Z0-9]*$")
NUMG_RE = re.compile(r"^\d{1,2}\.\d{1,3}(?:/\d{1,2}\.\d{1,3})*$")  # geometry number, possibly 'a/b'
INT_RE = re.compile(r"^\d{2,4}$")
DOME_RE = re.compile(r"^([+-]?\d*\.?\d+)cc\*?$")
NEG_RE = re.compile(r"^-\d*\.?\d+$")
CR_RE = re.compile(r"^(\d{1,3}(?:\.\d{1,3})?)(?::1)?$")
CRPAIR_RE = re.compile(r"^\d{1,2}\.\d{1,2}(/\d{1,2}\.\d{1,2})+$|^\d{1,2}\.\d{1,2}/\d{1,2}\.\d{1,2}\d")
CRLINE_RE = re.compile(r"^(\d{1,2}\.\d{1,2}\s*(/\s*)?)+$")
PINPN_RE = re.compile(r"^S\d{3}$|^\d{3}-\d{4}-\d{2}-\d{2}[A-Z]?$|^H\d{10}[A-Z]{2,4}$")
REPL_RE = re.compile(r"^\d{4}[A-Z]{1,2}\d{0,4}$")  # Pro Tru bare replacement piston (5539A3, 5576AS)
PINSPEC_RE = re.compile(r"(\d?\.\d{2,4}|1\.0\d*)[”\"]?\s*[xX]\s*\.?(\d\.\d{3})[”\"]?(?:\s*[xX]\s*\.?(\d{3}|\.\d{3}))?")
RING_NUM = r"(?:\d*\.\d+|\d+/\d+|\d+)(?:mm)?"
RINGSPEC_RE = re.compile(rf"(?<![A-Za-z\d.])({RING_NUM}\s*[-,x]\s*{RING_NUM}\s*[-,x]\s*{RING_NUM})(?![\d/])")
RINGSET_TOK_RE = re.compile(r"^(?=.*\d)[A-Z0-9]{4,}(-[A-Z0-9]+)*$")
SLEEVE_RE = re.compile(r"^RCST?\d{5}$")
LOCK_RE = re.compile(r"^(C[SW]\d{2}|W\d{4})$")
K1ROD_RE = re.compile(r"^\d{3}[A-Z]{2}\d{5}$")
K1CRANK_RE = re.compile(r"^\d{3}[A-Z]{3,4}\d{3,5}$")
CROWN_WORDS = {"FT", "Hollow", "Solid", "Dome", "-", "Flat", "Top", "Cut", "to", "/", "Semi-", "Semi-Hollow", "Dish"}
NOTE_START = ("Top ring down", "op ring down", ".", "*", "Compression ratios", "Compression Ratio Calculated", "Note:",
              "Must use", "Stock Rod", "(also fits", "Severe Duty", "Continued *")
HEADER_LABEL_WORDS = {"Size", "Ht.", "at", "Wt.", "Sleeve", "Part", "#", "Bore", "Comp", "0", "Deck", "Std", "Avg", "Gram",
                      "Ring", "Comp.", "Wrist", "Pin", "Specs", ".927", "Kit", "Stroke", "Rod", "Volume", "Cubic", "Inch",
                      "Avg.", "Ht"}


# ----------------------------------------------------------------------------------------------
# PDF access
# ----------------------------------------------------------------------------------------------
def page_lines(pdf_path, pages):
    import pdfplumber

    with pdfplumber.open(pdf_path) as pl:
        for pno in pages:
            txt = pl.pages[pno - 1].extract_text() or ""
            yield pno, [l.strip() for l in txt.splitlines()]


# ----------------------------------------------------------------------------------------------
# sections
# ----------------------------------------------------------------------------------------------
class Section:
    def __init__(self, heading, page, parents):
        self.heading = heading
        self.page = page
        self.parents = parents
        self.notes = []
        self.bullets = []
        self.chambers = []  # [(cc, label)]
        self.cr_note = None
        self.alloy = None
        self.rings_included = None
        self.ring_pack = None
        self.pin = None
        self.rod_note = None
        self.rows = []

    def absorb_bullet(self, text):
        self.bullets.append(text)
        for part in re.split(r"\s•\s", text):
            part = part.strip("• ").strip()
            if re.search(r"\b2618\b", part):
                self.alloy = "2618"
            elif re.search(r"\b4032\b", part):
                self.alloy = "4032"
            m = re.search(r"C/R at (.*)$", part)
            if m:
                self.cr_note = "CR at " + m.group(1).rstrip(".")
            if re.search(r"Rings? Sold Separately", part, re.I):
                self.rings_included = False
            elif re.search(r"Rings? Included", part, re.I):
                self.rings_included = True
            m = re.search(r"((?:\d\.\d|\d/\d+)\s*mm?,\s*(?:\d\.\d|\d/\d+)\s*mm?,\s*(?:\d\.\d|\d/\d+)\s*mm?)", part)
            if m and "Ring" in part:
                self.ring_pack = m.group(1)
            m = re.search(r"(\d?\.\d{3,4})[”\"]? ?Pin Diameter", part)
            if m:
                self.pin = float(m.group(1))
            m = re.search(r"designed for use with (stock|aftermarket) rod", part, re.I)
            if m:
                self.rod_note = f"designed for {m.group(1).lower()} rod"


def heading_pin(text):
    m = re.search(r"(?<![\d.])(\d?\.\d{3,4}|\d{3,4})[”\"] ?[Pp]in\b", text)
    if m:
        v = m.group(1)
        return float(v if "." in v else "." + v)
    return None


def heading_ci(text):
    m = re.search(r"\b(\d{3})ci\b", text)
    return int(m.group(1)) if m else None


def parse_header_ccs(lines, i):
    """Chamber-cc columns of the table whose `Kit Part #` line is lines[i]. The cc values sit on that line
    (`Volume 58cc 62cc ... Wrist`), on the line(s) above it (`Avg Gram 65cc 73cc Ring Comp.` / a lone `85cc`),
    or as names (`Volume Stage1 Stage2 Wrist`). Column labels (`'09+ 5.7L All 6.1L`) come from the Kit line or
    the `Size Ht.` line below."""
    ccs = []
    for src in lines[max(0, i - 3):i + 1]:
        if re.match(r"^(Kit Part #|Bore Comp|\d+(\.\d+)?cc$|Compression Ratio At)", src):
            for m in re.finditer(r"(?<![\d.])(\d+(?:\.\d+)?)cc\b", src):
                ccs.append((m.group(1), None))
    labels = []
    m = re.search(r"Volume\s+(?:(.*?)\s+)??Wrist", lines[i])
    if m and m.group(1):
        toks = [t for t in m.group(1).split() if not re.match(r"^\d+(\.\d+)?cc$", t)]
        if not ccs and toks:
            ccs = [(t, None) for t in toks]
        elif toks:
            labels.append(" ".join(toks))
    nxt = lines[i + 1] if i + 1 < len(lines) else ""
    if nxt.startswith("Size Ht"):
        rest = [w for w in nxt.split() if w not in HEADER_LABEL_WORDS]
        if rest:
            labels.append(" ".join(rest))
    return ccs, ("; ".join(labels) or None)


# ----------------------------------------------------------------------------------------------
# rows
# ----------------------------------------------------------------------------------------------
def is_row(tokens):
    return len(tokens) >= 4 and PN_RE.match(tokens[0]) and NUMG_RE.match(tokens[1]) and not tokens[0].startswith(("RCS", "CS", "CW"))


GEO_RE = re.compile(r"^\d{1,2}\.\d{2,3}(?:/\d{1,2}\.\d{2,3})*$")  # CH / stroke / rod / deck heights (CRs have one decimal)


def num_groups(body, i):
    """Read geometry tokens from body[i:], joining '3.480 / 3.750' and '6.098/6.100' alternatives -> [[a, b], ...]."""
    groups = []
    while i < len(body) and GEO_RE.match(body[i]) and len(groups) < 5:
        g = [float(x) for x in body[i].split("/")]
        i += 1
        while i + 1 < len(body) and body[i] == "/" and GEO_RE.match(body[i + 1]):
            g += [float(x) for x in body[i + 1].split("/")]
            i += 2
        groups.append(g)
    return groups, i


def cr_values(tok):
    """'11.1' -> [11.1]; '11.1/12.0' -> [11.1, 12.0]; glued '10.6/11.210.1/11.0' -> [10.6, 11.2, 10.1, 11.0]."""
    if "/" in tok or len(tok) > 6:
        return [float(x) for x in re.findall(r"\d{1,2}\.\d(?!\d)", tok)] or [float(x) for x in re.findall(r"\d{1,2}\.\d{1,2}", tok)]
    return [float(CR_RE.match(tok).group(1))]


def region_end(body, i):
    """Index where the dome / CR region ends: the pin part number, the pin specs, a ring set, ring specs or the tail."""
    j = i
    while j < len(body):
        t = body[j]
        nxt = body[j + 1] if j + 1 < len(body) else ""
        if PINPN_RE.match(t) or SLEEVE_RE.match(t) or LOCK_RE.match(t) or K1ROD_RE.match(t) or t in ("Strutted", "Spirolox®", '"Spirolox®'):
            break
        if re.match(r"^\d?\.\d{2,4}$|^1\.0\d*$", t) and nxt in ("x", "X"):
            break
        if re.match(r"^[A-Z]{1,2}\d{3,5}[A-Z]{0,3}(-\d{4}-\d)?$|^\d{4,5}[A-Z]{1,4}$|^JG\d|^[A-Z]\d{3}[A-Z]\d-\d{4}-\d$", t) and not CR_RE.match(t):
            break
        if REPL_RE.match(t) and not CR_RE.match(t):
            break
        if "mm" in t or "/16" in t or "/64" in t:
            break
        j += 1
    return j


def parse_row(tokens, sec, pno, qa, info, skipped, pro_tru):
    line = " ".join(tokens)
    row = {"page": pno, "pn": tokens[0], "line": line, "cid": None, "bore": None, "ch": None, "stroke": None, "rod": None,
           "zeroDeck": None, "deckHeight": None, "weight": None, "dome": None, "crownText": None, "crs": [], "crsAlt": None,
           "pinPn": None, "pin": None, "pinLength": None, "pinWall": None, "ringSet": None, "ringPack": None, "skirt": None,
           "valve": None, "lock": None, "lockType": None, "sleeve": None, "k1Rod": [], "k1Crank": [], "repl": None,
           "altRings": [], "noteStar": False, "alts": {}, "overprinted": False, "crUnkeyed": False}
    body = tokens[1:]
    row["bore"] = float(body[0].split("/")[0])
    i = 1
    if pro_tru and i < len(body) and INT_RE.match(body[i]) and 100 <= int(body[i]) <= 700:
        row["cid"] = int(body[i])
        i += 1
    groups, i = num_groups(body, i)
    n = len(groups)
    names = {5: ["ch", "stroke", "rod", "zeroDeck", "deckHeight"], 4: ["ch", "stroke", "rod", "deckHeight"], 3: ["ch", "stroke", "rod"]}.get(n)
    if not names:
        skipped.append((pno, line, f"unexpected geometry token count {n}: {groups}"))
        return None
    for k, g in zip(names, groups):
        row[k] = g[0]
        if len(g) > 1:
            row["alts"][k] = g
    if not (0.6 < row["ch"] < 2.6) or not (2.5 < row["stroke"] < 5.2) or not (4.5 < row["rod"] < 8.5):
        qa.append(f"p{pno} {row['pn']}: geometry out of range CH {row['ch']} stroke {row['stroke']} rod {row['rod']} (line: `{line}`)")

    if i < len(body) and INT_RE.match(body[i]) and 150 <= int(body[i]) <= 1200:
        row["weight"] = int(body[i])
        i += 1

    # --- dome / crown words / compression ratios
    n_ch = len(sec.chambers)
    j = region_end(body, i)
    region = body[i:j]
    i = j
    crs, crs_alt, crown, junk = [], [], [], []
    for t in region:
        m = DOME_RE.match(t)
        if m and row["dome"] is None:
            row["dome"] = float(m.group(1))
            row["noteStar"] = t.endswith("*")
        elif NEG_RE.match(t) and row["dome"] is None and not crs:
            row["dome"] = float(t)
        elif t in CROWN_WORDS:
            crown.append(t)
        elif t == "net" and crs and crs[-1] == 0.0 and row["dome"] is None:
            crs.pop()  # "0 net" = zero net crown volume (flat top)
            crs_alt.pop()
            row["dome"] = 0.0
            crown.append("0 net")
        elif re.match(r"^\d{1,2}\.\.\d$", t):
            crs.append(float(t.replace("..", ".")))  # "9..9" = doubled decimal point
            crs_alt.append(None)
            info["CR values printed with a doubled decimal point ('9..9'), read as 9.9"] += 1
        elif CRPAIR_RE.match(t):
            vals = cr_values(t)
            crs.append(vals[0])
            crs_alt.append(vals[1] if len(vals) > 1 else None)
        elif CR_RE.match(t):
            v = float(CR_RE.match(t).group(1))
            if v > 30:
                qa.append(f"p{pno} {row['pn']}: compression ratio printed as {t} (typo), stored as missing (line: `{line}`)")
                v = None
            crs.append(v)
            crs_alt.append(None)
        elif t in ("N/A", "n/a"):
            crs.append(None)
            crs_alt.append(None)
        else:
            junk.append(t)
    if junk:
        if all(len(t) <= 3 or "(" in t or ")" in t for t in junk) and len(junk) >= 3:
            row["overprinted"] = True
            qa.append(f"p{pno} {row['pn']}: dome / CR cells are overprinted in the text layer; dome and CR not extracted (line: `{line}`)")
            crs, crs_alt = [], []
        else:
            qa.append(f"p{pno} {row['pn']}: unexpected tokens {junk} between geometry and pin columns (line: `{line}`)")
    if row["dome"] is None and n_ch and len(crs) == n_ch + 1 and not row["overprinted"]:
        row["dome"] = crs.pop(0)  # positive dome printed without 'cc'
        crs_alt.pop(0)
    if crown:
        row["crownText"] = " ".join(w for w in crown if w not in ("-", "/")) or None
    if not row["overprinted"]:
        if n_ch and len(crs) > n_ch:
            qa.append(f"p{pno} {row['pn']}: {len(crs)} CR values but {n_ch} chamber headers {[c for c, _ in sec.chambers]} (line: `{line}`)")
        elif n_ch and 0 < len(crs) < n_ch:
            info["rows printing fewer CR values than chamber columns (stored unkeyed in spec.crValues)"] += 1
            row["crUnkeyed"] = True
        elif not crs and n_ch:
            info["rows with no CR values printed"] += 1
        if row["dome"] is None:
            info["rows with no dome volume printed"] += 1
    row["crs"] = crs
    if any(v is not None for v in crs_alt):
        row["crsAlt"] = crs_alt

    # --- right part: pin, ring set, ring specs, tail
    rest = body[i:]
    if rest and PINPN_RE.match(rest[0]):
        row["pinPn"] = rest.pop(0)
    rest_s = " ".join(rest).replace('"', "").replace("”", "")
    m = PINSPEC_RE.search(rest_s)
    if m:
        row["pin"], row["pinLength"] = float(m.group(1)), float(m.group(2))
        if m.group(3):
            row["pinWall"] = float(m.group(3) if m.group(3).startswith(".") else "." + m.group(3))
        rest_s = (rest_s[:m.start()] + " " + rest_s[m.end():]).strip()
    m = None
    for cand in RINGSPEC_RE.finditer(rest_s):
        if re.search(r"mm|/|\.", cand.group(1)):
            m = cand
            break
    if m:
        row["ringPack"] = re.sub(r"\s*-\s*", " - ", m.group(1)).strip()
        before = rest_s[:m.start()].split()
        after = rest_s[m.end():].split()
        while before and re.match(r"^\(?x?\s?[48]\)?$|^x$|^\(x[48]\)$", before[-1]):
            before.pop()
        if before and RINGSET_TOK_RE.match(before[-1]):
            row["ringSet"] = before[-1]
            before = before[:-1]
        if before:
            qa.append(f"p{pno} {row['pn']}: unplaced tokens before ring specs {before} (line: `{line}`)")
    else:
        after = rest_s.split()
        if after and RINGSET_TOK_RE.match(after[0]) and not SLEEVE_RE.match(after[0]) and not LOCK_RE.match(after[0]) and not K1ROD_RE.match(after[0]) and not (pro_tru and REPL_RE.match(after[0])):
            row["ringSet"] = after.pop(0)
        info["rows without ring specs in the row (ring pack from the section bullet where stated)"] += 1
    tail_words = []
    k = 0
    while k < len(after):
        t = after[k].strip('"')
        nxt = after[k + 1].strip('"') if k + 1 < len(after) else ""
        if t == "Strutted":
            row["skirt"] = "strutted"
        elif t == "Slab" and nxt == "Side":
            row["skirt"] = "slab side"
            k += 1
        elif SLEEVE_RE.match(t):
            row["sleeve"] = t
        elif LOCK_RE.match(t):
            row["lock"] = t
            if nxt == "Wire":
                row["lockType"] = "wire lock"
                k += 2
            elif nxt == "Spirolox®":
                row["lockType"] = "Spirolox"
                k += 1
        elif t in ("Wire", "Lock", "Spirolox®", "/", "x", "x8", "8", "(x8)", "(x4)", "4"):
            pass
        elif K1ROD_RE.match(t):
            row["k1Rod"].append(t)
        elif K1CRANK_RE.match(t.rstrip("/")):
            row["k1Crank"].append(t.rstrip("/"))
        elif pro_tru and REPL_RE.match(t) and row["repl"] is None:
            row["repl"] = t
        elif re.match(r"^[0-9A-Z]$", t):
            pass  # overlapping K1 part numbers ("0 0 1 1 2 2 A A E E ...")
        else:
            tail_words.append(t)
        k += 1
    if tail_words:
        row["valve"] = " ".join(tail_words)
    return row


# ----------------------------------------------------------------------------------------------
# PDF -> rows
# ----------------------------------------------------------------------------------------------
def fragment_line(text):
    """Pieces of multi-line dome / CR cells ('6cc Solid 18.3 17.8 14.6', '15.7 FT 15.4 FT 13.0 FT', '4cc Solid Dome Dome')."""
    toks = text.split()
    return all(DOME_RE.match(t) or CR_RE.match(t) or t in CROWN_WORDS for t in toks) and any(DOME_RE.match(t) or CR_RE.match(t) for t in toks)


def parse_pdf(pdf_path, pages, qa, info, skipped):
    rows, sections = [], []
    sec = None
    pending_heads = []
    pending_cr = None
    pending_ts = None
    last_row = None
    seen = {}

    def open_pending(pno):
        nonlocal sec, pending_heads
        if pending_heads:
            sec = open_section(pending_heads, pno, sections, sec)
            pending_heads = []

    for pno, lines in page_lines(pdf_path, pages):
        pro_tru = pno >= 94
        for li, text in enumerate(lines):
            if not text or "WISECO.COM" in text or text.startswith("Compression Ratio At"):
                continue
            if re.match(r"^(Coming|\*)\s*[A-Z]", text) and is_row(re.sub(r"^(Coming|\*)\s*", "", text).split()):
                text = re.sub(r"^(Coming|\*)\s*", "", text)
            tokens = text.split()
            if len(tokens) == 1 and (len(text) <= 10 or not re.search(r"\d", text)) and not text.startswith(("TS#", "W#")):
                if PN_RE.match(text) and sec is not None and not re.match(r"^\d+(\.\d+)?cc$", text):
                    skipped.append((pno, text, "part number printed without data"))
                continue  # rotated chapter tabs ("LS", "SBC", "Pro", "Tru"), lone chamber cc of a header, stray words
            if text.startswith("Kit Part #"):
                open_pending(pno)
                if sec is not None:
                    ccs, labels = parse_header_ccs(lines, li)
                    sec.chambers = ccs
                    if labels:
                        sec.cr_note = (sec.cr_note + "; " if sec.cr_note else "") + "columns: " + labels
                continue
            if text.startswith(("Bore Comp", "Size Ht")):
                continue
            if is_row(tokens):
                open_pending(pno)
                if sec is None:
                    skipped.append((pno, text, "row before any heading"))
                    continue
                row = parse_row(tokens, sec, pno, qa, info, skipped, pro_tru)
                if row is None:
                    continue
                if pending_cr and row["alts"]:
                    row["crs"] = pending_cr
                    pending_cr = None
                if pending_ts:
                    row["altRings"].append(pending_ts)
                    pending_ts = None
                key = (row["pn"], row["bore"], row["stroke"], row["rod"], row["ch"])
                norm = re.sub(r"\s+", " ", text)
                if key in seen:
                    if seen[key][0] != norm:
                        qa.append(f"p{pno} {row['pn']}: duplicate page prints a different line (kept p{seen[key][1]}): `{norm}`")
                    else:
                        info["duplicate rows dropped (every page is printed twice)"] += 1
                    continue
                seen[key] = (norm, pno)
                row["section"] = sec
                sec.rows.append(row)
                rows.append(row)
                last_row = row
                continue
            if text.startswith("•"):
                open_pending(pno)
                if sec is not None:
                    sec.absorb_bullet(text)
                continue
            if CRLINE_RE.match(text):
                vals = [float(v) for v in re.findall(r"\d{1,2}\.\d{1,2}", text)]
                if last_row is not None and last_row["alts"] and last_row["crsAlt"] is None and last_row["crs"] and pending_cr is None:
                    last_row["crsAlt"] = vals
                    info["rows with CR values for a second stroke/rod combination (spec.applications)"] += 1
                else:
                    pending_cr = vals
                continue
            if text.startswith("TS#"):
                pending_ts = text.split()[0].rstrip(",")
                continue
            if text.startswith("W#"):
                if last_row is not None:
                    last_row["altRings"].append(text.split()[0])
                continue
            if re.match(r"^[0-9A-Z]{6,}(\s*/\s*[0-9A-Z]{6,})*\s*/?$", text) or re.match(r"^/?\d{3}[A-Z]{2,4}\d{3,5}", text):
                if last_row is not None:  # K1 part numbers wrapped to the next line
                    for t in re.findall(r"[0-9A-Z]{6,}", text):
                        if K1ROD_RE.match(t):
                            last_row["k1Rod"].append(t)
                        elif K1CRANK_RE.match(t):
                            last_row["k1Crank"].append(t)
                continue
            if fragment_line(text):
                info["dome / CR cell fragment lines ignored (multi-line cells of overprinted rows)"] += 1
                continue
            if re.match(r"^\d\.\d{3}\s+\d\.\d{2,3}\s", text):
                skipped.append((pno, text, "row without a part number"))
                continue
            if text.startswith(NOTE_START):
                if pending_heads:
                    pending_heads.append(text)
                elif sec is not None and text.lstrip("* ").rstrip(".") not in sec.notes:
                    sec.notes.append(text.lstrip("* ").rstrip("."))
                continue
            if re.match(r"^(PRO TRU|PERFORMANCE QUALITY|Our Pro Tru|include rings|piston to get|BIG BLOCK CHEVY$|CHRYSLER$|Chrysler$|4032 FORGED ALUMINUM)", text):
                continue
            pending_heads.append(text)
    return rows, sections


def open_section(heads, pno, sections, prev):
    heads = [h for h in heads if h]
    notes = [h for h in heads if h.startswith(NOTE_START)]
    titles = [h for h in heads if not h.startswith(NOTE_START)] or heads
    heading = re.sub(r"\s*Continued$", "", titles[-1]).strip()
    parents = [re.sub(r"\s*Continued$", "", t).strip() for t in titles[:-1]]
    if prev is not None and heading == prev.heading and not notes:
        for p in parents:  # the duplicate page may glue the chapter tab to the banner ("BBC Chevrolet Big Block ...")
            if not any(p.endswith(q) or q.endswith(p) for q in prev.parents):
                prev.parents.append(p)
        return prev  # "... Continued" on the next page
    s = Section(heading, pno, parents)
    s.notes = [n.lstrip("* ").rstrip(".") for n in notes]
    sections.append(s)
    return s


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
SBC = ("Small-block Chevy", 8, True)
BBC = [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
SBF = ("Small-block Ford (Windsor)", 8, True)


def families_for(sec):
    h = " | ".join([sec.heading] + sec.parents).upper()
    page = sec.page
    if page <= 41:
        if re.search(r"GEN V|\bLT[124]\b|\bL83\b", h):
            return [("GM LT (Gen V)", 8, True)]
        if re.search(r"\bLS\b|\bLS\d\b|MAX DOME LS", h):
            return [("GM LS", 8, True)]
        return [SBC]
    if page <= 69:
        return BBC
    if page <= 81:
        if "426" in h:
            return [("Chrysler 426 Hemi", 8, True)]
        if re.search(r"6\.2L|6\.4L", h):
            return [("Chrysler Gen III Hemi 6.2/6.4", 8, True)]
        if re.search(r"5\.7L|6\.1L", h):
            return [("Chrysler Gen III Hemi 5.7/6.1", 8, True)]
        if re.search(r"383|440", h):
            return [("Mopar B/RB big block", 8, True)]
        return [("Mopar LA small block", 8, True)]
    if page <= 93:
        if re.search(r"2300|PINTO|2\.3L", h):
            return [("Ford 2300 Pinto", 4, False)]
        if "GODZILLA" in h:
            return [("Ford Godzilla 7.3", 8, True)]
        if "COYOTE" in h:
            return [("Ford Coyote", 8, True)]
        if re.search(r"4\.6|5\.4|MOD OHC", h):
            return [("Ford Modular", 8, True)]
        return [SBF]
    # Pro Tru Street
    if h.startswith("AMC"):
        return [("AMC V8", 8, True)]
    if "GRAND NATIONAL" in h or "3.8L V6 TURBO" in h:
        return [("Buick V6 181-252", 6, True)]
    if "BUICK 455" in h:
        fams = [("Buick big block", 8, True)]
        if "CADIL" in h:
            fams.append(("Cadillac 368-500", 8, True))
        return fams
    if "4.3L" in h:
        return [("Chevy 4.3L/262 V6", 6, False)]
    if "3800" in h or "L67" in h:
        return [("Chevy 3.8L L67 V6 3800 Series", 6, False)]
    if "VORTEC 8.1" in h:
        return [("Chevy Vortec 8.1 (Gen VII)", 8, False)]
    if "LS SERIES" in h:
        return [("GM LS", 8, True)]
    if re.search(r"\b(396|427|454|502) (BIG BLOCK|CUBIC)|BIG BLOCK 502", h):
        return BBC
    if re.search(r"CHEVY (305|350|400)", h):
        return [SBC]
    if "SLANT 6" in h:
        return [("Mopar Slant Six", 6, True)]
    if re.search(r"CHRYSLER (318|340|360)", h):
        return [("Mopar LA small block", 8, True)]
    if "CHRYSLER 440" in h:
        return [("Mopar B/RB big block", 8, True)]
    if "CLEVELAND" in h:
        return [("Ford 351C/351M/400", 8, True)]
    if "WINDSOR" in h:
        return [SBF]
    if re.search(r"\bFE\b", h):
        return [("Ford FE", 8, True)]
    if "FORD 460" in h:
        return [("Ford 429/460", 8, True)]
    if "FLATHEAD" in h:
        return [("Ford Flathead V8", 8, False)]
    if "JEEP 4.0" in h:
        return [("AMC/Jeep inline-6", 6, True)]
    if "OLDSMOBILE" in h:
        return [("Oldsmobile V8", 8, True)]
    return [(sec.heading, None, False)]


# ----------------------------------------------------------------------------------------------
# rows -> records
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def crown_word(dome, crown_text, heading):
    h = heading.upper()
    if crown_text and "Hollow" in crown_text:
        return "hollow dome"
    if dome is None:
        return "crown"
    if dome > 0.5:
        return "dome"
    if dome < -8:
        return "reverse dome" if "REVERSE" in h else "dish"
    return "flat top"


def cr_dict(sec, crs, unkeyed):
    if not crs or unkeyed:
        return None
    keys = [c for c, _ in sec.chambers]
    if len(keys) < len(crs):
        keys = keys + [f"col{j + 1}" for j in range(len(keys), len(crs))]
    return {k: v for k, v in zip(keys, crs) if v is not None} or None


def build_records(rows, qa):
    by_key, order = {}, []
    for r in rows:
        s = r["section"]
        cr = cr_dict(s, r["crs"], r["crUnkeyed"])
        combos = [clean({"stroke": r["stroke"], "rodLength": r["rod"], "zeroDeckHeight": r["zeroDeck"], "deckHeight": r["deckHeight"], "cr": cr})]
        alts = r["alts"]
        if alts:  # "3.480 / 3.750" stroke with "6.125 / 6.000" rod (or "6.098/6.100" rod): one application per alternative
            n_alt = max(len(v) for v in alts.values())
            for a in range(1, n_alt):
                c2 = dict(combos[0])
                for k in ("stroke", "rod", "zeroDeck", "deckHeight"):
                    kk = {"rod": "rodLength", "zeroDeck": "zeroDeckHeight"}.get(k, k)
                    if k in alts and len(alts[k]) > a:
                        c2[kk] = alts[k][a]
                if r["crsAlt"] and a == 1:
                    c2["cr"] = cr_dict(s, r["crsAlt"], False)
                else:
                    c2.pop("cr", None)
                combos.append(clean(c2))
        for fam, cyl, known in families_for(s):
            key = (fam, r["pn"])
            if key not in by_key:
                by_key[key] = {"fam": fam, "cyl": cyl, "known": known, "first": r, "combos": [], "sections": OrderedDict(), "bores": []}
                order.append(key)
            e = by_key[key]
            e["sections"][s.heading] = True
            if r["bore"] not in e["bores"]:
                e["bores"].append(r["bore"])
            for c in combos:
                if c not in e["combos"]:
                    e["combos"].append(c)
            f = e["first"]
            if f is not r:
                for k in ("ch", "dome", "bore", "pin"):
                    if f.get(k) != r.get(k) and f.get(k) is not None and r.get(k) is not None:
                        qa.append(f"PN {r['pn']} ({fam}): `{k}` differs between p{f['page']} ({f.get(k)}) and p{r['page']} ({r.get(k)}) — catalog inconsistency, first value kept")

    records = []
    for key in order:
        e = by_key[key]
        r, fam, cyl = e["first"], e["fam"], e["cyl"]
        s = r["section"]
        first = e["combos"][0]
        if r["cid"] and cyl and r["bore"] and first.get("stroke"):
            calc = math.pi / 4 * r["bore"] ** 2 * first["stroke"] * cyl
            if abs(calc - r["cid"]) > max(4, 0.02 * calc):
                qa.append(f"PN {r['pn']} p{r['page']}: catalog CID {r['cid']} vs computed {calc:.0f} ({r['bore']} bore x {first['stroke']} stroke x {cyl}) — check row")
        pin = r["pin"] or heading_pin(s.heading) or s.pin
        pin_src = "row pin specs" if r["pin"] else ("heading" if heading_pin(s.heading) else ("bullet" if s.pin else None))
        alloy = s.alloy or ("4032" if r["page"] >= 94 else None)
        alloy_src = "section bullet" if s.alloy else ("chapter statement (Pro Tru p94)" if alloy else None)
        notes = list(s.parents)
        notes += s.notes
        if s.rod_note:
            notes.append(s.rod_note)
        if r["valve"]:
            notes.append("valve pockets: " + r["valve"])
        if r["noteStar"]:
            notes.append("see section footnote on dome")
        others = [h for h in e["sections"] if h != s.heading]
        if others:
            notes.append("also listed under: " + "; ".join(others))
        ci = r["cid"] or heading_ci(s.heading)
        cr_note = s.cr_note
        if r["crUnkeyed"]:
            cr_note = (cr_note + "; " if cr_note else "") + f"row prints {len(r['crs'])} CR value(s) for {len(s.chambers)} chamber columns {[c for c, _ in s.chambers]}; alignment unknown"
        spec = clean({
            "bore": r["bore"],
            "boreOptions": sorted(e["bores"]) if len(e["bores"]) > 1 else None,
            "stroke": first.get("stroke"),
            "rodLength": first.get("rodLength"),
            "ch": r["ch"],
            "pin": pin,
            "pinLength": r["pinLength"],
            "pinWall": r["pinWall"],
            "pinPn": r["pinPn"],
            "domeCc": r["dome"],
            "crownNote": r["crownText"],
            "alloy": alloy,
            "weight": r["weight"],
            "cr": first.get("cr"),
            "crValues": [v for v in r["crs"] if v is not None] if r["crUnkeyed"] else None,
            "crNote": cr_note,
            "deckHeight": first.get("deckHeight"),
            "zeroDeckHeight": first.get("zeroDeckHeight"),
            "ringPack": r["ringPack"] or s.ring_pack,
            "ringsIncluded": s.rings_included,
            "ringSet": r["ringSet"],
            "ringSetOptions": r["altRings"] or None,
            "skirt": r["skirt"],
            "lock": r["lock"],
            "lockType": r["lockType"],
            "ringCompressor": r["sleeve"],
            "replacementPiston": r["repl"],
            "k1Rod": sorted(set(r["k1Rod"])) or None,
            "k1Crank": sorted(set(r["k1Crank"])) or None,
            "series": "Pro Tru Street" if r["page"] >= 94 else None,
        })
        if len(e["combos"]) > 1:
            spec["applications"] = e["combos"]
        dome_s = f" {r['dome']:+.1f}cc".replace("+", "") if r["dome"] is not None else ""
        series = "Wiseco Pro Tru Street forged piston kit" if r["page"] >= 94 else "Wiseco forged piston kit"
        name = f"{series}, {r['bore']:.3f} bore, {crown_word(r['dome'], r['crownText'], s.heading)}{dome_s}, {r['ch']} CH"
        records.append({
            "m": BRAND,
            "p": r["pn"],
            "cat": "piston",
            "name": name,
            "fit": clean({"fam": fam, "ci": [ci] if ci else None, "cyl": cyl, "notes": "; ".join(notes) or None}),
            "spec": spec,
            "src": {"doc": DOC, "edition": EDITION, "file": os.path.relpath(PDF_DEFAULT, REPO).replace(os.sep, "/"), "page": r["page"], "section": s.heading},
            "emissions": None,
            "_known": e["known"],
            "_pinSrc": pin_src,
            "_alloySrc": alloy_src,
        })
    return records


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("bore", "stroke", "rodLength", "ch", "pin", "pinLength", "pinWall", "domeCc", "weight", "deckHeight", "zeroDeckHeight")


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
        for k in ("boreOptions", "crValues"):
            v = rec["spec"].get(k)
            if v is not None and (not isinstance(v, list) or not all(isinstance(x, (int, float)) for x in v)):
                errs.append(f"{rec['p']}: spec.{k} is not a list of numbers: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and (not isinstance(cr, dict) or not all(isinstance(v, (int, float)) for v in cr.values())):
            errs.append(f"{rec['p']}: spec.cr malformed: {cr!r}")
        for c in rec["spec"].get("applications", []):
            for k in ("stroke", "rodLength", "deckHeight", "zeroDeckHeight"):
                v = c.get(k)
                if v is not None and not isinstance(v, (int, float)):
                    errs.append(f"{rec['p']}: applications.{k} is not a number: {v!r}")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, pdf_path, rows, sections, records, skipped, qa, info, errs, unknown):
    fam_recs, cov = Counter(), Counter()
    for rec in records:
        fam_recs[rec["fit"]["fam"]] += 1
        for k in ("ch", "domeCc", "pin", "cr", "crValues", "weight", "ringPack", "stroke", "rodLength", "alloy"):
            if rec["spec"].get(k) is not None:
                cov[k] += 1
    pin_src = Counter(r["_pinSrc"] or "none" for r in records)
    alloy_src = Counter(r["_alloySrc"] or "none" for r in records)
    sec_rows = OrderedDict()
    for s in sections:
        if s.rows:
            sec_rows[(s.page, s.heading)] = sec_rows.get((s.page, s.heading), 0) + len(s.rows)
    n = len(records)
    L = ["# Wiseco — extraction notes", ""]
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_wiseco.py` from `{os.path.relpath(pdf_path, REPO)}` (local file, no network).")
    L += ["", "## What was parsed", ""]
    L.append(f"PDF pages {PAGES.start}–{PAGES.stop - 1} (printed page numbers are the same). The PDF prints every catalog page twice (page n and n+1 carry the same tables, a few with one row differing); rows are de-duplicated on part number + bore + stroke + rod + CH and the first page is cited. "
             f"{len(rows)} unique table rows parsed into {n} records. A record is one part number in one fitment family; a part number printed under several stroke/rod rows becomes one record whose `spec.stroke / rodLength / deckHeight / cr` are the first row and `spec.applications` lists all rows (rows printed as `3.480 / 3.750` stroke with `6.125 / 6.000` rod, or `6.098/6.100` rod, are split the same way, with the second CR line attached to the second application).")
    L.append("")
    L.append("Not extracted: pp 112–163 sport compact and 164–183 European (no fitment family in the list); 184+ rings, pins, locks, ring compressors, technology, apparel. The separate powersports catalog is ignored per the brief.")
    L += ["", "### Column mapping", ""]
    L += [
        "K-series columns: `Kit Part # | Bore Size | Comp Ht. | Stroke | Rod | 0 Deck at | Std Deck Ht. | Avg Gram Wt. | Comp. Volume | Compression Ratio At <chamber cc>... | Wrist Pin # | Wrist Pin Specs | Ring Set | Ring Specs | Skirt | Valve Pocket (or Lock Part # | Lock Type) | Ring Comp. Sleeve | K1 Con. Rod | K1 Crankshaft Part #`. "
        "Pro Tru Street columns: `Kit Part # | Bore | Cubic Inch | Comp. Ht. | Stroke | Rod | Avg. Wt. | Volume | CR at <cc> | Wrist Pin # | Wrist Pin Specs | Ring Set | Ring Specs | Repl. Piston | Lock Part # | Lock Type | Ring Comp. Sleeve | K1 Con. Rod | K1 Crankshaft`.",
        "",
        "- `spec.bore`, `ch`, `stroke`, `rodLength`, `weight` (grams), `domeCc` (Comp. Volume: negative = dish / reverse dome, positive = dome; `*` footnoted domes get `see section footnote on dome` in `fit.notes`) are the printed values. `spec.crownNote` keeps crown words printed in the volume column (`Hollow`, `Solid`, `FT`).",
        "- `spec.deckHeight` = `Std Deck Ht.` (the stock block deck height), `spec.zeroDeckHeight` = `0 Deck at` (the deck height at which the piston is at zero deck); their difference is the piston-to-deck distance at a stock deck.",
        "- Compression ratios are keyed by the chamber cc in the header block (`spec.cr = {\"58\": 11.6, \"62\": 10.9, ...}`); the Pro Tru Buick GN table keys them `Stage1` / `Stage2` as printed. Tables whose header labels the columns (`‘09+ 5.7L / All 6.1L`) carry the labels in `spec.crNote` together with the section's CR basis (`CR at 0 deck with .051” gasket`). Rows that print fewer CR values than the table has chamber columns cannot be aligned: they are stored unkeyed in `spec.crValues` with a `crNote`.",
        "- `spec.pin` is read from the row's `Wrist Pin Specs` (`.927 x 2.250 x .173` → pin .927, `pinLength` 2.250, `pinWall` .173); when the row has none, from the section title (`• .927” Pin`, `9252” Pin` = .9252 LS7) or the bullet `.927” Pin Diameter`. `spec.pinPn` is the Wiseco pin part number.",
        f"  Pin sources over the records: {dict(pin_src)}.",
        "- `spec.alloy` is the section bullet (`2618 High Strength Alloy`); Pro Tru Street sections have no bullets and take the chapter statement on p94 (`forged from 4032 alloy`). "
        f"Sources over the records: {dict(alloy_src)}.",
        "- `spec.ringPack` is the row's Ring Specs (`1.5mm - 1.5mm - 3mm`, `1/16-1/16-3/16`, `.043 - .043 - 3.0mm`), else the section bullet; `spec.ringSet` the Wiseco ring set part number, `ringSetOptions` the Total Seal (`TS#`) / alternate (`W#`) sets printed on extra lines; `ringsIncluded` from the bullets (`Rings Included` / `Rings Sold Separately`).",
        "- `spec.skirt` (`strutted` / `slab side`), `lock` / `lockType`, `ringCompressor` (RCS sleeve), `replacementPiston` (Pro Tru bare piston PN), `k1Rod` / `k1Crank` (companion K1 Technologies part numbers, only when printed cleanly; the overlapped `0 0 1 1 2 2 A A ...` strings are dropped). `fit.notes` carries the valve-pocket text (`LS1, 2, 3, 6, 92 (cathedral)`), the stock/aftermarket rod note and section notes.",
        "- `cat` is `piston` for every record: Wiseco K kits are piston + pin + locks (rings per section), not piston + rod kits, so no `pistonKit` records. `emissions` is `null`.",
        "- Known gap: in the BBC `12°-14° Solid Dome` and `18° Solid Dome` tables (pp 60–67) the volume / CR cells are two-line cells (`6cc Solid Dome` over `-6cc Cut to FT`, CRs for both) and the text layer overprints them into unreadable character soup; those rows keep bore / CH / stroke / rod / deck / pin / rings but no `domeCc` or `cr` (listed one per row under QA). Pages 60–67 need a manual pass or a rendered-image read.",
    ]
    L += ["", "### Family mapping", ""]
    L += [
        "- By chapter (pp 4–41 LS/LT/SBC, 42–69 BBC, 70–81 Chrysler, 82–93 Ford, 94–111 Pro Tru) refined by title keywords: `GEN V` / `LT1` / `LT2` / `LT4` / `L83` → `GM LT (Gen V)`; `LS` → `GM LS`; 5.7L / 6.1L → `Chrysler Gen III Hemi 5.7/6.1`; 6.2L Hellcat / 6.4L → `Chrysler Gen III Hemi 6.2/6.4`; 318/340/360 → `Mopar LA small block`; 383/400/440 → `Mopar B/RB big block`; 426 → `Chrysler 426 Hemi`; 302 / 351 Windsor → `Small-block Ford (Windsor)`; 4.6 / 5.4 → `Ford Modular`; Coyote; Godzilla; Pro Tru AMC / Buick / Cadillac / Chevy / Chrysler / Ford / Jeep / Olds by name.",
        "- Big-block Chevy sections are emitted under both `Chevy Mark IV big block` and `Chevy Gen VI big block` (same convention as MAHLE / JE).",
        "- `Buick 455 / Cadiliac 500` (sic) is emitted under both `Buick big block` and `Cadillac 368-500`.",
    ]
    if unknown:
        L.append(f"- **Families not in the fitment list** (`fit.fam` = catalog heading or a descriptive name; needs a decision): {', '.join('`' + u + '`' for u in unknown)}.")
    L += ["", "## Spec coverage", "", "| field | records with a value |", "|---|---|"]
    L += [f"| {k} | {cov[k]} / {n} |" for k in ("stroke", "rodLength", "ch", "pin", "domeCc", "cr", "crValues", "weight", "ringPack", "alloy")]
    L += ["", "## Informational counts (not QA items)", ""]
    L += [f"- {k}: {v}" for k, v in sorted(info.items(), key=lambda kv: -kv[1])] or ["- none"]
    L += ["", "## Rows per section (PDF page where the table starts)", "", "| page | section | rows |", "|---|---|---|"]
    L += [f"| {p} | {h} | {c} |" for (p, h), c in sec_rows.items()]
    L += ["", "## Records per family", "", "| family | records |", "|---|---|"]
    L += [f"| {f} | {c} |" for f, c in sorted(fam_recs.items(), key=lambda kv: (-kv[1], kv[0]))]
    L.append(f"| **total** | {n} |")
    L += ["", "## Rows skipped", ""]
    L += [f"- p{p}: {why}: `{line}`" for p, line, why in skipped] or ["- none"]
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
    ap.add_argument("--pdf", default=PDF_DEFAULT, help="path to the Wiseco automotive catalog PDF")
    ap.add_argument("--pages", help="debug: comma-separated PDF pages to parse instead of the full range")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    pages = [int(p) for p in args.pages.split(",")] if args.pages else list(PAGES)

    os.makedirs(OUT, exist_ok=True)
    qa, skipped, info = [], [], Counter()
    rows, sections = parse_pdf(args.pdf, pages, qa, info, skipped)
    records = build_records(rows, qa)
    unknown = sorted({r["fit"]["fam"] for r in records if not r["_known"]})
    errs = validate(records)
    write_notes(os.path.join(OUT, "wiseco.md"), args.pdf, rows, sections, records, skipped, qa, info, errs, unknown)
    for r in records:
        for k in ("_known", "_pinSrc", "_alloySrc"):
            r.pop(k, None)
    out = {
        "source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": os.path.relpath(args.pdf, REPO).replace(os.sep, "/"),
                   "pages": f"PDF pages {PAGES.start}-{PAGES.stop - 1}"},
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "wiseco.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"rows parsed: {len(rows)}; records: {len(records)}; skipped lines: {len(skipped)}; QA items: {len(qa)}; validation errors: {len(errs)}")
    for e in errs[:50]:
        print("  VALIDATION:", e)
    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
