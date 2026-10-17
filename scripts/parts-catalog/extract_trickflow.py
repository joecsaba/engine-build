#!/usr/bin/env python3
"""Extract Trick Flow Specialties parts from the 2026 PRI catalog PDF (plus the 2017 dealer
cylinder-head comparison sheets) into the shared parts record format.

Sources (local files only; Trick Flow is Summit-owned and its site blocks fetchers, so the
owner saved the PDFs by hand into Catalogs/ at the repo root; nothing is fetched here):

  --pdf     Catalogs/TrickFlow-PRI-Catalog_26.pdf   (2026 catalog, 80 pp, text layer)
  --sheets  Catalogs/tfs_dealer_sheets_rev12.pdf    (2017 dealer comparison sheets, 12 pp)

What is read from the catalog:
  - cylinder head pages: the "Specifications" key:value block (chamber, runner volumes, valves,
    valve angle, spring packages, min bore, related PNs), the assembled part-number listings
    under "... Heads, ... Runners, Assembled" headings, and the ruled "Airflow Results" tables
    (cfm @ 28" H2O)                                                     -> `head`
  - top-end engine kit pages                                            -> `head` with spec.kit
  - Track Max camshaft tables pp 62-63 (+ p34 cam/spring kits)          -> `cam` (with kit PNs)
  - Trick Flow by PAC Racing spring tables pp 64-66, upgrade kits p67   -> `spring`
  - roller rocker arm listings                                          -> `rocker`
  - chromoly pushrod listings p61 and p60 (+ generated build-a-PN lengths) -> `pushrod`
  - hydraulic lifter listings p63                                       -> `lifter`
  - intake manifold listings (specs transcribed from the page prose, PN presence verified) -> `intake`
  - MLS head gasket listing p73 (+ p35)                                 -> `headGasket`
  - 2017 dealer sheets: single-lift flow point attached as `flow` only to heads whose catalog
    page has no ruled flow table (source recorded per record)

Not in the catalog: engine blocks (Trick Flow sells none), bare-casting part numbers (the
pages say bare castings exist but list no PN), advertised duration / lash / lobe numbers.

Output: out/trickflow.json and out/trickflow.md. Writes nothing else. Run with `python -I`.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
DEFAULT_PDF = os.path.join(REPO, "Catalogs", "TrickFlow-PRI-Catalog_26.pdf")
DEFAULT_SHEETS = os.path.join(REPO, "Catalogs", "tfs_dealer_sheets_rev12.pdf")

BRAND = "Trick Flow"
EDITION = "2026"
DOC = "Trick Flow Specialties 2026 PRI catalog PDF (TrickFlow-PRI-Catalog_26.pdf)"
SHEET_DOC = "Trick Flow dealer cylinder head comparison sheets rev12 PDF (2017)"
SHEET_EDITION = "2017-03"

# ----------------------------------------------------------------------------------------------
# families
# ----------------------------------------------------------------------------------------------
SBC = "Small-block Chevy"
BBC = ["Chevy Mark IV big block", "Chevy Gen VI big block"]
LS = "GM LS"
SBF = "Small-block Ford (Windsor)"
CLEVE = "Ford 351C/351M/400"
FE = "Ford FE"
BBF = "Ford 429/460"
MOD = "Ford Modular"
COYOTE = "Ford Coyote"
MOPAR_SB = ["Mopar LA small block", "Mopar Magnum 5.2/5.9"]
MOPAR_BB = "Mopar B/RB big block"
HEMI3_57 = "Chrysler Gen III Hemi 5.7/6.1"
HEMI3_64 = "Chrysler Gen III Hemi 6.2/6.4"
W_SERIES = "Chevy W-series 348/409"
UNIVERSAL = "Universal"
LT1_NOTE = "GM Gen II LT1/LT4 (1992-97 reverse-flow small block); no separate LT1 family in the fitment list"

# catalog page -> (families, fit notes)
HEAD_PAGES = {
    7: ([LS], "GM LS3/L92 square port"), 8: ([LS], "GM LS3/L92 square port"), 9: ([LS], "GM LS7 square port"),
    10: ([LS], "GM LS cathedral port"), 11: ([LS], "GM LS1/LS2 cathedral port"),
    16: ([SBC], LT1_NOTE),
    18: ([SBC], None), 19: ([SBC], None), 20: ([SBC], None), 21: ([SBC], None), 22: ([SBC], None), 23: ([SBC], None),
    25: ([SBC], "18-degree head; needs 18-degree intake, headers, offset shaft rockers and offset-intake roller lifters"),
    28: (BBC, None), 29: (BBC, None),
    32: ([MOD], "Ford 4.6L/5.4L 2V (SOHC), Romeo and Windsor"), 33: ([MOD], "Ford 4.6L/5.4L 2V (SOHC)"),
    38: ([SBF], None), 39: ([SBF], None), 40: ([SBF], None), 41: ([SBF], None),
    49: ([FE], "Ford 390-428 FE"),
    50: ([CLEVE], "Ford 351C, 351M/400; fits 302/351W blocks (Clevor) with minor machining"),
    52: ([BBF], None), 53: ([BBF], "A460-style; 18-bolt pattern; BBC-style exhaust flange"),
    56: (MOPAR_SB, "Chrysler 318/340/360 LA and Magnum (non-emissions)"),
    58: ([MOPAR_BB], None),
}
KIT_PAGES = {12: ([LS], None), 17: ([SBC], LT1_NOTE), 24: ([SBC], None), 31: (BBC, None),
             35: ([MOD], "Ford 4.6L 2V"), 42: ([SBF], None), 59: ([MOPAR_BB], "Chrysler 440-based engines only")}
ROCKER_PAGES = {26: ([SBC], None), 30: (BBC, None), 46: ([SBF], None), 51: ([CLEVE], None),
                55: ([BBF], None), 60: ([MOPAR_BB], None)}

FAM_KEYWORDS = [  # (regex, families) tested against free application text, first match wins per family
    (r"\bGM LS\b|\bLS1\b|\bLS2\b|\bLS3\b|\bLS7\b|\bLSX\b|GenX|L92|LS9", [LS]),
    (r"small block Chev|Super 23|Ultra 18|DHC|Chevy 262-350|Chevy 262-400|283-400|262-454", [SBC]),
    (r"big block Chev|PowerOval|PowerPort®? 320|396-454|396-502|Chevy 396", BBC),
    (r"348/409", [W_SERIES]),
    (r"Ford 5\.0L DOHC|5\.0L 4V|Coyote", [COYOTE]),
    (r"4\.6L|5\.4L|Twisted Wedge®? ?(Track Heat®? )?185|Race 195|modular", [MOD]),
    (r"small block Ford|Twisted Wedge|High Port|289-351W|Ford 5\.0L|260-351W|221-351W|302|351W|1985-95 small block", [SBF]),
    (r"351C|Boss 351|Clev", [CLEVE]),
    (r"390-428|352-428|Ford FE", [FE]),
    (r"429|460|A460|big block Ford|big block .*Ford", [BBF]),
    (r"small block Chrysler|273-360|318-360|Chrysler 318|Mopar LA", MOPAR_SB),
    (r"big block Mopar|383-440|383-400|Chrysler 383|400/440|Chrysler 440|big block .*Chrysler|Chrysler with mechanical", [MOPAR_BB]),
    (r"5\.7L Hemi|6\.1L Hemi", [HEMI3_57]),
    (r"6\.4L Hemi", [HEMI3_64]),
    (r"big block Buick", ["Buick big block"]),
]


def fams_from_text(text):
    """Families named in an application phrase, in a stable order; [] if none."""
    out = []
    for rx, fams in FAM_KEYWORDS:
        if re.search(rx, text, re.I):
            for f in fams:
                if f not in out:
                    out.append(f)
    return out


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
PN_RE = re.compile(r"TFS-[0-9A-Z]{4,12}(?:-[0-9A-Z]{1,7}){0,2}")
PN_LINE_RE = re.compile(r"^(TFS-[0-9A-Z]{4,12}(?:-[0-9A-Z]{1,7}){0,2})[\s*^†‡]*(.*)$")
BOILER_RE = re.compile(r"^(Some parts are not legal|WARNING: For Proposition 65|Click Here)")
NUM_RE = re.compile(r"\d*\.\d+|\d+")


def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def norm_line(s):
    s = s.replace("\t", " ").replace("’", "'").replace("“", '"').replace("”", '"')
    s = s.replace("ﬁ", "fi").replace("ﬂ", "fl")
    s = re.sub(r"(?<=\w)(fi|fl) (?=[a-z])", r"\1", s)  # "Specifi cations", "Airfl ow", "profi led"
    s = re.sub(r"\s+", " ", s).strip()
    return s


def num(s):
    """First number in s as float/int ('.650"' -> 0.65, '280cc' -> 280); None if none."""
    if s is None:
        return None
    m = NUM_RE.search(s.replace(",", ""))
    if not m:
        return None
    v = float(m.group(0))
    return int(v) if v.is_integer() and "." not in m.group(0) else v


def inch(s):
    v = num(s)
    return round(v, 4) if isinstance(v, float) else v


def frac(s):
    m = re.search(r"(\d+)/(\d+)", s)
    return round(int(m.group(1)) / int(m.group(2)), 4) if m else None


def page_lines(doc, pno):
    """Normalized text lines of a 1-based page, boilerplate dropped."""
    raw = doc[pno - 1].get_text()
    out = []
    for ln in raw.splitlines():
        ln = norm_line(ln)
        if ln and not BOILER_RE.match(ln):
            out.append(ln)
    return out


def src(page, doc=DOC, edition=EDITION, **extra):
    d = OrderedDict([("doc", doc), ("edition", edition), ("file", os.path.basename(DEFAULT_PDF) if doc == DOC else os.path.basename(DEFAULT_SHEETS)), ("page", page)])
    d.update(extra)
    return d


def record(p, cat, name, fam, spec, page, notes=None, fit_extra=None, emissions=None, doc=DOC, edition=EDITION, src_extra=None):
    fit = OrderedDict([("fam", fam)])
    if fit_extra:
        fit.update(fit_extra)
    if notes:
        fit["notes"] = notes
    return OrderedDict([
        ("m", BRAND), ("p", p), ("cat", cat), ("name", name), ("fit", fit), ("spec", clean(spec)),
        ("src", src(page, doc, edition, **(src_extra or {}))), ("emissions", emissions),
    ])


# ----------------------------------------------------------------------------------------------
# cylinder heads: specification block
# ----------------------------------------------------------------------------------------------
SPEC_KEYS = [
    "Combustion Chamber Volume", "Intake Port Volume", "Intake Port Location", "Intake Port Dimensions",
    "Intake Gaskets", "Intake Valve Diameter", "Intake Valve Seat", "Exhaust Port Volume", "Exhaust Port Location",
    "Exhaust Port Dimensions", "Exhaust Gaskets", "Exhaust Valve Diameter", "Exhaust Valve Seat", "Valve Angles",
    "Valve Guide Material", "Valve Seals", "Valve Seat Angles", "Valve Spring Pocket Diameter", "Valve Spring Cups",
    "Valve Spring Shims", "Valve Spring I.D. Locators", "Valve Spring Retainers", "Valve Stem Locks", "Valve Springs",
    "Valley Pan Gasket Sets", "Guideplates", "Rocker Arm Studs", "Rocker Shaft Studs", "Rocker Arms",
    "Minimum Bore Diameter", "Cylinder Head Bolts/Studs", "Cylinder Head Bolts", "Cylinder Head Studs",
    "Head Gaskets", "Head Locating Dowels", "Pushrod Length", "Spark Plugs", "Material", "NOTES", "NOTE",
]
SPEC_KEY_RE = re.compile(r"^(" + "|".join(re.escape(k) for k in SPEC_KEYS) + r")\s*(?:,\s*([^:]*))?\s*(:)?\s*(.*)$")
CODE = r"(?:T8T5|[A-Z]{0,2}\d{2,4}|C[0-9OH]\d|CH\d|M\d{2}|T\d{3})(?:-(?:C[0-9OH]\d|CH\d))?"
ALT_RE = re.compile(
    r"(?:(?<=^)|(?<=[ (;,]))((?:" + CODE + r")(?:\s*[/;]\s*(?:" + CODE + r"))*(?: (?:18-bolt|Titanium|Standard|6-Bolt))?"
    r"|PowerPort (?:\d{3}(?:/\d{3})?|Cleveland \d{3})(?: \d{2}(?:/\d{2})*)?(?: (?:Standard|Option \d))?"
    r"|Twisted Wedge(?: Track Heat)? \d{3}(?:, (?:Standard|Optional))?|Track Heat \d{3}(?:, (?:Standard|Optional))?"
    r"|Option \d|Standard|Optional|LA|Magnum)\s*:\s*(?!\d{2}:)")


def split_alternatives(text, first_label=None):
    """'C00: 58cc CNC-profiled C01: 64cc ...' -> [[None, '1.300" ('], ['C00', '58cc ...'], ...]."""
    out = []
    pos = 0
    label = first_label
    for m in ALT_RE.finditer(text):
        seg = text[pos:m.start()].strip(" ;,()")
        if seg or label is not None:
            out.append([label, seg])
        label = m.group(1).strip()
        pos = m.end()
    seg = text[pos:].strip(" ;,()")
    if seg or label is not None:
        out.append([label, seg])
    return [a for a in out if a[1] or a[0] is None] or [[label, ""]]


def spec_block(lines):
    """Lines of the Specifications block (from 'Specifications' to the Viton trademark line)."""
    start = None
    for i, ln in enumerate(lines):
        if ln.lower().startswith("specifications") and any(l.startswith("Material") for l in lines[i + 1:i + 3]):
            start = i + 1
            break
    if start is None:
        return []
    end = len(lines)
    for j in range(start, len(lines)):
        if lines[j].startswith("Viton") and "trademark" in lines[j]:
            end = j
            break
        if re.match(r"^(Airflow Results|Dyno Results)$", lines[j]) and j > start + 20:
            end = j
            break
    return lines[start:end]


def parse_specs(block):
    """-> OrderedDict key -> list of [label or None, value]. Labels are variant codes like 'C01',
    'M54', '01/02/03', 'PowerPort 320', '10-C01'; an unlabeled alternative is the default."""
    raw = OrderedDict()
    key = None
    for ln in block:
        m = SPEC_KEY_RE.match(ln)
        if m and (m.group(3) or not m.group(4)):
            key = m.group(1)
            if key in ("NOTE", "NOTES"):
                key = "NOTE"
            raw.setdefault(key, [])
            qual, rest = (m.group(2) or "").strip(), m.group(4).strip()
            raw[key].append([qual or None, rest])
            continue
        if key is None:
            continue
        if raw[key]:
            raw[key][-1][1] = (raw[key][-1][1] + " " + ln).strip()
        else:
            raw[key].append([None, ln])
    specs = OrderedDict()
    for key, parts in raw.items():
        alts = []
        for qual, text in parts:
            alts += split_alternatives(text, qual)
        specs[key] = alts
    return specs


def pn_tokens(pn):
    """Tokens a variant label may use to name this PN: suffix (C01/M54/CH3), last 2 and 4 chars of
    the base, and 'last-suffix' combinations ('10-C01', 'T541-CH3', '5301-C00')."""
    core = pn[4:]
    base, _, suffix = core.partition("-")
    toks = {base, base[-2:], base[-4:]}
    if suffix:
        toks |= {suffix, base[-2:] + "-" + suffix, base[-4:] + "-" + suffix, base + "-" + suffix}
    return {t.upper() for t in toks if t}


def label_tokens(label):
    lab = re.sub(r"\bCO(\d)\b", r"C\1", label.upper())
    lab = re.sub(r"\b(STANDARD|OPTIONAL|OPTION \d|18-BOLT|TITANIUM|6-BOLT)\b", " ", lab)
    return {t for t in re.split(r"[\s/;,]+", lab) if t}


def resolve(specs, key, pn, product=None, runner=None):
    """Pick the alternative of spec `key` that applies to `pn`. Returns (value, how)."""
    alts = specs.get(key)
    if not alts:
        return None, None
    toks = pn_tokens(pn)
    best, best_score = None, -1
    default = None
    for label, value in alts:
        if label is None:
            default = value if default is None else default + " " + value
            continue
        ltoks = label_tokens(label)
        hit = max((len(t) for t in ltoks & toks), default=0)
        if hit:
            if hit > best_score:
                best, best_score = value, hit
            continue
        if product:
            prod = product.lower()
            lab = re.sub(r"\b(standard|optional|option \d|heads?)\b", "", label.lower()).strip()
            if lab and (lab in prod or prod in lab):
                if 2 > best_score:
                    best, best_score = value, 2
                continue
        if runner and re.fullmatch(r"\d{3}cc", label.strip(), re.I) and int(label[:3]) == runner:
            if 3 > best_score:
                best, best_score = value, 3
    if best is not None:
        return best, "label"
    if default is not None:
        return default, "default"
    return None, "unresolved"


INCH_RE = re.compile(r"\d?\.\d{3,4}\"?(?!\d)")
CC_RE = re.compile(r"(\d{2,3})cc")


def rnum(specs, key, pn, product=None, runner=None, kind="inch"):
    """Numeric spec for pn: the matching alternative's inch or cc figure; falls back to the default
    alternative, then to a figure every alternative shares. -> (number, how)."""
    alts = specs.get(key)
    if not alts:
        return None, None
    rx = INCH_RE if kind == "inch" else CC_RE

    def fig(v):
        m = rx.search(v or "")
        if not m:
            return None
        return inch(m.group(0)) if kind == "inch" else int(m.group(1))
    v, how = resolve(specs, key, pn, product, runner)
    f = fig(v)
    if f is not None:
        return f, how
    for label, value in alts:
        if label is None and fig(value) is not None:
            return fig(value), "default"
    figs = {fig(value) for _, value in alts} - {None}
    if len(figs) == 1:
        return figs.pop(), "common"
    return None, "unresolved"


SPRING_HDR_RE = re.compile(r"(\d?\.\d{3})\"(?:/(\d?\.\d{3})\")?\s*(?:o\.d\.\s*(single|dual|triple|beehive)\b|(single|dual|triple|beehive)\b[^(]*?spring)", re.I)
SPRING_PN_RE = re.compile(r"\((TFS-1\d{4}P?-\d{2})\s*\)")
SEAT_RE = re.compile(r"(\d+) lbs\.? @\s*(\d?\.\d{3})\"? installed", re.I)
OPEN_RE = re.compile(r"(\d+) lbs\.? @\s*(\d?\.\d{3})\"? open", re.I)
RATE_RE = re.compile(r"(\d+) lbs\.? per inch", re.I)
MAXLIFT_RE = re.compile(r"(\d?\.\d{3})\" max", re.I)
DATA_RE = re.compile(r"lbs\.? @|lbs\.? per inch|\" max|^\(TFS-1\d{4}", re.I)


def parse_springs(block):
    """Spring packages named in the Specifications block -> list of dicts with od, type, pn, loads,
    maxLift and a `label` (text of the key qualifier / option lines around the package)."""
    springs = []
    cur = None
    labels = []
    for ln in block:
        km = SPEC_KEY_RE.match(ln)
        is_key = bool(km and (km.group(3) or not km.group(4)))
        hm = SPRING_HDR_RE.search(ln)
        if hm:
            cur = {"od": inch(hm.group(2) or hm.group(1)), "odTop": inch(hm.group(1)) if hm.group(2) else None,
                   "type": (hm.group(3) or hm.group(4)).lower(), "pn": None, "label": " ".join(labels), "_lines": 0}
            lm = re.search(r"([A-Za-z0-9][A-Za-z0-9 /,-]{0,30}?):\s*$", ln[:hm.start()])
            if lm:
                cur["label"] = (cur["label"] + " " + lm.group(1)).strip()
            if is_key and km.group(1) == "Valve Springs" and km.group(2):
                cur["label"] = (cur["label"] + " " + km.group(2)).strip()
            pm = SPRING_PN_RE.search(ln)
            if pm:
                cur["pn"] = pm.group(1)
            springs.append(cur)
            labels = []
            continue
        if cur is not None:
            pm = SPRING_PN_RE.search(ln)
            if pm and cur["pn"] is None:
                cur["pn"] = pm.group(1)
                continue
            sm, om, rm, mm = SEAT_RE.search(ln), OPEN_RE.search(ln), RATE_RE.search(ln), MAXLIFT_RE.search(ln)
            if sm or om or rm or mm:
                if sm:
                    cur["seatLb"], cur["installedHt"] = int(sm.group(1)), inch(sm.group(2))
                if om:
                    cur["openLb"], cur["openHt"] = int(om.group(1)), inch(om.group(2))
                if rm:
                    cur["rate"] = int(rm.group(1))
                if mm:
                    cur["maxLift"] = inch(mm.group(1))
                cur["_lines"] += 1
                continue
        if is_key:
            if km.group(1) == "Valve Springs":
                labels = [km.group(2) or ""] if km.group(2) else []
                if km.group(4):
                    labels.append(km.group(4))
            else:
                if km.group(1) not in ("Valve Spring Retainers", "Valve Stem Locks", "Valve Spring I.D. Locators", "Valve Spring Cups"):
                    cur = None
                labels = []
            continue
        # option / product label lines between packages ("PowerPort 320 Standard:", "Track Heat 185, Optional")
        if cur is not None and cur["_lines"] == 0 and not DATA_RE.search(ln):
            cur["label"] = (cur["label"] + " " + ln).strip()
        elif not DATA_RE.search(ln) and len(ln) < 50:
            labels.append(ln)
            if cur is not None and cur["_lines"] >= 3:
                cur = None
    for s in springs:
        s.pop("_lines", None)
        s["label"] = re.sub(r"[:\s]+", " ", s["label"]).strip()
    return springs


# ----------------------------------------------------------------------------------------------
# cylinder heads: part-number groups
# ----------------------------------------------------------------------------------------------
GROUP_END_RE = re.compile(r"\bAssembled\b")
GROUP_START_RE = re.compile(r"\bHeads?\b.*,|\bHeads?,", re.I)
STYLE_RE = re.compile(r"(CNC Competition Ported|CNC Street Ported|Fast As Cast)", re.I)
TERMINATOR_RE = re.compile(
    r"^(Specifications|Airflow Results|Dyno Results|NOTES?:|Tests conducted|Material:|Cylinder heads? (is|are)|These heads|"
    r"Trick Flow|See How|Exhaust Side|Intake Side|Deck Surface|Combustion Chamber$|Intake Port$|Exhaust Port$|Test Engine|"
    r"\w+ heads are emissions|p|pp|y|C li d|What makes|Get |Don't|Twisted History|\d+ C\.I\.D\.|\w+ Horsepower|Want proof|"
    r"The |It's |Other |Building|Save cash|Take the time|GenX®? Top-End|Super 23®? Top-End|PowerOval®? Top-End)", re.I)
CHAMBER_SUBHEAD_RE = re.compile(r"^(\d{2})cc CNC-Pro\w*led Combustion Chambers$", re.I)


def parse_groups(lines):
    """-> list of {heading, product, style, pns: [(pn, desc, chamberSubhead)]} from the assembled-head listings."""
    groups = []
    i = 0
    n = len(lines)
    while i < n:
        # heading: 1-3 lines ending in "Assembled" that contain "Head"
        joined, j = "", i
        while j < n and j < i + 3:
            joined = (joined + " " + lines[j]).strip()
            if GROUP_END_RE.search(lines[j]):
                break
            j += 1
        if j < n and j < i + 3 and GROUP_END_RE.search(joined) and re.search(r"\bHeads?\b", lines[i]) and not PN_LINE_RE.match(lines[i]) \
                and "Top-End" not in joined and not joined.lower().startswith("cylinder heads are") and "sold" not in joined.lower():
            heading = re.sub(r"\s+", " ", joined)
            g = {"heading": heading, "pns": [], "page_line": i}
            sm = STYLE_RE.search(heading)
            g["style"] = sm.group(1) if sm else None
            prod = re.split(r"\s+(?:Cylinder\s+)?Heads?\b", heading)[0].strip()
            g["product"] = re.sub(r"®|™", "", prod).strip()
            rm = re.search(r"(\d{3})cc Intake Runners", heading, re.I)
            g["runner"] = int(rm.group(1)) if rm else None
            g["emissionsLegal"] = bool(re.search(r"Emissions Legal", heading, re.I))
            g["nonEmissions"] = bool(re.search(r"Non-Emissions", heading, re.I))
            k = j + 1
            chamber_sub = None
            while k < n:
                ln = lines[k]
                cm = CHAMBER_SUBHEAD_RE.match(ln)
                if cm:
                    chamber_sub = int(cm.group(1))
                    k += 1
                    continue
                pm = PN_LINE_RE.match(ln)
                if pm:
                    pn, desc = pm.group(1), pm.group(2).strip()
                    k += 1
                    taken = 0
                    while k < n and taken < 3 and not PN_LINE_RE.match(lines[k]) and not TERMINATOR_RE.match(lines[k]) \
                            and not CHAMBER_SUBHEAD_RE.match(lines[k]) and not GROUP_END_RE.search(lines[k]) \
                            and (desc == "" or desc.endswith(",") or re.match(r"^[a-z0-9(]", lines[k]) or "runners" in lines[k]):
                        desc = (desc + " " + lines[k]).strip()
                        k += 1
                        taken += 1
                    g["pns"].append((pn, desc, chamber_sub))
                    continue
                break
            if g["pns"]:
                groups.append(g)
            i = k
            continue
        i += 1
    return groups


# ----------------------------------------------------------------------------------------------
# cylinder heads: flow tables (pdfplumber, ruled)
# ----------------------------------------------------------------------------------------------
def page_flow_tables(ppage, qa):
    """Ruled 'Lift Value | Intake Flow CFM | Exhaust Flow CFM' tables on a pdfplumber page ->
    list of {title, footnote, rows:[(lift,int,exh)], bbox}."""
    out = []
    for t in ppage.find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"}):
        rows = t.extract()
        flat = [[(c or "").strip() for c in r] for r in rows]
        if not any("Lift Value" in " ".join(r) for r in flat):
            continue
        title, footnote, pts = None, None, []
        for r in flat:
            cells = [c for c in r if c]
            if not cells:
                continue
            txt = " ".join(cells)
            if "Tests conducted" in txt or "Bore size" in txt:
                footnote = norm_line(txt)
                continue
            if "Results" in txt and "Lift Value" not in txt:
                title = norm_line(txt.split("\n")[-1])
                continue
            if "Results" in txt:
                title = norm_line(txt.split("\n")[1]) if len(txt.split("\n")) > 2 else None
            if len(r) >= 3:
                lifts = [norm_line(x) for x in r[0].split("\n")]
                ints = [norm_line(x) for x in r[1].split("\n")]
                exhs = [norm_line(x) for x in r[2].split("\n")]
                for l, a, b in zip(lifts, ints, exhs):
                    if re.fullmatch(r"\.\d{3}\"?", l) and a.isdigit() and b.isdigit():
                        pts.append((inch(l), int(a), int(b)))
        x0, top, x1, bottom = t.bbox
        if title is None:
            above = ppage.crop((max(0, x0 - 5), max(0, top - 42), min(ppage.width, x1 + 5), top)).extract_text() or ""
            cand = [norm_line(l) for l in above.splitlines() if norm_line(l) and "Results" not in norm_line(l) and "Airfl" not in l
                    and "Lift Value" not in l and "Flow CFM" not in l]
            title = cand[-1] if cand else None
        if footnote is None:
            below = ppage.crop((max(0, x0 - 5), bottom, min(ppage.width, x1 + 5), min(ppage.height, bottom + 36))).extract_text() or ""
            fn = " ".join(norm_line(l) for l in below.splitlines())
            footnote = fn if "Tests conducted" in fn or "Bore size" in fn else None
        if pts:
            out.append({"title": title, "footnote": footnote, "rows": pts, "bbox": t.bbox})
        else:
            qa.append(f"p{ppage.page_number}: flow table without parsable rows")
    return out


NOISE = {"square", "port", "cathedral", "with", "for", "and", "&", "chambers", "combustion", "cnc-profiled", "heads", "head", "the"}


def tokens(s):
    s = re.sub(r"®|™", "", s or "").lower().replace(",", " ")
    return {t for t in re.split(r"\s+", s) if t and t not in NOISE}


def flow_matches(ft, product, chamber, desc, intake_valve):
    """Does a page flow table apply to a head variant?"""
    tt = tokens(ft["title"] or "")
    tt = {t for t in tt if not re.fullmatch(r"\d{2}cc", t) and t not in ("ford", "351c", "351m/400", "clevor")}
    pt = tokens(product)
    dt_ = tokens(desc)
    for t in tt:
        if t in pt:
            continue
        if re.fullmatch(r"ls[1-7x]|lsx", t) and t in dt_:
            continue
        if t in ("hip", "hd") and t in pt:
            continue
        return False
    text = (ft["title"] or "") + " " + (ft["footnote"] or "")
    ccs = [int(x) for x in re.findall(r"(\d{2})cc", text)]
    if ccs and chamber not in ccs:
        return False
    vm = re.search(r"intake valve: (\d\.\d{3})", text)
    if vm and intake_valve and abs(float(vm.group(1)) - intake_valve) > 0.001:
        return False
    return True


# ----------------------------------------------------------------------------------------------
# cylinder heads: build records
# ----------------------------------------------------------------------------------------------
SPRING_DESC_RE = re.compile(r"(\d\.\d{3})\" (single|dual|triple) (?:valve )?springs?(?: \((\d+) lbs\./in\.\))?", re.I)
SEAT_DESC_RE = re.compile(r"(\d+) lb\. (beehive|dual|single)", re.I)


def pick_spring(springs, desc, pn, product, runner, qa_local):
    if not springs:
        return None
    m = SPRING_DESC_RE.search(desc)
    if m:
        od, typ, rate = float(m.group(1)), m.group(2).lower(), int(m.group(3)) if m.group(3) else None
        cands = [s for s in springs if s["od"] is not None and abs(s["od"] - od) < 0.003 and s["type"] == typ]
        if not cands:  # listings round 1.545 to 1.550
            cands = [s for s in springs if s["od"] is not None and abs(s["od"] - od) < 0.006 and s["type"] == typ]
        if rate:
            rc = [s for s in cands if s.get("rate") and abs(s["rate"] - rate) <= 2]
            cands = rc or cands
        if len(cands) >= 1:
            if len(cands) > 1:
                qa_local.append("several spring packages match the listing text; first used")
            return cands[0]
        qa_local.append(f"listing names a {m.group(1)} {typ} spring not in the Specifications block")
    m = SEAT_DESC_RE.search(desc)
    if m:
        seat, typ = int(m.group(1)), m.group(2).lower()
        cands = [s for s in springs if s.get("seatLb") == seat and s["type"] == typ]
        if cands:
            return cands[0]
    m = re.search(r"\((\d+) lbs\./in\.\)", desc)
    if m:
        cands = [s for s in springs if s.get("rate") and abs(s["rate"] - int(m.group(1))) <= 2]
        if cands:
            return cands[0]
    toks = pn_tokens(pn)
    coded = []
    for s in springs:
        lt = label_tokens(s["label"])
        if lt & toks:
            coded.append(s)
        elif runner and f"{runner}CC" in lt:
            coded.append(s)
    if coded:
        return coded[0]
    if product:
        prod = product.lower()
        named = [s for s in springs if s["label"] and re.sub(r"\b(standard|optional|option \d)\b", "", s["label"].lower()).strip() in prod]
        if named:
            std = [s for s in named if "standard" in s["label"].lower()]
            if len(named) > 1:
                qa_local.append("spring package assumed = standard package for this product")
            return (std or named)[0]
    if len(springs) == 1:
        return springs[0]
    std = [s for s in springs if "standard" in s["label"].lower()]
    if std:
        qa_local.append("spring package not named in the listing; standard package assumed")
        return std[0]
    qa_local.append("spring package not named in the listing; first package assumed")
    return springs[0]


def related_pns(specs, key, pn, product=None):
    v, _ = resolve(specs, key, pn, product)
    if not v:
        return None
    pns = re.findall(r"(?:TFS|ARP|Fel-Pro|GM|Mr\. Gasket|SCE Gaskets|Harland Sharp|Motorcraft|Autolite|NGK)[ -][0-9A-Za-z./-]+", v)
    return pns or None


# corrections for catalog typos / omissions on specific part numbers (each one is cited in the notes)
OVERRIDES = {
    "TFS-30410010": {"valveAngle": 23, "qa": "valve angle: Specifications block labels the 23° line '01' instead of '10'; page text says the GenX 195 retains the stock 23° valve angle"},
}
for _pn in ("TFS-5171T010-C01", "TFS-51710012-C01", "TFS-5171T012-C01", "TFS-5171T013-C01", "TFS-5171T016-C02", "TFS-5171T018-C02"):
    OVERRIDES[_pn] = {"exhaustRunnerCc": 95, "qa": "p41 Specifications block prints the 95cc exhaust port volume under a blank key and omits the intake valve diameter line"}


def build_heads(doc, pdf, sheet_index, qa, skipped):
    heads = []
    flow_tables_all = {}
    for pno, (fams, fnote) in HEAD_PAGES.items():
        lines = page_lines(doc, pno)
        block = spec_block(lines)
        if not block:
            qa.append(f"p{pno}: no Specifications block found")
        specs = parse_specs(block)
        springs = parse_springs(block)
        groups = parse_groups(lines)
        fts = page_flow_tables(pdf.pages[pno - 1], qa)
        flow_tables_all[pno] = [dict(t, used=0) for t in fts]
        title = next((l for l in lines if re.search(r"Cylinder Heads? for ", l)), next((l for l in lines[:6] if "Cylinder Head" in l), lines[0]))
        carb = re.search(r"CARB E\.O\. #(D-\d+(?:-\d+)?)", " ".join(lines))
        if not groups:
            qa.append(f"p{pno}: no assembled part-number listing found")
        page_desc_tokens = set()
        for g in groups:
            for _pn, d, _c in g["pns"]:
                page_desc_tokens |= tokens(d)
        seen = set()
        for g in groups:
            product = g["product"]
            series = None
            if re.search(r"\d+,|\d+ and \d+", product):  # "GenX 215, 225, 235, and 245" / "GenX 185 and 195"
                series = re.split(r"\s+\d", product)[0]
            for pn, desc, chamber_sub in g["pns"]:
                if pn in seen:
                    continue
                seen.add(pn)
                ql = []
                rm = re.search(r"(\d{3})cc intake runners?", desc, re.I)
                runner = int(rm.group(1)) if rm else g["runner"]
                prod = f"{series} {runner}" if series and runner else product
                if runner is None:
                    runner, _ = rnum(specs, "Intake Port Volume", pn, prod, kind="cc")
                    if runner is None:
                        ql.append("intake runner volume unresolved")
                cm = re.search(r"(\d{2})cc combustion chambers?", desc, re.I)
                if cm:
                    chamber = int(cm.group(1))
                elif chamber_sub:
                    chamber = chamber_sub
                else:
                    v, how = resolve(specs, "Combustion Chamber Volume", pn, prod)
                    chamber = None
                    if v and not re.search(r"\d+cc/\d+cc", v):
                        chamber, how = rnum(specs, "Combustion Chamber Volume", pn, prod, kind="cc")
                    if chamber is None:
                        ql.append("chamber volume unresolved")
                    elif how == "default" and len(specs.get("Combustion Chamber Volume", [])) > 1:
                        ql.append("chamber volume taken from the unlabeled default")
                exh_runner, _ = rnum(specs, "Exhaust Port Volume", pn, prod, kind="cc")
                ivm = re.search(r"(\d\.\d{3})\" (?:titanium )?intake valves", desc)
                if ivm:
                    iv = float(ivm.group(1))
                else:
                    iv, _ = rnum(specs, "Intake Valve Diameter", pn, prod)
                xv, _ = rnum(specs, "Exhaust Valve Diameter", pn, prod)
                sp = pick_spring(springs, desc, pn, prod, runner, ql)
                v, _ = resolve(specs, "Valve Angles", pn, prod)
                va = None
                va_note = None
                if v:
                    if re.fullmatch(r"\d+(\.\d+)?°", v.strip()):
                        va = num(v)
                    else:
                        va_note = v
                min_bore, _ = rnum(specs, "Minimum Bore Diameter", pn, prod)
                for k2, v2 in OVERRIDES.get(pn, {}).items():
                    if k2 == "valveAngle":
                        va = v2
                    elif k2 == "exhaustRunnerCc":
                        exh_runner = v2
                    elif k2 == "qa":
                        ql.append(v2)
                mat, _ = resolve(specs, "Material", pn, prod)
                mat = re.sub(r"A-356", "A356", mat).strip().replace("Aluminum", "aluminum") if mat else None
                ipd, _ = resolve(specs, "Intake Port Dimensions", pn, prod)
                epl, _ = resolve(specs, "Exhaust Port Location", pn, prod)
                ipl, _ = resolve(specs, "Intake Port Location", pn, prod)
                style = g["style"]
                if style is None:
                    v, _ = resolve(specs, "Intake Port Volume", pn, prod)
                    sm = STYLE_RE.search(v or "")
                    style = sm.group(1) if sm else None
                titanium = "titanium retainers" in desc.lower() or (len(pn) > 8 and pn[8] == "T")
                rel = OrderedDict()
                for key, name in (("Cylinder Head Bolts", "headBolts"), ("Cylinder Head Bolts/Studs", "headBolts"), ("Cylinder Head Studs", "headStuds"),
                                  ("Head Gaskets", "headGasket"), ("Intake Gaskets", "intakeGasket"), ("Exhaust Gaskets", "exhaustGasket"),
                                  ("Rocker Arms", "rockers"), ("Guideplates", "guideplates"), ("Rocker Arm Studs", "rockerStuds"),
                                  ("Rocker Shaft Studs", "rockerShaftStuds"), ("Valve Spring Retainers", "retainers"), ("Valve Stem Locks", "locks")):
                    pns = related_pns(specs, key, pn, prod)
                    if pns and name not in rel:
                        rel[name] = pns
                plugs, _ = resolve(specs, "Spark Plugs", pn, prod)
                if plugs:
                    rel["sparkPlug"] = plugs
                # flow
                flow = None
                flow_src = None
                flow_extra = {}
                for ft in flow_tables_all[pno]:
                    if flow_matches(ft, prod, chamber, desc, iv):
                        flow = [OrderedDict([("lift", l), ("int", a), ("exh", b)]) for l, a, b in ft["rows"]]
                        ft["used"] += 1
                        flow_src = "catalog"
                        fn = ft["footnote"] or ""
                        bm = re.search(r"Bore size:? (\d\.\d{3})", fn)
                        if bm:
                            flow_extra["flowBore"] = float(bm.group(1))
                        pm = re.search(r"exhaust with ([\d⁄/ ]+)\" pipe", fn)
                        if pm:
                            pipe = pm.group(1).replace("⁄", "/").strip()  # "13/4" is the glyph run for 1 3/4
                            pipe = re.sub(r"^(\d)\s?(\d)/(\d)$", r"\1-\2/\3", pipe)
                            flow_extra["flowExhaustPipe"] = pipe + '"'
                        break
                if flow is None and sheet_index is not None:
                    hit = sheet_lookup(sheet_index, fams, prod, runner, chamber, desc, style, title, page_desc_tokens)
                    if hit:
                        flow = [OrderedDict([("lift", hit["lift"]), ("int", hit["int"]), ("exh", hit["exh"])])]
                        flow_src = "sheet"
                        flow_extra["flowNote"] = f"single-lift figure from the 2017 dealer comparison sheet p{hit['page']} ({hit['name']}); no curve printed in the 2026 catalog"
                        hit["used"] += 1
                spec = OrderedDict([
                    ("chamberCc", chamber), ("intakeRunnerCc", runner), ("exhaustRunnerCc", exh_runner),
                    ("intakeValve", iv), ("exhaustValve", xv),
                    ("maxLift", sp.get("maxLift") if sp else None), ("springDia", sp.get("od") if sp else None),
                    ("valveAngle", va), ("valveAngleNote", va_note),
                    ("portStyle", style), ("intakePortDims", ipd), ("intakePortLocation", ipl if ipl and ipl.lower() not in ("stock", "standard") else None),
                    ("exhaustPortLocation", epl if epl and epl.lower() != "stock" else None),
                    ("minBore", min_bore), ("material", mat), ("bare", False), ("per", 1),
                    ("titaniumRetainers", True if titanium else None), ("sixBolt", True if re.search(r"6-bolt", desc, re.I) else None),
                    ("hd", True if re.search(r"\bHD\b", g["heading"]) else None),
                    ("carbEo", carb.group(1) if carb and (g["emissionsLegal"] or not (g["nonEmissions"] or any(x["emissionsLegal"] for x in groups))) else None),
                ])
                if sp:
                    spec["spring"] = clean(OrderedDict([("pn", sp.get("pn")), ("od", sp.get("od")), ("type", sp["type"]), ("dual", sp["type"] == "dual"),
                                                        ("seatLb", sp.get("seatLb")), ("installedHt", sp.get("installedHt")), ("openLb", sp.get("openLb")),
                                                        ("openHt", sp.get("openHt")), ("rate", sp.get("rate")), ("maxLift", sp.get("maxLift"))]))
                    if len(springs) > 1:
                        spec["springOptions"] = sorted({s["pn"] for s in springs if s.get("pn")})
                if flow:
                    spec["flow"] = flow
                    spec["flowDepression"] = 28
                    spec.update(flow_extra)
                if rel:
                    spec["related"] = rel
                if ql:
                    spec["qa"] = ql
                    for q in ql:
                        qa.append(f"p{pno} {pn}: {q}")
                name = f"{prod}, {chamber} cc chamber, {runner} cc intake runner" if chamber and runner else f"{prod}, {desc}"
                if style:
                    name += f", {style}"
                name += ", assembled"
                if titanium:
                    name += ", titanium retainers"
                notes = fnote
                dm = re.search(r"^(LS[1-7X]|LSX|4\.8L/5\.3L/5\.7L \(Vortec\)|Naturally aspirated engines|Forced induction engines)", desc)
                if dm:
                    notes = (notes + "; " if notes else "") + dm.group(1)
                if g["emissionsLegal"]:
                    notes = (notes + "; " if notes else "") + "emissions-legal version"
                for fam in fams:
                    r = record(pn, "head", name, fam, dict(spec), pno, notes=notes, fit_extra={"cyl": 8})
                    r["src"]["section"] = title
                    if flow_src == "sheet":
                        r["src"]["flowSource"] = f"{SHEET_DOC}, p{hit['page']}"
                    heads.append(r)
    unused = []
    for pno, fts in flow_tables_all.items():
        for ft in fts:
            if not ft["used"]:
                unused.append(f"p{pno}: flow table '{ft['title']}' matched no part number")
    return heads, unused


# ----------------------------------------------------------------------------------------------
# dealer sheets (2017): single-lift flow points
# ----------------------------------------------------------------------------------------------
SERIES_RE = re.compile(r"GenX|Super 23|Ultra 18|PowerOval|PowerPort|Twisted Wedge|High Port|Flathead", re.I)
SHEET_FAMS = {"Big Block Mopar": [MOPAR_BB], "GM LS": [LS], "GM LT1": [SBC], "Small Block Chevrolet": [SBC], "Big Block Chevrolet": BBC,
              "Ford 4.6L/5.4L 2V": [MOD], "Ford 351C, 351M/400, and 351 Clevor": [CLEVE], "Small Block Ford": [SBF], "Ford 429/460": [BBF],
              "Ford and Mercury Flathead V8": ["Ford Flathead V8"]}


def parse_sheets(path, qa):
    import pymupdf
    doc = pymupdf.open(path)
    entries = []
    for pno in range(1, len(doc) + 1):
        lines = [norm_line(l) for l in doc[pno - 1].get_text().splitlines()]
        lines = [l for l in lines if l]
        fam_title = next((l for l in lines if l.startswith("Cylinder Head")), "")
        fam_key = re.sub(r"^Cylinder Head (Comparison )?Sheet ", "", fam_title).strip()
        fams = SHEET_FAMS.get(fam_key)
        if fams is None:
            qa.append(f"sheet p{pno}: unknown family heading '{fam_key}'")
            fams = []
        hm = re.search(r"@ \.(\d{3})\" Valve Lift", " ".join(lines))
        default_lift = float("0." + hm.group(1)) if hm else None
        i = 0
        last_bullet = -1
        while i < len(lines):
            ln = lines[i]
            if ln.startswith("•"):
                last_bullet = i
            rm = re.match(r"^(\d{3})cc\b", ln)
            if rm and i > 0:
                # product name: lines after the last bullet (or the "Use" header) containing a series word onwards
                start = max(last_bullet, next((k for k in range(i - 1, -1, -1) if lines[k] == "Use"), -1)) + 1
                seg = lines[start:i]
                k0 = next((k for k, l in enumerate(seg) if SERIES_RE.search(l)), None)
                if k0 is None:
                    i += 1
                    continue
                name = re.sub(r"®", "", " ".join(seg[k0:])).strip()
                runner = int(rm.group(1))
                j = i + 1
                chambers = []
                while j < len(lines) and '" intake' not in lines[j] and "intake:" not in lines[j]:
                    chambers += [int(x) for x in re.findall(r"(\d{2,3})cc", lines[j])]
                    j += 1
                # flow points
                pts = []
                lift = default_lift
                k = j
                while k < len(lines) and not lines[k].startswith("•") and k < j + 14:
                    l = lines[k]
                    m = re.match(r"^(\d{3}) ?cfm intake", l)
                    if m and k + 1 < len(lines):
                        m2 = re.match(r"^(\d{3}) ?cfm exhaust", lines[k + 1])
                        if m2:
                            qual = None
                            if k >= 1 and lines[k - 1].endswith("Ported:"):
                                qual = lines[k - 1][:-1]
                            pts.append({"qual": qual, "int": int(m.group(1)), "exh": int(m2.group(1))})
                            k += 2
                            continue
                    if l == "Intake:":
                        k += 1
                        while k < len(lines) and re.match(r"^(\d{2})cc / (\d{3}) cfm", lines[k]):
                            mm = re.match(r"^(\d{2})cc / (\d{3}) cfm", lines[k])
                            pts.append({"qual": int(mm.group(1)), "int": int(mm.group(2)), "exh": None})
                            k += 1
                        continue
                    if l == "Exhaust:":
                        k += 1
                        while k < len(lines) and re.match(r"^(\d{2})cc / (\d{3}) cfm", lines[k]):
                            mm = re.match(r"^(\d{2})cc / (\d{3}) cfm", lines[k])
                            for p in pts:
                                if p["qual"] == int(mm.group(1)):
                                    p["exh"] = int(mm.group(2))
                            k += 1
                        continue
                    lm = re.search(r"\(@ \.(\d{3})\" [Vv]alve [Ll]ift", l)
                    if lm:
                        lift = float("0." + lm.group(1))
                    k += 1
                for p in pts:
                    if p["exh"] is None:
                        continue
                    entries.append({"page": pno, "fams": fams, "name": name, "runner": runner, "chambers": chambers,
                                    "qual": p["qual"], "lift": lift, "int": p["int"], "exh": p["exh"], "used": 0})
                i = k
                continue
            i += 1
    return entries


def sheet_lookup(entries, fams, product, runner, chamber, desc, style, title="", page_desc_tokens=frozenset()):
    best, best_n = None, -1
    pt = tokens(product)
    dt_ = tokens(desc)
    tt = tokens(title)
    for e in entries:
        if not set(e["fams"]) & set(fams) or e["runner"] != runner:
            continue
        et = {t for t in tokens(e["name"]) if t not in ("standard", "cast", "profiled", "cnc-profiled")}
        core = {t for t in et if not re.fullmatch(r"ls[1-7x]|lsx|4\.8l/5\.3l/5\.7l|\(vortec\)", t)}
        if not core <= pt:
            continue
        eng = et - core
        if eng and not (eng & dt_):
            # engine named only in the page title ("... for GM LS3") is fine when no listing line names an engine
            if not (eng & tt) or (eng & page_desc_tokens):
                continue
        if isinstance(e["qual"], int):
            if e["qual"] != chamber:
                continue
        elif e["qual"] and style and e["qual"].lower() != style.lower():
            continue
        if e["chambers"] and chamber and chamber not in e["chambers"] and not isinstance(e["qual"], int):
            continue
        n = len(core) + (1 if isinstance(e["qual"], int) or e["qual"] else 0)
        if n > best_n:
            best, best_n = e, n
    return best


# ----------------------------------------------------------------------------------------------
# generic "PN  description" listings
# ----------------------------------------------------------------------------------------------
def items(lines, start=0, end=None):
    """(index, pn, desc) for every part-number line; a description on the next line(s) is joined
    while the text so far is empty or ends with a comma."""
    end = len(lines) if end is None else end
    i = start
    while i < end:
        m = PN_LINE_RE.match(lines[i])
        if not m:
            i += 1
            continue
        pn, desc = m.group(1), m.group(2).strip()
        j = i + 1
        while j < end and (desc == "" or desc.endswith(",") or ("set of" not in desc and re.match(r"^[A-Za-z+].{0,40}set of \d+$", lines[j]))) \
                and not PN_LINE_RE.match(lines[j]) and j <= i + 3:
            desc = (desc + " " + lines[j]).strip()
            j += 1
        yield i, pn, desc
        i = j


def pn_list(cell):
    return [p.rstrip("*^") for p in PN_RE.findall(cell or "")]


def rpm_range(text):
    m = re.search(r"(\d{1,2},\d{3}|\d{3,4}|Idle)-(\d{1,2},\d{3}|\d{3,4}) RPM(?: plus)? powerband", text, re.I)
    if not m:
        return None, None
    lo = 0 if m.group(1).lower() == "idle" else int(m.group(1).replace(",", ""))
    return lo, int(m.group(2).replace(",", ""))


# ----------------------------------------------------------------------------------------------
# camshafts (ruled tables pp 62-63, cam/spring kits p34)
# ----------------------------------------------------------------------------------------------
CAM_TYPES = [("Mechanical Roller", "solid_roller"), ("Hydraulic Roller", "hydraulic_roller"), ("Hydraulic Flat Tappet", "hydraulic_flat")]
CAM_OVERRIDES = {
    "TFS-61602003": {"dur050Int": 243, "dur050Exh": 247, "rr": 1.5,
                     "qa": "p63 summary table prints 234/247 @ .050 and lift w/1.7 rockers; the product page (p60) prints 243/247 and lift w/1.5 rockers; p60 figures kept"},
}


def cam_table_rows(ppage):
    """Yield (section_heading, header_text, cells) for data rows of the cam tables on a page."""
    for t in ppage.find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"}):
        section, header = None, ""
        for row in t.extract():
            cells = [norm_line(c) for c in row if c and norm_line(c)]
            if not cells:
                continue
            joined = " ".join(cells)
            if cells[0].startswith("TFS-"):
                if section:
                    yield section, header, cells
                continue
            if "Camshaft" in joined and "Part Number" not in joined and len(cells) <= 2:
                section, header = joined, ""
                continue
            header += " " + joined


def build_cams(doc, pdf, qa):
    recs = []
    seen = {}
    product_chars = {}  # PN -> characteristics text from the per-family product pages
    for pno in (13, 17, 26, 31, 34, 46, 60):
        for t in pdf.pages[pno - 1].find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"}):
            for row in t.extract():
                cells = [norm_line(c) for c in row if c and norm_line(c)]
                if cells and cells[0].startswith("TFS-") and len(cells) > 2:
                    for pn in PN_RE.findall(cells[0]):
                        product_chars[pn] = max(cells[1:], key=len)
    for pno in (62, 63):
        for section, header, cells in cam_table_rows(pdf.pages[pno - 1]):
            ctype = next((v for k, v in CAM_TYPES if k.lower() in section.lower()), None)
            fams = fams_from_text(section)
            notes = None
            if "LT1" in section:
                fams, notes = [SBC], LT1_NOTE
            if not fams or ctype is None:
                qa.append(f"p{pno}: cam section '{section}' not mapped (family or type)")
                continue
            rm = re.search(r"w/\s*(\d\.\d+)\s*Ratio", header)
            rr = float(rm.group(1)) if rm else None
            oem_follower = "Followers" in header or fams == [MOD]
            if oem_follower:
                rr = None
            dur = next((c for c in cells if re.fullmatch(r"\d+\u00b0/\d+\u00b0", c)), None)
            lift = next((c for c in cells if re.fullmatch(r"\.\d{3}\"/\.\d{3}\"", c)), None)
            lsa = next((c for c in cells if re.fullmatch(r"\d+\u00b0", c)), None)
            if not (dur and lift and lsa):
                qa.append(f"p{pno} {cells[0]}: cam row missing duration/lift/LSA")
                continue
            li = cells.index(lsa)
            chars = max(cells[1:li], key=len) if li > 1 else ""
            tail = cells[li + 1:]
            kit = OrderedDict()
            for key, cell in zip(("springs", "retainers", "locks", "springKits"), tail):
                pns = pn_list(cell)
                if pns:
                    kit[key] = pns
            lo, hi = rpm_range(chars)
            if lo is None:  # the summary tables drop the powerband on some rows; the product-page table has it
                lo, hi = rpm_range(product_chars.get(PN_RE.findall(cells[0])[0], ""))
            cm = re.search(r"Compression: ([\d.]+):1", chars)
            idle = re.search(r"(Excellent|Good|Fair|Rough|Lopey) idle", chars)
            d1, d2 = (int(x) for x in re.findall(r"\d+", dur)[:2])
            l1, l2 = (float(x) for x in re.findall(r"\.\d{3}", lift)[:2])
            pns = PN_RE.findall(cells[0])
            cam_pn = next((p for p in pns if not p.startswith("TFS-K")), pns[0])
            for pn in pns:
                spec = OrderedDict([
                    ("dur050Int", d1), ("dur050Exh", d2), ("valveLiftInt", l1), ("valveLiftExh", l2), ("lsa", int(re.match(r"\d+", lsa).group(0))),
                    ("rr", rr), ("type", ctype), ("rpmLow", lo), ("rpmHigh", hi),
                    ("minCompression", float(cm.group(1)) if cm else None), ("idle", idle.group(1).lower() if idle else None),
                    ("series", "Track Max"),
                ])
                if oem_follower:
                    spec["liftNote"] = "valve lift measured with OEM roller followers (SOHC); no rocker ratio"
                if "1987-95 OEM hydraulic roller" in chars:
                    spec["fitNote"] = "1987-95 factory hydraulic roller cam blocks only"
                if "3-bolt" in chars:
                    spec["camGear"] = "3-bolt"
                k = OrderedDict(kit)
                if pn.startswith("TFS-K"):
                    k = OrderedDict([("cam", cam_pn), ("lifters", "included (camshaft/lifter kit)")] + list(kit.items()))
                if k:
                    spec["kit"] = k
                for k2, v2 in CAM_OVERRIDES.get(pn, {}).items():
                    if k2 == "qa":
                        spec["qa"] = [v2]
                        qa.append(f"p{pno} {pn}: {v2}")
                    else:
                        spec[k2] = v2
                tname = {"hydraulic_roller": "hydraulic roller", "hydraulic_flat": "hydraulic flat tappet", "solid_roller": "mechanical roller"}[ctype]
                name = f"Track Max {tname} cam{' and lifter kit' if pn.startswith('TFS-K') else ''}, {spec['dur050Int']}/{spec['dur050Exh']} @ .050, " \
                       f"{l1:.3f}/{l2:.3f} lift, {spec['lsa']} LSA"
                for fam in fams:
                    if (pn, fam) in seen:
                        continue
                    seen[(pn, fam)] = True
                    recs.append(record(pn, "cam", name, fam, spec, pno, notes=notes, src_extra={"section": section}))
    # p34: Ford 4.6L/5.4L 2V camshaft + valve spring upgrade kits
    for t in pdf.pages[33].find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"}):
        rows = t.extract()
        if not any("Valve Spring Upgrade Kit" in " ".join(c or "" for c in r) for r in rows[:2]):
            continue
        for row in rows:
            cells = [norm_line(c) for c in row if c and norm_line(c)]
            if not cells or not cells[0].startswith("TFS-K"):
                continue
            dur = next((c for c in cells if re.fullmatch(r"\d+\u00b0/\d+\u00b0", c)), None)
            lift = next((c for c in cells if re.fullmatch(r"\.\d{3}\"/\.\d{3}\"", c)), None)
            lsa = next((c for c in cells if re.fullmatch(r"\d+\u00b0", c)), None)
            spring = next((c for c in cells if c.startswith("TFS-16")), None)
            chars = max(cells[1:], key=len)
            d1, d2 = (int(x) for x in re.findall(r"\d+", dur)[:2])
            l1, l2 = (float(x) for x in re.findall(r"\.\d{3}", lift)[:2])
            base = next((r for r in recs if r["fit"]["fam"] == MOD and r["spec"]["dur050Int"] == d1 and r["spec"]["valveLiftInt"] == l1), None)
            lo, hi = rpm_range(chars)
            spec = OrderedDict([("dur050Int", d1), ("dur050Exh", d2), ("valveLiftInt", l1), ("valveLiftExh", l2), ("lsa", int(lsa[:-1])),
                                ("type", "hydraulic_roller"), ("rpmLow", lo), ("rpmHigh", hi), ("series", "Track Max"),
                                ("liftNote", "valve lift measured with OEM roller followers (SOHC); no rocker ratio"),
                                ("kit", clean(OrderedDict([("cam", base["p"] if base else None), ("springs", [spring] if spring else None),
                                                           ("includes", "camshafts, valve springs, chromoly retainers, locks, seals")])))])
            if base is None:
                qa.append(f"p34 {cells[0]}: no matching cam-only part number for this kit")
            name = f"Track Max hydraulic roller cam and valve spring kit, {d1}/{d2} @ .050, {l1:.3f}/{l2:.3f} lift, {spec['lsa']} LSA"
            recs.append(record(cells[0], "cam", name, MOD, spec, 34, notes="Ford 4.6L/5.4L 2V (SOHC)"))
    return recs


# ----------------------------------------------------------------------------------------------
# valve springs (ruled tables pp 64-67)
# ----------------------------------------------------------------------------------------------
LOAD_RE = re.compile(r"^(\d+) @ (\d?\.\d{3})$")


def tb_pair(cell):
    """'T: .862 / B: 1.025' -> (top, bottom); plain '1.250' -> (None, 1.250)."""
    m = re.search(r"T:\s*(\d?\.\d{3}).*B:\s*(\d?\.\d{3})", cell)
    if m:
        return inch(m.group(1)), inch(m.group(2))
    return None, inch(cell)


def pn_or_text(cell):
    pns = pn_list(cell)
    if pns:
        return pns
    if cell in ("\u2014", "-", ""):
        return None
    return cell


def build_springs(pdf, qa):
    recs = []
    for pno in (64, 65, 66, 67):
        for t in pdf.pages[pno - 1].find_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"}):
            rows = t.extract()
            head = " ".join(norm_line(c) for r in rows[:3] for c in r if c)
            if "Spring Style" in head.replace(" / ", " ") or "Kit Part" in head.replace(" / ", " "):
                kind = "kit"
            elif "Beehive" in head:
                kind = "beehive"
            elif "Triple" in head:
                kind = "triple"
            elif "Dual" in head:
                kind = "dual"
            elif "Single" in head:
                kind = "single"
            else:
                continue
            for row in rows:
                cells = [norm_line(c) for c in row if c and norm_line(c)]
                if not cells or not cells[0].startswith("TFS-"):
                    continue
                si = next((i for i, c in enumerate(cells) if LOAD_RE.match(c)), None)
                if si is None or si + 3 >= len(cells):
                    qa.append(f"p{pno} {cells[0]}: spring row without seat/open loads")
                    continue
                seat_m, open_m = LOAD_RE.match(cells[si]), LOAD_RE.match(cells[si + 1])
                coil, rate = inch(cells[si + 2]), num(cells[si + 3])
                tail = cells[si + 4:]
                app = tail[-1] if tail else ""
                mid = tail[:-1]
                fams = fams_from_text(app) or [UNIVERSAL]
                notes = None
                if "LT1" in app:
                    notes = LT1_NOTE
                spec = OrderedDict([("seatLb", int(seat_m.group(1))), ("installedHt", inch(seat_m.group(2))),
                                    ("openLb", int(open_m.group(1))), ("openHt", inch(open_m.group(2))), ("coilBind", coil), ("rate", rate)])
                if kind == "kit":
                    pn, spring_pn, style = cells[0], cells[1], cells[2].lower()
                    spec.update([("type", style), ("dual", style == "dual"), ("maxLift", inch(mid[-1]) if mid else None),
                                 ("lockType", mid[-2] if len(mid) >= 2 else None),
                                 ("kit", clean(OrderedDict([("spring", spring_pn), ("retainers", pn_or_text(mid[0]) if mid else None),
                                                            ("locks", pn_or_text(mid[1]) if len(mid) > 1 else None)])))])
                    name = f"{style} valve spring upgrade kit, {spring_pn} springs, {spec['seatLb']} lb @ {spec['installedHt']:.3f}, max lift {spec['maxLift']}"
                    for fam in fams:
                        recs.append(record(pn, "spring", name, fam, spec, pno, notes=notes or app))
                    continue
                pn = cells[0]
                before = cells[1:si]
                damper = None
                if kind == "dual" and before and before[-1] in ("Yes", "No"):
                    damper = before.pop() == "Yes"
                od_top, od = tb_pair(before[0])
                if od_top and od and od_top > od:
                    qa.append(f"p{pno} {cells[0]}: beehive printed with top OD {od_top} larger than bottom OD {od}; kept as printed")
                ids = before[1:]
                id_top, id_outer = tb_pair(ids[0]) if ids else (None, None)
                id_inner = inch(ids[1]) if len(ids) > 1 else None
                ml = re.search(r"up to (\d?\.\d{3})\"? lift", app, re.I)
                spec.update([("type", kind), ("od", od), ("odTop", od_top), ("id", id_outer), ("idTop", id_top), ("innerId", id_inner),
                             ("dual", kind == "dual"), ("damper", damper if kind == "dual" else (True if kind == "single" else None)),
                             ("maxLift", inch(ml.group(1)) if ml else None),
                             ("retainers", pn_or_text(mid[0]) if mid else None), ("locks", pn_or_text(mid[1]) if len(mid) > 1 else None),
                             ("upgradeKit", pn_or_text(mid[2]) if len(mid) > 2 else None),
                             ("setOf", int(pn.rsplit("-", 1)[1]) if pn.rsplit("-", 1)[1].isdigit() else None)])
                if kind == "single":
                    spec["damperNote"] = "flat internal damping coils"
                name = f"{kind} valve spring, {od:.3f} OD, {spec['seatLb']} lb @ {spec['installedHt']:.3f}, {spec['openLb']} lb @ {spec['openHt']:.3f}"
                for fam in fams:
                    recs.append(record(pn, "spring", name, fam, spec, pno, notes=notes or app))
    return recs


# ----------------------------------------------------------------------------------------------
# rocker arms, pushrods, lifters
# ----------------------------------------------------------------------------------------------
def build_rockers(doc, qa):
    recs = []
    for pno, (fams, notes) in ROCKER_PAGES.items():
        lines = page_lines(doc, pno)
        for _, pn, desc in items(lines):
            if not desc.lower().startswith("rocker arms"):
                continue
            rm = re.search(r"(\d\.\d+)(?:/(\d\.\d+))? ratio", desc)
            sm = re.search(r"(\d+/\d+)\" stud", desc)
            shaft = "shaft mount" in desc.lower()
            spec = OrderedDict([
                ("ratio", float(rm.group(1)) if rm and not rm.group(2) else None),
                ("ratioInt", float(rm.group(1)) if rm and rm.group(2) else None),
                ("ratioExh", float(rm.group(2)) if rm and rm.group(2) else None),
                ("stud", frac(sm.group(1)) if sm else None),
                ("type", "shaft" if shaft else "stud"),
                ("material", None if shaft else "aluminum"),
                ("rollerTip", True), ("narrowBody", True if "narrow body" in desc else None),
                ("setOf", 16),
            ])
            if shaft:
                spec["bushed"] = True
                spec["pushrodEnd"] = "ball-ball"
            name = "roller rocker arms, " + re.sub(r"^Rocker arms, ", "", desc.replace(", set of 16", ""))
            for fam in fams:
                recs.append(record(pn, "rocker", name, fam, spec, pno, notes=notes))
    return recs


PUSHROD_APPS = [  # application phrase in the listing -> families
    (r"small block Chevy", [SBC]), (r"GM 4\.8L|LS1", [LS]), (r"351C|Boss 351", [CLEVE]), (r"429|460", [BBF]),
    (r"big block Chevy", BBC), (r"5\.7L Hemi|6\.1L Hemi", [HEMI3_57]), (r"6\.4L Hemi", [HEMI3_64]), (r"big block Mopar", [MOPAR_BB]),
]


def build_pushrods(doc, qa):
    recs = []
    seen = set()
    for pno in (61, 60):
        lines = page_lines(doc, pno)
        heavy = pno == 60
        for _, pn, desc in items(lines):
            if not desc.startswith("Pushrods,"):
                continue
            dia = 0.375 if (pn.startswith("TFS-2141") or heavy) else 0.3125
            lm = re.search(r"(\d+\.\d{3})\" long intake/(\d+\.\d{3})\" long exhaust", desc)
            spec = OrderedDict([("diameter", dia), ("wall", 0.135 if heavy else 0.08), ("material", "4130 chromoly")])
            if lm:
                spec["lengthIntake"], spec["lengthExhaust"] = float(lm.group(1)), float(lm.group(2))
            else:
                m = re.search(r"(\d+\.\d{3})\" long", desc)
                spec["length"] = float(m.group(1)) if m else None
            sm = re.search(r"set of (\d+)", desc)
            spec["setOf"] = int(sm.group(1)) if sm else (8 if pn.endswith("-8") else 16)
            if heavy:
                spec["ends"] = "ball-ball"
                spec["heavyWall"] = True
            app = re.sub(r"^Pushrods, [^,]+,\s*", "", desc)
            app = re.sub(r", set of \d+$", "", app)
            fams = []
            for rx, f in PUSHROD_APPS:
                if re.search(rx, app, re.I):
                    fams += [x for x in f if x not in fams]
            if heavy and not fams:
                fams = [MOPAR_BB]
            if not fams:
                qa.append(f"p{pno} {pn}: pushrod application '{app}' not mapped to a family")
                fams = [UNIVERSAL]
            name = f"chromoly pushrods, {spec['diameter']} dia, " + (f"{spec['length']:.3f} long" if spec.get("length") else f"{spec['lengthIntake']:.3f} int / {spec['lengthExhaust']:.3f} exh")
            for fam in fams:
                if (pn, fam) in seen:
                    qa.append(f"p{pno} {pn}: part number listed twice ({app}); one record kept")
                    continue
                seen.add((pn, fam))
                recs.append(record(pn, "pushrod", name, fam, spec, pno, notes=app if app and not app.startswith("Pushrods") else None))
    # build-a-part-number lengths (p61: 5/16" 6.250-9.000, 3/8" 7.650-9.950 in .050 steps)
    gen = 0
    listed = {r["p"] for r in recs}
    for dia, prefix, suffix, lo, hi in ((0.3125, "TFS-2140", "", 6.25, 9.0), (0.375, "TFS-2141", "-8", 7.65, 9.95)):
        n = int(round((hi - lo) / 0.05)) + 1
        for i in range(n):
            length = round(lo + 0.05 * i, 3)
            pn = f"{prefix}{int(round(length * 1000)):04d}{suffix}"
            if pn in listed:
                continue
            spec = OrderedDict([("diameter", dia), ("wall", 0.08), ("material", "4130 chromoly"), ("length", length), ("setOf", 16 if dia == 0.3125 else 8)])
            recs.append(record(pn, "pushrod", f"chromoly pushrods, {dia} dia, {length:.3f} long", UNIVERSAL, spec, 61,
                               notes="part number built per the catalog's 'How to Build a Pushrod Part Number' rule; not individually listed"))
            gen += 1
    qa.append(f"p61: {gen} pushrod part numbers generated from the build-a-number rule (fit.fam Universal)")
    return recs


LIFTER_STYLES = [("Hydraulic Flat Tappet Lifters", "hydraulic_flat", False), ("OEM Hydraulic Roller Lifters", "hydraulic_roller", False),
                 ("Retro-Fit Hydraulic Roller Lifters with Link Bars", "hydraulic_roller", True)]


def build_lifters(doc, qa):
    recs = []
    lines = page_lines(doc, 63)
    style, link = None, None
    i0 = next((i for i, l in enumerate(lines) if l.startswith("Hydraulic Lifters")), 0)
    for i in range(i0, len(lines)):
        ln = lines[i]
        for h, s, lb in LIFTER_STYLES:
            if ln.startswith(h):
                style, link = s, lb
        if ln.startswith("Lash Adjusters"):
            style = None
        m = PN_LINE_RE.match(ln)
        if m and style:
            pn, desc = m.group(1), m.group(2).strip()
            if not desc and i + 1 < len(lines):
                desc = lines[i + 1]
            if not desc.startswith("Lifters"):
                continue
            app = re.sub(r"^Lifters, ", "", re.sub(r", set of \d+$", "", desc))
            fams = fams_from_text(app)
            if not fams:
                qa.append(f"p63 {pn}: lifter application '{app}' not mapped")
                continue
            spec = OrderedDict([("style", style), ("linkBar", link), ("setOf", 16), ("retrofit", True if link else None)])
            for fam in fams:
                recs.append(record(pn.rstrip("*"), "lifter", f"{style.replace('_', ' ')} lifters, {app}", fam, spec, 63, notes=app))
    return recs


# ----------------------------------------------------------------------------------------------
# intake manifolds (specs transcribed from the page prose; part numbers verified on the page)
# ----------------------------------------------------------------------------------------------
def I(page, fams, type_, flange, rpm, height, **extra):
    d = OrderedDict([("page", page), ("fams", fams), ("type", type_), ("carbFlange", flange), ("rpmLow", rpm[0] if rpm else None),
                     ("rpmHigh", rpm[1] if rpm else None), ("heightFront", height)])
    d.update(extra)
    return d


EFI_FORD = {  # p45 table: (rpm, throttle body mm, upper height, lower height, runner length)
    "StreetBurner": ((0, 5500), 75, 10.2, 4.625, 15.0), "Track Heat": ((1500, 6500), 75, 10.2, 4.625, 12.2),
    "R-Series 75mm 5.0L": ((2500, 7250), 75, 11.0, 4.625, 12.0), "R-Series 90mm 5.0L": ((3000, 7750), 90, 11.0, 4.625, 12.0),
    "Box-R-Series 5.0L": ((3000, 8000), 90, 12.3, 4.625, 9.75), "R-Series 75mm 351W": ((1500, 5500), 75, 11.7, 5.375, 13.3),
    "R-Series 90mm 351W": ((2000, 7000), 90, 11.7, 5.375, 13.3), "Box-R-Series 351W": ((2500, 7500), 90, 13.1, 5.375, 11.0),
}
INTAKES = OrderedDict()
INTAKES["TFS-32600111"] = I(15, [LS], "single-plane", "square", (3500, 7500), 6.285, material="A319 aluminum", notes="GM LS3/L92 rectangle port; nitrous bosses")
INTAKES["TFS-32600112"] = I(15, [LS], "single-plane", "square", (3500, 7500), 6.285, material="A319 aluminum", injectorBosses=True, notes="GM LS3/L92 rectangle port; carb-style EFI (machined injector ports)")
INTAKES["TFS-32400111"] = I(27, [SBC], "single-plane", "square", (3500, 7500), 6.25, material="A319 aluminum", notes="for 215cc+ runner heads; nitrous bosses")
INTAKES["TFS-41400111"] = I(30, BBC, "single-plane", "dominator", (3500, 8000), 7.565, material="A319 aluminum", deckHeight=9.8, notes="rectangle port; 9.800 deck")
INTAKES["TFS-41400112"] = I(30, BBC, "single-plane", "dominator", (3500, 8000), 7.58, material="A319 aluminum", deckHeight=10.2, notes="rectangle port; 10.200 tall deck")
for _pn, _eng, _efi in (("TFS-52400111", "289/302", False), ("TFS-52400112", "289/302", True), ("TFS-52400114", "351W", False), ("TFS-52400115", "351W", True)):
    INTAKES[_pn] = I(43, [SBF], "single-plane", "square", (3500, 7500), 6.3 if _eng == "289/302" else 6.45, material="A319 aluminum",
                     injectorBosses=True if _efi else None, portAtHead="2.100 x 1.280", notes=f"Ford {_eng}" + ("; carb-style EFI" if _efi else ""))
for _suf, _match in (("-C03", "Twisted Wedge 11R 205"), ("-C04", "Twisted Wedge 11R 227")):
    for _pn, _eng, _efi in (("TFS-52500111", "289/302", False), ("TFS-52500112", "289/302", True), ("TFS-52500114", "351W", False), ("TFS-52500115", "351W", True)):
        INTAKES[_pn + _suf] = I(43, [SBF], "single-plane", "square", (3500, 7500), 6.3 if _eng == "289/302" else 6.45, material="A319 aluminum",
                                injectorBosses=True if _efi else None, portMatch=_match, notes=f"Ford {_eng}; CNC port-matched to {_match} heads" + ("; carb-style EFI" if _efi else ""))
for _pn, _kind, _eng in (("TFS-51500001", "StreetBurner", "5.0L"), ("TFS-51511001", "StreetBurner", "5.0L"), ("TFS-515B0001", "StreetBurner", "5.0L"),
                         ("TFS-51500002", "Track Heat", "5.0L"), ("TFS-51511002", "Track Heat", "5.0L"), ("TFS-515B0002", "Track Heat", "5.0L"),
                         ("TFS-51500003", "R-Series 75mm 5.0L", "5.0L"), ("TFS-51511003", "R-Series 75mm 5.0L", "5.0L"), ("TFS-515B0003", "R-Series 75mm 5.0L", "5.0L"),
                         ("TFS-51500005", "R-Series 90mm 5.0L", "5.0L"), ("TFS-51511005", "R-Series 90mm 5.0L", "5.0L"), ("TFS-515B0005", "R-Series 90mm 5.0L", "5.0L"),
                         ("TFS-51500008", "Box-R-Series 5.0L", "5.0L"), ("TFS-51511008", "Box-R-Series 5.0L", "5.0L"), ("TFS-515B0008", "Box-R-Series 5.0L", "5.0L"),
                         ("TFS-51500004", "R-Series 75mm 351W", "351W"), ("TFS-51511004", "R-Series 75mm 351W", "351W"), ("TFS-515B0004", "R-Series 75mm 351W", "351W"),
                         ("TFS-51500006", "R-Series 90mm 351W", "351W"), ("TFS-51511006", "R-Series 90mm 351W", "351W"), ("TFS-515B0006", "R-Series 90mm 351W", "351W"),
                         ("TFS-51500009", "Box-R-Series 351W", "351W"), ("TFS-51511009", "Box-R-Series 351W", "351W"), ("TFS-515B0009", "Box-R-Series 351W", "351W")):
    _rpm, _tb, _hu, _hl, _rl = EFI_FORD[_kind]
    _color = {"0": "silver", "1": "black", "B": "natural"}[_pn[7]]
    INTAKES[_pn] = I(45, [SBF], "efi", "throttle-body", _rpm, _hu, heightLower=_hl, throttleBodyMm=_tb, runnerLength=_rl, material="A319 aluminum",
                     portAtHead="2.000 x 1.200", upperFinish=_color, notes=f"Ford {_eng} EFI, {_kind.split(' 5.0L')[0].split(' 351W')[0]} upper, {_color}")
INTAKES["TFS-56400112"] = I(48, [FE], "single-plane", "square", (4000, 7500), 6.25, material="A319 aluminum", notes="Ford 390-428 FE Track Heat; nitrous bosses")
INTAKES["TFS-56400114"] = I(48, [FE], "single-plane", "square", None, None, carbs=2, material="A319 aluminum", notes="Ford 390-428 FE R-Series Tunnel Wedge, dual 4150/4160 square-bore flanges, O-ring sealed bottom plate")
INTAKES["TFS-51600111"] = I(51, [CLEVE], "single-plane", "square", (3000, 7000), 6.25, material="A319 aluminum", deckHeight=9.2, notes="Ford 351C, 9.200 deck factory Cleveland block; OE 2V port size")
INTAKES["TFS-51600112"] = I(51, [CLEVE], "single-plane", "square", (3000, 7000), 6.625, material="A319 aluminum", deckHeight=9.5, notes="Clevor, 9.500 deck factory Windsor block; OE 2V port size")
INTAKES["TFS-51600113"] = I(51, [CLEVE], "single-plane", "square", (3000, 7000), 6.625, material="A319 aluminum", deckHeight=9.2, notes="Clevor, 9.200 deck aftermarket Windsor block; OE 2V port size")
INTAKES["TFS-53400111"] = I(54, [BBF], "single-plane", "square", (3500, 8000), 6.8, material="A319 aluminum", notes="Ford 429/460 Track Heat; nitrous/injector bosses")
INTAKES["TFS-53400112"] = I(54, [BBF], "single-plane", "dominator", None, 6.8, material="A319 aluminum", notes="Ford 429/460 R-Series, 500+ ci high-RPM")
INTAKES["TFS-54400111"] = I(54, [BBF], "single-plane", "dominator", None, 8.6, material="A319 aluminum", notes="Trick Flow PowerPort A460 heads only")
INTAKES["TFS-54494000"] = I(54, [BBF], "tunnel-ram", "dominator", None, None, material="A319 aluminum", heightDualCarbTop=10.48, heightSingleCarbTop=13.1,
                           notes="A460 tunnel ram lower only; tops TFS-54494001 (single) / TFS-54494140 (dual); Trick Flow PowerPort A460 heads only")
INTAKES["TFS-61400111"] = I(57, MOPAR_SB, "single-plane", "square", (3000, 7000), 5.125, material="A319 aluminum", notes="Chrysler 273-360 LA Track Heat; nitrous bosses")
INTAKES["TFS-61600111"] = I(59, [MOPAR_BB], "single-plane", "square", (3000, 7000), 5.75, material="A319 aluminum", notes="383/400 low-deck Track Heat; fits PowerPort 240/270 heads (port match for 270)")
INTAKES["TFS-61600113"] = I(59, [MOPAR_BB], "single-plane", "square", (3000, 7000), 6.25, material="A319 aluminum", notes="440 raised-deck Track Heat; fits PowerPort 240/270 heads (port match for 270)")
INTAKES["TFS-61600117"] = I(59, [MOPAR_BB], "single-plane", "dominator", (3500, 7500), 5.875, notes="383/400 low-deck R-Series; for 270cc+ runner heads; nitrous bosses")
INTAKES["TFS-61600115"] = I(59, [MOPAR_BB], "single-plane", "dominator", (3500, 7500), 6.375, notes="440 raised-deck R-Series; for 270cc+ runner heads; nitrous bosses")


def build_intakes(doc, qa):
    recs = []
    cache = {}
    for pn, d in INTAKES.items():
        pno = d["page"]
        if pno not in cache:
            cache[pno] = page_lines(doc, pno)
        lines = cache[pno]
        descs = [ds for _, p, ds in items(lines) if p == pn]
        desc = next((ds for ds in descs if re.match(r"^(Manifold\b|\S+ manifold kit|R-Series|Box-R|StreetBurner|Track Heat manifold)", ds)), None)
        if desc is None and descs:
            desc = ""
        if desc is None:
            if not any(pn in l for l in lines):
                qa.append(f"p{pno} {pn}: intake part number not found on the page; record skipped")
                continue
            desc = ""
        spec = OrderedDict((k, v) for k, v in d.items() if k not in ("page", "fams", "notes"))
        spec["egr"] = False
        kind = {"single-plane": "single-plane", "efi": "EFI", "tunnel-ram": "tunnel ram"}[d["type"]]
        name = f"{kind} intake manifold, {desc.replace(', each', '')}" if desc else f"{kind} intake manifold"
        emis = "unknown"
        if pn in ("TFS-51500001", "TFS-51511001", "TFS-515B0001"):
            emis = "carb_eo:D-369-3"
        for fam in d["fams"]:
            recs.append(record(pn, "intake", name, fam, spec, pno, notes=d.get("notes"), emissions=emis))
    return recs


# ----------------------------------------------------------------------------------------------
# MLS head gaskets (p73 list, plus the 2V gaskets on p35)
# ----------------------------------------------------------------------------------------------
def build_head_gaskets(doc, qa):
    recs = []
    for pno in (73, 35):
        lines = page_lines(doc, pno)
        for i, pn, desc in items(lines):
            if not desc.startswith("MLS head gasket"):
                continue
            k = i + 1
            while not re.search(r"each,?$", desc) and k + 1 < len(lines) and not PN_LINE_RE.match(lines[k + 1]) and len(desc) < 220:
                k += 1
                desc = desc + " " + lines[k]
            bm = re.search(r"(\d\.\d{3})\"? bore", desc)
            tm = re.search(r"\.(\d{3})\" thick", desc)
            app = re.sub(r"^MLS head gasket, ", "", desc.split(bm.group(1))[0]).strip(", ") if bm else desc
            fams = fams_from_text(app)
            if "LT1" in app:
                fams = [SBC]
            if not fams:
                qa.append(f"p{pno} {pn}: head gasket application '{app}' not mapped")
                continue
            side = "L" if re.search(r"\bleft\b", desc) or re.search(r"L0\d\d$", pn) else ("R" if re.search(r"\bright\b", desc) or re.search(r"R0\d\d$", pn) else None)
            spec = OrderedDict([("bore", float(bm.group(1)) if bm else None), ("thickness", float("0." + tm.group(1)) if tm else None),
                                ("material", "MLS"), ("side", side), ("sixBolt", True if "6-bolt" in desc else None), ("eighteenBolt", True if "18-bolt" in desc else None),
                                ("layers", 3)])
            sfx = re.search(r"-(\d{3})$", pn)
            if sfx and tm and sfx.group(1) != tm.group(1):
                spec["qa"] = [f"listing says .{tm.group(1)} thick but the part-number suffix is -{sfx.group(1)}"]
                qa.append(f"p{pno} {pn}: thickness .{tm.group(1)} in text vs -{sfx.group(1)} suffix")
            name = f"MLS head gasket, {spec['bore']} bore" + (f", .{tm.group(1)} thick" if tm else "") + (f", {side}" if side else "")
            notes = app + (f"; {LT1_NOTE}" if "LT1" in app else "")
            for fam in fams:
                recs.append(record(pn.rstrip("*"), "headGasket", name, fam, spec, pno, notes=notes))
    return recs


# ----------------------------------------------------------------------------------------------
# top-end engine kits -> head records with spec.kit
# ----------------------------------------------------------------------------------------------
ROLE_WORDS = [("heads", r"cylinder heads?|heads"), ("cam", r"cam(?:shaft)?s?"), ("intake", r"intake manifold|intake|manifold"), ("rockers", r"rocker"),
              ("pushrods", r"pushrods?"), ("timingSet", r"timing chain|timing set"), ("gaskets", r"gasket"), ("headBolts", r"head bolt"),
              ("pistons", r"pistons"), ("lifters", r"lifters"),
              ("ignore", r"plenum|throttle body|injectors?|fuel|carburetor|headers|muffler|valve cover|balancer|spacer")]


def roles_in(text):
    """'... heads (TFS-1), cam (TFS-2) ...' -> {role: [pns]} using the words before each parenthesized PN."""
    out = defaultdict(list)
    for m in re.finditer(r"([^()]{0,110})\(((?:TFS-?[0-9A-Z-]+(?:,? (?:or )?)?)+)[^)]*\)", text):
        lead = m.group(1).lower()
        pns = [p.replace("TFS ", "TFS-") for p in re.findall(r"TFS-?[0-9A-Z-]{5,}", m.group(2))]
        role, pos = None, -1
        for r, rx in ROLE_WORDS:
            for mm in re.finditer(rx, lead):
                if mm.start() > pos:
                    role, pos = r, mm.start()
        if role is None or role == "ignore":
            continue
        for p in pns:
            if p not in out[role]:
                out[role].append(p)
    return out


def build_kits(doc, heads, qa):
    by_pn = {}
    for h in heads:
        by_pn.setdefault(h["p"], h)
    generic = {"dyno", "results", "top-end", "engine", "kit", "kits", "trick", "flow", "for", "gm", "ford", "small", "block", "big", "chevrolet",
               "mopar", "440", "ls", "ls1", "ls2", "ls3", "truck", "5.0l", "4.6l", "2v"}
    recs = []
    for pno, (fams, fnote) in KIT_PAGES.items():
        lines = page_lines(doc, pno)
        n = len(lines)
        # scopes = runs of lines under each "... Top-End Engine Kit(s) ..." heading
        idx = [i for i, l in enumerate(lines) if re.search(r"Top-End Engine Kits?\b", l) and not PN_LINE_RE.match(l) and "Dyno" not in l and "Trick Flow's" not in l]
        if not idx:
            idx = [0]
        scopes = []
        for a, b in zip(idx, idx[1:] + [n]):
            heading = lines[a]
            series = re.sub(r"®|™", "", re.split(r"\s*Top-End", heading)[0]).strip()
            if not series and a > 0:
                series = re.sub(r"®|™", "", lines[a - 1]).strip()
            scopes.append({"a": a, "b": b, "heading": heading, "series": series, "kits": [], "intro": ""})
        kits = OrderedDict()  # pn -> kit entry
        for sc in scopes:
            first_pn = None
            for i, pn, d in items(lines, sc["a"], sc["b"]):
                if not pn.startswith("TFS-K"):
                    continue
                if d.startswith("Dyno Results"):
                    continue
                if first_pn is None:
                    first_pn = i
                if pn in kits and not d:
                    continue
                if pn in kits and kits[pn]["desc"]:
                    continue
                kits[pn] = {"pn": pn, "desc": d, "scope": sc, "line": i, "roles": OrderedDict(), "text": ""}
                sc["kits"].append(pn)
            sc["intro"] = " ".join(lines[sc["a"]:first_pn if first_pn is not None else sc["b"]])
        if not kits:
            qa.append(f"p{pno}: no top-end kit part numbers found")
            continue

        def apply(pns, text, note=True):
            r = roles_in(text)
            for p in pns:
                if p in kits:
                    for k, v in r.items():
                        if k != "pistons":
                            kits[p]["roles"][k] = v
                    if note:
                        kits[p]["text"] += " " + text

        # (a) intro text: intros of kit-less scopes before a scope are carried forward (unless the scope's
        #     own intro names the heads), then the scope's own intro overrides
        carry = ""
        for sc in scopes:
            if sc["kits"]:
                own = roles_in(sc["intro"])
                if "heads" not in own:
                    apply(sc["kits"], carry, note=False)
                else:
                    carry = ""
                apply(sc["kits"], sc["intro"], note=False)
            else:
                carry += " " + sc["intro"]
        # (b) NOTE blocks after kit PNs apply to the kits listed since the previous NOTE; "X Dyno Results"
        #     paragraphs apply to the kit they name (PN) or whose heading shares their distinguishing tokens
        for sc in scopes:
            pending = []
            i = sc["a"]
            while i < sc["b"]:
                ln = lines[i]
                pm = PN_LINE_RE.match(ln)
                if pm and pm.group(1).startswith("TFS-K") and not pm.group(2).startswith("Dyno Results"):
                    if pm.group(1) in kits and kits[pm.group(1)]["line"] == i:
                        pending.append(pm.group(1))
                    i += 1
                    continue
                if (pm and pm.group(2).startswith("Dyno Results")) or re.search(r"Dyno (Results|Chart)$", ln):
                    j = i + 1
                    while j < sc["b"] and not (PN_LINE_RE.match(lines[j]) and PN_LINE_RE.match(lines[j]).group(2)) \
                            and not re.search(r"Dyno Results|Top-End Engine Kit", lines[j]):
                        j += 1
                    para = " ".join(l for l in lines[i + 1:j] if not PN_LINE_RE.match(l))
                    if pm:
                        targets = [pm.group(1)]
                    else:
                        toks = tokens(ln) - generic
                        targets = [p for p, k in kits.items() if toks and toks <= (tokens(k["scope"]["heading"]) | tokens(k["scope"]["series"]))]
                        if not targets and not toks:
                            targets = sc["kits"]
                    apply(targets, para)
                    i = j
                    continue
                if ln.startswith("NOTE") and pending:
                    j = i + 1
                    while j < sc["b"] and not PN_LINE_RE.match(lines[j]) and not re.search(r"Top-End Engine Kit", lines[j]):
                        j += 1
                    apply(pending, " ".join(lines[i:j]))
                    pending = []
                    i = j
                    continue
                i += 1
        for pn, k in kits.items():
            d, sc, roles = k["desc"], k["scope"], k["roles"]
            hm = re.search(r"(\d{3}) HP/(\d{3}) lbs", d)
            head_pn = roles.get("heads", [None])[0]
            base = by_pn.get(head_pn)
            cm = re.search(r"(\d{2})cc (?:CNC-profiled )?combustion chambers", d)
            if not cm:  # prefer the chamber named right before the head part number in a NOTE
                ms = list(re.finditer(r"(\d{2})cc (?:CNC-profiled )?combustion chambers( \(TFS-)?", k["text"]))
                cm = next((m for m in ms if m.group(2)), ms[0] if ms else None)
            as_printed = None
            if base is None and head_pn:
                alt = [h for h in by_pn.values() if h["src"]["page"] in HEAD_PAGES and
                       ((len(h["p"]) == len(head_pn) and sum(a != b for a, b in zip(h["p"], head_pn)) == 1) or h["p"].startswith(head_pn + "-"))]
                base = alt[0] if len(alt) == 1 else None
                if base is None:
                    qa.append(f"p{pno} {pn}: kit head {head_pn} is not a listed head part number")
                else:
                    qa.append(f"p{pno} {pn}: kit note cites head {head_pn}; matched to listed {base['p']}")
                    as_printed, roles["heads"] = head_pn, [base["p"]]
            if base is None and not head_pn and cm:
                # no PN on the page: the kit names its head by product and chamber ("Twisted Wedge 185 ... 44cc")
                cands = [h for h in by_pn.values() if h["src"]["page"] in HEAD_PAGES and h["name"].startswith(sc["series"] + ",")
                         and h["spec"].get("chamberCc") == int(cm.group(1))]
                if len(cands) > 1:
                    seats = [h for h in cands if h["spec"].get("spring", {}).get("seatLb") and f"{h['spec']['spring']['seatLb']} lb" in (carry + " " + sc["intro"])]
                    cands = seats or cands
                if len(cands) == 1:
                    base = cands[0]
                    roles["heads"] = [base["p"]]
                    qa.append(f"p{pno} {pn}: kit head inferred from product name and chamber volume: {base['p']}")
            kit = OrderedDict()
            for key in ("heads", "cam", "intake", "rockers", "pushrods", "lifters", "timingSet", "gaskets", "headBolts"):
                if key in roles:
                    kit[key] = roles[key] if len(roles[key]) > 1 else roles[key][0]
            if as_printed:
                kit["headsAsPrinted"] = as_printed
            spec = OrderedDict([("kitType", "top-end engine kit"), ("hp", int(hm.group(1)) if hm else None), ("torque", int(hm.group(2)) if hm else None)])
            if base:
                for key in ("chamberCc", "intakeRunnerCc", "exhaustRunnerCc", "intakeValve", "exhaustValve", "maxLift", "springDia", "portStyle", "material"):
                    if base["spec"].get(key) is not None:
                        spec[key] = base["spec"][key]
                if cm and base["spec"].get("chamberCc") != int(cm.group(1)):
                    spec["chamberCc"] = int(cm.group(1))
                    spec["qa"] = [f"kit listing says {cm.group(1)}cc chambers; cited head {base['p']} has {base['spec'].get('chamberCc')}cc"]
            else:
                if cm:
                    spec["chamberCc"] = int(cm.group(1))
                rm = re.search(r"(?:Super 23|GenX|Twisted Wedge|PowerOval|PowerPort|High Port)®? (\d{3})", k["text"] + " " + sc["heading"])
                if rm:
                    spec["intakeRunnerCc"] = int(rm.group(1))
            spec["kit"] = kit
            spec["bare"] = False
            if not kit.get("cam"):
                qa.append(f"p{pno} {pn}: kit camshaft part number not stated on the page")
            if not kit.get("heads"):
                qa.append(f"p{pno} {pn}: kit cylinder head part number not stated on the page")
            name = f"{sc['series']} top-end engine kit, {spec['hp']} HP/{spec['torque']} lb-ft" if hm else f"{sc['series']} top-end engine kit, {d}"
            if cm:
                name += f", {cm.group(1)} cc chambers"
            if "hydraulic roller cam engine blocks" in d:
                name += " (factory roller cam block)"
            elif "non-hydraulic roller" in d:
                name += " (non-roller cam block)"
            if re.search(r"\bblack\b", d):
                name += ", black"
            for fam in fams:
                recs.append(record(pn, "head", name, fam, spec, pno, notes=fnote, fit_extra={"cyl": 8}))
    return recs


# ----------------------------------------------------------------------------------------------
# validate / notes / main
# ----------------------------------------------------------------------------------------------
NUMERIC_KEYS = ["chamberCc", "intakeRunnerCc", "exhaustRunnerCc", "intakeValve", "exhaustValve", "maxLift", "springDia", "minBore",
                "dur050Int", "dur050Exh", "valveLiftInt", "valveLiftExh", "lsa", "rr", "rpmLow", "rpmHigh", "od", "id", "installedHt", "coilBind",
                "seatLb", "openLb", "rate", "ratio", "stud", "diameter", "wall", "length", "bore", "thickness", "heightFront", "hp", "torque"]
STRING_NUM_OK = {"p", "edition", "sparkPlug", "flowSource", "lockType", "upperFinish", "file"}


def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat", "fit", "src", "name"):
            if not r.get(k):
                problems.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            problems.append(f"{r['p']}: missing fit.fam")
        key = (r["cat"], r["p"], r["fit"].get("fam"))
        if key in seen:
            problems.append(f"{r['p']}: duplicate within {r['fit'].get('fam')} ({r['cat']})")
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str):
                if o == "":
                    problems.append(f"{r['p']}: empty string at {path}")
                elif re.fullmatch(r"-?\d+(\.\d+)?", o) and path.split(".")[-1] not in STRING_NUM_OK and ".related" not in path and ".kit" not in path:
                    problems.append(f"{r['p']}: numeric string at {path} = {o}")
        walk(r, "")
        for k in NUMERIC_KEYS:
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for pt in r["spec"].get("flow", []):
            if not all(isinstance(pt.get(k), (int, float)) for k in ("lift", "int", "exh")):
                problems.append(f"{r['p']}: non-numeric flow point {pt}")
    return problems


def write_notes(path, records, qa, unused_flow, sheets):
    heads = [r for r in records if r["cat"] == "head" and "kit" not in r["spec"]]
    kits = [r for r in records if r["cat"] == "head" and "kit" in r["spec"]]
    uniq = lambda rs: len({r["p"] for r in rs})
    hp = {r["p"]: r for r in heads}
    flow_cat = sum(1 for r in hp.values() if r["spec"].get("flow") and not r["src"].get("flowSource"))
    flow_sheet = sum(1 for r in hp.values() if r["src"].get("flowSource"))
    no_flow = [r["p"] for r in hp.values() if not r["spec"].get("flow")]
    L = []
    L.append("# Trick Flow — extraction notes\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_trickflow.py`.\n")
    L.append("## What was read\n")
    L.append("No network access (Trick Flow is Summit-owned and blocks fetchers; the PDFs were saved by hand into `Catalogs/`):\n")
    L.append(f"- `{os.path.basename(DEFAULT_PDF)}` — 2026 PRI catalog, 80 pages, text layer (PyMuPDF text + pdfplumber ruled tables). "
             "Pages used: heads " + ", ".join(str(p) for p in HEAD_PAGES) + "; top-end kits " + ", ".join(str(p) for p in KIT_PAGES) +
             "; cams 62-63 and 34; springs 64-67; rockers " + ", ".join(str(p) for p in ROCKER_PAGES) + "; pushrods 60-61; lifters 63; "
             "intakes 15, 27, 30, 43, 45, 48, 51, 54, 57, 59; MLS head gaskets 73 and 35.")
    L.append(f"- `{os.path.basename(DEFAULT_SHEETS)}` — 2017 dealer cylinder-head comparison sheets, 12 pages. They hold one flow point per head "
             f"(cfm @ .600\"/.700\"/.800\" lift, 28\"), not full curves; {len(sheets)} product rows parsed, {sum(1 for e in sheets if e['used'])} used.\n")
    L.append("Not extracted: engine blocks (Trick Flow sells none, so no `block` records), bare-casting heads (the pages say bare castings exist "
             "but print no part number — every head here is `bare: false`), head `camType` (not printed; the spring package and max lift are "
             "recorded instead), advertised duration / lash / lobe numbers for cams (not printed), accessories, gasket sets, tools, dampers, "
             "timing sets, fuel injectors, headers, valve covers, pistons, retainers/locks/locators as stand-alone records (they appear as related PNs).\n")
    L.append("## Records\n")
    L.append("| cat | records | distinct part numbers |\n|---|---|---|")
    for cat, n in Counter(r["cat"] for r in records).most_common():
        L.append(f"| {cat} | {n} | {uniq([r for r in records if r['cat'] == cat])} |")
    L.append(f"| **total** | {len(records)} | {uniq(records)} |\n")
    L.append("Top-end engine kits are `head` records with `spec.kit` (" + f"{len(kits)} records, {uniq(kits)} part numbers). "
             "Parts that fit several families are repeated once per family with the same `p`.\n")
    L.append("### Records per family\n")
    L.append("| cat | family | records |\n|---|---|---|")
    for (cat, fam), n in sorted(Counter((r["cat"], r["fit"]["fam"]) for r in records).items(), key=lambda kv: (kv[0][0], -kv[1], kv[0][1])):
        L.append(f"| {cat} | {fam} | {n} |")
    L.append("")
    L.append("### Heads and flow\n")
    L.append(f"- {len(hp)} distinct assembled head part numbers; {flow_cat} carry a full catalog flow curve (28\" H2O, ruled 'Airflow Results' table on the "
             f"product page), {flow_sheet} carry only the single 2017 dealer-sheet point (`src.flowSource` and `spec.flowNote` say so), "
             f"{len(no_flow)} have no flow data: {', '.join(no_flow) if no_flow else 'none'}.")
    L.append("- Catalog pages 10 (GenX cathedral port), 29 (PowerPort 320/365) and 39 (Twisted Wedge 11R) print their flow charts as images, so those "
             "heads fall back to the dealer sheet where product, runner and chamber match.")
    L.append("- Flow tables are attached only to the variants they name: a table titled 'with 72cc chambers' or footnoted '61cc chambers' / 'intake valve: 2.350' "
             "goes only to those part numbers; 'GenX 220 for LS2' goes only to the LS2 (65cc) part numbers.")
    if unused_flow:
        L.append("- Flow tables that matched no part number: " + "; ".join(unused_flow))
    L.append("")
    L.append("### How head variants were resolved\n")
    L.append("Each head page has one Specifications block whose lines carry variant codes (`C01:`, `M54:`, `01/02/03:`, `PowerPort 320:`, `10-C01:`, "
             "`T541-CH3/CH4:`). The extractor matches those codes against the part number's suffix, last 2/4 base digits and their combinations; "
             "chamber volume, runner volume, spring size and intake valve named in the listing line itself take precedence. The spring package "
             "(and so `maxLift`/`springDia`) is the package whose OD/type (or seat pressure, or rate) the listing names; `spec.spring` records it and "
             "`spec.springOptions` lists the other packages offered on that page. `spec.qa` flags any record where something was assumed.\n")
    L.append("## Transcribed (not parsed) values\n")
    L.append("Intake manifold types, carb flanges, RPM ranges and heights are written in prose on the catalog pages and were transcribed into the "
             "`INTAKES` table in the script (one entry per part number, with the page); the script only emits an entry when the part number is found on "
             "that page. EFI manifold figures come from the p45 specification table. Per-PN corrections for catalog typos are in `OVERRIDES` / "
             "`CAM_OVERRIDES` and are each flagged in `spec.qa`.\n")
    L.append("## Family notes\n")
    L.append("- Big-block Chevy parts are emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; PowerPort 190 and small-block Mopar parts for both "
             "`Mopar LA small block` and `Mopar Magnum 5.2/5.9` (the catalog says LA and Magnum).")
    L.append(f"- GM Gen II LT1 parts (GenX 185/195 heads, TFS-31402081 cam, LT1 kit and gaskets) are filed under `Small-block Chevy` with the note '{LT1_NOTE}'.")
    L.append("- Ford 4.6L/5.4L 2V/3V/4V parts are `Ford Modular`; 5.0L DOHC springs/gaskets are `Ford Coyote`. Springs and generated pushrods with no stated engine are `Universal`.\n")
    L.append("## QA\n")
    for q in qa:
        L.append(f"- {q}")
    L.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--pdf", default=DEFAULT_PDF, help="Trick Flow 2026 PRI catalog PDF")
    ap.add_argument("--sheets", default=DEFAULT_SHEETS, help="2017 dealer cylinder-head comparison sheets PDF (optional)")
    args = ap.parse_args()
    if not os.path.exists(args.pdf):
        raise SystemExit(f"catalog PDF not found: {args.pdf}")
    import pymupdf
    import pdfplumber

    qa = []
    skipped = []
    doc = pymupdf.open(args.pdf)
    if len(doc) != 80:
        qa.append(f"catalog PDF has {len(doc)} pages, expected 80; page numbers in this script may be off")
    sheets = []
    if args.sheets and os.path.exists(args.sheets):
        sheets = parse_sheets(args.sheets, qa)
    else:
        qa.append("dealer sheets PDF not found; no fallback flow points")
    with pdfplumber.open(args.pdf) as pdf:
        heads, unused_flow = build_heads(doc, pdf, sheets if sheets else None, qa, skipped)
        cams = build_cams(doc, pdf, qa)
        springs = build_springs(pdf, qa)
    kits = build_kits(doc, heads, qa)
    rockers = build_rockers(doc, qa)
    pushrods = build_pushrods(doc, qa)
    lifters = build_lifters(doc, qa)
    intakes = build_intakes(doc, qa)
    gaskets = build_head_gaskets(doc, qa)
    # dealer-sheet cross-check against catalog curves (same lift point)
    for h in heads:
        if h["src"].get("flowSource") or not h["spec"].get("flow"):
            continue
        hit = sheet_lookup(sheets, [h["fit"]["fam"]], h["name"].split(",")[0], h["spec"].get("intakeRunnerCc"), h["spec"].get("chamberCc"), h["name"], h["spec"].get("portStyle"))
        if hit:
            pt = next((p for p in h["spec"]["flow"] if abs(p["lift"] - hit["lift"]) < 0.001), None)
            if pt and (abs(pt["int"] - hit["int"]) > 5 or abs(pt["exh"] - hit["exh"]) > 5):
                msg = f"p{h['src']['page']} {h['p']}: 2026 curve @ {hit['lift']} = {pt['int']}/{pt['exh']} cfm vs 2017 sheet {hit['int']}/{hit['exh']} ({hit['name']}); catalog kept"
                if msg not in qa:
                    qa.append(msg)
    for e in sheets:
        if not e["used"]:
            skipped.append(f"sheet p{e['page']} '{e['name']}' {e['runner']}cc: no 2026 head needed it (discontinued, or the catalog prints its own curve)")
    records = heads + kits + cams + springs + rockers + pushrods + lifters + intakes + gaskets
    qa[:] = list(OrderedDict.fromkeys(qa))
    problems = validate(records)
    if problems:
        for p in problems[:60]:
            print("VALIDATION:", p, file=sys.stderr)
        raise SystemExit(f"{len(problems)} validation problems")
    os.makedirs(OUT, exist_ok=True)
    out = OrderedDict([
        ("source", OrderedDict([("brand", BRAND), ("doc", DOC), ("file", os.path.basename(args.pdf)), ("edition", EDITION),
                                ("secondary", OrderedDict([("doc", SHEET_DOC), ("file", os.path.basename(args.sheets)), ("edition", SHEET_EDITION),
                                                           ("use", "single-lift flow point for heads without a 2026 catalog flow table")])),
                                ("pagesUsed", "heads 7-11, 16, 18-25, 28-29, 32-33, 38-41, 49-50, 52-53, 56, 58; kits 12, 17, 24, 31, 35, 42, 59; cams 34, 62-63; "
                                              "springs 64-67; rockers 26, 30, 46, 51, 55, 60; pushrods 60-61; lifters 63; intakes 15, 27, 30, 43, 45, 48, 51, 54, 57, 59; head gaskets 35, 73"),
                                ("network", "none; local PDFs saved by the owner")])),
        ("extracted", dt.date.today().isoformat()),
        ("count", len(records)),
        ("parts", records),
    ])
    with open(os.path.join(OUT, "trickflow.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    qa_all = qa + [f"skipped: {s}" for s in skipped]
    write_notes(os.path.join(OUT, "trickflow.md"), records, qa_all, unused_flow, sheets)
    by_cat = Counter(r["cat"] for r in records)
    print(" ".join(f"{k}={v}" for k, v in by_cat.items()), f"total={len(records)} qa={len(qa)} skipped={len(skipped)}")


if __name__ == "__main__":
    main()
