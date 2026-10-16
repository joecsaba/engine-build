"""Trend Performance stocking pushrods -> shared parts records.

Source: https://trendperform.com/files/trend-2019-catalog-pdf.pdf (44 pages, 2019 catalog;
PDF CreationDate 2018-10-26). Page 7 "STOCKING PUSHRODS" has one ruled table:

    PART # | DIAMETER | WALL | LENGTHS IN .025" INCREMENTS | 210 CLEARANCE | SINGLE OR DOUBLE TAPER | QUICK SHIP

with seven series (TXXX805, TXXX1055, TXXX803, TXXX1353, TXXX1657DT, TXX1657, TXXX2002). The
PART # column is a template: "use your desired length to replace XXX", e.g. T625805 = 6.25",
.080 wall, 5/16" diameter; "for lengths longer than 10" use TT to preface the part # instead
of the single T". One record is generated per stocked length.

Usage:  python -I scripts/parts-catalog/extract_trend.py
Re-runnable: the PDF is fetched once into dl/trend/ (robots.txt checked first, polite UA);
later runs parse the cached file. Writes only dl/trend/ and out/trend.json.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.robotparser as robotparser
from datetime import date
from fractions import Fraction

import pdfplumber

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "trend")
OUT = os.path.join(HERE, "out")
PDF_URL = "https://trendperform.com/files/trend-2019-catalog-pdf.pdf"
ROBOTS_URL = "https://trendperform.com/robots.txt"
PDF_PATH = os.path.join(DL, "trend-2019-catalog-pdf.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "Trend"
DOC = "Trend Performance 2019 catalog PDF (trend-2019-catalog-pdf.pdf), p7 stocking pushrods table"
EDITION = "2019"
PAGE = 7

# Blanket statements in the p7 text, applied to every stocking pushrod.
MATERIAL = "4130 chromoly, one-piece, centerless ground"
ENDS = "5/16 ball-ball"
FINISH = "black oxide"

# The p7 table carries a dangling "*Lengths available in .050 increments" footnote with no
# asterisk in any row. The same table on the manufacturer's site
# (https://trendperform.com/c-1149673-push-rods-stocking-push-rods.html, fetched 2026-10-16)
# puts the 1/2" TXXX2002 row under a separate "Lengths in .050 increments" heading, so that
# series is stepped at .050; every other series is .025 as the column header says.
STEP_OVERRIDE = {"TXXX2002": 50}  # thousandths of an inch
DEFAULT_STEP = 25

# ---------------------------------------------------------------- fetch


def fetch_pdf():
    """Download the catalog once. Obeys robots.txt and the 6 s per-host gap."""
    if os.path.exists(PDF_PATH) and os.path.getsize(PDF_PATH) > 0:
        return
    import requests  # only needed on first run
    os.makedirs(DL, exist_ok=True)
    headers = {"User-Agent": UA, "Accept": "application/pdf,*/*;q=0.8"}
    r = requests.get(ROBOTS_URL, headers=headers, timeout=30)
    with open(os.path.join(DL, "robots.txt"), "w", encoding="utf-8", errors="replace") as f:
        f.write(f"# status {r.status_code}\n{r.text if r.status_code == 200 else ''}")
    rp = robotparser.RobotFileParser()
    rp.parse(r.text.splitlines() if r.status_code == 200 else [])
    if not (rp.can_fetch(UA, PDF_URL) and rp.can_fetch("*", PDF_URL)):
        sys.exit("robots.txt disallows the catalog URL; stopping")
    delay = rp.crawl_delay(UA) or rp.crawl_delay("*") or 0
    time.sleep(max(6, delay))
    r = requests.get(PDF_URL, headers=headers, timeout=120)
    if r.status_code != 200 or "pdf" not in r.headers.get("content-type", ""):
        sys.exit(f"catalog fetch failed: {r.status_code} {r.headers.get('content-type')}")
    with open(PDF_PATH, "wb") as f:
        f.write(r.content)
    with open(os.path.join(DL, "fetch.json"), "w", encoding="utf-8") as f:
        json.dump({"url": PDF_URL, "status": r.status_code, "bytes": len(r.content),
                   "lastModified": r.headers.get("Last-Modified"), "etag": r.headers.get("ETag"),
                   "fetched": date.today().isoformat()}, f, indent=1)


# ---------------------------------------------------------------- parse


def frac_inches(s):
    """'5/16"' -> 0.3125 ; '1/2"' -> 0.5"""
    m = re.fullmatch(r'\s*(\d+)/(\d+)\s*"?\s*', s)
    if not m:
        raise ValueError(f"bad fraction {s!r}")
    return float(Fraction(int(m.group(1)), int(m.group(2))))


def thou(s):
    """'6"' -> 6000 ; '9.8"' -> 9800 ; '.080' -> 80  (thousandths of an inch, exact ints)."""
    s = s.strip().rstrip('"').strip()
    m = re.fullmatch(r"(\d*)(?:\.(\d{1,3}))?", s)
    if not m or not (m.group(1) or m.group(2)):
        raise ValueError(f"bad inch value {s!r}")
    whole = int(m.group(1) or 0)
    frac = (m.group(2) or "").ljust(3, "0")
    return whole * 1000 + int(frac)


def norm(cell):
    return " ".join((cell or "").split())


def parse_table(pdf_path):
    """Return (metadata, header, rows) for the p7 stocking table. Rows are dicts of raw cells."""
    with pdfplumber.open(pdf_path) as pdf:
        meta = dict(pdf.metadata)
        page = pdf.pages[PAGE - 1]
        text = page.extract_text() or ""
        tables = page.extract_tables()
    if "STOCKING PUSHRODS" not in text:
        sys.exit(f"page {PAGE} is not the stocking pushrods page; catalog layout changed?")
    table = next((t for t in tables if t and norm(t[0][0]) == "PART #"), None)
    if table is None:
        sys.exit("stocking table not found on page 7")
    header = [norm(c) for c in table[0]]
    expected = ["PART #", "DIAMETER", "WALL", 'LENGTHS IN .025" INCREMENTS', "210° CLEARANCE",
                "SINGLE OR DOUBLE TAPER", "QUICK SHIP"]
    if header != expected:
        sys.exit(f"unexpected header {header!r}")
    rows = []
    for cells in table[1:]:
        cells = [norm(c) for c in cells]
        if not cells[0]:
            continue
        rows.append(dict(zip(("template", "diameter", "wall", "lengths", "clearance",
                              "taper", "quickShip"), cells)))
    footnotes = {
        "tt": 'For lengths longer than 10" use' in text,
        "step050": '*Lengths available in .050" increments' in text,
        "dt": "**Pushrods are stocked double-tapered" in text,
        "example": re.search(r"T625805 = a pushrod with a length of 6\.25", text) is not None,
    }
    return meta, header, rows, footnotes


# ---------------------------------------------------------------- generate


def length_digits(t):
    """Length in thousandths -> the digits that replace XXX in the template.

    The catalog's only worked example is T625805 = 6.25" (digits '625', i.e. the length with
    the decimal point removed and the trailing zero dropped). Rule used here: thousandths with
    trailing zeros stripped, padded back to at least 3 digits (4 for lengths of 10" and over,
    which also take the 'TT' prefix per the footnote). 6.000 -> 600, 6.025 -> 6025,
    6.250 -> 625, 7.400 -> 740, 10.500 -> 1050, 11.025 -> 11025.
    """
    d = str(t).rstrip("0") or "0"
    width = 4 if t >= 10000 else 3
    return d.ljust(width, "0")


def part_number(template, t):
    prefix, rest = re.fullmatch(r"(T)(X{2,3}.*)", template).groups()
    suffix = rest.lstrip("X")
    if t > 10000:  # "For lengths longer than 10" use TT to preface part #"
        prefix = "TT"
    return f"{prefix}{length_digits(t)}{suffix}"


def option(cell):
    """'Standard' / '**Standard' / 'Optional' / 'N/A' -> 'standard' | 'optional' | None"""
    c = cell.lstrip("*").strip().lower()
    if c == "n/a":
        return None
    if c in ("standard", "optional"):
        return c
    raise ValueError(f"unexpected option cell {cell!r}")


def series_from_row(row):
    m = re.fullmatch(r'(\d+(?:\.\d+)?)"\s*to\s*(\d+(?:\.\d+)?)"', row["lengths"])
    if not m:
        raise ValueError(f"bad length range {row['lengths']!r}")
    lo, hi = thou(m.group(1)), thou(m.group(2))
    step = STEP_OVERRIDE.get(row["template"], DEFAULT_STEP)
    if (hi - lo) % step:
        raise ValueError(f"{row['template']}: range {lo}-{hi} not a multiple of step {step}")
    taper = option(row["taper"])
    stocked_double = row["taper"].startswith("**")  # "**Pushrods are stocked double-tapered"
    return {
        "template": row["template"],
        "diameter": frac_inches(row["diameter"]),
        "diameterText": row["diameter"].rstrip('"'),
        "wall": thou(row["wall"]) / 1000,
        "lo": lo, "hi": hi, "step": step,
        "clearance210": option(row["clearance"]),
        "taperOption": taper,
        "stockedDoubleTaper": stocked_double,
        "quickShip": option(row["quickShip"]) is not None,
    }


def records_for(series):
    out = []
    for t in range(series["lo"], series["hi"] + 1, series["step"]):
        length = t / 1000
        pn = part_number(series["template"], t)
        taper = "double" if series["stockedDoubleTaper"] else "straight"
        spec = {
            "diameter": series["diameter"],
            "wall": series["wall"],
            "length": length,
            "material": MATERIAL,
            "ends": ENDS,
            "taper": taper,
            "finish": FINISH,
            "lengthStep": series["step"] / 1000,
            "pnTemplate": series["template"],
        }
        if series["clearance210"]:
            spec["clearance210"] = series["clearance210"]
        if series["taperOption"] and not series["stockedDoubleTaper"]:
            spec["taperOptional"] = True
        spec["quickShip"] = series["quickShip"]
        name = (f"{series['diameterText']} x {series['wall']:.3f} wall one-piece 4130 pushrod, "
                f"{length:.3f} long, {ENDS}" + (", double taper" if taper == "double" else ""))
        out.append({
            "m": BRAND, "p": pn, "cat": "pushrod", "name": name,
            "fit": {"fam": "Universal", "notes": "stocking pushrod, length-selected; no engine family in catalog"},
            "spec": spec,
            "src": {"doc": DOC, "edition": EDITION, "url": PDF_URL, "page": PAGE},
            "emissions": None,
        })
    return out


# ---------------------------------------------------------------- validate

NUMERIC = ("diameter", "wall", "length", "lengthStep")


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
        key = (r["m"], r["p"])
        if key in seen:
            errs.append(f"duplicate p: {key}")
        seen.add(key)
        for k in ("m", "p", "cat", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            errs.append(f"{r['p']}: missing fit.fam")
        walk(r, r["p"])
        for k in NUMERIC:
            if not isinstance(r["spec"].get(k), (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric: {r['spec'].get(k)!r}")
        if not re.fullmatch(r"TT?\d{3,5}(805|1055|803|1353|1657DT|1657|2002)", r["p"]):
            errs.append(f"{r['p']}: part number does not match the template pattern")
    return errs


# ---------------------------------------------------------------- main


def main():
    fetch_pdf()
    meta, header, rows, footnotes = parse_table(PDF_PATH)
    if not all(footnotes.values()):
        sys.exit(f"expected p7 footnotes missing: {footnotes}")
    assert part_number("TXXX805", 6250) == "T625805", "does not reproduce the catalog example"
    series = [series_from_row(r) for r in rows]
    parts, stats = [], []
    for s in series:
        recs = records_for(s)
        parts.extend(recs)
        stats.append((s["template"], s["lo"] / 1000, s["hi"] / 1000, s["step"] / 1000, len(recs)))
    errs = validate(parts)
    for e in errs:
        print("VALIDATION:", e)
    if errs:
        sys.exit(1)
    with open(PDF_PATH, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    fetch_info = {}
    try:
        with open(os.path.join(DL, "fetch.json"), encoding="utf-8") as f:
            fetch_info = json.load(f)
    except OSError:
        pass
    doc = {
        "source": {
            "brand": BRAND,
            "doc": DOC,
            "url": PDF_URL,
            "edition": EDITION,
            "pdfCreationDate": meta.get("CreationDate"),
            "httpLastModified": fetch_info.get("lastModified"),
            "sha256": sha,
            "pages": [PAGE],
            "robots": ROBOTS_URL,
            "userAgent": UA,
            "partNumberRule": ("template with XXX replaced by the length in thousandths, trailing zeros "
                               "stripped, min 3 digits (4 at 10 in. and over); TT prefix above 10.000 "
                               "(catalog example: T625805 = 6.25 in.)"),
        },
        "extracted": date.today().isoformat(),
        "count": len(parts),
        "parts": parts,
    }
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "trend.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {out_path}: {len(parts)} records from {len(series)} series")
    for tpl, lo, hi, step, n in stats:
        print(f"  {tpl:<11} {lo:.3f} to {hi:.3f} step {step:.3f} -> {n} PNs")


if __name__ == "__main__":
    main()
