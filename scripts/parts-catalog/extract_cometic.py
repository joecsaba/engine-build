"""Cometic 2026 Automotive Gasket Catalog PDF -> shared parts records.

Source: https://www.cometic.com/files/catalogs/CometicAB2026.pdf (180 pages, text layer,
  InDesign, created 2025-11-07). Printed page numbers are PDF index - 5.

Page layout (domestic section, PDF pages 20-89 = printed 15-84):
  MAKE heading (large font) ... engine heading (medium font, may wrap, "(continued)")
  section heading centred on the page: "Head Gaskets" | "Individual Gaskets" | "Gasket Kits"
  Head Gaskets:   sub-table title ("MLS Head Gaskets - Right Side", optional "Fits: ..." line)
                  header `Bore Thickness Pkg Qty Part No. Retail`, rows `4.320" .040" 1 C5817-040 $109.94`
  Individual:     two columns of small tables, each `title / Application Part No. Retail / rows`
  Gasket Kits:    "TOP END GASKET KIT" (left) and "BOTTOM END GASKET KIT" (right), PRO####T / PRO####B
Tables are found from their `... Part No. ... Retail` header lines; words are assigned to a
table by x-range and y-span; titles are the centred non-data lines just above a header.

Usage:  python -I scripts/parts-catalog/extract_cometic.py [--imports] [--backend fitz|pdftotext|pdfplumber]
  --imports also parses the import section (PDF pages 90-177) with the catalog heading as fit.fam.
Re-runnable: the PDF is fetched once into dl/cometic/ (robots.txt checked first, Crawl-delay 30
honoured, polite UA); later runs parse the cached file. Writes only dl/cometic/ and out/cometic.json.
Word extraction backend: PyMuPDF if importable, else poppler `pdftotext -tsv`, else pdfplumber (slow).
"""
import argparse
import collections
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.robotparser as robotparser
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "cometic")
OUT = os.path.join(HERE, "out")
PDF_URL = "https://www.cometic.com/files/catalogs/CometicAB2026.pdf"
ROBOTS_URL = "https://www.cometic.com/robots.txt"
PDF_PATH = os.path.join(DL, "CometicAB2026.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "Cometic"
DOC = "Cometic 2026 Automotive Gasket Catalog PDF (CometicAB2026.pdf)"
EDITION = "2026 (PDF created 2025-11-07)"
PAGE_OFFSET = 5          # printed page = pdf page - 5
DOMESTIC = range(20, 90)  # pdf pages (1-based) of the "Gaskets - Domestic" section
IMPORTS = range(90, 178)

Q = "”″\"˝"  # inch marks used in the PDF

MAKES = {
    "AMC": "AMC", "BUICK / GM": "Buick", "CADILLAC": "Cadillac", "CHEVROLET / GM": "Chevrolet/GM",
    "CHRYSLER / DODGE": "Chrysler/Dodge", "CUMMINS": "Cummins", "FORD": "Ford",
    "OLDSMOBILE / GM": "Oldsmobile", "PONTIAC / GM": "Pontiac",
}

# ---------------------------------------------------------------- fetch


def fetch_pdf():
    """Download the catalog once. Obeys robots.txt (Crawl-delay 30) and the polite UA."""
    if os.path.exists(PDF_PATH) and os.path.getsize(PDF_PATH) > 1_000_000:
        return
    import requests  # only needed on first run
    os.makedirs(DL, exist_ok=True)
    headers = {"User-Agent": UA, "Accept": "application/pdf,*/*;q=0.8"}
    r = requests.get(ROBOTS_URL, headers=headers, timeout=30)
    with open(os.path.join(DL, "robots.txt"), "w", encoding="utf-8", errors="replace") as f:
        f.write(f"# status {r.status_code}\n{r.text if r.status_code == 200 else ''}")
    if r.status_code == 403:
        sys.exit("robots.txt returned 403; stopping")
    rp = robotparser.RobotFileParser()
    rp.parse(r.text.splitlines() if r.status_code == 200 else [])
    if not (rp.can_fetch(UA, PDF_URL) and rp.can_fetch("*", PDF_URL)):
        sys.exit("robots.txt disallows the catalog URL; stopping")
    delay = rp.crawl_delay(UA) or rp.crawl_delay("*") or 0
    time.sleep(max(6, delay))
    r = requests.get(PDF_URL, headers=headers, timeout=300, stream=True)
    with open(os.path.join(DL, "CometicAB2026.headers.txt"), "w", encoding="utf-8") as f:
        f.write(f"status {r.status_code}\n")
        for k, v in r.headers.items():
            f.write(f"{k}: {v}\n")
    if r.status_code != 200 or "pdf" not in r.headers.get("content-type", ""):
        sys.exit(f"catalog fetch failed: {r.status_code} {r.headers.get('content-type')}")
    with open(PDF_PATH + ".part", "wb") as f:
        for chunk in r.iter_content(1 << 20):
            f.write(chunk)
    os.replace(PDF_PATH + ".part", PDF_PATH)


# ---------------------------------------------------------------- words

class Word:
    __slots__ = ("x0", "y0", "x1", "y1", "text", "h", "table")

    def __init__(self, x0, y0, x1, y1, text):
        self.x0, self.y0, self.x1, self.y1, self.text = x0, y0, x1, y1, text
        self.h = y1 - y0
        self.table = None

    @property
    def xc(self):
        return (self.x0 + self.x1) / 2

    @property
    def yc(self):
        return (self.y0 + self.y1) / 2


def load_words(pdf_path, pages, backend=None):
    """{pdf_page: [Word]} for the requested pages. Returns (backend_name, dict)."""
    if backend in (None, "fitz"):
        try:
            import fitz  # PyMuPDF
            out = {}
            with fitz.open(pdf_path) as doc:
                for p in pages:
                    out[p] = [Word(w[0], w[1], w[2], w[3], w[4]) for w in doc[p - 1].get_text("words")
                              if w[4].strip()]
            return "PyMuPDF", out
        except ImportError:
            if backend == "fitz":
                raise
    if backend in (None, "pdftotext") and shutil.which("pdftotext"):
        first, last = min(pages), max(pages)
        tsv = subprocess.run(["pdftotext", "-tsv", "-f", str(first), "-l", str(last), pdf_path, "-"],
                             check=True, capture_output=True, text=True, encoding="utf-8").stdout
        out = {p: [] for p in pages}
        for line in tsv.splitlines()[1:]:
            f = line.split("\t")
            if len(f) < 12 or f[0] != "5":
                continue
            p = int(f[1])
            if p in out:
                x0, y0, w, h = float(f[6]), float(f[7]), float(f[8]), float(f[9])
                out[p].append(Word(x0, y0, x0 + w, y0 + h, f[11]))
        ver = subprocess.run(["pdftotext", "-v"], capture_output=True, text=True).stderr.strip().splitlines()[0]
        return ver, out
    import pdfplumber
    out = {}
    with pdfplumber.open(pdf_path) as pdf:
        for p in pages:
            out[p] = [Word(w["x0"], w["top"], w["x1"], w["bottom"], w["text"])
                      for w in pdf.pages[p - 1].extract_words(x_tolerance=1.5)]
    return "pdfplumber", out


# ---------------------------------------------------------------- page structure

class Line:
    def __init__(self, words):
        self.words = sorted(words, key=lambda w: w.x0)
        self.y = sum(w.yc for w in words) / len(words)
        self.x0 = self.words[0].x0
        self.x1 = self.words[-1].x1
        self.text = " ".join(w.text for w in self.words)
        self.kind = None  # make | engine | section | header | kit | boundary | ignore | None


def group_lines(words, tol=2.6):
    rows = []
    for w in sorted(words, key=lambda w: w.yc):
        if rows and abs(rows[-1][0] - w.yc) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w.yc, [w]])
    return [Line(ws) for _, ws in rows]


def segments(line, gap=30):
    """Split a visual line into column segments at horizontal gaps wider than `gap` pt."""
    out, cur = [], [line.words[0]]
    for w in line.words[1:]:
        if w.x0 - cur[-1].x1 > gap:
            out.append(Line(cur))
            cur = [w]
        else:
            cur.append(w)
    out.append(Line(cur))
    for s in out:
        s.parent = line
    return out


class Header:
    """One `Application|Bore ... Part No. Retail` column header = one table."""

    def __init__(self, words, line):
        self.words = words
        self.y = line.y
        self.kind = "bore" if words[0].text.endswith("Bore") else "app"
        self.hx0 = words[0].x0
        self.x1 = words[-1].x1 + 6
        # descriptions start up to ~110 pt left of the "Application" label; right-column tables
        # never reach left of the page centre
        self.x0 = max(10.0, self.hx0 - 110)
        if self.hx0 > 306:
            self.x0 = max(self.x0, 300.0)
        self.part_x0 = next(w.x0 for w in words if w.text == "Part")
        self.retail_x0 = words[-1].x0
        self.y_end = None
        self.side_note = None
        self.title_lines = []
        self.rows = []
        self.orphans = []
        self.make = self.engine = self.section = None
        self.page = None


SECTION_RE = re.compile(r"^(Head Gaskets?|Individual Gaskets|Gasket Kits?)( \(continued\))?$")
KIT_RE = re.compile(r"^(TOP|BOTTOM) END GASKET KITS?$")
BOUNDARY_RE = re.compile(r"WARNING:|P65Warnings|Reproductive Harm|See page \d+|To purchase a complete|^\*NOTE")
NOTE_RE = re.compile(r"^(Additional thicknesses available|see pages 2 – 4|NEW!|N|EW!|EW! EW!|N N|\d{1,3})$")
PN_RE = re.compile(r"^(C\d{4,5}(?:-\d{3})?(?:HTS|HTG|PR|FCS|FC|C)?|PRO\d{4}[TBC](?:-\d)?|\d{4}(?:V|PB)(?:-\d{1,2})?|CF\d{4})(\*?)$")
PRICE_RE = re.compile(r"^\$[\d,]+\.\d\d$")


def split_headers(line):
    ws = line.words
    heads = []
    i = 0
    while i < len(ws):
        t0 = ws[i].text.replace("NEW!", "")  # "NEW!Bore" on p33
        nxt = ws[i + 1].text if i + 1 < len(ws) else ""
        # a data row ("4.165” Bore PRO1003T") can share the visual line with the other
        # column's header, so insist on the second header word too
        if (t0 == "Application" and nxt == "Part") or (t0 == "Bore" and nxt == "Thickness"):
            j = i
            while j < len(ws) and ws[j].text != "Retail":
                j += 1
            if j < len(ws):
                heads.append(ws[i:j + 1])
                i = j + 1
                continue
        i += 1
    out = []
    for k, hw in enumerate(heads):
        h = Header(hw, line)
        if k:
            h.x0 = max(h.x0, out[-1].x1 + 2)
        out.append(h)
    return out


def analyse_page(page, words, carry):
    """Classify lines, build tables, assign words. `carry` keeps make/engine across pages."""
    # base = the data-row font height (~12 pt boxes); column headers (~9 pt) are commoner on
    # some pages, so restrict the mode to the 10.5-14.5 band
    hist = collections.Counter(round(w.h, 1) for w in words if 10.5 <= w.h <= 14.5)
    base = hist.most_common(1)[0][0] if hist else 12.0
    words = [w for w in words if w.text != "WARNING:"]  # bold footer word, larger box than its line
    big = [w for w in words if w.h > 1.9 * base]
    mid = [w for w in words if 1.3 * base < w.h <= 1.9 * base]
    small = [w for w in words if w.h <= 1.3 * base]

    marks = []  # (y, kind, text, x0, x1)
    for ln in group_lines(big):
        if ln.text in MAKES:
            marks.append((ln.y, "make", ln.text, ln.x0, ln.x1))
    eng_lines = group_lines(mid)
    merged = []
    for ln in eng_lines:
        if merged and ln.y - merged[-1][0][-1].y < 22:
            merged[-1][0].append(ln)
        else:
            merged.append([[ln]])
    for (lns,) in merged:
        text = " ".join(l.text for l in lns)
        text = re.sub(r"\(\s*continued\s*\)|\bcontinued\b|\(\s*\)", " ", text)
        text = re.sub(r"\s+", " ", text).strip(" ,")
        if text and not NOTE_RE.match(text):
            marks.append((lns[0].y, "engine", text, min(l.x0 for l in lns), max(l.x1 for l in lns)))

    headers = []
    full_lines = group_lines(small)
    lines = []  # column segments
    for ln in full_lines:
        t = ln.text
        if BOUNDARY_RE.search(t):  # page footer / "See page N" / kit note: whole visual line
            ln.kind = "boundary"
            for w in ln.words:
                w.table = "struct"
            lines.append(ln)
            continue
        if "Retail" in t and ("Part" in t or "No." in t) and ("Application" in t or "Bore" in t):
            hs = split_headers(ln)
            if hs:
                headers.extend(hs)
                hw = {id(w) for h in hs for w in h.words}
                for w in ln.words:
                    if id(w) in hw:
                        w.table = "struct"
                rest = [w for w in ln.words if id(w) not in hw]  # a data row of the other column
                if rest:
                    lines.extend(segments(Line(rest)))
                continue
        lines.extend(segments(ln))
    for ln in lines:
        if ln.kind:
            continue
        t = ln.text
        if SECTION_RE.match(t):
            ln.kind = "section"
            marks.append((ln.y, "section", re.sub(r" \(continued\)", "", t), ln.x0, ln.x1))
        elif KIT_RE.match(t):
            ln.kind = "kit"
        elif BOUNDARY_RE.search(t):
            ln.kind = "boundary"
        elif NOTE_RE.match(t) and not (t.isdigit() and ln.y < 700):  # bare digits: page number only in the footer
            ln.kind = "ignore"
        if ln.kind:
            for w in ln.words:
                w.table = "struct"

    for h in headers:
        h.page = page
        h.make = carry["make"]
        h.engine = carry["engine"]
        h.section = carry["section"]
        for y, kind, text, x0, x1 in sorted(marks):
            if y < h.y:
                if kind == "make":
                    h.make = text
                elif kind == "engine":
                    h.engine = text
                elif kind == "section":
                    h.section = text

    # table y-span: down to the next overlapping structural line / header
    bottom = max((w.y1 for w in words), default=792) + 1
    for h in headers:
        cands = [bottom]
        for y, kind, text, x0, x1 in marks:
            if y > h.y + 3 and x1 > h.x0 and x0 < h.x1:
                cands.append(y - 2)
        for ln in lines:
            if ln.kind in ("kit", "boundary") and ln.y > h.y + 3 and ln.x1 > h.x0 and ln.x0 < h.x1:
                cands.append(ln.y - 2)
        for g in headers:
            if g.y > h.y + 3 and min(g.x1, h.x1) - max(g.x0, h.x0) > 20:
                cands.append(g.y - 2)
        h.y_end = min(cands)

    # title lines: centred non-data lines just above the header, inside the table's x-range.
    # Title paragraphs are centred on the table frame (midpoint of the header's first word and
    # "Retail"); data descriptions are left-aligned and end before the part-number column, so
    # their centre lies far left of that. Data lines also carry a PN / price on the same visual line.
    def is_data_word(h, w):
        """A PN in this table's part-number column or a price in its retail column."""
        return ((PN_RE.match(w.text) and h.part_x0 - 40 <= w.xc <= h.x1)
                or (PRICE_RE.match(w.text) and h.retail_x0 - 10 <= w.xc <= h.x1 + 6))

    for h in headers:
        centre = (h.hx0 + h.x1) / 2
        above = [ln for ln in lines if not ln.kind and h.y - 60 < ln.y < h.y - 3
                 and abs((ln.x0 + ln.x1) / 2 - centre) <= 32
                 and ln.x0 >= h.x0 - 10 and ln.x1 <= h.x1 + 40
                 and not any(is_data_word(h, w) for w in getattr(ln, "parent", ln).words)]
        above.sort(key=lambda l: -l.y)
        prev = h.y
        for ln in above:
            if prev - ln.y > 16:
                break
            h.title_lines.insert(0, ln)
            prev = ln.y
        for ln in h.title_lines:
            for w in ln.words:
                w.table = "title"
    # a table ends where the next table's title starts
    for h in headers:
        for g in headers:
            if g is h or not g.title_lines:
                continue
            ty = g.title_lines[0].y
            if h.y + 3 < ty < h.y_end and min(g.x1, h.x1) - max(g.x0, h.x0) > 20:
                h.y_end = ty - 2

    # assign data words (a word inside two overlapping ranges goes to the nearer table centre)
    for w in small:
        if w.table:
            continue
        cands = [h for h in headers if h.x0 - 6 <= w.xc <= h.x1 + 6 and h.y + 4 < w.yc < h.y_end]
        if cands:
            w.table = min(cands, key=lambda h: abs((h.x0 + h.x1) / 2 - w.xc))
    # side notes printed to the right of a head-gasket table ("Fits standard 7/16 studs, and
    # 1/2" studs", "1/2” & 3/8” Stud Hole Combination")
    for h in headers:
        notes = [ln for ln in lines if not ln.kind and ln.x0 > h.x1 + 20 and h.y - 25 < ln.y < h.y_end
                 and all(w.table is None for w in ln.words)
                 and not any(is_data_word(g, w) for g in headers for w in ln.words)]
        for ln in notes:
            for w in ln.words:
                w.table = "note"
        h.side_note = re.sub(r"\s+", " ", " ".join(ln.text for ln in sorted(notes, key=lambda l: l.y))).strip() or None
    stray = [w for w in small if w.table is None]
    for h in headers:
        build_rows(h, [w for w in small if w.table is h])
    # carry make / engine / section forward
    for y, kind, text, x0, x1 in sorted(marks):
        carry[kind] = text
    return headers, stray


def build_rows(h, words):
    lines = group_lines(words)
    pn_lines = []
    for ln in lines:
        pns = [w for w in ln.words if PN_RE.match(w.text) and h.part_x0 - 40 <= w.xc <= h.retail_x0]
        if pns:
            pn_lines.append((ln, pns))
    rows = [{"pn": pns[0].text, "lines": [ln], "y": ln.y,
             "extra_pns": [p.text for p in pns[1:]]} for ln, pns in pn_lines]
    for ln in lines:
        if any(ln is r["lines"][0] for r in rows):
            continue
        if not rows:
            h.orphans.append(ln.text)
            continue
        near = min(rows, key=lambda r: abs(r["y"] - ln.y))
        if abs(near["y"] - ln.y) <= 13:
            near["lines"].append(ln)
        else:
            h.orphans.append(ln.text)
    for r in rows:
        toks = []
        for ln in sorted(r["lines"], key=lambda l: l.y):
            for w in ln.words:
                if w.text == r["pn"] or w.text in r["extra_pns"] or PRICE_RE.match(w.text):
                    continue
                toks.append(w.text)
        r["desc"] = re.sub(r"\s+", " ", " ".join(toks)).strip()
        del r["lines"]
    h.rows = rows


# ---------------------------------------------------------------- fitment

def E(fam, ci=None, cyl=8, y0=None, y1=None, notes=None, fams=None):
    return {"fam": fam, "ci": ci, "cyl": cyl, "y0": y0, "y1": y1, "notes": notes, "fams": fams}


JEEP_40 = E("AMC/Jeep inline-6", [242], 6, 1987, 2006, "4.0L 242ci")
ENGINES = {
    # AMC
    "4.0l inline 6 242ci 1987-2006: 87-01 cherokee, 93-04 grand cherokee, 87-90 wagoneer, 87-92 comanche, 91-06 wrangler": JEEP_40,
    "290-401ci v8": E("AMC V8", [290, 304, 343, 360, 390, 401]),
    # Buick
    "196, 231, 252ci v6 stock, stage i, and stage ii": E("Buick V6 181-252", [196, 231, 252], 6),
    "3800 series ii/iii v6 l26, l32, l36, l67 1995-2003, 2003-2009": E("Buick V6 181-252", [231], 6, 1995, 2009, "3800 Series II/III"),
    "350 1968-81": E("Buick 350", [350], 8, 1968, 1981),
    "400, 430 & 455 v8 - all years": E("Buick big block", [400, 430, 455]),
    # Chevrolet / GM
    "194, 230, 250, 292 inline 6 1962-89": E("Chevy inline-6", [194, 230, 250, 292], 6, 1962, 1989),
    "18/23 degree small block v8 262-400ci": E("Small-block Chevy", [262, 283, 302, 305, 327, 350, 400], 8, None, None, "18/23 degree heads"),
    "18/23 degree small block v8 262-400ci (*has steam holes)": E("Small-block Chevy", [262, 283, 302, 305, 327, 350, 400], 8, None, None, "18/23 degree heads"),
    "small block v8 - aftermarket & race": E("Small-block Chevy", None, 8, None, None, "aftermarket & race blocks/heads"),
    "racesaver 305 sprint v8": E("Small-block Chevy", [305], 8, None, None, "RaceSaver 305 sprint"),
    "350 & 400 sb2 race v8": E("Small-block Chevy", [350, 400], 8, None, None, "SB2 race"),
    "lt1 / lt4 350ci 1992-1996": E("Small-block Chevy", [350], 8, 1992, 1996, "Gen II LT1/LT4"),
    "ls1/ls6 5.7l, ls2 6.0l, & ls3 6.2l, gen 3/4 ls series v8": E("GM LS", [346, 364, 376], 8, None, None, "Gen 3/4 LS1/LS6/LS2/LS3"),
    "ls1 / ls6 5.7l, ls2 6.0l, & ls3 6.2l": E("GM LS", [346, 364, 376], 8, None, None, "Gen 3/4 LS1/LS6/LS2/LS3"),
    "ls7 7.0l v8": E("GM LS", [427], 8, None, None, "LS7"),
    "ls9/lsa 6.2l 2009-2013: 09-13 corvette zr1, 09-15 cadillac cts-v, 12-15 camaro zl1": E("GM LS", [376], 8, 2009, 2015, "LS9/LSA"),
    "lsx race block 6-bolt 1/2’’ and 3/8’’ studs": E("GM LS", None, 8, None, None, "LSX race block, 6-bolt"),
    "lsx race block 6-bolt": E("GM LS", None, 8, None, None, "LSX race block, 6-bolt"),
    "lsx race block": E("GM LS", None, 8, None, None, "LSX race block"),
    "ls1 / ls6 5.7l, ls2 6.0l, & ls3 6.2l w/darton m.i.d. sleeves": E("GM LS", [346, 364, 376], 8, None, None, "Darton M.I.D. sleeves"),
    "l83 / 5.3l ecotec3": E("GM LT (Gen V)", [325], 8, None, None, "L83 5.3L"),
    "lt1 / lt4 / l8t 6.2l v8 2014+up": E("GM LT (Gen V)", [376, 400], 8, 2014, None, "LT1/LT4/L8T"),
    "lt-r / ltx 6-bolt v8": E("GM LT (Gen V)", None, 8, None, None, "LT-R/LTX 6-bolt race block"),
    "348ci 1958-61 / 409ci 1961-65 “w” v8": E("Chevy W-series 348/409", [348, 409], 8, 1958, 1965),
    "big block v8 - gen 4 1965-90 396, 402, 427, 454ci": E("Chevy Mark IV big block", [396, 402, 427, 454], 8, 1965, 1990),
    "big block v8 - gen 5/6 1991-00 454, 502ci": E("Chevy Gen VI big block", [454, 502], 8, 1991, 2000, "Gen 5/6"),
    "big block v8 - aftermarket, race, & marine blocks": E("Chevy Mark IV big block", None, 8, None, None, "aftermarket, race & marine blocks",
                                                           fams=["Chevy Mark IV big block", "Chevy Gen VI big block"]),
    "6.6l duramax diesel v8 2001-2016": E("Duramax 6.6", [403], 8, 2001, 2016),
    "6.6l l5p gen 1 duramax diesel v8 2017-2023": E("Duramax 6.6", [403], 8, 2017, 2023, "L5P"),
    # Chrysler / Dodge
    "5.2l & 5.9l magnum v8 1992-03": E("Mopar Magnum 5.2/5.9", [318, 360], 8, 1992, 2003),
    "318/340/360ci v8 “la” 1964-92": E("Mopar LA small block", [318, 340, 360], 8, 1964, 1992),
    "5.7l hemi v8 2003-present": E("Chrysler Gen III Hemi 5.7/6.1", [345], 8, 2003, None, "5.7L"),
    "6.1l hemi v8 2005-10": E("Chrysler Gen III Hemi 5.7/6.1", [370], 8, 2005, 2010, "6.1L"),
    "6.2l hemi v8 2015-present “hellcat”": E("Chrysler Gen III Hemi 6.2/6.4", [376], 8, 2015, None, "6.2L Hellcat"),
    "6.4l hemi v8 2011-present “apache”": E("Chrysler Gen III Hemi 6.2/6.4", [392], 8, 2011, None, "6.4L Apache"),
    "7.0l hemi v8 2016-present “drag pak”": E("Chrysler Gen III Hemi 6.2/6.4", [426], 8, 2016, None, "7.0L Drag Pak"),
    "dart hemi gen3 iron eagle block": E("Chrysler Gen III Hemi 6.2/6.4", None, 8, None, None, "Dart Gen III Hemi Iron Eagle block",
                                         fams=["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"]),
    "small block v8 - a8 sprint & a4 midget": E("Mopar LA small block", None, 8, None, None, "A8 sprint / A4 midget race blocks"),
    "small block v8 - r3 block w/w2, w7, w8, or w9 heads": E("Mopar LA small block", None, 8, None, None, "R3 race block, W2/W7/W8/W9 heads"),
    "small block v8 - r4 block w/p5 heads": E("Mopar LA small block", None, 8, None, None, "R4 race block, P5 heads"),
    "small block v8 - r6 race block": E("Mopar LA small block", None, 8, None, None, "R6 race block"),
    "big block wedge 361, 383, 400, 413, 426, & 440ci v8": E("Mopar B/RB big block", [361, 383, 400, 413, 426, 440]),
    "426 hemi 1966 & later": E("Chrysler 426 Hemi", [426], 8, 1966, None),
    # Cummins
    "5.9l 12v 6bt inline 6 diesel 1992-98": E("Cummins 5.9 12V", [359], 6, 1992, 1998),
    "5.9l 24v isb inline 6 diesel 1998.5-02": E("Cummins 5.9 24V/CR", [359], 6, 1998, 2002, "24v VP44 1998.5-02"),
    "5.9l 24v isb common rail inline 6 diesel 2003-07": E("Cummins 5.9 24V/CR", [359], 6, 2003, 2007, "24v common rail 2003-07"),
    "6.7l 24v isb inline 6 diesel 2007.5+up": E("Cummins 6.7", [408], 6, 2007, None),
    # Ford
    "4.6l & 5.4l sohc/dohc modular v8": E("Ford Modular", [281, 330], 8, None, None, "4.6L/5.4L SOHC/DOHC"),
    "4.6l sohc 3v heads modular 2005-10": E("Ford Modular", [281], 8, 2005, 2010, "4.6L SOHC 3v"),
    "5.4l sohc 3v heads modular 2004-14": E("Ford Modular", [330], 8, 2004, 2014, "5.4L SOHC 3v"),
    "5.0l gen-1 “coyote” dohc modular v8 2011-2014": E("Ford Coyote", [302], 8, 2011, 2014, "Gen-1"),
    "5.0l gen-2 “coyote” dohc modular v8 2015-2017": E("Ford Coyote", [302], 8, 2015, 2017, "Gen-2"),
    "5.0l gen-3 “coyote” dohc modular v8 2018-2023": E("Ford Coyote", [302], 8, 2018, 2023, "Gen-3"),
    "5.0l gen-4 “coyote” dohc modular v8 2024+": E("Ford Coyote", [302], 8, 2024, None, "Gen-4"),
    "5.2l “voodoo” dohc modular v8 2015-18": E("Ford Coyote", [315], 8, 2015, 2018, "5.2L Voodoo"),
    "5.2l “voodoo”, “predator” dohc modular v8 2020-2021": E("Ford Coyote", [315], 8, 2020, 2021, "5.2L Voodoo/Predator"),
    "5.8l “trinity” dohc modular v8 2013-14": E("Ford Modular", [354], 8, 2013, 2014, "5.8L Trinity"),
    "4.6/5.4l 2v/4v modular v8 w/darton solid sleeves": E("Ford Modular", [281, 330], 8, None, None, "Darton solid sleeves"),
    "4.6/5.4l 2v/4v modular v8 w/darton m.i.d. sleeves": E("Ford Modular", [281, 330], 8, None, None, "Darton M.I.D. sleeves"),
    "windsor small block v8 svo & non-svo 1962-00": E("Small-block Ford (Windsor)", [221, 260, 289, 302, 351], 8, 1962, 2000),
    "small block ford v8 - aftermarket & race": E("Small-block Ford (Windsor)", None, 8, None, None, "aftermarket & race blocks/heads"),
    "351 cleveland, 351 modified, & 400ci v8": E("Ford 351C/351M/400", [351, 400]),
    "352, 390, 406, 410, 427, & 428 fe v8": E("Ford FE", [352, 390, 406, 410, 427, 428]),
    "370ci 6.1l, 429ci 7.0l, 460ci 7.5l big block v8": E("Ford 429/460", [370, 429, 460]),
    "ford 7.3l godzilla v8 2020-22": E("Ford Godzilla 7.3", [445], 8, 2020, 2022),
    "6.0l power stroke diesel 2003-08": E("Powerstroke 6.0", [365], 8, 2003, 2008),
    "6.4l power stroke diesel 2008-2010": E("Powerstroke 6.4", [390], 8, 2008, 2010),
    "6.7l power stroke scorpion diesel 2011-17": E("Powerstroke 6.7", [406], 8, 2011, 2017),
    "7.3l power stroke diesel 1994-03": E("Powerstroke 7.3", [444], 8, 1994, 2003),
    # Oldsmobile / Pontiac
    "330, 350, 400, 403, & 455ci v8": E("Oldsmobile V8", [330, 350, 400, 403, 455]),
    "389 & 421ci v8": E("Pontiac V8", [389, 421]),
    "326, 350, 400, 428, & 455ci v8": E("Pontiac V8", [326, 350, 400, 428, 455]),
}


def norm_heading(t):
    t = t.replace("’’", "’’").replace("“", "“").replace("”", "”")
    t = re.sub(r"\s+", " ", t).strip(" ,").lower()
    return t


def cyl_from_heading(t):
    m = re.search(r"\b(?:v|inline\s*|i)(6|8|10|12)\b|\b(4|6)\s*cyl", t, re.I)
    if m:
        return int(m.group(1) or m.group(2))
    return None


def fitments(make, engine, unknown):
    """List of fit dicts (one per family) for a catalog engine heading."""
    key = norm_heading(engine)
    e = ENGINES.get(key)
    if e is None and make == "Chrysler/Dodge" and key.startswith("4.0l inline 6 242ci"):
        e = JEEP_40
    if e is None:
        unknown[f"{make}: {engine}"] += 1
        d = {"fam": f"{make}: {engine}"}
        c = cyl_from_heading(engine)
        if c:
            d["cyl"] = c
        return [d]
    fams = e["fams"] or [e["fam"]]
    out = []
    for fam in fams:
        d = {"fam": fam}
        if e["ci"]:
            d["ci"] = list(e["ci"])
        d["cyl"] = e["cyl"]
        if e["y0"]:
            d["y0"] = e["y0"]
        if e["y1"]:
            d["y1"] = e["y1"]
        if e["notes"]:
            d["notes"] = e["notes"]
        out.append(d)
    return out


# ---------------------------------------------------------------- records

def src(page):
    return {"doc": DOC, "edition": EDITION, "url": PDF_URL, "page": page, "printedPage": page - PAGE_OFFSET}


def fmt(x, nd=3):
    s = f"{x:.{nd}f}"
    return s[1:] if s.startswith("0.") else s


def add_note(fit, note):
    if note:
        fit["notes"] = f"{fit['notes']}; {note}" if fit.get("notes") else note


SIDE_RE = re.compile(r"\b(Right Hand Side|Right Side|RHS|Right|Left Hand Side|Left Side|LHS|Left)\b")
SERIES_RE = re.compile(r"^(MLS HP|MLS|MLX|HP|DST|Copper|ML|CFM-20|Rubber Coated Stainless)\b\s*Head Gaskets?\s*(.*)$", re.I)
YEARS_RE = re.compile(r"(?<![\d.\-/])((?:19|20)\d{2}|\d{2})-((?:19|20)\d{2}|\d{2}|Up|UP|Present)(?![\d.”\"])")
MAT_RE = re.compile(r"\b(MLS|MLX|HTS|HTG|AFM|AM|KF|FCS|FC|Fiber|Copper|Viton|Silicone|SN|Graphite|Molded Rubber|Cork|TNG|CFM-20)\b")
PORT_RE = re.compile(rf"(\d\.\d{{2,3}})[{Q}]?\s*[xX]\s*(\d\.\d{{2,3}})[{Q}]?")
ROUND_RE = re.compile(rf"(\d\.\d{{2,3}})[{Q}]?\s*(?:Round|Dia)")
THICK_RE = re.compile(rf"(?<![\d.])(\.\d{{3}})[{Q}]")
BORE_RE = re.compile(rf"(\d\.\d{{3}})[{Q}]?\s*Bore|(\d{{2,3}}(?:\.\d+)?)mm Bore")
QTY_RE = re.compile(r"\b(?:Need|need|Req|req)\.?\s*(\d+)\b")


def years(desc):
    for m in YEARS_RE.finditer(desc):
        a, b = m.group(1), m.group(2)
        if len(a) == 2:
            a = ("19" if int(a) >= 30 else "20") + a
        a = int(a)
        if b in ("Up", "UP", "Present"):
            return a, None
        if len(b) == 2:
            b = ("19" if int(b) >= 30 else "20") + b
        b = int(b)
        if 1930 <= a <= 2030 and a <= b <= 2030:
            return a, b
    return None, None


def clean_title(lines):
    t = " ".join(l.text for l in lines)
    t = re.sub(r"Additional thicknesses available|see pages 2 – 4|see pages 2 - 4", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def head_gasket_records(h, fits, skipped, flags):
    title = clean_title(h.title_lines)
    fits_note = None
    m = re.search(r"Fits:\s*(.*?)(?=$| MLS| MLX| HP| DST| Copper)", title)
    if m:
        fits_note = m.group(1).strip()
        title = (title[:m.start()] + title[m.end():]).strip()
    sm = SERIES_RE.match(title)
    if not sm:
        skipped.append((h.page, f"head gasket table with unrecognised title {title!r}: {len(h.rows)} rows"))
        return []
    series, rest = sm.group(1).upper().replace("MLS HP", "HP"), sm.group(2).strip(" -–")
    side = None
    sd = SIDE_RE.search(rest)
    if sd:
        side = "R" if sd.group(1).startswith("R") else "L"
        rest = (rest[:sd.start()] + " " + rest[sd.end():]).strip(" -–")
    rest = re.sub(r"\s+", " ", rest).strip(" -–")
    material = {"COPPER": "copper", "CFM-20": "composite"}.get(series, "MLS")
    construction = {"MLS": "MLS", "MLX": "MLX", "HP": "HP", "DST": "DST", "COPPER": "copper", "ML": "ML",
                    "CFM-20": "CFM-20", "RUBBER COATED STAINLESS": "rubber coated stainless"}[series]
    out = []
    for r in h.rows:
        toks = r["desc"].split()
        bore = thick = qty = None
        bore_mm = None
        note_tok = []
        for t in toks:
            tq = t.rstrip(Q)
            if bore is None and re.fullmatch(r"\d\.\d{2,3}", tq):
                bore = float(tq)
            elif bore is None and re.fullmatch(r"\d{2,3}(?:\.\d+)?mm", tq):
                bore_mm = float(tq[:-2])
                bore = round(bore_mm / 25.4, 3)
            elif thick is None and bore is not None and re.fullmatch(r"\d?\.\d{2,3}", tq):
                thick = float(tq)
            elif qty is None and thick is not None and re.fullmatch(r"\d+", tq):
                qty = int(tq)
            else:
                note_tok.append(t)
        pn, star = PN_RE.match(r["pn"]).groups()
        if bore is None or thick is None:
            skipped.append((h.page, f"{pn}: unparsed head gasket row {r['desc']!r} under {title!r}"))
            continue
        spec = {"bore": bore, "thickness": thick, "material": material, "construction": construction}
        if bore_mm is not None:
            spec["boreMm"] = bore_mm
        if qty is not None:
            spec["pkgQty"] = qty
        if side:
            spec["side"] = side
        if star:
            spec["steamHoles"] = True
        sfx = re.search(r"-(\d{3})$", pn)
        if sfx and abs(int(sfx.group(1)) / 1000 - thick) > 0.0005:
            flags["suffix"].append(f"{pn}: thickness {thick} vs PN suffix")
        name = f"{construction} head gasket, {fmt(bore)} bore, {fmt(thick)} thick"
        if side:
            name += ", right" if side == "R" else ", left"
        if rest:
            name += f", {rest}"
        extra = "; ".join(x for x in [rest, fits_note, h.side_note, " ".join(note_tok) or None] if x)
        for f in fits:
            fit = dict(f)
            add_note(fit, extra)
            if side:
                add_note(fit, "one per bank")
            out.append({"m": BRAND, "p": pn, "cat": "headGasket", "name": name, "fit": fit,
                        "spec": dict(spec), "src": src(h.page), "emissions": None})
    return out


TYPE_RULES = [
    (r"Valve Stem", "valve stem seal"), (r"Valve Cover", "valve cover"),
    (r"Intake Valley|Valley", "valley pan"), (r"Intake", "intake manifold"),
    (r"Exhaust Pipe", "exhaust pipe"), (r"Exhaust", "exhaust manifold"),
    (r"Timing Cover Seal", "timing cover seal"), (r"Timing Cover|Front Cover", "timing cover"),
    (r"Front Crank Seal", "front crank seal"), (r"Cam Seal", "cam seal"), (r"Cam Plate", "cam plate"),
    (r"Oil Pan", "oil pan"), (r"Oil Pump", "oil pump"), (r"Oil Cooler Mounting", "oil cooler mounting"),
    (r"Oil Cooler", "oil cooler"), (r"Oil Filter Adapter", "oil filter adapter"),
    (r"Rear Main Seal", "rear main seal"), (r"Water Pump|Cooling", "water pump"),
    (r"Thermostat", "thermostat"), (r"Fuel Pump", "fuel pump"), (r"Fuel Injector", "fuel injector seal"),
    (r"Throttle Body|Carb", "carburetor/throttle body"), (r"Distributor", "distributor"),
    (r"Knock Sensor", "knock sensor grommet"), (r"HPOP", "HPOP"), (r"Pushrod Cover", "pushrod cover"),
    (r"Turbo Mounting", "turbo mounting"), (r"Rubber Seal/O-Ring", "seal/o-ring kit"),
]
SKIP_TITLES = re.compile(r"Dowel")


def gasket_type(title):
    for pat, typ in TYPE_RULES:
        if re.search(pat, title, re.I):
            return typ, True
    t = re.sub(r"\((?:sold individually|sold each|\d+ Pack)\)|Gaskets?|Sets?|Kits?", " ", title)
    return re.sub(r"\s+", " ", t).strip().lower() or "gasket", False


def gasket_records(h, fits, skipped, flags):
    title = clean_title(h.title_lines)
    if not title:
        flags["notitle"].append(f"p{h.page} table at y={h.y:.0f}: {[r['pn'] for r in h.rows]}")
        title = "Gasket"
    if SKIP_TITLES.search(title):
        skipped.append((h.page, f"non-gasket table {title!r}: {[r['pn'] for r in h.rows]}"))
        return []
    typ, mapped = gasket_type(title)
    if not mapped:
        flags["type"].append(f"p{h.page}: {title!r} -> {typ!r}")
    out = []
    for r in h.rows:
        pn, star = PN_RE.match(r["pn"]).groups()
        desc = r["desc"]
        spec = {"type": typ}
        if re.search(r"\((sold individually|sold each)\)", title):
            spec["soldIndividually"] = True
        if re.search(r"\b(Set|Sets|Kit|Kits)\b", title):
            spec["set"] = True
        pm = PORT_RE.search(desc)
        if pm:
            spec["portWidth"], spec["portHeight"] = float(pm.group(1)), float(pm.group(2))
        else:
            rm = ROUND_RE.search(desc)
            if rm:
                spec["portDia"] = float(rm.group(1))
        tm = THICK_RE.search(desc)
        if tm:
            spec["thickness"] = float(tm.group(1))
        mm = MAT_RE.search(desc)
        if mm:
            spec["material"] = mm.group(1)
        qm = QTY_RE.search(desc)
        if qm:
            spec["qtyRequired"] = int(qm.group(1))
        if star:
            spec["steamHoles"] = True
        y0, y1 = years(desc)
        name = f"{typ} gasket" if typ != "valve stem seal" else "valve stem seal"
        if desc:
            spec["desc"] = desc
            name += f", {desc}"
        for f in fits:
            fit = dict(f)
            if y0:
                fit["y0"] = y0
                if y1:
                    fit["y1"] = y1
                elif "y1" in fit and fit["y1"] < y0:
                    del fit["y1"]
            out.append({"m": BRAND, "p": pn, "cat": "gasket", "name": name, "fit": fit,
                        "spec": dict(spec), "src": src(h.page), "emissions": None})
    return out


KIT_KINDS = {"T": "top end", "B": "bottom end", "C": "complete"}
PRO_PAGE = 12  # "Cometic StreetPro Diesel Gasket Kits" table: bore + head gasket thickness/series per kit
PROKIT_FIT = [  # description prefix on p12 -> (family, ci, y0, y1, notes) for kits listed only there
    (r"Cummins 3\.9L 4BT", ("CUMMINS: 3.9L 4BT Diesel 4cyl 1983+", None, None, None, None)),
    (r"Cummins 5\.9L 6BT", ("Cummins 5.9 12V", [359], 1992, 1998, None)),
    (r"Cummins 5\.9L ISB CR", ("Cummins 5.9 24V/CR", [359], 2003, 2007, "24v common rail 2003-07")),
    (r"Cummins 5\.9L ISB", ("Cummins 5.9 24V/CR", [359], 1998, 2002, "24v VP44 1998.5-02")),
    (r"Cummins .*6\.7L ISB", ("Cummins 6.7", [408], 2007, 2018, None)),
    (r"Ford 6\.0L Power Stroke", ("Powerstroke 6.0", [365], 2003, 2008, None)),
    (r"Ford 6\.4L Power Stroke", ("Powerstroke 6.4", [390], 2008, 2010, None)),
    (r"Ford 6\.7L Power Stroke", ("Powerstroke 6.7", [406], 2011, 2017, None)),
    (r"Ford 7\.3L Power Stroke", ("Powerstroke 7.3", [444], 1994, 2003, None)),
    (r"GM LB7 Duramax", ("Duramax 6.6", [403], 2001, 2004, "LB7")),
    (r"GM LLY/LBZ Duramax", ("Duramax 6.6", [403], 2004, 2007, "LLY/LBZ")),
    (r"GM LB7/LLY/LBZ Duramax", ("Duramax 6.6", [403], 2001, 2007, "LB7/LLY/LBZ")),
    (r"GM LMM/LLY Duramax", ("Duramax 6.6", [403], 2006, 2010, "LMM/LLY")),
    (r"GM LMM/LGH Duramax", ("Duramax 6.6", [403], 2007, 2010, "LMM/LGH")),
    (r"GM LML/LGH Duramax", ("Duramax 6.6", [403], 2011, 2016, "LML/LGH")),
    (r"GM LML Duramax", ("Duramax 6.6", [403], 2011, 2016, "LML")),
]


def parse_prokits(words):
    """p12 StreetPro diesel kit rows -> {pn: {desc, bore, boreMm, hgThickness, hgConstruction, dowels}}."""
    out = {}
    for ln in group_lines(words):
        pns = [w for w in ln.words if re.fullmatch(r"PRO\d{4}[TB]", w.text)]
        if not pns:
            continue
        pn = pns[0]
        desc = " ".join(w.text for w in ln.words if w.x1 <= pn.x0 and w.h < 14)
        desc = re.sub(r"\s+", " ", desc).strip()
        d = {"desc": desc, "page": PROKIT_PAGE_INDEX}
        bm = re.search(rf"(\d\.\d{{3}})[{Q}]\s*Bore|(\d{{2,3}})mm Bore", desc)
        if bm:
            if bm.group(1):
                d["bore"] = float(bm.group(1))
            else:
                d["boreMm"] = float(bm.group(2))
                d["bore"] = round(d["boreMm"] / 25.4, 3)
        hm = re.search(rf"(\.\d{{3}})[{Q}]\s*(MLX|MLS)\s*Cylinder Head Gasket", desc)
        if hm:
            d["hgThickness"], d["hgConstruction"] = float(hm.group(1)), hm.group(2)
        dm = re.search(r"(\d+)mm Dowels", desc)
        if dm:
            d["dowelsMm"] = int(dm.group(1))
        out[pn.text] = d
    return out


PROKIT_PAGE_INDEX = PRO_PAGE


def apply_prokit(spec, fit, info):
    """Merge p12 kit facts into a kit record's spec / fit notes."""
    if "bore" in info and "bore" not in spec:
        spec["bore"] = info["bore"]
    if "boreMm" in info:
        spec["boreMm"] = info["boreMm"]
    if "hgThickness" in info:
        spec["headGasketThickness"] = info["hgThickness"]
        spec["headGasketConstruction"] = info["hgConstruction"]
    if "dowelsMm" in info:
        spec["dowelsMm"] = info["dowelsMm"]


def kit_records(h, fits, skipped, flags, prokits=None):
    out = []
    for r in h.rows:
        pn, star = PN_RE.match(r["pn"]).groups()
        km = re.match(r"PRO\d{4}([TBC])(?:-\d)?$", pn)
        if not km:
            skipped.append((h.page, f"{pn}: non-PRO part in kit table {r['desc']!r}"))
            continue
        kind = KIT_KINDS[km.group(1)]
        desc = r["desc"]
        spec = {"kit": kind}
        bm = BORE_RE.search(desc)
        if bm:
            if bm.group(1):
                spec["bore"] = float(bm.group(1))
            else:
                spec["boreMm"] = float(bm.group(2))
                spec["bore"] = round(spec["boreMm"] / 25.4, 3)
        if kind in ("top end", "complete"):  # every top-end / complete kit carries the head gasket(s)
            spec["headGasketIncluded"] = True
            spec["headGasketMaterial"] = "MLS"
        note = None
        if prokits and pn in prokits:
            info = prokits[pn]
            if "bore" in spec and "bore" in info and abs(spec["bore"] - info["bore"]) > 0.002:
                flags["prokitBore"].append(f"{pn}: p{h.page} bore {spec['bore']} vs p{PRO_PAGE} {info['bore']}")
                note = f"StreetPro table (printed p{PRO_PAGE - PAGE_OFFSET}) lists {info.get('boreMm') or info['bore']}{'mm' if 'boreMm' in info else ''} bore"
                info = {k: v for k, v in info.items() if k not in ("bore", "boreMm")}
            apply_prokit(spec, None, info)
        y0, y1 = years(desc)
        name = f"{kind} gasket kit"
        if desc:
            spec["desc"] = desc
            name += f", {desc}"
        for f in fits:
            fit = dict(f)
            if y0:
                fit["y0"] = y0
                if y1:
                    fit["y1"] = y1
                elif "y1" in fit and fit["y1"] < y0:
                    del fit["y1"]
            add_note(fit, note)
            out.append({"m": BRAND, "p": pn, "cat": "gasket", "name": name, "fit": fit,
                        "spec": dict(spec), "src": src(h.page), "emissions": None})
    return out


def prokit_only_records(prokits, seen_pns, unknown):
    """Kit records for p12 diesel kits that no engine page lists (e.g. PRO3011T)."""
    out = []
    for pn, info in prokits.items():
        if pn in seen_pns:
            continue
        kind = KIT_KINDS[pn[-1]]
        fam = None
        for pat, f in PROKIT_FIT:
            if re.match(pat, info["desc"]):
                fam = f
                break
        if fam is None:
            unknown[f"p{PRO_PAGE}: {info['desc']}"] += 1
            continue
        family, ci, y0, y1, notes = fam
        fit = {"fam": family}
        if ci:
            fit["ci"] = ci
        fit["cyl"] = 6 if "Cummins" in family else 8 if ci else 4
        if y0:
            fit["y0"] = y0
        if y1:
            fit["y1"] = y1
        if notes:
            fit["notes"] = notes
        spec = {"kit": kind}
        if kind == "top end":
            spec["headGasketIncluded"] = True
            spec["headGasketMaterial"] = "MLS"
        apply_prokit(spec, fit, info)
        desc = re.sub(r"\s*(Top|Bottom) End Gasket (Kit|Set),?\s*", " ", info["desc"]).strip(" ,")
        spec["desc"] = desc
        out.append({"m": BRAND, "p": pn, "cat": "gasket", "name": f"{kind} gasket kit, {desc}", "fit": fit,
                    "spec": spec, "src": src(PRO_PAGE), "emissions": None})
    return out


def build(tables, stray, want_pages, prokits=None):
    parts, skipped = [], []
    flags = collections.defaultdict(list)
    unknown = collections.Counter()
    stats = collections.Counter()
    for h in tables:
        if h.page not in want_pages:
            continue
        if not h.make or not h.engine:
            skipped.append((h.page, f"table without make/engine context: {[r['pn'] for r in h.rows]}"))
            continue
        for o in h.orphans:
            skipped.append((h.page, f"orphan line {o!r} in table {clean_title(h.title_lines)!r}"))
        for r in h.rows:
            for x in r["extra_pns"]:
                skipped.append((h.page, f"{x}: second part number on the row of {r['pn']}"))
        fits = fitments(h.make, h.engine, unknown)
        if h.kind == "bore" or SERIES_RE.match(clean_title(h.title_lines)):
            recs = head_gasket_records(h, fits, skipped, flags)
            stats["headGasket tables"] += 1
        elif h.section == "Gasket Kits" or all(re.match(r"PRO\d{4}[TBC]", r["pn"]) for r in h.rows if h.rows):
            recs = kit_records(h, fits, skipped, flags, prokits)
            stats["kit tables"] += 1
        else:
            if h.section == "Head Gaskets":
                flags["appHeadGasket"].append(f"p{h.page}: {clean_title(h.title_lines)!r}")
            recs = gasket_records(h, fits, skipped, flags)
            stats["gasket tables"] += 1
        parts.extend(recs)
    if prokits:
        parts.extend(prokit_only_records(prokits, {r["p"] for r in parts}, unknown))
        stats["p12 StreetPro diesel kit rows"] = len(prokits)
    return parts, skipped, flags, unknown, stats


# ---------------------------------------------------------------- validate

NUMERIC = ("bore", "boreMm", "thickness", "volumeCc", "portWidth", "portHeight", "portDia", "qtyRequired", "pkgQty",
           "headGasketThickness", "dowelsMm")


def validate(parts):
    errs = []
    seen = set()

    def walk(v, path):
        if isinstance(v, str) and v == "":
            errs.append(f"empty string at {path}")
        elif isinstance(v, dict):
            for k, x in v.items():
                walk(x, f"{path}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(x, f"{path}[{i}]")

    for r in parts:
        key = (r["m"], r["p"], r["fit"]["fam"])
        if key in seen:
            errs.append(f"duplicate p within family: {key}")
        seen.add(key)
        for k in ("m", "p", "cat", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            errs.append(f"{r['p']}: missing fit.fam")
        walk(r, r["p"])
        for k, v in r["spec"].items():
            if k in NUMERIC and not isinstance(v, (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for k in ("ci", "y0", "y1", "cyl"):
            v = r["fit"].get(k)
            if v is not None and not (isinstance(v, int) or (k == "ci" and all(isinstance(x, int) for x in v))):
                errs.append(f"{r['p']}: fit.{k} not numeric")
        if r["cat"] == "headGasket":
            for k in ("bore", "thickness", "material"):
                if k not in r["spec"]:
                    errs.append(f"{r['p']}: head gasket missing spec.{k}")
            if "side" in r["spec"] and r["spec"]["side"] not in ("L", "R"):
                errs.append(f"{r['p']}: bad side {r['spec']['side']!r}")
    return errs


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--imports", action="store_true", help="also parse the import section (pages 90-177)")
    ap.add_argument("--backend", choices=["fitz", "pdftotext", "pdfplumber"])
    ap.add_argument("--dump", help="write the parsed tables (debug) to this JSON path")
    ap.add_argument("--out", help="output JSON path (default out/cometic.json)")
    args = ap.parse_args()
    fetch_pdf()
    pages = list(DOMESTIC) + (list(IMPORTS) if args.imports else [])
    backend, words = load_words(PDF_PATH, [PRO_PAGE] + pages, args.backend)
    prokits = parse_prokits(words[PRO_PAGE])
    carry = {"make": None, "engine": None, "section": None}
    tables, stray = [], []
    for p in pages:
        hs, st = analyse_page(p, words[p], carry)
        tables.extend(hs)
        stray.extend((p, w) for w in st)
    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as f:
            json.dump([{"page": h.page, "y": round(h.y), "x": [round(h.x0), round(h.x1)], "kind": h.kind,
                        "make": h.make, "engine": h.engine, "section": h.section,
                        "title": clean_title(h.title_lines), "rows": h.rows, "orphans": h.orphans}
                       for h in tables], f, indent=1, ensure_ascii=False)
    parts, skipped, flags, unknown, stats = build(tables, stray, set(pages), prokits)
    # merge duplicates (the same PN listed under the same family on several engine pages):
    # keep the first record, union the fitment notes / year span, remember the other pages
    seen, dedup, dups = {}, [], []
    for r in parts:
        key = (r["p"], r["fit"]["fam"])
        if key in seen:
            first = seen[key]
            dups.append((r["p"], r["fit"]["fam"], first["src"]["page"], r["src"]["page"]))
            a, b = first["fit"], r["fit"]
            for n in (b.get("notes") or "").split("; "):
                if n and n not in (a.get("notes") or ""):
                    add_note(a, n)
            if "ci" in b:
                a["ci"] = sorted(set(a.get("ci", [])) | set(b["ci"]))
            # year span = union of the two listings; a bound missing on either side stays open
            for k, pick in (("y0", min), ("y1", max)):
                if k in a and k in b:
                    a[k] = pick(a[k], b[k])
                elif k in a:
                    del a[k]
            sa, sb = first["spec"].get("side"), r["spec"].get("side")
            if sb and not sa:
                first["spec"]["side"] = sb
            elif sa and sb and sa != sb:
                del first["spec"]["side"]
                add_note(a, "listed for both banks")
            first["src"].setdefault("alsoPages", [])
            if r["src"]["page"] not in first["src"]["alsoPages"]:
                first["src"]["alsoPages"].append(r["src"]["page"])
            continue
        seen[key] = r
        dedup.append(r)
    parts = dedup
    errs = validate(parts)
    for e in errs:
        print("VALIDATION:", e)
    if errs:
        sys.exit(1)
    with open(PDF_PATH, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    doc = {
        "source": {"brand": BRAND, "doc": DOC, "url": PDF_URL, "edition": EDITION, "sha256": sha,
                   "pages": [min(pages), max(pages)], "printedPages": [min(pages) - PAGE_OFFSET, max(pages) - PAGE_OFFSET],
                   "wordBackend": backend, "imports": bool(args.imports)},
        "extracted": date.today().isoformat(),
        "count": len(parts),
        "parts": parts,
    }
    os.makedirs(OUT, exist_ok=True)
    out_path = args.out or os.path.join(OUT, "cometic.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    report = {
        "backend": backend, "records": len(parts), "distinctPn": len({r["p"] for r in parts}),
        "tables": dict(stats), "byCat": dict(collections.Counter(r["cat"] for r in parts)),
        "byFam": dict(collections.Counter(r["fit"]["fam"] for r in parts).most_common()),
        "byType": dict(collections.Counter(r["spec"].get("type") or r["spec"].get("kit") or r["spec"].get("construction") for r in parts).most_common()),
        "unknownFamilies": dict(unknown.most_common()),
        "duplicatesDropped": dups, "skipped": skipped, "flags": {k: v for k, v in flags.items()},
        "strayWords": collections.Counter(f"p{p}: {w.text}" for p, w in stray).most_common(80),
    }
    with open(os.path.join(DL, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print(f"wrote {out_path}: {len(parts)} records, {report['distinctPn']} distinct PNs ({backend})")
    print("  tables:", report["tables"], " by cat:", report["byCat"])
    print(f"  skipped {len(skipped)}, unknown families {len(unknown)}, dropped duplicates {len(dups)}")
    print(f"  details in {os.path.join(DL, 'report.json')}")


if __name__ == "__main__":
    main()
