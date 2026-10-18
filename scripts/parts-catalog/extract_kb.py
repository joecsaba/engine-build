#!/usr/bin/env python3
"""Extract KB Performance Pistons (KB Hypereutectic + Claimer series) from the 2015 KB catalog PDF.

Source: Catalogs/product-catalog.pdf at the repo root (KB Performance Pistons Catalog, 2015, 48 pp).
The PDF is scanned images with no text layer, so pages are rendered with PyMuPDF (200 dpi) and read
with rapidocr_onnxruntime. Raw OCR results are cached once per page under dl/kb/ocr/page_NN.json
(gitignored); --no-ocr parses from that cache only. No network is used.

Layout (identical on every application page): a spec box per engine/rod/head-type combination:

    CHEVROLET 350 · 5.7 ROD · FLAT TOP                                   <- title (big font)
    BORE STROKE COMP HT. O.E. DECK HT. LOCKRING ALLOY                     <- header labels
    4.000 3.480 1.565 9.025 93 HYPEREUTECTIC 390                          <- header values
    OVERSIZES: ... / PIN SIZE / PIN #: ... / RINGSET PART#: ...   NOTES: ...
    PISTON# | PISTON & RINGS | RING PACK | DISH/DOME | COMP RATIO 58cc 62cc 64cc 76cc |
        GRAM WEIGHT | TOP LAND | (INT.) VALVE DEPTH(/DIA.) | (EX.) RELIEF (DEPTH/)DIA.
    9902HC | 9902HC KTM | 2-5/64, 1-3/16 | Flat Top 5cc 2V | 11.2 10.7 10.4 9.1 | 567/107 | .254" | .200" | 2.120"

Output: out/kb.json (shared parts record format, cat=piston, src.ocr=true) and out/kb.md (notes + QA).
Writes nothing outside dl/ and out/. Run with `python -X utf8 -I`.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import statistics
import sys
from collections import Counter, OrderedDict

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "product-catalog.pdf")
DEFAULT_CACHE = os.path.join(BASE, "dl", "kb", "ocr")
OUT = os.path.join(BASE, "out")
BRAND = "KB"
DOC = "KB Performance Pistons Catalog 2015 (scanned PDF, OCR)"
EDITION = "2015"
LOW_CONF = 0.85
UEM_JSON = os.path.join(OUT, "uem.json")

# ----------------------------------------------------------------------------------------------
# OCR (cached)
# ----------------------------------------------------------------------------------------------


def ocr_pages(pdf_path, cache_dir, dpi, log):
    """Render every page and OCR it unless dl/kb/ocr/page_NN.json already exists."""
    import numpy as np
    import pymupdf
    from rapidocr_onnxruntime import RapidOCR

    os.makedirs(cache_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    engine = None
    for i, page in enumerate(doc):
        dest = os.path.join(cache_dir, f"page_{i + 1:02d}.json")
        if os.path.exists(dest):
            continue
        if engine is None:
            engine = RapidOCR()
        pix = page.get_pixmap(dpi=dpi)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3].copy()
        res, _ = engine(img)
        items = [{"box": [[float(x), float(y)] for x, y in b], "text": s, "conf": float(c)} for b, s, c in (res or [])]
        with open(dest, "w", encoding="utf-8") as f:
            json.dump({"page": i + 1, "dpi": dpi, "w": pix.w, "h": pix.h, "items": items}, f, ensure_ascii=False)
        log.append(f"OCR page {i + 1}: {len(items)} text boxes")
    return len(doc)


def refine_low_conf(pdf_path, cache_dir, log, min_conf=LOW_CONF, dpi=300):
    """Re-OCR every cached text box below min_conf as its own crop (page-level detection garbles small table
    cells that read cleanly in isolation). Results go to refine_NN.json; a box is replaced only when the crop
    reads with clearly higher confidence."""
    import numpy as np
    import pymupdf
    from rapidocr_onnxruntime import RapidOCR

    doc = pymupdf.open(pdf_path)
    engine = None
    n_done = n_better = 0
    for fn in sorted(os.listdir(cache_dir)):
        m = re.match(r"page_(\d+)\.json$", fn)
        if not m:
            continue
        pno = int(m.group(1))
        dest = os.path.join(cache_dir, f"refine_{pno:02d}.json")
        if os.path.exists(dest):
            continue
        with open(os.path.join(cache_dir, fn), encoding="utf-8") as f:
            d = json.load(f)
        scale = 72.0 / d["dpi"]
        out = {}
        for idx, it in enumerate(d["items"]):
            if it["conf"] >= min_conf or not re.search(r"[\dIl|]", it["text"]):
                continue
            if engine is None:
                engine = RapidOCR()
            xs = [p[0] for p in it["box"]]
            ys = [p[1] for p in it["box"]]
            clip = pymupdf.Rect((min(xs) - 12) * scale, (min(ys) - 10) * scale, (max(xs) + 12) * scale, (max(ys) + 10) * scale)
            pix = doc[pno - 1].get_pixmap(dpi=dpi, clip=clip)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3].copy()
            res, _ = engine(img)
            n_done += 1
            if not res:
                continue
            res = sorted(res, key=lambda r: min(p[0] for p in r[0]))
            text = " ".join(r[1].strip() for r in res)
            conf = sum(r[2] for r in res) / len(res)
            out[str(idx)] = {"text": text, "conf": float(conf), "from": it["text"], "fromConf": it["conf"],
                             "better": bool(conf >= it["conf"] + 0.05)}
            n_better += out[str(idx)]["better"]
        with open(dest, "w", encoding="utf-8") as f:
            json.dump({"page": pno, "dpi": dpi, "items": out}, f, ensure_ascii=False)
    log.append(f"re-OCR of low-confidence boxes (< {min_conf}) as {dpi}-dpi crops: {n_done} boxes, {n_better} replaced")


def load_pages(cache_dir):
    pages = []
    for fn in sorted(os.listdir(cache_dir)):
        m = re.match(r"page_(\d+)\.json$", fn)
        if not m:
            continue
        with open(os.path.join(cache_dir, fn), encoding="utf-8") as f:
            d = json.load(f)
        rpath = os.path.join(cache_dir, f"refine_{int(m.group(1)):02d}.json")
        refined = {}
        if os.path.exists(rpath):
            with open(rpath, encoding="utf-8") as f:
                refined = json.load(f)["items"]
        items = []
        for idx, it in enumerate(d["items"]):
            r = refined.get(str(idx))
            if r and r["better"]:
                it = dict(it, text=r["text"], conf=r["conf"], refined={"from": r["from"], "fromConf": r["fromConf"]})
            xs = [p[0] for p in it["box"]]
            ys = [p[1] for p in it["box"]]
            items.append({
                "x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys),
                "cx": (min(xs) + max(xs)) / 2, "cy": (min(ys) + max(ys)) / 2, "h": max(ys) - min(ys),
                "text": it["text"].strip(), "conf": it["conf"], "page": d["page"], "refined": it.get("refined"),
            })
        items.sort(key=lambda it: (it["cy"], it["cx"]))
        pages.append({"page": d["page"], "w": d["w"], "h": d["h"], "items": items})
    return pages


# ----------------------------------------------------------------------------------------------
# text helpers
# ----------------------------------------------------------------------------------------------
CONFUSABLE = {"I": "1", "l": "1", "|": "1", "O": "0", "o": "0", "S": "5", "B": "8"}


def fix_digits(tok, strong=False):
    """Repair OCR confusables inside numeric runs: '990IHC' -> '9901HC', '-I0cc' -> '-10cc', 'O.E.' untouched.
    strong=True also maps S/B (only used on tokens known to be purely numeric)."""
    chars = list(tok)
    n = len(chars)

    def numeric_ctx(c):
        return c.isdigit() or c in ".-/"

    for i, c in enumerate(chars):
        if c not in CONFUSABLE:
            continue
        if c in "SB" and not strong:
            continue
        prev = chars[i - 1] if i > 0 else ""
        nxt = chars[i + 1] if i + 1 < n else ""
        nxt2 = chars[i + 2] if i + 2 < n else ""
        if (prev and numeric_ctx(prev) and prev != "-") or (nxt and nxt.isdigit()) or (nxt == "." and (prev.isdigit() or nxt2.isdigit())) or (
                c in "Il|" and nxt == "-" and nxt2.isdigit()):
            chars[i] = CONFUSABLE[c]
        elif c in "Oo" and tok[i + 1:i + 3] == "cc":
            chars[i] = "0"
    return "".join(chars)


def norm_space(s):
    return re.sub(r"\s+", " ", s).strip()


def to_float(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


MM = 25.4
NUM3 = r"\d{1,2}\.\d{3,4}"  # 4.000, 4.0626, 10.814


# ----------------------------------------------------------------------------------------------
# family mapping
# ----------------------------------------------------------------------------------------------
MAKES = ("CHEVROLET", "CHEVY", "GM", "CADILLAC", "PONTIAC", "OLDSMOBILE", "OLDS", "BUICK", "AMC", "JEEP", "AMC/JEEP", "FORD",
         "MERCURY", "LINCOLN", "CHRYSLER", "DODGE", "PLYMOUTH", "MOPAR", "CHRYSLER/DODGE", "SUZUKI", "TOYOTA", "HONDA", "NISSAN",
         "DATSUN", "MAZDA", "MITSUBISHI", "VW", "VOLKSWAGEN", "ISUZU", "INTERNATIONAL", "STUDEBAKER", "HARLEY", "HARLEY-DAVIDSON",
         "HOLDEN")


def families_for(title, bore=None, deck=None, rod=None, head=None):
    """[(family, cylinders, known)] from a spec-box title such as 'CHEVROLET 350' or 'FORD 408W'.
    bore/deck (inches) settle titles that exist in two families (Chevy 427 = SBC stroker or Mark IV)."""
    t = title.upper() + (" " + head.upper() if head else "")
    big = (deck is not None and deck >= 9.6) or (bore is not None and bore >= 4.24)
    make = t.split()[0] if t.split() else ""
    m = re.search(r"\b(\d{3,4})(?:\s*(?:W|C|M|CI|CID|FE))?\b", t)
    ci = int(m.group(1)) if m else None
    lit = re.search(r"\b(\d\.\d)\s*L?\b", t)
    liters = float(lit.group(1)) if lit else None

    if make in ("CHEVROLET", "CHEVY", "GM"):
        if "LS" in t.split() or re.search(r"\bLS\d", t) or (liters in (4.8, 5.3, 5.7, 6.0, 6.2, 7.0) and "LS" in t):
            return [("GM LS", 8, True)]
        if ci in (348, 409):
            return [("Chevy W-series 348/409", 8, True)]
        if ci in (396, 402, 454, 468, 489, 496, 502, 540, 572) or (ci in (427, 434, 441, 461) and big):
            return [("Chevy Mark IV big block", 8, True), ("Chevy Gen VI big block", 8, True)]
        if ci in (194, 230, 250, 292):
            return [("Chevy inline-6", 6, True)]
        if ci in (262, 265, 267, 283, 302, 305, 307, 327, 334, 350, 355, 377, 383, 400, 406, 421, 427, 434, 441):
            return [("Small-block Chevy", 8, True)]
        if liters in (4.3,) or ci == 262:
            return [("Chevy 4.3 V6", 6, False)]
        return [(heading_fam(title), None, False)]
    if make == "CADILLAC":
        if ci in (368, 425, 472, 500):
            return [("Cadillac 368-500", 8, True)]
        return [(heading_fam(title), None, False)]
    if make == "PONTIAC":
        if ci in (151,):
            return [("Pontiac 151 Iron Duke", 4, False)]
        if ci in (265, 287, 301, 326, 350, 389, 400, 421, 428, 455, 461):
            return [("Pontiac V8", 8, True)]
        return [(heading_fam(title), None, False)]
    if make in ("OLDSMOBILE", "OLDS"):
        if ci in (260, 307, 330, 350, 400, 403, 425, 455):
            return [("Oldsmobile V8", 8, True)]
        return [(heading_fam(title), None, False)]
    if make == "BUICK":
        if ci in (400, 430, 455):
            return [("Buick big block", 8, True)]
        if ci in (350,):
            return [("Buick 350", 8, True)]
        if ci in (181, 196, 225, 231, 252) or liters in (3.8, 4.1):
            return [("Buick V6 181-252", 6, True)]
        return [(heading_fam(title), None, False)]
    if make in ("AMC", "JEEP", "AMC/JEEP"):
        if ci in (199, 232, 258) or liters == 4.0 or "4.0" in t:
            return [("AMC/Jeep inline-6", 6, True)]
        if ci in (290, 304, 343, 360, 390, 401):
            return [("AMC V8", 8, True)]
        return [(heading_fam(title), None, False)]
    if make in ("FORD", "MERCURY", "LINCOLN"):
        if "HEMI" in t:
            return [(heading_fam(title), None, False)]
        if ci in (170, 200, 240, 300) and "W" not in t:
            return [("Ford 240/300 inline-6", 6, True)]
        if ci in (352, 360, 390, 406, 410, 427, 428) and "W" not in t and "C" not in (m.group(0) if m else "") and not (
                ci == 427 and deck is not None and deck < 10):
            return [("Ford FE", 8, True)]
        if ci in (429, 460, 466, 501, 514, 521, 532, 545, 557):
            return [("Ford 429/460", 8, True)]
        if re.search(r"\b(351|400)\s*(C|M)\b", t) or re.search(r"\b351M\b|\b351C\b|CLEVELAND", t) or ci == 400:
            return [("Ford 351C/351M/400", 8, True)]
        if ci in (260, 289, 302, 331, 347, 351, 357, 363, 372, 377, 393, 408, 416, 427) and not re.search(r"\b(351|400)\s*[CM]\b", t):
            # 351WC = Windsor block (Cleveland-head variant); the block decides the piston family
            return [("Small-block Ford (Windsor)", 8, True)]
        if liters in (4.6, 5.4) or "MODULAR" in t:
            return [("Ford Modular", 8, True)]
        if liters == 5.0 and "COYOTE" in t:
            return [("Ford Coyote", 8, True)]
        return [(heading_fam(title), None, False)]
    if make in ("CHRYSLER", "DODGE", "PLYMOUTH", "MOPAR", "CHRYSLER/DODGE"):
        if ci == 426 and ("HEMI" in t or (rod is not None and abs(rod - 6.86) < 0.01)):
            return [("Chrysler 426 Hemi", 8, True)]
        if ci == 392 and "HEMI" in t:
            return [("Chrysler 392 early Hemi", 8, False)]
        if "HEMI" in t and liters in (5.7, 6.1):
            return [("Chrysler Gen III Hemi 5.7/6.1", 8, True)]
        if "HEMI" in t and liters in (6.2, 6.4):
            return [("Chrysler Gen III Hemi 6.2/6.4", 8, True)]
        if "MAGNUM" in t or liters in (5.2, 5.9):
            return [("Mopar Magnum 5.2/5.9", 8, True)]
        if ci in (170, 198, 225):
            return [("Mopar Slant Six", 6, True)]
        if ci in (361, 383, 400, 413, 426, 440, 446, 450, 451, 470, 493, 500, 505, 512):
            return [("Mopar B/RB big block", 8, True)]
        if ci in (273, 318, 340, 360, 372, 390, 408, 416):
            return [("Mopar LA small block", 8, True)]
        return [(heading_fam(title), None, False)]
    return [(heading_fam(title), None, False)]


def heading_fam(title):
    """'CHRYSLER 2.2L' -> 'Chrysler 2.2L' (catalog heading kept as the family when the brief has none)."""
    return " ".join(w if re.search(r"\d", w) else w.capitalize() for w in title.split())


# ----------------------------------------------------------------------------------------------
# page -> spec boxes
# ----------------------------------------------------------------------------------------------
TITLE_RE = re.compile(r"\bROD\b", re.I)
HEADER_LABELS = ("BORE", "STROKE", "COMP HT", "COMPHT", "DECK", "LOCKRING", "ALLOY")
TABLE_LABELS = ("PISTON#", "PISTON &", "PISTON&", "RING PACK", "RINGPACK", "DISH/DOME", "COMP RATIO", "COMPRATIO",
                "GRAM", "WEIGHT", "TOP", "LAND", "VALVE", "RELIEF", "DEPTH", "DIA.", "INT.", "EX.")
PN_RE = re.compile(r"^[*+]{0,3}\s*(KB\s?\d{3,5}(?:(?!KT)[A-Z])?|\d{4}\s?HC)")
KIT_RE = re.compile(r"(KB\s?\d{3,5}(?:(?!KT)[A-Z])?|\d{4}\s?HC)\s*(?:/\s*)?KT[DMS]")


def fix_pn(s):
    """Repair confusables inside a KB part number cell: 'KBIII' -> 'KB111', 'KBI79' -> 'KB179', '990IHC' -> '9901HC'."""
    tr = str.maketrans({"I": "1", "l": "1", "|": "1", "O": "0", "o": "0"})
    s = re.sub(r"(?<=KB)\s?([Il|Oo0-9]{3,5})", lambda m: m.group(1).translate(tr), s)
    s = re.sub(r"([Il|Oo0-9]{4})(?=\s?HC)", lambda m: m.group(1).translate(tr), s)
    return s.replace("K B", "KB")
PN_PATTERN = re.compile(r"^(KB\d{3,4}[A-Z]?|\d{4}HC)$")
WEIGHT_RE = re.compile(r"(\d{3})\s*/\s*(\d{2,3})")
CR_TOKEN_RE = re.compile(r"\d{1,2}\.\d")
CHAMBER_RE = re.compile(r"(?<![.\d])(\d+(?:\.\d+)?)\s*cc")


def group_lines(items, tol=14):
    """Cluster items into text lines by vertical centre."""
    lines = []
    for it in sorted(items, key=lambda i: (i["cy"], i["cx"])):
        if lines and abs(lines[-1]["cy"] - it["cy"]) <= tol:
            lines[-1]["items"].append(it)
            lines[-1]["cy"] = statistics.mean(i["cy"] for i in lines[-1]["items"])
        else:
            lines.append({"cy": it["cy"], "items": [it]})
    for ln in lines:
        ln["items"].sort(key=lambda i: i["cx"])
        ln["text"] = " ".join(i["text"] for i in ln["items"])
        ln["y0"] = min(i["y0"] for i in ln["items"])
        ln["y1"] = max(i["y1"] for i in ln["items"])
    return lines


ROD_RE = re.compile(r"\d\.\d{1,3}\s*ROD\b", re.I)


def is_title(it, page_w):
    return bool(ROD_RE.search(it["text"])) and it["h"] >= 36 and it["x0"] < page_w * 0.3


def merge_title(t, items):
    """Join big-font items printed on the same line left of a title fragment that lacks the make."""
    if re.match(r"^[A-Z]", t["text"]):
        return t
    left = [it for it in items if it is not t and abs(it["cy"] - t["cy"]) < 20 and it["x1"] <= t["x0"] + 10 and it["h"] >= 30]
    if not left:
        return t
    left.sort(key=lambda it: it["cx"])
    merged = dict(t)
    merged["text"] = norm_space(" ".join(it["text"] for it in left) + " " + t["text"])
    merged["x0"] = min(it["x0"] for it in left)
    merged["conf"] = min([t["conf"]] + [it["conf"] for it in left])
    merged["_parts"] = left
    return merged


def page_boxes(page, qa):
    """Split a page into spec boxes: each title item and the items below it up to the next title."""
    items = page["items"]
    titles = [merge_title(it, items) for it in items if is_title(it, page["w"])]
    titles.sort(key=lambda it: it["cy"])
    boxes = []
    for i, t in enumerate(titles):
        y_end = titles[i + 1]["y0"] if i + 1 < len(titles) else page["h"]
        skip = set(id(x) for x in t.get("_parts", []))
        body = [it for it in items if t["y1"] - 5 < it["cy"] < y_end and it["text"] != t["text"] and id(it) not in skip]
        boxes.append({"title": t, "items": body, "page": page["page"], "y_end": y_end})
    return boxes


def parse_title(text):
    """'CHEVROLET 350 · 5.7 ROD· FLATTOP' -> (engine, rod_length, head)"""
    t = norm_space(text.replace("•", "·").replace("-", "-"))
    parts = [p.strip(" .-") for p in re.split(r"\s*[·•]\s*", t)]
    if len(parts) < 2:
        mm = re.match(r"^(.*?)\s+(\d\.\d{1,3})\s*ROD\s*(.*)$", t, re.I)
        parts = [mm.group(1), mm.group(2) + " ROD", mm.group(3)] if mm else [t]
    engine = parts[0]
    rod = None
    head = None
    for p in parts[1:]:
        m = re.search(r"(\d\.\d{1,3})\s*ROD", p, re.I)
        if m:
            rod = float(m.group(1))
        else:
            head = (head + " " if head else "") + p
    engine = re.sub(r"(?<=[A-Z])(?=\d)", " ", engine)  # 'CHEVROLET350' -> 'CHEVROLET 350'
    if head:
        head = re.sub(r"FLATTOP", "FLAT TOP", head, flags=re.I)
        head = re.sub(r"STEPDISH", "STEP DISH", head, flags=re.I)
        head = re.sub(r"SOLIDDOME", "SOLID DOME", head, flags=re.I)
        head = re.sub(r"D-?CUP", "D-CUP", head, flags=re.I)
    return engine.strip(), rod, head


def parse_header_values(text):
    """'4.000 3.480 1.565 9.025 93 HYPEREUTECTIC 390' or '75mm / 2.953 3.546 1.140 8.416 SRW-011 HYPEREUTECTIC 390'
    -> dict(bore, boreMm, stroke, ch, deckHeight, lockRings, alloy)."""
    out = {}
    s = norm_space(text)
    s = re.sub(r"HYPEREUTECTIC\s*390", "HYPEREUTECTIC 390", s, flags=re.I)
    am = re.search(r"(HYPEREUTECTIC 390|HYPEREUTECTIC)", s, re.I)
    if am:
        out["alloy"] = "Cast 390 Hypereutectic"
        s = s[:am.start()].strip()
    mm = re.match(r"^(\d{2,3})\s*mm\s*/\s*(\d\.\d{3,4})\s*(.*)$", s)
    if mm:
        out["boreMm"] = float(mm.group(1))
        out["bore"] = float(mm.group(2))
        s = mm.group(3)
    else:
        mm = re.match(rf"^({NUM3})\s*(.*)$", fix_digits(s))
        if mm:
            out["bore"] = float(mm.group(1))
            s = mm.group(2)
    toks = fix_digits(s).split()
    nums = []
    rest = []
    for tk in toks:
        if re.fullmatch(NUM3, tk) and len(nums) < 3:
            nums.append(float(tk))
        elif tk.upper() in ("SEE", "NOTES") and len(nums) == 2:
            nums.append(None)
        else:
            rest.append(tk)
    if len(nums) >= 1:
        out["stroke"] = nums[0]
    if len(nums) >= 2:
        out["ch"] = nums[1]
    if len(nums) >= 3 and nums[2] is not None:
        out["deckHeight"] = nums[2]
    lock = " ".join(rest).strip()
    lock = re.sub(r"^(SEE NOTES|NOTES)\s*", "", lock, flags=re.I).strip()
    if lock:
        out["lockRings"] = lock.replace(" ", "")
    return out


def parse_oversizes(text):
    """'STD, .020, .030, .040, .060, *.080' -> ([0, .02, .03, .04, .06, .08], ['.080'])  (second = starred)."""
    s = fix_digits(text.replace(",", " ").replace(";", " "))
    vals, starred = [], []
    for tk in s.split():
        star = tk.startswith("*")
        tk = tk.lstrip("*")
        if tk.upper().startswith("STD"):
            vals.append(0.0)
        elif re.fullmatch(r"\.?\d+(\.\d+)?\s*mm", tk):
            v = round(float(re.sub(r"mm", "", tk)) / MM, 4)
            vals.append(v)
            if star:
                starred.append(v)
        elif re.fullmatch(r"\.\d{2,3}", tk):
            vals.append(float(tk))
            if star:
                starred.append(float(tk))
    return vals, starred


def parse_pin(text):
    """'.9272 / 0927X216K' or '.748" / 19mm .749X216A' -> (pin_in, pin_pn, pin_mm)"""
    s = norm_space(text)
    pin_mm = None
    m = re.search(r"(\d{2})\s*mm", s)
    if m:
        pin_mm = float(m.group(1))
    pin = None
    m = re.search(r"(0?\.\d{3,4})", fix_digits(s))
    if m:
        pin = float(m.group(1))
    pns = []
    for m in re.finditer(r"(?:\((KB\s?\d{3,5}[A-Z]?)\)\s*)?([0-9OIl]\.[0-9OIl]{3}|\.?[0-9OIl]{3,4})\s*[xX]\s*([0-9OIl]{3})([A-Z]{0,2})", s):
        pn = fix_digits(m.group(2)) + "X" + fix_digits(m.group(3)) + m.group(4)
        if re.match(r"^\.\d{3}X", pn):
            pn = "0" + pn[1:]
        elif re.match(r"^\d{3}X", pn):
            pn = "0" + pn
        pns.append((m.group(1).replace(" ", "") if m.group(1) else None, pn))
    pn = next((p for who, p in pns if who is None), pns[0][1] if pns else None)
    per_pn = {who: p for who, p in pns if who}
    return pin, pn, pin_mm, per_pn


def parse_ringset(text):
    """'4000AM8.' / '4000BD8 or 4000BM8' / '(1/16) 4250BD8 (5/64) 4250AM8' -> list of PNs"""
    s = fix_digits(text)
    return re.findall(r"(\d{4}[A-M][MDS]\d)", s)


CROWN_WORDS = [
    (re.compile(r"QH\s*W/?\s*DISH|QUENCH HEAD W/ DISH", re.I), "quench head w/ dish"),
    (re.compile(r"\bD-?CUP\b", re.I), "d-cup"),
    (re.compile(r"\bQH\b", re.I), "quench head"),
    (re.compile(r"\bS\s*DISH\b|STEP\s*DISH|\bSD(?=ISH)", re.I), "step-dish"),
    (re.compile(r"\bCC\s*SD\b", re.I), "closed-chamber solid dome"),
    (re.compile(r"\bOC\s*HD\b", re.I), "open-chamber hollow dome"),
    (re.compile(r"\bCC\s*HD\b", re.I), "closed-chamber hollow dome"),
    (re.compile(r"\bOC\s*SD\b", re.I), "open-chamber solid dome"),
    (re.compile(r"\bSD\b", re.I), "solid dome"),
    (re.compile(r"\bHD\b", re.I), "hollow dome"),
    (re.compile(r"FLAT\s*TOP|\bFT\b", re.I), "flat top"),
    (re.compile(r"\bDISH\b", re.I), "dish"),
    (re.compile(r"\bDOME\b", re.I), "dome"),
]


def parse_dishdome(text):
    """'Flat Top 7cc 4V' / '.150"SD-4cc 2V' / 'SDish 26cc 2V' / 'FT 0cc No Valve'
    -> dict(crown, domeCc (dome +, dish/relief -), domeHeight, valveReliefs, raw)"""
    s = norm_space(text)
    s = fix_digits(s)
    out = {"raw": s}
    m = re.search(r"(-?)\s*(?<![.\d])(\d+(?:\.\d+)?)\s*cc", s)
    if m:
        printed = float(m.group(2)) * (-1 if m.group(1) else 1)
        out["domeCc"] = (-printed) + 0.0 if printed else 0.0  # catalog prints domes negative, dishes/reliefs positive
    m = re.search(r"(?:^|\s)(\.\d{3})\s*\"?", s)
    if m:
        out["domeHeight"] = float(m.group(1))
    m = re.search(r"(\d)\s*V\b", s) or re.search(r"cc\s*([Il|])\s*V\b", s)
    if m:
        out["valveReliefs"] = int(m.group(1)) if m.group(1).isdigit() else 1
    elif re.search(r"NO\s*VALVE", s, re.I):
        out["valveReliefs"] = 0
    for rx, word in CROWN_WORDS:
        if rx.search(s):
            out["crown"] = word
            break
    return out


def parse_depth_dia(text):
    """'.266-2.310"' / '.225" / 1.536"' / '.200"' / 'NA' / '0' / '.142-NA' -> (depth, dia)"""
    s = fix_digits(norm_space(text).replace("”", '"').replace("″", '"'))
    if re.fullmatch(r"(NA|N/A|0|-)?", s.upper()):
        return (0.0, 0.0) if s == "0" else (None, None)
    nums = re.findall(r"\d*\.\d{3}", s)
    depth = to_float(nums[0]) if nums else None
    dia = to_float(nums[1]) if len(nums) > 1 else None
    return depth, dia


def split_cr_tokens(items):
    """CR items -> [(value, x_centre, conf)], estimating x for values merged in one OCR box."""
    out = []
    for it in items:
        s = fix_digits(it["text"], strong=True)
        s = re.sub(r"^.*\dcc\s*(?:[\dIl|]\s*V|No\s*Valve)?", lambda m: " " * len(m.group(0)), s, count=1)
        s = re.sub(r"\d{3}\s*/\s*\d{2,3}.*$", lambda m: " " * len(m.group(0)), s)
        vals = list(CR_TOKEN_RE.finditer(s))
        if not vals:
            continue
        w = it["x1"] - it["x0"]
        for m in vals:
            frac = (m.start() + m.end()) / 2 / max(len(s), 1)
            out.append((float(m.group(0)), it["x0"] + frac * w, it["conf"]))
    return out


def chamber_positions(items):
    """Chamber header items ('58cc 62cc 64cc 76cc' or '30cc Head') -> [(cc_label, x_centre)]"""
    out = []
    tr = str.maketrans({"I": "1", "l": "1", "|": "1", "O": "0"})
    for it in items:
        s = re.sub(r"(?<=[\dIl|])\s+(?=[\dIl|]{0,2}cc)", "", fix_digits(it["text"]))
        s = re.sub(r"(?<![A-Za-z])([Il|O\d]{2,3})(?=cc)", lambda m: m.group(1).translate(tr), s)
        w = it["x1"] - it["x0"]
        for m in CHAMBER_RE.finditer(s):
            frac = (m.start() + m.end()) / 2 / max(len(s), 1)
            label = m.group(1)
            label = label[:-2] if label.endswith(".0") else label
            out.append((label, it["x0"] + frac * w))
    return out


def col_center(labels, *names):
    for n in names:
        for lab in labels:
            if n in lab["text"].upper().replace(" ", ""):
                return lab["cx"]
    return None


def parse_box(box, qa, series_hint):
    """One spec box -> dict with header facts and a list of piston rows."""
    pno = box["page"]
    title_text = box["title"]["text"]
    engine, rod, head = parse_title(title_text)
    rec = {"page": pno, "title": norm_space(title_text), "engine": engine, "rodLength": rod, "head": head,
           "titleConf": box["title"]["conf"], "rows": [], "confs": [box["title"]["conf"]], "lowConf": []}
    items = box["items"]
    if not items:
        qa.append(f"p{pno} '{title_text}': empty box (no OCR items below the title)")
        return rec

    def low(field, it):
        rec["confs"].append(it["conf"])
        if it["conf"] < LOW_CONF:
            rec["lowConf"].append((field, it["text"], it["conf"]))

    # --- table header: PISTON# line
    tbl = [it for it in items if any(it["text"].upper().replace(" ", "").startswith(l.replace(" ", "")) for l in TABLE_LABELS)
           and it["cx"] > 100]
    pist = [it for it in tbl if it["text"].upper().replace(" ", "").startswith("PISTON#")]
    if not pist:
        qa.append(f"p{pno} '{title_text}': table header (PISTON#) not found; box skipped")
        return rec
    th_y0 = min(it["y0"] for it in tbl if abs(it["cy"] - pist[0]["cy"]) < 40)
    th_y1 = max(it["y1"] for it in tbl if abs(it["cy"] - pist[0]["cy"]) < 40)
    labels = [it for it in items if th_y0 - 5 <= it["cy"] <= th_y1 + 5]
    chamber_items = [it for it in labels if re.search(r"[\dIl|]cc", it["text"]) and not it["text"].upper().startswith("COMP")]
    if not chamber_items:
        # chamber line may sit slightly below the label band
        chamber_items = [it for it in items if th_y1 - 5 < it["cy"] < th_y1 + 30
                         and re.fullmatch(r"(?:\s*[\dIl|.]{2,5}\s*cc\s*(?:Head)?)+", it["text"])]
        labels += chamber_items
        if chamber_items:
            th_y1 = max(th_y1, max(it["y1"] for it in chamber_items))
    chambers = sorted(chamber_positions(chamber_items), key=lambda c: c[1])
    for i in range(1, len(chambers)):
        prev = max(float(c[0]) for c in chambers[:i] if re.match(r"^[\d.]+$", c[0]))
        if re.match(r"^[\d.]+$", chambers[i][0]) and float(chambers[i][0]) <= prev:
            qa.append(f"p{pno} '{title_text}': chamber header `{chambers[i][0]}cc` is not larger than the column to its left "
                      f"(OCR dropped a digit); its CR values are keyed `col{i + 1}`")
            chambers[i] = (f"col{i + 1}", chambers[i][1])
    for it in chamber_items:
        low("chambers", it)
    if not chambers:
        qa.append(f"p{pno} '{title_text}': no chamber-cc header found above COMP RATIO")
    x_ring = col_center(labels, "RINGPACK")
    x_dish = col_center(labels, "DISH/DOME", "DISH")
    x_weight = col_center(labels, "WEIGHT", "GRAM")
    x_land = col_center(labels, "LAND")
    x_int = col_center(labels, "INT.VALVE", "VALVE")
    x_ex = col_center(labels, "EX.RELIEF", "RELIEF")
    cr_x0 = min(x for _, x in chambers) - 40 if chambers else (x_dish + 120 if x_dish else None)
    cr_x1 = max(x for _, x in chambers) + 40 if chambers else (x_weight - 40 if x_weight else None)
    if chambers and x_weight:
        cr_x1 = min(cr_x1, x_weight - 45)
    if chambers and x_dish:
        cr_x0 = max(cr_x0, x_dish + 90)

    # --- header values (between header labels and OVERSIZES)
    pre = [it for it in items if it["cy"] < th_y0 - 5]
    hdr = [it for it in pre if len(it["text"]) <= 24 and it["cy"] < box["title"]["y1"] + 140
           and any(k in it["text"].upper().replace(" ", "") for k in ("BORE", "STROKE", "COMPHT", "DECKHT", "LOCKRING", "ALLOY"))]
    if hdr:
        h_y1 = max(it["y1"] for it in hdr)
        vals = [it for it in pre if h_y1 - 8 < it["cy"] < h_y1 + 60 and it["x0"] > min(h["x0"] for h in hdr) - 40 and it not in hdr]
        vals.sort(key=lambda it: it["cx"])
        hv = parse_header_values(" ".join(it["text"] for it in vals))
        rec.update(hv)
        for it in vals:
            low("header", it)
        if "bore" not in hv or "stroke" not in hv or "ch" not in hv:
            qa.append(f"p{pno} '{title_text}': header values incomplete {hv} from `{' '.join(it['text'] for it in vals)}`")
    else:
        qa.append(f"p{pno} '{title_text}': BORE/STROKE header labels not found")
        h_y1 = box["title"]["y1"]

    # --- OVERSIZES / PIN / RINGSET (left column) and NOTES (right column)
    left, notes = [], []
    label_x = [it["x0"] for it in pre if re.match(r"^(OVERSIZES|PIN\s*SIZE|RING\s*SET)", it["text"], re.I)]
    left_x0 = min(label_x) if label_x else 520
    notes_x = left_x0 + 450
    for it in sorted(pre, key=lambda i: (i["cy"], i["cx"])):
        if it["cy"] <= h_y1 + 60 or it["x1"] < left_x0 - 40:
            continue  # header rows or piston photo captions
        txt = it["text"]
        if "NOTES" in txt.upper() and it["x0"] < notes_x:
            a, b = re.split(r"NOTES\s*:?", txt, maxsplit=1, flags=re.I)
            if a.strip():
                left.append((it, a.strip()))
            notes.append((it, b.strip()))
        elif it["x0"] >= notes_x:
            notes.append((it, txt))
        else:
            left.append((it, txt))
    left_lines = group_lines([dict(it, text=t) for it, t in left], tol=14)
    left_txt = " ".join(ln["text"] for ln in left_lines)
    for it, _ in left:
        low("oversizes/pin/ringset", it)
    for it, _ in notes:
        rec["confs"].append(it["conf"])
    m = re.search(r"OVERSIZES?\s*:?\s*(.*?)(?=PIN\s*SIZE|RING\s*SET|$)", left_txt, re.I | re.S)
    if m:
        rec["oversizes"], rec["oversizesStarred"] = parse_oversizes(m.group(1))
    else:
        qa.append(f"p{pno} '{title_text}': OVERSIZES line not found (`{left_txt}`)")
    m = re.search(r"PIN\s*SIZE\s*/?\s*PIN\s*#?\s*:?\s*(.*?)(?=RING\s*SET|OVERSIZES|$)", left_txt, re.I | re.S)
    if m:
        rec["pin"], rec["pinPn"], rec["pinMm"], rec["pinPerPn"] = parse_pin(m.group(1))
        if rec["pin"] is None or rec["pinPn"] is None:
            qa.append(f"p{pno} '{title_text}': pin line not fully parsed: `{m.group(1)}`")
    else:
        qa.append(f"p{pno} '{title_text}': PIN SIZE line not found (`{left_txt}`)")
    m = re.search(r"RING\s*SET\s*PART\s*#?\s*:?\s*(.*?)(?=PIN\s*SIZE|OVERSIZES|$)", left_txt, re.I | re.S)
    if m:
        rec["ringSets"] = parse_ringset(m.group(1))
        if not rec["ringSets"]:
            qa.append(f"p{pno} '{title_text}': ring set PN not parsed from `{m.group(1)}`")
    else:
        qa.append(f"p{pno} '{title_text}': RINGSET line not found (`{left_txt}`)")
    note_text = norm_space(" ".join(t for _, t in notes))
    note_text = re.sub(r"^NOTES\s*:?\s*", "", note_text, flags=re.I)
    note_text = re.sub(r"(\w)-\s+(\w)", r"\1\2", note_text)  # 'sup- plied' -> 'supplied'
    note_text = re.sub(r"(?<=[a-z])\.(?=[A-Z*])", ". ", note_text)
    rec["notes"] = note_text or None

    # --- table rows
    body = [it for it in items if it["cy"] > th_y1 + 4]
    lines = group_lines(body, tol=16)
    rows = []
    for ln in lines:
        first = ln["items"][0]
        cand = [it for it in ln["items"][:2] if it["x0"] < 320]
        pm, pn_item = None, None
        for it in cand:
            pm = PN_RE.match(fix_pn(it["text"]))
            if pm:
                pn_item = it
                break
        if pm:
            rows.append({"line": ln, "pnItem": pn_item, "pn": pm.group(1).replace(" ", ""),
                         "starred": ln["text"].lstrip().startswith("*"), "extra": []})
            continue
        km = KIT_RE.search(fix_pn(" ".join(it["text"] for it in ln["items"] if it["x0"] < 520)))
        if km and first["x0"] < 320:
            # PISTON# cell garbled; recover the number from the PISTON & RINGS (kit) column
            rows.append({"line": ln, "pnItem": first, "pn": km.group(1).replace(" ", ""),
                         "starred": ln["text"].lstrip().startswith("*"), "extra": [], "pnFromKit": True})
            qa.append(f"p{pno} '{title_text}': PISTON# cell read as `{first['text']}`; part number {km.group(1)} taken from the kit column")
            continue
        words = set(re.sub(r"[^A-Z/ ]", "", ln["text"].upper()).split())
        if words and words <= set(MAKES) | {"KB", "HYPEREUTECTIC", "CLAIMER", "SERIES"}:
            continue  # page / section banner (e.g. 'KB HYPEREUTECTIC BUICK') printed below the last box
        if rows and first["x0"] > 300:
            rows[-1]["extra"].append(ln)
        else:
            qa.append(f"p{pno} '{title_text}': unassigned text line below table header: `{ln['text']}`")

    for r in rows:
        ln = r["line"]
        row = {"pn": r["pn"], "starred": r["starred"], "confs": [r["pnItem"]["conf"]], "lowConf": []}
        if r.get("pnFromKit"):
            row["lowConf"].append(("pn", r["pnItem"]["text"] + " (PN taken from kit column)", r["pnItem"]["conf"]))
        elif r["pnItem"]["conf"] < LOW_CONF:
            row["lowConf"].append(("pn", r["pnItem"]["text"], r["pnItem"]["conf"]))
        all_items = list(ln["items"])
        for ex in r["extra"]:
            all_items += ex["items"]
        text = " ".join(it["text"] for it in sorted(all_items, key=lambda i: (i["cy"], i["cx"])))
        row["text"] = text

        def take(x, half):
            if x is None:
                return []
            return [it for it in ln["items"] if it["x0"] < x + half and it["x1"] > x - half]

        def note_low(field, its):
            for it in its:
                row["confs"].append(it["conf"])
                if it["conf"] < LOW_CONF:
                    row["lowConf"].append((field, it["text"], it["conf"]))

        # kit suffix
        km = re.findall(r"KT[DMS](?:\s*/\s*KT[DMS])?", fix_digits(text).upper().replace("K T", "KT"))
        if km:
            row["kit"] = sorted({k.strip() for k in re.split(r"\s*/\s*", km[0])})
        # ring pack: column items (and continuation lines under it)
        rp_items = [it for it in take(x_ring, 70) if it is not r["pnItem"] and re.search(r"\d-\d|mm", it["text"])]
        for ex in r["extra"]:
            rp_items += [it for it in ex["items"] if x_ring and abs(it["cx"] - x_ring) <= 95 and re.search(r"\d|mm", it["text"])]
        if rp_items:
            rp = " ".join(fix_digits(it["text"]) for it in rp_items)
            rp = re.sub(r"^.*?KT[DMS](?:\s*/\s*KT[DMS])?\s*", "", rp)
            rp = re.sub(r"^\*?\s*(KB\s?\d{3,5}[A-Z]?|\d{4}\s?HC)\s*", "", rp)
            rp = re.sub(r"\s*(?:FT\b|Flat Top|SDish|D-Cup|QH(?![A-Z])|Dish|\.\d{3}).*$", "", rp)
            rp = re.sub(r"\s*,\s*", ", ", rp)
            rp = re.sub(r"(mm)(?=\d)", r"\1, ", rp)
            rp = re.sub(r"(?<=\d)(?=\d-\d/)", ", ", rp)  # '2-5/641-3/16' -> '2-5/64, 1-3/16'
            rp = re.sub(r"(?<=/\d{2})(?=\d-)", ", ", rp)
            rp = rp.replace("I/", "1/").replace("|", "1")
            row["ringPack"] = norm_space(rp)
            note_low("ringPack", rp_items)
        # dish/dome
        dd_items = [it for it in ln["items"] if x_dish and it["x0"] < x_dish + 110 and it["x1"] > x_dish - 110
                    and it not in rp_items and it is not r["pnItem"] and not WEIGHT_RE.search(it["text"])]
        dd_txt = None
        if dd_items:
            tail = [it for it in ln["items"] if it not in dd_items and it not in rp_items and it is not r["pnItem"]
                    and it["x0"] >= max(i["x0"] for i in dd_items) and (x_weight is None or it["x1"] < x_weight - 40)]
            dd_txt = " ".join(it["text"] for it in dd_items + tail)
        elif rp_items:
            for cand in rp_items:
                rem = re.sub(r"^(?:(?:[\dIl|]-)?[\dIl|]+(?:/\d{1,2}|(?:\.\d)?mm)[,\s]*)+", "", fix_digits(cand["text"]))
                if re.search(r"\dcc", rem):
                    dd_txt = rem
                    dd_items = [cand]
                    break
        if dd_txt:
            dd_txt = re.sub(r"(\dcc\s*(?:[\dIl|]\s*V|No Valve)?).*$", r"\1", dd_txt)
            dd = parse_dishdome(dd_txt)
            row.update({k: v for k, v in dd.items() if k != "raw"})
            row["dishDomeRaw"] = dd["raw"]
            note_low("dishDome", dd_items)
        # CR
        cr_items = [it for it in ln["items"] if cr_x0 is not None and cr_x1 is not None and it["x1"] > cr_x0 + 20 and it["x0"] < cr_x1
                    and it not in rp_items and it is not r["pnItem"]]
        toks = split_cr_tokens(cr_items)
        note_low("cr", cr_items)
        cr = {}
        if toks and chambers:
            if len(toks) == len(chambers):
                cr = {lab: v for (lab, _), (v, _, _) in zip(chambers, toks)}
            else:
                for v, x, _ in toks:
                    lab = min(chambers, key=lambda c: abs(c[1] - x))[0]
                    if lab in cr:
                        qa.append(f"p{pno} {r['pn']}: two CR values map to chamber {lab}cc (`{text}`)")
                    cr[lab] = v
                qa.append(f"p{pno} {r['pn']}: {len(toks)} CR values for {len(chambers)} chamber columns; mapped by position -> {cr}")
        elif toks:
            cr = {f"col{i + 1}": v for i, (v, _, _) in enumerate(toks)}
        row["cr"] = cr
        cr_note = []
        for ex in r["extra"]:
            ex_items = [it for it in ex["items"] if cr_x0 and it["x1"] > cr_x0 and it["x0"] < (x_land or 1e9)]
            if ex_items:
                cr_note.append(" ".join(it["text"] for it in ex_items))
        if cr_note:
            row["crNote"] = norm_space(" ".join(cr_note))
        # weight
        wm = WEIGHT_RE.search(fix_digits(text, strong=False))
        if wm:
            row["weight"], row["pinWeight"] = int(wm.group(1)), int(wm.group(2))
            note_low("weight", [it for it in ln["items"] if WEIGHT_RE.search(fix_digits(it["text"]))])
        # top land
        tl_items = take(x_land, 45)
        tl_txt = " ".join(fix_digits(it["text"]) for it in tl_items)
        tl_txt = WEIGHT_RE.sub("", tl_txt)
        tm = re.search(r"(?<!\d)\.(\d{3})", tl_txt) or re.fullmatch(r"\s*[.,']?(\d{3})\s*['\"”]?\s*", tl_txt)
        if tm:
            row["topLand"] = float("." + tm.group(1))
            note_low("topLand", tl_items)
        # valve relief depth / dia
        claimer_cols = not any("INT" in l["text"].upper() for l in labels)
        for key, x in (("int", x_int), ("ex", x_ex)):
            its = [it for it in take(x, 70) if it not in tl_items and not WEIGHT_RE.search(it["text"])]
            if its:
                d, dia = parse_depth_dia(" ".join(it["text"] for it in its))
                if claimer_cols:  # VALVE DEPTH | RELIEF DIA. (one relief set, two columns)
                    if key == "int":
                        row["vDepth"] = d
                    else:
                        row["vDia"] = d
                else:
                    row[key + "Depth"], row[key + "Dia"] = d, dia
                note_low(key + "Relief", its)
        rec["rows"].append(row)
    if not rows:
        qa.append(f"p{pno} '{title_text}': no piston rows found under the table header")
    return rec


# ----------------------------------------------------------------------------------------------
# boxes -> records
# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def series_for(pn):
    return "Claimer Hypereutectic" if pn.endswith("HC") else "KB Hypereutectic"


def build_records(boxes, qa):
    records = []
    for b in boxes:
        fams = families_for(b["engine"], b.get("bore"), b.get("deckHeight"), b.get("rodLength"), b.get("head"))
        ci_m = re.search(r"\b(\d{3,4})[A-Z]?\b", b["engine"])
        ci = int(ci_m.group(1)) if ci_m else None
        lit = re.search(r"\b(\d\.\d)\s*L\b", b["engine"].upper())
        liters = float(lit.group(1)) if lit else None
        box_conf = statistics.mean(b["confs"]) if b["confs"] else None
        for row in b["rows"]:
            pn = row["pn"]
            confs = b["confs"] + row["confs"]
            lowc = b["lowConf"] + row["lowConf"]
            bore = b.get("bore")
            over = list(b.get("oversizes") or [])
            starred = b.get("oversizesStarred") or []
            if starred and not row["starred"]:
                over = [o for o in over if o not in starred]
            bore_opts = sorted({round(bore + o, 4) for o in over}) if bore is not None and over else None
            oversizes = sorted(set(over)) if over else None
            dome = row.get("domeCc")
            crown = row.get("crown") or (b["head"].lower() if b.get("head") else None)
            name_bits = [f"{series_for(pn)} cast piston"]
            if bore is not None:
                name_bits.append(f"{bore:.3f} bore")
            if crown:
                name_bits.append(crown + (f" {dome:+.1f}cc" if dome is not None else ""))
            if b.get("stroke") is not None:
                name_bits.append(f"{b['stroke']:.3f} stroke")
            if b.get("rodLength") is not None:
                name_bits.append(f"{b['rodLength']:.3f} rod")
            notes = []
            if b.get("head"):
                notes.append(b["head"].title())
            if b.get("notes"):
                notes.append(b["notes"])
            if row["starred"] and starred:
                notes.append(f"* oversize {', '.join(f'{s:.3f}' for s in starred)} applies to this part number")
            if row.get("crNote"):
                notes.append("CR " + row["crNote"])
            spec = clean({
                "series": series_for(pn),
                "bore": bore,
                "boreMm": b.get("boreMm"),
                "boreOptions": bore_opts,
                "oversizes": oversizes,
                "stroke": b.get("stroke"),
                "rodLength": b.get("rodLength"),
                "ch": b.get("ch"),
                "deckHeight": b.get("deckHeight"),
                "pin": b.get("pin"),
                "pinMm": b.get("pinMm"),
                "pinPn": (b.get("pinPerPn") or {}).get(pn) or b.get("pinPn"),
                "lockRings": b.get("lockRings"),
                "domeCc": dome,
                "domeHeight": row.get("domeHeight"),
                "crown": crown,
                "valveReliefs": row.get("valveReliefs"),
                "dishDome": row.get("dishDomeRaw"),
                "alloy": b.get("alloy"),
                "weight": row.get("weight"),
                "pinWeight": row.get("pinWeight"),
                "topLand": row.get("topLand"),
                "cr": row.get("cr") or None,
                "crNote": row.get("crNote"),
                "ringPack": row.get("ringPack"),
                "ringSetPn": (b.get("ringSets") or [None])[0],
                "ringSetOptions": b.get("ringSets") if b.get("ringSets") and len(b["ringSets"]) > 1 else None,
                "kitPn": [f"{pn} {k}" for k in row["kit"]] if row.get("kit") else None,
                "valveReliefDepth": row.get("vDepth"),
                "valveReliefDia": row.get("vDia"),
                "intValveReliefDepth": row.get("intDepth"),
                "intValveReliefDia": row.get("intDia"),
                "exhValveReliefDepth": row.get("exDepth"),
                "exhValveReliefDia": row.get("exDia"),
            })
            if all(b.get(k) is not None for k in ("deckHeight", "ch", "rodLength", "stroke")):
                stack = b["ch"] + b["rodLength"] + b["stroke"] / 2
                if abs(b["deckHeight"] - stack) > 0.08:
                    qa.append(f"p{b['page']} {pn}: CH {b['ch']} + rod {b['rodLength']} + stroke/2 = {stack:.3f} vs O.E. deck {b['deckHeight']}; "
                              "one of them is mis-read (or the piston sits far out of the hole)")
            bad = {k: v for k, v in (row.get("cr") or {}).items() if v < 6 or v > 18}
            if bad:
                qa.append(f"p{b['page']} {pn}: compression ratio(s) {bad} out of range; dropped, check OCR")
                row["cr"] = {k: v for k, v in row["cr"].items() if k not in bad}
                spec["cr"] = row["cr"] or None
                if not spec["cr"]:
                    del spec["cr"]
            crv = [v for _, v in sorted(((float(k), v) for k, v in (row.get("cr") or {}).items() if re.match(r"^[\d.]+$", k)))]
            if any(crv[i] < crv[i + 1] for i in range(len(crv) - 1)) or any(v < 6 or v > 18 for v in crv):
                qa.append(f"p{b['page']} {pn}: compression ratios {row.get('cr')} do not fall as chamber cc rises (or are out of range); check OCR")
            if row.get("weight") is not None and not 200 <= row["weight"] <= 950:
                qa.append(f"p{b['page']} {pn}: weight {row['weight']} g out of range; check OCR")
            for fam, cyl, known in fams:
                # displacement sanity check (bore x stroke x cyl vs the title's CID)
                cyl_eff = cyl
                if cyl_eff is None and ci and bore and b.get("stroke"):
                    cyl_eff = min((4, 6, 8), key=lambda c: abs(math.pi / 4 * bore ** 2 * b["stroke"] * c - ci))
                if ci and bore and b.get("stroke") and cyl_eff:
                    calc = math.pi / 4 * bore ** 2 * b["stroke"] * cyl_eff
                    if abs(calc - ci) > max(6, 0.03 * ci):
                        qa.append(f"p{b['page']} {pn}: title CID {ci} vs {bore} x {b['stroke']} x {cyl_eff} = {calc:.0f} ci; check bore/stroke OCR")
                records.append({
                    "m": BRAND,
                    "p": pn,
                    "cat": "piston",
                    "name": ", ".join(name_bits),
                    "fit": clean({"fam": fam, "ci": [ci] if ci else None, "liters": liters, "cyl": cyl_eff,
                                  "notes": "; ".join(notes) or None}),
                    "spec": spec,
                    "src": clean({"doc": DOC, "edition": EDITION, "file": "Catalogs/product-catalog.pdf", "page": b["page"],
                                  "section": b["title"], "ocr": True,
                                  "ocrConfidence": round(statistics.mean(confs), 3) if confs else None,
                                  "ocrLowConfidence": [f"{f}: `{t}` ({c:.2f})" for f, t, c in lowc] or None}),
                    "emissions": None,
                    "_known": known,
                    "_engine": b["engine"],
                })
    return records


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("bore", "boreMm", "stroke", "rodLength", "ch", "deckHeight", "pin", "pinMm", "domeCc", "domeHeight", "weight",
                "pinWeight", "topLand", "valveReliefDepth", "valveReliefDia", "intValveReliefDepth", "intValveReliefDia", "exhValveReliefDepth", "exhValveReliefDia")


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
        for k in ("boreOptions", "oversizes"):
            v = rec["spec"].get(k)
            if v is not None and (not isinstance(v, list) or not all(isinstance(x, (int, float)) for x in v)):
                errs.append(f"{rec['p']}: spec.{k} is not a list of numbers: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and (not isinstance(cr, dict) or not all(isinstance(v, (int, float)) for v in cr.values())):
            errs.append(f"{rec['p']}: spec.cr malformed: {cr!r}")
    return errs


# ----------------------------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--ocr-cache", default=DEFAULT_CACHE)
    ap.add_argument("--no-ocr", action="store_true", help="parse from the OCR cache only; never render or OCR")
    ap.add_argument("--dpi", type=int, default=200)
    args = ap.parse_args()

    log, qa = [], []
    if not args.no_ocr:
        if not os.path.exists(args.pdf):
            sys.exit(f"PDF not found: {args.pdf}")
        n = ocr_pages(args.pdf, args.ocr_cache, args.dpi, log)
        log.append(f"PDF {args.pdf}: {n} pages")
        refine_low_conf(args.pdf, args.ocr_cache, log)
    if not os.path.isdir(args.ocr_cache):
        sys.exit(f"OCR cache not found: {args.ocr_cache} (run without --no-ocr first)")
    pages = load_pages(args.ocr_cache)
    log.append(f"OCR cache: {len(pages)} pages, {sum(len(p['items']) for p in pages)} text boxes")

    boxes, page_stats = [], []
    for page in pages:
        pb = page_boxes(page, qa)
        banner = " ".join(it["text"] for it in page["items"] if it["cy"] < 180)
        parsed = []
        last_make = None
        for b in pb:
            pr = parse_box(b, qa, banner)
            first = pr["engine"].split()[0] if pr["engine"].split() else ""
            if first.upper() in MAKES:
                last_make = first.upper()
            elif last_make:
                rest = pr["engine"].split()
                if last_make.endswith(first.upper()):  # 'R 450' is the tail of 'CHRYSLER 450'
                    rest = rest[1:]
                fixed = " ".join([last_make] + rest)
                qa.append(f"p{page['page']} title `{pr['title']}` has no make (OCR cut the title); read as `{fixed}` from the previous box")
                pr["engine"] = fixed
                pr["lowConf"].append(("title", pr["title"], pr["titleConf"]))
            parsed.append(pr)
        boxes += parsed
        page_stats.append((page["page"], len(page["items"]), len(pb), sum(len(b["rows"]) for b in parsed), norm_space(banner)[:60]))

    records = build_records(boxes, qa)

    # part-number pattern and cross-checks
    bad_pn = sorted({r["p"] for r in records if not PN_PATTERN.match(r["p"])})
    for p in bad_pn:
        qa.append(f"PN `{p}` does not match KB patterns (KB### / ####HC); check OCR")
    icon = sorted({r["p"] for r in records if r["p"].upper().startswith("IC")})
    records = [r for r in records if not r["p"].upper().startswith("IC")]
    if icon:
        qa.append(f"skipped Icon (forged) numbers that appeared on KB pages: {icon}")
    uem_kb = {}
    if os.path.exists(UEM_JSON):
        with open(UEM_JSON, encoding="utf-8") as f:
            for r in json.load(f)["parts"]:
                if r["m"] == "KB":
                    uem_kb[r["p"]] = r
    overlap = sorted(set(uem_kb) & {r["p"] for r in records})
    cross = []
    for p in overlap:
        u = uem_kb[p]["spec"]
        mine = next(r for r in records if r["p"] == p)["spec"]
        diffs = {k: (mine.get(k), u.get(k)) for k in ("bore", "stroke", "rodLength", "ch", "pin", "domeCc") if mine.get(k) != u.get(k)}
        cross.append((p, diffs))
        if diffs:
            qa.append(f"PN {p}: differs from out/uem.json KB row: {diffs} (ours, uem)")

    # duplicate PNs across boxes (same PN listed twice on different pages) -> keep both only if families differ
    def application(r):
        sp = r["spec"]
        return clean({"engine": r["_engine"].title(), "ci": (r["fit"].get("ci") or [None])[0], "stroke": sp.get("stroke"),
                      "rodLength": sp.get("rodLength"), "ch": sp.get("ch"), "deckHeight": sp.get("deckHeight"),
                      "crown": sp.get("crown"), "cr": sp.get("cr"), "page": r["src"]["page"], "section": r["src"]["section"]})

    by_key = OrderedDict()
    merged = set()
    for r in records:
        k = (r["p"], r["fit"]["fam"])
        if k not in by_key:
            by_key[k] = r
            continue
        base = by_key[k]
        apps = base["spec"].setdefault("applications", [application(base)])
        apps.append(application(r))
        base["fit"]["ci"] = sorted(set(base["fit"].get("ci") or []) | set(r["fit"].get("ci") or [])) or None
        if base["fit"]["ci"] is None:
            del base["fit"]["ci"]
        base["fit"]["notes"] = "; ".join(filter(None, [base["fit"].get("notes"), f"also listed under {r['src']['section']} (p{r['src']['page']})"]))
        for fld in ("bore", "pin", "pinPn", "domeCc", "ringSetPn", "weight", "topLand"):
            if base["spec"].get(fld) != r["spec"].get(fld) and r["spec"].get(fld) is not None and base["spec"].get(fld) is not None:
                qa.append(f"PN {r['p']}: `{fld}` differs between p{base['src']['page']} ({base['spec'].get(fld)}) and p{r['src']['page']} "
                          f"({r['spec'].get(fld)}); first kept, check OCR / catalog")
        if k[0] not in merged:
            merged.add(k[0])
            qa.append(f"PN {r['p']}: listed under more than one engine; merged into `spec.applications` (p{base['src']['page']}, p{r['src']['page']})")
    records = list(by_key.values())

    errs = validate(records)
    unknown = sorted({(r["fit"]["fam"], r["_engine"]) for r in records if not r["_known"]})
    for fam, eng in unknown:
        qa.append(f"family not in the brief's list: `{fam}` (title `{eng}`); catalog heading kept in fit.fam")

    refined_cells = [(pg["page"], it["refined"]["from"], it["refined"]["fromConf"], it["text"], it["conf"])
                     for pg in pages for it in pg["items"] if it.get("refined")]
    # low-confidence inventory
    low_vals = []
    for r in records:
        for s in r["src"].get("ocrLowConfidence") or []:
            low_vals.append((r["p"], r["src"]["page"], s))
    confs = [r["src"]["ocrConfidence"] for r in records if r["src"].get("ocrConfidence")]
    hist = Counter()
    for c in confs:
        hist["<0.85" if c < 0.85 else "0.85-0.90" if c < 0.90 else "0.90-0.95" if c < 0.95 else "0.95-0.98" if c < 0.98 else ">=0.98"] += 1

    os.makedirs(OUT, exist_ok=True)
    out_records = [{k: v for k, v in r.items() if not k.startswith("_")} for r in records]
    with open(os.path.join(OUT, "kb.json"), "w", encoding="utf-8") as f:
        json.dump({
            "source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": "Catalogs/product-catalog.pdf",
                       "method": f"PyMuPDF render {args.dpi} dpi + rapidocr_onnxruntime; raw OCR cached in dl/kb/ocr/", "ocr": True},
            "extracted": dt.date.today().isoformat(),
            "count": len(out_records),
            "parts": out_records,
        }, f, ensure_ascii=False, indent=1)

    # notes
    fam_counts = Counter(r["fit"]["fam"] for r in records)
    series_counts = Counter(r["spec"]["series"] for r in records)
    spec_cov = Counter()
    for r in records:
        for k in r["spec"]:
            spec_cov[k] += 1
    md = []
    md.append("# KB Performance Pistons 2015 catalog — extraction notes\n")
    md.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_kb.py` from `Catalogs/product-catalog.pdf` "
              f"(KB Performance Pistons Catalog, InDesign 2015-01-27, 48 pages, scanned images, no text layer).\n")
    md.append("## Method\n")
    md.append(f"- Each page rendered with PyMuPDF at {args.dpi} dpi and read with `rapidocr_onnxruntime` (RapidOCR, ONNX PP-OCR models); "
              "about 9 s per page. Raw results (box, text, confidence) cached once per page in `dl/kb/ocr/page_NN.json` (gitignored); "
              "`--no-ocr` re-parses from the cache.")
    md.append("- Spec boxes are found by their title line (`CHEVROLET 350 · 5.7 ROD · FLAT TOP`, large font, contains `ROD`); everything "
              "below a title down to the next title belongs to that box. Header values (bore, stroke, comp. height, O.E. deck height, "
              "lock-ring PN, alloy) are the line under the BORE/STROKE labels; OVERSIZES, PIN SIZE/PIN #, RINGSET PART# are the left "
              "column of the next lines, NOTES the right column (x >= 1040 px). Piston rows are the lines under the PISTON# header; "
              "columns are assigned by x-position against the header labels (ring pack, dish/dome, CR, weight, top land, valve "
              "relief depth/dia). CR values are matched to the chamber-cc header by x-position when the counts differ.")
    md.append("- Text boxes read below 0.85 confidence on the full page are re-OCR'd as 300-dpi crops (`refine_NN.json` in the cache) "
              "and replaced when the crop reads with clearly higher confidence; see *Re-OCR'd cells*.")
    md.append("- OCR repairs: `I`/`l`/`|` -> `1` and `O` -> `0` inside numeric runs (`990IHC`, `-I0cc`); merged cells split by regex "
              "(`13.913.012.7` -> 13.9 13.0 12.7, `567/107.254\"` -> weight + top land).")
    md.append("- Sign convention: the catalog prints dome volume negative and dish / valve-relief volume positive (`.150\" SD -4cc`, "
              "`Flat Top 7cc 4V`). `spec.domeCc` follows the shared format (dome positive, dish negative), so every printed value is "
              "negated; `spec.dishDome` keeps the printed text. `spec.crown` is the normalised head type.")
    md.append("- `spec.weight` / `spec.pinWeight` are the GRAM WEIGHT column (piston / pin). The small number in the LOCKRING header "
              "column (`93`, `PRG110-3`) is the lock-ring part number (`spec.lockRings`), not a weight.")
    md.append("- `spec.boreOptions` = bore + each listed oversize; a starred oversize (`*.080`) is given only to the starred part number.")
    md.append("- `spec.kitPn` = piston-and-ring kit numbers (`KT` + ring material: D ductile moly, M cast moly, S steel chrome).")
    md.append("- `spec.alloy` is written `Cast 390 Hypereutectic` (printed `HYPEREUTECTIC 390`) to match the KB rows in `out/uem.json`. "
              "`m` is `KB` for both the KB Hypereutectic and the Claimer series; `spec.series` tells them apart.")
    md.append("- Families from the title's make and displacement (`CHEVROLET 350` -> Small-block Chevy, `CHEVROLET 454/489` -> both "
              "big-block families, `FORD 408W/416W` -> Small-block Ford (Windsor), `CADILLAC 472/500` -> Cadillac 368-500, ...). "
              "Engines outside the brief's list keep a descriptive heading in `fit.fam` and are flagged below.\n")
    md.append("## Pages\n")
    md.append("| page | OCR boxes | spec boxes | piston rows | banner |\n|---|---|---|---|---|")
    for p, n, nb, nr, banner in page_stats:
        md.append(f"| {p} | {n} | {nb} | {nr} | {banner} |")
    md.append("")
    md.append(f"Total: {sum(s[1] for s in page_stats)} OCR text boxes, {len(boxes)} spec boxes, "
              f"{sum(len(b['rows']) for b in boxes)} piston rows, {len(records)} records "
              f"({len(out_records)} after family fan-out and de-duplication).\n")
    md.append("## Counts\n")
    md.append("| series | records |\n|---|---|")
    for s, n in series_counts.most_common():
        md.append(f"| {s} | {n} |")
    md.append("")
    md.append("| family | records |\n|---|---|")
    for fam, n in fam_counts.most_common():
        md.append(f"| {fam} | {n} |")
    md.append("")
    md.append("### Spec coverage\n")
    md.append("| spec key | records |\n|---|---|")
    for k, n in spec_cov.most_common():
        md.append(f"| {k} | {n} |")
    md.append("")
    md.append("### OCR confidence (mean over the text boxes each record was read from)\n")
    md.append("| band | records |\n|---|---|")
    for band in (">=0.98", "0.95-0.98", "0.90-0.95", "0.85-0.90", "<0.85"):
        md.append(f"| {band} | {hist.get(band, 0)} |")
    if confs:
        md.append(f"\nmin {min(confs):.3f}, median {statistics.median(confs):.3f}, max {max(confs):.3f}.\n")
    md.append("## Cross-check against out/uem.json\n")
    md.append(f"KB part numbers in `out/uem.json` (2026 supplement): {sorted(uem_kb)}. In this catalog: {overlap or 'none'}.")
    for p, diffs in cross:
        md.append(f"- {p}: {'matches on bore/stroke/rod/CH/pin/dome' if not diffs else f'differs: {diffs} (ours, uem)'}")
    md.append("")
    md.append("## Re-OCR'd cells\n")
    md.append(f"{len(refined_cells)} text boxes read below {LOW_CONF} on the full page were re-read as 300-dpi crops and replaced "
              "(page-level detection garbles small table cells that read cleanly in isolation):\n")
    md.append("| page | full-page read (conf) | crop read (conf) |\n|---|---|---|")
    for pg, a, ca, b, cb in refined_cells:
        md.append(f"| {pg} | `{a}` ({ca:.2f}) | `{b}` ({cb:.2f}) |")
    md.append("")
    md.append(f"## Low-confidence OCR values (< {LOW_CONF})\n")
    md.append(f"{len(low_vals)} values below {LOW_CONF} across {len({p for p, _, _ in low_vals})} records; each is also listed in the record's "
              "`src.ocrLowConfidence`. Review these against the page image before trusting them.\n")
    md.append("| PN | page | field: text (confidence) |\n|---|---|---|")
    for p, pg, s in low_vals:
        md.append(f"| {p} | {pg} | {s.replace('|', '\\|')} |")
    md.append("")
    md.append("## QA\n")
    md.append(f"Validation: {'OK' if not errs else 'FAILED'} ({len(errs)} errors). Checks: every record has `m p cat fit.fam src`; "
              "no duplicate `p` within a family; numeric spec fields are numbers; no empty strings.")
    for e in errs:
        md.append(f"- ERROR {e}")
    md.append("")
    for q in qa:
        md.append(f"- {q}")
    md.append("")
    md.append("## Log\n")
    for l in log:
        md.append(f"- {l}")
    with open(os.path.join(OUT, "kb.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")

    print(f"records {len(out_records)}; spec boxes {len(boxes)}; QA items {len(qa)}; validation errors {len(errs)}")
    print("families:", dict(fam_counts.most_common()))
    print("confidence:", dict(hist))
    if errs:
        for e in errs[:20]:
            print("ERROR", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
