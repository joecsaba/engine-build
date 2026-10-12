# -*- coding: utf-8 -*-
# Parse NHRA Stock Car Classification Guides (.xls, one per make per year) into
# rows of (year, make, model, body, cid, hp, engine_family).
#
# Layout (stable 1955-1990s): sections, each opened by an engine-column header
# row (displacements in cols >= 6), then an HP row ("140hp" or 140.0), then
# model heading rows (name in col 0, wheelbase col 3, class letter col 4, no
# factors) and body-style rows (name in col 0, power-to-weight factors in the
# engine columns). A factor in a column = that body was offered with that
# engine. "S/SS Factor" / "Engine Family" rows close the section; the first
# "Engine Family" row after the section gives each column's NHRA family code.
# The top section of each file (GT factors, no model rows) is skipped.
import xlrd, sys, os, re, json, glob
sys.stdout.reconfigure(encoding="utf-8")
SRC, OUT = sys.argv[1], sys.argv[2]

MAKES = {"CHEV": "Chevrolet", "FORD": "Ford", "DOD": "Dodge", "PONT": "Pontiac", "CHRY": "Chrysler",
         "OLDS": "Oldsmobile", "PLY": "Plymouth", "BUI": "Buick", "CAD": "Cadillac", "AMER": "AMC",
         "MERC": "Mercury", "LINC": "Lincoln", "STUD": "Studebaker"}

def num(v):
    if isinstance(v, float): return v
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*", str(v))
    return float(m.group(1)) if m else None

def hpval(v):
    if isinstance(v, float): return v
    m = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*hp\s*", str(v), re.I)
    return float(m.group(1)) if m else None

def parse(path):
    s = xlrd.open_workbook(path).sheet_by_index(0)
    cell = lambda r, c: s.cell_value(r, c) if c < s.ncols else ""
    txt = lambda r, c: str(cell(r, c)).strip()
    rows = []
    r = 0
    while r < s.nrows:
        # header: col0 empty, >=2 plausible displacements from col 6, and a
        # Manual/Auto or hp row within the next 6 rows
        cids = {c: num(cell(r, c)) for c in range(6, s.ncols)}
        cids = {c: v for c, v in cids.items() if v and 40 <= v <= 600}
        if txt(r, 0) or len(cids) < 1:
            r += 1; continue
        look = range(r + 1, min(r + 7, s.nrows))
        if not any(re.search(r"manual|mauual|auto", txt(k, c), re.I) for k in look for c in cids):
            r += 1; continue
        # HP row: first row after header where the engine cols hold hp values
        # Prefer a row of "140hp" text; fall back to bare numbers >= 50 (a row of
        # "1.0" footnote markers is not horsepower). Stop at the first model row.
        hp, hprow = {}, None
        for want_text in (True, False):
            for k in range(r + 1, min(r + 11, s.nrows)):
                if txt(k, 0): break
                vals = {c: hpval(cell(k, c)) for c in cids}
                if want_text and not any(re.search(r"hp", txt(k, c), re.I) for c in cids): continue
                vals = {c: v for c, v in vals.items() if v and v >= 50}
                if len(vals) >= max(1, len(cids) // 2):
                    hp, hprow = vals, k; break
            if hprow: break
        start = (hprow or r) + 1
        # walk model/body rows until the section closes
        model, model_wb, k = None, None, start
        body_rows = []
        while k < s.nrows:
            name = txt(k, 0)
            if re.match(r"S/SS|Engine Fa|GT Factor", name, re.I): break
            if not name:
                # next header?
                if any(num(cell(k, c)) and 40 <= (num(cell(k, c)) or 0) <= 600 for c in cids) and \
                   any(re.search(r"manual|auto", txt(j, c), re.I) for j in range(k + 1, min(k + 7, s.nrows)) for c in cids):
                    break
                k += 1; continue
            facs = {c: num(cell(k, c)) for c in cids}
            offered = [c for c, v in facs.items() if v and v < 60]   # factors are lb/hp, ~10-35
            if not offered and not any(facs.values()):
                model, model_wb = name, num(cell(k, 3))
            elif offered and model:
                body_rows.append((model, name, num(cell(k, 3)) or model_wb, offered))
            k += 1
        # engine family codes: first "Engine Fa" row at/after k
        fam = {}
        for j in range(k, min(k + 20, s.nrows)):
            if txt(j, 0).lower().startswith("engine fa"):
                fam = {c: txt(j, c) for c in cids}; break
        for model, body, wb, offered in body_rows:
            for c in offered:
                rows.append({"model": model, "body": body, "wb": wb, "cid": round(cids[c]),
                             "hp": hp.get(c), "fam": fam.get(c) or None})
        r = max(k, r + 1)
    return rows

out = []
for p in sorted(glob.glob(os.path.join(SRC, "*.XLS")) + glob.glob(os.path.join(SRC, "*.xls"))):
    m = re.match(r"(\d{4})([A-Z]+)", os.path.basename(p).upper())
    if not m: continue
    year, mk = int(m.group(1)), m.group(2)
    try:
        rows = parse(p)
    except Exception as e:
        print("FAIL", os.path.basename(p), e); continue
    for x in rows:
        x.update(year=year, make=MAKES.get(mk, mk), file=os.path.basename(p))
    out += rows
json.dump(out, open(OUT, "w", encoding="utf-8"))
print("rows", len(out))
