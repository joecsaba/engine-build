#!/usr/bin/env python3
"""Extract Crower camshafts, valve springs and lifters from the 2025 master-catalog PDFs.

Sources (all linked from https://crower.com/master-catalog, which is fetched first):
  - per-make 2025 camshaft PDFs (AMC, Buick, Chevrolet, Ford, Mopar, Oldsmobile, Pontiac)
    -> `cam` records (durations, lifts, LSA, lash, RPM range, redline, recommended kit PNs)
  - Spring_Booklet_2024_V3.pdf -> `spring` records (OD/ID, installed height, rate, loads at
    heights, coil bind, retainers); springs quoted on the cam pages add seat/nose loads
  - "Lifters -Rollers 119-132" PDF -> `lifter` records (flat tappet, hydraulic roller, solid roller)

Output: out/crower.json (shared parts record format) and out/crower.md (notes).
Re-runnable: PDFs are downloaded once into dl/crower/ and reused; --offline skips the network.
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
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(BASE, "dl", "crower")
OUT = os.path.join(BASE, "out")
HOST = "https://crower.com"
CATALOG_URL = HOST + "/master-catalog"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "Crower"
EDITION = "2025"
MIN_GAP = 6.0

CAM_MAKES = ["AMC", "Buick", "Chevrolet", "Ford", "Mopar", "Oldsmobile", "Pontiac"]
CAM_PDF_RE = re.compile(r"/media/pdf/2025/Camshafts/Domestic/(AMC|Buick|Chevrolet|Ford|Mopar|Oldsmobile|Pontiac)_[^\"'\s]+\.pdf")
SPRING_PDF_RE = re.compile(r"/media/hexaattachment/products/attachments/Spring_Booklet[^\"'\s]*\.pdf")
LIFTER_PDF_RE = re.compile(r"/media/pdf/2025/Lifters[^\"'\s]*\.pdf")
IMPORT_MAKES = ("Nissan", "Mitsubishi", "Honda", "Toyota", "Subaru", "Volkswagen", "Holden")

# ----------------------------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------------------------
_last_request = 0.0


def fetch(url, dest, log):
    """Download url to dest unless cached. One request at a time, >= 6 s apart. Never retries a 403."""
    global _last_request
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        log.append(f"cached: {url} -> {os.path.relpath(dest, BASE)}")
        return dest
    import requests

    for attempt in range(3):
        wait = MIN_GAP - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=180)
        except requests.exceptions.ConnectionError as e:  # transfer cut off; a plain network retry
            _last_request = time.time()
            log.append(f"GET {url} -> connection error ({e.__class__.__name__}), attempt {attempt + 1}")
            time.sleep(2 ** (attempt + 1))
            continue
        _last_request = time.time()
        log.append(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
        if r.status_code != 200:
            raise SystemExit(f"{url}: HTTP {r.status_code}; not retrying")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(r.content)
        return dest
    raise SystemExit(f"{url}: gave up after repeated connection errors")


def check_robots(log, paths):
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
    for p in paths:
        for d in disallow:
            if p.startswith(d):
                raise SystemExit(f"robots.txt disallows {d}; stopping")
    log.append(f"robots.txt: {len(txt.strip())} bytes; '*' group disallows {disallow}; crawl-delay {delay}")
    return delay


def discover(log, offline):
    """Return {name: (url, local path)} for the PDFs we use, from the master-catalog page."""
    html_path = os.path.join(DL, "master-catalog.html")
    if not offline:
        fetch(CATALOG_URL, html_path, log)
    html = open(html_path, encoding="utf-8", errors="replace").read()
    docs = OrderedDict()
    for m in CAM_PDF_RE.finditer(html):
        docs.setdefault(m.group(1), HOST + m.group(0))
    sm = SPRING_PDF_RE.search(html)
    if sm:
        docs["springs"] = HOST + sm.group(0)
    lm = LIFTER_PDF_RE.search(html)
    if lm:
        docs["lifters"] = HOST + lm.group(0)
    out = OrderedDict()
    for name, url in docs.items():
        fn = os.path.basename(url).replace("%20", "_")
        out[name] = (url, os.path.join(DL, fn))
    return out


# ----------------------------------------------------------------------------------------------
# generic helpers
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def num(s):
    """'.436"' -> 0.436, '114°' -> 114, '1,200' -> 1200; None when not numeric."""
    if s is None:
        return None
    t = s.strip().rstrip('"”°+').replace(",", "")
    if re.fullmatch(r"-?\d*\.\d+|-?\d+", t):
        v = float(t)
        return int(v) if v.is_integer() and "." not in t else v
    return None


def page_words(page):
    """Words inside the page box (stale objects outside the media box are dropped), de-duplicated."""
    pg = page.crop(page.bbox).dedupe_chars(tolerance=1)
    words = pg.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False)
    for w in words:
        w["yc"] = (w["top"] + w["bottom"]) / 2
        w["xc"] = (w["x0"] + w["x1"]) / 2
    return pg, words


def group_lines(words, tol=3.2):
    lines = []
    for w in sorted(words, key=lambda w: (w["yc"], w["x0"])):
        if lines and abs(w["yc"] - lines[-1]["yc"]) <= tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"yc": w["yc"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
        ln["text"] = " ".join(w["text"] for w in ln["words"])
        ln["top"] = min(w["top"] for w in ln["words"])
        ln["bottom"] = max(w["bottom"] for w in ln["words"])
    return lines


def undouble(tok):
    """'6688334400--1166' (overprinted bold text that dedupe missed) -> '68340-16'."""
    if len(tok) >= 4 and len(tok) % 2 == 0 and tok[0::2] == tok[1::2]:
        return tok[0::2]
    return tok


def cluster(values, tol=3.0):
    out = []
    for v in sorted(values):
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [sum(c) / len(c) for c in out]


def printed_page(lines):
    for ln in lines[-3:]:
        m = re.search(r"(?:^|\s)(\d{1,3})\s+For technical support", ln["text"]) or re.search(r"www\.crower\.com\s+(\d{1,3})$", ln["text"])
        if m:
            return int(m.group(1))
    return None


# ----------------------------------------------------------------------------------------------
# cam pages
# ----------------------------------------------------------------------------------------------
PN_RE = re.compile(r"^(\d{5}[A-Z]{0,3}(?:-\d)?)(\*?)$")
DEG_RE = re.compile(r"^(\d{3})°$")
LIFT_RE = re.compile(r"^(?:\.(\d{3})[\"”]?|(\d{3})[\"”])$")
PLAIN3_RE = re.compile(r"^\d{3}$")
RPM_RE = re.compile(r"^(\d{4})\+?$")
GRIND_RE = re.compile(r"^\d{3}[A-Z]{1,4}\d{0,3}[A-Z]?$")
CID_RE = re.compile(r"^(\d{3}(?:-\d{3}){0,2}|\d\.\d-\d\.\d|ALL|All)$")
KITPN_RE = re.compile(r"^\d{5,6}[A-Z0-9]{0,4}$")
COMP_PN_RE = re.compile(r"^\d{5}[A-Z0-9]*(?:-\d{1,2})?$")
COMP_PN_LOOSE_RE = re.compile(r"^\d{5}[A-Z0-9-]*$")
SPRING_LINE_RE = re.compile(
    r"(\d{5}[A-Z0-9]*)-\d+:?\s+Seat:\s*(\d\.\d{3})\"\s*@\s*(\d+)\s*lbs\s*/\s*Nose:\s*(\d\.\d{3})\"\s*@\s*(\d+)\s*lbs\s*/\s*Coil bind:\s*(\d\.\d{3})\"")
LEVEL_RE = re.compile(r"(?:Performance|PERFORMANCE)\s+Level\s+(\d)(?:\s*-\s*(\d))?(\+)?|(?:STAGE|Stage)\s+(\d)")
REDLINE_RE = re.compile(r"Redline:?\s*(\d{4})", re.I)
RANGE_RE = re.compile(r"Range:?\s*(Idle|\d{3,5})(?:\s*-\s*(\d{4}))?\s*(?:to|-|–)\s*(\d{4})(?:\s*-\s*(\d{4}))?", re.I)
RANGE2_RE = re.compile(r"(\d{4})\s*-\s*(\d{4})\s*RPM", re.I)
KIT_COLS = {
    "Lifters": "lifters", "Springs": "springs", "Retainers": "retainers", "Seals": "seals", "Keepers": "keepers",
    "Keeper": "keepers", "Plug": "plug", "Pushrods": "pushrods", "Cups": "seatCups", "Disc": "springDisc",
    "Seats": "seats", "Locks": "locks",
}
MAKE_WORDS = {"AMC", "Buick", "Chevrolet", "Ford", "Mopar", "Oldsmobile", "Pontiac", "Nissan", "Mitsubishi", "Ford/Mazda"}


def is_header_c(line):
    t = line["text"]
    return "Number" in t and ("Grind" in t or "Sep" in t or "Intake" in t)


def parse_lash(text):
    m1 = re.search(r"\.(\d{3})\"\s*intake", text, re.I)
    m2 = re.search(r"\.(\d{3})\"\s*exhaust", text, re.I)
    if not m1:
        return None
    i = int(m1.group(1)) / 1000
    e = int(m2.group(1)) / 1000 if m2 else i
    return i, e


def parse_years(text):
    y0 = y1 = None
    for m in re.finditer(r"\b(19\d\d|20\d\d)\s*-\s*(19\d\d|20\d\d|up|UP|Present|Later|later)\b", text):
        a = int(m.group(1))
        b = m.group(2)
        y0 = a if y0 is None else min(y0, a)
        if b.isdigit():
            y1 = int(b) if y1 is None else max(y1, int(b))
    for m in re.finditer(r"\b(19\d\d|20\d\d)-(\d\d)\b", text):  # 1957-66
        y0 = int(m.group(1)) if y0 is None else min(y0, int(m.group(1)))
        yy = int(m.group(2))
        yy = (2000 + yy) if yy < 30 else (1900 + yy)
        y1 = yy if y1 is None else max(y1, yy)
    for m in re.finditer(r"\b(19\d\d|20\d\d)\s*(?:-\s*)?(?:up|UP|and up|& up)\b", text):
        y0 = int(m.group(1)) if y0 is None else min(y0, int(m.group(1)))
    return y0, y1


def families_for(make, heading):
    """[(family, cylinders, known)] from the page heading (make + tappet line + engine line)."""
    h = " ".join(heading.split()).upper()
    mk = make.split("/")[0].upper()
    if mk == "CHEVROLET":
        if "INLINE 6" in h or "194 230 250" in h:
            return [("Chevy inline-6", 6, True)]
        if "LS1" in h or "GM LS" in h:
            return [("GM LS", 8, True)]
        if "LT1" in h:
            return [("Small-block Chevy", 8, True)]
        if "BIG BLOCK" in h or "396 402 427 454" in h:
            return [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
        if "348" in h and "409" in h:
            return [("Chevy W-series 348/409", 8, True)]
        if "SMALL BLOCK" in h or "V8 SB" in h or "262 267 283" in h or "262 265 267" in h:
            return [("Small-block Chevy", 8, True)]
        if "60°" in h and "V6" in h:
            return [("Chevy 60° V6 2.8/3.1", 6, False)]
        if "90°" in h and "V6" in h:
            return [("Chevy 90° V6 200/229/262", 6, False)]
    if mk == "FORD":
        if "DURATEC" in h:
            return [("Ford/Mazda Duratec 2.0/2.3", 4, False)]
        if "MODULAR" in h or "4.6L" in h:
            return [("Ford Modular", 8, True)]
        if "2300" in h or "2.3L" in h:
            return [("Ford 2300 OHC (Lima)", 4, False)]
        if "240 300" in h:
            return [("Ford 240/300 inline-6", 6, True)]
        if "351C" in h:
            return [("Ford 351C/351M/400", 8, True)]
        if " FE" in h or "332 352 360 390" in h:
            return [("Ford FE", 8, True)]
        if "429" in h and "460" in h:
            return [("Ford 429/460", 8, True)]
        if "351W" in h or "289 302" in h or "221 255" in h:
            return [("Small-block Ford (Windsor)", 8, True)]
    if mk == "MOPAR":
        if "NEON" in h or "420A" in h:
            return [("Dodge Neon 2.0 / 420A", 4, False)]
        if "VIPER" in h:
            return [("Dodge Viper V10", 10, False)]
        if "MAGNUM" in h:
            return [("Mopar Magnum 5.2/5.9", 8, True)]
        if "5.7" in h and "HEMI" in h:
            return [("Chrysler Gen III Hemi 5.7/6.1", 8, True)]
        if "426 HEMI" in h:
            return [("Chrysler 426 Hemi", 8, True)]
        if " LA " in h + " " or "273 340 360" in h:
            return [("Mopar LA small block", 8, True)]
        if "383" in h and "440" in h:
            return [("Mopar B/RB big block", 8, True)]
    if mk == "OLDSMOBILE":
        return [("Oldsmobile V8", 8, True)]
    if mk == "PONTIAC":
        return [("Pontiac V8", 8, True)]
    if mk == "BUICK":
        if "V6" in h:
            return [("Buick V6 181-252", 6, True)]
        if "400 430 455" in h:
            return [("Buick big block", 8, True)]
        if "350" in h and "215" not in h:
            return [("Buick 350", 8, True)]
        if "215 300 340" in h:
            return [("Buick 215/300/340 V8", 8, False)]
    if mk == "AMC":
        if "6 CYL" in h or "6 CYLINDER" in h:
            return [("AMC/Jeep inline-6", 6, True)]
        if "V8" in h:
            return [("AMC V8", 8, True)]
    eng = heading.split("|")[0].strip()
    return [(f"{make}: {eng}"[:70], None, False)]


def cam_type_from(tappet_line, heading_text, grind, lash):
    t = (tappet_line or "").upper()
    h = heading_text.upper()
    hyd = "HYDRAULIC" in t or ("HYDRAULIC" in h and "MECHANICAL" not in h)
    mech = "MECHANICAL" in t or "MECHANICAL" in h
    roller = "ROLLER" in t
    flat = "FLAT" in t
    if not (hyd or mech):
        if grind and re.search(r"\d(HR|HDP|H|HT|HC)\d*$", grind):
            hyd = True
        elif grind and re.search(r"\d(FDP|F|R)\d*$", grind):
            mech = True
        elif lash is not None:
            hyd = lash[0] == 0
            mech = not hyd
    if not (roller or flat):
        if grind and "HR" in grind:
            roller = True
        elif grind and re.search(r"\dR\d*$", grind):
            roller = True
        else:
            flat = True
    if hyd and roller:
        return "hydraulic_roller"
    if hyd:
        return "hydraulic_flat"
    if mech and roller:
        return "solid_roller"
    if mech:
        return "solid_flat"
    return None


class Section:
    def __init__(self):
        self.header_c = None
        self.header_b = None
        self.header_a = None
        self.heading_lines = []
        self.y0 = self.y1 = None
        self.blocks = []
        self.lash = None
        self.lash_text = None
        self.star_note = None


def parse_kit_tables(lines, qa, where):
    """{option number or kit PN: {col: PN, 'remark': str}} from the ENGINEERED COMPONENT tables on a page."""
    kits = OrderedDict()
    for i, ln in enumerate(lines):
        t = ln["text"]
        is_opt = re.search(r"\bOption\s*#", t) is not None
        is_kit = re.search(r"\bPart No\.?\s*(Lifters|Springs|Retainers)", t) is not None or (
            t.startswith("Part No.") and re.search(r"\b(Lifters|Springs|Retainers)\b", t) and "Remarks" in t)
        if not (is_opt or is_kit):
            continue
        cols = []
        hdr_words = list(ln["words"])
        if i > 0 and abs(lines[i - 1]["top"] - ln["top"]) < 16:
            hdr_words += [w for w in lines[i - 1]["words"] if w["text"] in KIT_COLS]
        for w in hdr_words:
            if w["text"] in KIT_COLS:
                cols.append((KIT_COLS[w["text"]], w["xc"]))
        if not cols:
            continue
        remarks_x = next((w["x0"] for w in ln["words"] if w["text"].startswith("Remark")), None)
        key_x1 = (next((w["x1"] for w in ln["words"] if w["text"] in ("#", "No.", "No")), ln["words"][0]["x1"])) + 6
        n_before = len(kits)
        for ln2 in lines[i + 1:i + 16]:
            ws = ln2["words"]
            if not ws:
                continue
            first = undouble(ws[0]["text"])
            if re.match(r"^(Option\s*#|Spring pressure|ENGINEERED)", ln2["text"]) or re.match(r"^Part No\.?\s*(Lifters|Springs|Retainers)", ln2["text"]):
                break
            if ws[0]["x0"] > key_x1 + 40:
                continue
            if re.fullmatch(r"\d{1,2}", first):
                key = int(first)
            elif KITPN_RE.match(first) and len(first) >= 5:
                key = first
            else:
                continue
            for w in ws:
                w["text"] = undouble(w["text"])
            pn_words = [w for w in ws[1:] if COMP_PN_LOOSE_RE.match(w["text"]) and (remarks_x is None or w["x0"] < remarks_x - 10 or len(ws) == 2)]
            if not pn_words:
                continue
            entry = OrderedDict()
            for w in pn_words:
                col = min(cols, key=lambda c: abs(c[1] - w["xc"]))[0]
                if not COMP_PN_RE.match(w["text"]):
                    qa.append(f"{where}: component part number '{w['text']}' ({col}, option/kit {key}) is printed garbled (overprinted text); verify")
                if col in entry:
                    entry[col] = entry[col] + " & " + w["text"]
                else:
                    entry[col] = w["text"]
            rest = []
            for w in ws[1:]:
                if w in pn_words or w["text"] == "&":
                    continue
                if remarks_x is not None and w["x0"] < remarks_x - 10:
                    continue
                if re.match(r"^\d{5}", w["text"]) or w["text"] in ("Part", "Note:", "Your", "Crower", "CAUTION!", "Valve", "Let", "Beehive", "ask", "usually", "depending", "Made"):
                    break
                if w["text"] == "For" and rest and rest[-1] in ("Lifters", "Lifter.", "lifter.", "Lifter"):
                    break
                rest.append(w["text"])
            remark = " ".join(rest).strip()
            if remark:
                entry["remark"] = remark[:80]
            if key in kits:
                qa.append(f"{where}: kit/option '{key}' listed twice on the page; first kept")
            else:
                kits[key] = entry
        if len(kits) == n_before:
            qa.append(f"{where}: kit table header found but no rows parsed: `{t[:80]}`")
    return kits


def parse_spring_lines(lines):
    out = {}
    for ln in lines:
        for m in SPRING_LINE_RE.finditer(ln["text"]):
            out[m.group(1)] = {"installedHt": float(m.group(2)), "seatLb": int(m.group(3)), "openHt": float(m.group(4)),
                               "openLb": int(m.group(5)), "coilBind": float(m.group(6))}
    return out


def parse_cam_page(page, make, pno, qa, skipped, prev_engine=None):
    """Rows (dicts) for every cam part number on one page of a per-make PDF."""
    pg, words = page_words(page)
    lines = group_lines(words)
    ppage = printed_page(lines)
    where = f"{make} PDF p{pno}"
    kits = parse_kit_tables(lines, qa, where)
    spring_lines = parse_spring_lines(lines)

    # sections: one per header line C
    hidx = [i for i, ln in enumerate(lines) if is_header_c(ln)]
    sections = []
    for n, i in enumerate(hidx):
        s = Section()
        s.header_c = lines[i]
        s.header_b = lines[i - 1] if i >= 1 else None
        s.header_a = lines[i - 2] if i >= 2 else None
        s.y0 = lines[i]["bottom"]
        s.y1 = lines[hidx[n + 1]]["top"] - 30 if n + 1 < len(hidx) else pg.height
        sections.append(s)
    if not sections:
        return [], {}, spring_lines, ppage

    # heading lines: above header A of each section, below the previous section's content
    prev_end = 0
    for n, s in enumerate(sections):
        top_limit = (s.header_a or s.header_b or s.header_c)["top"]
        cands = [ln for ln in lines if prev_end <= ln["top"] < top_limit and not re.match(r"^(Note:|\(Note|Description|Advertised|Part No|Option|Spring pressure|ENGINEERED|\*|\d{1,2} 66|\d{5} 66)", ln["text"]) and not re.search(r"\.\d{3}[\"”]|PERFORMANCE LEVEL \d|Performance Level \d", ln["text"])]
        s.heading_lines = cands
        prev_end = s.header_c["bottom"]
    # heading facts (first section's heading is the page heading; later sections override tappet line only)
    page_heading = sections[0].heading_lines
    make_line = next((ln for ln in page_heading if any(w["text"] in MAKE_WORDS for w in ln["words"])), None)
    page_make = next((w["text"] for ln in page_heading for w in ln["words"] if w["text"] in MAKE_WORDS), make)
    def tappet_of(lns):
        for ln in lns:
            m = re.search(r"^(.*?(?:TAPPET|TWIN CAM)(?:\s*\([A-Z ]+\))?)", ln["text"])
            if m:
                return m.group(1).strip()
        return None
    engine_of = lambda lns: max(lns, key=lambda ln: (len(re.findall(r"\b\d{3}\b", ln["text"])) + (2 if re.search(r"V8|V6|V10|cylinder|Cyl|LS1|HEMI|MODULAR|DURATEC|NEON|VIPER|MAGNUM|Hemi|2300cc", ln["text"]) else 0), -ln["top"]), default=None)
    page_tappet = tappet_of(page_heading)
    eng_cands = [ln for ln in page_heading if ln is not make_line and not re.search(r"TAPPET|TWIN CAM", ln["text"])]
    page_engine = engine_of(eng_cands) if eng_cands else None
    if page_engine is not None and not re.search(r"\b\d{3}\b|V8|V6|V10|LS1|HEMI|MODULAR|DURATEC|NEON|VIPER|MAGNUM|cylinder|Cyl|2300cc|\d\.\dL", page_engine["text"], re.I):
        page_engine = None
    if page_engine is None and prev_engine:
        qa.append(f"{where}: no readable engine heading (overprinted text); engine line taken from the previous page: `{prev_engine}`")
    if any(re.search(r"[A-Za-z]\d[A-Za-z]\d", ln["text"]) and "°" in ln["text"] for ln in lines[:8]):
        qa.append(f"{where}: the first spec row is overprinted with the page heading and cannot be read (one cam of this page is missing)")
    page_years = parse_years(" | ".join(ln["text"] for ln in page_heading))
    series = []
    if make_line:
        rest = " ".join(w["text"] for w in make_line["words"] if w["text"] not in MAKE_WORDS).strip()
        if rest:
            series.append(rest)
    for ln in page_heading:
        if ln is not make_line and ln is not page_engine and "SERIES" in ln["text"] and not re.search(r"TAPPET", ln["text"]):
            series.append(ln["text"])
    heading_text = " | ".join(ln["text"] for ln in page_heading)
    engine_text = page_engine["text"] if page_engine else (prev_engine or "")
    star_note = next((ln["text"] for ln in lines if ln["text"].startswith("*Indicates") or ln["text"].startswith("* Indicates")), None)

    # lash notes
    lash_lines = [(ln["top"], parse_lash(ln["text"]), ln["text"]) for ln in lines if re.search(r"These cams use .*lash", ln["text"])]

    rows = []
    for n, s in enumerate(sections):
        hc, hb = s.header_c, s.header_b
        tappet = tappet_of(s.heading_lines) or page_tappet
        sec_years = parse_years(" | ".join(ln["text"] for ln in s.heading_lines)) if n > 0 else page_years
        if sec_years == (None, None):
            sec_years = page_years
        number_w = next(w for w in hc["words"] if w["text"] == "Number")
        pn_x0 = number_w["x0"]
        kit_w = next((w for w in hc["words"] if re.match(r"^(Op\w*t\w*|Kit\.?|#)$", w["text"])), None)
        if kit_w is None:
            exh = [w for w in hc["words"] if w["text"].startswith("Exhaust")]
            kit_w = {"x0": exh[-1]["x1"] + 30} if exh else None
        kit_x0 = kit_w["x0"] - 10 if kit_w else None
        # column pairs
        c_text = hc["text"]
        sep_w = next((w for w in hc["words"] if w["text"].startswith("Sep")), None)
        has_lsa = sep_w is not None
        sep_x = sep_w["x0"] - 4 if sep_w else next((w["x0"] - 4 for w in hc["words"] if w["text"] == "Intake"), None)
        n_pairs = len(re.findall(r"Intake", c_text))
        b_text = (hb["text"] if hb else "") + " " + ((s.header_a["text"] if s.header_a else ""))
        ratios = [(float(a), float(b)) for a, b in re.findall(r"(\d\.\d{1,2})\s*/\s*(\d\.\d{1,2})", b_text)]
        ratios += [(float(a), float(a)) for a in re.findall(r"\((\d\.\d)\)", b_text)]
        ratios += [(float(a), float(a)) for a in re.findall(r"(\d\.\d)\s*VL", b_text)]
        lobe_lift = "Lobe Lift" in b_text
        n_lift = len(ratios) + (1 if lobe_lift else 0)
        n_dur = n_pairs - n_lift
        adv_at = 0.010 if '(.010")' in b_text else (0.020 if '@ .020"' in b_text else None)
        has_200 = '@ .200"' in b_text
        if n_dur not in (1, 2, 3):
            qa.append(f"{where}: header has {n_pairs} intake/exhaust pairs, {n_lift} lift pairs; durations ambiguous (`{c_text[:90]}`)")
        # RPM columns
        rpm_cols = [w for w in hc["words"] if w["text"] in ("RPM", "Torque", "HP", "RPMTorque")]
        rpm_labels = []
        if rpm_cols and hb:
            for w in rpm_cols:
                above = sorted([v for v in hb["words"] if abs(v["xc"] - w["xc"]) < 25], key=lambda v: abs(v["xc"] - w["xc"]))[:1]
                lab = " ".join(v["text"] for v in above) + " " + w["text"]
                if "Low" in lab:
                    rpm_labels.append("low")
                elif "Torque" in lab:
                    rpm_labels.append("peakTorque")
                elif "HP" in lab:
                    rpm_labels.append("peakHp")
                elif "Top" in lab:
                    rpm_labels.append("top")
                else:
                    rpm_labels.append("rpm%d" % len(rpm_labels))
            if "RPMTorque" in [w["text"] for w in rpm_cols]:
                rpm_labels = ["low", "peakTorque", "peakHp", "top"][:len(rpm_cols) + 1]
        # section's lash note: first one below the header and before the next section header
        y_next = sections[n + 1].header_c["top"] if n + 1 < len(sections) else pg.height
        below = [l for l in lash_lines if hc["bottom"] < l[0] < y_next + 40]
        if below:
            s.lash, s.lash_text = below[0][1], below[0][2]
        elif lash_lines:
            s.lash, s.lash_text = lash_lines[-1][1], lash_lines[-1][2]

        # PN words of this section
        pn_words = [w for w in words if PN_RE.match(w["text"]) and pn_x0 - 12 <= w["x0"] <= pn_x0 + 25 and s.y0 - 2 < w["yc"] < s.y1]
        if not pn_words:
            continue
        # block bands from horizontal rules crossing the PN column
        xs = pn_x0 + 10
        edges = [e["top"] for e in pg.horizontal_edges if e["x0"] - 2 <= xs <= e["x1"] + 2 and e.get("width", 0) > 15 and s.y0 - 6 <= e["top"] <= s.y1 + 6]
        ys = cluster(edges)
        bands = []
        for pw in sorted(pn_words, key=lambda w: w["top"]):
            above = [y for y in ys if y <= pw["top"] + 1]
            belowy = [y for y in ys if y >= pw["bottom"] - 1]
            if above and belowy:
                band = (max(above), min(belowy))
            else:
                band = (pw["top"] - 2, pw["bottom"] + 12)
            if bands and bands[-1] == band:
                continue
            bands.append(band)
        # split bands that hold two primaries (no rule between them)
        for (b0, b1) in bands:
            bw = [w for w in words if b0 - 1 <= w["yc"] <= b1 + 1]
            spec_w = [w for w in bw if w["x0"] >= pn_x0 - 12]
            desc_w = [w for w in bw if w["x1"] < pn_x0 - 12]
            pns = [w for w in spec_w if PN_RE.match(w["text"]) and pn_x0 - 12 <= w["x0"] <= pn_x0 + 25]
            if not pns:
                continue
            band_text = " ".join(w["text"] for w in spec_w)
            if re.search(r"\bRefer\b|recommendation", band_text):
                for w in pns:
                    skipped.append((where, w["text"], "custom-grind listing (no specs; 'Refer to www.crower.com')"))
                continue
            degs = sorted([w for w in spec_w if DEG_RE.match(w["text"])], key=lambda w: w["x0"])
            if len(pns) > 1:
                # a PN with its own LSA/duration line is a primary; others are variants of the one above
                prim = []
                for w in pns:
                    same = [d for d in degs if abs(d["yc"] - w["yc"]) < 5]
                    if same or not prim:
                        prim.append(w)
                if len(prim) > 1:
                    # several cams in one band: split by y midpoints
                    sub = []
                    for k, p in enumerate(prim):
                        t0 = b0 if k == 0 else (prim[k - 1]["bottom"] + p["top"]) / 2
                        t1 = b1 if k + 1 == len(prim) else (p["bottom"] + prim[k + 1]["top"]) / 2
                        sub.append((t0, t1))
                    for (t0, t1) in sub:
                        rows.extend(parse_block(t0, t1, words, pn_x0, kit_x0, s, n_dur, ratios, lobe_lift, adv_at, has_200, rpm_labels, kits, tappet, sec_years, where, qa, skipped, has_lsa, sep_x))
                    continue
            rows.extend(parse_block(b0, b1, words, pn_x0, kit_x0, s, n_dur, ratios, lobe_lift, adv_at, has_200, rpm_labels, kits, tappet, sec_years, where, qa, skipped, has_lsa, sep_x))

    page_info = {"make": page_make, "tappet": page_tappet, "engine": engine_text, "heading": heading_text, "series": series,
                 "years": page_years, "star": star_note, "printed": ppage}
    for r in rows:
        r.update({"page": pno, "printedPage": ppage, "pageMake": page_make, "pdfMake": make, "engine": engine_text, "heading": heading_text,
                  "series": series, "star": star_note})
    return rows, page_info, spring_lines, ppage


def parse_block(b0, b1, words, pn_x0, kit_x0, s, n_dur, ratios, lobe_lift, adv_at, has_200, rpm_labels, kits, tappet, years, where, qa, skipped, has_lsa=True, sep_x=None):
    bw = [w for w in words if b0 - 1 <= w["yc"] <= b1 + 1]
    spec_w = [w for w in bw if w["x0"] >= pn_x0 - 12]
    desc_w = [w for w in bw if w["x1"] < pn_x0 - 12]
    pns = sorted([w for w in spec_w if PN_RE.match(w["text"]) and pn_x0 - 12 <= w["x0"] <= pn_x0 + 25], key=lambda w: (w["top"], w["x0"]))
    if not pns:
        return []
    desc_lines = group_lines(desc_w)
    desc_text = " ".join(ln["text"] for ln in desc_lines)
    pn_col_text = " ".join(w["text"] for w in spec_w if w["x0"] < pn_x0 + 40 and not PN_RE.match(w["text"]))
    mto = "MTO" in pn_col_text or "MTO" in desc_text
    if sep_x is None:
        sep_x = pn_x0 + 60
    kit_lim = kit_x0 if kit_x0 is not None else 1e9
    spec_lines = group_lines(spec_w)
    # Ford Modular pages list lobe-measured and valve-measured durations on two sub-lines
    lobe_valve = any(w["text"] == "Valve" for w in spec_w) and any(w["text"] == "Lobe" for w in spec_w)
    lobe_line_words, valve_line_words = set(), set()
    if lobe_valve:
        for ln in spec_lines:
            txt = [w["text"] for w in ln["words"]]
            if "Lobe" in txt:
                lobe_line_words |= {id(w) for w in ln["words"]}
            if "Valve" in txt:
                valve_line_words |= {id(w) for w in ln["words"]}

    def is_deg(w):
        return DEG_RE.match(w["text"]) or (PLAIN3_RE.match(w["text"]) and w["x0"] > sep_x)

    seq = sorted([w for w in spec_w if w["x0"] > pn_x0 + 20 and w["x0"] < kit_lim and
                  (DEG_RE.match(w["text"]) or (w["x0"] > sep_x and (is_deg(w) or LIFT_RE.match(w["text"]) or w["text"] == "-")))], key=lambda w: w["x0"])
    lsa_val = None
    if has_lsa and any(DEG_RE.match(w["text"]) for w in seq):
        lsa_w = next(w for w in seq if DEG_RE.match(w["text"]))  # leftmost degree value = lobe separation column
        lsa_val = int(DEG_RE.match(lsa_w["text"]).group(1))
        seq = [w for w in seq if w is not lsa_w]
    lobe_degs = [w for w in seq if id(w) in lobe_line_words and is_deg(w)]
    seq = [w for w in seq if id(w) not in lobe_line_words or not is_deg(w)]
    degs = [w for w in seq if is_deg(w)]
    lifts = [w for w in seq if LIFT_RE.match(w["text"])]
    first_deg_x = degs[0]["x0"] if degs else (lifts[0]["x0"] if lifts else 1e9)
    grind = next((w["text"] for w in spec_w if GRIND_RE.match(w["text"]) and w["x0"] > pn_x0 + 20 and w["x0"] < kit_lim), None)
    cid_words = [w for w in spec_w if CID_RE.match(w["text"]) and pn_x0 + 20 < w["x0"] < sep_x and not GRIND_RE.match(w["text"])]
    rpm_words = [w for w in spec_w if RPM_RE.match(w["text"]) and pn_x0 + 20 < w["x0"] < sep_x]
    kit_words = [w for w in spec_w if kit_x0 is not None and w["x0"] >= kit_x0] if kit_x0 else [w for w in spec_w if lifts and w["x0"] > lifts[-1]["x1"] + 4]
    primary = pns[0]
    row = {"pn": primary["text"].rstrip("*"), "star": primary["text"].endswith("*") or any(w["text"] == "*" and abs(w["x0"] - pn_x0) < 30 for w in spec_w),
           "grind": grind, "mto": mto, "tappet": tappet, "years": years, "where": where, "lash": s.lash, "lashText": s.lash_text,
           "cidGroups": [], "rpmByCid": [], "level": None, "levelMax": None, "rpmLow": None, "rpmHigh": None, "redline": None,
           "kitRefs": [], "variants": []}
    # walk the value sequence: [LSA] + 2*n_dur degrees + lift values; '-' is an empty cell
    n_lift = len(ratios) + (1 if lobe_lift else 0)
    slots = ["deg"] * (2 * n_dur) + ["lift"] * (2 * n_lift)
    vals = []
    for w in seq:
        if w["text"] == "-":
            vals.append(None)
        elif is_deg(w):
            vals.append(("deg", int(re.sub(r"\D", "", w["text"]))))
        else:
            m = LIFT_RE.match(w["text"])
            vals.append(("lift", int(m.group(1) or m.group(2)) / 1000))
    # drop '-' placeholders that do not fit (e.g. none expected)
    if len(vals) > len(slots):
        vals = [v for v in vals if v is not None] if len([v for v in vals if v is not None]) <= len(slots) else vals
    dvals = [v[1] for v in vals if v and v[0] == "deg"]
    lvals = [v[1] for v in vals if v and v[0] == "lift"]
    if not dvals and not lvals:
        skipped.append((where, row["pn"], "no duration or lift values in row"))
        return []
    exp_d = len([x for x in slots if x != "lift"])
    exp_l = len([x for x in slots if x == "lift"])
    out = {}
    if len(vals) == len(slots):
        for slot, v in zip(slots, vals):
            out.setdefault(slot, []).append(v[1] if v else None)
    else:
        if len(dvals) != exp_d:
            qa.append(f"{where} {row['pn']}: expected {exp_d} duration values, found {len(dvals)} ({dvals}); values kept in catalog order")
        if len(lvals) != exp_l:
            qa.append(f"{where} {row['pn']}: expected {exp_l} lift values, found {len(lvals)} ({lvals}); values kept in catalog order")
        out["deg"] = dvals + [None] * (2 * n_dur - len(dvals))
        out["lift"] = lvals + [None] * (2 * n_lift - len(lvals))
    if has_lsa:
        row["lsa"] = lsa_val
        if lsa_val is None:
            qa.append(f"{where} {row['pn']}: no lobe-separation value found in the row")
    d = out.get("deg", [])
    if n_dur == 1:
        row.update(dur050Int=d[0], dur050Exh=d[1])
    elif n_dur >= 2:
        row.update(durAdvInt=d[0], durAdvExh=d[1], dur050Int=d[2], dur050Exh=d[3])
        if n_dur == 3:
            row.update(dur200Int=d[4], dur200Exh=d[5])
    if adv_at:
        row["durAdvAt"] = adv_at
    if lobe_degs:
        lv = [int(re.sub(r"\D", "", w["text"])) for w in lobe_degs]
        if len(lv) == 4:
            row.update(durAdvLobeInt=lv[0], durAdvLobeExh=lv[1], dur050LobeInt=lv[2], dur050LobeExh=lv[3])
    lv_ = out.get("lift", [])
    k = 0
    if lobe_lift and len(lv_) >= 2:
        row.update(lobeLiftInt=lv_[0], lobeLiftExh=lv_[1])
        k = 2
    alts = []
    for j, (ri, re_) in enumerate(ratios):
        if k + 1 < len(lv_):
            pair = (lv_[k], lv_[k + 1])
            if j == 0:
                row.update(valveLiftInt=pair[0], valveLiftExh=pair[1], rr=ri, rrExh=re_ if re_ != ri else None)
            elif pair[0] is not None or pair[1] is not None:
                alts.append({"rr": ri, "rrExh": re_ if re_ != ri else None, "int": pair[0], "exh": pair[1]})
        k += 2
    if alts:
        row["valveLiftAlt"] = alts
    # CID groups and RPM ranges
    cid_lines = group_lines(cid_words + rpm_words)
    for ln in cid_lines:
        cids = [w["text"] for w in ln["words"] if CID_RE.match(w["text"])]
        rpms = [RPM_RE.match(w["text"]).group(1) for w in ln["words"] if RPM_RE.match(w["text"])]
        label = cids[0] if cids else None
        if label:
            row["cidGroups"].append(label)
        if rpms and rpm_labels:
            ent = OrderedDict()
            if label:
                ent["ci"] = label
            labs = rpm_labels if len(rpm_labels) == len(rpms) else (["low", "top"] if len(rpms) == 2 else [f"rpm{i}" for i in range(len(rpms))])
            for lab, v in zip(labs, rpms):
                ent[lab] = int(v)
            row["rpmByCid"].append(ent)
    if row["rpmByCid"]:
        f = row["rpmByCid"][0]
        row["rpmLow"] = f.get("low")
        row["rpmHigh"] = f.get("top") or f.get("peakHp")
    # description facts
    lm = LEVEL_RE.search(desc_text)
    if lm:
        if lm.group(4):
            row["level"] = int(lm.group(4))
        else:
            row["level"] = int(lm.group(1))
            if lm.group(2):
                row["levelMax"] = int(lm.group(2))
    rm = RANGE_RE.search(desc_text) or RANGE_RE.search(pn_col_text)
    if rm:
        low = 0 if rm.group(1).lower() == "idle" else int(rm.group(1))
        high = int(rm.group(4) or rm.group(3))
        if row["rpmLow"] is None:
            row["rpmLow"], row["rpmHigh"] = low, high
    else:
        rm2 = RANGE2_RE.search(desc_text)
        if rm2 and row["rpmLow"] is None:
            row["rpmLow"], row["rpmHigh"] = int(rm2.group(1)), int(rm2.group(2))
    rd = REDLINE_RE.search(desc_text)
    if rd:
        row["redline"] = int(rd.group(1))
    sm = re.search(r"\b([A-Z][A-Z0-9 \-/']{2,40}?)\s*/\s*(?:Performance|PERFORMANCE) Level", desc_text)
    if sm:
        row["line"] = sm.group(1).strip().title().replace("Compu-Pro", "Compu-Pro")
    # kit references
    kit_text = " ".join(w["text"] for w in sorted(kit_words, key=lambda w: (w["top"], w["x0"])))
    row["kitText"] = kit_text
    row["kitRefs"] = kit_refs_from(kit_text, kits)

    # variants: further PNs in the block share the specs
    for w in pns[1:]:
        v = {"pn": w["text"].rstrip("*"), "star": w["text"].endswith("*")}
        vk = [x for x in kit_words if abs(x["yc"] - w["yc"]) < 5]
        if vk:
            v["kitRefs"] = kit_refs_from(" ".join(x["text"] for x in vk), kits)
        sfx = v["pn"][len(row["pn"]):] if v["pn"].startswith(row["pn"]) else None
        v["note"] = {"S": "small base circle", "LM": "LM core (1987-up 305/350 step-nose block)", "FI": "fuel-injection core"}.get(sfx, "listed with " + row["pn"])
        if sfx is None and "Carbureted" in (s.header_c["text"] + " " + (s.header_b["text"] if s.header_b else "")):
            v["note"] = "carbureted core"
        row["variants"].append(v)
    return [row]


def kit_refs_from(kit_text, kits):
    refs = []
    t = kit_text.replace("SEE", "See").replace("BELOW", "Below")
    if "See" in t and "Below" in t:
        refs = list(kits.keys())
    else:
        for tok in t.replace(",", " ").split():
            if re.fullmatch(r"\d{1,2}", tok):
                refs.append(int(tok))
            elif KITPN_RE.match(tok):
                refs.append(tok)
    return refs


# ----------------------------------------------------------------------------------------------
# springs (booklet)
# ----------------------------------------------------------------------------------------------
HEIGHT_RE = re.compile(r"^\d\.\d{3}$")
LB_RE = re.compile(r"^(\d+)\s*lbs?\.?$")
RET_PN_RE = re.compile(r"\b(8[67]\d{3}[A-Z0-9]*)\b")


def parse_spring_booklet(pdf_path, qa):
    import pdfplumber

    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            tables = page.find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
            for t in tables:
                if len(t.rows) < 20:
                    continue
                ex = t.extract()
                labels = [(r[0] or "").replace("\n", " ").strip() for r in ex]
                try:
                    pn_i = next(i for i, l in enumerate(labels) if l.lower() == "part #")
                except StopIteration:
                    qa.append(f"spring booklet p{pno}: table without a 'Part #' row")
                    continue
                ncol = len(ex[0])
                for c in range(1, ncol):
                    pn = (ex[pn_i][c] or "").strip()
                    if not re.match(r"^\d{5}", pn):
                        continue
                    r = {"pn": pn, "page": pno, "loads": OrderedDict(), "retainers": [], "stray": []}
                    for i, lab in enumerate(labels):
                        v = (ex[i][c] or "").replace("\n", " ").strip()
                        if v in ("", "-"):
                            continue
                        if HEIGHT_RE.match(lab):
                            m = LB_RE.match(v)
                            if m:
                                r["loads"][lab] = int(m.group(1))
                            else:
                                r["stray"].append(v)
                        elif lab.lower().startswith("o.d./i.d."):
                            r[lab.split()[-1].lower()] = v
                        elif lab in ("Installed Height", "Rate", "Type", "Color Code", "Damper", "Free Length", "Wire Diameter", "Material", "Coil Bind"):
                            r[lab] = v
                        elif "retainer" in lab.lower() or lab.lower() in ("seat cup", "seat disc", "retainers"):
                            for m in RET_PN_RE.finditer(v):
                                r["retainers"].append({"pn": m.group(1), "kind": lab.replace("RETAINERS", "Retainers"), "raw": v})
                            if not RET_PN_RE.search(v):
                                r["stray"].append(f"{lab}: {v}")
                    rows.append(r)
    return rows


def od_id(v):
    """'.940/.580(top)' -> (0.94, 0.58, 'top')."""
    if not v:
        return None, None, None
    m = re.match(r"^(\d*\.\d+)\s*/\s*(\d*\.\d+)\s*\(?(top|bottom)?\)?", v)
    if not m:
        return None, None, v
    return float(m.group(1)), float(m.group(2)), m.group(3)


def spring_record(r, fams, qa, url):
    od, id_, _ = od_id(r.get("outer"))
    odm, idm, _ = od_id(r.get("middle"))
    odi, idi, _ = od_id(r.get("inner"))
    inst = num(r.get("Installed Height"))
    rate = num(r.get("Rate"))
    if rate is not None and rate < 10:
        qa.append(f"spring {r['pn']} (booklet p{r['page']}): rate printed as '{r.get('Rate')}'; stored as {int(rate * 1000)} lb/in")
        rate = int(round(rate * 1000))
    coil = num(r.get("Coil Bind"))
    stray_heights = [num(v) for v in r["stray"] if HEIGHT_RE.match(v) or re.match(r"^\.\d{3}$", v)]
    stray_pns = [v for v in r["stray"] if RET_PN_RE.search(v)]
    if coil is None and stray_heights:
        coil = stray_heights[0]
        qa.append(f"spring {r['pn']} (booklet p{r['page']}): coil bind {coil} read from a mis-aligned cell in the load table")
    for v in stray_pns:
        for m in RET_PN_RE.finditer(v):
            r["retainers"].append({"pn": m.group(1), "kind": "Retainers", "raw": v})
        qa.append(f"spring {r['pn']} (booklet p{r['page']}): retainer '{v}' read from a mis-aligned cell in the load table")
    typ = (r.get("Type") or "").strip()
    wire = r.get("Wire Diameter") or ""
    wm = re.findall(r"\d*\.\d{3}", wire)
    free = num(r.get("Free Length"))
    loads = {k: v for k, v in r["loads"].items()}
    seat = loads.get(f"{inst:.3f}") if inst is not None else None
    if inst is not None and seat is None:
        # installed height not among the tabulated heights: interpolate linearly between neighbours
        pts = sorted((float(k), v) for k, v in loads.items())
        lo = [p for p in pts if p[0] <= inst]
        hi = [p for p in pts if p[0] >= inst]
        if lo and hi and lo[-1][0] != hi[0][0]:
            (h1, l1), (h2, l2) = lo[-1], hi[0]
            seat = round(l1 + (l2 - l1) * (inst - h1) / (h2 - h1))
            qa.append(f"spring {r['pn']}: seat load {seat} lb interpolated between {h1} and {h2} (installed height {inst} not tabulated)")
    spec = clean({
        "od": od, "id": id_, "odMiddle": odm, "idMiddle": idm, "odInner": odi, "idInner": idi,
        "installedHt": inst, "seatLb": seat, "rate": rate, "coilBind": coil,
        "maxLift": round(inst - coil - 0.05, 3) if inst is not None and coil is not None else None,
        "dual": True if re.search(r"Dual|Triple", typ, re.I) else (False if typ else None),
        "triple": True if "Triple" in typ else None,
        "type": typ.lower() or None,
        "damper": True if (r.get("Damper") or "").lower().startswith("yes") else (False if r.get("Damper") else None),
        "colorCode": None if (r.get("Color Code") or "None").lower() == "none" else r.get("Color Code"),
        "freeLength": free,
        "wireDia": float(wm[0]) if wm else None,
        "wireDia2": float(wm[1]) if len(wm) > 1 else None,
        "wireOvate": True if "ovate" in wire.lower() else None,
        "material": None if (r.get("Material") or "-") == "-" else r.get("Material"),
        "loads": loads or None,
        "retainers": [clean({"pn": x["pn"], "kind": x["kind"], "note": x["raw"] if x["raw"] != x["pn"] else None}) for x in r["retainers"]] or None,
    })
    if "maxLift" in spec:
        spec["maxLiftNote"] = "installed height - coil bind - 0.050 (computed)"
    name = f"{typ.lower() or 'valve'} spring, {od} OD, {inst} installed" if od else f"valve spring {r['pn']}"
    recs = []
    for fam, known in fams:
        recs.append({
            "m": BRAND, "p": r["pn"], "cat": "spring", "name": name,
            "fit": clean({"fam": fam, "notes": None if known else "no engine family stated; listed in the universal spring booklet"}),
            "spec": spec,
            "src": {"doc": "Crower Valve Spring Booklet 2024 V3 (PDF)", "edition": "2024 V3", "url": url, "page": r["page"]},
            "emissions": None, "_known": known,
        })
    return recs


# ----------------------------------------------------------------------------------------------
# lifters
# ----------------------------------------------------------------------------------------------
LPN_RE = re.compile(r"^(66\d{3}[A-Z0-9]*-\d{1,2})(\*\d?)?$")
DIA_RE = re.compile(r"^0?\.(\d{3,4})[\"”]?$|^(1\.\d{3})[\"”]?$")
SEAT_RE = re.compile(r"^(\d\.\d{3})[\"”]?$|^-$|^1\.7-0”$")
WT_RE = re.compile(r"^(\d+(?:\.\d+)?)g$|^-$")
YN_RE = re.compile(r"^(YES|NO|Yes|-)$")
CNT_RE = re.compile(r"^(\d{1,2}|-)$")
SPRING_GROUP_LB = {1: (300, 450), 2: (680, 780), 3: (750, 900), 4: (900, 1000), 5: (1000, 1300), 6: (1050, 1350),
                   7: (1150, 1350), 8: (1200, 1400), 9: (1250, 1450), 10: (1400, None)}


def lifter_style_for_page(pno, text):
    t = text.upper()
    if pno <= 2:
        return "hydraulic_flat"
    if pno <= 4:
        return "solid_flat"
    if pno == 5:
        return "hydraulic_roller"
    return "solid_roller"


def parse_lifter_pdf(pdf_path, qa, skipped):
    import pdfplumber

    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            if pno in (6, 8, 12):  # prose / diagrams only
                continue
            pg = page.crop(page.bbox).dedupe_chars(tolerance=1)
            lines = [{"text": l.strip()} for l in (pg.extract_text() or "").splitlines() if l.strip()]
            style = lifter_style_for_page(pno, "")
            retro = False
            pending = None
            last = None
            for ln in lines:
                t = ln["text"]
                if re.match(r"^RETRO-FIT", t):
                    retro = True
                if re.match(r"^LATE MODEL", t):
                    retro = False
                toks = t.split()
                pns = []
                while toks and LPN_RE.match(toks[-1]):
                    pns.insert(0, toks.pop())
                if re.match(r"^(Ex:|Part #|Photo)", t):
                    pns = []
                if not pns:
                    if last is not None and not last["desc"] and re.match(r"^[a-z.\"”]|^offset|^intake|^w/|^\d{4},", t) and len(t) < 50:
                        last["desc"] = t
                        last = None
                    elif last is not None and last["desc"] and re.match(r"^(offset|intake offset|\.\d{3} dia|\.\d{3} dia\. centers only|w/ V8 oiling|\d{4}, \d{4}|\d{3}-\d{3} cu|oiling, shielded)", t):
                        last["desc"] += " " + t
                        last = None
                    elif not re.match(r"^(Spring|Description|Lifter|\(|Photo|Part #|\*|For |Crower|Oil |Also|HIPPO|High|Ex:|RACING|OWNER|EDM|precision|bearings|greatly|number|Weights|camshaft|able|valve|choice|are |your|improved|Hydraulic|Mechanical|Solid|Raised|Needleless|The |CROWER|No offsets|competing|that |all |LATE|RETRO|APPLICATION|Original|designed|body|quality|only|pushrod|Hi-Seat|weight|Severe|rod |\.8|\.9|Aluminum|Roller|\+/-|When|SB |ex\.|CUSTOM|Don't|Give|you |A B|C D|Int|Exh|Cylinder|BB |SB2|Left|Right|Spring pressure|Spring Groups|•|\d+ For technical|EnduraMax|allowing|durability|standard|help|racers|longest|We can|rollers|being)", t):
                        pending = t
                    continue
                r = {"page": pno, "style": style, "pns": pns, "retro": retro, "line": t}
                rest = list(toks)
                # from the right: bearing OD, [tall], weight, seat, dia  (flat tappet pages have no bearing/tall)
                if pno <= 4:
                    # desc dia seat weight [oiling option words] PN
                    i = 0
                    while i < len(rest) and not DIA_RE.match(rest[i]):
                        i += 1
                    if i + 2 >= len(rest):
                        skipped.append((f"lifter PDF p{pno}", pns[0], f"cannot split row: `{t}`"))
                        continue
                    r["desc"] = " ".join(rest[:i])
                    r["dia"], r["seat"], r["wt"] = rest[i], rest[i + 1], rest[i + 2]
                    r["option"] = " ".join(rest[i + 3:])
                elif pno == 5:
                    # desc group - - PN  ('-' or YES in the HIPPO column)
                    tail = rest[-3:]
                    r["group"] = tail[0] if CNT_RE.match(tail[0]) else None
                    r["hippoFlag"] = tail[2] if len(tail) == 3 else None
                    r["desc"] = " ".join(rest[:-3])
                    r["dia"] = r["seat"] = r["wt"] = None
                else:
                    try:
                        if len(pns) == 1 and rest and rest[-1] == "-" and len(rest) >= 2 and DIA_RE.match(rest[-2]):
                            rest.pop()  # empty standard-PN column: only the HIPPO version exists
                        bearing = rest.pop()
                        assert DIA_RE.match(bearing) or bearing == "-"
                        r["bearing"] = bearing
                        if all(x == "-" for x in rest[-9:]) and len(rest) >= 9:
                            # row with no dimensions printed
                            k = len(rest)
                            while k > 0 and rest[k - 1] == "-":
                                k -= 1
                            r["group"] = rest[k - 1] if k >= 1 and CNT_RE.match(rest[k - 1]) else None
                            r["desc"] = " ".join(rest[:k - 1] if r["group"] else rest[:k])
                            r["dia"] = r["seat"] = r["wt"] = r["tall"] = None
                            raise StopIteration
                        # find dia from the right (first token that looks like a lifter diameter)
                        j = len(rest) - 1
                        while j >= 0 and not (DIA_RE.match(rest[j]) and 0.8 <= (num(rest[j].rstrip('"”')) or 0) < 1.2):
                            j -= 1
                        assert j >= 0
                        r["dia"] = rest[j]
                        mid = rest[j + 1:]
                        if len(mid) == 3:
                            r["seat"], r["wt"], r["tall"] = mid
                        elif len(mid) == 2 and WT_RE.match(mid[0]) and mid[0] != "-":
                            r["seat"], (r["wt"], r["tall"]) = None, mid  # seat height printed on the description line
                            sm = re.search(r"(\d\.\d{3})[\"”]$", pending or "")
                            if sm:
                                r["seat"] = sm.group(1)
                        elif len(mid) == 2:
                            r["seat"], r["wt"] = mid
                            r["tall"] = None
                        else:
                            raise AssertionError("mid " + str(mid))
                        left = rest[:j]
                        # ... group [intOff exhOff left center right]
                        if len(left) >= 6 and all(CNT_RE.match(x) or YN_RE.match(x) for x in left[-6:]):
                            r["group"], r["intOff"], r["exhOff"], r["left"], r["center"], r["right"] = left[-6:]
                            r["desc"] = " ".join(left[:-6])
                        elif len(left) >= 5 and all(CNT_RE.match(x) or YN_RE.match(x) for x in left[-5:]) and YN_RE.match(left[-4]):
                            # a missing count column ('8 - 8' printed as '8 8')
                            r["group"], r["intOff"], r["exhOff"] = left[-5:-2]
                            r["left"], r["center"], r["right"] = left[-2], "-", left[-1]
                            r["desc"] = " ".join(left[:-5])
                            qa.append(f"lifter PDF p{pno} {pns[0]}: pushrod-seat location columns printed as '{' '.join(left[-2:])}'; read as left/right")
                        elif left and CNT_RE.match(left[-1]):
                            r["group"] = left[-1]
                            r["desc"] = " ".join(left[:-1])
                        else:
                            r["desc"] = " ".join(left)
                    except StopIteration:
                        pass
                    except AssertionError as e:
                        skipped.append((f"lifter PDF p{pno}", pns[0], f"cannot split row ({e}): `{t}`"))
                        continue
                if not r["desc"] and pending:
                    r["desc"] = pending
                pending = None
                last = r
                rows.append(r)
    return rows


def lifter_families(desc, pno):
    d = " " + " ".join(desc.upper().replace("-", " ").replace(",", " ").split()) + " "
    fams = []

    def add(*fs):
        for f in fs:
            if f not in fams:
                fams.append(f)
    sbc = ("Small-block Chevy", 8, True)
    bbc = [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
    if "HOLDEN" in d:
        return [("Holden", None, False)]
    if "CHEVROLET" in d or "CHEVY" in d or " SBC " in d or " BBC " in d:
        if "LS1" in d or " LS " in d or "LS7" in d:
            add(("GM LS", 8, True))
        if "348" in d or "409" in d:
            add(("Chevy W-series 348/409", 8, True))
        if "262 400" in d or "265 400" in d or "SMALL BLOCK" in d or " SBC " in d or "SB2" in d:
            add(sbc)
        if "BIG BLOCK" in d or "396" in d or " BBC " in d:
            add(*bbc)
        if "194" in d or "6 CYL" in d or "CORVAIR" in d:
            add(("Chevy inline-6", 6, True))
        if "CHEVY II" in d or "4 CYL" in d:
            add(("Chevy II 153 4-cyl", 4, False))
        if "V6" in d:
            add(("Chevy 90° V6 200/229/262", 6, False))
        if not fams and ("8 CYL" in d or "V8" in d):
            add(sbc, *bbc)
    elif " GM LS" in d or d.strip().startswith("GM LS"):
        add(("GM LS", 8, True))
    elif "FORD" in d:
        if "DURATEC" in d:
            add(("Ford/Mazda Duratec 2.0/2.3", 4, False))
        if "351C" in d:
            add(("Ford 351C/351M/400", 8, True))
        if "FE" in d.split() or "390 427FE" in d or "332 428" in d:
            add(("Ford FE", 8, True))
        if "429" in d or "460" in d or "370 460" in d:
            add(("Ford 429/460", 8, True))
        if "351W" in d or "302" in d or "289" in d or "221" in d:
            add(("Small-block Ford (Windsor)", 8, True))
        if "240 300" in d or "240 330" in d:
            add(("Ford 240/300 inline-6", 6, True))
        if "144 250" in d:
            add(("Ford 144-250 inline-6", 6, False))
        if "351" in d and "351C" not in d and "351W" not in d and ("221" in d or "302" in d):
            pass
        if "351" in d and "400" in d and "351C" not in d and "221" in d:
            add(("Ford 351C/351M/400", 8, True))
    elif "MOPAR" in d or "DODGE" in d or "CHRYSLER" in d:
        if "340" in d or " R3 " in d or "R3 48" in d:
            add(("Mopar LA small block", 8, True))
        if "ARIAS" in d or ("426" in d and "440" not in d and "HEMI" not in d):
            add(("Chrysler 426 Hemi", 8, True))
        if "MAGNUM" in d:
            add(("Mopar Magnum 5.2/5.9", 8, True))
            if "V10" in d or "VIPER" in d:
                add(("Dodge Viper V10", 10, False))
        if "HEMI" in d and ("426" in d or "GEN 2" in d or "KB" in d):
            add(("Chrysler 426 Hemi", 8, True))
        elif "HEMI" in d:
            add(("Chrysler Gen III Hemi 5.7/6.1", 8, True), ("Chrysler Gen III Hemi 6.2/6.4", 8, True))
        if " LA " in d or "273" in d:
            add(("Mopar LA small block", 8, True))
        if "MOPAR B" in d or "440" in d or "383" in d:
            add(("Mopar B/RB big block", 8, True))
    elif "BAE" in d or "RODECK" in d or "TFX" in d:
        add(("Chrysler 426 Hemi", 8, True))
    elif "OLDSMOBILE" in d:
        add(("Oldsmobile V8", 8, True))
    elif "PONTIAC" in d:
        add(("Pontiac V8", 8, True))
    elif "BUICK" in d:
        if "V6" in d or "196" in d or "231" in d:
            add(("Buick V6 181-252", 6, True))
        elif "400" in d or "430" in d or "455" in d:
            add(("Buick big block", 8, True))
        elif "215" in d or "350" in d:
            add(("Buick 350", 8, True))
        elif "6 CYL" in d:
            add(("Buick V6 181-252", 6, True))
        else:
            add(("Buick 350", 8, True), ("Buick big block", 8, True))
    elif "AMC" in d:
        if "V8" in d or "290" in d or "8 CYL" in d:
            add(("AMC V8", 8, True))
        else:
            add(("AMC/Jeep inline-6", 6, True))
    if not fams:
        fams.append((desc.strip()[:60] or "unknown", None, False))
    return fams


def lifter_records(rows, qa, url):
    recs = []
    for r in rows:
        desc = r.get("desc") or ""
        fams = lifter_families(desc, r["page"])
        base_pn = r["pns"][0]
        dia = num(r.get("dia").rstrip('"”')) if r.get("dia") and r.get("dia") != "-" else None
        seat = num((r.get("seat") or "").rstrip('"”')) if r.get("seat") and r.get("seat") not in ("-",) else None
        if r.get("seat") == "1.7-0”":
            seat = 1.7
            qa.append(f"lifter {base_pn}: seat height printed '1.7-0”' read as 1.700")
        wt = num((r.get("wt") or "").rstrip("g")) if r.get("wt") and r.get("wt") != "-" else None
        bearing = num((r.get("bearing") or "").rstrip('"”')) if r.get("bearing") and r.get("bearing") != "-" else None
        group = num(r.get("group")) if r.get("group") and r.get("group") != "-" else None
        for k, pn_full in enumerate(r["pns"]):
            m = LPN_RE.match(pn_full)
            pn = m.group(1)
            qty = int(pn.rsplit("-", 1)[1])
            hippo = (k == 1) or bool(re.search(r"\d{5}[A-Z0-9]*H(?:-|$)", pn) and "H-" in pn and re.search(r"[0-9X]H-", pn))
            if r["page"] == 5 and r.get("hippoFlag") == "YES":
                hippo = True
            endura = bool(re.search(r"E-\d", pn)) or "ENDURAMAX" in desc.upper()
            tall = (r.get("tall") or "").upper() == "YES" or bool(re.search(r"\dT(?:H|E|HE)?-", pn)) or ".300" in desc
            style = r["style"]
            link = None
            if style == "hydraulic_roller":
                link = bool(r.get("retro"))
            elif style == "solid_roller":
                link = True
            opt = (r.get("option") or "").strip()
            spec = clean({
                "style": style, "bodyDia": dia, "rollerDia": bearing, "linkBar": link,
                "seatHeight": seat, "weight": wt, "qty": qty,
                "springGroup": group,
                "openPressureLb": list(SPRING_GROUP_LB[group]) if group in SPRING_GROUP_LB else None,
                "intakeOffset": True if (r.get("intOff") or "").upper() == "YES" else None,
                "exhaustOffset": True if (r.get("exhOff") or "").upper() == "YES" else None,
                "seatLeft": num(r.get("left")) if r.get("left") not in (None, "-") else None,
                "seatCenter": num(r.get("center")) if r.get("center") not in (None, "-") else None,
                "seatRight": num(r.get("right")) if r.get("right") not in (None, "-") else None,
                "tallBody": True if tall else None,
                "hippo": True if hippo else None,
                "bushed": True if endura else None,
                "oiling": opt or None,
                "shortTravel": True if "SHORT TRAVEL" in desc.upper() else None,
                "retroFit": True if (style == "hydraulic_roller" and r.get("retro")) else None,
            })
            if spec.get("openPressureLb") and spec["openPressureLb"][1] is None:
                spec["openPressureLb"] = [spec["openPressureLb"][0]]
            words = {"hydraulic_flat": "hydraulic flat tappet lifter", "solid_flat": "mechanical flat tappet lifter",
                     "hydraulic_roller": "hydraulic roller lifter", "solid_roller": "solid roller lifter"}[style]
            name = f"{words}, set of {qty}" + (f", {dia} body" if dia else "") + (", HIPPO pin oiling" if hippo else "") + (", EnduraMax bushing" if endura else "")
            for fam, cyl, known in fams:
                recs.append({
                    "m": BRAND, "p": pn, "cat": "lifter", "name": name,
                    "fit": clean({"fam": fam, "cyl": cyl, "notes": desc.strip() or None}),
                    "spec": spec,
                    "src": {"doc": "Crower 2025 Master Catalog, lifters pp 119-132 (PDF)", "edition": EDITION, "url": url, "page": r["page"], "printedPage": r["page"] + 118},
                    "emissions": None, "_known": known,
                })
    return recs


# ----------------------------------------------------------------------------------------------
# cam rows -> records
# ----------------------------------------------------------------------------------------------
TYPE_WORDS = {"hydraulic_flat": "hydraulic flat tappet cam", "solid_flat": "mechanical flat tappet cam",
              "hydraulic_roller": "hydraulic roller cam", "solid_roller": "mechanical roller cam"}


def cid_list(groups, engine_cids):
    """'ALL' -> the heading's displacements; '262-307-327' -> that list; '283-327' -> the heading's
    displacements from 283 to 327 plus both end values (a range)."""
    out = []
    for g in groups:
        if g.upper() == "ALL":
            out += engine_cids
        elif re.match(r"^\d{3}", g):
            parts = [int(x) for x in g.split("-")]
            if len(parts) == 2 and parts[1] > parts[0]:
                out += parts + [c for c in engine_cids if parts[0] <= c <= parts[1]]
            else:
                out += parts
    return sorted(set(out)) or None


def cam_records(rows, kits_by_page, docs, qa):
    recs = []
    for r in rows:
        make = r["pdfMake"]
        fams = families_for(r["pageMake"], r["engine"] + " | " + r["heading"])
        typ = cam_type_from(r["tappet"], r["heading"], r["grind"], r["lash"])
        if typ is None:
            qa.append(f"{r['where']} {r['pn']}: cam type could not be determined (tappet line '{r['tappet']}')")
        engine_cids = [int(x) for x in re.findall(r"\b(\d{3})\b", r["engine"]) if 100 <= int(x) <= 600]
        y0, y1 = r["years"]
        kits = kits_by_page.get((make, r["page"]), {})
        kits_prev = kits_by_page.get((make, r["page"] - 1), {})
        kits_next = kits_by_page.get((make, r["page"] + 1), {})
        for pn, star, kit_refs, vnote in [(r["pn"], r["star"], r["kitRefs"], None)] + [(v["pn"], v["star"], v.get("kitRefs", r["kitRefs"]), v["note"]) for v in r["variants"]]:
            kit_opts = []
            for ref in kit_refs:
                k = kits.get(ref)
                if k is None and isinstance(ref, str):
                    near = [kk for kk in kits if isinstance(kk, str) and (kk.startswith(ref) or ref.startswith(kk))]
                    if len(near) == 1:
                        qa.append(f"{r['where']} {pn}: kit '{ref}' matched to table row '{near[0]}'")
                        k = kits[near[0]]
                if k is None and ref not in kits:
                    src = kits_next if ref in kits_next else (kits_prev if ref in kits_prev else None)
                    if src is not None:
                        qa.append(f"{r['where']} {pn}: option {ref} is not in this page's component table; taken from the facing page")
                        k = src[ref]
                if k is None:
                    qa.append(f"{r['where']} {pn}: references option/kit '{ref}' which has no row in the page's component table")
                    kit_opts.append(OrderedDict([("kitPn" if isinstance(ref, str) else "option", ref)]))
                    continue
                e = OrderedDict([("kitPn" if isinstance(ref, str) else "option", ref)])
                e.update(k)
                kit_opts.append(e)
            kit = None
            if kit_opts:
                kit = OrderedDict((k2, v2) for k2, v2 in kit_opts[0].items() if k2 not in ("option", "kitPn", "remark"))
            notes = list(r["series"])
            if vnote:
                notes.append(vnote)
            if star and r["star"]:
                notes.append(r["star"].lstrip("* ").split(".")[0][:90])
            spec = clean(OrderedDict([
                ("durAdvInt", r.get("durAdvInt")), ("durAdvExh", r.get("durAdvExh")),
                ("durAdvAt", r.get("durAdvAt")),
                ("dur050Int", r.get("dur050Int")), ("dur050Exh", r.get("dur050Exh")),
                ("dur200Int", r.get("dur200Int")), ("dur200Exh", r.get("dur200Exh")),
                ("durAdvLobeInt", r.get("durAdvLobeInt")), ("durAdvLobeExh", r.get("durAdvLobeExh")),
                ("dur050LobeInt", r.get("dur050LobeInt")), ("dur050LobeExh", r.get("dur050LobeExh")),
                ("lobeLiftInt", r.get("lobeLiftInt")), ("lobeLiftExh", r.get("lobeLiftExh")),
                ("valveLiftInt", r.get("valveLiftInt")), ("valveLiftExh", r.get("valveLiftExh")),
                ("rr", r.get("rr")), ("rrExh", r.get("rrExh")),
                ("valveLiftAlt", [clean(a) for a in r.get("valveLiftAlt", [])] or None),
                ("lsa", r.get("lsa")),
                ("lash", r["lash"][0] if r["lash"] else None),
                ("lashExh", r["lash"][1] if r["lash"] and r["lash"][1] != r["lash"][0] else None),
                ("type", typ),
                ("rpmLow", r.get("rpmLow")), ("rpmHigh", r.get("rpmHigh")), ("redline", r.get("redline")),
                ("rpmByCid", [dict(e) for e in r["rpmByCid"]] if len(r["rpmByCid"]) > 1 else None),
                ("grind", r.get("grind")),
                ("level", r.get("level")), ("levelMax", r.get("levelMax")),
                ("line", r.get("line")),
                ("kit", kit or None),
                ("kitOptions", kit_opts if len(kit_opts) > 1 else None),
                ("kitRemark", kit_opts[0].get("remark") if kit_opts else None),
                ("madeToOrder", True if r["mto"] else None),
                ("cidGroups", r["cidGroups"] if r["cidGroups"] and r["cidGroups"] != ["ALL"] else None),
            ]))
            d050 = f"{r.get('dur050Int')}/{r.get('dur050Exh')} @ .050" if r.get("dur050Int") else ""
            name = f"{TYPE_WORDS.get(typ, 'cam')}" + (f", {r['grind']} grind" if r.get("grind") else "") + (f", {d050}" if d050 else "") + (f", {r['lsa']} LSA" if r.get("lsa") else "")
            doc_url = docs[make][0]
            for fam, cyl, known in fams:
                recs.append({
                    "m": BRAND, "p": pn, "cat": "cam", "name": name,
                    "fit": clean({"fam": fam, "ci": cid_list(r["cidGroups"], engine_cids) if r["cidGroups"] else (engine_cids or None),
                                  "cyl": cyl, "y0": y0, "y1": y1, "notes": "; ".join(notes) or None}),
                    "spec": spec,
                    "src": {"doc": f"Crower 2025 {make} camshaft catalog (PDF)", "edition": EDITION, "url": doc_url, "page": r["page"],
                            "printedPage": r["printedPage"], "section": " | ".join(x for x in [r["tappet"], r["engine"]] if x)},
                    "emissions": None, "_known": known,
                })
    # the catalog lists some part numbers in several rows (one per displacement, with its own level / RPM range)
    merged, order = {}, []
    for rec in recs:
        key = (rec["p"], rec["fit"]["fam"])
        if key not in merged:
            merged[key] = rec
            order.append(key)
            continue
        first = merged[key]
        ci = sorted(set((first["fit"].get("ci") or []) + (rec["fit"].get("ci") or [])))
        if ci:
            first["fit"]["ci"] = ci
        core = ("durAdvInt", "durAdvExh", "dur050Int", "dur050Exh", "valveLiftInt", "valveLiftExh", "lsa", "type")
        if any(first["spec"].get(k) != rec["spec"].get(k) for k in core):
            qa.append(f"PN {rec['p']} ({rec['fit']['fam']}): listed twice with different core specs (p{first['src']['page']} vs p{rec['src']['page']}); first kept")
            continue
        apps = first["spec"].setdefault("applications", [])
        if not apps:
            apps.append(clean({"ci": first["spec"].get("cidGroups"), "level": first["spec"].get("level"), "line": first["spec"].get("line"),
                               "rpmLow": first["spec"].get("rpmLow"), "rpmHigh": first["spec"].get("rpmHigh"), "redline": first["spec"].get("redline")}))
        app = clean({"ci": rec["spec"].get("cidGroups"), "level": rec["spec"].get("level"), "line": rec["spec"].get("line"),
                     "rpmLow": rec["spec"].get("rpmLow"), "rpmHigh": rec["spec"].get("rpmHigh"), "redline": rec["spec"].get("redline")})
        if app not in apps:
            apps.append(app)
        for k in ("rpmLow", "rpmHigh", "redline", "level", "line", "kit", "kitOptions", "kitRemark"):
            if first["spec"].get(k) is None and rec["spec"].get(k) is not None:
                first["spec"][k] = rec["spec"][k]
        if first["spec"].get("cidGroups") and rec["spec"].get("cidGroups"):
            first["spec"]["cidGroups"] = first["spec"]["cidGroups"] + [g for g in rec["spec"]["cidGroups"] if g not in first["spec"]["cidGroups"]]
    return [merged[k] for k in order]


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("durAdvInt", "durAdvExh", "dur050Int", "dur050Exh", "lobeLiftInt", "lobeLiftExh", "valveLiftInt", "valveLiftExh", "rr", "lsa",
                "lash", "rpmLow", "rpmHigh", "redline", "od", "id", "installedHt", "coilBind", "seatLb", "openLb", "rate", "maxLift",
                "bodyDia", "rollerDia", "seatHeight", "weight", "freeLength", "wireDia")


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
        loads = rec["spec"].get("loads")
        if loads is not None and (not isinstance(loads, dict) or not all(isinstance(v, (int, float)) for v in loads.values())):
            errs.append(f"{rec['p']}: spec.loads malformed")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, log, docs, cam_rows, page_infos, records, skipped, qa, errs, unknown, held_imports, spring_rows, lifter_rows, cam_spring_lines):
    by_cat = Counter(r["cat"] for r in records)
    fam_recs = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    per_make = Counter(r["pdfMake"] for r in cam_rows)
    per_make_pn = Counter()
    for r in cam_rows:
        per_make_pn[r["pdfMake"]] += 1 + len(r["variants"])
    L = ["# Crower — extraction notes", ""]
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_crower.py`.")
    L += ["", "## What was fetched", ""]
    L.append(f"{len([l for l in log if l.startswith('GET')])} requests to `crower.com`, one at a time, >= 6 s apart, UA `{UA}`:")
    L += [f"- {l}" for l in log]
    L.append("")
    L.append("`robots.txt` is an empty file (one newline): no Disallow, no Crawl-delay. The master-catalog page was fetched once to discover the PDF links; no product pages were crawled. The initial download session made 11 requests (robots.txt, master-catalog, nine PDFs); two PDF transfers (Ford, Oldsmobile) were cut off by connection resets and re-requested after a back-off. Downloads live in `dl/crower/` (gitignored); `--offline` re-parses them without the network.")
    L += ["", "## Documents", "", "| key | url | pages |", "|---|---|---|"]
    for k, (url, p) in docs.items():
        try:
            import pdfplumber
            with pdfplumber.open(p) as pdf:
                n = len(pdf.pages)
        except Exception:
            n = "?"
        L.append(f"| {k} | {url} | {n} |")
    L += ["", "## Records", "", "| cat | records |", "|---|---|"]
    L += [f"| {c} | {n} |" for c, n in sorted(by_cat.items())]
    L.append(f"| **total** | {len(records)} |")
    L += ["", "### Cams per make PDF", "", "| make | cam rows | part numbers (incl. S/LM/FI variants) |", "|---|---|---|"]
    L += [f"| {m} | {per_make[m]} | {per_make_pn[m]} |" for m in CAM_MAKES if m in per_make]
    L += ["", "### Records per family", "", "| cat | family | records |", "|---|---|---|"]
    L += [f"| {c} | {f} | {n} |" for (c, f), n in sorted(fam_recs.items(), key=lambda x: (x[0][0], -x[1], x[0][1]))]
    L += ["", "## How the cam pages were parsed", ""]
    L += [
        "- Each page is one engine heading (make, tappet type, years, displacement list) with one or two ruled spec tables (hydraulic and mechanical sections share a page). Text objects that sit outside the page box (stale layers of other pages, visible as doubled headings in a raw text dump) are dropped by cropping to the page box before reading words.",
        "- Column headers vary by page, so values are read by position: the part-number column anchors each cam; a cam's row band is bounded by the horizontal rules that cross that column (sub-rows for displacement groups only rule the RPM columns). Degree values in the band are, left to right, LSA then the intake/exhaust pairs the header names (advertised, @ .050\", and on the Pro55 pages @ .020\"/.050\"/.200\"); lift values are the pairs the header names (lobe lift and/or gross lift at the printed rocker ratio(s)).",
        "- `spec.rr` is the rocker ratio the catalog quotes gross lift at (page header `1.5 / 1.5`, `1.6 / 1.6`, `1.7 / 1.7`, `1.75 / 1.75`, `1.6 VL`, `(1.8)`); pages that print a second ratio put that pair in `spec.valveLiftAlt`. `rrExh` is only present when the two ratios differ (e.g. 290/220-series `1.6 / 1.5`, Hemi `1.57 / 1.52`). Lobe lift is stored only where printed (`lobeLiftInt/Exh`); it is not derived.",
        "- Advertised duration is at Crower's standard point unless `spec.durAdvAt` says `0.02` (Pro55 290/220-series pages) or `0.01` (Duratec). Ford Modular pages print durations twice (measured at the lobe and at the valve with 1.8 rockers): the valve-measured values are `durAdv*`/`dur050*`, the lobe-measured ones `durAdvLobe*`/`dur050Lobe*`.",
        "- Lash from the section's `Note: These cams use .022\" intake, .024\" exhaust valve lash.` line (`spec.lash` = intake, `spec.lashExh` only when different); hydraulic sections print `.000\"`.",
        "- `spec.type` from the section heading (HYDRAULIC/MECHANICAL × FLAT/ROLLER TAPPET); OHC pages (Duratec, Neon) have no tappet heading and are typed from the lash note (zero lash → hydraulic_flat).",
        "- RPM: description-style pages give `RPM Power Range: a to b / Redline: c` → `rpmLow`, `rpmHigh`, `redline` (`Idle` → 0). Oval-track/420-series pages tabulate Low RPM / Peak Torque / Peak HP / Top RPM per displacement group: `rpmLow`/`rpmHigh` are the first group's Low and Top values and `spec.rpmByCid` keeps every group. `rpmHigh` from a two-column `RPM RPM` table is the Top value.",
        "- `spec.level` = Crower performance level (`Performance Level 4`, `Stage 2`); `spec.line` = the product line printed before it (Compu-Pro, Beast, Hi-Draulic Hauler...). `spec.grind` = the lobe/grind designation.",
        "- Component kits: the page's `ENGINEERED COMPONENT OPTIONS/KITS` table is parsed into option number (or kit part number) → lifter / spring / retainer / seal / keeper / pushrod / plug / seat-cup part numbers, assigned to columns by x position. The cam's `Option #` cell (`1 or 2`, `See Below`, `84583`) selects the rows: `spec.kit` is the first option's part numbers, `spec.kitOptions` lists all of them, `spec.kitRemark` the catalog's one-line remark for the first option. `See Below` = every option on the page.",
        "- Variant part numbers printed in the same row (`00223S` small base circle, `00402LM` late-model step-nose core, `34414FI` fuel-injection core) become their own records with the same specs and a `fit.notes` entry. `MTO` → `spec.madeToOrder`. A `*` on the part number carries the page's `*Indicates ...` note into `fit.notes`.",
        "- `fit.ci` = the displacements in the page heading when the C.I.D. cell says `ALL`, otherwise the displacement(s) in the cam's own C.I.D. cell (`283-327` style ranges are stored as their two end values; `spec.cidGroups` keeps the printed strings). `fit.y0/y1` from the heading's year range.",
        "- Custom-grind listings (`Refer to www.crower.com for camshaft recommendation`: 00100H, 00047, 00055...) carry no specs and are skipped (listed below). O.E.M./Ford SVO reference rows (`Stock`, `E-303`, `B-303`) are not Crower parts and are skipped.",
        "- A part number the catalog prints in several rows (one per displacement, each with its own performance level or RPM range, e.g. Olds 56263 for 400/425 and for 260; BBC 01241 on the two near-identical pages 48/49) is one record per family: `fit.ci` is the union and `spec.applications` lists each row's displacement, level and RPM range.",
        "- Pages whose engine heading is unreadable (Ford p9: the first spec row is printed over the heading) take the engine line of the previous page of the same PDF, flagged below. Kit/option numbers that have no row in the page's table are looked up on the facing page (Mopar p7 → p8) or matched to a row whose part number extends the printed one (`84510` → `84510M`); what remains unresolved is flagged and kept as a bare `kitPn`/`option`.",
    ]
    L += ["", "## Springs", ""]
    L += [
        f"- Booklet pages 3–21: one spring per column, {len(spring_rows)} columns parsed. `spec.od/id` from `O.D./I.D. Outer` (middle/inner coils in `odMiddle/idMiddle`, `odInner/idInner`), `installedHt`, `rate` (lb/in), `coilBind`, `freeLength`, `wireDia` (second value and `wireOvate` for ovate wire), `type` (single / dual / triple / beehive / conical), `dual`, `damper`, `colorCode`, `material`, `loads` = the booklet's load table keyed by height (inches, string keys like `cr`), `retainers` = retainer / seat-cup / seat-disc part numbers listed under the spring.",
        "- `seatLb` = the tabulated load at the installed height (interpolated between the two neighbouring heights when that exact height is not tabulated; flagged below). `maxLift` = installed height − coil bind − 0.050\" (computed, marked by `maxLiftNote`). No nose/open load is given in the booklet, so `openLb` is absent there.",
        f"- Cam pages quote `Seat: 1.700\" @ 101 lbs / Nose: 1.200\" @ 297 lbs / Coil bind: 1.130\"` for the springs in their kits ({len(cam_spring_lines)} distinct spring PNs): springs that are not in the booklet are emitted from those lines (`seatLb`, `openLb`, `openHt`, `coilBind`, `installedHt`; `src` = the cam PDF page); for booklet springs those numbers are added as `seatLbCatalog`/`openLb`/`openHt` when they differ from the booklet.",
        "- The booklet gives no engine fitment. A spring's `fit.fam` is the set of families of the cams whose kits recommend it (one record per family, `fit.notes` names the source); springs no cam kit references are emitted once with `fit.fam` = `Universal` and flagged.",
        "- Layout quirk: on several booklet pages the `Coil Bind` and `Retainers` cells of some columns print inside the load table rows (`1.050 | 1.320`, `1.000 | 87096 (5.5mm)`); those values are recognised by shape and flagged below.",
    ]
    L += ["", "## Lifters", ""]
    L += [
        f"- `Lifters -Rollers 119-132` (master catalog pp 119–132): {len(lifter_rows)} table rows. Pages 1–2 hydraulic flat tappet, 3–4 mechanical flat tappet, 5 hydraulic roller (late-model drop-in and retro-fit link-bar), 7 original full-body solid roller, 9 severe-duty cutaway, 10 severe-duty oversized bearing, 11 raised-seat and big-inch/Hemi, 13–14 EnduraMax bushed rollers. Pages 6, 8, 12 are prose/diagrams.",
        "- `spec.style`, `bodyDia`, `seatHeight` (pushrod seat height), `weight` (g), `rollerDia` (bearing O.D.), `springGroup` with the page-124 open-pressure band in `openPressureLb`, `intakeOffset`/`exhaustOffset`, pushrod-seat location counts (`seatLeft/Center/Right`), `tallBody` (+.300\" body or 'Tall Block' column), `hippo` (high-pressure pin oiling; the `...H-16` column is its own record), `bushed` (EnduraMax `...E-16`), `oiling` (Cam Saver / Cool Face option), `linkBar` (true for solid rollers and retro-fit hydraulic rollers, false for drop-in), `qty` from the `-16/-12/-8/-20` suffix.",
        "- Families from the row's description (`CHEVROLET V8 '55-up 262-400 cu. in.` → Small-block Chevy; `Big Block 396-454` → both Chevy big-block families; a bare `Chevrolet V8` flat-tappet lifter → SBC and both BBC families). `fit.notes` keeps the catalog's application text.",
    ]
    if unknown:
        L += ["", "## Families not in the fitment list (need a decision)", ""]
        L += [f"- `{u}`" for u in unknown]
    if held_imports:
        L += ["", "## Held back (import makes inside the domestic PDFs)", ""]
        L += [f"- {h}" for h in held_imports]
    L += ["", "## Pages", "", "| make | PDF page | printed page | heading | cam rows |", "|---|---|---|---|---|"]
    for (make, pno), info in page_infos.items():
        n = sum(1 for r in cam_rows if r["pdfMake"] == make and r["page"] == pno)
        L.append(f"| {make} | {pno} | {info.get('printed') or ''} | {(info.get('tappet') or '')} — {(info.get('engine') or '')[:70]} | {n} |")
    L += ["", "## Rows skipped", ""]
    L += [f"- {w} {pn}: {why}" for w, pn, why in skipped] or ["- none"]
    L += ["", "## Needs human QA", ""]
    L += [f"- {q}" for q in qa] or ["- nothing flagged"]
    L += ["", "## Validation", ""]
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family; numeric spec fields are numbers (inches as decimals); no empty strings.")
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
    ap.add_argument("--offline", action="store_true", help="do not touch the network; parse dl/crower/ as is")
    ap.add_argument("--include-imports", action="store_true", help="also emit the import-make sections (Nissan Patrol, Mitsubishi) found in the domestic PDFs")
    args = ap.parse_args()
    import pdfplumber

    os.makedirs(OUT, exist_ok=True)
    log = []
    if not args.offline:
        check_robots(log, ["/master-catalog", "/media/"])
    docs = discover(log, args.offline)
    missing = [k for k in CAM_MAKES + ["springs", "lifters"] if k not in docs]
    if missing:
        raise SystemExit(f"master-catalog page lacks links for {missing}")
    for name, (url, path) in docs.items():
        if not args.offline:
            fetch(url, path, log)
        elif not os.path.exists(path):
            raise SystemExit(f"--offline but {path} is missing")
    if args.offline:
        log.append("offline: parsed cached PDFs in dl/crower/")

    qa, skipped, held = [], [], []
    cam_rows, page_infos, kits_by_page = [], OrderedDict(), {}
    cam_spring_lines = {}
    for make in CAM_MAKES:
        url, path = docs[make]
        prev_engine = None
        with pdfplumber.open(path) as pdf:
            for pno, page in enumerate(pdf.pages, 1):
                rows, info, spring_lines, ppage = parse_cam_page(page, make, pno, qa, skipped, prev_engine)
                if info and info.get("engine"):
                    prev_engine = info["engine"]
                pg, words = page_words(page)
                lines = group_lines(words)
                kits_by_page[(make, pno)] = parse_kit_tables(lines, [], f"{make} p{pno}")
                for pn, d in spring_lines.items():
                    cam_spring_lines.setdefault(pn, dict(d, make=make, page=pno, url=url))
                if info:
                    page_infos[(make, pno)] = info
                    if info["make"] in IMPORT_MAKES and not args.include_imports:
                        held.append(f"{make} PDF p{pno}: {info['make']} — {info['engine'][:60]} ({len(rows)} rows)")
                        continue
                cam_rows.extend(rows)

    records = cam_records(cam_rows, kits_by_page, docs, qa)

    # springs: booklet + cam-page pressure lines; families from the cam kits
    spring_fams = defaultdict(OrderedDict)
    for rec in records:
        for k in [rec["spec"].get("kit")] + [o for o in rec["spec"].get("kitOptions") or []]:
            if k and k.get("springs"):
                for s in str(k["springs"]).split(" & "):
                    spring_fams[s.rsplit("-", 1)[0]].setdefault(rec["fit"]["fam"], rec["_known"])
    lifter_fams = defaultdict(OrderedDict)
    for rec in records:
        for k in [rec["spec"].get("kit")] + [o for o in rec["spec"].get("kitOptions") or []]:
            if k and k.get("lifters"):
                lifter_fams[k["lifters"]].setdefault(rec["fit"]["fam"], rec["_known"])
    spring_rows = parse_spring_booklet(docs["springs"][1], qa)
    seen_springs = set()
    for r in spring_rows:
        fams = list(spring_fams.get(r["pn"], {}).items()) or [("Universal", False)]
        recs = spring_record(r, fams, qa, docs["springs"][0])
        extra = cam_spring_lines.get(r["pn"])
        for rec in recs:
            if extra:
                sp = rec["spec"]
                if sp.get("seatLb") != extra["seatLb"] or sp.get("installedHt") != extra["installedHt"]:
                    sp["seatLbCatalog"] = extra["seatLb"]
                    sp["installedHtCatalog"] = extra["installedHt"]
                sp["openHt"], sp["openLb"] = extra["openHt"], extra["openLb"]
                if sp.get("coilBind") is None:
                    sp["coilBind"] = extra["coilBind"]
            if rec["fit"]["fam"] != "Universal":
                rec["fit"]["notes"] = "family from the cam kits that recommend this spring"
        records += recs
        seen_springs.add(r["pn"])
    for pn, d in cam_spring_lines.items():
        if pn in seen_springs:
            continue
        fams = list(spring_fams.get(pn, {}).items()) or [("Universal", False)]
        spec = clean({"installedHt": d["installedHt"], "seatLb": d["seatLb"], "openHt": d["openHt"], "openLb": d["openLb"], "coilBind": d["coilBind"]})
        for fam, known in fams:
            records.append({
                "m": BRAND, "p": pn, "cat": "spring", "name": f"valve spring, {d['installedHt']} installed, {d['seatLb']}/{d['openLb']} lb",
                "fit": clean({"fam": fam, "notes": "family from the cam kits that recommend this spring" if fam != "Universal" else "not in the spring booklet; from a cam-page spring-pressure line"}),
                "spec": spec,
                "src": {"doc": f"Crower 2025 {d['make']} camshaft catalog (PDF), spring pressure note", "edition": EDITION, "url": d["url"], "page": d["page"]},
                "emissions": None, "_known": known,
            })
        qa.append(f"spring {pn}: not in the 2024 booklet; specs from the {d['make']} cam PDF p{d['page']} pressure line only")

    lifter_rows = parse_lifter_pdf(docs["lifters"][1], qa, skipped)
    lrecs = lifter_records(lifter_rows, qa, docs["lifters"][0])
    # de-duplicate lifter PNs listed twice (same PN under two application rows) -> one record per (pn, fam)
    seen = {}
    for rec in lrecs:
        key = (rec["p"], rec["fit"]["fam"])
        if key in seen:
            prev = seen[key]
            if rec["fit"].get("notes") and rec["fit"]["notes"] not in (prev["fit"].get("notes") or ""):
                prev["fit"]["notes"] = (prev["fit"].get("notes") + "; " if prev["fit"].get("notes") else "") + rec["fit"]["notes"]
            continue
        seen[key] = rec
        records.append(rec)

    if not args.include_imports:
        before = len(records)
        records = [r for r in records if not r["fit"]["fam"].startswith("Holden")]
        if before != len(records):
            held.append(f"lifter PDF: {before - len(records)} Holden rows")
    unknown = sorted({r["fit"]["fam"] for r in records if not r["_known"]})
    for r in records:
        r.pop("_known", None)
    errs = validate(records)

    out = {
        "source": {
            "brand": BRAND, "edition": EDITION,
            "docs": {k: v[0] for k, v in docs.items()},
            "fetched": dt.datetime.fromtimestamp(os.path.getmtime(docs["Chevrolet"][1]), dt.timezone.utc).date().isoformat(),
            "notes": "2025 master catalog per-make camshaft PDFs (file date 120824), Spring Booklet 2024 V3, lifters pp 119-132",
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(records),
        "parts": records,
    }
    with open(os.path.join(OUT, "crower.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    write_notes(os.path.join(OUT, "crower.md"), log, docs, cam_rows, page_infos, records, skipped, qa, errs, unknown, held, spring_rows, lifter_rows, cam_spring_lines)
    by_cat = Counter(r["cat"] for r in records)
    print(f"cam rows: {len(cam_rows)}; records: {len(records)} {dict(by_cat)}; skipped: {len(skipped)}; QA items: {len(qa)}; validation errors: {len(errs)}")
    for e in errs[:50]:
        print("  VALIDATION:", e)
    if errs:
        sys.exit(1)


if __name__ == "__main__":
    main()
