#!/usr/bin/env python3
"""Parts catalog extractor: KC (KC Turbos, kcturbos.com).

Source is the public Shopify listing `https://kcturbos.com/products.json?limit=250&page=N`.
Pages are cached under `dl/kc/` (gitignored) so the parse step is re-runnable offline; the fetch is
resumable (a page that is already cached is not requested again).

    python -I scripts/parts-catalog/extract_kc.py            # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_kc.py --offline  # parse the cache only

Emits `turbo`, `manifold`, `injector` and `injectionPump` records with `emissions`. KC resells many
other brands (XDP, Garrett, BorgWarner, Full Force, WDI, ODawgs, PPE...); `m` is the brand named on
the listing. Apparel, core charges, garage-sale one-offs, hidden back-end listings, turbo parts,
DIY kits, lift pumps and everything outside the four categories are counted in the notes.
Writes `out/kc.json` and `out/kc.md` next to this file. Nothing else is written outside `dl/` and `out/`.
"""
from __future__ import annotations

import collections
import datetime as dt
import json
import pathlib
import re
import sys
import time
import urllib.robotparser

HERE = pathlib.Path(__file__).resolve().parent
DL = HERE / "dl" / "kc"
OUT = HERE / "out"
HOST = "kcturbos.com"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 10.0  # the brief: Crawl-delay 10
EDITION = dt.date.today().strftime("%Y-%m")
SRC_DOC = "kcturbos.com Shopify products.json"

# fit.fam strings must match artifacts/engine-build/public/data/cam-fitment.json
FAM = {
    "Cummins 5.9 12V": {"ci": [359], "cyl": 6},
    "Cummins 5.9 24V/CR": {"ci": [359], "cyl": 6},
    "Cummins 6.7": {"ci": [408], "cyl": 6},
    "Duramax 6.6": {"ci": [403], "cyl": 8},
    "Powerstroke 7.3": {"ci": [444], "cyl": 8},
    "Powerstroke 6.0": {"ci": [365], "cyl": 8},
    "Powerstroke 6.4": {"ci": [390], "cyl": 8},
    "Powerstroke 6.7": {"ci": [406], "cyl": 8},
}
# Not in cam-fitment.json: catalog heading kept in fit.fam and flagged in the notes.
UNKNOWN_FAM_CYL = {"Ford EcoBoost": 6, "Universal": None, "Power Stroke": 8, "Cummins": 6}

DMX_CODE = re.compile(r"\b(LB7|LLY|LBZ|LMM|LGH|LML|L5P)\b", re.I)
DMX_YEARS = {"LB7": (2001, 2004), "LLY": (2004, 2005), "LBZ": (2006, 2007), "LMM": (2007, 2010),
             "LGH": (2011, 2016), "LML": (2011, 2016), "L5P": (2017, None)}

# vendor field -> brand; vendors that are distributors get the brand from the title instead
VENDOR_NAME = {
    "KC Turbos": "KC Turbos", "KC No Dealer": "KC Turbos", "KC package": "KC Turbos", "R&D": "KC Turbos",
    "Borg Warner": "BorgWarner", "Garrett": "Garrett", "Ford": "Ford", "Motorcraft": "Ford", "Full Force": "Full Force Diesel",
    "WDI": "WDI", "ODawgs": "ODawgs Diesel", "H&S": "H&S Motorsports", "RCD": "River City Diesel",
    "River City Diesel": "River City Diesel", "Nostrum High Performance": "Nostrum", "CNCFAB": "CNC Fabrication",
    "Kill Devil": "Kill Devil Diesel", "Dorman": "Dorman", "PPE": "PPE", "Pusher": "Pusher", "XDI": "Xtreme-DI",
    "rotomaster": "Rotomaster", "No Limit": "No Limit Fabrication", "BD Diesel": "BD Diesel", "BD Power": "BD Diesel",
    "Alliant": "Alliant Power", "Alliant Power": "Alliant Power", "S&S": "S&S Diesel Motorsport", "Bulletproof diesel": "Bullet Proof Diesel",
    "Exergy": "Exergy", "Industrial Injection": "Industrial Injection", "Holset": "Holset", "Bosch": "Bosch", "Upgraded": "KC Turbos",
}
DISTRIBUTORS = {"XDP", "Turn14", "XDP / Turn14", "XDP / Turn14 / Premier", "Diesel Forward", "AP / DF", "Summit", "Premier",
                "CPP", "Diesel Forward / Alliant Power", "S&S / KDD / TURN 14", "XDP / Dorman", "Internal",
                "Nitrous Express / Turn14"}
TITLE_BRANDS = [
    ("Industrial Injection", "Industrial Injection"), ("BD-Power", "BD Diesel"), ("BD Power", "BD Diesel"), ("Garrett", "Garrett"),
    ("S&S", "S&S Diesel Motorsport"), ("S&S®", "S&S Diesel Motorsport"),
    ("Borg Warner", "BorgWarner"), ("BorgWarner", "BorgWarner"), ("Holset", "Holset"), ("Exergy", "Exergy"), ("Bosch", "Bosch"),
    ("Pure Power Technologies", "Pure Power Technologies"), ("Mahle", "Mahle"), ("XDP", "XDP"), ("Alliant", "Alliant Power"),
    ("Fluidampr", "Fluidampr"), ("H&S", "H&S Motorsports"), ("PPE", "PPE"), ("Dorman", "Dorman"), ("Rotomaster", "Rotomaster"),
    ("Ford", "Ford"), ("Motorcraft", "Ford"), ("Dynomite", "Dynomite Diesel"), ("DDP", "Dynomite Diesel"),
]


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html(html: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html or "", flags=re.S | re.I)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&amp;", "&").replace("&nbsp;", " ").replace("&quot;", '"').replace("&#39;", "'")
            .replace("&rsquo;", "'").replace("&lsquo;", "'").replace("&rdquo;", '"').replace("&ldquo;", '"')
            .replace("&ndash;", "-").replace("&mdash;", "-").replace("’", "'").replace("“", '"').replace("”", '"'))
    return re.sub(r"\s+", " ", text).strip()


def num(s) -> float | int | None:
    if s is None:
        return None
    try:
        v = float(str(s).replace(",", ""))
    except ValueError:
        return None
    return int(v) if v.is_integer() else round(v, 3)


def clean_empty(obj):
    """Drop None values and empty strings/lists/dicts recursively (keeps 0 and False)."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            v = clean_empty(v)
            if v is None or v == "" or v == [] or v == {}:
                continue
            out[k] = v
        return out
    if isinstance(obj, list):
        return [clean_empty(v) for v in obj if v is not None and v != ""]
    if isinstance(obj, str):
        return obj.strip()
    return obj


def norm_sku(sku: str) -> str:
    """Trim, collapse whitespace, and tighten KC's ' - (Pol)' / ' - LLY' suffixes to '-(Pol)' / '-LLY'."""
    s = re.sub(r"\s+", " ", (sku or "")).strip()
    s = re.sub(r"\s*-\s*", "-", s)
    s = re.sub(r"\s*/\s*", " / ", s)
    return s


class Stats:
    def __init__(self):
        self.skipped = collections.Counter()
        self.skipped_items = collections.defaultdict(list)
        self.qa = []
        self.unknown_fams = collections.Counter()
        self.merged_dupes = []
        self.shared_sku = []
        self.pages = 0
        self.products = 0
        self.no_wheel_stock = 0
        self.robots_note = ""

        self.qa_once: dict[tuple, list] = collections.OrderedDict()

    def skip(self, reason, label):
        self.skipped[reason] += 1
        self.skipped_items[reason].append(label)

    def flag(self, handle: str, kind: str, msg: str, sku: str):
        """One QA line per listing and kind, listing the SKUs it covers (a 72-variant listing is one line)."""
        self.qa_once.setdefault((handle, kind), [msg, []])[1].append(sku)


# --------------------------------------------------------------------------- fetch
def robots_delay(stats: Stats) -> float:
    robots_file = DL / "robots.txt"
    txt = robots_file.read_text() if robots_file.exists() else ""
    body = "\n".join(l for l in txt.splitlines() if not l.startswith("#"))
    if body.strip():
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(body.splitlines())
        if not rp.can_fetch(UA, f"https://{HOST}/products.json"):
            raise SystemExit(f"{HOST}: robots.txt disallows /products.json; stopping")
        cd = rp.crawl_delay(UA) or rp.crawl_delay("*") or 0
        stats.robots_note = (f"robots.txt fetched and parsed; /products.json is not disallowed (standard Shopify disallow "
                             f"list); robots Crawl-delay {cd or 'none'}, requests spaced {max(MIN_DELAY, cd):.0f} s")
        return max(MIN_DELAY, cd)
    stats.robots_note = "robots.txt could not be read; proceeded on the brief's stated Crawl-delay 10"
    return MIN_DELAY


def fetch_all(session, stats: Stats) -> list[dict]:
    DL.mkdir(parents=True, exist_ok=True)
    robots_file = DL / "robots.txt"
    if not robots_file.exists() or robots_file.stat().st_size == 0:
        r = session.get(f"https://{HOST}/robots.txt", timeout=60, allow_redirects=True)
        log(f"robots.txt -> {r.status_code} via {r.url}")
        robots_file.write_text(r.text if r.status_code == 200 else f"# status {r.status_code}\n")
        time.sleep(MIN_DELAY)
    delay = robots_delay(stats)
    products = []
    page = 1
    while True:
        cache = DL / f"products_p{page}.json"
        if cache.exists() and cache.stat().st_size > 0:
            data = json.loads(cache.read_text())
        else:
            url = f"https://{HOST}/products.json?limit=250&page={page}"
            r = session.get(url, timeout=60)
            log(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
            if r.status_code in (403, 429) or "Just a moment" in r.text[:2000]:
                raise SystemExit(f"{HOST}: blocked ({r.status_code}); not retrying")
            r.raise_for_status()
            data = r.json()
            cache.write_text(json.dumps(data))
            time.sleep(delay)
        batch = data.get("products", [])
        products.extend(batch)
        if len(batch) < 250:
            break
        page += 1
    return products


def load_cache() -> list[dict]:
    products = []
    for f in sorted(DL.glob("products_p*.json"), key=lambda p: int(p.stem.rsplit("_p", 1)[1])):
        products.extend(json.loads(f.read_text()).get("products", []))
    return products


# --------------------------------------------------------------------------- classification
MERCH_TYPES = {"T-Shirt", "T-shirt", "Hoodie", "Hats", "Decal", "Mug", "Kids clothes", "Tank Top", "free swag", "Air Freshener",
               "Jewelry", "Long-sleeve", "Gift Card", "Insurance", "Tools", "lighting", "Lighting", "Fuel Additive", "Exterior",
               "Grille", "Steering", "Suspension", "Transmissions", "Nitrous"}
MERCH_TAGS = {"kc gear", "kc  gear", "kc apparel", "t-shirt", "hoodie", "hats", "decal", "men", "kids", "lighting", "oil additive"}
# product types that never hold one of the four categories but whose titles can mention turbos / manifolds / pumps
NON_PART_TYPES = {"Programmers & Gauges", "Exhausts", "exhausts", "Cold Air Intake", "Intercoolers", "cooling", "Cooling",
                  "oil components", "oil componenets", "alternator", "Gaskets", "Gasket", "air system", "intake", "Intake",
                  "performance parts", "Power Pack Packages", "power pack", "package", "Package", "BPD Kit"}
PART_WORDS = re.compile(
    r"\b(gaskets?|bolts?|studs?|clamps?|sensors?|plugs?|blankets?|spacers?|install(?:ation)? kit|boots?|flange|actuator|"
    r"rebuild kit|balanced assembly|compressor wheel|turbine wheel|turbine housing|housing|cover|pedestal|up-?pipes?|"
    r"down ?pipe|downpipe|intercooler pipe|piping|inlet|plenums?|cups?|sleeves?|puller|socket|filter|drain|label|"
    r"core|shipping|tool|resonator|lamp|light|banner|clamp|hose|line|tube|adapter|bracket|solenoid|kit only|"
    r"whistle add|add on|blow off|diverter|o-ring|tuning|rental)\b", re.I)


def classify(p: dict, title: str, body: str) -> tuple[str | None, str | None]:
    """Return (cat, skip_reason). Exactly one of the two is set."""
    t = re.sub(r"^KC Turbos\b", "KC", title)  # the brand prefix must not satisfy the 'turbo' test
    pt = (p.get("product_type") or "").strip()
    tags = [x.lower() for x in p.get("tags", [])]
    vendor = p.get("vendor") or ""
    sku0 = norm_sku(p["variants"][0].get("sku") or "")
    if re.match(r"^(X|Z)\s*-?\s*\(", t) or re.match(r"^X-", t) or "Backend" in sku0 or "Back End" in t:
        return None, "hidden back-end / package-component listing (X-(Back End)...)"
    if "hidden" in tags:
        return None, "hidden listing (not on the storefront)"
    if "garage sale" in tags or vendor == "KC Garage Sale":
        return None, "garage-sale one-off (used / open-box / discontinued unit, duplicate SKU with -GARnnnn suffix)"
    if pt == "Core" or re.search(r"\bcore charge\b|\bcore\b.*\b(charge|credit)\b|send[- ]in[- ]core", t, re.I) or \
            re.search(r"^Core-Charge|^Send-In-First|core-charge|-core$|-core-", sku0, re.I):
        return None, "core charge / core-return listing"
    if pt in MERCH_TYPES or any(x in MERCH_TAGS for x in tags) or vendor in ("Textile Graphix", "Printify", "Driven Lighting Group",
                                                                                 "Baja Designs", "Vision X", "Rigid", "Opti-Lube"):
        return None, "apparel / merch / lighting / additives / accessories"
    if re.search(r"\bdelete\b", t, re.I) and not re.search(r"fuel bowl delete|resonator delete", t, re.I):
        return None, "delete part (skipped by rule)"
    if re.search(r"\b(EGR|DPF|SCR|DOC)\b", t):
        return None, "emissions-system part (EGR cooler / gasket)"
    if pt in NON_PART_TYPES:
        return None, f"other: {pt}"

    # manifolds (before turbos: 'Intake Manifold / Turbo Inlet Package')
    if re.search(r"plenum", t, re.I):
        return None, "intake plenum (not a manifold record)"
    if re.search(r"manifold|intake spyder", t, re.I):
        if re.search(r"sensor|gasket|bolt|spacer|blanket|install kit|plug|temp|pressure|\bMAP\b|\bIAT\b|by-?pass|"
                     r"intercooler pipe|individually|lower intake", t, re.I):
            return None, "manifold hardware / gasket / sensor"
        return "manifold", None

    # turbos
    if pt == "DIY Turbo Kit" or re.search(r"DIY|Balanced Assembly|Rebuild kit", t, re.I):
        return None, "DIY turbo kit / balanced assembly / rebuild kit (turbo parts, not a complete turbo)"
    if pt == "Complete Turbo" or re.search(r"\bturbos?\b|turbocharger|supercore", t, re.I):
        if re.search(r"Install Kit|Installation Kit|Mounting Gasket|Gasket|Clamp|Housing\b|Resonator|Bolt|Drain|Lamp|Light|Blanket|"
                     r"Boot|Whistler Upgrade|Whistle|Timer|Shipping|Kompact|Wheel\b|Fuel Line|Line Kit|Feed|Pigtail|O-Ring|"
                     r"Down ?pipe|Up-?Pipe|Pedestal|Intercooler(?! Package)|Charge Pipe|Exhaust|Outlet|Adapter|Bracket|Oil Line|"
                     r"Cover\b|Backing Plate|Actuator|Power Supply|Filter|Hose|Tube|Sensor|Stud", t, re.I) \
                and not re.search(r"Conversion Kit|Twin Turbos|Compound Turbos|\(W/ TURBO\)", t, re.I):
            return None, "turbo parts / hardware"
        if pt == "Turbo Parts":
            return None, "turbo parts / hardware"
        return "turbo", None
    if pt == "Turbo Parts":
        return None, "turbo parts / hardware"

    # injectors
    if pt == "Injectors" or re.search(r"\binjectors?\b", t, re.I):
        if re.search(r"cups?|sleeves?|nozzle size|core|install|o-ring|harness|tool|socket|regulator|lines?\b|tubes?\b", t, re.I):
            return None, "injector hardware / cups / feed tubes / nozzle-only / core listings"
        return "injector", None

    # injection pumps (CP3/CP4/VP44/HPFP/HPOP)
    if re.search(r"\bCP3\b|\bCP4(?:\.2)?\b|\bCPX\b|VP44|Injection Pump|Stroker|High Pressure Fuel Pump|HPFP|"
                 r"High Pressure Oil Pump|\bHPOP\b", t, re.I):
        if re.search(r"puller|gear|kit\b(?!.*pump)|contamination|disaster|metering valve|core|crossover|fitting|"
                     r"label|barrel|plunger|stand pipe|cylinder head|\bhead\b|cover|reservoir|lines?\b|screen|filter", t, re.I) \
                and not re.search(r"Dual HPOP Kit|Goliath", t, re.I):
            return None, "pump hardware / kits without the pump"
        return "injectionPump", None
    if re.search(r"AirDog|FASS|lift pump|fuel system\b|in tank fuel pump|fuel pump", t, re.I) or pt == "Fuel":
        return None, "lift pump / fuel-system kit (not a task category)"
    return None, f"other: {pt or 'untyped'}"


def brand_for(p: dict, title: str) -> str:
    vendor = (p.get("vendor") or "").strip()
    if vendor in DISTRIBUTORS or vendor == "":
        for key, brand in TITLE_BRANDS:
            if re.search(rf"\b{re.escape(key)}\b", title):
                return brand
        if re.search(r"^KC\b", title):
            return "KC Turbos"
        return vendor or "KC Turbos"
    return VENDOR_NAME.get(vendor, vendor)


# --------------------------------------------------------------------------- fitment
TAIL = re.compile(r"[-–]\s*(?P<disp>(?:\d\.\d\s*L?\s*(?:[&/,]\s*)?)+)?\s*(?P<make>Powerstroke|Power Stroke|Cummins|Duramax|EcoBoost)"
                  r"\s*(?P<sub>OBS|Cab & Chassis|Cab N Chassis|F-150/Raptor)?\s*(?:\((?P<yrs>[^)]*)\))?\s*(?:Powder Coats)?\s*$", re.I)
UNIVERSAL = re.compile(r"Powerstroke,\s*Cummins,\s*Duramax", re.I)


def yr4(s: str) -> float:
    v = float(s)
    if v < 100:
        v += 1900 if v >= 80 else 2000
    return v


def parse_years(s: str) -> dict | None:
    """'2003-2007', '94 - 98', 'L99-03', 'E99', '1994-E1999', '2004.5-2010', '2019+', '2004+', '1999.5-2003 (L99)',
    'Early 99', '11-14', '2017-19 - Cab N Chassis' -> {y0, y1, open, notes[]}."""
    if not s:
        return None
    s = s.strip()
    notes = []
    if re.search(r"\bOBS\b", s):
        notes.append("OBS")
    if re.search(r"Cab (?:&|N) Chassis", s, re.I):
        notes.append("cab & chassis")
    m = re.search(r"\b(?:E99|Early '?99|E1999)\b", s, re.I)
    if m and not re.search(r"\d{2,4}\s*[-–]\s*E", s):
        return {"y0": 1999, "y1": 1999, "open": False, "notes": notes + ["early 1999"]}
    m = re.search(r"\bL99\s*[-–]\s*(\d{2,4})", s)
    if m:
        return {"y0": 1999, "y1": yr4(m.group(1)), "open": False, "notes": notes + ["late 1999 on"]}
    m = re.search(r"(\d{4}(?:\.5)?)\s*[-–]\s*E(\d{4})", s)
    if m:
        return {"y0": float(m.group(1)), "y1": float(m.group(2)), "open": False, "notes": notes + ["to early 1999"]}
    m = re.search(r"(?<![\d.])(\d{2,4}(?:\.5)?)\s*[-–]\s*(\d{2,4}(?:\.5)?)\s*(\+)?", s)
    if m:
        y0, y1 = yr4(m.group(1)), yr4(m.group(2))
        if y1 < y0 and len(m.group(2)) <= 2:
            y1 += 100
        if 1980 <= y0 <= 2035 and y0 <= y1 <= 2035:
            d = {"y0": y0, "y1": y1, "open": bool(m.group(3)), "notes": notes}
            if re.search(r"\bL99\b", s) and y0 == 1999:
                d["notes"].append("late 1999 on")
            return d
    m = re.search(r"(?<![\d.])(\d{4}(?:\.5)?)\s*\+", s)
    if m:
        return {"y0": float(m.group(1)), "y1": None, "open": True, "notes": notes}
    m = re.search(r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)(?![\d.])", s)
    if m:
        y = float(m.group(1))
        return {"y0": y, "y1": y, "open": False, "notes": notes}
    if notes and "OBS" in notes:
        return {"y0": 1994, "y1": 1997, "open": False, "notes": notes}
    return None


def fam_list(make: str, disps: list[float], yrs: dict | None, text: str, tags: list[str]) -> list[dict]:
    """One dict per engine family: fam, y0, y1, open, notes."""
    out = []
    y0 = yrs["y0"] if yrs else None
    y1 = yrs["y1"] if yrs else None
    open_ = yrs["open"] if yrs else False
    notes = list(yrs["notes"]) if yrs else []
    make = make.lower().replace(" ", "")

    def add(fam, extra=None):
        out.append({"fam": fam, "y0": y0, "y1": y1, "open": open_, "notes": notes + ([extra] if extra else [])})

    if make == "powerstroke":
        if not disps:
            disps = [float(x) for x in ("7.3", "6.0", "6.4", "6.7") if x in tags]
        for d in disps:
            if d in (7.3, 6.0, 6.4, 6.7):
                add(f"Powerstroke {d}")
            else:
                add("Power Stroke", f"{d}L")
        if not disps:
            add("Power Stroke")
    elif make == "cummins":
        if not disps:
            disps = [float(x) for x in ("5.9", "6.7") if x in tags or f"{x} cummins" in tags]
        for d in disps or [None]:
            if d == 6.7:
                add("Cummins 6.7")
            elif d == 5.9 or d is None:
                if y0 is not None and y1 is not None and y1 <= 1998:
                    add("Cummins 5.9 12V")
                elif y0 is not None and y0 >= 1998.5:
                    add("Cummins 5.9 24V/CR")
                elif y0 is not None and y1 is not None:
                    add("Cummins 5.9 12V"); add("Cummins 5.9 24V/CR")
                else:
                    add("Cummins")
            else:
                add("Cummins", f"{d}L")
    elif make == "duramax":
        codes = [c.upper() for c in DMX_CODE.findall(text)]
        if codes and y0 is None:
            ys = [DMX_YEARS[c] for c in codes]
            y0 = min(a for a, b in ys)
            y1s = [b for a, b in ys]
            y1 = None if any(b is None for b in y1s) else max(y1s)
            open_ = y1 is None
        add("Duramax 6.6", "/".join(dict.fromkeys(codes)) if codes else None)
    elif make == "ecoboost":
        if not disps:
            disps = [float(x) for x in ("3.5", "2.7", "3.0") if x in tags or f"{x} ecoboost" in tags]
        add("Ford EcoBoost", f"{disps[0]}L EcoBoost" if disps else None)
    elif make == "universal":
        add("Universal")
    return out


def tag_years(tags: list[str]) -> dict | None:
    """Model years from the site's year tags ('2003', '2005-2007', 'obs', 'e99', 'l99-03') when the title gives none."""
    y0s, y1s, notes = [], [], []
    for t in tags:
        if t == "obs":
            y0s.append(1994); y1s.append(1997); notes.append("OBS")
        elif t == "e99":
            y0s.append(1999); y1s.append(1999)
        elif t == "l99-03":
            y0s.append(1999); y1s.append(2003)
        elif re.fullmatch(r"(?:19|20)\d\d(?:\.5)?(?:\s*-\s*(?:19|20)\d\d(?:\.5)?)?\+?", t):
            y = parse_years(t)
            if y and y["y0"]:
                y0s.append(y["y0"]); y1s.append(y["y1"] if y["y1"] else y["y0"])
    if not y0s:
        return None
    return {"y0": min(y0s), "y1": max(y1s), "open": False, "notes": notes if len(set(y0s)) == 1 else []}


def product_fitment(title: str, tags: list[str]) -> tuple[list[dict], str]:
    """Family list from the title tail '- 6.0 Powerstroke (2003-2007)'; returns (fits, source)."""
    if UNIVERSAL.search(title):
        return fam_list("universal", [], None, title, tags), "title"
    m = TAIL.search(title)
    if m:
        disps = [float(x) for x in re.findall(r"\d\.\d", m.group("disp") or "")]
        yrs = parse_years(m.group("yrs") or "") or tag_years(tags)
        if m.group("sub"):
            yrs = yrs or {"y0": None, "y1": None, "open": False, "notes": []}
            if re.search(r"OBS", m.group("sub"), re.I) and "OBS" not in yrs["notes"]:
                yrs["notes"].append("OBS")
                if yrs["y0"] is None:
                    yrs["y0"], yrs["y1"] = 1994, 1997
            if re.search(r"Cab", m.group("sub"), re.I) and "cab & chassis" not in yrs["notes"]:
                yrs["notes"].append("cab & chassis")
        fits = fam_list(m.group("make"), disps, yrs, title, tags)
        if fits:
            return fits, "title"
    # fallback: engine words anywhere in the title, then tags
    yrs = parse_years(title)
    for make in ("Powerstroke", "Cummins", "Duramax", "EcoBoost"):
        if re.search(make, title, re.I):
            disps = [float(x) for x in re.findall(r"(?<![\d.])(\d\.\d)L?\b", title)]
            disps = [d for d in disps if d in (7.3, 6.0, 6.4, 6.7, 5.9, 6.6, 3.5, 2.7, 3.0)]
            fits = fam_list(make, disps, yrs, title, tags)
            if fits:
                return fits, "title-words"
    if "duramax" in tags:
        return fam_list("duramax", [], yrs, title, tags), "tags"
    if "cummins" in tags:
        return fam_list("cummins", [], yrs, title, tags), "tags"
    if any(x in tags for x in ("7.3", "6.0", "6.4", "6.7")):
        return fam_list("powerstroke", [], yrs, title, tags), "tags"
    if "ecoboost" in tags:
        return fam_list("ecoboost", [], yrs, title, tags), "tags"
    return [], "none"


def variant_years(vt: str, opt_names: list[str]) -> dict | None:
    """Year refinement from the variant's option values ('2004+', '2003 (10 blade)', '2004.5-2006 - LLY', '11-14')."""
    parts = [x.strip() for x in vt.split(" / ")]
    for name, val in zip(opt_names, parts):
        if name.lower() in ("year", "style", "gen") or re.search(r"(?<!\d)(?:19|20)?\d\d(?:\.5)?\s*[-–+]", val) or re.fullmatch(r"(?:19|20)\d\d", val):
            if re.search(r"\d", val) and not re.search(r"\d+\s*mm|\d\s*Blade|%", val, re.I):
                y = parse_years(val)
                if y:
                    return y
            if re.search(r"\bE99\b|Early '?99|\bOBS\b", val, re.I):
                y = parse_years(val)
                if y:
                    return y
    return None


# --------------------------------------------------------------------------- emissions
CARB_EO = re.compile(r"\b(D-\d{3}(?:-\d{1,3})?)\b")
STOCK = re.compile(r"\bstock replacement\b|\bOEM (?:stock|replacement|turbo)\b|\bOE\b|\bgenuine\b|"
                   r"Direct-Fit Stock Replacement|stock horsepower replacement|direct OEM replacement|Stock Flow|Stock Injectors?\b", re.I)


def emissions_for(title: str, body: str, tags: list[str], performance: bool) -> str:
    m = CARB_EO.search(body)
    if m:
        return f"carb_eo:{m.group(1)}"
    if "carbs are bad for you" in tags:
        return "no_eo_race_only"
    if not performance and (STOCK.search(title) or STOCK.search(body[:400])):
        return "oem_replacement"
    return "unknown"


# --------------------------------------------------------------------------- spec parsing
MODEL = re.compile(r"\b(GTP38R?|GT3782VA|GT3788VA?|GT3794VA|GT4094VA|HE351VE|HE300VG|S3\d\d(?:\.\d)?(?:-?SXE|-?SX-E)?|"
                   r"S4\d\d(?:-?SXE|-?SX-E)?|HX35|HX40|HY35|S488|B2BV|K03|K04)\b", re.I)
WASTEGATED = re.compile(r"KC300x|KC38r|TP38r|GTP38|\bS3\d\d|\bS4\d\d|SX-?E|PhatShaft|Reaper|7\.3 Powerstroke|EcoBoost", re.I)
SERIES = re.compile(r"Jetfire|KC300x G3|KC300x|KC38r|TP38r|Whistler|Warlock|Cummander|Vortex|Fusion|Reaper \d{3}|Reaper|Stock Plus|"
                    r"Budget|Powermax|PowerMax|DualBoost|SX-?E|PhatShaft|PHATSHAFT|Tiger Turbo|Super Spool|Dual Ball Bearing", re.I)
STAGE = re.compile(r"\bStage\s*(\d(?:\.\d)?)\b|\bS([123])r\b", re.I)


def condition_of(title: str, body: str) -> str | None:
    """new / reman; 'is 100% new and is not rebuilt or remanufactured' must read as new."""
    if re.search(r"\bReman(?:ufactured)?\b", title, re.I):
        return "reman"
    if re.search(r"is 100% new|Brand new|100% Brand New|100% New\b", body, re.I):
        return "new"
    if re.search(r"(?<!or )(?<!not )\bReman(?:ufactured)?\b", body[:400], re.I):
        return "reman"
    if re.search(r"\bNew\b", title):
        return "new"
    return None


def parse_turbo(p, title, body, v, opt_names) -> tuple[dict, bool]:
    vt = v["title"] if v["title"] != "Default Title" else ""
    both = title + " | " + vt
    spec = {}
    # title "(66/73)", "(63.5/72.5)", "S362-SXE (62/68 Supercore)", "PHATSHAFT 62", "(12CM Housing)"
    m = re.search(r"\((\d\d(?:\.\d)?)\s*/\s*(\d\d(?:\.\d)?)(?:\s*Supercore)?\)", title)
    if m:
        spec["compressorInducer"], spec["turbineWheel"] = num(m.group(1)), num(m.group(2))
    m = re.search(r"PHATSHAFT\s*(\d\d)\b", title, re.I)
    if m:
        spec["compressorInducer"] = num(m.group(1))
    m = re.search(r"\((\d\d)\s*CM Housing\)", title, re.I)
    if m:
        spec["housingCm2"] = int(m.group(1))
    # body: compressor wheel
    for pat in (r"(\d\d(?:\.\d\d?)?)\s*mm\s+(?:7x7\s+)?(?:SXE style\s+)?(?:Gen \d\s+)?(?:7x7\s+)?compressor wheel",
                r"(?:Upgraded\s+)?Billet\s+(\d\d(?:\.\d)?)\s*mm\s+Compressor",
                r"(\d\d(?:\.\d)?)\s*(?:x\s*(\d\d(?:\.\d)?))?\s*mm?\s+(?:single plane\s+)?(?:point milled\s+)?(?:GTX style\s+)?billet(?: compressor)? wheel",
                r"(\d\d(?:\.\d)?)\s*mm\s+Billet Compressor wheel",
                r"(\d\d(?:\.\d\d?)?)(?:/(\d\d(?:\.\d)?))?\s*mm\s+Billet Compressor Wheel",
                r"(\d\d(?:\.\d)?)\s*mm\s+(?:Inducer|Compressor Wheel|forged milled compressor|fully-machined compressor)",
                r"compressor\s+(\d\d(?:\.\d)?)\s*mm wheel"):
        mb = re.search(pat, body, re.I)
        if mb and "compressorInducer" not in spec and 50 <= float(mb.group(1)) <= 110:
            spec["compressorInducer"] = num(mb.group(1))
            if mb.lastindex and mb.lastindex >= 2 and mb.group(2):
                spec["compressorExducer"] = num(mb.group(2))
            break
    mb = re.search(r"(\d\d)x(\d\d)\s*(?:mm)?\s+single plane", body, re.I)
    if mb and "compressorExducer" not in spec:
        spec.setdefault("compressorInducer", num(mb.group(1)))
        spec["compressorExducer"] = num(mb.group(2))
    mb = re.search(r"(\d\d(?:\.\d\d)?)\s*/\s*(\d\d)\s*mm Billet Compressor Wheel", body, re.I)  # BorgWarner '61.44/83mm'
    if mb:
        spec["compressorInducer"], spec["compressorExducer"] = num(mb.group(1)), num(mb.group(2))
    # body: turbine wheel
    for pat in (r"(\d\d(?:\.\d)?)\s*mm\s+(?:SXE style\s+)?(?:Gen \d\s+)?(?:s400\s+)?(?:\d\d? blade\s+)?(?:high flow\s+)?(?:quick spool\s+)?turbine wheel",
                r"(\d\d(?:\.\d)?)\s*x\s*(\d\d)\s*(?:mm)?\s+(?:\d ?\d? blade\s+)?(?:quick spool\s+)?turbine wheel",
                r"(\d\d(?:\.\d)?)\s*mm\s+Turbine Wheel", r"(\d\d(?:\.\d)?)\s*mm\s+\d\d? Blade"):
        mt = re.search(pat, body, re.I)
        if mt and "turbineWheel" not in spec and 50 <= float(mt.group(1)) <= 120:
            spec["turbineWheel"] = num(mt.group(1))
            if mt.lastindex and mt.lastindex >= 2 and mt.group(2):
                spec["turbineExducer"] = num(mt.group(2))
            break
    # A/R: variant option first ('.84ar', '1.0 A/R', '.91ar T4 Divided', '1.0ar T4 Divided'), then the body's turbine housing
    ma = re.search(r"(?<![\d.])([01]?\.\d{1,2})\s*-?\s*(?:A/R|AR)\b", vt, re.I)
    if ma:
        spec["ar"] = num(ma.group(1))
        if re.search(r"T4", vt):
            spec["turbineFlange"] = "T4"
        if re.search(r"Divided", vt, re.I):
            spec["divided"] = True
        if re.search(r"Gated", vt, re.I):
            spec["gated"] = True
    if re.search(r"No Turbine housing", vt, re.I) or (re.search(r"supercore", title, re.I) and not ma):
        spec["supercore"] = True
    if "ar" not in spec and "supercore" not in spec:
        mb = re.search(r"(?<![\d.])([01]?\.\d{1,2})\s*-?\s*(?:A/R|AR)\s+(?:Turbine Housing|Turbine|T4)", body, re.I)
        if mb:
            spec["ar"] = num(mb.group(1))
        else:
            vals = set(re.findall(r"(?<![\d.])([01]?\.\d{1,2})\s*-?\s*(?:A/R|AR)\s+(?:Housing|housing)", body))
            if len(vals) == 1:
                spec["ar"] = num(vals.pop())
    mb = re.search(r"(?<![\d.])([01]?\.\d{1,2})\s*-?\s*(?:A/R|AR)\s+(?:Ported |race |Ported race )?compressor cover", body, re.I)
    if mb:
        spec["compressorAr"] = num(mb.group(1))
    mb = re.search(r"(\d\d)\s*cm\s+(?:exhaust\s+)?housing", body, re.I)
    if mb:
        spec.setdefault("housingCm2", int(mb.group(1)))
    # turbine blade count: variant option, then body
    mbl = re.search(r"(\d{1,2})\s*Blade", vt, re.I) or re.search(r"(\d{1,2})\s*blade\s+(?:quick spool\s+)?turbine|turbine wheel\s+\((\d{1,2}) blade|"
                                                                  r"(\d{1,2}) ?Blade (?:High Flow )?Turbine Wheel|Garrett (\d{1,2}) Blade Turbine", body, re.I)
    if mbl:
        spec["turbineBlades"] = int(next(g for g in mbl.groups() if g))
    elif re.search(r"(\d{2})\s*mm 1 0 blade", body):
        spec["turbineBlades"] = 10  # the site writes '1 0 blade' on two listings
    if re.search(r"\bwhistl", vt, re.I):
        spec["whistler"] = not re.search(r"non[- ]?whistl|no whistle", vt, re.I)
    # VGT: wastegated frames first (the site's 'complete vgt turbo' tag is also on some 7.3 listings), then tags / words
    tags = [x.lower() for x in p.get("tags", [])]
    if WASTEGATED.search(title) or "non vgt turbo" in tags or "non vgt" in tags:
        spec["vgt"] = False
    elif "vgt" in tags or "complete vgt turbo" in tags or re.search(r"\bVGT\b|\bVNT\b|AVNT|DualBoost|GT3782VA|GT3788V|GT3794VA|GT4094VA|"
                                                                    r"HE351VE|Variable|vane", both + " " + body[:1500], re.I):
        spec["vgt"] = True
    elif re.search(r"wastegate|HX35|HY35", both + " " + body[:1500], re.I):
        spec["vgt"] = False
    # bearing, stage, series, model
    if re.search(r"Ball Bearing|\bDBB\b|S[23]r\b", both + " " + body[:600], re.I):
        spec["bearing"] = "ball"
    elif re.search(r"journal bearing", body, re.I):
        spec["bearing"] = "journal"
    ms = STAGE.search(title) or STAGE.search(vt)
    if ms:
        spec["stage"] = num(ms.group(1) or ms.group(2))
    mser = SERIES.search(title)
    series = mser.group(0) if mser else None
    msz = re.search(r"KC Super Spool|KC Jetfire", vt)
    if msz:
        series = msz.group(0).replace("KC ", "")
    if series:
        series = {"PHATSHAFT": "PhatShaft", "Powermax": "PowerMax", "SXE": "SX-E", "Dual Ball Bearing": "Dual Ball Bearing"}.get(series, series)
        spec["series"] = series
    mm_ = MODEL.search(title) or MODEL.search(body[:500])
    if mm_:
        spec["model"] = mm_.group(1).upper().replace("SXE", "SX-E").replace("-SX-E", " SX-E")
    if re.search(r"Garrett F250/350 Turbo", vt):
        spec["variantNote"] = "Garrett 2017-style turbo supplied"
    mccv = re.search(r"(3\.5\"|4\") (Metal|Plastic)", vt)
    if mccv:
        spec["variantNote"] = f'{mccv.group(1)} {mccv.group(2).lower()} CCV boot'
    if re.search(r"Pusher", vt):
        spec["lowerIntake"] = "Pusher"
    elif re.search(r"Ford Intake Manifold|Add FOCOMO", vt):
        spec["lowerIntake"] = "Ford"
    if re.search(r"Cab (?:N|&) Chassis", vt, re.I):
        spec["variantNote"] = "cab & chassis"
    # kit / compound / twin / supercore
    if re.search(r"Conversion Kit|Retrofit Kit|Turbo Kit|\(W/ TURBO\)|Package", title, re.I):
        spec["kit"] = True
    if re.search(r"Compound", title, re.I):
        spec["compound"] = True
        ml = re.search(r"^Stage (\d)\s*/\s*Stage (\d)", vt)
        if ml:
            spec["lowPressureStage"], spec["highPressureStage"] = int(ml.group(1)), int(ml.group(2))
        spec.pop("stage", None)
        for k in ("compressorInducer", "compressorExducer", "turbineWheel", "turbineExducer"):
            spec.pop(k, None)  # the set's body lists each stage's wheels; see the single low/high-pressure records
    elif re.search(r"Low Pressure", title, re.I):
        spec["position"] = "low-pressure"
    elif re.search(r"High Pressure", title, re.I):
        spec["position"] = "high-pressure"
    if re.search(r"Twin Turbos", title, re.I):
        spec["twin"] = True
    if re.search(r"Intercooler Package", title, re.I):
        spec["includes"] = "intercooler"
    if "discontinued" in tags or re.search(r"\*Discontinued\*", body[:300], re.I):
        spec["discontinued"] = True
    mside = re.search(r"\((Left|Right)\s*side\)", title, re.I)
    if mside:
        spec["side"] = mside.group(1)[0].upper()
    # finish from the cover / powder-coat option
    mf = re.search(r"\b(Polished|Chrome|Fire Truck Red|Bright Green|Royal Blue|Jet Black|Metallic Gold|Haunter Purple)\b", vt)
    if mf:
        spec["finish"] = mf.group(1)
    # supported injectors, HP (the 'Features & Details' block first; the prose can quote other turbos' figures)
    feats = re.split(r"Description\s*:?", body, maxsplit=1)[0]
    mi = re.search(r"(?:Maximum injectors|Supports)\s*:?\s*(?:U ?p to\s*)?(\d{3})\s*cc\s*/\s*(Stock|\d{1,3})\s*%", body, re.I)
    if mi:
        spec["maxInjectorCc"] = int(mi.group(1))
        spec["maxInjectorPct"] = 0 if mi.group(2).lower() == "stock" else int(mi.group(2))
    mh = re.search(r"(\d{3,4})\s*(?:to|-)\s*(\d{3,4})\s*\+?\s*(?:HP|hp)\b", feats) or \
        re.search(r"capable of\s*(\d{3,4})\s*[-–]\s*(\d{3,4})\s*hp", body, re.I)
    if mh:
        spec["hpLow"], spec["hpHigh"] = int(mh.group(1)), int(mh.group(2))
    mc = re.search(r"(?:Capable of|Supports? Up To|support up to|supporting up to(?: an additional)?)\s*(\d{3,4})\s*\+?\s*(?:RWHP|whp|HP|hp)\b", body, re.I)
    if mc:
        spec["hpCapable"] = int(mc.group(1))
        if re.search(r"additional\s*\d{3,4}", mc.group(0), re.I):
            spec["hpGain"] = spec.pop("hpCapable")
    mboost = re.search(r"Max(?:imum)? Recommended Boost:?\s*(\d{2,3})\s*PSI", body, re.I)
    if mboost:
        spec["maxBoostPsi"] = int(mboost.group(1))
    # manufacturer part numbers / cross references
    mpn = re.search(r"\b(\d{6}-\d{4}[SW]?)\b", title + " " + (v.get("sku") or "") + " " + body)
    if mpn and brand_for(p, title) == "Garrett":
        spec["mfrPn"] = mpn.group(1)
    mh2 = re.search(r"Holset \((\d{7}H)\)", body)
    if mh2:
        spec["mfrPn"] = mh2.group(1)
    mx = re.search(r"Cross Reference #:\s*([A-Z0-9]{3,5}-[A-Z0-9]{4,6}-[A-Z]{1,2})", body)
    if mx:
        spec["replacesOem"] = [mx.group(1)]
    spec["condition"] = condition_of(title, body)
    performance = bool(re.search(r"Stage|Jetfire|KC300x|KC38r|TP38r|Whistler|Warlock|Cummander|Vortex|Fusion|Reaper|Powermax|"
                                 r"Upgrade|Billet|PhatShaft|SXE|Supercore|Conversion|Stock Plus", title, re.I))
    return spec, performance


def parse_injector(p, title, body, v, opt_names) -> tuple[dict, bool]:
    vt = v["title"] if v["title"] != "Default Title" else ""
    spec = {}
    # nozzle cc: title '(180CC/80% - 180CC/100%)', 'WDi 190cc', variant '180cc/30'
    mc = re.search(r"(\d{3})\s*cc", vt, re.I) or re.search(r"(\d{3})\s*CC", title, re.I)
    if mc:
        spec["nozzleCc"] = int(mc.group(1))
    mp = re.search(r"(\d{1,3})\s*%", vt) or re.search(r"/\s*(\d{1,3})\b", vt)
    sku = norm_sku(v.get("sku") or "")
    msac = re.search(r"\bSAC(\d{2})\b", vt)
    if mp:
        spec["pctOver"] = int(mp.group(1))
    elif msac:
        spec["pctOver"] = int(msac.group(1))  # S&S 'SAC00' / 'SAC45' sizes (as the SS extract reads them)
    elif re.search(r"TorqueMaster", vt, re.I):
        spec["grade"] = "TorqueMaster"  # S&S size with no published % over (same treatment as the SS extract)
    elif re.search(r"\bStock\b", vt, re.I) or re.search(r"\bStock (?:Flow )?Injectors?\b|\(Stock\)|/\s*Stock\b|\bstock injector", title, re.I):
        spec["pctOver"] = 0
    elif "nozzleCc" in spec:
        mp2 = re.search(rf"{spec['nozzleCc']}\s*CC\s*/\s*(\d{{1,3}})\s*%", title, re.I)
        msk = re.search(r"ST3?\d{3}-(\d{2,3})\b", sku)  # Full Force 'ffdLEGST3275-200' = 275 cc / 200 %
        if mp2:
            spec["pctOver"] = int(mp2.group(1))
        elif re.search(rf"{spec['nozzleCc']}\s*CC\s*/\s*Stock", title, re.I):
            spec["pctOver"] = 0
        elif msk:
            spec["pctOver"] = int(msk.group(1))
    if sku.upper().endswith("-SET") or re.search(r"\bSET\b", sku.upper()):
        spec["set"] = True
    ms = STAGE.search(title)
    if ms:
        spec["stage"] = num(ms.group(1))
    if re.search(r"Hybrid", title + " " + vt, re.I):
        spec["hybrid"] = True
    mt = re.search(r"(\d)\s*mm Hybrid", title, re.I)
    if mt:
        spec["plungerMm"] = int(mt.group(1))
    mser = re.search(r"Legacy|Evolution", vt)
    if mser:
        spec["series"] = mser.group(0)
    if re.search(r"Set of 8|Set\)|\bSet\b", title + " " + body[:200]):
        spec["set"] = True
    if re.search(r"Single[- ]Shot", body, re.I):
        spec["tip"] = "single-shot"
    mtip = re.search(r"\d(SAC|VCO)\b", sku)
    if mtip:
        spec["tip"] = mtip.group(1)  # S&S nozzle style code in the SKU
    mh = re.search(r"capable of\s*(\d{3,4})\s*(?:RWHP|whp|HP)|Up to (\d{3,4})\s*(?:RWHP|HP)", body + " " + vt, re.I)
    if mh:
        spec["hpCapable"] = int(mh.group(1) or mh.group(2))
    mf = re.search(r"(\d{1,3})\s*% Flow rate increase over stock", body, re.I)
    if mf:
        spec["flowGainPct"] = int(mf.group(1))
    if re.search(r"Send[- ]in[- ]Cores? First|Send In (?:Cores? )?After|core charge|cores", vt + " " + body, re.I):
        spec["coreRequired"] = True
    spec["condition"] = ("reman" if re.search(r"Reman|Remanufactured|refurbished nozzles", title + " " + body[:400], re.I) or "-R-" in sku else
                         "new" if re.search(r"\bNew\b", title) else None)
    performance = bool(spec.get("pctOver")) or bool(re.search(r"Stage|Hybrid|Performance", title, re.I))
    return spec, performance


def parse_pump(p, title, body, v, opt_names) -> tuple[dict, bool]:
    vt = v["title"] if v["title"] != "Default Title" else ""
    both = title + " " + vt
    spec = {}
    mt = re.search(r"\bCP3\b|\bCP4\.2\b|\bCP4\b|\bCPX\b|VP44|\bHPFP\b|High Pressure Fuel Pump|High Pressure Oil Pump|\bHPOP\b", both, re.I)
    if mt:
        typ = mt.group(0).upper()
        spec["type"] = {"HIGH PRESSURE FUEL PUMP": "HPFP", "HIGH PRESSURE OIL PUMP": "HPOP"}.get(typ, typ)
    mconv = re.search(r"\b(?:CP3|CP4(?:\.2)?)\s+to\s+(CP3|CP4|DCR)\b", title, re.I)
    if mconv:
        spec["type"] = mconv.group(1).upper()  # conversion kit: the pump supplied is the target type
        spec["conversion"] = True
    mm = re.search(r"(\d{2}(?:\.\d)?)\s*mm Stroker", both, re.I)
    if mm:
        spec["strokerMm"] = num(mm.group(1))
    mp = re.search(r"\+?(\d{1,3})\s*%", vt)
    if mp:
        spec["pctOver"] = int(mp.group(1))
    mh = re.search(r"Up to (\d{3,4})\s*(?:RWHP|HP)", vt, re.I) or re.search(r"support(?:s)? (?:up to |more than )?(\d{3,4})\s*\+?\s*(?:hp|whp|RWHP)", body, re.I)
    if mh:
        spec["hpCapable"] = int(mh.group(1))
    mr = re.search(r"(\d{3})\s*HP \((?:Standard|High) Output\)", body)
    if mr:
        spec["hpRating"] = int(mr.group(1))
    ms = STAGE.search(title) or STAGE.search(vt)
    if ms:
        spec["stage"] = num(ms.group(1))
    mo = re.search(r"\b(EVO|60)\b", vt)
    if mo and "XDI" in (v.get("sku") or ""):
        spec["variantNote"] = f"XDI {mo.group(1)}"
    mg = re.search(r"Gen (\d)", vt)
    if mg:
        spec["variantNote"] = (spec.get("variantNote", "") + f" Gen {mg.group(1)}").strip()
    mf = re.search(r"(\d{1,3})\s*% Flow rate increase", body, re.I)
    if mf:
        spec["flowGainPct"] = int(mf.group(1))
    mgpm = re.search(r"minimum (\d(?:\.\d)?)\s*gpm", body, re.I)
    if mgpm:
        spec["minGpm"] = num(mgpm.group(1))
    if re.search(r"Dual", title, re.I):
        spec["dual"] = True
    if re.search(r"\bkit\b", title, re.I):
        spec["kit"] = True
    mo2 = re.search(r"Replaces OEM part\s+([0-9a-z-]{8,})", body, re.I)
    if mo2:
        spec["replacesOem"] = [x for x in mo2.group(1).split("-") if len(x) > 6] or [mo2.group(1)]
    spec["condition"] = ("reman" if re.search(r"Reman|Remanufactured", title + " " + body[:300], re.I) else
                         "new" if re.search(r"\bNew\b", title + " " + body[:300]) else None)
    performance = bool(spec.get("pctOver") or spec.get("strokerMm") or re.search(r"Stroker|Stage|Goliath|Xtreme|CPX", title, re.I))
    return spec, performance


def parse_manifold(p, title, body, v, opt_names) -> tuple[dict, bool]:
    vt = v["title"] if v["title"] != "Default Title" else ""
    spec = {}
    spec["type"] = "intake" if re.search(r"intake", title, re.I) else "exhaust"
    ms = re.search(r"(Driver|Passenger)(?: Side)?", title, re.I)
    if ms and not re.search(r"Driver & Passenger", title, re.I):
        spec["side"] = ms.group(1).lower()
    if re.search(r"Driver & Passenger|\bSet\b|Manifolds\b", title) and spec["type"] == "exhaust" and "side" not in spec:
        spec["pair"] = True
    if re.search(r"Exhaust Manifold Kit\b", title) and "side" not in spec and not re.search(r"Up Pipe", title, re.I):
        spec["pair"] = True
    if re.search(r"\bcast\b|casting", body, re.I):
        spec["material"] = "cast"
    elif re.search(r"billet", title + " " + body[:300], re.I):
        spec["material"] = "billet"
    mp = re.search(r"(\w+)-Piece", body, re.I)
    if mp and mp.group(1).lower() in ("two", "2", "three", "3"):
        spec["pieces"] = {"two": 2, "2": 2, "three": 3, "3": 3}[mp.group(1).lower()]
    mf = re.search(r"^(Raw|Black|Silver Ceramic Coating|Black Ceramic Coating|Pusher Green|Pusher Bronze|Gloss Black|Titanium|Gloss Red|"
                   r"Gloss White|Gloss Blue)", vt)
    if mf:
        spec["finish"] = mf.group(1)
    if re.search(r"2015/2016", vt):
        spec["variantNote"] = "2015-2016 model year version"
    if re.search(r"Up Pipe|Turbo Inlet Package", title, re.I):
        spec["kit"] = True
    performance = bool(re.search(r"Upgrade|High Flow|High-Flow|Performance|S2R|S3r|Powerflow|Atlas", title, re.I))
    return spec, performance


# --------------------------------------------------------------------------- record building
def make_name(cat: str, spec: dict, fit: dict) -> str:
    parts = []
    y0, y1 = fit.get("y0"), fit.get("y1")
    yrs = f"{y0}-{y1}" if y0 and y1 and y0 != y1 else (f"{y0}+" if y0 and not y1 else (str(y0) if y0 else None))
    if cat == "turbo":
        head = []
        series, model = spec.get("series"), spec.get("model")
        if series and model and series.lower().replace("-", "") in model.lower().replace("-", ""):
            head.append(model)
        else:
            if series:
                head.append(series)
            if model:
                head.append(model)
        if spec.get("stage") is not None:
            head.append(f"Stage {spec['stage']}")
        if spec.get("compound"):
            head.append("compound turbo set")
        elif spec.get("twin"):
            head.append("twin turbos")
        elif spec.get("supercore"):
            head.append("supercore")
        elif spec.get("kit"):
            head.append("turbo kit")
        else:
            head.append(f"{'VGT ' if spec.get('vgt') else ''}turbo")
        parts.append(" ".join(head))
        if spec.get("position"):
            parts.append(spec["position"])
        if spec.get("compressorInducer"):
            parts.append(f"{spec['compressorInducer']} mm compressor")
        if spec.get("turbineWheel"):
            parts.append(f"{spec['turbineWheel']} mm turbine")
        if spec.get("turbineBlades"):
            parts.append(f"{spec['turbineBlades']}-blade turbine")
        if spec.get("ar"):
            parts.append(f"{spec['ar']:.2f} A/R")
        if spec.get("whistler") is not None:
            parts.append("whistler" if spec["whistler"] else "non-whistler")
        if spec.get("finish"):
            parts.append(spec["finish"].lower())
        if spec.get("side"):
            parts.append("left" if spec["side"] == "L" else "right")
        if spec.get("condition"):
            parts.append(spec["condition"])
    elif cat == "injector":
        kind = "stock " if spec.get("pctOver") == 0 else ""
        parts.append(f"{kind}{'hybrid ' if spec.get('hybrid') else ''}injector{' set' if spec.get('set') else ''}")
        if spec.get("stage") is not None:
            parts.append(f"Stage {spec['stage']}")
        if spec.get("nozzleCc"):
            parts.append(f"{spec['nozzleCc']} cc")
        if spec.get("pctOver"):
            parts.append(f"{spec['pctOver']}% over")
        if spec.get("grade"):
            parts.append(spec["grade"])
        if spec.get("series"):
            parts.append(spec["series"].lower())
        if spec.get("condition"):
            parts.append(spec["condition"])
    elif cat == "injectionPump":
        parts.append(f"{spec.get('condition') or ''} {'dual ' if spec.get('dual') else ''}{spec.get('type', 'injection')} {'pump kit' if spec.get('kit') else 'pump'}".strip())
        if spec.get("stage") is not None:
            parts.append(f"Stage {spec['stage']}")
        if spec.get("strokerMm"):
            parts.append(f"{spec['strokerMm']} mm stroker")
        if spec.get("pctOver"):
            parts.append(f"{spec['pctOver']}% over")
        if spec.get("hpCapable"):
            parts.append(f"{spec['hpCapable']} HP")
        if spec.get("variantNote"):
            parts.append(spec["variantNote"])
    else:
        parts.append(f"{spec.get('type')} manifold{' pair' if spec.get('pair') else ''}{' kit' if spec.get('kit') else ''}")
        if spec.get("material"):
            parts.append(spec["material"])
        if spec.get("side"):
            parts.append(f"{spec['side']} side")
        if spec.get("finish"):
            parts.append(spec["finish"].lower())
    if yrs:
        parts.append(yrs)
    fam_txt = fit["fam"] + (f" {fit['notes']}" if fit.get("notes") and fit["fam"] == "Duramax 6.6" and DMX_CODE.search(fit["notes"]) else "")
    parts.append(fam_txt)
    return ", ".join(x for x in parts if x)


def finish_fit(fam: str, y0, y1, open_, notes: list[str]) -> dict:
    notes = [n for n in notes if n]
    if y0 is not None and y0 != int(y0):
        notes.insert(0, f"from {y0}")
    if y1 is not None and y1 != int(y1):
        notes.insert(0, f"to {y1}")
    y1v = None if open_ else y1
    return {"fam": fam, "ci": FAM.get(fam, {}).get("ci"), "cyl": FAM.get(fam, {}).get("cyl", UNKNOWN_FAM_CYL.get(fam)),
            "y0": int(y0) if y0 is not None else None, "y1": int(y1v) if y1v is not None else None,
            "notes": ", ".join(dict.fromkeys(notes)) or None}


def extract(products: list[dict], stats: Stats) -> list[dict]:
    recs = []
    for p in products:
        title = re.sub(r"\s+", " ", p["title"]).strip()
        body = strip_html(p.get("body_html", ""))
        cat, reason = classify(p, title, body)
        label = f"{norm_sku(p['variants'][0].get('sku') or '-')} {title}"
        if reason:
            stats.skip(reason, label)
            continue
        tags = [x.lower() for x in p.get("tags", [])]
        brand = brand_for(p, title)
        url = f"https://{HOST}/products/{p['handle']}"
        fits, fit_src = product_fitment(title, tags)
        if not fits:
            stats.skip("no fitment in title or tags", label)
            continue
        if fit_src == "tags":
            stats.qa.append(f"{brand} {label}: fitment from tags only (no engine in the title) -> {[f['fam'] for f in fits]}")
        opt_names = [o["name"] for o in p.get("options", [])]
        # group variants by normalized SKU (the site lists one SKU under several year or cover options)
        groups: dict[str, list[dict]] = collections.OrderedDict()
        for v in p["variants"]:
            sku = norm_sku(v.get("sku") or "")
            if not sku:
                stats.skip("variant without SKU", f"{title}: {v['title']}")
                continue
            groups.setdefault(sku, []).append(v)
        for sku, vs in groups.items():
            v = vs[0]
            vt = re.sub(r"\s+", " ", v["title"]).strip()
            if cat == "turbo":
                spec, perf = parse_turbo(p, title, body, v, opt_names)
            elif cat == "injector":
                spec, perf = parse_injector(p, title, body, v, opt_names)
            elif cat == "injectionPump":
                spec, perf = parse_pump(p, title, body, v, opt_names)
            else:
                spec, perf = parse_manifold(p, title, body, v, opt_names)
            if len(vs) > 1:
                others = [re.sub(r"\s+", " ", x["title"]).strip() for x in vs[1:]]
                stats.shared_sku.append(f"{brand} {sku}: {title}: '{vt}' also listed as {others[:6]}{' ...' if len(others) > 6 else ''}")
            # per-variant year refinement (min over the variants sharing this SKU)
            vy = [variant_years(re.sub(r"\s+", " ", x["title"]).strip(), opt_names) for x in vs]
            vy = [y for y in vy if y]
            vyears = None
            if vy:
                vyears = {"y0": min(y["y0"] for y in vy if y["y0"] is not None) if any(y["y0"] is not None for y in vy) else None,
                          "y1": None if any(y["open"] or y["y1"] is None for y in vy) else max(y["y1"] for y in vy),
                          "open": any(y["open"] for y in vy), "notes": [n for y in vy for n in y["notes"]]}
            emis = emissions_for(title, body, tags, perf)
            handle = p["handle"]
            if cat == "turbo" and "compressorInducer" not in spec:
                if perf:
                    stats.flag(handle, "nowheel", f"{brand}: performance turbo without compressor wheel size in title/variant/body: {title}", sku)
                else:
                    stats.no_wheel_stock += 1
            if cat == "injector" and "pctOver" not in spec and "grade" not in spec:
                stats.flag(handle, "nopct", f"{brand}: injector without a % over figure: {title}", f"{sku} ({vt})" if vt else sku)
            if cat == "turbo" and re.search(r"Coming Soon", vt, re.I):
                stats.flag(handle, "soon", f"{brand}: variant marked 'Coming Soon' on the site: {title}", f"{sku} ({vt})")
            if spec.get("discontinued"):
                stats.flag(handle, "disc", f"{brand}: listing marked discontinued on the site: {title}", sku)
            if cat == "turbo" and spec.get("compressorExducer") and spec.get("compressorInducer") and \
                    spec["compressorExducer"] < spec["compressorInducer"] * 1.2:
                stats.flag(handle, "exducer", f"{brand}: compressor exducer {spec['compressorExducer']} mm is implausibly close to the "
                                              f"inducer {spec['compressorInducer']} mm (site figure kept as printed): {title}", sku)
            if re.search(r"xx|[A-Za-z]{4,} \d", sku):
                stats.flag(handle, "sku", f"{brand}: SKU looks like a placeholder: {title}", sku)
            # resold parts: a manufacturer number in the SKU ('901654-5001W / 302623', '300885 / 424018-SA') becomes `p`,
            # the KC 30xxxx number is kept in spec.sellerSku
            if " / " in sku:
                parts = sku.split(" / ")
                kc = [x for x in parts if re.fullmatch(r"30\d{4}", x)]
                other = [x for x in parts if x not in kc]
                if kc and other and brand != "KC Turbos":
                    spec["sellerSku"] = kc[0]
                    sku = other[0]
            codes = [c.upper() for c in DMX_CODE.findall(vt)]
            for f in fits:
                fam = f["fam"]
                if fam not in FAM:
                    stats.unknown_fams[fam] += 1
                y0, y1, open_, notes = f["y0"], f["y1"], f["open"], list(f["notes"])
                if vyears and vyears["y0"] is not None:
                    y0 = vyears["y0"]
                    if vyears["open"] or vyears["y1"] is None:
                        y1 = f["y1"]  # '2004+' within a 2003-2007 product: open end bounded by the product range
                        open_ = f["open"]
                    else:
                        y1 = vyears["y1"]
                        open_ = False
                    notes = [n for n in notes if n not in ("early 1999", "late 1999 on", "to early 1999", "OBS")] + vyears["notes"]
                elif vyears and vyears["notes"]:
                    notes += vyears["notes"]
                if fam == "Duramax 6.6" and codes:
                    notes = [n for n in notes if not DMX_CODE.fullmatch(n or "") and "/" not in (n or "")] + ["/".join(dict.fromkeys(codes))]
                    if not vyears:
                        ys = [DMX_YEARS[c] for c in codes]
                        y0 = min(a for a, b in ys)
                        y1 = None if any(b is None for b, in [(b,) for a, b in ys]) else max(b for a, b in ys)
                        open_ = y1 is None
                fit = finish_fit(fam, y0, y1, open_, notes)
                if cat == "turbo" and "vgt" not in spec:
                    # family default when the listing says nothing: variable-geometry on 6.0/6.4/6.7 Power Stroke, 6.7 Cummins
                    # and 2004.5+ Duramax; wastegated on 7.3 Power Stroke, 5.9 Cummins, LB7 Duramax, EcoBoost, universal frames
                    if fam in ("Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7", "Cummins 6.7") or \
                            (fam == "Duramax 6.6" and (fit.get("y0") or 0) >= 2004 and "LB7" not in (fit.get("notes") or "")):
                        spec["vgt"] = True
                    elif fam in ("Powerstroke 7.3", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Ford EcoBoost", "Universal"):
                        spec["vgt"] = False
                rec = {
                    "m": brand, "p": sku, "cat": cat,
                    "name": make_name(cat, spec, fit),
                    "fit": fit, "spec": dict(spec),
                    "src": {"doc": SRC_DOC, "edition": EDITION, "url": url},
                    "emissions": emis,
                }
                recs.append(rec)
    return recs


# --------------------------------------------------------------------------- validate / write
def dedupe(recs: list[dict], stats: Stats) -> list[dict]:
    seen: dict[tuple, dict] = {}
    order = []
    for r in recs:
        k = (r["m"], r["p"], r["fit"]["fam"])
        if k not in seen:
            seen[k] = r
            order.append(k)
            continue
        kept = seen[k]
        if kept["fit"].get("y0") and r["fit"].get("y0"):
            kept["fit"]["y0"] = min(kept["fit"]["y0"], r["fit"]["y0"])
            if kept["fit"].get("y1") and r["fit"].get("y1"):
                kept["fit"]["y1"] = max(kept["fit"]["y1"], r["fit"]["y1"])
        stats.merged_dupes.append(f"{r['m']} {r['p']} [{r['fit']['fam']}]: kept '{kept['name']}' / dropped '{r['name']}' (src {r['src']['url'].rsplit('/', 1)[1]})")
    return [seen[k] for k in order]


NUMERIC_KEYS = {"pctOver", "hpRating", "nozzleCc", "hpCapable", "hpGain", "strokerMm", "compressorInducer", "compressorExducer",
                "turbineWheel", "turbineExducer", "ar", "compressorAr", "housingCm2", "hpLow", "hpHigh", "pieces", "turbineBlades",
                "stage", "maxInjectorCc", "maxInjectorPct", "maxBoostPsi", "plungerMm", "flowGainPct", "minGpm",
                "lowPressureStage", "highPressureStage"}


def validate(recs: list[dict]) -> list[str]:
    errs = []
    seen = set()
    for r in recs:
        for k in ("m", "p", "cat", "fit", "src"):
            if k not in r:
                errs.append(f"missing {k}: {r}")
        if "fam" not in r.get("fit", {}):
            errs.append(f"missing fit.fam: {r['m']} {r['p']}")
        if "emissions" not in r:
            errs.append(f"missing emissions: {r['m']} {r['p']}")
        k = (r["m"], r["p"], r["fit"].get("fam"))
        if k in seen:
            errs.append(f"duplicate p within brand/family: {k}")
        seen.add(k)
        for kk, vv in r.get("spec", {}).items():
            if kk in NUMERIC_KEYS and not isinstance(vv, (int, float)):
                errs.append(f"{kk} not numeric: {r['m']} {r['p']} = {vv!r}")
        for kk in ("y0", "y1"):
            if r["fit"].get(kk) is not None and not isinstance(r["fit"][kk], int):
                errs.append(f"fit.{kk} not int: {r['m']} {r['p']}")

        def walk(o, path):
            if isinstance(o, dict):
                for kk, vv in o.items():
                    walk(vv, f"{path}.{kk}")
            elif isinstance(o, list):
                for i, vv in enumerate(o):
                    walk(vv, f"{path}[{i}]")
            elif isinstance(o, str) and o == "":
                errs.append(f"empty string at {path}: {r['m']} {r['p']}")
        walk(r, "")
    return errs


def write_notes(path: pathlib.Path, recs: list[dict], stats: Stats, counts: dict, errs: list[str]):
    L = []
    L.append("# KC extraction notes (KC Turbos)\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_kc.py`. Source: public Shopify "
             f"`https://kcturbos.com/products.json?limit=250&page=N`.\n")
    L.append("## Fetch\n")
    L.append(f"- robots.txt: {stats.robots_note}.")
    L.append(f"- `{HOST}`: {stats.pages} page request(s) of 250 products, {stats.products} products in the listing; "
             f"one request at a time. Pages cached under `dl/kc/`.")
    L.append("- Prices (USD) are not stored.\n")
    L.append("## Records\n")
    L.append(f"Total records: **{len(recs)}** (one record per variant SKU per engine family)\n")
    L.append("| m (brand on the listing) | cat | records |\n|---|---|---|")
    for (m, cat), n in sorted(counts["brand_cat"].items()):
        L.append(f"| {m} | {cat} | {n} |")
    L.append("")
    L.append("| cat | records |\n|---|---|")
    for cat, n in sorted(counts["cat"].items()):
        L.append(f"| {cat} | {n} |")
    L.append("")
    L.append("Rows per engine family (a part that fits several families is one record per family with the same `p`):\n")
    L.append("| fit.fam | cat | records |\n|---|---|---|")
    for (fam, cat), n in sorted(counts["fam_cat"].items()):
        flag = " *(not in cam-fitment.json)*" if fam not in FAM else ""
        L.append(f"| {fam}{flag} | {cat} | {n} |")
    L.append("")
    L.append("| emissions | records |\n|---|---|")
    for e, n in sorted(counts["emissions"].items(), key=lambda x: -x[1]):
        L.append(f"| `{e}` | {n} |")
    L.append("")
    L.append("## How fields were derived\n")
    L.append("- **Scope**: the listing mixes KC Turbos' own turbos and manifolds with resold parts (XDP, Garrett, BorgWarner, "
             "Ford/Motorcraft, Holset, Full Force, WDI, ODawgs, H&S, Pusher, PPE, Dorman, River City Diesel, Exergy, "
             "Xtreme-DI, Nostrum, CNC Fabrication...). Only `turbo`, `manifold`, `injector` and `injectionPump` are emitted; "
             "`m` is the brand named on the listing (the vendor field, or the leading brand in the title when the vendor is a "
             "distributor such as XDP / Turn14 / Diesel Forward), and `src.doc` says it came from kcturbos.com.")
    L.append("- **Skipped by rule**: apparel/decals/lighting/additives/accessories; core-charge and core-return listings; "
             "garage-sale one-offs (used / open-box / discontinued units that duplicate a regular SKU with a `-GARnnnn` suffix); "
             "listings tagged `hidden` or titled `X-(Back End)...` (package components and back-end SKUs not shown on the "
             "storefront); DIY turbo kits, balanced assemblies and rebuild kits (turbo parts, not complete turbos); turbo "
             "hardware (install kits, housings, wheels, boots, clamps, gaskets); manifold sensors/gaskets/spacers and intake "
             "plenums; injector cups/sleeves; lift pumps (AirDog/FASS) and fuel-system kits; EGR parts; everything else "
             "outside the four categories is counted below by product type.")
    L.append("- **Fitment** comes from the title tail (`- 6.0 Powerstroke (2003-2007)`, `- 7.3 Powerstroke OBS (1994-1998)`, "
             "`(E99)`, `(L99-03)`, `- 6.6 Duramax (2004.5-2010)`, `- 6.7 Cummins (2007.5-2012)`, `- 3.5 EcoBoost (2013-2016)`), "
             "refined per variant by the Year/Style option (`2003 (10 blade)`, `2004+`, `2004.5-2006 - LLY`, `11-14`, "
             "`2017-19 - Cab N Chassis`); a `2004+` variant inside a 2003-2007 product gets 2004-2007. 7.3 Powerstroke "
             "sub-ranges go to `fit.notes` (`OBS` 1994-1997/98, `early 1999`, `late 1999 on`). Half-year breaks are floored "
             "(`2004.5` -> `y0: 2004`, `from 2004.5` in notes). Duramax engine codes (LLY/LBZ/LMM/LML) go to `fit.notes` "
             "and set the years when the title gives none. Cummins with no displacement map to 5.9 12V / 24V/CR by year "
             "(ends <= 1998 -> 12V; starts >= 1998.5 -> 24V/CR; spans 1998 -> one record per family). BorgWarner S300 SX-E "
             "supercores titled `Powerstroke, Cummins, Duramax` are filed under `Universal`; EcoBoost under `Ford EcoBoost` "
             "with the displacement in notes (both flagged below as not in cam-fitment.json).")
    L.append("- **Turbos**: `compressorInducer`/`turbineWheel` (mm) from the title `(66/73)` / `S362-SXE (62/68 Supercore)` / "
             "`PHATSHAFT 62`, else the body ('66mm 7x7 SXE style compressor wheel', 'Upgraded Billet 63.5mm Compressor Wheel', "
             "'61x88 single plane ... billet wheel' -> inducer 61 / `compressorExducer` 88, '73x66 quick spool turbine wheel' -> "
             "turbine 73 / `turbineExducer` 66, BorgWarner '61.44/83mm Billet Compressor Wheel', '68mm Turbine Wheel'); "
             "`turbineBlades` from the Turbine Wheel / Year option (`10 Blade`, `2003 (10 blade)`, `13 Blade (No Whistle)`) or "
             "the body; `ar` from the variant's Turbine Housing / A/R Size option (`.84ar`, `1.0 A/R`, `.91ar T4 Divided` -> "
             "also `turbineFlange`, `divided`) or the body's turbine housing ('0.91AR Turbine Housing', '1.00 A/R Turbine "
             "Housing'); `compressorAr` from '0.70AR Ported Compressor Cover'; `housingCm2` from '(12CM Housing)'; `vgt` from "
             "the `vgt` / `non vgt turbo` tags and VGT/VNT/AVNT/wastegate words; `bearing` ball/journal; `stage` (1, 1.5, 2, 3; "
             "`S2r` -> 2); `series` (Jetfire, KC300x G3, KC38r, TP38r, Whistler, Warlock, Cummander, Vortex, Fusion, Reaper, "
             "Stock Plus, Budget, PowerMax, SX-E, PhatShaft); `model` (GTP38R, GT3788VA, GT3794VA, GT4094VA, HE351VE, S362...); "
             "`whistler` from the Whistler / Non Whistler option; `finish` from the cover / powder-coat option (Polished, Chrome, "
             "Fire Truck Red...; KC uses a different base number for coated covers, e.g. 300132 standard vs 300957-(Pol)); "
             "`supercore` for the 'No Turbine housing' variant of a supercore; `kit` for conversion / retrofit kits (the "
             "kit's turbo sizes); `compound` with `lowPressureStage`/`highPressureStage` for the 6.4 Fusion set; `twin` for "
             "the EcoBoost Reaper pairs; `position` low-/high-pressure on the 6.4 singles; `maxInjectorCc`/`maxInjectorPct` "
             "from 'Supports: Up to 205cc/30% injectors'; `hpLow`/`hpHigh` from '450 to 550 HP with supporting mods'; "
             "`hpCapable` from 'Capable of 500whp' / 'Supports Up To 600RWHP' (as printed, wheel or crank); `hpGain` from "
             "'supporting up to an additional 175HP'; `maxBoostPsi`; `mfrPn` (Garrett / Holset number printed on resold "
             "units); `replacesOem` (Ford cross-reference number); `condition` new/reman.")
    L.append("- **Injectors**: one record per variant SKU (Full Force lists the same injector under 'Send in First' / 'Send In "
             "After' core options with `-SF`/`-SA` suffixes; both are kept as listed). `nozzleCc` from the title/variant "
             "(`180CC`, `190cc`, `180cc/30`), `pctOver` from the Size / Nozzle Size option (`80%`, `30`, `Stock` -> 0), `stage`, "
             "`hybrid`, `plungerMm` (`7mm Hybrid`), `series` Legacy/Evolution, `set`, `hpCapable` ('capable of 600RWHP'), "
             "`flowGainPct` (Nostrum EcoBoost '11% Flow rate increase over stock'), `coreRequired`, `condition`.")
    L.append("- **Injection pumps**: `type` CP3/CP4/CP4.2/CPX/VP44/HPFP/HPOP (HEUI high-pressure oil pumps are filed as "
             "`injectionPump` with `type: HPOP`, as in the Industrial Injection extract); `strokerMm` (10 / 10.3 mm stroker); "
             "`pctOver` and `hpCapable` from the RCD CPX variant ('+25% Up to 700 RWHP'); `hpRating` ('235HP (Standard Output)'); "
             "`stage`; `minGpm` (CNC-Fab HPOP bench minimum); `dual`, `kit`; `replacesOem`; `condition`. The Xtreme-DI EcoBoost "
             "HPFP lists one SKU under 11 model-year options; the years are merged into one record (see shared SKUs).")
    L.append("- **Manifolds**: `type` intake/exhaust, `side`, `pair` (exhaust manifold sets), `material` cast/billet, `pieces`, "
             "`finish` (Pusher / PPE colour and coating options), `kit` (manifold + up-pipe kits, intake + turbo-inlet packages).")
    L.append("- **emissions**: `carb_eo:D-nnn[-nn]` when the body prints a CARB EO number (Pusher D-879, BD D-553-17); else "
             "`no_eo_race_only` when the product carries KC's `CARBs are bad for you` tag (the site's marker for parts without "
             "an EO); else `oem_replacement` for stock-replacement / OEM / reman-stock listings; else `unknown`. DPF/DOC/SCR/EGR "
             "delete parts: none in the four categories (fuel-bowl delete and turbo-resonator delete plugs are not emissions parts "
             "and are outside the categories anyway).\n")
    L.append("## Skipped\n")
    for reason, n in sorted(stats.skipped.items(), key=lambda x: -x[1]):
        L.append(f"- **{reason}**: {n}")
        for item in stats.skipped_items[reason][:8]:
            L.append(f"  - {item}")
        if n > 8:
            L.append(f"  - ... {n - 8} more")
    L.append("")
    if stats.shared_sku:
        L.append("## One SKU under several options on the same listing (first option's spec kept, years merged)\n")
        for d in stats.shared_sku:
            L.append(f"- {d}")
        L.append("")
    if stats.merged_dupes:
        L.append("## Duplicate SKUs merged across listings (same brand + part number + family; first occurrence kept, years widened)\n")
        for d in stats.merged_dupes:
            L.append(f"- {d}")
        L.append("")
    L.append("## Needs human QA\n")
    if stats.unknown_fams:
        L.append("Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):\n")
        for fam, n in sorted(stats.unknown_fams.items()):
            L.append(f"- `{fam}`: {n} record(s)")
        L.append("")
    L.append("Judgement calls:\n")
    L.append("- `p` is the site SKU with whitespace tightened around hyphens (`300957 - (Pol)` -> `300957-(Pol)`, "
             "`302149 - LLY` -> `302149-LLY`). KC's 30xxxx numbers are KC's own SKUs. When a resold part's SKU pairs a "
             "manufacturer number with a KC number (`901654-5001W / 302623`, `300885 / 424018-SA`), the manufacturer number is "
             "`p` and the KC number goes to `spec.sellerSku`; resold Garrett/Holset units listed only under a KC SKU keep that "
             "SKU as `p` with the manufacturer number in `spec.mfrPn`.")
    L.append("- KC resells the S&S Diesel Motorsport injector and CP3 lines (about 230 records here). The SS task extracts the "
             "same lines from ssdiesel.com, but KC's SKUs differ in form (`SS-325-30SAC-R-SET` vs S&S's own `325-30SAC-SET` "
             "style; only the 6.7 Power Stroke / 2019+ Cummins SKUs coincide), so the merge will show them as separate parts "
             "under the same brand. Prefer the SS extract where both exist.")
    L.append("- Model years missing from a title are filled from the site's year tags (`2003`, `2005-2007`, `obs`, `e99`, "
             "`l99-03`) when present; otherwise the record has no years.")
    L.append("- KC's `CARBs are bad for you` tag is read as 'no CARB EO' -> `no_eo_race_only`. A hidden listing 'CARB EO KC "
             "Jetfire Stage 1 Turbo - 6.0 Powerstroke' (SKU 300021C) says 'Carb EO Approved for sale in California with stock "
             "injectors ONLY' but prints no EO number and is not on the storefront; it is skipped with the other hidden items. "
             "Verify the EO with KC before marking any Jetfire Stage 1 as CARB-exempt.")
    L.append("- Turbine wheel sizes written as `73x66` / `72.5x66` are read as inducer x exducer (the larger figure first, as the "
             "site writes them). Compressor `61x88` is inducer x exducer with 'extended tips to 93mm' ignored.")
    L.append("- Year options such as `2003` vs `2004+` on 6.0 Powerstroke turbos select the pedestal/mounting style (10-blade "
             "2003 vs 13-blade 2004-2007 stock turbine); the record's `y0`/`y1` follow the option and the blade count is in "
             "`spec.turbineBlades`. The site says the 2003 version bolts to 2004-2007 trucks with one less bolt; that is not "
             "encoded.")
    L.append("- `hpCapable` is whatever the listing prints ('500whp', '600RWHP', '600HP') without converting between wheel and "
             "crank figures.")
    L.append("- Full Force injector SKUs differ only by the core option (`-SF` send-in-first / `-SA` send-in-after); both are "
             "kept because the site lists them as separate SKUs. WDI SKUs are slugs (`wdi-190-30-premium`), not part numbers.")
    L.append("- Warlock retrofit kits for 2011-2014 6.7 Powerstroke bundle a 2017-style turbo with pedestal and lower intake "
             "manifold; variants that supply a Garrett turbo instead of a KC one carry `variantNote`.\n")
    L.append(f"- {stats.no_wheel_stock} stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the "
             "OEM/Garrett/Holset part number); they are not listed individually below.\n")
    L.append("Per-listing flags:\n")
    for q in stats.qa:
        L.append(f"- {q}")
    for (handle, kind), (msg, skus) in stats.qa_once.items():
        shown = ", ".join(skus[:6]) + (f" ... ({len(skus)} SKUs)" if len(skus) > 6 else "")
        L.append(f"- {msg} [{shown}]")
    L.append("")
    L.append("## Validation\n")
    if errs:
        L.append(f"{len(errs)} validation error(s):\n")
        for e in errs:
            L.append(f"- {e}")
    else:
        L.append("Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src emissions`, numeric "
                 "fields are numbers, years are integers, no empty strings.")
    L.append("")
    path.write_text("\n".join(L), encoding="utf-8")


def main(argv):
    offline = "--offline" in argv
    stats = Stats()
    if offline:
        products = load_cache()
        robots_delay(stats)
    else:
        import requests
        s = requests.Session()
        s.headers["User-Agent"] = UA
        products = fetch_all(s, stats)
    stats.pages = len(list(DL.glob("products_p*.json")))
    stats.products = len(products)
    log(f"{HOST}: {len(products)} products from {stats.pages} cached page(s)")

    recs = extract(products, stats)
    recs = [clean_empty(r) for r in recs]
    for r in recs:
        r.setdefault("spec", {})
        r.setdefault("emissions", "unknown")
    recs = dedupe(recs, stats)
    errs = validate(recs)

    counts = {
        "brand_cat": collections.Counter((r["m"], r["cat"]) for r in recs),
        "cat": collections.Counter(r["cat"] for r in recs),
        "fam_cat": collections.Counter((r["fit"]["fam"], r["cat"]) for r in recs),
        "emissions": collections.Counter(r["emissions"] for r in recs),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    out = {
        "source": {
            "task": "KC",
            "brand": "KC Turbos",
            "doc": SRC_DOC,
            "url": f"https://{HOST}/products.json?limit=250&page=N",
            "edition": EDITION,
            "note": "m is the brand named on each listing; resold Garrett/BorgWarner/Ford/XDP/Full Force/WDI/... parts keep their own brand",
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "kc.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(OUT / "kc.md", recs, stats, counts, errs)
    log(f"wrote {len(recs)} records; {len(errs)} validation errors; {len(stats.qa) + len(stats.qa_once)} QA flags")
    for e in errs[:20]:
        log("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
