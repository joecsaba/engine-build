"""Fel-Pro LS Engine Performance Line Card PDF -> shared parts records.

Source: https://www.felpro.com/content/dam/marketing/North-America/felpro/pdfs/LS-Line-Card.pdf
  (2 pages, (c)2015 Federal-Mogul Motorparts, Form # 151011).
  p1: Cylinder Head Gaskets  `Part Number | Bore | Thickness | Volume | Description`
      with two construction sub-headings in the table column ("Steel Core Laminate with
      pre-flattened wire ring" above PN 1041, "PermaTorque MLS" above the rest).
  p2: Intake Manifold Gaskets `Part Number | Dimensions | Description`,
      Exhaust Header Gaskets   `Part Number | Dimensions | Description` (2-line descriptions),
      Full Set                 `Part Number | Dimensions | Description` (3-line descriptions).
  Marketing copy sits in a right-hand column (x >= ~405 pt) on both pages and is ignored.

Usage:  python -I scripts/parts-catalog/extract_felpro.py
Re-runnable: the PDF is fetched once into dl/felpro/ (robots.txt checked first, polite UA,
6 s gap); later runs parse the cached file. Writes only dl/felpro/ and out/felpro.json.
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.robotparser as robotparser
from datetime import date

import pdfplumber

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "felpro")
OUT = os.path.join(HERE, "out")
PDF_URL = "https://www.felpro.com/content/dam/marketing/North-America/felpro/pdfs/LS-Line-Card.pdf"
ROBOTS_URL = "https://www.felpro.com/robots.txt"
PDF_PATH = os.path.join(DL, "LS-Line-Card.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "Fel-Pro"
DOC = "Fel-Pro LS Engine Performance Line Card PDF (LS-Line-Card.pdf)"
EDITION = "2015 (Form # 151011)"

TABLE_X_MAX = 405  # words at/after this x are the right-hand marketing column
PN_X_MAX = 70      # part numbers start at x ~46-60
SECTIONS = ("Cylinder Head Gaskets", "Intake Manifold Gaskets", "Exhaust Header Gaskets", "Full Set")
QUOTE = "˝″\"”"  # the PDF uses U+02DD (double acute) as the inch mark

# ---------------------------------------------------------------- fetch

def fetch_pdf():
    """Download the line card once. Obeys robots.txt and the 6 s per-host gap."""
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
        sys.exit("robots.txt disallows the line card URL; stopping")
    delay = rp.crawl_delay(UA) or rp.crawl_delay("*") or 0
    time.sleep(max(6, delay))
    r = requests.get(PDF_URL, headers=headers, timeout=90)
    with open(os.path.join(DL, "LS-Line-Card.headers.txt"), "w", encoding="utf-8") as f:
        f.write(f"status {r.status_code}\n")
        for k, v in r.headers.items():
            f.write(f"{k}: {v}\n")
    if r.status_code != 200 or "pdf" not in r.headers.get("content-type", ""):
        sys.exit(f"line card fetch failed: {r.status_code} {r.headers.get('content-type')}")
    with open(PDF_PATH, "wb") as f:
        f.write(r.content)


# ---------------------------------------------------------------- fitment

FAM = "GM LS"
# Catalog application text -> (fit.notes, ci list or None). ci only where a specific engine is named.
APPS = {
    "LS1/LS6": ("LS1/LS6", [346]),
    "LS7": ("LS7", [427]),
    "L92": ("L92", [376]),
    "GM LSX": ("GM LSX block", None),
    "World Products Warhawk": ("World Products Warhawk block", None),
    "RHS Aluminum Block": ("RHS aluminum block", None),
}


def fit(app, extra=None):
    notes, ci = APPS[app]
    d = {"fam": FAM}
    if ci:
        d["ci"] = ci
    d["cyl"] = 8
    d["notes"] = "; ".join([notes] + ([extra] if extra else []))
    return d


def src(page):
    return {"doc": DOC, "edition": EDITION, "url": PDF_URL, "page": page}


def inches(s):
    """'4.135˝' / '.041˝' -> float."""
    return float(s.rstrip(QUOTE))


def fmt(x, nd=3):
    """Inch value as printed in the catalog (.041, 3.945, 4.100; nd=2 -> 1.19, 2.70)."""
    s = f"{x:.{nd}f}"
    return s[1:] if s.startswith("0.") else s


# ---------------------------------------------------------------- parse

def page_lines(page):
    """Table-column text of a page as [(top, x0, text)], one entry per visual line."""
    words = [w for w in page.extract_words() if w["x0"] < TABLE_X_MAX]
    rows = {}
    for w in words:
        rows.setdefault(round(w["top"] / 2) * 2, []).append(w)
    out = []
    for top in sorted(rows):
        ws = sorted(rows[top], key=lambda w: w["x0"])
        out.append((top, ws[0]["x0"], " ".join(w["text"] for w in ws)))
    return out


PN_RE = re.compile(r"^(\d{4,5}[LR]?(?:-\d{1,3})?)(\*{0,2})(?:\s+(.*))?$")


def parse(pdf_path):
    """Yield (page, section, pn, flags, text, extra_lines) for every PN row.

    `text` is the rest of the PN's own line; `extra_lines` are the non-PN lines of the
    table column that belong to the row. On p1 the extra lines are construction
    sub-headings that fill down to the rows below them; on p2 they are the wrapped
    description lines, attached to the nearest PN row by vertical distance."""
    with pdfplumber.open(pdf_path) as pdf:
        meta = dict(pdf.metadata)
        rows = []
        for pageno, page in enumerate(pdf.pages, 1):
            section = None
            pending_heading = None
            page_rows = []
            loose = []  # (top, text) lines waiting for nearest-row assignment (p2)
            for top, x0, text in page_lines(page):
                if text in SECTIONS:
                    section = text
                    continue
                if section is None or text in ("Part", "Number") or text.startswith(("Bore ", "Dimensions")):
                    continue
                if text.startswith("*"):  # footnotes
                    continue
                m = PN_RE.match(text) if x0 < PN_X_MAX else None
                if m:
                    pn, flags, rest = m.group(1), m.group(2), (m.group(3) or "").strip()
                    extra = [pending_heading] if (pageno == 1 and pending_heading) else []
                    page_rows.append([pageno, section, pn, flags, rest, extra, top])
                elif pageno == 1:
                    pending_heading = text  # fills down until the next heading
                else:
                    loose.append((top, text, section))
            for top, text, sec in loose:
                cands = [r for r in page_rows if r[1] == sec]
                if not cands:
                    continue
                nearest = min(cands, key=lambda r: abs(r[6] - top))
                if abs(nearest[6] - top) <= 12:
                    nearest[5].append(text)
            rows.extend(tuple(r[:6]) for r in page_rows)
    return meta, rows


# ---------------------------------------------------------------- records

def head_gasket(pageno, pn, flags, text, extra):
    m = re.match(rf"(\d\.\d{{3}})[{QUOTE}]\s+(\.\d{{3}})[{QUOTE}]\s+([\d.]+)cc\s+(.*)$", text)
    if not m:
        raise ValueError(f"{pn}: unparsed head gasket row {text!r}")
    bore, thick, cc, desc = inches(m.group(1)), inches(m.group(2)), float(m.group(3)), m.group(4).strip()
    heading = extra[0] if extra else ""
    if heading.startswith("Steel Core Laminate"):
        material, construction, label = "composite", "steel core laminate, pre-flattened wire ring", "steel core laminate head gasket"
    elif heading.startswith("PermaTorque"):
        material, construction, label = "MLS", "PermaTorque MLS", "PermaTorque MLS head gasket"
    else:
        raise ValueError(f"{pn}: no construction heading")
    spec = {"bore": bore, "thickness": thick, "volumeCc": cc, "material": material, "construction": construction}
    side = re.search(r"^\d+([LR])", pn)
    hand = re.match(r"(Left|Right)-[Hh]and\.\s*(.*)$", desc)
    if hand:
        if hand.group(1)[0] != side.group(1):
            raise ValueError(f"{pn}: description hand {hand.group(1)} != PN suffix")
        desc = hand.group(2)
    if side:
        spec["side"] = side.group(1)
    qty = re.search(r"\s*2 req\.\s*", desc)
    if qty:
        spec["qtyRequired"] = 2
        desc = (desc[:qty.start()] + " " + desc[qty.end():]).strip(" ,")
    if "*" in flags:
        spec["marineSuitable"] = True  # "*Suitable for Marine Applications"
    app = desc.strip()
    if app not in APPS:
        raise ValueError(f"{pn}: unknown application {app!r}")
    name = f"{label}, {fmt(bore)} bore, {fmt(thick)} thick, {cc:.1f} cc"
    if side:
        name += ", " + ("left" if side.group(1) == "L" else "right")
    return [{"m": BRAND, "p": pn, "cat": "headGasket", "name": name,
             "fit": fit(app, "one per bank" if side else ("2 required" if qty else None)),
             "spec": spec, "src": src(pageno), "emissions": None}]


def intake_gasket(pageno, pn, flags, text, extra):
    m = re.match(rf"(\d\.\d{{2}})[{QUOTE}] x (\d\.\d{{2}})[{QUOTE}] x (\.\d{{3}})[{QUOTE}] Thick\s+Composite with (.*?)[,]?\s+(LS7|L92|LS1/LS6)$", text)
    if not m:
        raise ValueError(f"{pn}: unparsed intake gasket row {text!r}")
    w, h, t, feats, app = inches(m.group(1)), inches(m.group(2)), inches(m.group(3)), m.group(4), m.group(5)
    spec = {"type": "intake manifold", "portWidth": w, "portHeight": h, "thickness": t, "material": "composite",
            "coated": "coating" in feats, "printoseal": "Printoseal" in feats}
    name = f"composite intake manifold gasket, {fmt(w, 2)} x {fmt(h, 2)} port, {fmt(t)} thick"
    if spec["printoseal"]:
        name += ", Printoseal"
    return [{"m": BRAND, "p": pn, "cat": "gasket", "name": name, "fit": fit(app),
             "spec": spec, "src": src(pageno), "emissions": None}]


def header_gasket(pageno, pn, flags, text, extra):
    spec = {"type": "exhaust header", "material": "high-density fiber facing, perforated steel core"}
    m = re.match(rf"(\d\.\d{{2}})[{QUOTE}] x (\d\.\d{{2}})[{QUOTE}]$", text)
    if m:
        spec["portWidth"], spec["portHeight"] = inches(m.group(1)), inches(m.group(2))
        dims = f"{fmt(spec['portWidth'], 2)} x {fmt(spec['portHeight'], 2)} port"
    else:
        m = re.match(rf"(\d\.\d{{2}})[{QUOTE}] Dia\.$", text)
        if not m:
            raise ValueError(f"{pn}: unparsed header gasket row {text!r}")
        spec["portDia"] = inches(m.group(1))
        dims = f"{fmt(spec['portDia'], 2)} round port"
    desc = " ".join(extra)
    if "anti-stick coating" in desc:
        spec["antiStickCoating"] = True
    m = re.search(r"(Stock exhaust ports|Large race ports), (LS1/LS6)", desc)
    if not m:
        raise ValueError(f"{pn}: unparsed header gasket description {desc!r}")
    ports, app = m.group(1).lower(), m.group(2)
    return [{"m": BRAND, "p": pn, "cat": "gasket", "name": f"exhaust header gasket, {dims}, {ports}",
             "fit": fit(app, ports), "spec": spec, "src": src(pageno), "emissions": None}]


def full_set(pageno, pn, flags, text, extra):
    m = re.match(rf"(\d\.\d{{3}})[{QUOTE}] Bore\s+(.*)$", text)
    if not m:
        raise ValueError(f"{pn}: unparsed full set row {text!r}")
    bore = inches(m.group(1))
    desc = " ".join(extra[:1] + [m.group(2)] + extra[1:])
    m = re.match(r"Premium engine sealing set\. Set contains (.*?)\. (LS1/LS6)$", desc)
    if not m:
        raise ValueError(f"{pn}: unparsed full set description {desc!r}")
    includes = [s.strip() for s in re.split(r",\s*(?:plus\s+)?", m.group(1)) if s.strip()]
    spec = {"kit": "full set", "bore": bore, "headGasketIncluded": True, "headGasketMaterial": "MLS",
            "includes": includes}
    return [{"m": BRAND, "p": pn, "cat": "gasket", "name": f"full gasket set, {fmt(bore)} bore",
             "fit": fit(m.group(2), "for applications not covered, use individual components"),
             "spec": spec, "src": src(pageno), "emissions": None}]


HANDLERS = {
    "Cylinder Head Gaskets": head_gasket,
    "Intake Manifold Gaskets": intake_gasket,
    "Exhaust Header Gaskets": header_gasket,
    "Full Set": full_set,
}


def build(rows):
    parts, stats, skipped = [], {}, []
    for pageno, section, pn, flags, text, extra in rows:
        handler = HANDLERS.get(section)
        if handler is None:
            skipped.append((pn, f"unknown section {section!r}"))
            continue
        recs = handler(pageno, pn, flags, text, extra)
        s = stats.setdefault(section, {"pns": 0, "records": 0})
        s["pns"] += 1
        s["records"] += len(recs)
        parts.extend(recs)
    return parts, stats, skipped


# ---------------------------------------------------------------- validate

NUMERIC = ("bore", "thickness", "volumeCc", "portWidth", "portHeight", "portDia", "qtyRequired")


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
        if "ci" in r["fit"] and not all(isinstance(x, int) for x in r["fit"]["ci"]):
            errs.append(f"{r['p']}: fit.ci not numeric")
        if r["cat"] == "headGasket":
            for k in ("bore", "thickness", "volumeCc", "material"):
                if k not in r["spec"]:
                    errs.append(f"{r['p']}: head gasket missing spec.{k}")
            if "side" in r["spec"] and r["spec"]["side"] not in ("L", "R"):
                errs.append(f"{r['p']}: bad side {r['spec']['side']!r}")
    return errs


# ---------------------------------------------------------------- main

def main():
    fetch_pdf()
    meta, rows = parse(PDF_PATH)
    parts, stats, skipped = build(rows)
    errs = validate(parts)
    for e in errs:
        print("VALIDATION:", e)
    if errs:
        sys.exit(1)
    with open(PDF_PATH, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    doc = {
        "source": {
            "brand": BRAND,
            "doc": DOC,
            "url": PDF_URL,
            "edition": EDITION,
            "pdfCreationDate": meta.get("CreationDate"),
            "pdfModDate": meta.get("ModDate"),
            "pdfTitle": meta.get("Title"),
            "sha256": sha,
            "pages": [1, 2],
        },
        "extracted": date.today().isoformat(),
        "count": len(parts),
        "parts": parts,
    }
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "felpro.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    distinct = len({r["p"] for r in parts})
    print(f"wrote {out_path}: {len(parts)} records, {distinct} distinct PNs")
    for h, s in stats.items():
        print(f"  {h}: {s['pns']} PNs -> {s['records']} records")
    for pn, why in skipped:
        print(f"  skipped {pn}: {why}")
    by_cat = {}
    for r in parts:
        by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
    print("  by cat:", by_cat)


if __name__ == "__main__":
    main()
