#!/usr/bin/env python3
"""Extract Edelbrock cylinder heads, valve springs and intake manifolds from the 2025 master catalog PDF.

Source: https://edelbrock-files-v1.s3-us-west-1.amazonaws.com/catalogs/2025-Edelbrock-Catalog.pdf
(the only document fetched; no edelbrock.com page is requested).

  - cylinder head spec tables (PDF pp 90-109) -> `head` records; the companion
    "Head Part No. | Head Bolts | ... | Springs | Retainers" tables add related part numbers
  - flow data table (PDF p 111, @ 28" H2O) -> head.spec.flow
  - valve spring table (PDF p 110, installed height / loads / coil bind / max RPM) -> head.spec.spring
    and `spring` records keyed by the spring part number the companion table names
  - intake manifold tables (PDF pp 30-77 and the flathead manifolds on p 100) -> `intake` records

Output: out/edelbrock.json (shared parts record format) and out/edelbrock.md (notes).
Re-runnable: the PDF is downloaded once into dl/edelbrock/ and reused; --offline skips the network.
Writes nothing outside dl/ and out/. Run with `python -I`.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(BASE, "dl", "edelbrock")
OUT = os.path.join(BASE, "out")
HOST = "https://edelbrock-files-v1.s3-us-west-1.amazonaws.com"
PDF_URL = HOST + "/catalogs/2025-Edelbrock-Catalog.pdf"
PDF_PATH = os.path.join(DL, "2025-Edelbrock-Catalog.pdf")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BRAND = "Edelbrock"
EDITION = "2025"
DOC = "2025 Edelbrock master catalog PDF"
MIN_GAP = 6.0

HEAD_PAGES = list(range(90, 110))
FLOW_PAGE = 111
SPRING_PAGE = 110
INTAKE_PAGES = list(range(30, 78)) + [100]

HELD_BACK_RE = re.compile(r"\b(Holden|Honda|Acura|Rover|B18C|B16A)\b", re.I)
ACCESSORY_RE = re.compile(
    r"Gasket|Fuel Rail|Linkage|Bracket|Valley (Cover|Plate)|Adapter|Spacer|Top Only|Top \(|Stud Kit|Carb Base|"
    r"Replacement|Coil Bracket|Plate$|Generator|Cloverleaf|Orientation|Progressive|Flange$|GENERATOR", re.I)

# ----------------------------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------------------------
_last_request = 0.0


def fetch(url, dest, log, allow_403=False):
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
            r = requests.get(url, headers={"User-Agent": UA}, timeout=300)
        except requests.exceptions.ConnectionError as e:
            _last_request = time.time()
            log.append(f"GET {url} -> connection error ({e.__class__.__name__}), attempt {attempt + 1}")
            time.sleep(2 ** (attempt + 1))
            continue
        _last_request = time.time()
        log.append(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
        if r.status_code == 403 and allow_403:
            return None
        if r.status_code != 200:
            raise SystemExit(f"{url}: HTTP {r.status_code}; not retrying")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(r.content)
        return dest
    raise SystemExit(f"{url}: gave up after repeated connection errors")


def check_robots(log):
    """S3 buckets have no robots.txt unless the owner uploads one; a 403 AccessDenied XML means 'no such object'."""
    marker = os.path.join(DL, "robots.status")
    if os.path.exists(marker):
        log.append("cached: robots.txt status " + open(marker).read().strip())
        return
    path = fetch(HOST + "/robots.txt", os.path.join(DL, "robots.txt"), log, allow_403=True)
    os.makedirs(DL, exist_ok=True)
    if path is None:
        open(marker, "w").write("403 AccessDenied (no robots.txt object in the bucket); no crawl rules to apply\n")
        log.append("robots.txt: 403 AccessDenied from S3 (no robots.txt object); no crawl rules to apply")
        return
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
    for d in disallow:
        if "/catalogs/2025-Edelbrock-Catalog.pdf".startswith(d):
            raise SystemExit(f"robots.txt disallows {d}; stopping")
    open(marker, "w").write(f"200; '*' disallows {disallow}; crawl-delay {delay}\n")
    log.append(f"robots.txt: '*' group disallows {disallow}; crawl-delay {delay}")


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
NUM_RE = re.compile(r"-?\d*\.\d+|-?\d+")
DASHES = {"", "-", "–", "—", "N/A", "n/a", "NA"}


def clean(d):
    return {k: v for k, v in d.items() if v is not None and v != "" and v != [] and v != {}}


def cell(s):
    return " ".join((s or "").replace("\n", " ").split()).strip()


def is_blank(s):
    return cell(s) in DASHES


def nums(s):
    """All numbers in a cell ('0.700" 0.650"' -> [0.7, 0.65]; '1,200' -> [1200])."""
    out = []
    for m in NUM_RE.findall(cell(s).replace(",", "")):
        v = float(m)
        out.append(int(v) if v.is_integer() and "." not in m else v)
    return out


def num1(s, qa=None, where=None, what=None):
    """First number in the cell; flags cells that hold more than one value."""
    if is_blank(s):
        return None
    vals = nums(s)
    if not vals:
        return None
    if len(vals) > 1 and qa is not None and not re.search(r"\d[\"”″]?\s*[xX]\s*\d", cell(s)):
        qa.append(f"{where}: {what} cell holds several values `{cell(s)}`; first kept")
    return vals[0]


def parse_years(s):
    t = cell(s)
    if is_blank(t):
        return None, None, None
    m = re.match(r"^(?:Early|Pre)\s*-\s*(\d{4})$", t, re.I)
    if m:
        return None, int(m.group(1)), t
    m = re.match(r"^(\d{4})\s*-\s*(\d{4}|\d{2}|Later|later|Up|up|Present)\b", t)
    if m:
        y0 = int(m.group(1))
        b = m.group(2)
        if b.isdigit():
            y1 = int(b) if len(b) == 4 else (y0 // 100) * 100 + int(b)
            if y1 < y0:
                y1 += 100
        else:
            y1 = None
        return y0, y1, t
    m = re.match(r"^(\d{4})\s*(?:&\s*)?(?:Later|later|and later|& later|-Later)?$", t)
    if m:
        return int(m.group(1)), None, t
    return None, None, t


def parse_rpm(s):
    t = cell(s).replace(",", "")
    if is_blank(t):
        return None, None
    m = re.match(r"^(Idle|idle|\d{3,5})\s*-\s*(\d{4,5})\+?", t)
    if not m:
        return None, None
    lo = 0 if m.group(1).lower() == "idle" else int(m.group(1))
    return lo, int(m.group(2))


def parse_hp(s):
    t = cell(s)
    if is_blank(t):
        return None, None
    m = re.match(r"^(\d{3,4})\s*-\s*(\d{3,4})$", t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.match(r"^(\d{3,4})\s*\+$", t)
    if m:
        return int(m.group(1)), None
    return None, None


def pn_list(s):
    """'60859, 60879' / '60139/60119' / '#60059 #60065, #60075' -> ['60859', '60879']."""
    return re.findall(r"\d{4,6}(?:-[A-Z]{1,3})?", cell(s))


def is_pn(s):
    return re.fullmatch(r"\d{4,6}(?:-[A-Z]{1,3})?\*?", cell(s)) is not None


# ----------------------------------------------------------------------------------------------
# emissions icons (ZapfDingbats 'l' = filled circle, coloured per the footer legend)
# ----------------------------------------------------------------------------------------------
LEGEND_LABELS = ["50-STATE LEGAL", "EPA LEGAL", "RACING ONLY", "PRE-POLLUTION CONTROLLED VEHICLES", "STOCK REPLACEMENT", "ENGINE SWAP"]
LEGEND_KEYS = {"50-STATE LEGAL": "50-state legal", "EPA LEGAL": "EPA legal", "RACING ONLY": "racing only",
               "PRE-POLLUTION CONTROLLED VEHICLES": "pre-pollution controlled vehicles", "STOCK REPLACEMENT": "stock replacement",
               "ENGINE SWAP": "engine swap"}


def color_key(c):
    if not c:
        return None
    try:
        return tuple(round(float(x), 1) for x in c)
    except (TypeError, ValueError):
        return None


_LEGEND = {}


def read_legend(page, qa):
    """{colour: label} from the 'EMISSIONS GUIDE' footer (right-hand pages only; left-hand pages print the P65
    warning instead, so the legend of the last page that had one is reused)."""
    found = _read_legend(page)
    if found:
        if _LEGEND and found != _LEGEND:
            qa.append(f"p{page.page_number}: emissions legend colours differ from the earlier pages")
        _LEGEND.clear()
        _LEGEND.update(found)
    return dict(_LEGEND) if _LEGEND else None


def _read_legend(page):
    words = page.extract_words()
    foot_y = page.height - 60
    foot = [w for w in words if w["top"] > foot_y]
    labels = []
    txt_words = [(w["x0"], w["text"]) for w in sorted(foot, key=lambda w: (round(w["top"]), w["x0"]))]
    joined = " ".join(t for _, t in txt_words)
    if "EMISSIONS GUIDE" not in joined:
        return None
    for lab in LEGEND_LABELS:
        first = lab.split()[0]
        xs = [x for x, t in txt_words if t == first]
        if xs:
            labels.append((xs[0], lab))
    shapes = [s for s in page.curves + page.rects if s["top"] > foot_y and s["x0"] < 470]
    legend = {}
    for s in shapes:
        ck = color_key(s.get("non_stroking_color"))
        if ck is None or ck == (0.1, 0.1, 0.1) and False:
            continue
        right = [(x, lab) for x, lab in labels if 0 < x - s["x0"] < 12]
        if right:
            legend[ck] = right[0][1]
    return legend if len(legend) >= 5 else None


def emission_dots(page):
    """[(x, y, colour)] for every coloured dot on the page."""
    out = []
    for c in page.chars:
        if "Dingbat" in c["fontname"] and c["text"] == "l":
            ck = color_key(c.get("non_stroking_color"))
            if ck:
                out.append((c["x0"], (c["top"] + c["bottom"]) / 2, ck))
    return out


def nearest_label(ck, legend):
    if ck in legend:
        return legend[ck]
    # colour variants (two reds are used): nearest legend colour
    best = min(legend, key=lambda k: sum((a - b) ** 2 for a, b in zip(k, ck)))
    if sum((a - b) ** 2 for a, b in zip(best, ck)) < 0.05:
        return legend[best]
    return None


def emissions_value(labels):
    """Record-level `emissions` from the catalog's icon labels."""
    if not labels:
        return "unknown"
    s = set(labels)
    if "racing only" in s and not (s & {"50-state legal", "EPA legal", "stock replacement"}):
        return "no_eo_race_only"
    if "50-state legal" in s:
        return "carb_eo:unlisted"
    if "stock replacement" in s and len(s) == 1:
        return "oem_replacement"
    return "unknown"


# ----------------------------------------------------------------------------------------------
# tables
# ----------------------------------------------------------------------------------------------
TABLE_SETTINGS = {"vertical_strategy": "lines", "horizontal_strategy": "lines", "snap_tolerance": 3, "intersection_tolerance": 5}


def find_tables(page):
    """pdfplumber Table objects (with cell bboxes) that look like data tables."""
    out = []
    for t in page.find_tables(TABLE_SETTINGS):
        rows = t.extract()
        if len(rows) < 2 or max(len(r) for r in rows) < 4:
            continue
        out.append((t, [[cell(c) for c in r] for r in rows]))
    return out


def header_labels(rows, i):
    """(labels, next_row_index): labels = [(main, sub)] per column for the header at rows[i]."""
    main_row = rows[i]
    sub_row = rows[i + 1] if i + 1 < len(rows) else []
    has_sub = bool(sub_row) and sub_row[0] == "" and any(sub_row) and not any(is_pn(c) for c in sub_row)
    labels = []
    last = ""
    for c, m in enumerate(main_row):
        if m:
            last = m
        labels.append((last, sub_row[c] if has_sub and c < len(sub_row) else ""))
    return labels, i + (2 if has_sub else 1)


def row_dot_labels(table, rows, ri, col, dots, legend):
    """Emission labels of the coloured dots inside cell (ri, col) of a pdfplumber Table."""
    if legend is None:
        return []
    try:
        bbox = table.rows[ri].cells[col]
    except (IndexError, AttributeError):
        return []
    if bbox is None:
        return []
    x0, top, x1, bottom = bbox
    labs = []
    for x, y, ck in dots:
        if x0 - 1 <= x <= x1 + 1 and top - 1 <= y <= bottom + 1:
            lab = nearest_label(ck, legend)
            if lab:
                labs.append(LEGEND_KEYS[lab])
    return sorted(set(labs))


# ----------------------------------------------------------------------------------------------
# families
# ----------------------------------------------------------------------------------------------
BBC = ["Chevy Mark IV big block", "Chevy Gen VI big block"]
KNOWN_FAMS = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409", "GM LS", "GM LT (Gen V)",
    "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE", "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3",
    "Mopar LA small block", "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350", "Buick V6 181-252", "Cadillac 368-500",
    "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6", "Ford 240/300 inline-6", "Mopar Slant Six",
}
CYL = {"AMC/Jeep inline-6": 6, "Chevy inline-6": 6, "Ford 240/300 inline-6": 6, "Mopar Slant Six": 6, "Buick V6 181-252": 6,
       "Chevy 60° V6 2.8/3.1": 6, "Chevy 90° V6 200/229/262": 6}


def cyl_of(fam):
    return CYL.get(fam, 8)


def head_families(section, product, page_header):
    """Families for a head spec row from its section heading (the uppercase row in the table)."""
    s = (section or "").upper()
    p = product.upper()
    h = page_header.upper()
    if "AMC" in s:
        return ["AMC V8"]
    if "BUICK" in s:
        return ["Buick big block"]
    if "LT1/LT4" in s or "GEN V" in s:
        return ["GM LT (Gen V)"]
    if s.startswith("LS") or "LS1" in s or "LS3" in s or "LS7" in s:
        return ["GM LS"]
    if "348/409" in s or "W-SERIES" in s:
        return ["Chevy W-series 348/409"]
    if "396-502" in s or "BIG-BLOCK RACE" in s:
        return list(BBC)
    if "262-400" in s:
        return ["Small-block Chevy"]
    if "318-360" in s:
        return ["Mopar Magnum 5.2/5.9"] if "MAGNUM" in p else ["Mopar LA small block"]
    if "383-440" in s:
        return ["Mopar B/RB big block"]
    if "426" in s and "HEMI" in s:
        return ["Chrysler 426 Hemi"]
    if "GEN III HEMI" in s:
        if "5.7" in p and "6.1" not in p:
            return ["Chrysler Gen III Hemi 5.7/6.1"]
        if "6.1" in p or "6.4" in p:
            return ["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"]
        return ["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"]
    if "289-351W" in s:
        return ["Small-block Ford (Windsor)"]
    if "CLEVELAND" in s:
        return ["Ford 351C/351M/400"]
    if "429/460" in s:
        return ["Ford 429/460"]
    if "FORD FE" in s:
        return ["Ford FE"]
    if "JEEP" in s:
        return ["AMC/Jeep inline-6"]
    if "OLDSMOBILE" in s:
        return ["Oldsmobile V8"]
    if "PONTIAC" in s:
        return ["Pontiac V8"]
    if "HOLDEN" in s:
        return ["Holden V8"]
    if "FLATHEAD" in h:
        return ["Ford Flathead V8"]
    return [f"{page_header}: {section}"[:70]]


def intake_families(page_header, make, engine, product, y1):
    """Families for an intake row from the page header, the row's Make/Engine cells and the product name."""
    h = page_header.upper()
    mk = (make or "").upper()
    e = (engine or "").upper().replace("“", '"').replace("”", '"')
    p = product.upper()
    if "AMC" in mk or ("AMC" in h and not mk):
        return ["AMC V8"]
    if "CADILLAC" in mk:
        return ["Cadillac 368-500"]
    if "BUICK" in mk or "BUICK" in h:
        if "231" in e or "252" in e or "V6" in e:
            return ["Buick V6 181-252"]
        if "400" in e or "455" in e:
            return ["Buick big block"]
        if "215" in e:
            return ["Buick 215/300/340 V8"]
    if "CHEVROLET" in mk or "CHEVROLET" in h or "LS" in e:
        if "2.8 L" in e or "60°" in p:
            return ["Chevy 60° V6 2.8/3.1"]
        if "V6" in e or "200/229/262" in e or "4.3 L" in e:
            return ["Chevy 90° V6 200/229/262"]
        if re.search(r"\bLS\d|\bL92|\bL76|\bLS\b", e) or "LS" in h and re.search(r"\bLS", p):
            return ["GM LS"]
        if "348/409" in e or "W-SERIES" in h:
            return ["Chevy W-series 348/409"]
        if re.search(r"396|454|468|500 ?\+|540|565|572|632|502|BIG-BLOCK", e) or ("BIG-BLOCK" in h and not re.search(r"262|SMALL", e)):
            return ["Chevy Mark IV big block"] if (y1 is not None and y1 <= 1990) else list(BBC)
        if re.search(r"262|SMALL-BLOCK|302|327|350|355|375|5\.7 L|305", e):
            return ["Small-block Chevy"]
    if "CHRYSLER" in mk or "CHRYSLER" in h or "HEMI" in h:
        if "5.2" in e or "5.9" in e or "MAGNUM" in p:
            return ["Mopar Magnum 5.2/5.9"]
        if "426-572" in e or ("HEMI" in p and "1964" in str(y1 or "")) or ("HEMI" in h and "426" in e):
            return ["Chrysler 426 Hemi"]
        if "5.7" in e or "6.1" in e:
            return ["Chrysler Gen III Hemi 5.7/6.1"]
        if re.search(r"318|340|360|SMALL-BLOCK", e):
            return ["Mopar LA small block"]
        if re.search(r"361|383|400|413|426|440|505", e):
            return ["Mopar B/RB big block"]
    if "FORD" in mk or "FORD" in h:
        if "FLATHEAD" in h or "FLATHEAD" in mk or "MERCURY" in mk:
            return ["Ford Flathead V8"]
        if "4.6" in p or "SOHC" in e or "MOD" in e:
            return ["Ford Modular"]
        if "7.3" in e:
            return ["Ford Godzilla 7.3"]
        if re.search(r"351C|BOSS 351|351M|400", e):
            return ["Ford 351C/351M/400"]
        if re.search(r"332|352|360|390|406|410|427/428|428", e) and "351" not in e:
            return ["Ford FE"]
        if re.search(r"429|460|514|532", e):
            return ["Ford 429/460"]
        if re.search(r"260|289|302|347|331|351W|5\.0|5\.8|351Y", e):
            return ["Small-block Ford (Windsor)"]
    if "OLDSMOBILE" in mk:
        return ["Oldsmobile V8"]
    if "PONTIAC" in mk:
        return ["Pontiac V8"]
    if "HOLDEN" in mk or "HONDA" in mk or "ROVER" in mk:
        return [mk.title()]
    return [f"{page_header}: {make} {engine}".strip()[:70]]


# ----------------------------------------------------------------------------------------------
# heads
# ----------------------------------------------------------------------------------------------
CAM_TYPES = {"flat tappet": "hydraulic_flat", "hyd. roller": "hydraulic_roller", "hyd roller": "hydraulic_roller",
             "mech. roller": "solid_roller", "solid roller": "solid_roller", "mech roller": "solid_roller"}


def head_key(main, sub):
    m, s = main.lower(), sub.lower()
    if m.startswith(("product", "description", "application")):
        return "product"
    if m.startswith("chamber"):
        return "chamberCc"
    if m.startswith("port volume"):
        return "exhaustRunnerCc" if "exh" in s else "intakeRunnerCc"
    if m.startswith("hp range"):
        return "hpRange"
    if m.startswith("intake flange"):
        return "intakeFlange"
    if m.startswith("exhaust port"):
        return "exhaustPortLocation"
    if m.startswith("plug type"):
        return "plugType"
    if m.startswith("valve sizes"):
        return "exhaustValve" if s.startswith("exh") else "intakeValve"
    if m.startswith("camshaft"):
        return "camType"
    if m.startswith("max"):
        return "maxLift"
    if m.startswith("valve spring"):
        return "springDia"
    if m.startswith("valve chamber"):
        return "valveChamberDepth"
    if m.startswith("emissions"):
        return "emissions"
    if m.startswith("install"):
        return "installNotes"
    if re.search(r"part no|complete|bare|single|pair", m) or re.search(r"complete|bare|single|pair|logo|valves", s):
        return "pn"
    return None


def pn_col_kind(main, sub):
    t = (main + " " + sub).lower()
    return {"bare": "bare" in t and "complete" not in t.split("bare")[-1] if "bare" in t else False,
            "withValves": "with valves" in t,
            "per": 2 if "pair" in t else 1,
            "logo": sub if "logo" in sub.lower() else None}


def companion_key(main, sub):
    m, s = main.lower(), sub.lower()
    if m.startswith(("product", "description", "application")):
        return "product"
    if m.startswith("head part"):
        return "heads"
    if m.startswith("head bolt"):
        return "headBolts" + (("_" + re.sub(r"\W", "", sub)) if sub else "")
    if m.startswith("head stud"):
        return "headStuds"
    if m.startswith("head gasket"):
        return "headGasket"
    if m.startswith("intake gasket"):
        return "intakeGasket"
    if m.startswith("flange gasket"):
        return "intakeGasket"
    if m.startswith("exhaust gasket"):
        return "exhaustGasket"
    if m.startswith("valve cover"):
        return "valveCoverGasket"
    if m.startswith("pushrod"):
        return "pushrods"
    if m.startswith("valves"):
        return "exhaustValvePn" if s.startswith("exh") else "intakeValvePn"
    if m.startswith("spring"):
        return "springs"
    if m.startswith("retainer"):
        return "retainers"
    if m.startswith("spark"):
        return "sparkPlug"
    return None


MARKER_RE = re.compile(r"^\(([A-H])\)$")


def page_notes(page):
    """{'A': 'Deck thickness: 5/8", ...'} from the '(A) ...' install notes of a head page.

    The notes are set in two or three columns, so each note is read by position: the words right of its
    marker on the same line up to the next marker (or a bullet of the neighbouring column), plus the
    continuation lines directly below inside that column."""
    words = [w for w in page.extract_words(x_tolerance=1.5, y_tolerance=2) if w.get("upright", True) and w["x0"] < page.width - 25]
    lines = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if lines and abs(w["top"] - lines[-1][0]) <= 3:
            lines[-1][1].append(w)
        else:
            lines.append([w["top"], [w]])
    for ln in lines:
        ln[1].sort(key=lambda w: w["x0"])
    marker_tops = [w["top"] for w in words if MARKER_RE.match(w["text"])]
    if not marker_tops:
        return OrderedDict()
    # column boundaries: marker / bullet x positions that at least two lines near the note share (the neighbouring column)
    col_words = [w for w in words if MARKER_RE.match(w["text"]) or w["text"] == "•"]
    notes = OrderedDict()
    for i, (top, ws) in enumerate(lines):
        for j, w in enumerate(ws):
            m = MARKER_RE.match(w["text"])
            if not m:
                continue
            key = m.group(1)
            near = Counter(round(v["x0"]) for v in col_words if abs(v["top"] - top) <= 40 and v["x0"] > w["x0"] + 15)
            bounds = [x for x, n in near.items() if n >= 2]
            same_line = [v["x0"] for v in ws[j + 1:] if MARKER_RE.match(v["text"]) or v["text"] == "•"]
            right = min(bounds + same_line + [page.width - 25])
            parts = [v["text"] for v in ws[j + 1:] if v["x0"] < right - 2]
            last_top = top
            for top2, ws2 in lines[i + 1:]:
                if top2 - last_top > 14:
                    break
                col = [v for v in ws2 if w["x0"] - 3 <= v["x0"] < right - 2]
                if not col or MARKER_RE.match(col[0]["text"]) or col[0]["text"] in ("•", "Installation", "INSTALLATION", "Important", "EMISSIONS", "IMPORTANT"):
                    break
                if any(MARKER_RE.match(v["text"]) for v in col):
                    col = col[:next(k for k, v in enumerate(col) if MARKER_RE.match(v["text"]))]
                parts += [v["text"] for v in col]
                last_top = top2
            text = " ".join(parts).strip()
            if text and key not in notes:
                notes[key] = text
    return notes


def parse_heads(pdf, qa, skipped):
    """Head spec rows and companion rows from the cylinder-head pages."""
    specs, companions = [], []
    for pno in HEAD_PAGES:
        page = pdf.pages[pno - 1]
        text = page.extract_text() or ""
        header = text.splitlines()[0].strip() if text else ""
        legend = read_legend(page, qa)
        dots = emission_dots(page)
        notes = page_notes(page)
        star = next((l.strip() for l in text.splitlines() if l.strip().startswith("* ")), None)
        for table, rows in find_tables(page):
            head0 = " ".join(rows[0])
            if "Chamber Volume" in head0:
                labels, start = header_labels(rows, 0)
                keys = [head_key(m, s) for m, s in labels]
                if "chamberCc" not in keys:
                    continue
                section = None
                if "Port Volume" not in head0 and "FLATHEAD" in header.upper():
                    section = "FORD FLATHEAD V8"
                if "GEN II HEMI" in text and pno == 99 and rows[start][0].startswith("Victor Jr. CNC"):
                    section = "426-572 GEN II HEMI V8"
                for ri in range(start, len(rows)):
                    r = rows[ri]
                    if r[0] and not any(r[1:]):
                        section = r[0]
                        continue
                    if sum(1 for c in r if c) < 3:
                        continue
                    row = {"page": pno, "header": header, "section": section, "pns": [], "notesText": notes, "star": star}
                    for c, (k, v) in enumerate(zip(keys, r)):
                        if k is None:
                            continue
                        if k == "pn":
                            if is_blank(v):
                                continue
                            kind = pn_col_kind(*labels[c])
                            for p in cell(v).split():
                                if is_pn(p):
                                    row["pns"].append((p.rstrip("*"), p.endswith("*"), kind))
                                else:
                                    qa.append(f"p{pno} {r[0]}: unreadable part number cell `{v}`")
                        elif k == "emissions":
                            labs = row_dot_labels(table, rows, ri, c, dots, legend)
                            if labs or "emissionLabels" not in row:
                                row["emissionLabels"] = labs
                        elif k == "product":
                            row[k] = v if not row.get(k) else row[k]
                        else:
                            row[k] = v
                    if not row.get("product") or not row["pns"]:
                        skipped.append((f"p{pno}", r[0] or "(blank)", "head row without a part number"))
                        continue
                    specs.append(row)
            elif "Head Part No" in head0:
                labels, start = header_labels(rows, 0)
                keys = [companion_key(m, s) for m, s in labels]
                for r in rows[start:]:
                    if sum(1 for c in r if c) < 3:
                        continue
                    comp = {"page": pno}
                    for k, v in zip(keys, r):
                        if k is None or is_blank(v):
                            continue
                        if k == "heads":
                            comp["heads"] = pn_list(v)
                        elif k == "product":
                            comp.setdefault("product", v)
                        else:
                            comp[k] = v
                    if comp.get("heads"):
                        companions.append(comp)
    return specs, companions


def parse_flow(pdf, qa):
    """{head PN: [{lift, int, exh}]} from the flow-data page."""
    page = pdf.pages[FLOW_PAGE - 1]
    flow = {}
    for table, rows in find_tables(page):
        if "PART NO." not in rows[0][0].upper():
            continue
        lifts = []
        for h in rows[0][1:]:
            m = re.match(r"^(\d\.\d{3})", h)
            lifts.append(float(m.group(1)) if m else None)
        make = None
        for r in rows[1:]:
            if r[0] and not any(r[1:]):
                make = r[0]
                continue
            pns = pn_list(r[0])
            if not pns:
                continue
            pts = []
            for lift, v in zip(lifts, r[1:]):
                if lift is None or is_blank(v):
                    continue
                m = re.match(r"^(\d+)\s*/\s*(\d+)$", cell(v))
                if not m:
                    qa.append(f"flow p{FLOW_PAGE} {r[0]} @ {lift}: unreadable cell `{v}`")
                    continue
                pts.append({"lift": lift, "int": int(m.group(1)), "exh": int(m.group(2))})
            for pn in pns:
                if pn in flow:
                    qa.append(f"flow p{FLOW_PAGE}: part number {pn} listed twice; first kept")
                    continue
                flow[pn] = {"flow": pts, "make": make}
    return flow


def parse_springs(pdf, qa):
    """{head PN: spring spec} from the valve-spring info page."""
    page = pdf.pages[SPRING_PAGE - 1]
    out = {}
    for table, rows in find_tables(page):
        if not rows[0][0].lower().startswith("cylinder head"):
            continue
        for r in rows[1:]:
            heads = pn_list(r[0])
            if not heads:
                continue
            inst = num1(r[1])
            rates = cell(r[2])
            pairs = re.findall(r"(\d\.\d{3})\"?\s*=\s*(\d+)\s*lbs", rates)
            coil = num1(r[3])
            rpm = [int(x) for x in re.findall(r"(\d{4})\s*RPM", cell(r[4]))]
            spec = OrderedDict()
            spec["installedHt"] = inst
            if pairs:
                spec["seatLb"] = int(pairs[0][1])
                if abs(float(pairs[0][0]) - (inst or 0)) > 0.001:
                    qa.append(f"springs p{SPRING_PAGE} {r[0][:40]}: seat load quoted at {pairs[0][0]}\" but installed height is {inst}\"")
                    spec["seatLbAt"] = float(pairs[0][0])
                if len(pairs) > 1:
                    spec["openHt"] = float(pairs[1][0])
                    spec["openLb"] = int(pairs[1][1])
            else:
                qa.append(f"springs p{SPRING_PAGE} {r[0][:40]}: no load pairs read from `{rates}`")
            spec["coilBind"] = coil
            if rpm:
                spec["maxRpm"] = max(rpm)
                if len(rpm) > 1:
                    spec["maxRpmNote"] = "Performer cams %d RPM, Performer RPM cams %d RPM" % (min(rpm), max(rpm))
            for h in heads:
                if h in out:
                    qa.append(f"springs p{SPRING_PAGE}: head {h} listed in two rows; first kept")
                    continue
                out[h] = clean(spec)
    return out


# ----------------------------------------------------------------------------------------------
# intakes
# ----------------------------------------------------------------------------------------------
def intake_key(main, sub):
    m, s = main.lower(), sub.lower()
    if m.startswith("product"):
        return "product"
    if "year" in m:
        return "year"
    if m.startswith("make"):
        return "make"
    if m.startswith("engine"):
        return "engine"
    if m.startswith("mount"):
        return "mount"
    if "range" in m:
        return "rpm"
    if m.startswith("manifold") or m.startswith("overall"):
        t = s or m
        if "front" in t or t.strip() == "a" or "(a)" in t:
            return "heightFront"
        if "back" in t or t.strip() == "b" or "(b)" in t:
            return "heightRear"
        if "overall" in m:
            return "heightOverall"
        if re.fullmatch(r"[c-e]|length \(c\)", t.strip()):
            return "dim" + t.strip()[-2].upper() if "(" in t else "dim" + t.strip().upper()
        return None
    if m.startswith("bolt hole"):
        if "roof" in s or s.strip() == "r":
            return "boltToRoof"
        if "floor" in s or s.strip() == "f":
            return "boltToFloor"
        return None
    if m.startswith("width") or m.strip() == "w":
        return "portWidth"
    if m.startswith("height") or m.strip() == "h":
        return "portHeight"
    if m.startswith("carb pad") or m.startswith("carb height") or m.strip() == "ch":
        return "carbPadHeight"
    if m.startswith("carb angle") or m.strip() == "ca":
        return "carbAngle"
    if m.startswith("port exit") or m.startswith("port e"):
        return "portExit"
    if m.startswith("emissions") or "emissions" in m:
        return "emissions"
    if m.startswith("part no") or "part no" in m:
        return "pn"
    return None


FINISHES = {"satin": "satin", "polished": "polished", "black powder": "black powder coat", "black pc": "black powder coat",
            "chrome plasma": "chrome plasma", "black plasma": "black plasma", "black": "black"}


def intake_type(product, mount):
    p = product.lower()
    if "efi" in p or "pro-flo" in p or "t.b.i." in p or "tbi" in p or "throttle body" in (mount or "").lower() or "xts" in p:
        t = "efi"
    elif "tunnel ram" in p or "victor ram" in p or "cross-ram" in p:
        t = "tunnel-ram"
    elif "torker" in p or "victor" in p or "glidden" in p or "c-357" in p or "slingshot" in p or "triple deuce" in p or "4-barrel" in p:
        t = "single-plane"
    elif "performer" in p or "air-gap" in p or "c-26" in p or "ch-" in p:
        t = "dual-plane"
    else:
        t = None
    if "dual-quad" in p and "hemi" in p:
        t = "single-plane"  # catalog text: 'a single-plane Air-Gap design'
    return t


def carb_flange(mount, product):
    m = (mount or "").lower()
    if not m or m in DASHES:
        return None
    if "throttle" in m or "tbi" in m or "mm" in m:
        return "throttle-body"
    if "4500" in m:
        return "dominator"
    if "q-jet" in m or "tq" == m.strip() or "spread" in m:
        return "spread"
    if "universal" in m:
        return "universal"
    if "sq" in m or "4150" in m or "eps" in m or "avs2" in m:
        return "square"
    if "2v" in m:
        return "2-barrel"
    return m


def parse_intakes(pdf, qa, skipped):
    rows_out = []
    for pno in INTAKE_PAGES:
        page = pdf.pages[pno - 1]
        text = page.extract_text() or ""
        header = text.splitlines()[0].strip() if text else ""
        legend = read_legend(page, qa)
        dots = emission_dots(page)
        for table, rows in find_tables(page):
            # p32: the ruling joins the rotated side-tab column to the table; drop the columns left of 'Products'
            off = 0
            for r in rows:
                k = next((k for k, c in enumerate(r) if c.startswith("Product")), None)
                if k:
                    off = k
                    break
            if off:
                rows = [r[off:] for r in rows]
            # a table may hold several header rows (p44, p50)
            ri = 0
            while ri < len(rows):
                r = rows[ri]
                if not r[0].startswith("Product"):
                    ri += 1
                    continue
                head0 = " ".join(r)
                if "Kit Part No" in head0 or "Intake Manifold" in head0 or "Chamber" in head0:
                    ri += 1
                    continue
                labels, start = header_labels(rows, ri)
                keys = [intake_key(m, s) for m, s in labels]
                if "pn" not in keys or not ({"rpm", "heightFront", "engine", "make"} & set(keys)):
                    ri = start
                    continue
                ri = start
                while ri < len(rows) and not rows[ri][0].startswith("Product"):
                    r = rows[ri]
                    ri += 1
                    if sum(1 for c in r if c) < 2:
                        continue
                    row = {"page": pno, "header": header, "pns": []}
                    for c, (k, v) in enumerate(zip(keys, r)):
                        if k is None:
                            continue
                        if k == "pn":
                            if is_blank(v):
                                continue
                            main, sub = labels[c]
                            fin = FINISHES.get(sub.lower()) if sub else None
                            for p in cell(v).replace(" P", "P").split():
                                if is_pn(p):
                                    row["pns"].append((p.rstrip("*"), fin))
                                else:
                                    qa.append(f"p{pno} {r[0][:40]}: unreadable part number cell `{v}`")
                        elif k == "emissions":
                            labs = row_dot_labels(table, rows, ri - 1, c + off, dots, legend)
                            if labs or "emissionLabels" not in row:
                                row["emissionLabels"] = labs
                        elif k in row and row[k]:
                            continue
                        else:
                            row[k] = v
                    if not row["pns"]:
                        if r[0]:
                            skipped.append((f"p{pno}", r[0][:60], "no part number (note row)"))
                        continue
                    if not row.get("product"):
                        skipped.append((f"p{pno}", row["pns"][0][0], "continuation row without a product name"))
                        continue
                    rows_out.append(row)
    return rows_out


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def src(pno):
    return OrderedDict([("doc", DOC), ("edition", EDITION), ("url", PDF_URL), ("page", pno), ("printedPage", pno - 1)])


def build_heads(specs, companions, flow, springs, qa, skipped):
    records = []
    seen = {}
    comp_by_pn = {}
    for comp in companions:
        for h in comp["heads"]:
            comp_by_pn.setdefault(h, comp)
    flow_used = set()
    page_rows = defaultdict(list)
    for row in specs:
        page_rows[row["page"]].append(row)

    for row in specs:
        pno = row["page"]
        product = row["product"]
        where = f"p{pno} {product}"
        held = HELD_BACK_RE.search(product) or HELD_BACK_RE.search(row.get("section") or "")
        fams = head_families(row.get("section"), product, row["header"])
        if held:
            for pn, _, kind in row["pns"]:
                skipped.append((f"p{pno}", pn, f"held back (import make): {product}"))
            continue
        spec = OrderedDict()
        spec["chamberCc"] = num1(row.get("chamberCc"), qa, where, "chamber volume")
        spec["intakeRunnerCc"] = num1(row.get("intakeRunnerCc"), qa, where, "intake port volume")
        spec["exhaustRunnerCc"] = num1(row.get("exhaustRunnerCc"), qa, where, "exhaust port volume")
        spec["intakeValve"] = num1(row.get("intakeValve"), qa, where, "intake valve")
        spec["exhaustValve"] = num1(row.get("exhaustValve"), qa, where, "exhaust valve")
        spec["maxLift"] = num1(row.get("maxLift"), qa, where, "max lift")
        spec["springDia"] = num1(row.get("springDia"), qa, where, "spring diameter")
        if row.get("springDia") and len(nums(row["springDia"])) > 1:
            spec["springDiaCatalog"] = cell(row["springDia"])
        if row.get("maxLift") and len(nums(row["maxLift"])) > 1:
            spec["maxLiftCatalog"] = cell(row["maxLift"])
        hp = cell(row.get("hpRange", ""))
        lo, hi = parse_hp(hp)
        if hp and not is_blank(hp):
            spec["hpRange"] = hp
            if lo is None:
                qa.append(f"{where}: HP range `{hp}` is not a range; kept as printed")
            spec["hpLow"], spec["hpHigh"] = lo, hi
        ct = cell(row.get("camType", "")).lower()
        if ct and not is_blank(ct):
            if ct in CAM_TYPES:
                spec["camType"] = CAM_TYPES[ct]
            elif ct == "bare":
                pass
            else:
                qa.append(f"{where}: camshaft type `{ct}` not mapped")
                spec["camTypeCatalog"] = cell(row["camType"])
        for k in ("intakeFlange", "exhaustPortLocation", "plugType"):
            v = cell(row.get(k, ""))
            if v and not is_blank(v):
                spec[k] = v
        vcd = num1(row.get("valveChamberDepth"))
        if vcd is not None:
            spec["valveChamberDepth"] = vcd
        codes = [c for c in re.split(r"[,\s]+", cell(row.get("installNotes", ""))) if re.fullmatch(r"[A-H]", c)]
        if codes:
            spec["installNoteCodes"] = codes
            texts = [row["notesText"][c] for c in codes if c in row["notesText"]]
            if texts:
                spec["installNotes"] = texts
            missing = [c for c in codes if c not in row["notesText"]]
            if missing:
                qa.append(f"{where}: install note(s) {missing} referenced but not found on the page")
        if row.get("emissionLabels"):
            spec["emissionsCodes"] = row["emissionLabels"]
        ct_name = {"hydraulic_flat": "hydraulic flat tappet", "hydraulic_roller": "hydraulic roller", "solid_roller": "solid roller"}.get(spec.get("camType"))

        for pn, starred, kind in row["pns"]:
            if pn in seen:
                skipped.append((f"p{pno}", pn, f"same part number already emitted from p{seen[pn]} ({'bare casting shared by several rows' if kind['bare'] else 'duplicate row'})"))
                continue
            seen[pn] = pno
            s = OrderedDict(spec)
            s["bare"] = bool(kind["bare"])
            if kind["withValves"]:
                s["bareWithValves"] = True
            s["per"] = 2 if (kind["per"] == 2 or starred) else 1
            if starred and row.get("star"):
                s["note"] = row["star"].lstrip("* ").strip()
            if kind["logo"]:
                s["logo"] = kind["logo"]
            if kind["bare"]:
                # a bare casting carries no springs: the row's cam type / max lift / spring diameter describe the complete head
                for k in ("camType", "maxLift", "springDia", "springDiaCatalog", "maxLiftCatalog"):
                    s.pop(k, None)
            comp = comp_by_pn.get(pn)
            related = OrderedDict()
            if comp:
                for k in ("headBolts", "headBolts_Pre1970", "headBolts_1970Later", "headStuds", "headGasket", "intakeGasket", "exhaustGasket",
                          "valveCoverGasket", "pushrods", "intakeValvePn", "exhaustValvePn", "springs", "retainers", "sparkPlug"):
                    v = comp.get(k)
                    if v and not is_blank(v):
                        related[k] = v.lstrip("#")
            if related:
                s["related"] = related
            fl = flow.get(pn)
            if fl:
                s["flow"] = fl["flow"]
                s["flowDepression"] = 28
                flow_used.add(pn)
            sp = springs.get(pn)
            if sp and not kind["bare"]:
                s["spring"] = sp
            parts = [product]
            if s.get("chamberCc") is not None:
                parts.append(f"{s['chamberCc']} cc chamber")
            if s.get("intakeRunnerCc") is not None:
                parts.append(f"{s['intakeRunnerCc']} cc intake port")
            if ct_name and not kind["bare"]:
                parts.append(ct_name)
            parts.append("bare" + (" with valves" if kind["withValves"] else "") if kind["bare"] else "complete")
            if s["per"] == 2:
                parts.append("pair")
            name = ", ".join(parts)
            for fam in fams:
                fit = OrderedDict([("fam", fam), ("cyl", cyl_of(fam))])
                notes = []
                if row.get("section"):
                    notes.append(row["section"])
                if fam not in KNOWN_FAMS:
                    notes.append("family not in fitment list")
                if notes:
                    fit["notes"] = "; ".join(notes)
                rec = OrderedDict([("m", BRAND), ("p", pn), ("cat", "head"), ("name", name), ("fit", fit), ("spec", clean(s)),
                                   ("src", src(pno)), ("emissions", None)])
                records.append(rec)

    # flow for hydraulic-roller twins: the flow page says roller-cam heads flow the same as the flat-tappet version
    by_pn = defaultdict(list)
    for r in records:
        by_pn[r["p"]].append(r)
    for pno, rows in page_rows.items():
        for row in rows:
            for pn, _, kind in row["pns"]:
                recs = by_pn.get(pn)
                if not recs or "flow" in recs[0]["spec"]:
                    continue
                r0 = recs[0]["spec"]
                for other in rows:
                    if other is row or other["product"] != row["product"]:
                        continue
                    for opn, _, okind in other["pns"]:
                        orecs = by_pn.get(opn)
                        if not orecs or "flow" not in orecs[0]["spec"]:
                            continue
                        o = orecs[0]["spec"]
                        if all(o.get(k) == r0.get(k) for k in ("chamberCc", "intakeRunnerCc", "exhaustRunnerCc", "intakeValve", "exhaustValve")):
                            for rec in recs:
                                rec["spec"]["flow"] = o["flow"]
                                rec["spec"]["flowDepression"] = 28
                                rec["spec"]["flowSource"] = opn
                            break
                    if "flow" in r0:
                        break
    unused = sorted(set(flow) - flow_used)
    return records, unused


def build_springs(head_records, qa):
    """`spring` records from the head records' companion spring PN + the spring-info page data."""
    by_spring = defaultdict(list)
    for r in head_records:
        s = r["spec"]
        sp = s.get("spring")
        rel = s.get("related", {})
        if not sp or not rel.get("springs"):
            continue
        pns = pn_list(rel["springs"])
        if len(pns) != 1:
            qa.append(f"head {r['p']}: companion table lists springs `{rel['springs']}`; spring data not attributed to one spring part number")
            continue
        by_spring[pns[0]].append(r)
    records = []
    for spn, heads in sorted(by_spring.items()):
        groups = defaultdict(list)
        for r in heads:
            sp = r["spec"]["spring"]
            key = (sp.get("installedHt"), sp.get("seatLb"), sp.get("openLb"), sp.get("openHt"), sp.get("coilBind"))
            groups[key].append(r)
        grp = heads
        dias = sorted(set(r["spec"].get("springDia") for r in grp if r["spec"].get("springDia") is not None))
        spec = OrderedDict()
        if len(dias) == 1:
            spec["od"] = dias[0]
        elif dias:
            qa.append(f"spring {spn}: heads using it list spring diameters {dias}; od omitted")
        if len(groups) == 1:
            sp = grp[0]["spec"]["spring"]
            for k in ("installedHt", "seatLb", "seatLbAt", "openHt", "openLb", "coilBind", "maxRpm", "maxRpmNote"):
                if k in sp:
                    spec[k] = sp[k]
            if spec.get("installedHt") is not None and spec.get("coilBind") is not None:
                spec["maxLift"] = round(spec["installedHt"] - spec["coilBind"] - 0.05, 3)
                spec["maxLiftNote"] = "installed height - coil bind - 0.050 (computed)"
        else:
            # the spring-info page is keyed by head, and the same spring part number is listed at different
            # installed heights / loads in different heads: keep every installation, no single top-level value
            inst = []
            for key, v in groups.items():
                sp = v[0]["spec"]["spring"]
                e = OrderedDict([("heads", sorted(set(x["p"] for x in v)))])
                for k in ("installedHt", "seatLb", "seatLbAt", "openHt", "openLb", "coilBind", "maxRpm"):
                    if k in sp:
                        e[k] = sp[k]
                inst.append(e)
            spec["installations"] = inst
            qa.append(f"spring {spn}: the spring-info page gives different installed heights/loads for the heads that use it "
                      f"({len(groups)} sets); kept per head group in spec.installations, no single value")
        head_pns = sorted(set(r["p"] for r in grp))
        spec["heads"] = head_pns
        fams = OrderedDict()
        for r in grp:
            fams.setdefault(r["fit"]["fam"], r)
        if "installedHt" in spec:
            name = f"valve spring for Edelbrock heads, {spec['installedHt']} installed height, {spec.get('seatLb')} lb seat"
        else:
            name = "valve spring for Edelbrock heads (installed height varies by head)"
        for fam, r0 in fams.items():
            fit = OrderedDict([("fam", fam), ("cyl", cyl_of(fam)), ("notes", "fitted to Edelbrock head PNs " + ", ".join(p for p in head_pns if any(x["p"] == p and x["fit"]["fam"] == fam for x in grp)))])
            if fam not in KNOWN_FAMS:
                fit["notes"] += "; family not in fitment list"
            records.append(OrderedDict([("m", BRAND), ("p", spn), ("cat", "spring"), ("name", name), ("fit", fit), ("spec", clean(spec)),
                                        ("src", OrderedDict(list(src(SPRING_PAGE).items()) + [("note", "spring part number from the companion table on p%d" % r0["src"]["page"])])),
                                        ("emissions", None)]))
    return records


def build_intakes(rows, qa, skipped):
    records = []
    seen = {}
    for row in rows:
        pno = row["page"]
        product = cell(row["product"])
        base_pn = row["pns"][0][0]
        where = f"p{pno} {base_pn}"
        if HELD_BACK_RE.search(product) or HELD_BACK_RE.search(row.get("make", "")) or HELD_BACK_RE.search(row.get("engine", "")):
            for pn, _ in row["pns"]:
                skipped.append((f"p{pno}", pn, f"held back (import make): {product}"))
            continue
        # p30: the AMC table's ruling merges Front/Back height and carb-pad height/port exit into one cell each
        if row.get("heightFront") and len(nums(row["heightFront"])) == 2 and not row.get("heightRear"):
            a, b = nums(row["heightFront"])
            row["heightFront"], row["heightRear"] = str(a), str(b)
        if row.get("carbPadHeight") and re.search(r"\d[\"”″]?\s*[xX]\s*\d", row["carbPadHeight"]) and not row.get("portExit"):
            m = re.match(r"^\s*(\d*\.\d+)[\"”″]?\s+(.*)$", cell(row["carbPadHeight"]))
            if m:
                row["carbPadHeight"], row["portExit"] = m.group(1), m.group(2)
        # p45: the 'Product' / 'Engine' / 'RPM Range' columns are cut mid-word by the ruling ('...LS3, L92' | ', L76 1500-7000')
        if row.get("rpm") and not re.match(r"^(Idle|\d{3,5})\s*-", cell(row["rpm"])):
            m = re.search(r"(\d{4}-\d{4,5})$", cell(row["rpm"]))
            t = re.search(r"\s(LS\d\S*,\s*L\d{0,2})(?=\s|$)", product)
            if m and t:
                lead = cell(row["rpm"])[:m.start()].strip()
                engine_txt = (t.group(1) + lead).replace(" ,", ",")
                product = (product[:t.start()] + " " + product[t.end():]).strip()
                product = re.sub(r"\s+", " ", product)
                row["product"], row["engine"], row["rpm"] = product, engine_txt, m.group(1)
                qa.append(f"{where}: Product/Engine/RPM cells are cut by the table ruling; re-joined as `{product}` / `{engine_txt}` / `{m.group(1)}`")
        has_dims = any(row.get(k) and not is_blank(row[k]) for k in ("rpm", "heightFront", "heightRear", "heightOverall", "carbPadHeight", "boltToRoof", "portExit"))
        if not has_dims and (ACCESSORY_RE.search(product) or not row.get("engine") or is_blank(row.get("engine"))):
            for pn, _ in row["pns"]:
                skipped.append((f"p{pno}", pn, f"accessory, not a manifold: {product}" if ACCESSORY_RE.search(product) else f"no engine, RPM or dimensions: {product}"))
            continue
        if re.search(r"Gasket|Fuel Rail|Linkage|Adapter", product) and "Manifold" not in product:
            for pn, _ in row["pns"]:
                skipped.append((f"p{pno}", pn, f"accessory, not a manifold: {product}"))
            continue
        y0, y1, ytext = parse_years(row.get("year", ""))
        if y0 is not None and y0 < 1950 and "FLATHEAD" not in row["header"].upper():
            qa.append(f"{where}: year `{ytext}` cannot apply to {row.get('engine')}; years dropped")
            y0 = y1 = None
        make, engine = cell(row.get("make", "")), cell(row.get("engine", ""))
        if is_blank(make):
            make = ""
        if is_blank(engine):
            engine = ""
        fams = intake_families(row["header"], make, engine, product, y1)
        if "4.6" in product and "351M" in engine:
            qa.append(f"{where}: Engine cell says `{engine}` but the product is the Ford 4.6 L SOHC Victor Jr.; family Ford Modular")
            engine = "4.6 L SOHC"
        spec = OrderedDict()
        t = intake_type(product, row.get("mount"))
        if t:
            spec["type"] = t
        else:
            qa.append(f"{where}: manifold type not inferred from `{product}`")
        cf = carb_flange(row.get("mount"), product)
        if cf:
            spec["carbFlange"] = cf
        if row.get("mount") and not is_blank(row["mount"]):
            spec["carbMount"] = cell(row["mount"])
        lo, hi = parse_rpm(row.get("rpm", ""))
        if lo is not None:
            if lo > hi:
                qa.append(f"{where}: RPM range `{row['rpm']}` has low > high; kept as printed")
            spec["rpmLow"], spec["rpmHigh"] = lo, hi
        elif row.get("rpm") and not is_blank(row["rpm"]):
            qa.append(f"{where}: RPM range `{row['rpm']}` not parsed")
        for k in ("heightFront", "heightRear", "heightOverall", "carbPadHeight", "boltToRoof", "boltToFloor", "portWidth", "portHeight", "carbAngle",
                  "dimC", "dimD", "dimE"):
            v = row.get(k)
            if v and not is_blank(v):
                if k.startswith("dim") and re.search(r"[a-z]{3,}", cell(v)):
                    spec[k + "Catalog"] = cell(v)  # e.g. '0° vertical x 5° inward'
                    continue
                n = num1(v, qa, where, k)
                if n is not None:
                    spec[k] = n
        pe = cell(row.get("portExit", ""))
        if pe and not is_blank(pe):
            m = re.match(r"^(\d*\.\d+)[\"”″]?\s*[xX]\s*(\d*\.\d+)", pe)
            if m:
                spec["portExitW"], spec["portExitH"] = float(m.group(1)), float(m.group(2))
                if len(re.findall(r"\d*\.\d+[\"”″]?\s*[xX]", pe)) > 1:
                    spec["portExitCatalog"] = pe
                    qa.append(f"{where}: two port-exit sizes `{pe}`; first kept")
            else:
                spec["portExitCatalog"] = pe
        if re.search(r"\(EGR\)|\bEGR\b(?!\s*plates)", product) and not re.search(r"non-?\s?EGR|Non-?\s?EGR", product, re.I):
            spec["egr"] = True
        elif re.search(r"non-?\s?EGR", product, re.I):
            spec["egr"] = False
        if "EGR/non-EGR" in product:
            spec["egr"] = True
            spec["egrNote"] = "EGR/non-EGR"
        if "dual-quad" in product.lower() or "dual quad" in product.lower():
            spec["carbs"] = 2
        if "triple" in product.lower():
            spec["carbs"] = 3
        labels = row.get("emissionLabels") or []
        if labels:
            spec["emissionsCodes"] = labels
        spec["catalogProduct"] = product
        if make:
            spec["catalogMake"] = make
        if engine:
            spec["catalogEngine"] = engine
        ci = sorted(set(int(x) for x in re.findall(r"\b([2-6]\d\d)\b", engine) if 150 <= int(x) <= 700))
        for pn, finish in row["pns"]:
            key = pn
            if key in seen:
                skipped.append((f"p{pno}", pn, f"same part number already emitted from p{seen[key]}"))
                continue
            seen[key] = pno
            s = OrderedDict(spec)
            if finish:
                s["finish"] = finish
                if pn != base_pn:
                    s["variantOf"] = base_pn
            elif pn == base_pn and len(row["pns"]) > 1:
                s["finish"] = "satin"
            name = product
            if engine:
                name += f", {make + ' ' if make and make.lower() not in product.lower() else ''}{engine}"
            if ytext and y0:
                name += f" ({ytext})"
            if finish:
                name += f", {finish}"
            for fam in fams:
                fit = OrderedDict([("fam", fam), ("cyl", cyl_of(fam))])
                if ci:
                    fit["ci"] = ci
                if y0 is not None:
                    fit["y0"] = y0
                if y1 is not None:
                    fit["y1"] = y1
                notes = []
                if ytext and (y0 is None or y1 is None) and not is_blank(ytext):
                    notes.append("years " + ytext)
                if fam not in KNOWN_FAMS:
                    notes.append("family not in fitment list")
                if fam == "Chevy Mark IV big block" and len(fams) == 1 and y1:
                    notes.append("catalog years end %d: Mark IV only" % y1)
                if notes:
                    fit["notes"] = "; ".join(notes)
                records.append(OrderedDict([("m", BRAND), ("p", pn), ("cat", "intake"), ("name", name), ("fit", fit), ("spec", clean(s)),
                                            ("src", src(pno)), ("emissions", emissions_value(labels))]))
    return records


# ----------------------------------------------------------------------------------------------
# validate / notes
# ----------------------------------------------------------------------------------------------
def validate(records):
    problems = []
    seen = set()
    for r in records:
        for k in ("m", "p", "cat"):
            if not r.get(k):
                problems.append(f"{r.get('p')}: missing {k}")
        if not r.get("fit", {}).get("fam"):
            problems.append(f"{r.get('p')}: missing fit.fam")
        if not r.get("src"):
            problems.append(f"{r.get('p')}: missing src")
        key = (r["cat"], r["p"], r["fit"]["fam"])
        if key in seen:
            problems.append(f"{r['p']}: duplicate within {r['fit']['fam']} ({r['cat']})")
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
                elif re.fullmatch(r"-?\d+(\.\d+)?", o) and path.split(".")[-1] not in ("p", "edition", "sparkPlug", "variantOf", "flowSource", "carbMount", "hpRange") \
                        and not path.startswith(".spec.related") and "heads[" not in path and "atalog" not in path:
                    problems.append(f"{r['p']}: numeric string at {path} = {o}")
        walk(r, "")
    return problems


def write_notes(path, records, log, qa, skipped, unused_flow, counts_pages):
    cats = Counter(r["cat"] for r in records)
    fams = Counter((r["cat"], r["fit"]["fam"]) for r in records)
    L = []
    L.append("# Edelbrock — extraction notes\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `scripts/parts-catalog/extract_edelbrock.py`.\n")
    L.append("## What was fetched\n")
    L.append(f"One document: `{PDF_URL}` (220 pages, 30 MB), downloaded once into `dl/edelbrock/` (gitignored) with UA "
             f"`{UA}`. No edelbrock.com page was requested (the Edelbrock Group rule is PDFs on the S3 bucket only). "
             "The bucket has no `robots.txt` object (S3 answers 403 AccessDenied for it, which is not a crawl rule); the one PDF "
             "request is well inside the 6 s spacing. `--offline` re-parses the cached PDF without the network.\n")
    L.append("Requests made to the bucket in total: 2 (`robots.txt` → 403 AccessDenied, then the PDF → 200, 30,184,963 bytes), both "
             "during the first inspection with curl and the same UA; the extractor reuses that download. Log of this run:\n")
    for l in log:
        L.append(f"- {l}")
    L.append("")
    L.append("Pages used (PDF page numbers; the printed page number is one less):\n")
    L.append("- cylinder heads: 90–109 (spec tables + companion part tables); 110 valve-spring table; 111 flow data @ 28\" H2O")
    L.append("- intake manifolds: 30–77 and the flathead manifolds on 100; installation items (78–81), power packs / manifold+carb kits "
             "(114–121) and EFI systems (144–159) are kits or accessories and were not extracted")
    L.append("- the flow-data web page was not fetched (terms forbid robots); the catalog PDF carries the same flow table on p111 and the "
             "same spring table on p110, so `dl/edelbrock/flow-data.html` is not needed and was not looked for\n")
    L.append("## Records\n")
    L.append("| cat | records |\n|---|---|")
    for c, n in sorted(cats.items()):
        L.append(f"| {c} | {n} |")
    L.append(f"| **total** | {len(records)} |\n")
    L.append("### Records per family\n")
    L.append("| cat | family | records |\n|---|---|---|")
    for (c, f), n in sorted(fams.items(), key=lambda kv: (kv[0][0], -kv[1], kv[0][1])):
        L.append(f"| {c} | {f} | {n} |")
    L.append("")
    L.append("### Rows per page\n")
    L.append("| PDF page | heads | intakes |\n|---|---|---|")
    for pno in sorted(counts_pages):
        h, i = counts_pages[pno]
        L.append(f"| {pno} | {h} | {i} |")
    L.append("")
    L.append("## Heads\n")
    L.append("- Spec tables are ruled; pdfplumber's `lines` strategy returns one row per catalog row. Columns are read from the two-row "
             "header (`Port Volume | Intake/Exhaust`, `Valve Sizes | Intake/Exhaust`, part-number columns `Complete (Single)`, "
             "`Complete | Pair`, `Bare (Single) | No Valves / With Valves`, `Single | Complete/Bare`...). Every non-blank part-number "
             "cell becomes one record: `spec.bare` (bare casting), `spec.bareWithValves`, `spec.per` (2 = sold as a pair; also for "
             "LS part numbers marked `*` = `* Sold in Pairs`).")
    L.append("- `spec`: `chamberCc`, `intakeRunnerCc`, `exhaustRunnerCc`, `intakeValve`, `exhaustValve` (inches), `maxLift`, `springDia`, "
             "`hpRange` (as printed) with `hpLow`/`hpHigh`, `camType` (`Flat Tappet` → `hydraulic_flat`, `Hyd. Roller` → "
             "`hydraulic_roller`, `Mech./Solid Roller` → `solid_roller`; the catalog's camshaft type is the valve-spring package the "
             "complete head ships with, so bare castings keep the row's value only as printed), `intakeFlange` (Standard/Vortec), "
             "`exhaustPortLocation` (Standard, +.125\", Raised, Eagle...), `plugType` (Straight/Angled), `installNoteCodes` + "
             "`installNotes` (the page's `(A) Deck thickness...` lines), `emissionsCodes` (decoded icons, see below).")
    L.append("- `spec.related`: the page's companion table (`Head Part No. | Head Bolts | Head Gasket | Intake Gasket | Exhaust Gasket | "
             "Valve Cover Gasket | Pushrods | Valves | Springs | Retainers | Spark Plug`) matched by head part number; values are kept "
             "as printed (`Call Tech`, `See Instructions`, `8596 (Gen III) 8595 (Gen IV)`).")
    L.append("- `spec.flow`: p111 table, `[{lift, int, exh}]` cfm @ 28\" (`flowDepression: 28`). The page notes that hydraulic-roller "
             "heads flow the same as the flat-tappet version, so a head without its own flow row takes the flow of the same product "
             "on the same page with identical chamber/port/valve sizes and records `flowSource` = that part number.")
    L.append("- `spec.spring`: p110 table keyed by head part number: `installedHt`, `seatLb` (load at installed height; `seatLbAt` when "
             "the quoted height differs), `openHt`/`openLb`, `coilBind`, `maxRpm` (`maxRpmNote` when the row gives one figure for "
             "Performer cams and one for Performer RPM cams).")
    L.append("- The same bare casting is listed on several rows (e.g. SBF 77169 under three Victor Jr. 20° rows); it is emitted once "
             "from its first row.")
    L.append("- Families from the uppercase section row of each table (`CHEVROLET 262-400 V8`, `LS3 (GEN III & IV) V8`, "
             "`383-440 V8 BIG-BLOCK`...), kept in `fit.notes`. 396-502 / big-block race heads are emitted for both Chevy big-block "
             "families; Gen III Hemi heads for the 5.7/6.1 and/or 6.2/6.4 family per the product name; Performer RPM Magnum heads "
             "under `Mopar Magnum 5.2/5.9`; p99's first table has no section row (page text: `426-572 GEN II HEMI V8`).")
    L.append("- `emissions` is `null` for heads (internal part); the catalog icon is kept in `spec.emissionsCodes`.\n")
    L.append("## Springs\n")
    L.append("- One `spring` record per spring part number named in a companion table's `Springs` column, with the p110 numbers of the "
             "heads that use it (`od` = the heads' valve spring diameter when they agree, `installedHt`, `seatLb`, `openHt`/`openLb`, "
             "`coilBind`, `maxRpm`, computed `maxLift` = installed height − coil bind − 0.050, `heads` = head part numbers). One record "
             "per family of those heads (`fit.notes` lists the head part numbers). Heads whose companion row lists two springs "
             "(`5823, 5745`) do not contribute.\n")
    L.append("## Intakes\n")
    L.append("- Tables are ruled; one record per part-number cell. Finish columns (`Satin | Polished | Black Powder | Chrome Plasma | "
             "Black Plasma`) give `spec.finish` and `spec.variantOf` (the satin part number) on the variants.")
    L.append("- `spec.type` from the product line: Performer / Performer RPM / Air-Gap / C-26 / CH- → `dual-plane`; Torker II, Victor, "
             "Victor Jr., Super Victor, Glidden, C-357 and the flathead 4-barrel/Triple Deuce/Slingshot → `single-plane`; Street Tunnel "
             "Ram, Victor Ram, Victor Tunnel Ram, Cross-Ram → `tunnel-ram`; Pro-Flo XT, EFI, T.B.I., XTS → `efi`. `spec.carbFlange` from "
             "the Mount column (`Sq. Bore`/`4150`/`EPS/AVS2` → square; `Q-Jet`/`TQ` → spread; `4500` → dominator; throttle bodies → "
             "throttle-body; `Universal` = fits square- and spread-bore carbs, kept as `universal`); `carbMount` keeps the printed value.")
    L.append("- `rpmLow`/`rpmHigh` from `RPM Range` (`Idle` → 0); `heightFront` (A), `heightRear` (B), `dimC/D/E` (Pro-Flo and cross-ram "
             "measurement letters, E is an angle in degrees), `heightOverall`, `carbPadHeight`, `boltToRoof`/`boltToFloor`, `portWidth`/"
             "`portHeight`, `carbAngle` (degrees), `portExitW` × `portExitH` (or `portExitCatalog` when not `w x h`), `egr` (from "
             "`(EGR)` / `non-EGR` in the product name), `carbs` (dual-quad = 2), `catalogProduct`/`catalogMake`/`catalogEngine` as printed.")
    L.append("- `fit`: `ci` = the 3-digit displacements in the Engine cell; `y0`/`y1` from the Year cell (`1979-Later` → y0 only, "
             "`Early-1975` → y1 only, kept in `fit.notes`). Big-block Chevy manifolds whose catalog years end by 1990 are "
             "`Chevy Mark IV big block` only; the rest are emitted for both big-block families.")
    L.append("- Import makes (Holden, Honda/Acura B-series, Rover 215) are held back, listed below. Fuel-rail kits, gaskets, linkages, "
             "valley covers, spacers, brackets and other accessory rows are skipped (listed below).")
    L.append("- `emissions`: the catalog prints coloured icons (ZapfDingbats circles) whose colours match the page-footer legend "
             "(green 50-state legal, purple EPA legal, red racing only, blue pre-pollution controlled vehicles, black stock "
             "replacement, yellow engine swap). `spec.emissionsCodes` lists the decoded labels; `emissions` is `carb_eo:unlisted` when "
             "the row is 50-state legal (an EO exists but the table does not print its number), `no_eo_race_only` when the only icon "
             "is racing-only, `oem_replacement` for stock-replacement-only, otherwise `unknown`.\n")
    L.append("## Families not in the fitment list (need a decision)\n")
    for f in sorted(set(r["fit"]["fam"] for r in records if r["fit"]["fam"] not in KNOWN_FAMS)):
        L.append(f"- `{f}`")
    L.append("")
    if unused_flow:
        L.append("## Flow rows with no head record\n")
        L.append("Part numbers on the p111 flow page that are not in the 2025 head tables (older or discontinued numbers): " + ", ".join(unused_flow) + "\n")
    L.append("## Rows skipped\n")
    for where, pn, why in skipped:
        L.append(f"- {where} {pn}: {why}")
    L.append("")
    L.append("## Needs human QA\n")
    for q in qa:
        L.append(f"- {q}")
    L.append("")
    L.append("## Validation\n")
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a family and category; numeric spec fields are "
             "numbers (inches as decimals, cc as numbers); no empty strings.\n")
    L.append("- passed")
    open(path, "w", encoding="utf-8").write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="parse the cached PDF without any network request")
    args = ap.parse_args()
    log, qa, skipped = [], [], []
    if not args.offline:
        check_robots(log)
        fetch(PDF_URL, PDF_PATH, log)
    else:
        log.append("offline: parsed the cached PDF in dl/edelbrock/")
    if not os.path.exists(PDF_PATH):
        raise SystemExit("PDF not downloaded")
    import pdfplumber

    with pdfplumber.open(PDF_PATH) as pdf:
        if len(pdf.pages) != 220:
            qa.append(f"PDF has {len(pdf.pages)} pages, expected 220; page numbers in this script may be off")
        read_legend(pdf.pages[32], qa)  # prime the emissions-icon legend from a right-hand page before the head pages
        specs, companions = parse_heads(pdf, qa, skipped)
        flow = parse_flow(pdf, qa)
        springs = parse_springs(pdf, qa)
        irows = parse_intakes(pdf, qa, skipped)
    heads, unused_flow = build_heads(specs, companions, flow, springs, qa, skipped)
    spring_recs = build_springs(heads, qa)
    intakes = build_intakes(irows, qa, skipped)
    records = heads + spring_recs + intakes
    problems = validate(records)
    if problems:
        for p in problems[:50]:
            print("VALIDATION:", p, file=sys.stderr)
        raise SystemExit(f"{len(problems)} validation problems")
    counts_pages = defaultdict(lambda: [0, 0])
    for r in heads:
        counts_pages[r["src"]["page"]][0] += 1
    for r in intakes:
        counts_pages[r["src"]["page"]][1] += 1
    os.makedirs(OUT, exist_ok=True)
    out = OrderedDict([
        ("source", OrderedDict([("brand", BRAND), ("doc", DOC), ("url", PDF_URL), ("edition", EDITION), ("pagesUsed", "heads 90-111, intakes 30-77 and 100"),
                                ("userAgent", UA), ("robots", "no robots.txt object on the S3 bucket (403 AccessDenied); one PDF request")])),
        ("extracted", dt.date.today().isoformat()),
        ("count", len(records)),
        ("parts", records),
    ])
    with open(os.path.join(OUT, "edelbrock.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "edelbrock.md"), records, log, qa, skipped, unused_flow, counts_pages)
    print(f"heads={len(heads)} springs={len(spring_recs)} intakes={len(intakes)} total={len(records)} qa={len(qa)} skipped={len(skipped)}")


if __name__ == "__main__":
    main()
