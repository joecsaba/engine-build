#!/usr/bin/env python3
"""MAHLE Aftermarket (Victor Reinz) OE gasket catalogs -> shared parts records.

Sources (manual downloads under Catalogs/ at the repo root; no network is used):
  ga-21-17.pdf      Passenger Car Gaskets 2017, catalog GA-21-17 (1,080 pp, all years).
                    Only the front matter (pp 1-30) and the reference tables (pp 1039-1080) have a
                    text layer; every application page (31-1038) is a 965x1432 px greyscale JPX scan
                    (~115 dpi) with the running head/foot as the only text. The application pages are
                    therefore OCR'd with rapidocr_onnxruntime (pages rendered at --dpi, default 200) and
                    the word boxes are cached as JSON under dl/mahle-oe-gaskets/ocr/ (gitignored) so the
                    parse is re-runnable without re-OCR.
  ga-20-26_web.pdf  Gaskets 2000 & Newer, catalog GA-20-26 (52 pp, 2026). The "web" PDF holds only the
                    front matter: its manufacturer index points at application pages 49-1684 that are
                    not in the file. The one part table it contains is the Manifold Installation Sets
                    list on printed page 5 (PDF 7), which is extracted from its text layer.

GA-21-17 layout (engine-related section, printed page = PDF page):
  make heading (y~52, left on even pages, right on odd pages) | per make: an Engine Index and a Model
  Index (skipped) | numbered engine blocks: `NN  <CID> CID (<L>L) [qualifiers] [division] V8 Cyl,
  <bore>in./<mm>mm (<years>)  NN`, optionally a `VIN Codes:` line, the column header `Part | Year |
  VIN | Model/Application | Part Number | Qty.`, section titles `ENGINE GASKETS` / `MISCELLANEOUS
  GASKETS`, then rows: part type at the left margin (names wrap onto a second line), year range,
  application notes and material right-aligned in the notes column, part number, per-engine qty.
  Odd pages are shifted +66 pt; the offset is measured from the column header on each page.
  `*` after a PN = discontinued, `†` = now packed in sets (OCR renders them as * " ' ` and + f).
  The "model related" section (pp 757-1038) is differential / transmission gaskets and is skipped.

Records: `headGasket` from "Cylinder Head Gasket" rows (material composite / MLS / steel where the
notes column prints it, side L/R from Left/Right) and `gasket` for every other sealing part (spec.type
head set / full set / lower set / valve cover / oil pan / intake manifold set / ... with the printed
material in spec.construction); head bolt sets become `fastener`. One record per PN per family;
engines of a family that share a PN are aggregated (fit.ci, year span, engine descriptions and VIN
codes in fit.engines / fit.notes). Families are resolved from the engine description (displacement,
cylinders, division, qualifiers, years, VIN engine codes) following extract_king.py; unresolved
engines are kept under the catalog make heading and counted in the notes file.

Usage:  python -X utf8 -I scripts/parts-catalog/extract_mahle_oe_gaskets.py
            [--pdf21 PATH] [--pdf20 PATH] [--makes "Ford,Ford Truck"] [--ocr-workers N] [--dpi N]
            [--no-ocr] [--skip-ga20]
Writes only dl/mahle-oe-gaskets/ocr/*.json, out/mahle-oe-gaskets.json and out/mahle-oe-gaskets.md.
"""
import argparse
import datetime as dt
import difflib
import json
import os
import re
import sys
import time
from collections import Counter, OrderedDict, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
OUT = os.path.join(BASE, "out")
OCR_DIR = os.path.join(BASE, "dl", "mahle-oe-gaskets", "ocr")
DEFAULT_PDF21 = os.path.join(REPO, "Catalogs", "ga-21-17.pdf")
DEFAULT_PDF20 = os.path.join(REPO, "Catalogs", "ga-20-26_web.pdf")
BRAND = "MAHLE"
DOC21 = "MAHLE Aftermarket Passenger Car Gaskets catalog GA-21-17 (PDF, scanned application pages, OCR)"
EDITION21 = "2017 (GA-21-17, supersedes GA-21-06)"
DOC20 = "MAHLE Aftermarket Gaskets 2000 & Newer catalog GA-20-26 (web PDF, front matter only)"
EDITION20 = "2026 (GA-20-26, supersedes GA-20-17)"

# Engine-related section makes to extract (catalog headings) and the page they start on in the
# manufacturer index (PDF page 2); the index is re-read at run time, these are the fallback.
DOMESTIC_MAKES = ["American Motors", "Chrysler", "Dodge Truck", "Ford", "Ford Truck", "General Motors Corp",
                  "General Motors Truck", "Jeep", "Navistar/International"]
FALLBACK_INDEX = {"American Motors": 33, "Audi": 44, "Chrysler": 78, "Daihatsu": 122, "Dodge Truck": 123,
                  "Eagle Chrysler": 157, "Ford": 166, "Ford Truck": 238, "General Motors Corp": 292,
                  "General Motors Truck": 420, "Honda": 485, "Jeep": 524, "Kaiser-Frazer": 538,
                  "Navistar/International": 582, "Nissan": 616}
ENGINE_SECTION_END = 756  # last engine-related page; 757+ is the model-related (drivetrain) section

FAMILIES = ["Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
            "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
            "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
            "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
            "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
            "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
            "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
            "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7"]

# ---------------------------------------------------------------------------------------------
# column geometry (points, even-page frame; odd pages are measured from the column header)
# ---------------------------------------------------------------------------------------------
X_TYPE_MAX = 62      # part type column (and the block number)
X_YEAR = (112, 168)
X_VIN = (168, 188)
X_NOTES = (188, 396)
X_PN = (396, 452)
X_QTY = 452
YEAR_HDR_X = 142     # x of the "Year" header word on even pages
BLOCK_NO_X = 49
Y_BODY = (60, 728)

Q_DISC = set('*"\'`´’”“')  # discontinued mark and its OCR look-alikes
Q_SETS = set("+†ft")                     # "now packed in sets" dagger and its OCR look-alikes
RE_YEAR = re.compile(r"^(19\d\d|20\d\d)\s*[-–]?\s*(19\d\d|20\d\d)?$")
RE_YEAR_LEAD = re.compile(r"^(19\d\d|20\d\d)\s*[-–]\s*(19\d\d|20\d\d)\s*(.+)$|^(19\d\d|20\d\d)\s+(.+)$")
RE_PN = re.compile(r"^[A-Z]{0,3}\d{2,6}[A-Z]{0,5}(?:-\d{1,2}[A-Z]?)?$")
RE_PN_TAIL = re.compile(r"((?:[A-Z]{1,3})?\d{3,6}[A-Z]{0,5}(?:-\d{1,2}[A-Z]?)?[" + re.escape("".join(Q_DISC | Q_SETS)) + r"]?)$")
RE_INT = re.compile(r"^\d{1,3}$")
RE_CID = re.compile(r"(\d{2,3})\s*CID", re.I)
RE_LITERS = re.compile(r"\(\s*(\d{1,2})\s*[.,]\s*([0-9O])\s*L\s*\)", re.I)
RE_CYL = re.compile(r"(?:(?<![A-Za-z])([VLIH])\s*-?\s*)?(\d{1,2})\s*Cyl", re.I)
RE_CYL2 = re.compile(r"(?<![A-Za-z])V\s?(6|8|10|12)\b")
RE_BORE = re.compile(r"(\d\.\d{2,3})\s*(?:in|\"|”)", re.I)
RE_YEARS = re.compile(r"\(\s*(19\d\d|20\d\d)\s*[-–]?\s*(19\d\d|20\d\d)?\s*\)")
RE_VIN_CODE = re.compile(r"\[([A-Z0-9][A-Z0-9 /-]{1,12})\]")
GM_DIVISIONS = ["Chevrolet", "Buick", "Oldsmobile", "Pontiac", "Cadillac", "General Motors", "GMC", "Saturn", "Geo"]
DIVISIONS = GM_DIVISIONS + ["Chrysler", "Dodge", "Plymouth", "Ford", "Lincoln", "Mercury", "American Motors", "AMC",
                            "Jeep", "International", "Navistar", "Cummins", "Detroit Diesel", "Isuzu", "Suzuki",
                            "Toyota", "Daewoo", "Mitsubishi", "Renault", "Peugeot", "Volkswagen", "Nissan", "Mazda",
                            "Perkins", "Caterpillar", "Continental", "Willys", "Kaiser", "Nash", "Hudson",
                            "Studebaker", "Yanmar", "Mack", "Rover", "Honda", "Lotus", "Cosworth", "Mercedes"]
LS_CODES = {"LS1", "LS2", "LS3", "LS4", "LS6", "LS7", "LS9", "LSA", "LQ4", "LQ9", "LM7", "L59", "LR4", "LY5", "LY6",
            "LMG", "L92", "L94", "L96", "L9H", "L76", "L77", "LH6", "LC9", "LH8", "LH9", "L33", "LY2", "L20", "LMF",
            "L99", "LFA", "LZ1", "LS", "LC8"}
LT_CODES = {"LT1", "LT4", "LT5", "L83", "L86", "L8B", "LV1", "LV3", "L82", "L84", "L87"}

# part type (normalised: lower-case, alphanumerics only, '&' -> 'and') -> (cat, type) ; None = skip
TYPE_MAP = [
    (r"^cylinderheadgasket|^cylheadgasket|^headgasket$", ("headGasket", None)),
    (r"^headset", ("gasket", "head set")),
    (r"^fullset", ("gasket", "full set")),
    (r"^lowerset|^conversionset", ("gasket", "lower set")),
    (r"^enginekit", ("gasket", "engine kit gasket set")),
    (r"^valvecovergrommet", ("gasket", "valve cover grommet")),
    (r"^valvecover", ("gasket", "valve cover")),
    (r"^valvestemseal", ("gasket", "valve stem seal")),
    (r"^manifoldsetint(ake)?and?exh|^manifoldsetintexh|^intandexhmanifold", ("gasket", "intake & exhaust manifold set")),
    (r"^manifoldsetint|^intakemanifoldset", ("gasket", "intake manifold set")),
    (r"^manifoldsetexh|^exhaustmanifoldset", ("gasket", "exhaust manifold set")),
    (r"^intakemanifoldgasket|^intakemanifold|^manifoldgasketint", ("gasket", "intake")),
    (r"^exhaustmanifoldgasket|^exhaustmanifold|^manifoldgasketexh", ("gasket", "exhaust manifold")),
    (r"^manifoldgasket|^manifoldset$", ("gasket", "manifold")),
    (r"^plenum|^upperintake|^upperplenum", ("gasket", "plenum")),
    (r"^oilpandrainplug|^drainplug", ("gasket", "oil pan drain plug")),
    (r"^oilpan", ("gasket", "oil pan")),
    (r"^rearmainseal|^rearmainbearingseal|^rearcrank", ("gasket", "rear main seal")),
    (r"^timingcoverset|^frontcoverset", ("gasket", "timing cover set")),
    (r"^timingcovergasket|^timingcover$|^frontcovergasket|^timingcase", ("gasket", "timing cover")),
    (r"^timingcover(dust)?seal|^frontcoverseal|^frontcrank", ("gasket", "timing cover seal")),
    (r"repairsleeve", ("gasket", "repair sleeve")),
    (r"^cylheadbolt|^headbolt", ("fastener", "head bolt")),
    (r"^cylheadwasher|^headwasher", ("fastener", "head bolt washer")),
    (r"^cylheadspacer|^headspacer|^cylheadshim", ("gasket", "head spacer shim")),
    (r"^sealant|^rtv|^gasketmaker|^threadsealer", None),
    (r"^aircleanermount|^aircleanergasket|^aircleaner$", ("gasket", "air cleaner mount")),
    (r"^aircleanersleeve", ("gasket", "air cleaner sleeve")),
    (r"^carbmount|^carburetormount|^carbbase|^carbgasket|^carburetorgasket", ("gasket", "carb base")),
    (r"^carbspacer|^carbinsulator|^carburetorspacer|^carburetorinsulator", ("gasket", "carb spacer")),
    (r"^carbflange|^carbfloat|^carbbowl|^carb", ("gasket", "carburetor")),
    (r"^egr", ("gasket", "EGR")),
    (r"^exhaustpipegasket|^exhaustpipe|^exhpipe", ("gasket", "exhaust pipe")),
    (r"^fuelpumpbowl", ("gasket", "fuel pump bowl")),
    (r"^fuelpump", ("gasket", "fuel pump")),
    (r"^fuelinjector|^injector", ("gasket", "injector seal")),
    (r"^oilfilter", ("gasket", "oil filter")),
    (r"^oilpump", ("gasket", "oil pump")),
    (r"^oilcooler", ("gasket", "oil cooler")),
    (r"^sparkplugtube", ("gasket", "spark plug tube seal")),
    (r"^wateroutlet", ("gasket", "water outlet")),
    (r"^thermhousing|^thermostat|^thermhsg", ("gasket", "thermostat housing")),
    (r"^waterpumpbacking", ("gasket", "water pump backing plate")),
    (r"^waterpump", ("gasket", "water pump")),
    (r"^watercrossover|^coolantcrossover|^waterbypass|^waterinlet|^watermanifold", ("gasket", "water crossover")),
    (r"^pushrodcovergrommet", ("gasket", "push rod cover grommet")),
    (r"^pushrodcover|^sidecover|^tappetcover|^liftercover", ("gasket", "push rod cover")),
    (r"^distmount|^distributormount|^distributor|^distgasket|^disthsg", ("gasket", "distributor")),
    (r"^throttlebody", ("gasket", "throttle body")),
    (r"^camcover", ("gasket", "cam cover")),
    (r"^camshaftplug|^camplug|^camshaftseal|^camseal|^camshaftthrust", ("gasket", "cam seal")),
    (r"^heatriser", ("gasket", "heat riser")),
    (r"^choke", ("gasket", "choke")),
    (r"^rockershaft|^rockerarmcover|^rockercover", ("gasket", "rocker cover")),
    (r"^ujoint|^flywheelhousing|^bellhousing|^clutchhousing|^transmission", None),
    (r"^governor", ("gasket", "governor")),
    (r"^turbo", ("gasket", "turbocharger")),
    (r"^crankcasevent|^pcv|^breather|^ventilat", ("gasket", "crankcase vent")),
    (r"^valleycover|^valleypan|^intakevalley", ("gasket", "valley cover")),
    (r"^crankshaftseal|^crankseal", ("gasket", "crank seal")),
    (r"^intakeplenum", ("gasket", "plenum")),
    (r"^oilfillercap|^oilfiller|^oilcap", ("gasket", "oil filler")),
    (r"^oilcoolerline|^oilline", ("gasket", "oil line")),
    (r"^exhaustflange|^exhaustcrossover|^crossoverpipe", ("gasket", "exhaust pipe")),
    (r"^vacuumpump", ("gasket", "vacuum pump")),
    (r"^airpump|^airinjection|^smogpump", ("gasket", "air pump")),
    (r"^fuelinjection|^fuelrail|^fuelpressure|^fuelfilter|^fuelbowl", ("gasket", "fuel system")),
    (r"^intercooler", ("gasket", "intercooler")),
    (r"^headcover", ("gasket", "valve cover")),
    (r"^engineblock|^blockplug|^freezeplug|^expansionplug|^coreplug", ("gasket", "core plug")),
    (r"^oilpressure|^oilsending|^oilsender", ("gasket", "oil pressure sender")),
    (r"^glowplug", ("gasket", "glow plug")),
]
# printed material / construction keyword -> normalised material
MATERIALS = [
    ("multi-layered steel", "MLS"), ("multi layered steel", "MLS"), ("multilayer", "MLS"), ("mls", "MLS"),
    ("stainless steel", "steel shim"), ("steel shim", "steel shim"),
    ("graphite", "graphite composite"), ("composite", "composite"), ("steel core", "steel-core composite"),
    ("cork with metal", "cork with metal carrier"), ("cork/metal", "cork with metal carrier"),
    ("foam with metal", "foam with metal carrier"), ("high temperature cork", "high temperature cork rubber"),
    ("cork rubber", "cork rubber"), ("corkrubber", "cork rubber"), ("cork", "cork"),
    ("molded rubber", "molded rubber"), ("moided rubber", "molded rubber"), ("rope packing", "rope packing"),
    ("rubberized fiber", "rubberized fiber"), ("fluoroelastomer", "fluoroelastomer"), ("viton", "fluoroelastomer"),
    ("sintered metal", "sintered metal"), ("silicone", "silicone"), ("rubber", "rubber"), ("fiber", "fiber"),
    ("copper", "copper"), ("steel", "steel"), ("paper", "paper"), ("asbestos", "composite"),
]
MATERIAL_RE = re.compile(r"\b(multi[- ]?layered steel|stainless steel|steel shim|graphite|composite|steel core|"
                         r"high temperature cork(?: with metal carrier| rubber)?|cork with metal ca[rmn]+ier|cork/metal|"
                         r"foam with metal ca[rmn]+ier|cork ?rubber|cork|mo[il]ded rubber|rope packing|rubberized fiber|"
                         r"fluoroelastomer|viton|sintered metal|silicone|rubber|fiber|copper|steel|paper)\b", re.I)


def num(s):
    return float(s)


def normkey(s):
    s = s.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]", "", s)


def norm_text(s):
    s = s.replace("（", "(").replace("）", ")").replace("”", '"').replace("“", '"')
    s = s.replace("’", "'").replace("‘", "'").replace("，", ",").replace("、", ",")
    s = s.replace("–", "-").replace("´", "'")
    s = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s)             # OCR drops spaces: ExhaustPipe -> Exhaust Pipe
    s = re.sub(r"(?<=\d)(?=[A-Z][a-z])", " ", s)           # 1Barrel -> 1 Barrel
    s = re.sub(r"(?<=[a-zA-Z])(?=\()", " ", s)
    s = re.sub(r"(?<=[,;.])(?=[A-Za-z(])", " ", s)
    s = re.sub(r"\s+", " ", s).strip(" .,;")
    return s


def fix_ocr_digits(s):
    return s.replace("O", "0").replace("o", "0").replace("l", "1").replace("I", "1")


# ---------------------------------------------------------------------------------------------
# OCR cache
# ---------------------------------------------------------------------------------------------
_OCR = {}


def _ocr_init(pdf, dpi):
    import numpy as np
    import pymupdf
    from rapidocr_onnxruntime import RapidOCR
    _OCR["np"], _OCR["pymupdf"] = np, pymupdf
    _OCR["engine"] = RapidOCR(intra_op_num_threads=1)
    _OCR["doc"] = pymupdf.open(pdf)
    _OCR["dpi"] = dpi


def _ocr_page(pno):
    np, pymupdf = _OCR["np"], _OCR["pymupdf"]
    path = os.path.join(OCR_DIR, f"p{pno:04d}.json")
    if os.path.exists(path):
        return pno, False
    pg = _OCR["doc"][pno - 1]
    pix = pg.get_pixmap(dpi=_OCR["dpi"], colorspace=pymupdf.csGRAY)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    res, _ = _OCR["engine"](img)
    scale = 72.0 / _OCR["dpi"]
    boxes = []
    for box, txt, conf in (res or []):
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        boxes.append({"x0": round(min(xs) * scale, 1), "y0": round(min(ys) * scale, 1),
                      "x1": round(max(xs) * scale, 1), "y1": round(max(ys) * scale, 1),
                      "t": txt, "c": round(float(conf), 3)})
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"page": pno, "dpi": _OCR["dpi"], "boxes": boxes}, f, ensure_ascii=False)
    return pno, True


def ensure_ocr(pdf, pages, workers, dpi):
    missing = [p for p in pages if not os.path.exists(os.path.join(OCR_DIR, f"p{p:04d}.json"))]
    if not missing:
        return 0
    os.makedirs(OCR_DIR, exist_ok=True)
    from multiprocessing import Pool
    t0 = time.time()
    done = 0
    print(f"OCR: {len(missing)} pages to recognise with {workers} workers at {dpi} dpi", flush=True)
    with Pool(workers, initializer=_ocr_init, initargs=(pdf, dpi)) as pool:
        for pno, fresh in pool.imap_unordered(_ocr_page, missing):
            done += 1
            if done % 20 == 0:
                print(f"  OCR {done}/{len(missing)} ({time.time() - t0:.0f}s)", flush=True)
    return len(missing)


def load_ocr(pno):
    path = os.path.join(OCR_DIR, f"p{pno:04d}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)["boxes"]


# ---------------------------------------------------------------------------------------------
# page geometry
# ---------------------------------------------------------------------------------------------
class Line:
    __slots__ = ("y", "boxes", "text")

    def __init__(self, y, boxes):
        self.y = y
        self.boxes = sorted(boxes, key=lambda b: b["x0"])
        self.text = " ".join(b["t"] for b in self.boxes)


def build_lines(boxes, tol=3.5):
    bs = sorted(boxes, key=lambda b: ((b["y0"] + b["y1"]) / 2, b["x0"]))
    rows = []
    for b in bs:
        yc = (b["y0"] + b["y1"]) / 2
        if rows and abs(rows[-1][0] - yc) <= tol:
            rows[-1][1].append(b)
        else:
            rows.append([yc, [b]])
    return [Line(y, r) for y, r in rows]


def is_col_header(ln):
    t = ln.text.replace(" ", "")
    return bool(re.search(r"(Year|Vear).*Model/App", t) or re.search(r"Pa\w*Numbe", t) and "Model" in t)


def page_offset(lines, pno):
    offs = []
    for ln in lines:
        if is_col_header(ln):
            for b in ln.boxes:
                if re.match(r"^(Year|Vear)$", b["t"]):
                    offs.append(b["x0"] - YEAR_HDR_X)
                elif re.match(r"^Pa\w* ?Numbe\w*$", b["t"]):
                    offs.append(b["x0"] - 418)
    if offs:
        offs.sort()
        return round(offs[len(offs) // 2])
    return 66 if pno % 2 == 1 else 0


def block_header(ln, off):
    """(block_no, desc) when the line is an engine block header, else None."""
    bs = ln.boxes
    if not bs:
        return None
    first = bs[0]
    rel0 = first["x0"] - off
    no = None
    if RE_INT.match(first["t"]) and rel0 < X_TYPE_MAX:
        no = int(first["t"])
    last = bs[-1]
    rel_last = last["x0"] - off
    if no is not None and len(bs) >= 2 and RE_INT.match(last["t"]) and rel_last > 440:
        if int(last["t"]) != no:
            return None  # index row (model | engine | year | block), not a block header
        mid = [b for b in bs[1:-1]]
        return no, norm_text(" ".join(b["t"] for b in mid)) if mid else None
    for b in bs:
        rel = b["x0"] - off
        if 60 <= rel <= 82 and RE_CID.search(b["t"]):
            mid = [x for x in bs if not (RE_INT.match(x["t"]) and (x["x0"] - off < X_TYPE_MAX or x["x0"] - off > 440))]
            return no, norm_text(" ".join(x["t"] for x in mid))
    if no is not None and len(bs) == 2 and RE_INT.match(last["t"]) and rel_last > 440:
        return no, None
    return None


def strip_marks(pn):
    disc = sets = False
    while pn and (pn[-1] in Q_DISC or pn[-1] in Q_SETS):
        if pn[-1] in Q_DISC:
            disc = True
        else:
            sets = True
        pn = pn[:-1]
    pn = pn.lstrip(".:,;• ")
    return pn, disc, sets


def parse_engine(desc):
    d = {"desc": desc, "cid": None, "liters": None, "cyl": None, "vee": None, "bore": None, "y0": None, "y1": None,
         "division": None, "flags": set()}
    if not desc:
        return d
    m = RE_CID.search(desc)
    if m:
        d["cid"] = int(m.group(1))
    m = RE_LITERS.search(desc)
    if m:
        d["liters"] = float(m.group(1) + "." + fix_ocr_digits(m.group(2)))
    if d["cid"] is None and d["liters"]:
        # OCR lost the CID: take the family displacement nearest to the litre figure (within 4 CID)
        approx = d["liters"] * 61.024
        known = (221, 232, 240, 250, 255, 260, 273, 281, 289, 300, 302, 305, 307, 318, 327, 330, 340, 345, 350, 351,
                 359, 360, 363, 370, 376, 383, 389, 390, 392, 396, 400, 403, 408, 413, 415, 426, 427, 429, 440, 444,
                 454, 455, 460, 500)
        best = min(known, key=lambda c: abs(c - approx))
        if abs(best - approx) <= 4:
            d["cid"] = best
            d["flags"].add("CID-FROM-LITERS")
    m = RE_CYL.search(desc)
    if m:
        d["cyl"] = int(m.group(2))
        d["vee"] = (m.group(1) or "").upper() == "V" or bool(re.search(r"(?<![A-Za-z])V\s?" + m.group(2) + r"\s*Cyl", desc))
    else:
        m2 = RE_CYL2.search(desc)
        if m2:
            d["cyl"], d["vee"] = int(m2.group(1)), True
    m = RE_BORE.search(desc)
    if m:
        d["bore"] = num(m.group(1))
    ys = RE_YEARS.findall(desc)
    if ys:
        y0, y1 = ys[-1]
        d["y0"], d["y1"] = int(y0), int(y1) if y1 else int(y0)
    up = desc.upper()
    for div in DIVISIONS:
        if re.search(r"\b" + re.escape(div.upper()) + r"\b", up) or (div == "International" and "LNTERNATIONAL" in up):
            d["division"] = div
            break
    for flag in ("DIESEL", "OHV", "DOHC", "SOHC", "OHC", "L-HEAD", "TURBO", "HEMI", "WINDSOR", "CLEVELAND", "MODIFIED",
                 "BOSS", "POLY", "MAGNUM", "VORTEC", "CORVAIR", "ALUMINUM", "POWER-STROKE", "POWER STROKE",
                 "POWERSTROKE", "CUMMINS", "DURAMAX", "F-HEAD", "FLATHEAD", "COYOTE", "TRITON", "MODULAR", "GEN III",
                 "GEN IV", "GEN V", "NORTHSTAR", "ROCKET", "NAILHEAD", "SUPERCHARGED", "FUEL INJECTED", "CARBURETED",
                 "12 VALVE", "24 VALVE", "12V", "24V", "32V", "16V", "DIRECT INJECTION", "DI ", "IDI"):
        if flag in up:
            d["flags"].add(flag.strip())
    return d


# ---------------------------------------------------------------------------------------------
# page parser
# ---------------------------------------------------------------------------------------------
class Parser:
    def __init__(self, make_ranges, makes, qa):
        self.make_ranges = make_ranges  # [(start, end, make)]
        self.makes = makes
        self.qa = qa
        self.blocks = []
        self.block = None
        self.make = None
        self.mode = "none"
        self.state = None
        self.skipped_lines = Counter()
        self.pages_done = []
        self.index_pages = []
        self.type_no_pn = []
        self.all_make_names = sorted({m for _, _, m in make_ranges})

    def make_for_page(self, pno):
        for s, e, m in self.make_ranges:
            if s <= pno <= e:
                return m
        return None

    def match_make(self, text):
        t = re.sub(r"\((cont|continued)\.?\)", "", text, flags=re.I).strip(" .")
        key = normkey(t)
        if not key or len(key) < 4:
            return None
        best, score = None, 0
        for m in self.all_make_names:
            r = difflib.SequenceMatcher(None, key, normkey(m)).ratio()
            if r > score:
                best, score = m, r
        return best if score >= 0.8 else None

    def new_block(self, no, desc, pno, make):
        if self.block and self.block["no"] == no and self.block["make"] == make and \
                (desc is None or self.block["desc"] is None or normkey(desc)[:12] == normkey(self.block["desc"])[:12]):
            if desc and not self.block["desc"]:
                self.block["desc"] = desc
            if pno not in self.block["pages"]:
                self.block["pages"].append(pno)
            return  # continuation of the same block on a new page
        self.block = {"no": no, "desc": desc, "make": make, "pages": [pno], "vin": [], "rows": [], "section": None}
        self.blocks.append(self.block)
        self.state = {"type": [], "has_pn": False, "year": None, "buf": [], "lastline": None}
        self.mode = "block"

    def parse_page(self, pno):
        boxes = load_ocr(pno)
        if boxes is None:
            self.qa.append(f"p{pno}: no OCR cache; page skipped")
            return
        lines = build_lines(boxes)
        off = page_offset(lines, pno)
        page_make = self.make_for_page(pno)
        # make heading in the running head
        for ln in lines:
            if ln.y < Y_BODY[0] and ln.y > 35:
                m = self.match_make(ln.text)
                if m:
                    page_make = m
        if page_make != self.make:
            self.make, self.block, self.mode = page_make, None, "none"
        if self.make not in self.makes:
            return
        self.pages_done.append(pno)
        for ln in lines:
            if ln.y < Y_BODY[0] or ln.y > Y_BODY[1]:
                continue
            t = ln.text
            tk = t.replace(" ", "")
            # mid-page make heading
            if len(ln.boxes) <= 2 and ln.boxes[0]["x0"] - off < 70 and re.search(r"[A-Za-z]{4,}", t) and \
                    not RE_YEAR.match(t) and self.match_make(t) and not re.search(r"\d", t):
                nm = self.match_make(t)
                if nm != self.make:
                    self.make, self.block, self.mode = nm, None, "none"
                    if nm not in self.makes:
                        return
                continue
            if re.search(r"(Engine|Model)\s*Index", t, re.I):
                self.mode = "index"
                if pno not in self.index_pages:
                    self.index_pages.append(pno)
                continue
            hdr = block_header(ln, off)
            if hdr:
                no, desc = hdr
                self.new_block(no, desc, pno, self.make)
                continue
            if self.mode != "block":
                continue
            if re.fullmatch(r"\(?cont\.?\)?", tk, re.I) or re.fullmatch(r"(\(?cont\.?\)?){2}", tk, re.I):
                continue
            if re.match(r"^VIN\s*Codes?", t, re.I) or re.match(r"^Engine\s*Codes?", t, re.I):
                self.block["vin"].append(norm_text(t))
                self.mode = "block_vin"
                continue
            if self.mode == "block_vin":
                # continuation of a VIN code line (same left edge as the description, no row structure)
                if ln.boxes[0]["x0"] - off > X_TYPE_MAX and not is_col_header(ln) and "'" in t or "[" in t:
                    self.block["vin"][-1] += " " + norm_text(t)
                    continue
                self.mode = "block"
            if is_col_header(ln):
                continue
            if re.search(r"(ENGINE|MISCELLANEOUS|MISC)\s*GASKETS", tk, re.I) or re.fullmatch(r"ENGINEGASKETS\(?cont\.?\)?", tk, re.I):
                self.block["section"] = "misc" if "MISC" in tk.upper() else "engine"
                continue
            if re.search(r"Discontinued", t) or re.search(r"MAHLE\s*20\d\d", t):
                continue
            self.parse_row_line(ln, off, pno)

    def parse_row_line(self, ln, off, pno):
        st = self.state
        cells = {"type": [], "year": [], "vin": [], "notes": [], "pn": [], "qty": []}
        for b in ln.boxes:
            rel = b["x0"] - off
            txt = b["t"].strip()
            if not txt:
                continue
            if rel < X_TYPE_MAX:
                col = "type"
            elif rel < X_YEAR[0]:
                col = "type" if not RE_YEAR.match(txt) else "year"
            elif rel < X_YEAR[1]:
                col = "year"
            elif rel < X_VIN[1]:
                col = "vin"
            elif rel < X_NOTES[1]:
                col = "notes"
            elif rel < X_QTY:
                col = "pn"
            else:
                col = "qty"
            if col == "year" and not RE_YEAR.match(txt):
                m = RE_YEAR_LEAD.match(txt)
                if m:
                    if m.group(1):
                        cells["year"].append((f"{m.group(1)}-{m.group(2)}", b))
                        cells["notes"].append((m.group(3), b))
                    else:
                        cells["year"].append((m.group(4), b))
                        cells["notes"].append((m.group(5), b))
                    continue
                col = "notes" if rel >= 140 else "type"
            if col == "qty" and not re.fullmatch(r"\d{1,2}", txt):
                if RE_PN.match(strip_marks(txt)[0]):
                    col = "pn"
                else:
                    self.skipped_lines[f"qty-col noise {txt!r}"] += 1
                    continue
            if col == "pn" and not RE_PN.match(strip_marks(txt)[0]):
                # material text drifting into the PN column, or a note glued to the PN
                m = RE_PN_TAIL.search(txt)
                if m and m.start() > 0 and RE_PN.match(strip_marks(m.group(1))[0]):
                    cells["notes"].append((txt[:m.start()].strip(" ,;:"), b))
                    cells["pn"].append((m.group(1), b))
                    continue
                col = "notes"
            cells[col].append((txt, b))
        # PN glued to the end of a notes box (e.g. "Carrier C24109VF*")
        if not cells["pn"] and cells["notes"]:
            txt, b = cells["notes"][-1]
            if b["x0"] - off > 300:
                m = RE_PN_TAIL.search(txt)
                if m and (m.start() == 0 or txt[m.start() - 1] in " |,.;:") and RE_PN.match(strip_marks(m.group(1))[0]):
                    cells["notes"][-1] = (txt[:m.start()].strip(" ,;:|"), b)
                    cells["pn"].append((m.group(1), b))
                    if not cells["notes"][-1][0]:
                        cells["notes"].pop()
        tcell = " ".join(x for x, _ in cells["type"]).strip()
        tcell = re.sub(r"\(?cont\.?\)?", "", tcell, flags=re.I).strip(" .,")
        has_year = bool(cells["year"])
        if tcell:
            if has_year or not st["type"] or st["has_pn"]:
                if st["type"] and not st["has_pn"]:
                    self.type_no_pn.append((pno, " ".join(st["type"])))
                st["type"], st["has_pn"], st["buf"], st["year"] = [tcell], False, [], None
            else:
                st["type"].append(tcell)
        if has_year:
            ytxt = cells["year"][0][0]
            m = RE_YEAR.match(ytxt)
            if m:
                st["year"] = (int(m.group(1)), int(m.group(2)) if m.group(2) else int(m.group(1)))
            st["buf"] = []
        for x, _ in cells["notes"]:
            if x:
                st["buf"].append(x)
        if cells["pn"]:
            if len(cells["pn"]) > 1:
                self.qa.append(f"p{pno}: two part numbers on one line {[x for x, _ in cells['pn']]}; first used")
            raw, b = cells["pn"][0]
            pn, disc, sets = strip_marks(raw)
            if not st["type"]:
                self.skipped_lines["pn without part type"] += 1
                self.qa.append(f"p{pno}: {pn} has no part-type heading; skipped")
                st["buf"] = []
                return
            qty = None
            if cells["qty"]:
                qty = int(cells["qty"][0][0])
            notes = norm_text(" ".join(st["buf"]))
            self.block["rows"].append({"type": " ".join(st["type"]), "year": st["year"], "notes": notes, "pn": pn,
                                       "disc": disc, "sets": sets, "qty": qty, "conf": b["c"], "page": pno,
                                       "section": self.block["section"]})
            st["has_pn"] = True
            st["buf"] = []
        elif not tcell and not has_year and not cells["notes"]:
            if ln.text.strip():
                self.skipped_lines[f"unplaced line"] += 1


# ---------------------------------------------------------------------------------------------
# families
# ---------------------------------------------------------------------------------------------
def vin_codes(block):
    codes = set()
    for v in block["vin"]:
        for c in RE_VIN_CODE.findall(v):
            codes.add(c.strip().upper())
    return codes


def families(make, e, codes):
    """(families, resolved) for an engine block."""
    cid, L, cyl, vee, y0, y1 = e["cid"], e["liters"], e["cyl"], e["vee"], e["y0"], e["y1"]
    div = e["division"]
    F = e["flags"]
    gas = "DIESEL" not in F
    fams = []

    def add(f):
        if f not in fams:
            fams.append(f)

    def v8():
        return cyl == 8 or (cyl is None and vee)

    def six_inline():
        return cyl == 6 and not vee

    gm_make = make in ("General Motors Corp", "General Motors Truck")
    gm_div = div in GM_DIVISIONS
    if "DURAMAX" in F or (gm_make and not gas and cyl == 8 and (L == 6.6 or cid in (403,)) and (y0 or 0) >= 2001):
        add("Duramax 6.6")
    elif "CUMMINS" in F or div == "Cummins":
        if cid in (408,) or L == 6.7:
            add("Cummins 6.7")
        elif cid in (359,) or L == 5.9:
            if "24 VALVE" in F or "24V" in F or (y0 or 0) >= 1998:
                add("Cummins 5.9 24V/CR")
            if "12 VALVE" in F or "12V" in F or ((y0 or 0) <= 1998 and "24 VALVE" not in F and "24V" not in F):
                add("Cummins 5.9 12V")
    elif gm_make or gm_div:
        d = div if gm_div else None
        if d in ("Chevrolet", "GMC", "General Motors", None):
            if v8() and gas and cid in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400) and not (
                    d is None and cid in (307, 350, 400) and make == "General Motors Corp" and False):
                add("Small-block Chevy")
            elif v8() and cid in (348, 409):
                add("Chevy W-series 348/409")
            elif v8() and cid in (366, 396, 402, 427, 454, 502) and not ((y0 or 0) >= 1997 and cid == 427):
                if (y0 or 0) <= 1990:
                    add("Chevy Mark IV big block")
                if (y1 or 9999) >= 1991:
                    add("Chevy Gen VI big block")
            elif v8() and gas and (cid in (293, 294, 325, 346, 364, 376, 427) or L in (4.8, 5.3, 5.7, 6.0, 6.2, 7.0)) \
                    and (y0 or 0) >= 1997:
                if codes & LT_CODES or "GEN V" in F or ((y0 or 0) >= 2014 and not (codes & LS_CODES)):
                    add("GM LT (Gen V)")
                if codes & LS_CODES or not (codes & LT_CODES) and not ("GEN V" in F or (y0 or 0) >= 2014):
                    add("GM LS")
            elif six_inline() and gas and cid in (194, 230, 250, 292) and (y0 or 0) >= 1962:
                add("Chevy inline-6")
        if d is None and not fams and v8() and gas:
            # division lost by OCR: displacements unique to one GM division
            d = {330: "Oldsmobile", 403: "Oldsmobile", 394: "Oldsmobile", 371: "Oldsmobile", 389: "Pontiac",
                 421: "Pontiac", 428: "Pontiac", 326: "Pontiac", 301: "Pontiac", 430: "Buick", 340: "Buick",
                 472: "Cadillac", 500: "Cadillac", 368: "Cadillac"}.get(cid)
        if d == "Buick":
            if v8() and cid in (400, 430, 455):
                add("Buick big block")
            elif v8() and cid in (300, 340, 350):
                add("Buick 350")
            elif cyl == 6 and cid in (181, 196, 198, 204, 225, 231, 252):
                add("Buick V6 181-252")
        elif d == "Oldsmobile":
            if v8() and gas and cid in (260, 303, 307, 324, 330, 350, 371, 394, 400, 403, 425, 455):
                add("Oldsmobile V8")
        elif d == "Pontiac":
            if v8() and gas and cid in (265, 287, 301, 316, 326, 347, 350, 370, 389, 400, 421, 428, 455):
                add("Pontiac V8")
            elif six_inline() and cid in (215,) and (y0 or 0) >= 1964:
                add("Chevy inline-6")
        elif d == "Cadillac":
            if v8() and cid in (368, 425, 472, 500):
                add("Cadillac 368-500")
        if not fams and d is None and cyl == 6 and not vee and gas and cid in (181, 196, 198, 204, 225, 231, 252) \
                and make == "Jeep":
            add("Buick V6 181-252")
    elif make in ("Ford", "Ford Truck", "Navistar/International") or div in ("Ford", "Lincoln", "Mercury", "International", "Navistar"):
        ps = any(k in F for k in ("POWER-STROKE", "POWER STROKE", "POWERSTROKE"))
        if not gas and cyl == 8:
            if cid in (444,) or L == 7.3:
                if ps or (y0 or 0) >= 1994 or codes & {"F", "T444E"}:
                    add("Powerstroke 7.3")
            elif cid in (363, 365) or L == 6.0:
                add("Powerstroke 6.0")
            elif cid in (390, 391) or L == 6.4:
                add("Powerstroke 6.4")
            elif cid in (406, 409) or L == 6.7:
                add("Powerstroke 6.7")
        elif v8() and gas and div != "International":
            modular = any(k in F for k in ("SOHC", "DOHC", "MODULAR", "TRITON")) or any(c in codes for c in ("W", "X", "V", "6", "L", "5", "S", "Y", "Z")) and (y0 or 0) >= 1991
            if cid in (302,) and ("COYOTE" in F or ("DOHC" in F and (y0 or 0) >= 2011)):
                add("Ford Coyote")
            elif cid in (302, 307) and "DOHC" in F and (y0 or 0) >= 2011:
                add("Ford Coyote")
            elif cid in (281, 415) or (cid == 330 and ((y0 or 0) >= 1997 or modular)):
                add("Ford Modular")
            elif cid in (221, 255, 260, 289, 302):
                add("Small-block Ford (Windsor)")
            elif cid == 351:
                if "WINDSOR" in F:
                    add("Small-block Ford (Windsor)")
                elif "CLEVELAND" in F or "MODIFIED" in F or "BOSS" in F:
                    add("Ford 351C/351M/400")
                elif y0 and y1 and 1970 <= y0 and y1 <= 1982 and y0 >= 1970:
                    add("Ford 351C/351M/400")  # unqualified 351 block inside the 351C (1970-74) / 351M (1975-82) years
                elif y0 and (y0 <= 1969 or (y1 or 0) >= 1983):
                    add("Small-block Ford (Windsor)")  # unqualified 351 block spanning the 351W years (1969-1997)
            elif cid == 400 and (y0 or 1975) >= 1971:
                add("Ford 351C/351M/400")
            elif cid in (330, 332, 352, 359, 360, 361, 389, 390, 391, 406, 410, 427, 428):
                add("Ford FE")
            elif cid in (370, 429, 460):
                add("Ford 429/460")
            elif cid == 315 or L == 5.2:
                add("Ford Coyote")
        elif cyl == 10 and gas and (cid == 415 or L == 6.8):
            add("Ford Modular")
        elif six_inline() and gas and cid in (240, 300) and (y0 or 0) >= 1965 and div != "International":
            add("Ford 240/300 inline-6")
    elif make in ("Chrysler", "Dodge Truck", "Jeep", "American Motors", "Eagle Chrysler") or div in ("Chrysler", "Dodge", "Plymouth", "American Motors", "AMC", "Jeep"):
        amc = make == "American Motors" or div in ("American Motors", "AMC") or (make == "Jeep" and div in (None, "Jeep"))
        if v8() and "HEMI" in F:
            if cid == 426:
                add("Chrysler 426 Hemi")
            elif cid in (345, 370) or L in (5.7, 6.1):
                add("Chrysler Gen III Hemi 5.7/6.1")
            elif cid in (376, 392) or L in (6.2, 6.4):
                if (y0 or 0) >= 2005:
                    add("Chrysler Gen III Hemi 6.2/6.4")
        elif v8() and gas and amc and cid in (290, 304, 343, 360, 390, 401):
            add("AMC V8")
        elif v8() and gas and not amc and cid in (273, 318, 340, 360) and "POLY" not in F and not (cid == 318 and (y1 or 9999) <= 1966):
            if (y0 or 0) <= 1991:
                add("Mopar LA small block")
            if cid in (318, 360) and (y1 or 9999) >= 1992:
                add("Mopar Magnum 5.2/5.9")
        elif v8() and gas and not amc and make != "Jeep" and cid in (350, 361, 383, 400, 413, 426, 440) and (y0 or 1960) >= 1958:
            add("Mopar B/RB big block")
        elif six_inline() and gas and not amc and cid in (170, 198, 225) and (y0 or 0) >= 1960 and "L-HEAD" not in F:
            add("Mopar Slant Six")
        elif six_inline() and gas and amc and cid in (199, 232, 242, 258) and (y0 or 0) >= 1964:
            add("AMC/Jeep inline-6")
        elif six_inline() and gas and make == "Jeep" and cid in (232, 258, 242):
            add("AMC/Jeep inline-6")
    if not fams:
        return [make], False
    return fams, True


def engine_label(e, block):
    bits = []
    if e["cid"]:
        bits.append(f"{e['cid']} CID")
    if e["liters"]:
        bits.append(f"({e['liters']:g}L)")
    if e["division"]:
        bits.append(e["division"])
    if e["cyl"]:
        bits.append(f"{'V' if e['vee'] else ''}{e['cyl']}")
    extra = [f for f in ("DIESEL", "OHV", "DOHC", "SOHC", "OHC", "HEMI", "WINDSOR", "CLEVELAND", "MODIFIED", "TURBO",
                         "CUMMINS", "POWER-STROKE", "MAGNUM", "VORTEC", "L-HEAD", "POLY") if f in e["flags"]]
    bits.extend(x.title() for x in extra)
    if e["y0"]:
        bits.append(f"{e['y0']}-{e['y1']}" if e["y1"] and e["y1"] != e["y0"] else f"{e['y0']}")
    if not bits:
        return f"block {block['no']} (description not read)"
    return " ".join(bits)


# ---------------------------------------------------------------------------------------------
# records
# ---------------------------------------------------------------------------------------------
OCR_KEY_FIXES = [("vaive", "valve"), ("manitold", "manifold"), ("manifoid", "manifold"), ("outiet", "outlet"),
                 ("outlel", "outlet"), ("fuet", "fuel"), ("boit", "bolt"), ("seai", "seal"), ("mouni", "mount"),
                 ("cyi", "cyl"), ("punp", "pump"), ("circuiar", "circular"), ("lnt", "int"), ("0il", "oil"),
                 ("vaive", "valve"), ("tirning", "timing"), ("rnain", "main"), ("covcr", "cover")]
EXTRA_TYPES = [
    (r"^intakeandexhaust|^exhaustandintake|^intandexh$", ("gasket", "valve stem seal")),  # 2nd line of "Valve Stem Seal, Intake and Exhaust"
    (r"^cam(shaft)?(semi)?circularplug|^camsemicircular|^camcircular", ("gasket", "cam plug")),
    (r"^jetvalveseal", ("gasket", "jet valve seal")),
    (r"^thermmount", ("gasket", "thermostat housing")),
    (r"^manifoldsealint|^intakemanifoldseal", ("gasket", "intake")),
    (r"^intermediateshaft|^intershaft", ("gasket", "intermediate shaft seal")),
    (r"^waterpipeoring|^watermanoring|^watermanifoldoring", ("gasket", "water pipe o-ring")),
    (r"^exhaustairsupply|^airsupplytube|^airinjectiontube", ("gasket", "air injection tube")),
    (r"^crankcasecover", ("gasket", "crankcase cover")),
    (r"^injpumpmtg|^injectionpumpmount|^injpump", ("gasket", "injection pump mount")),
    (r"^aircrossover", ("gasket", "air crossover")),
    (r"^pushrodseal", ("gasket", "push rod seal")),
    (r"^airbypassvalve|^airbypass", ("gasket", "air bypass valve")),
    (r"^cylinderheadendplug|^cylheadendplug|^headendplug", ("gasket", "head end plug")),
    (r"^cylindersleeve|^cylsleeve|^linerseal|^sleeveseal", ("gasket", "cylinder sleeve seal")),
    (r"^sparkplugwasher", ("gasket", "spark plug washer")),
    (r"^sealextender|^airflowsensor|^clutchthrowout|^clutch|^speedometer|^steering|^axle", None),
]
JUNK_TYPE = re.compile(r"cid|^motors$|^mitsubishi$|^volkswagen$|^chrysler$|^dodge$|^ford$|^chevrolet$|^buick$|^pontiac$|^oldsmobile$|^cadillac$|^\d{4}")


def classify_type(name, unknown_types):
    key = normkey(name)
    for a, b in OCR_KEY_FIXES:
        key = key.replace(a, b)
    key = re.sub(r"sel$", "set", key)
    if JUNK_TYPE.search(key):
        return None
    for pat, ct in TYPE_MAP + EXTRA_TYPES:
        if re.search(pat, key):
            return ct
    unknown_types[name] += 1
    return ("gasket", norm_text(name).lower().replace("gst.", "gasket").replace("gst", "gasket"))


def material_of(text):
    low = text.lower()
    for key, mat in MATERIALS:
        if key in low:
            return mat
    return None


def head_material(mat):
    if mat is None:
        return None
    if mat == "MLS":
        return "MLS"
    if mat in ("composite", "graphite composite", "steel-core composite", "fiber"):
        return "composite"
    if mat in ("steel", "steel shim"):
        return "steel shim"
    if mat == "copper":
        return "copper"
    return None


def build_records(blocks, pdf_name, qa):
    groups = OrderedDict()
    unknown_types = Counter()
    unresolved = Counter()
    unresolved_blocks = Counter()
    fam_rows = Counter()
    skipped_types = Counter()
    for blk in blocks:
        e = parse_engine(blk["desc"])
        codes = vin_codes(blk)
        fams, resolved = families(blk["make"], e, codes)
        label = engine_label(e, blk)
        if not resolved:
            unresolved[(blk["make"], label)] += len(blk["rows"])
            unresolved_blocks[blk["make"]] += 1
        if blk["desc"] is None:
            qa.append(f"p{blk['pages'][0]} block {blk['no']} ({blk['make']}): engine description not read by OCR; "
                      f"{len(blk['rows'])} rows kept under the make heading")
        vin_note = "; ".join(blk["vin"]) if blk["vin"] else None
        for r in blk["rows"]:
            ct = classify_type(r["type"], unknown_types)
            if ct is None:
                skipped_types[r["type"]] += 1
                continue
            cat, gtype = ct
            for fam in fams:
                fam_rows[fam] += 1
                key = (r["pn"], cat, fam)
                g = groups.get(key)
                if g is None:
                    g = groups[key] = {"pn": r["pn"], "cat": cat, "fam": fam, "types": Counter(), "engines": OrderedDict(),
                                       "ci": [], "cyl": set(), "y0": None, "y1": None, "notes": OrderedDict(),
                                       "materials": Counter(), "constructions": Counter(), "qty": Counter(),
                                       "disc": False, "sets": False, "pages": [], "blocks": [], "conf": 1.0,
                                       "side": Counter(), "makes": set(), "vins": OrderedDict(), "set": False}
                g["types"][gtype or "headGasket"] += 1
                g["engines"].setdefault(label, None)
                g["makes"].add(blk["make"])
                if vin_note:
                    g["vins"].setdefault(vin_note, None)
                if e["cid"] and e["cid"] not in g["ci"]:
                    g["ci"].append(e["cid"])
                if e["cyl"]:
                    g["cyl"].add(e["cyl"])
                yr = r["year"] or ((e["y0"], e["y1"]) if e["y0"] else None)
                if yr:
                    g["y0"] = yr[0] if g["y0"] is None else min(g["y0"], yr[0])
                    g["y1"] = yr[1] if g["y1"] is None else max(g["y1"], yr[1])
                if r["notes"]:
                    g["notes"].setdefault(r["notes"], None)
                mat = material_of(r["notes"])
                if mat:
                    g["materials"][mat] += 1
                    mm = MATERIAL_RE.search(r["notes"])
                    if mm:
                        g["constructions"][norm_text(mm.group(0)).title()] += 1
                if r["qty"]:
                    g["qty"][r["qty"]] += 1
                g["disc"] = g["disc"] or r["disc"]
                g["sets"] = g["sets"] or r["sets"]
                if r["page"] not in g["pages"]:
                    g["pages"].append(r["page"])
                if blk["no"] not in g["blocks"]:
                    g["blocks"].append(blk["no"])
                g["conf"] = min(g["conf"], r["conf"])
                low = r["notes"].lower()
                if re.search(r"\bleft\b", low):
                    g["side"]["L"] += 1
                if re.search(r"\bright\b", low):
                    g["side"]["R"] += 1
                if re.search(r"\bset\b", r["type"], re.I):
                    g["set"] = True
    records = []
    for (pn, cat, fam), g in groups.items():
        spec = OrderedDict()
        gtype = g["types"].most_common(1)[0][0]
        if len(g["types"]) > 1:
            qa.append(f"{pn} ({fam}): listed under several part types {dict(g['types'])}; {gtype!r} used")
        mat = g["materials"].most_common(1)[0][0] if g["materials"] else None
        constr = g["constructions"].most_common(1)[0][0] if g["constructions"] else None
        if cat == "headGasket":
            hm = head_material(mat)
            if hm:
                spec["material"] = hm
            if constr:
                spec["construction"] = constr
            if g["side"] and not (g["side"]["L"] and g["side"]["R"]):
                spec["side"] = "L" if g["side"]["L"] else "R"
            name = (f"{hm} head gasket" if hm else "head gasket")
            if "side" in spec:
                name += f", {'left' if spec['side'] == 'L' else 'right'} side"
        elif cat == "fastener":
            spec["application"] = gtype
            name = f"{gtype} set"
        else:
            spec["type"] = gtype
            if mat:
                spec["material"] = mat
            if constr:
                spec["construction"] = constr
            if g["set"]:
                spec["set"] = True
            name = gtype + (" set" if g["set"] and not gtype.endswith("set") else "")
            if gtype in ("head set", "full set", "lower set", "engine kit gasket set"):
                name = gtype
            elif not name.endswith(("set", "seal", "sleeve", "grommet", "shim", "plate")):
                name += " gasket"
            if mat and mat not in name:
                name += f", {mat}"
        if g["qty"]:
            spec["perEngine"] = g["qty"].most_common(1)[0][0]
        if g["disc"]:
            spec["discontinued"] = True
        if g["sets"]:
            spec["packedInSets"] = True
        fit = OrderedDict([("fam", fam)])
        if g["ci"]:
            fit["ci"] = sorted(g["ci"])
        if len(g["cyl"]) == 1:
            fit["cyl"] = next(iter(g["cyl"]))
        if g["y0"]:
            fit["y0"] = g["y0"]
            if g["y1"]:
                fit["y1"] = g["y1"]
        engines = list(g["engines"])
        fit["engines"] = engines
        nbits = []
        shown = engines[:6]
        nbits.append("; ".join(shown) + (f"; +{len(engines) - 6} more engines" if len(engines) > 6 else ""))
        if g["vins"]:
            nbits.append(" | ".join(list(g["vins"])[:3]))
        if g["notes"]:
            notes = list(g["notes"])
            nbits.append(" | ".join(notes[:4]) + (f" | +{len(notes) - 4} more notes" if len(notes) > 4 else ""))
        fit["notes"] = " || ".join(nbits)
        src = OrderedDict([("doc", DOC21), ("edition", EDITION21), ("file", pdf_name), ("page", g["pages"][0]),
                           ("printedPage", g["pages"][0]), ("make", sorted(g["makes"])[0] if len(g["makes"]) == 1 else sorted(g["makes"])),
                           ("blocks", [b for b in g["blocks"] if b is not None][:12] or None), ("ocr", True),
                           ("ocrConf", round(g["conf"], 3))])
        if src["blocks"] is None:
            del src["blocks"]
        if len(g["pages"]) > 1:
            src["alsoPages"] = g["pages"][1:13]
        rec = OrderedDict([("m", BRAND), ("p", pn), ("cat", cat), ("name", name), ("fit", fit), ("spec", spec),
                           ("src", src), ("emissions", None)])
        records.append(rec)
    return records, unknown_types, unresolved, unresolved_blocks, fam_rows, skipped_types


# ---------------------------------------------------------------------------------------------
# GA-20-26 manifold installation sets (text layer)
# ---------------------------------------------------------------------------------------------
MIS_MAKES = {"GMC": "General Motors", "GM": "General Motors", "CHE": "General Motors", "CAD": "General Motors",
             "HUM": "General Motors", "FOR": "Ford", "LIN": "Ford", "MAZ": "Ford", "CHR": "Chrysler", "DOD": "Chrysler",
             "JEE": "Chrysler", "RAM": "Chrysler"}


def mis_families(make, liters, y0, y1):
    lo = liters[0] if liters else None
    hi = liters[-1] if liters else None
    if make == "General Motors":
        if lo and 5.0 <= lo <= 5.7 and hi <= 5.7 and y1 <= 2002:
            return ["Small-block Chevy"], True
        if lo == 3.8:
            return ["Buick V6 181-252"], True
        if lo == 6.6 and y0 >= 2001:
            return ["Duramax 6.6"], True
        if lo in (4.8, 5.3, 6.0, 6.2) and y0 >= 2014:
            return ["GM LT (Gen V)"], True
        if lo in (4.8, 5.3, 6.0, 6.2) and 1997 <= y0 < 2014:
            return ["GM LS"], True
        if lo is None and y0 >= 1999:
            return ["GM LS"], True  # 99-11 CHE/GMC/HUM truck intake set: Gen III/IV Vortec V8
        if lo == 7.4 and y0 >= 1991:
            return ["Chevy Gen VI big block"], True
    if make == "Ford":
        if lo in (4.6, 5.4, 6.8):
            return ["Ford Modular"], True
        if lo == 5.0 and y0 >= 2011:
            return ["Ford Coyote"], True
        if lo == 5.0 and y1 <= 2001:
            return ["Small-block Ford (Windsor)"], True
        if lo == 6.0 and y0 >= 2003:
            return ["Powerstroke 6.0"], True
        if lo == 6.4:
            return ["Powerstroke 6.4"], True
        if lo == 6.7 and y0 >= 2011:
            return ["Powerstroke 6.7"], True
        if lo == 7.3 and y0 >= 1994:
            return ["Powerstroke 7.3"], True
    if make == "Chrysler":
        if lo == 6.7:
            return ["Cummins 6.7"], True
        if lo == 5.9 and y0 >= 1998 and hi == 5.9:
            return ["Cummins 5.9 24V/CR"], True
        fams = []
        if lo and 5.7 <= lo <= 6.1:
            fams.append("Chrysler Gen III Hemi 5.7/6.1")
        if hi and hi >= 6.2 and hi <= 6.4:
            fams.append("Chrysler Gen III Hemi 6.2/6.4")
        if fams:
            return fams, True
        if lo in (5.2, 5.9) and 1992 <= y0 <= 2003:
            return ["Mopar Magnum 5.2/5.9"], True
    return [make], False


def extract_ga20(pdf_path, qa):
    try:
        import pymupdf
    except ImportError:
        import fitz as pymupdf
    doc = pymupdf.open(pdf_path)
    pg = doc[6]  # printed page 5: Manifold installation sets
    words = pg.get_text("words")
    lines = build_lines([{"x0": w[0], "y0": w[1], "x1": w[2], "y1": w[3], "t": w[4], "c": 1.0} for w in words])
    rows = []
    for ln in lines:
        bs = ln.boxes
        # two columns: PN at x~72 and x~329
        for start in (0, 300):
            col = [b for b in bs if start <= b["x0"] < start + 300]
            if not col:
                continue
            if not re.match(r"^MIS\d{4,6}(-\d)?[A-Z]{0,2}$", col[0]["t"]):
                continue
            rest = " ".join(b["t"] for b in col[1:])
            m = re.match(r"^(\d\d)-(\d\d)\s+([A-Z/]+)\s*(.*)$", rest)
            if not m:
                qa.append(f"GA-20-26 p7: unparsed application {rest!r} for {col[0]['t']}")
                continue
            a, b_, mk, lit = m.groups()
            y1 = 2000 + int(a) if int(a) < 50 else 1900 + int(a)
            y0 = 2000 + int(b_) if int(b_) < 50 else 1900 + int(b_)
            liters = sorted({float(x) for x in re.findall(r"(\d\.\d)", lit)})
            rows.append((col[0]["t"], y0, y1, mk, liters, rest))
    doc.close()
    records = []
    unresolved = Counter()
    for pn, y0, y1, mk, liters, app in rows:
        make_keys = [MIS_MAKES.get(x, x) for x in mk.split("/")]
        make = make_keys[0]
        fams, resolved = mis_families(make, liters, y0, y1)
        if not resolved:
            unresolved[(make, app)] += 1
        for fam in fams:
            fit = OrderedDict([("fam", fam), ("y0", y0), ("y1", y1)])
            if liters:
                fit["liters"] = liters
            fit["notes"] = f"GA-20-26 application: {app}"
            spec = OrderedDict([("type", "intake manifold installation set"), ("set", True)])
            if pn.endswith("WB"):
                spec["withBolts"] = True
            rec = OrderedDict([("m", BRAND), ("p", pn), ("cat", "gasket"),
                               ("name", "intake manifold installation set" + (" with bolts" if pn.endswith("WB") else "")),
                               ("fit", fit), ("spec", spec),
                               ("src", OrderedDict([("doc", DOC20), ("edition", EDITION20), ("file", os.path.basename(pdf_path)),
                                                    ("page", 7), ("printedPage", 5), ("table", "Manifold installation sets")])),
                               ("emissions", None)])
            records.append(rec)
    return records, len(rows), unresolved


# ---------------------------------------------------------------------------------------------
# manufacturer index, validation, notes
# ---------------------------------------------------------------------------------------------
def read_index(pdf_path):
    """{make: start page} for the engine-related section from the text layer of PDF page 2."""
    try:
        import pymupdf
    except ImportError:
        import fitz as pymupdf
    try:
        doc = pymupdf.open(pdf_path)
        txt = doc[1].get_text()
        doc.close()
    except Exception:
        return dict(FALLBACK_INDEX)
    pairs = {}
    toks = [t.strip() for t in txt.split("\n") if t.strip()]
    for i in range(len(toks) - 1):
        if re.fullmatch(r"\d{1,4}", toks[i + 1]) and re.search(r"[A-Za-z]", toks[i]) and not re.search(r"Page|Manufacturer|Gaskets", toks[i]):
            p = int(toks[i + 1])
            name = toks[i].rstrip(". ")
            if 31 <= p <= ENGINE_SECTION_END and name not in pairs:
                pairs[name] = p
    if len(pairs) < 20:
        return dict(FALLBACK_INDEX)
    return pairs


def make_ranges_from(index):
    items = sorted(index.items(), key=lambda kv: kv[1])
    out = []
    for i, (name, start) in enumerate(items):
        end = items[i + 1][1] - 1 if i + 1 < len(items) else ENGINE_SECTION_END
        out.append((start, max(start, end), name))
    return out


def validate(records):
    errs = []
    seen = Counter((r["p"], r["cat"], r["fit"]["fam"]) for r in records)
    for k, n in seen.items():
        if n > 1:
            errs.append(f"duplicate record {k} x{n}")
    for r in records:
        for k in ("m", "p", "cat", "fit", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r.get("fit", {}).get("fam"):
            errs.append(f"{r.get('p')}: missing fit.fam")

        def walk(o, path):
            if isinstance(o, dict):
                for kk, v in o.items():
                    walk(v, f"{path}.{kk}")
            elif isinstance(o, list):
                for ii, v in enumerate(o):
                    walk(v, f"{path}[{ii}]")
            elif isinstance(o, str) and o == "":
                errs.append(f"{r['p']}: empty string at {path}")
        walk(r, r["p"])
        for k in ("bore", "thickness", "volumeCc", "perEngine"):
            if k in r["spec"] and not isinstance(r["spec"][k], (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric")
        for k in ("y0", "y1", "cyl"):
            if k in r["fit"] and not isinstance(r["fit"][k], int):
                errs.append(f"{r['p']}: fit.{k} not an int")
    return errs


def write_notes(path, args, parser, records, rec20, n20, unres20, unknown_types, unresolved, unresolved_blocks,
                fam_rows, skipped_types, qa, errs, ranges, npages21, ocr_new):
    by_cat = Counter(r["cat"] for r in records)
    by_fam_cat = Counter((r["fit"]["fam"], r["cat"]) for r in records)
    by_fam = Counter(r["fit"]["fam"] for r in records)
    by_type = Counter(r["spec"].get("type") for r in records if r["cat"] == "gasket")
    nrows = sum(len(b["rows"]) for b in parser.blocks)
    disc = sum(1 for r in records if r["spec"].get("discontinued"))
    L = ["# MAHLE OE gaskets (GA-21-17 + GA-20-26) extraction notes", ""]
    L.append(f"- Extracted {dt.date.today().isoformat()} with `extract_mahle_oe_gaskets.py`. Sources are manual downloads under `Catalogs/`; no network used.")
    L.append(f"- `{os.path.basename(args.pdf21)}`: {npages21} pages. **The application pages (31-1038) are scanned images with no text layer** (965x1432 px greyscale JPX per page, ~115 dpi); only the front matter and the reference tables at the back are text. Pages were rendered at {args.dpi} dpi and OCR'd with rapidocr_onnxruntime; word boxes are cached in `dl/mahle-oe-gaskets/ocr/` ({ocr_new} pages OCR'd in this run).")
    L.append(f"- `{os.path.basename(args.pdf20)}`: 52-page web PDF = front matter only. Its manufacturer index points at application pages 49-1684 that are not in the file, so the 2000-and-newer application data is **not available** from this source. The one part table it has (Manifold Installation Sets, printed p5) gave {n20} MIS part numbers -> {len(rec20)} records.")
    L.append("")
    L.append("## Coverage of GA-21-17\n")
    L.append("Engine-related section only (pp 31-756); the model-related section (pp 757-1038) is differential-cover and transmission gaskets and was skipped. Makes extracted, with the page ranges from the manufacturer index (PDF page = printed page):\n")
    for s, e, m in ranges:
        if m in args.make_list:
            done = [p for p in parser.pages_done if s <= p <= e]
            L.append(f"- {m}: pp {s}-{e} ({e - s + 1} pages; {len(done)} parsed, {len([p for p in parser.index_pages if s <= p <= e])} of them engine/model index pages)")
    yr_by_make = {}
    for b in parser.blocks:
        for r in b["rows"]:
            if r["year"]:
                lo, hi = yr_by_make.get(b["make"], (9999, 0))
                yr_by_make[b["make"]] = (min(lo, r["year"][0]), max(hi, r["year"][1]))
    L.append("\nModel years covered by the extracted rows (the catalog's engine-related section for these makes stops at model year 1990; there are no LS, Modular, Coyote, Gen III Hemi, Magnum, Duramax, Powerstroke or 24-valve Cummins blocks in it):\n")
    for mk, (lo, hi) in sorted(yr_by_make.items()):
        L.append(f"- {mk}: {lo}-{hi}")
    skipped_makes = [m for _, _, m in ranges if m not in args.make_list]
    L.append(f"\nMakes not extracted ({len(skipped_makes)}; imports plus small domestic marques such as Checker, Hudson, Nash, Kaiser-Frazer, Studebaker, Eagle): {', '.join(skipped_makes)}.")
    L.append("")
    L.append(f"- {len(parser.blocks)} engine blocks, {nrows} part rows -> {len(records)} GA-21-17 records ({len({r['p'] for r in records})} unique PNs) + {len(rec20)} GA-20-26 records.")
    L.append(f"- By cat (GA-21-17): " + ", ".join(f"{k} {v}" for k, v in sorted(by_cat.items())) + f"; {disc} records are marked discontinued in the catalog.")
    L.append("")
    L.append("## Records by family (GA-21-17)\n")
    for fam, n in sorted(by_fam.items(), key=lambda kv: (-kv[1], kv[0])):
        cats = ", ".join(f"{c} {by_fam_cat[(fam, c)]}" for c in ("headGasket", "gasket", "fastener") if by_fam_cat[(fam, c)])
        tag = "" if fam in FAMILIES else "  (catalog make heading: engines not in the brief's family list)"
        L.append(f"- {fam}: {n} ({cats}){tag}")
    L.append("")
    L.append("## Gasket types (spec.type, GA-21-17)\n")
    for k, v in sorted(by_type.items(), key=lambda kv: -kv[1]):
        L.append(f"- {k}: {v}")
    L.append("")
    L.append("## Field notes\n")
    L.append("- `headGasket`: the OE catalog prints no bore or thickness, so `spec.bore`/`spec.thickness` are absent; the engine's nominal bore is in the engine description (`fit.engines`). `spec.material` = composite (printed Composite / Graphite), MLS, steel shim or copper where the notes column prints a material; `spec.construction` keeps the printed word. `spec.side` L/R from Left / Right in the notes.")
    L.append("- `gasket.spec.type` from the printed part type (head set, full set, lower set = conversion set, engine kit gasket set, valve cover, valve stem seal, intake / exhaust / intake & exhaust manifold set, oil pan, rear main seal, timing cover set / gasket / seal, repair sleeve, water outlet, water pump, fuel pump, carb base, exhaust pipe, ...). `spec.set` = true when the printed type says Set; `spec.material` / `spec.construction` from the printed material (cork rubber, molded rubber, cork with metal carrier, rope packing, ...). `spec.perEngine` = Qty column. `spec.discontinued` = `*` in the catalog; `spec.packedInSets` = `†` (now packed in sets).")
    L.append("- Head bolt sets (`Cyl. Head Bolt Set`) are `fastener` with `spec.application` = head bolt; sealant, bellhousing / U-joint housing rows are skipped.")
    L.append("- One record per PN per family: all engine blocks of a family that list the PN are merged. `fit.engines` lists every engine (CID, liters, division, cylinders, qualifiers, block years); `fit.ci` the displacements; `fit.y0/y1` the span of the row year ranges; `fit.notes` = first engines + VIN code lines + the printed application notes (first 4). `src.blocks` lists the catalog block numbers, `src.page` the first page, `src.alsoPages` the rest.")
    L.append("- Family resolution from the engine description: GM by division + displacement (+ VIN engine codes for LS vs LT, years for Mark IV vs Gen VI); Ford by displacement + Windsor/Cleveland/Modified/DOHC qualifiers; Chrysler LA vs Magnum by years (318/360 blocks spanning 1991/1992 are emitted in both families); Cummins 12V/24V by years; Powerstroke by displacement and the Power-Stroke qualifier (7.3 IDI stays unresolved). Unresolved engines keep the catalog make heading as `fit.fam` and are listed below.")
    L.append("- OCR caveats: `*` and `†` after part numbers are read as `*`, `\"`, `'`, `` ` `` (-> discontinued) and `+`, `f` (-> packed in sets); `src.ocrConf` is the lowest OCR confidence of the PN boxes merged into the record (records below 0.85 deserve a look). Notes text has OCR spacing repaired heuristically.")
    L.append("")
    L.append(f"## Unresolved engines kept under the make heading ({sum(unresolved.values())} rows in {sum(unresolved_blocks.values())} blocks)\n")
    for mk, n in sorted(unresolved_blocks.items()):
        L.append(f"- {mk}: {n} blocks")
    L.append("")
    for (mk, label), n in sorted(unresolved.items(), key=lambda kv: (kv[0][0], -kv[1]))[:400]:
        L.append(f"  - {mk}: {label} ({n} rows)")
    L.append("")
    L.append(f"## Part types not in the mapping table ({sum(unknown_types.values())} rows; stored with the printed name as spec.type)\n")
    for k, v in unknown_types.most_common(150):
        L.append(f"- {k}: {v}")
    if not unknown_types:
        L.append("- none")
    L.append("")
    L.append(f"## Rows skipped by part type ({sum(skipped_types.values())})\n")
    for k, v in skipped_types.most_common(40):
        L.append(f"- {k}: {v}")
    if not skipped_types:
        L.append("- none")
    L.append("")
    L.append(f"## Part-type lines that never got a part number ({len(parser.type_no_pn)}; OCR missed the PN or the type had none)\n")
    for pno, t in parser.type_no_pn[:80]:
        L.append(f"- p{pno}: {t}")
    L.append("")
    L.append(f"## Other skipped lines\n")
    for k, v in parser.skipped_lines.most_common(40):
        L.append(f"- {k}: {v}")
    if not parser.skipped_lines:
        L.append("- none")
    L.append("")
    if unres20:
        L.append(f"## GA-20-26 MIS sets left under the make name ({sum(unres20.values())})\n")
        for (mk, app), n in unres20.items():
            L.append(f"- {mk}: {app}")
        L.append("")
    lowconf = [r for r in records if r["src"].get("ocrConf", 1) < 0.85]
    L.append(f"## QA ({len(qa)} notes; {len(lowconf)} records with PN OCR confidence < 0.85)\n")
    for q in qa[:400]:
        L.append(f"- {q}")
    if len(qa) > 400:
        L.append(f"- ... {len(qa) - 400} more")
    L.append("")
    L.append(f"## Validation ({len(errs)} errors)\n")
    for e in errs[:50]:
        L.append(f"- {e}")
    if not errs:
        L.append("- no duplicate (p, cat, fam); every record has m p cat fit.fam src; numeric fields numeric; no empty strings")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf21", default=DEFAULT_PDF21)
    ap.add_argument("--pdf20", default=DEFAULT_PDF20)
    ap.add_argument("--makes", default=",".join(DOMESTIC_MAKES), help="comma-separated catalog make headings")
    ap.add_argument("--ocr-workers", type=int, default=6)
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--no-ocr", action="store_true", help="parse the OCR cache only; skip pages not cached")
    ap.add_argument("--skip-ga20", action="store_true")
    ap.add_argument("--pages", default=None, help="debug: restrict to pages, e.g. 300-320")
    args = ap.parse_args()
    args.make_list = [m.strip() for m in args.makes.split(",") if m.strip()]
    if not os.path.exists(args.pdf21):
        sys.exit(f"PDF not found: {args.pdf21}")
    qa = []
    index = read_index(args.pdf21)
    ranges = make_ranges_from(index)
    known = {m for _, _, m in ranges}
    for m in args.make_list:
        if m not in known:
            sys.exit(f"make {m!r} not in the manufacturer index; known: {sorted(known)}")
    pages = []
    for s, e, m in ranges:
        if m in args.make_list:
            pages.extend(range(s, e + 1))
    # a make's first page can start mid-page after the previous make: include the page before too
    if args.pages:
        a, b = args.pages.split("-")
        pages = [p for p in pages if int(a) <= p <= int(b)]
    pages = sorted(set(pages))
    ocr_new = 0
    if not args.no_ocr:
        ocr_new = ensure_ocr(args.pdf21, pages, args.ocr_workers, args.dpi)
    parser = Parser(ranges, set(args.make_list), qa)
    for p in pages:
        parser.parse_page(p)
    pdf_name = os.path.basename(args.pdf21)
    empty = [b for b in parser.blocks if not b["rows"]]
    if empty:
        qa.append(f"{len(empty)} block headers without any rows dropped (index lines or headers whose rows were not read): "
                  + ", ".join(f"p{b['pages'][0]}#{b['no']}" for b in empty[:25]))
        parser.blocks = [b for b in parser.blocks if b["rows"]]
    records, unknown_types, unresolved, unresolved_blocks, fam_rows, skipped_types = build_records(parser.blocks, pdf_name, qa)
    rec20, n20, unres20 = ([], 0, Counter())
    if not args.skip_ga20 and os.path.exists(args.pdf20):
        rec20, n20, unres20 = extract_ga20(args.pdf20, qa)
    all_records = records + rec20
    errs = validate(all_records)
    os.makedirs(OUT, exist_ok=True)
    try:
        import pymupdf
        npages21 = len(pymupdf.open(args.pdf21))
    except Exception:
        npages21 = 1080
    out = {"source": {"brand": BRAND,
                      "docs": [{"doc": DOC21, "edition": EDITION21, "file": pdf_name, "pages": npages21,
                                "parsedPages": [min(pages), max(pages)] if pages else None, "makes": args.make_list,
                                "ocr": "rapidocr_onnxruntime on page renders; application pages have no text layer"},
                               {"doc": DOC20, "edition": EDITION20, "file": os.path.basename(args.pdf20), "pages": 52,
                                "parsedPages": [7, 7], "note": "web PDF is front matter only; application pages absent"}],
                      "note": "manual PDFs under Catalogs/; mahle-aftermarket.com blocks fetchers; no network used"},
           "extracted": dt.date.today().isoformat(), "count": len(all_records), "parts": all_records}
    with open(os.path.join(OUT, "mahle-oe-gaskets.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "mahle-oe-gaskets.md"), args, parser, records, rec20, n20, unres20, unknown_types,
                unresolved, unresolved_blocks, fam_rows, skipped_types, qa, errs, ranges, npages21, ocr_new)
    by_cat = Counter(r["cat"] for r in all_records)
    nrows = sum(len(b["rows"]) for b in parser.blocks)
    print(f"{len(all_records)} records ({len({r['p'] for r in all_records})} unique PNs) from {len(parser.blocks)} blocks / "
          f"{nrows} rows on {len(parser.pages_done)} pages: {dict(by_cat)}; unresolved rows {sum(unresolved.values())}; "
          f"unknown types {sum(unknown_types.values())}; QA {len(qa)}; errors {len(errs)}")
    for e in errs[:20]:
        print("ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
