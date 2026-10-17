#!/usr/bin/env python3
"""Extract Lunati crankshafts, connecting rods and rotating assemblies from the 2013 "Rotating Assemblies"
catalog PDF, saved by hand under Catalogs/ (Edelbrock Group sites are PDF-only for us; no network is used).

Layout notes (PDF page = printed page + 2):
  - Every PDF page carries the text of the whole two-page spread: the left page has the right half at x > 603,
    the right page has the left half at x < 0. Tables that span a spread (rotating assemblies pp 4-11, cranks
    pp 14-21) are therefore read from the uncropped LEFT page, where each row is one joined line.
  - Rotating assemblies: "<application> <chamber cc>" section heading, "engine size - NNNc.i." group labels,
    rows `PN CR bore stroke rodLength main|deck pistonPN style alloy mfr crankPN rodPN beam`.
  - Cranks: rows `PN stroke main rodJournal minRodLength notes rodType rodJournalWidth`; the application heading
    sits at the vertical centre of its row group, and the part-number family code (digits 2-3) encodes the
    same application, which is used as the authority (headings are cross-checked).
  - Rods: pp 24 (preview), 26, 27: `PN application length journal pin bigEndWidth weight`.
Skipped: bearings (p23, other brands), rod bolts (p25), balancers, tools, apparel.

Output: out/lunati-ra.json (shared parts record format) and out/lunati-ra.md (notes).
Writes nothing outside out/. Run with `python -X utf8 -I`.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

import pdfplumber

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "out")
DEFAULT_PDF = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Catalogs", "Lunati-Rotating-Assemblies.pdf")
BRAND = "Lunati"
EDITION = "2013"
DOC = "Lunati Rotating Assemblies catalog (PDF, 2013)"
FILE = "Catalogs/Lunati-Rotating-Assemblies.pdf"
PAGE_W = 603

RA_PAGES = (4, 6, 8, 10)
CRANK_PAGES = (14, 16, 18, 20)
ROD_PAGES = (24, 26, 27)

SBC, BBC4, BBC6, LS, LT5, SBF, FBB, FMOD = ("Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "GM LS",
                                           "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 429/460", "Ford Modular")
HEMI1, HEMI2 = "Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"
VIPER = "Dodge Viper V10 (catalog heading)"

# crank part-number family code (digits 2-3) -> (application label, families, extras)
CRANK_CODES = {
    "01": ("Chevy small block, 350 main, 1-pc rear seal", [SBC], {"mainSize": "350"}),
    "02": ("Chevy small block", [SBC], {}),
    "03": ("GM LS Gen III/IV, standard snout, 24-tooth reluctor", [LS], {"snout": "standard", "reluctor": 24}),
    "08": ("GM LS Gen III/IV, standard snout, 58-tooth reluctor", [LS], {"snout": "standard", "reluctor": 58}),
    "09": ("GM LS7 Gen IV, long snout, 24-tooth reluctor", [LS], {"snout": "long (LS7)", "reluctor": 24}),
    "10": ("GM LS7 Gen IV, long snout, 58-tooth reluctor", [LS], {"snout": "long (LS7)", "reluctor": 58}),
    "55": ("GM LT1 Gen V, short snout", [LT5], {"snout": "short"}),
    "15": ("GM LT1 Gen V, long snout", [LT5], {"snout": "long"}),
    "04": ("Chevy big block, with center counterweights", [BBC4, BBC6], {"centerCounterweights": True}),
    "64": ("Chevy big block, without center counterweights", [BBC4, BBC6], {"centerCounterweights": False}),
    "61": ("Chevy big block, without center counterweights", [BBC4, BBC6], {"centerCounterweights": False}),
    "05": ("Ford small block, 302 main", [SBF], {"mainSize": "302"}),
    "06": ("Ford small block, 351W with 351C main", [SBF], {"mainSize": "351C (2.750)"}),
    "07": ("Ford big block, 460 main", [FBB], {"mainSize": "460"}),
    "12": ("Ford 4.6L Modular", [FMOD], {}),
}
SERIES_BY_PREFIX = {"6": "Signature Series", "7": "Voodoo", "8": "Signature Blower Series"}

RA_HEADINGS = [  # (regex on the section heading, families, notes)
    (re.compile(r"^Chevy small block", re.I), [SBC], None),
    (re.compile(r"^gm (ls|l92)", re.I), [LS], None),
    (re.compile(r"^Chevy big block", re.I), [BBC4], "2-pc rear seal crank; 1-pc seal kits on request"),
    (re.compile(r"^ford small block", re.I), [SBF], None),
    (re.compile(r"^ford big block", re.I), [FBB], None),
]
ROD_APPS = {
    "Chevy Small Block": [SBC], "Chevy Small Block (Stroker)": [SBC], "GM LS": [LS], "Chevy Big Block": [BBC4, BBC6],
    "Ford Small Block": [SBF], "Ford Small Block w/ Chevy Rod": [SBF], "Chrysler Viper V10": [VIPER],
    "Chrysler Late Model Hemi": [HEMI1, HEMI2],
}
KNOWN = {SBC, BBC4, BBC6, LS, LT5, SBF, FBB, FMOD, HEMI1, HEMI2}

RA_PN_RE = re.compile(r"^\d{5}[VS]RK\d{2}$")
CRANK_PN_RE = re.compile(r"^[678]\d{7}$")
ROD_PN_RE = re.compile(r"^(\d{8}-\d{1,2})(\d)?$")
PISTON_PN_RE = re.compile(r"^(IC\d{3}KTD|\d{5}|[A-Z]{1,3}\d[A-Z0-9]{8,12})$")
INCH_RE = re.compile(r'^(\d{1,2}\.\d{3,4})"$')
CI_RE = re.compile(r"engine size\s*[–-]\s*(\d{3})c\.i\.")


# ----------------------------------------------------------------------------------------------
def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def inch(s):
    m = INCH_RE.match(s) if s else None
    return float(m.group(1)) if m else None


SIDEBAR = {"SEILBMESSA", "GNITATOR", "STFAHSKNARC", "SDOR", "GNITCENNOC", "SRECNALAB", "SUOENALLECSIM",
           "ROTATING", "ASSEMBLIES", "CRANKSHAFTS", "CONNECTING", "RODS", "BALANCERS", "MISCELLANEOUS"}


def page_words(page, keep_right=True):
    """Uncropped words; the facing page's copy at x < 0 and the rotated section sidebar are dropped."""
    pg = page.dedupe_chars(tolerance=1)
    words = [w for w in pg.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False)
             if w["x0"] >= -2 and w["text"] not in SIDEBAR]
    if not keep_right:
        words = [w for w in words if w["x0"] < PAGE_W]
    for w in words:
        w["yc"] = (w["top"] + w["bottom"]) / 2
        w["xc"] = (w["x0"] + w["x1"]) / 2
    return words


def group_lines(words, tol=2.5):
    lines = []
    for w in sorted(words, key=lambda w: (w["yc"], w["x0"])):
        if lines and abs(w["yc"] - lines[-1]["yc"]) <= tol:
            lines[-1]["words"].append(w)
        else:
            lines.append({"yc": w["yc"], "words": [w]})
    for ln in lines:
        ln["words"].sort(key=lambda w: w["x0"])
        ln["text"] = " ".join(w["text"] for w in ln["words"])
        ln["toks"] = [w["text"] for w in ln["words"]]
    return lines


def src(page):
    return {"doc": DOC, "edition": EDITION, "file": FILE, "page": page, "printedPage": page - 2}


# ----------------------------------------------------------------------------------------------
# rotating assemblies
# ----------------------------------------------------------------------------------------------
def parse_ra_page(words, pno, qa):
    lines = group_lines(words)
    rows = []
    section = None  # (application, chamber cc)
    ci_labels = []
    row_idx = []
    for i, ln in enumerate(lines):
        t = ln["text"]
        for m in CI_RE.finditer(t):
            ci_labels.append(int(m.group(1)))
        m = re.match(r"^([A-Za-z][A-Za-z0-9 ,&/–-]+?)\s*(\d)?\s+(\d{2,3})cc$", t)
        if m and "Part" not in t:
            section = (re.sub(r"\d$", "", m.group(1)).strip(), int(m.group(3)))
            continue
        pn_pos = [k for k, tok in enumerate(ln["toks"]) if RA_PN_RE.match(tok)]
        if not pn_pos:
            continue
        row_idx.append((i, pn_pos[0], section))
    for n, (i, k, section) in enumerate(row_idx):
        ln = lines[i]
        toks, ws = ln["toks"][k:], ln["words"][k:]
        pn = toks[0]
        try:
            cr = float(toks[1])
            bore, stroke, rod = inch(toks[2]), inch(toks[3]), inch(toks[4])
        except (ValueError, IndexError):
            qa.append(f"p{pno} {pn}: row head not parsed: '{ln['text'][:90]}'")
            continue
        if None in (bore, stroke, rod):
            qa.append(f"p{pno} {pn}: bore/stroke/rod not parsed: '{ln['text'][:90]}'")
            continue
        # piston PN token: first token after the rod length that looks like a piston part number
        pk = None
        for j in range(5, len(toks)):
            if PISTON_PN_RE.match(toks[j]) and j + 3 < len(toks):
                pk = j
                break
        if pk is None:
            qa.append(f"p{pno} {pn}: piston part number not found: '{ln['text'][:120]}'")
            continue
        m = re.match(r"^(.*?)\s*(2618|4032)\s+(ICON|Diamond|Mahle|Wiseco)\s+(\d{8})\s+(\d{8}-\d{1,2})\s+([HI])-Beam$", " ".join(toks[pk + 1:]))
        if not m:
            qa.append(f"p{pno} {pn}: tail not parsed: '{' '.join(toks[pk:])}'")
            continue
        style_line, alloy, mfr, crank_pn, rod_pn, beam = m.groups()
        deck_toks = toks[5:pk]
        # neighbouring wrapped lines: deck-height column and piston-style column
        y_top = (lines[row_idx[n - 1][0]]["yc"] + ln["yc"]) / 2 if n > 0 else ln["yc"] - 9
        y_bot = (lines[row_idx[n + 1][0]]["yc"] + ln["yc"]) / 2 if n + 1 < len(row_idx) else ln["yc"] + 9
        y_top, y_bot = max(y_top, ln["yc"] - 9.5), min(y_bot, ln["yc"] + 9.5)
        deck_x0, deck_x1 = ws[4]["x1"], ws[pk]["x0"]
        mat_x0 = next(w["x0"] for w in ws[pk + 1:] if w["text"] in ("2618", "4032"))
        style_x0, style_x1 = ws[pk]["x1"], mat_x0
        band = [w for w in words if y_top < w["yc"] < y_bot and abs(w["yc"] - ln["yc"]) > 1.0]
        deck_extra = [w["text"] for w in sorted(band, key=lambda w: (w["yc"], w["x0"])) if deck_x0 - 2 <= w["x0"] and w["x1"] <= deck_x1 + 2]
        style_above = [w["text"] for w in sorted(band, key=lambda w: (w["yc"], w["x0"])) if style_x0 - 2 <= w["x0"] and w["x1"] <= style_x1 + 2 and w["yc"] < ln["yc"]]
        style_below = [w["text"] for w in sorted(band, key=lambda w: (w["yc"], w["x0"])) if style_x0 - 2 <= w["x0"] and w["x1"] <= style_x1 + 2 and w["yc"] > ln["yc"]]
        deck_text = " ".join(deck_toks + deck_extra)
        style = " ".join(style_above + [style_line] + style_below).strip()
        style = re.sub(r"\s+", " ", style).strip(" ,")
        rows.append({"pn": pn, "page": pno, "section": section, "cr": cr, "bore": bore, "stroke": stroke, "rodLength": rod,
                     "deckText": deck_text, "pistonPn": toks[pk], "style": style, "alloy": alloy, "mfr": mfr, "crankPn": crank_pn,
                     "rodPn": rod_pn, "beam": beam})
    return rows, ci_labels


def ra_records(rows, ci_labels_by_page, cranks_by_pn, qa):
    recs, seen = [], set()
    for r in rows:
        if r["pn"] in seen:
            continue
        seen.add(r["pn"])
        app, chamber = r["section"] if r["section"] else (None, None)
        fams, fnote = None, None
        for rx, fl, note in RA_HEADINGS:
            if app and rx.search(app):
                fams, fnote = fl, note
                break
        if not fams:
            qa.append(f"{r['pn']}: no family mapping for section '{app}'; heading kept in fit.fam")
            fams = [f"{app} (catalog heading)"]
        calc = math.pi / 4 * r["bore"] ** 2 * r["stroke"] * 8
        labels = ci_labels_by_page.get(r["page"], [])
        ci = min(labels, key=lambda c: abs(c - calc)) if labels else None
        if ci is None or abs(ci - calc) > 0.012 * calc:
            qa.append(f"{r['pn']}: computed {calc:.1f} ci does not match an 'engine size' label on p{r['page']} ({labels}); stored rounded value")
            ci = round(calc)
        # deck / main field
        deck = None
        m = re.search(r'(\d{1,2}\.\d{3})"', r["deckText"])
        if m:
            deck = float(m.group(1))
        main_size = None
        m = re.search(r"\((.*?)\)", r["deckText"])
        if m:
            main_size = m.group(1).replace(" Main", "").strip()
        elif re.fullmatch(r"\d{3}", r["deckText"].strip()):
            main_size = r["deckText"].strip()
        series = "Voodoo" if "VRK" in r["pn"] else "Signature Series"
        st = r["style"]
        top = "dome" if re.search(r"\bDome\b", st) else ("dish" if re.search(r"Dish", st, re.I) else ("flat" if re.search(r"Flat Top", st) else None))
        if re.search(r"Inverted Dome", st):
            top = "dish"
        vr = re.search(r"\b([12])V\b", st)
        crank = cranks_by_pn.get(r["crankPn"])
        if crank is None:
            qa.append(f"{r['pn']}: crank {r['crankPn']} is not in the crankshaft tables; main/rod journal not filled")
        spec = clean({
            "series": series, "stroke": r["stroke"], "rodLength": r["rodLength"], "bore": r["bore"], "deckHeight": deck,
            "mainSize": main_size, "mainJournal": crank["mainJournal"] if crank else None, "rodJournal": crank["rodJournal"] if crank else None,
            "cr": {str(chamber): r["cr"]} if chamber else None, "chamberCc": chamber,
            "crankMaterial": "4340 forged (non-twist)", "crankPn": r["crankPn"], "rodPn": r["rodPn"], "rodBeam": r["beam"],
            "rodMaterial": "4340 forged", "pistonPn": r["pistonPn"], "pistonMfg": r["mfr"], "pistonAlloy": r["alloy"],
            "pistonClass": "forged", "pistonTop": top, "pistonStyle": st or None, "valveReliefs": int(vr.group(1)) if vr else None,
            "ringsIncluded": True, "bearingsIncluded": True, "balanced": True,
            "rearSeal": crank.get("rearSeal") if crank else None, "reluctor": crank.get("reluctor") if crank else None,
        })
        name = f"{series} rotating assembly, {ci} ci, {r['stroke']:.3f} stroke, {r['rodLength']:.3f} rod, {r['bore']:.3f} bore, {r['cr']}:1 at {chamber} cc"
        for fam in fams:
            notes = "; ".join(x for x in (f"catalog section: {app}", fnote, f"{main_size} main" if main_size and not main_size.replace('.', '').isdigit() else None) if x)
            recs.append({"m": BRAND, "p": r["pn"], "cat": "rotatingAssembly", "name": name,
                         "fit": clean({"fam": fam, "ci": [ci], "cyl": 8, "notes": notes}),
                         "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs


# ----------------------------------------------------------------------------------------------
# crankshafts
# ----------------------------------------------------------------------------------------------
def parse_crank_page(words, pno, qa):
    lines = group_lines(words)
    split_x = None
    for ln in lines:
        if "notes" in ln["toks"] and "Connecting" in ln["toks"]:
            # column texts are centred under their headers; split halfway between the two header centres
            split_x = (ln["words"][ln["toks"].index("notes")]["xc"] + ln["words"][ln["toks"].index("Connecting")]["xc"]) / 2
            break
    rows, headings = [], []
    in_table = False
    for i, ln in enumerate(lines):
        toks = ln["toks"]
        if toks[:2] == ["application", "Part"]:
            in_table = True
            continue
        if not in_table:
            continue
        if re.match(r"^\d\s+(Red numbers|Ford Small Block)", ln["text"]) or ln["text"].startswith("Chart Continued"):
            in_table = False
            continue
        pn_pos = [k for k, tok in enumerate(toks) if CRANK_PN_RE.match(tok) and k + 4 < len(toks) and INCH_RE.match(toks[k + 1])]
        head_text = " ".join(toks[:pn_pos[0]]) if pn_pos else ln["text"]
        if head_text and not re.fullmatch(r"(Chevrolet/gm|ford)", head_text):
            headings.append({"yc": ln["yc"], "text": head_text})
        if not pn_pos:
            continue
        k = pn_pos[0]
        ws = ln["words"][k:]
        t = toks[k:]
        stroke, main, rodj, minrod = inch(t[1]), inch(t[2]), inch(t[3]), inch(t[4]) if len(t) > 4 else None
        width = inch(t[-1]) if INCH_RE.match(t[-1]) else None
        mid = ws[5:-1] if width is not None else ws[5:]
        notes = " ".join(w["text"] for w in mid if split_x is None or w["x0"] < split_x - 3)
        rodtype = " ".join(w["text"] for w in mid if split_x is not None and w["x0"] >= split_x - 3)
        if None in (stroke, main, rodj):
            qa.append(f"p{pno} {t[0]}: journals not parsed: '{ln['text'][:90]}'")
            continue
        if minrod is None or width is None:
            qa.append(f"p{pno} {t[0]}: right-hand columns missing: '{ln['text'][:120]}'")
        rows.append({"pn": t[0], "page": pno, "yc": ln["yc"], "stroke": stroke, "mainJournal": main, "rodJournal": rodj,
                     "minRodLength": minrod, "rodJournalWidth": width, "notes": notes, "rodType": rodtype, "heading": None})
    assign_headings(rows, headings)
    return rows


def assign_headings(rows, headings):
    """Each application heading sits at the vertical centre of its row group: a group has as many rows below the
    heading as above it (a row on the heading's own line is the middle row)."""
    rows.sort(key=lambda r: r["yc"])
    headings.sort(key=lambda h: h["yc"])
    start = 0
    for h in headings:
        above = [r for r in rows[start:] if r["yc"] < h["yc"] - 1.5 and r["heading"] is None]
        on = [r for r in rows[start:] if abs(r["yc"] - h["yc"]) <= 1.5]
        below = [r for r in rows[start:] if r["yc"] > h["yc"] + 1.5]
        group = above + on + below[:len(above)]
        for r in group:
            r["heading"] = h["text"]
        start += len(group)
    # anything left (continuation of the previous spread's group) keeps heading None


def crank_records(rows, qa):
    recs, by_pn = [], OrderedDict()
    for r in rows:
        if r["pn"] in by_pn:
            qa.append(f"{r['pn']}: crank listed twice (p{by_pn[r['pn']]['page']} and p{r['page']}); first kept")
            continue
        by_pn[r["pn"]] = r
    for pn, r in by_pn.items():
        code = pn[1:3]
        if code not in CRANK_CODES:
            qa.append(f"{pn}: unknown family code {code}; heading '{r['heading']}' used")
            app, fams, extra = r["heading"] or "unknown", [f"{r['heading']} (catalog heading)"], {}
        else:
            app, fams, extra = CRANK_CODES[code]
        series = SERIES_BY_PREFIX.get(pn[0], "unknown")
        # cross-check the geometric heading against the code
        h = (r["heading"] or "").lower()
        if h:
            ok = ((code in ("01", "02") and "small block" in h and "chevy" in h) or (code in ("03", "08") and "gen iii" in h) or
                  (code in ("09", "10") and "ls7" in h) or (code in ("55",) and "short snout" in h) or (code in ("15",) and "long snout" in h and "lt1" in h) or
                  (code == "04" and "w/ center" in h) or (code in ("64", "61") and "w/o center" in h) or
                  (code == "05" and "302" in h) or (code == "06" and "351" in h) or (code == "07" and "460" in h) or (code == "12" and "modular" in h))
            if not ok:
                qa.append(f"{pn}: heading by position '{r['heading']}' disagrees with family code {code} ({app}); code used")
        notes = r["notes"]
        seal = "1-pc" if re.search(r"1 ?PC", notes, re.I) else ("2-pc" if re.search(r"2 ?PC", notes, re.I) else None)
        rel = re.search(r"(\d{2})-Tooth", notes)
        main_size = extra.get("mainSize")
        m = re.match(r"^(\d{3}) Main", notes)
        if m:
            main_size = m.group(1)
        if code == "02" and main_size is None:
            main_size = {2.448: "350", 2.648: "400"}.get(r["mainJournal"])
        spec = clean({
            "series": series, "stroke": r["stroke"], "mainJournal": r["mainJournal"], "rodJournal": r["rodJournal"],
            "rodJournalWidth": r["rodJournalWidth"], "minRodLength": r["minRodLength"],
            "material": "4340 forged (non-twist)", "heatTreat": "nitrided", "rearSeal": seal,
            "reluctor": int(rel.group(1)) if rel else extra.get("reluctor"), "snout": extra.get("snout"),
            "centerCounterweights": extra.get("centerCounterweights"), "mainSize": main_size,
            "rodType": r["rodType"] or None, "notes": notes or None,
            "rodJournal283": True if r["rodJournal"] == 2.0 and code in ("02", "01") else None,
            "blowerSnout": True if series == "Signature Blower Series" else None,
        })
        if "BBC Snout" in notes:
            spec["snout"] = "BBC"
        name = f"{series} 4340 forged crank, {r['stroke']:.3f} stroke, {r['rodJournal']:.3f} rod journal, {r['mainJournal']:.3f} main"
        fit_fams = list(fams)
        if code in ("04", "64", "61") and seal:
            fit_fams = [BBC4] if seal == "2-pc" else [BBC6]
        for fam in fit_fams:
            fn = "; ".join(x for x in (app, f"{seal} rear seal" if seal and "big block" in app else None,
                                       f"rod journal {r['rodJournal']} (283 size)" if spec.get("rodJournal283") else None) if x)
            recs.append({"m": BRAND, "p": pn, "cat": "crank", "name": name, "fit": clean({"fam": fam, "cyl": 8, "notes": fn}),
                         "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs, {pn: {"mainJournal": r["mainJournal"], "rodJournal": r["rodJournal"],
                       "rearSeal": ("1-pc" if re.search(r"1 ?PC", r["notes"], re.I) else ("2-pc" if re.search(r"2 ?PC", r["notes"], re.I) else None)),
                       "reluctor": int(m.group(1)) if (m := re.search(r"(\d{2})-Tooth", r["notes"])) else None}
                  for pn, r in by_pn.items()}


# ----------------------------------------------------------------------------------------------
# rods
# ----------------------------------------------------------------------------------------------
def parse_rod_page(words, pno, qa):
    lines = group_lines(words)
    rows, series = [], None
    for ln in lines:
        t = ln["text"]
        if re.search(r"^Voodoo (seRies|ConneCting)", t) or re.search(r"^Voodoo Connecting Rods", t, re.I):
            series = "Voodoo"
        elif re.search(r"^RaCeR seRies|^Racer Series", t, re.I):
            series = "Racer Series"
        elif re.search(r"^signatuRe seRies Rods|^Signature Series Rods", t, re.I):
            series = "Signature Series"
        m = ROD_PN_RE.match(ln["toks"][0])
        if not m:
            continue
        toks = ln["toks"]
        nums = [(k, tok) for k, tok in enumerate(toks) if INCH_RE.match(tok) or re.fullmatch(r'\.\d{3}"', tok)]
        wt = re.fullmatch(r"(\d+)g", toks[-1])
        if len(nums) < 3 or not wt:
            qa.append(f"p{pno} {m.group(1)}: rod row not parsed: '{t}'")
            continue
        app = " ".join(toks[1:nums[0][0]])
        vals = [float(tok.rstrip('"')) for _, tok in nums]
        row = {"pn": m.group(1), "footnote": m.group(2), "page": pno, "series": series, "application": app, "length": vals[0],
               "journal": vals[1], "pin": vals[2], "bigEndWidth": vals[3] if len(vals) > 3 else None, "weight": int(wt.group(1))}
        rows.append(row)
    return rows


def rod_records(rows, qa):
    by_pn = OrderedDict()
    for r in rows:
        if r["pn"] in by_pn:
            a = by_pn[r["pn"]]
            if a["bigEndWidth"] is None and r["bigEndWidth"] is not None:
                by_pn[r["pn"]] = r  # the full table beats the preview on p24
            continue
        by_pn[r["pn"]] = r
    recs = []
    for pn, r in by_pn.items():
        series = r["series"] or SERIES_BY_PREFIX.get(pn[0])
        beam = "H" if series == "Voodoo" else "I"
        bolt = "ARP 2000 7/16\""
        note = None
        if r["footnote"] == "1":
            bolt, note = "ARP CA625+ 3/8\" (D bolt)", "uses 3/8\" ARP CA625 bolt, not ARP2000 7/16\""
        fams = ROD_APPS.get(r["application"])
        if not fams:
            qa.append(f"{pn}: no family mapping for rod application '{r['application']}'; heading kept")
            fams = [f"{r['application']} (catalog heading)"]
        cyl = 10 if "V10" in r["application"] else 8
        spec = clean({
            "series": series, "length": r["length"], "bigEnd": r["journal"], "pin": r["pin"], "bigEndWidth": r["bigEndWidth"],
            "beam": beam, "material": "4340 forged", "bolt": bolt, "weight": r["weight"],
            "strokerClearance": True if "Stroker" in r["application"] else None,
            "pinEnd": "bushed" if series == "Signature Series" else None,
            "setOf": int(pn.rsplit("-", 1)[1]), "note": note,
        })
        name = f"{series} 4340 forged {beam}-beam rod, {r['length']:.3f} length, {r['journal']:.3f} journal"
        for fam in fams:
            recs.append({"m": BRAND, "p": pn, "cat": "rod", "name": name,
                         "fit": clean({"fam": fam, "cyl": cyl, "notes": r["application"] if r["application"] not in ("Chevy Small Block", "GM LS", "Chevy Big Block", "Ford Small Block") else None}),
                         "spec": spec, "src": src(r["page"]), "emissions": None})
    return recs


# ----------------------------------------------------------------------------------------------
NUMERIC = ("stroke", "mainJournal", "rodJournal", "rodJournalWidth", "minRodLength", "length", "bigEnd", "pin", "bigEndWidth",
           "weight", "bore", "rodLength", "deckHeight", "chamberCc", "reluctor", "valveReliefs", "setOf")


def validate(records):
    errs, seen = [], set()
    for rec in records:
        for k in ("m", "p", "cat", "src"):
            if not rec.get(k):
                errs.append(f"{rec.get('p')}: missing {k}")
        if not rec.get("fit", {}).get("fam"):
            errs.append(f"{rec.get('p')}: missing fit.fam")
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
        for k in NUMERIC:
            v = rec["spec"].get(k)
            if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float))):
                errs.append(f"{rec['p']}: spec.{k} is not a number: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and not all(isinstance(v, (int, float)) for v in cr.values()):
            errs.append(f"{rec['p']}: spec.cr malformed")
    return errs


def write_notes(path, pdf_path, npages, records, ra_rows, crank_rows, rod_rows, qa, errs):
    by_cat = Counter(r["cat"] for r in records)
    by_fam = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    by_series = Counter((r["cat"], r["spec"].get("series")) for r in records)
    uniq = len({r["p"] for r in records})
    L = ["# Lunati rotating assemblies - extraction notes\n",
         f"Source: `{FILE}` ({npages} PDF pages; catalog dated 2013, PDF created 2013-11-25; saved by hand under `Catalogs/`, "
         "no network used). PDF page = printed page + 2. **The catalog is a 2013 edition**: part numbers and specs may have "
         "changed since; `src.edition` is `2013` on every record.\n",
         f"Records: {len(records)} ({uniq} unique part numbers; a part listed for several engine families is repeated once per family).\n",
         "## Counts\n", "| cat | records |\n|---|---|"]
    for c, n in sorted(by_cat.items()):
        L.append(f"| {c} | {n} |")
    L.append("\n| cat / series | records |\n|---|---|")
    for (c, s), n in sorted(by_series.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        L.append(f"| {c} / {s} | {n} |")
    L.append("\n| cat / fit.fam | records |\n|---|---|")
    for (c, f), n in sorted(by_fam.items()):
        L.append(f"| {c} / {f} | {n} |")
    L.append(f"\nRows parsed: rotating assemblies {len(ra_rows)}, cranks {len(crank_rows)}, rods {len(rod_rows)} (before de-duplication).\n")
    cov = defaultdict(Counter)
    tot = Counter(r["cat"] for r in records)
    for r in records:
        for k, v in r["spec"].items():
            if v is not None:
                cov[r["cat"]][k] += 1
    L.append("### Spec coverage\n")
    for c in sorted(cov):
        L.append(f"- **{c}** ({tot[c]} records): " + ", ".join(f"{k} {n}" for k, n in sorted(cov[c].items(), key=lambda x: (-x[1], x[0]))))
    L.append("\n## Method\n")
    L.append("- Every PDF page's text layer holds the whole two-page spread (right half at x > 603 on the left page, left half at "
             "x < 0 on the right page). Spread tables (rotating assemblies, cranks) are read from the uncropped left page so each "
             "row is one joined line; x < 0 words are dropped.")
    L.append("- Rotating assemblies: section heading gives the application and the chamber cc the compression ratio is quoted at "
             "(`spec.cr` is keyed by that cc). Displacement (`fit.ci`) is the page's own 'engine size' label nearest the computed "
             "bore x stroke value (must agree within 1.2 %). Main and rod journal sizes are filled from the crank table by crank PN. "
             "Deck height / main-size cells and piston-style cells that wrap onto neighbouring lines are re-joined by column position.")
    L.append("- Cranks: the application comes from the part-number family code (digits 2-3: 01/02 SBC, 03/08 LS 24/58-tooth, 09/10 LS7 "
             "long snout, 55/15 LT1 short/long snout, 04 BBC with centre counterweights, 64/61 BBC without, 05 SBF 302 main, 06 SBF "
             "351C main, 07 BBF 460 main, 12 4.6 Modular), cross-checked against the heading placed at the centre of each row group. "
             "`rearSeal`, `reluctor` and `mainSize` come from the notes column. Big-block cranks are filed under Mark IV (2-pc seal) or "
             "Gen VI (1-pc seal). `minRodLength` is Lunati's 'minimum rod length' (counterweight clearance), not a fitment constraint.")
    L.append("- Rods: `bigEnd` is the crank journal diameter (the brief's key), `bigEndWidth` the big-end width. Beam, bolt and bushing "
             "facts come from the series text (Voodoo H-beam ARP2000 7/16; Signature I-beam ARP2000 7/16 cap screws, Ampco 45 bushings; "
             "Racer Series I-beam). The p24 three-row preview duplicates p26 and is merged.")
    L.append("- Skipped: King/Clevite bearing cross-reference (p23, other brands), ARP rod bolts (p25), balancers, tools, apparel, "
             "stock rod-length reference tables.\n")
    L.append(f"## QA ({len(qa)} notes)\n")
    for q in qa:
        L.append(f"- {q}")
    L.append("\n## Validation\n")
    L.append("- OK: no duplicate part numbers within a family, all records have m/p/cat/fit.fam/src, numeric fields are numbers, no empty strings."
             if not errs else "\n".join(f"- ERROR: {e}" for e in errs))
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"PDF not found: {args.pdf}")
    qa = []
    ra_rows, crank_rows, rod_rows = [], [], []
    ci_labels = {}
    with pdfplumber.open(args.pdf) as pdf:
        npages = len(pdf.pages)
        for pno in RA_PAGES:
            rows, labels = parse_ra_page(page_words(pdf.pages[pno - 1]), pno, qa)
            ra_rows.extend(rows)
            ci_labels[pno] = sorted(set(labels))
        for pno in CRANK_PAGES:
            crank_rows.extend(parse_crank_page(page_words(pdf.pages[pno - 1]), pno, qa))
        for pno in ROD_PAGES:
            rod_rows.extend(parse_rod_page(page_words(pdf.pages[pno - 1], keep_right=False), pno, qa))
    crank_recs, cranks_by_pn = crank_records(crank_rows, qa)
    records = ra_records(ra_rows, ci_labels, cranks_by_pn, qa) + crank_recs + rod_records(rod_rows, qa)
    # rotating-assembly component rods that are not in the rod tables
    rod_pns = {r["p"] for r in records if r["cat"] == "rod"}
    missing = sorted({r["spec"]["rodPn"] for r in records if r["cat"] == "rotatingAssembly"} - rod_pns)
    if missing:
        qa.append(f"rod sets used in assemblies but absent from the rod tables: {', '.join(missing)}")
    errs = validate(records)
    os.makedirs(OUT, exist_ok=True)
    out = {"source": {"brand": BRAND, "doc": DOC, "edition": EDITION, "file": os.path.basename(args.pdf), "pages": npages,
                      "note": "manual PDF under Catalogs/ (2013 edition); Edelbrock Group sites are not crawled"},
           "extracted": dt.date.today().isoformat(), "count": len(records), "parts": records}
    with open(os.path.join(OUT, "lunati-ra.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "lunati-ra.md"), args.pdf, npages, records, ra_rows, crank_rows, rod_rows, qa, errs)
    print(f"{len(records)} records ({len({r['p'] for r in records})} unique PNs); RA rows {len(ra_rows)}, crank rows {len(crank_rows)}, "
          f"rod rows {len(rod_rows)}; QA {len(qa)}; errors {len(errs)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
