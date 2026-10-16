#!/usr/bin/env python3
"""Parts catalog extractor: INDUSTRIAL (Industrial Injection, industrialinjection.com).

Source is the public Shopify listing `https://www.industrialinjection.com/products.json?limit=250&page=N`.
Pages are cached under `dl/industrial/` (gitignored) so the parse step is re-runnable offline; the
fetch is resumable (a page that is already cached is not requested again).

    python -I scripts/parts-catalog/extract_industrial.py            # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_industrial.py --offline  # parse the cache only

Emits `injector`, `injectionPump`, `turbo` and `manifold` records with `emissions`; skips apparel,
heavy-duty (Cat/Detroit/Navistar/Paccar/ISX...), emissions-system parts and everything that is not
one of those four categories (counted in the notes). Writes `out/industrial.json` and
`out/industrial.md` next to this file. Nothing else is written outside `dl/` and `out/`.
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
DL = HERE / "dl" / "industrial"
OUT = HERE / "out"
HOST = "www.industrialinjection.com"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 10.0  # the brief: Crawl-delay 10 for named bots; honor 10 s
EDITION = dt.date.today().strftime("%Y-%m")
SRC_DOC = "industrialinjection.com Shopify products.json"

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
UNKNOWN_FAM_CYL = {
    "GM 6.2/6.5 diesel": 8, "Ford 6.9/7.3 IDI": 8, "Ford EcoBoost": 6, "Porsche 911/944": 6,
    "Audi/VW": 4, "BMW": 6, "Mercedes Sprinter": 6, "GM 2.8 Duramax": 4, "Chevy Cruze": 4, "RAM 3.0 EcoDiesel": 6,
    "Polaris RZR": 2, "Yanmar": None, "Cummins 8.3 ISC": 6, "Cummins 4BT": 4, "Cummins QSB": 6, "Cummins": None,
    "Duramax": 8, "Power Stroke": 8, "Ford": None, "Universal": None,
}

VENDOR_NAME = {
    "holset": "Holset", "hsmotorsports": "H&S Motorsports", "IIDP": "Industrial Injection",
    "BWA Receivables Corporation": "BorgWarner", "Industrial Injection HD": "Industrial Injection",
    "TURBO PERFORMANCE PRODUCTS": "Turbo Performance Products", "GM": "GM", "Cat": "Caterpillar",
}


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html(html: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html or "", flags=re.S | re.I)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&amp;", "&").replace("&nbsp;", " ").replace("&quot;", '"')
            .replace("&#39;", "'").replace("&rsquo;", "'").replace("&lsquo;", "'")
            .replace("&rdquo;", '"').replace("&ldquo;", '"').replace("&ndash;", "–").replace("&mdash;", "—")
            .replace("â€“", "–").replace("â€\u009d", '"').replace("â€œ", '"').replace("Â", " "))
    # the site embeds accordion CSS as text; drop it
    text = re.sub(r"\.accordion[^{}]*\{[^{}]*\}", " ", text)
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


class Stats:
    def __init__(self):
        self.skipped = collections.Counter()
        self.skipped_items = collections.defaultdict(list)
        self.qa = []
        self.unknown_fams = collections.Counter()
        self.merged_dupes = []
        self.pages = 0
        self.products = 0
        self.no_wheel_stock = 0
        self.robots_note = ""

    def skip(self, reason, label):
        self.skipped[reason] += 1
        self.skipped_items[reason].append(label)


# --------------------------------------------------------------------------- fetch
def fetch_all(session, stats: Stats) -> list[dict]:
    DL.mkdir(parents=True, exist_ok=True)
    robots_file = DL / "robots.txt"
    delay = MIN_DELAY
    if not robots_file.exists() or robots_file.stat().st_size == 0:
        try:
            r = session.get(f"https://{HOST}/robots.txt", timeout=60, allow_redirects=True)
            robots_file.write_text(f"# status {r.status_code} final_url {r.url}\n" + (r.text if r.status_code == 200 else ""))
            log(f"robots.txt -> {r.status_code} via {r.url}")
        except Exception as e:  # the www host 301s robots.txt to the bare host, which a cloud allowlist may block
            robots_file.write_text(f"# fetch failed: {e}\n")
            log(f"robots.txt fetch failed: {e}")
        time.sleep(MIN_DELAY)
    txt = robots_file.read_text()
    body = "\n".join(l for l in txt.splitlines() if not l.startswith("#"))
    if body.strip():
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(body.splitlines())
        if not rp.can_fetch(UA, f"https://{HOST}/products.json"):
            raise SystemExit(f"{HOST}: robots.txt disallows /products.json; stopping")
        delay = max(MIN_DELAY, rp.crawl_delay(UA) or 0)
        stats.robots_note = "robots.txt fetched and parsed; /products.json allowed"
    else:
        stats.robots_note = ("robots.txt could not be read (www redirects it to the bare host, which this "
                             "environment's network allowlist blocks); proceeded on the brief's stated "
                             "Crawl-delay 10 and Shopify's standard disallow list (which does not cover /products.json)")

    products = []
    page = 1
    while True:
        cache = DL / f"products_p{page}.json"
        if cache.exists():
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
HD_TAG = re.compile(r"heavy duty|^cat$|^cat |detroit|navistar|\bisx|paccar|volvo|\bmack\b|international|^3406|^c1[0-9]\b|"
                    r"^n14|^x15|dt466|60 series|series 60|\bdd1[35]\b|cat c|c7\b|c9\b|c13|komatsu|deutz|perkins|mercedes",
                    re.I)
HD_FITS = re.compile(r"CAT|Detroit|Navistar|Paccar|Volvo|Mack|International|Komatsu|Deutz|Perkins|Mercedes|Caterpillar|"
                     r"Hino|Isuzu|Kubota|John Deere|Freightliner|Kenworth|Peterbilt|Cummins ISX|Mercedes", re.I)
HD_TITLE = re.compile(r"\b(ISX|ISB|ISC|ISL|ISM|QSK|QSX|QSL|N14|X15|C15|C13|C7|C9|3406|DT466|MaxxForce|Series 60|DD1[35]|"
                      r"VT365|T444E|8\.3L|8\.9L|11\.9L|12\.7L|14L|15L|Caterpillar|CAT\b|Detroit|Navistar|Paccar|Volvo|Mack|"
                      r"Peterbilt|Kenworth|Freightliner|Hino|Isuzu|Kubota|Komatsu|Deutz|Perkins|Daimler|Mid-Range)\b", re.I)
MERCH_TYPES = {"Apparel", "Decals", "Gift Card", "hat", "Additive", "Tools", "Catalog"}
MERCH_TAGS = re.compile(r"t-shirts?|shirts?|hoodie|hats?|ii gear|iigear|additives|decals|stickers?", re.I)

# words that mark a sub-component rather than a complete injector / pump / turbo / manifold
PART_WORDS = re.compile(
    r"\b(nozzles?|lines?|washers?|gaskets?|actuators?|harness|brackets?|seals?|o-rings?|cups?|sleeves?|hold ?downs?|"
    r"wheel|housing|shaft|bearings?|clamps?|flange|adapters?|solenoid|sensors?|(?<![\d][ -])valve|filter|elbow|plugs?|(?<!Common )rails?|"
    r"covers?|tools?|blanket|heat shield|boot|drain|tube|cartridge|chra|super ?cores?|backplate|elements?|springs?|"
    r"pins?|gears?|caps?|module|ficm|ipr|fca|connectors?|service unit|cut piston|return|feed|studs?|bolts?|"
    r"install(?:ation)? kit|disaster|repair kit|rebuild|shim|spacer|fitting|hose|pigtail|tappet|plate|outlet|inlet|"
    r"intake plate|service kit|seal kit|cap kit|core assembly|kit w/o|mounting)\b", re.I)
LIFT_PUMP = re.compile(r"FASS|AirDog|Titanium|lift pump|\d+\s*GPH|Replacement Pump\b|fuel filter|priming|lube pump|"
                       r"water pump|oil pump|gear pump|transfer pump|vacuum pump|electric fuel pump|in-?tank", re.I)
INJ_PUMP = re.compile(r"\bCP\.?[34]\b|VP44|VE Pump|\bVE\b|P7100|P-?Pump|HPOP|High.Pressure Oil Pump|High.Pressure Fuel Pump|"
                      r"Injection Pump|\bDB2\b|\bDS4\b|\bHP4\b|\bDCR\b|Stanadyne|Fuel Pump|Stroker|Dragon|XP ?[56]00|Dual CP3|"
                      r"Retrofit Pump|Conversion Kit Pump|Pump Conversion Kit|Mechanical Pump|^PUMP\b|Dual Fuel Pump", re.I)
PUMP_NOT_PUMP = re.compile(r"bracket|gear\b|element|seal|service|fca|(?<![\d][ -])valve|shaft|key|gasket|line|fitting|tool|plate|"
                           r"install|cover|plug|o-ring|hose|wire|spring|filter|cap\b|module|bag of parts|disaster|"
                           r"w/o pump|without pump|w/out pump|kit only|no cp[34]|no pump|with ?out cp[34]|\(no ", re.I)


def is_heavy_duty(p: dict, body: str) -> bool:
    if p.get("vendor") == "Industrial Injection HD" or (p.get("product_type") or "") == "Heavy Duty Turbocharger":
        return True
    if any(HD_TAG.search(t) for t in p.get("tags", [])):
        return True
    m = re.search(r"Fits ([^.]{1,80}?) applications\.", body)
    if m and HD_FITS.search(m.group(1)) and not re.search(r"Cummins|Duramax|Power Stroke|Ford|Dodge|GM\b", m.group(1)):
        return True
    if HD_TITLE.search(p["title"]) and not re.search(r"Cummins 5\.9|Cummins 6\.7|5\.9L? Cummins|6\.7L? Cummins|Duramax|Power ?Stroke",
                                                    p["title"], re.I):
        return True
    return False


def classify(p: dict, body: str) -> tuple[str | None, str | None]:
    """Return (cat, skip_reason). Exactly one of the two is set."""
    t = re.sub(r"\s+", " ", p["title"]).strip()
    pt = (p.get("product_type") or "").strip()
    tags = [x.lower() for x in p.get("tags", [])]
    if pt in MERCH_TYPES or any(MERCH_TAGS.fullmatch(x) for x in tags):
        return None, "apparel / merch / consumables"
    if is_heavy_duty(p, body):
        return None, "heavy-duty (Cat / Detroit / Navistar / ISX / industrial)"
    if pt == "Emissions System Parts" or re.search(r"\b(EGR|DPF|SCR|DOC)\b", t):
        return None, "emissions-system part (EGR valve / adapter / gasket)"
    if re.search(r"\bdelete\b", t, re.I):
        return None, "delete part (skipped by rule)"

    if re.search(r"manifold", t, re.I):
        if re.search(r"gasket|bolt|sensor|plate|\bMAP\b|water|absolute|temperature|pressure", t, re.I):
            return None, "manifold hardware / gasket / sensor"
        return "manifold", None

    if pt == "Fuel Injector" or re.search(r"\binjectors?\b", t, re.I):
        if pt == "Injector Nozzle" or re.search(r"nozzle", t, re.I) or "nozzle size" in [o["name"].lower() for o in p["options"]]:
            return None, "injector nozzle (no category)"
        if PART_WORDS.search(t) or re.search(r"\bkit\b|body\b|tool|install|cut piston|washer|hold|sleeve|cup|harness|"
                                             r"connector|o-ring|seal|tester|puller|repair", t, re.I):
            return None, "injector hardware / line / kit"
        return "injector", None

    sku0 = (p["variants"][0].get("sku") or "").upper()
    if pt in ("Fuel Pump", "Fuel Pump Parts", "Fuel System Parts", "Fuel Kits") or re.search(r"\bpumps?\b", t, re.I) \
            or "pumps" in tags or "fuel pump" in tags or "new pumps" in tags:
        if LIFT_PUMP.search(t) or pt == "Fuel Pump" and re.search(r"FASS", p.get("vendor", ""), re.I):
            return None, "lift pump / fuel-system pump (not a task category)"
        stanadyne = re.match(r"(DB2|DB4|DS4)", sku0) and re.search(r"\bHp\)", t)  # terse Stanadyne IDI pump titles
        if (INJ_PUMP.search(t) or stanadyne) and not PUMP_NOT_PUMP.search(t):
            return "injectionPump", None
        if INJ_PUMP.search(t) and re.search(r"w/o pump|without pump|w/out pump|kit only|no cp[34]|no pump|with ?out cp[34]|bag of parts", t, re.I):
            return None, "pump kit without the pump / parts bag"
        return None, "fuel-system hardware / pump parts / kits"

    if pt in ("Turbocharger", "Turbocharger Parts") or "turbos" in tags or re.search(r"turbo", t, re.I):
        if pt == "Turbocharger Parts" and not re.search(r"\bturbo(?:charger)?s?\b.*(?:kit|upgrade)|S300|S400", t, re.I):
            return None, "turbo parts / hardware"
        if PART_WORDS.search(t) and not re.search(r"Turbo Kit|Compound|Swap Kit|Single Turbo|Turbocharger Kit", t, re.I):
            return None, "turbo parts / hardware"
        if re.search(r"super ?core|supercore|cartridge|CHRA|blanket|actuator|install kit|cover install|heat shield|"
                     r"boot kit|intake|charge pipe|intercooler|downpipe|exhaust|hot pipe|cold pipe|piping|service unit", t, re.I):
            return None, "turbo parts / hardware"
        if re.search(r"turbo", t, re.I) or pt == "Turbocharger":
            return "turbo", None
    return None, f"other: {pt or 'untyped'}"


# --------------------------------------------------------------------------- fitment
TAG_FIT = re.compile(r"^(cummins|duramax|power stroke)\s+(\d{4}(?:\.5)?)\s*(?:-|–)?\s*(\d{4}(?:\.5)?|\+)?\s*(.*)$", re.I)
DMX_CODE = re.compile(r"\b(LB7|LLY|LBZ|LMM|LGH|LML|L5P|L5D)\b", re.I)
YEARS = re.compile(r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)\s*(?:[-–—]|to)\s*((?:19|20)?\d\d(?:\.5)?)(?![\d.])|(?<![\d.])(20\d\d)\s*\+")
YEARS_SHORT = re.compile(r"(?<![\d.])(\d\d(?:\.5)?)\s*[-–]\s*(\d\d(?:\.5)?)(?![\d.%])")


def tag_fitment(tags: list[str]) -> list[dict]:
    fits = []
    for t in tags:
        m = TAG_FIT.match(t.strip())
        if not m:
            continue
        make, y0s, y1s, rest = m.group(1).lower(), m.group(2), m.group(3), m.group(4)
        y0 = float(y0s)
        y1 = None if (y1s is None or y1s == "+") else float(y1s)
        if y1s is None and "+" not in t:
            y1 = y0
        disp = re.search(r"(\d\.\d)l", rest, re.I)
        disp = float(disp.group(1)) if disp else None
        fam = note = None
        if make == "cummins":
            if disp == 6.7 or (disp is None and y0 >= 2007.5):
                fam = "Cummins 6.7"
            elif y1 is not None and y1 <= 1998:
                fam = "Cummins 5.9 12V"
            elif y0 >= 1998.5:
                fam = "Cummins 5.9 24V/CR"
            else:
                fam = "Cummins 5.9 12V" if y0 < 1998 else "Cummins 5.9 24V/CR"
        elif make == "duramax":
            if disp == 6.6 or DMX_CODE.search(rest):
                fam = "Duramax 6.6"
                codes = [c.upper() for c in DMX_CODE.findall(rest)]
                note = ", ".join(codes) if codes else None
            else:
                fam = "GM 6.2/6.5 diesel"
        else:
            if re.search(r"idi|6\.9", rest, re.I):
                fam = "Ford 6.9/7.3 IDI"
            elif disp in (7.3, 6.0, 6.4, 6.7):
                fam = f"Powerstroke {disp}"
            else:
                fam = "Power Stroke"
        fits.append({"fam": fam, "y0": y0, "y1": y1, "note": note, "src": "tag"})
    return fits


def title_years(t: str) -> tuple[float | None, float | None, bool]:
    """(y0, y1, open_ended) from a title such as '2004.5-2007', '15-16', '2019+', '2021-2024'."""
    m = YEARS.search(t)
    if m:
        if m.group(3):
            return float(m.group(3)), None, True
        y0 = float(m.group(1))
        y1s = m.group(2)
        y1 = float(y1s) if len(y1s.split(".")[0]) == 4 else float(str(int(y0))[:2] + y1s)
        if y1 < y0:  # '1998-02' style
            y1 += 100
        return y0, y1, False
    m = YEARS_SHORT.search(t)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        if 83 <= a <= 99 or 0 <= a <= 30:
            y0 = (1900 if a >= 83 else 2000) + a
            y1 = (1900 if b >= 83 else 2000) + b
            if y1 >= y0 and y1 - y0 <= 30:
                return y0, y1, False
    return None, None, False


def title_fitment(t: str, body: str) -> list[dict]:
    """Fallback when there are no fitment tags: engine family from the title (then the body's 'Fits X' lead-in)."""
    y0, y1, open_ended = title_years(t)
    tb = t
    fits = []
    code = DMX_CODE.search(t)
    disp = re.search(r"(?<!\d)(\d\.\d)\s*L?\b", t)
    disp = float(disp.group(1)) if disp else None

    def add(fam, note=None):
        fits.append({"fam": fam, "y0": y0, "y1": y1, "note": note, "src": "title"})

    if re.search(r"EcoBoost", t, re.I):
        add("Ford EcoBoost", f"{disp}L EcoBoost" if disp else None)
    elif re.search(r"EcoDiesel", t, re.I):
        add("RAM 3.0 EcoDiesel")
    elif re.search(r"\b4BT?\b", t) or "4bt cummins" in body.lower():
        add("Cummins 4BT")
    elif re.search(r"Porsche", t, re.I):
        add("Porsche 911/944", re.search(r"9[14]\d(?:\.\d)?", t).group(0) if re.search(r"9[14]\d", t) else None)
    elif re.search(r"Polaris|RZR", t, re.I):
        add("Polaris RZR")
    elif re.search(r"Audi|\bVW\b|Volkswagen|TDI|TFSI|Golf", t, re.I):
        add("Audi/VW", f"{disp}L" if disp else None)
    elif re.search(r"BMW|335d", t, re.I):
        add("BMW", f"{disp}L" if disp else None)
    elif re.search(r"Sprinter|Mercedes", t, re.I):
        add("Mercedes Sprinter", f"{disp}L" if disp else None)
    elif re.search(r"Colorado|Canyon|2\.8L", t, re.I):
        add("GM 2.8 Duramax")
    elif re.search(r"Cruze", t, re.I):
        add("Chevy Cruze")
    elif re.search(r"Yanmar", t, re.I):
        add("Yanmar")
    elif re.search(r"\bISC\b|Case\b", t, re.I):
        add("Cummins 8.3 ISC")
    elif code or re.search(r"Duramax", t, re.I):
        if disp in (None, 6.6) and not re.search(r"6\.[25]", t):
            add("Duramax 6.6", code.group(1).upper() if code else None)
        else:
            add("GM 6.2/6.5 diesel")
    elif re.search(r"Power ?Stroke|\bFord\b|T444", t, re.I):
        if disp in (7.3, 6.0, 6.4, 6.7):
            add(f"Powerstroke {disp}", "T444E" if re.search(r"T444", t) else None)
        elif disp == 6.9 or re.search(r"IDI", t):
            add("Ford 6.9/7.3 IDI")
        else:
            add("Power Stroke")
    elif re.search(r"Cummins|Dodge|\bRAM\b", t, re.I):
        if disp == 6.7 or (disp is None and y0 and y0 >= 2007.5) or re.search(r"HE300VG|HE351VE", t):
            add("Cummins 6.7")
        elif disp == 5.9 or disp is None or re.search(r"HX35|HY35|HE351CW|HX40|VP44|P7100|12 ?V|24 ?V", t, re.I):
            twelve = re.search(r"12[ -]?V(alve)?\b|P7100|P-?Pump|VE Pump", t, re.I)
            twenty4 = re.search(r"24[ -]?V(alve)?\b|VP44|HY35|HE351CW|Common Rail|\bCR\b|CP3", t, re.I)
            if twelve and not twenty4:
                add("Cummins 5.9 12V")
            elif twenty4 and not twelve:
                add("Cummins 5.9 24V/CR")
            elif y0 is not None and y1 is not None and y1 <= 1998:
                add("Cummins 5.9 12V")
            elif y0 is not None and y0 >= 1998.5:
                add("Cummins 5.9 24V/CR")
            elif y0 is not None and y1 is not None:
                add("Cummins 5.9 12V"); add("Cummins 5.9 24V/CR")
            elif y0 is not None and y1 is None and open_ended:
                add("Cummins 5.9 24V/CR" if y0 >= 1998 else "Cummins 5.9 12V")
            else:
                add("Cummins")
        else:
            add("Cummins")
    else:
        m = re.search(r"Fits ([^.]{1,80}?) applications\.", body)
        if m:
            head = m.group(1)
            if re.search(r"Cummins", head):
                add("Cummins")
            elif re.search(r"Duramax", head):
                add("Duramax 6.6")
            elif re.search(r"Power Stroke", head):
                add("Power Stroke")
            elif re.search(r"Audi/VW", head):
                add("Audi/VW")
            elif re.search(r"Ford", head):
                add("Ford")
    return fits


def merge_fits(fits: list[dict]) -> list[dict]:
    """One entry per family: y0 = min, y1 = max (None if any is open-ended), notes joined."""
    by_fam: dict[str, dict] = {}
    order = []
    for f in fits:
        fam = f["fam"]
        if fam not in by_fam:
            by_fam[fam] = {"fam": fam, "y0": f["y0"], "y1": f["y1"], "open": f["y1"] is None and f["y0"] is not None,
                           "notes": f["note"].split(", ") if f["note"] else [], "src": f["src"]}
            order.append(fam)
            continue
        g = by_fam[fam]
        if f["y0"] is not None:
            g["y0"] = f["y0"] if g["y0"] is None else min(g["y0"], f["y0"])
        if f["y1"] is None and f["y0"] is not None:
            g["open"] = True
        elif f["y1"] is not None and not g["open"]:
            g["y1"] = f["y1"] if g["y1"] is None else max(g["y1"], f["y1"])
        if f["note"]:
            for piece in f["note"].split(", "):
                if piece not in g["notes"]:
                    g["notes"].append(piece)
    out = []
    for fam in order:
        g = by_fam[fam]
        y0, y1 = g["y0"], (None if g["open"] else g["y1"])
        notes = list(g["notes"])
        codes = [n for n in notes if DMX_CODE.fullmatch(n)]
        if codes:
            notes = [n for n in notes if n not in codes] + ["/".join(codes)]
        if y0 is not None and y0 != int(y0):
            notes.insert(0, f"from {y0}")
        if y1 is not None and y1 != int(y1):
            notes.insert(0, f"to {y1}")
        out.append({"fam": fam, "y0": int(y0) if y0 is not None else None,
                    "y1": int(y1) if y1 is not None else None, "notes": ", ".join(notes) or None, "src": g["src"]})
    return out


# --------------------------------------------------------------------------- emissions
RACE_ONLY = re.compile(r"Dedicated Competition Use Only|Not Legal For .{0,30}On-Road|CAN ?NOT SHIP TO CALIFORNIA|"
                       r"not legal for sale or use in California|race (?:use )?only|off-?road use only", re.I)
CARB_EO = re.compile(r"\b(D-\d{3}-\d{1,3})\b")
STOCK = re.compile(r"\bstock\b|\bOEM?\b|\bOE\b|factory|genuine|\breplacement\b|Standard Output|High Output|exchange", re.I)


def emissions_for(title: str, body: str, performance: bool) -> str:
    m = CARB_EO.search(body)
    if m:
        return f"carb_eo:{m.group(1)}"
    if not performance and STOCK.search(title) and not re.search(r"XR\d?\b|PhatShaft|upgrade|performance|%", title, re.I):
        return "oem_replacement"
    if RACE_ONLY.search(body):
        return "no_eo_race_only"
    if not performance and (STOCK.search(title) or re.search(r"stock replacement|direct[- ]fit replacement|"
                                                              r"OEM replacement|no performance tuning", body, re.I)):
        return "oem_replacement"
    return "unknown"


# --------------------------------------------------------------------------- spec parsing
PCT = re.compile(r"(\d{1,3})\s*%")
HP = re.compile(r"(\d{2,4})(?:\s*[-–]\s*(\d{2,4}))?\s*[- ]?(?:Hp|HP|hp|horsepower)\b")
CC = re.compile(r"(\d{2,3})\s*cc\b", re.I)
LPM = re.compile(r"(\d{2,3})\s*LPM", re.I)
STAGE = re.compile(r"(DFLY|R[1-6])(?:\b|$)")
MM = re.compile(r"(?<![\d.])(\d{2}(?:\.\d)?)\s*-?\s*mm\b", re.I)
AR = re.compile(r"(?<![\d.])([01]?\.\d{1,2})\s*(?:A/?R|T/HSG|Turbine(?: A/R)?)\b|A/R:?\s*([01]?\.\d{1,2})|/\s*([01]\.\d{2})\s*(?:T4|T3|V-?Band|$)", re.I)
MODEL = re.compile(r"\b((?:HE|HX|HY)\d{3}[A-Z]*|GT[A-Z]?\d{4}[A-Z]*|AVNT\d{4}|G?TP38|K0\d|KP\d\d|BV\d\d|B2BV|RHG6|S[234]00(?:SX-?E|SX|SX-R)?|"
                   r"S4\d\d(?:\.\d)?|S3\d\d(?:\.\d)?|S2\d\d|S1B[A-Z]?|EFR ?\d{4}(?:-B)?|GXR\d\d-\d\d|G\d\d-\d{3,4}|GTX?\d{4}R?|GT\d{4}VA)\b")
INJ_BLOCK = re.compile(r"\b(DFLY|R[1-6])\s*[–-]\s*(.*?)(?=\b(?:DFLY|R[1-6])\s*[–-]|These injectors|Each injector|\*All|$)", re.S)


def injector_body_stages(body: str) -> dict[str, dict]:
    """Per-stage facts from the 'Choosing the Right Injector' accordion: LPM / cc, CP3 recommendation, HP capable."""
    out = {}
    seg = body
    m = re.search(r"Choosing (?:the|The) Right Injector", body)
    if m:
        seg = body[m.end():]
    for mb in INJ_BLOCK.finditer(seg):
        stage, text = mb.group(1), mb.group(2)
        d = {}
        ml = LPM.search(text)
        if ml:
            d["nozzleFlow"] = int(ml.group(1))
        mc = CC.search(text)
        if mc:
            d["nozzleCc"] = int(mc.group(1))
        mp = PCT.search(text)
        if mp:
            d["pctOver"] = int(mp.group(1))
        mh = re.search(r"(?:up to|capable of)?\s*(\d{3,4})\s*\+?\s*HP\s*capable|Capable of up to (\d{3,4})\s*HP", text, re.I)
        if mh:
            d["hpCapable"] = int(mh.group(1) or mh.group(2))
        mcp = re.search(r"((?:\d+%|\d+ ?mm|Dual|Stock)[^.]{0,25}?CP3[^.]{0,30}?recommended|No additional fueling upgrades needed|"
                        r"Regulated return fuel system[^.]{0,30})", text, re.I)
        if mcp:
            d["fuelRec"] = re.sub(r"\s+", " ", mcp.group(1)).strip()
        if re.search(r"Turbo upgrade recommended", text, re.I):
            d["turboUpgrade"] = True
        elif re.search(r"stock or larger turbos", text, re.I):
            d["turboUpgrade"] = False
        out[stage] = d
    return out


def condition_of(title: str, body: str) -> str | None:
    t = title + " " + body[:300]
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b|Exchange|II-Reman|-R\b", t, re.I):
        return "reman"
    if re.search(r"\bNew\b", t):
        return "new"
    return None


def parse_injector(p, body, v, stages: dict) -> tuple[dict, bool]:
    t, vt, sku = p["title"], v["title"], v["sku"]
    spec = {}
    st = STAGE.search(sku.upper()) or STAGE.search(vt.upper())
    stage = st.group(1) if st else None
    text = vt if vt != "Default Title" else t
    mp = PCT.search(text)
    if mp:
        spec["pctOver"] = int(mp.group(1))
    mh = HP.search(text)
    if mh:
        spec["hpRating"] = int(mh.group(2) or mh.group(1))
        if mh.group(2):
            spec["hpRatingLow"] = int(mh.group(1))
    mc = CC.search(text)
    if mc:
        spec["nozzleCc"] = int(mc.group(1))
    ml = LPM.search(text)
    if ml:
        spec["nozzleFlow"] = int(ml.group(1))
    if stage and stage in stages:
        for k, val in stages[stage].items():
            spec.setdefault(k, val)
    if stage:
        spec["stage"] = stage
    if re.search(r"Single[- ]Shot", vt, re.I):
        spec["tip"] = "single-shot"
    if re.search(r"Extrude Hone", body, re.I):
        spec["nozzleProcess"] = "extrude honed"
    if "pctOver" not in spec and (re.search(r"\bstock\b|\bOEM?\b|\bOE\b|factory|Standard Output|High Output", t, re.I) or
                                  not re.search(r"performance|over|stage|competition|race|\bHp\b|\bHP\b|cobra", t + " " + vt, re.I)):
        spec["pctOver"] = 0  # no gain quoted anywhere: the listing is a stock-rated injector
    if re.search(r"\(Set\)|\bSet\b", t):
        spec["set"] = True
    spec["condition"] = condition_of(t, body)
    mo = re.search(r"(?:Mopar|Cummins|Ford|GM) PN:?\s*([A-Z0-9-]{6,})", body)
    if mo:
        spec["replacesOem"] = [mo.group(1)]
    performance = spec.get("pctOver", 0) > 0 or bool(re.search(r"performance", t, re.I)) or "hpRating" in spec
    return spec, performance


def parse_pump(p, body, v) -> tuple[dict, bool]:
    t, vt, sku = p["title"], v["title"], v["sku"]
    text = vt if vt != "Default Title" else t
    both = t + " " + vt
    spec = {}
    mt = re.search(r"\bCP\.?3\b|\bCP4\b|VP44|P7100|P-?Pump|\bVE\b|HPOP|High.Pressure Oil Pump|\bDB2\b|\bHP4\b|\bDCR\b|XP ?[56]00", both, re.I)
    if mt:
        typ = mt.group(0).upper().replace(" ", "").replace(".", "")
        spec["type"] = {"PPUMP": "P7100", "P-PUMP": "P7100", "HIGHPRESSUREOILPUMP": "HPOP", "XP500": "CP3", "XP600": "CP3"}.get(typ, typ)
        if typ.startswith("XP"):
            spec["model"] = typ
    mconv = re.search(r"\b(?:CP3|CP4|HP4|DCR)\s+to\s+(CP3|CP4|DCR)\b", t, re.I)
    if mconv:
        spec["type"] = mconv.group(1).upper()  # conversion kit: the pump supplied is the target type
    if "type" not in spec and re.search(r"Fuel Pump", t, re.I) and re.search(r"6\.4L", t):
        spec["type"] = "K16"  # Siemens K16 high-pressure pump on the 6.4 Power Stroke
    if "type" not in spec:
        msk = re.match(r"(DB2|DB4|DS4)", sku.upper())
        if msk:
            spec["type"] = msk.group(1)  # Stanadyne rotary pumps (SKU prefix)
        elif re.search(r"L5P|L5D", t) and re.search(r"High Pressure", t, re.I):
            spec["type"] = "HP4"  # Denso HP4 is the factory L5P pump
        elif re.search(r"\bCP3\b", body):
            spec["type"] = "CP3"
    mtrans = re.search(r"\b(Manual|Automatic|Auto)\b", t)
    if mtrans and spec.get("type") in ("DB2", "DB4", "DS4"):
        spec["variantNote"] = mtrans.group(1).lower() + " transmission"
    mp = PCT.search(text)
    if mp:
        spec["pctOver"] = int(mp.group(1))
    else:
        mn = re.search(r"\b(33|42|85|120)\b", vt)
        if mn:
            spec["pctOver"] = int(mn.group(1))
    if re.search(r"\bstock\b", text, re.I) and "pctOver" not in spec:
        spec["pctOver"] = 0
    mm = re.search(r"(\d{2})\s*mm", both, re.I)
    if mm:
        spec["strokerMm"] = int(mm.group(1))
    mh = HP.search(text)
    if mh:
        spec["hpRating"] = int(mh.group(2) or mh.group(1))
        if mh.group(2):
            spec["hpRatingLow"] = int(mh.group(1))
    grade = re.search(r"Double Dragon|Dragon Fire|Hot Rod|Super Hot Rod|Modified", both, re.I)
    if grade:
        spec["grade"] = grade.group(0).title()
    elif sku.upper().endswith(("SHO", "SHOSE", "SHOSE-IIS")) or "SHO" in sku.upper():
        spec["grade"] = "Modified"
    elif re.search(r"DF(?:SE)?(?:-IIS)?$", sku.upper()):
        spec["grade"] = "Dragon Fire"
    elif re.search(r"DD(?:SE)?(?:-IIS)?$", sku.upper()):
        spec["grade"] = "Double Dragon"
    if re.search(r"Dual", both, re.I):
        spec["dual"] = True
    if re.search(r"\bkit\b|conversion|retrofit", both, re.I):
        spec["kit"] = True
    mtr = re.search(r"\((Manual|Auto) Trans\)|California Emissions", vt)
    if mtr:
        spec["variantNote"] = mtr.group(0).strip("()")
    spec["condition"] = condition_of(t, body)
    xr = re.search(r"(?:OEM Cross References?|Cross Reference)\s*:?\s*(.*?)(?=\s(?:Spec Sheet|Product Spec|Fitment|FAQ|Features|Key Features|Warranty|Core Charge|$))", body)
    if xr:
        spec["replacesOem"] = cross_refs(xr.group(1))
    performance = spec.get("pctOver", 0) > 0 or bool(spec.get("grade")) or spec.get("strokerMm") in (10, 12)
    return spec, performance


def cross_refs(s: str) -> list[str]:
    toks = [x.strip(" ,.;") for x in re.split(r",\s*", s)]
    out = []
    for x in toks:
        if 5 <= len(x) <= 22 and re.search(r"\d", x) and re.fullmatch(r"[A-Za-z0-9 ./-]+", x) and not re.fullmatch(r"\d{1,3}", x):
            if x not in out:
                out.append(x)
    return out[:25]


def parse_turbo(p, body, v) -> tuple[dict, bool]:
    t, vt = p["title"], v["title"]
    both = t + " | " + (vt if vt != "Default Title" else "")
    spec = {}
    # compressor / turbine from "64mm/64mm", "64.5MM/72MM", variant "62/68", "67MM/83MM/1.00", "67B C/W 83MM T/W 1.10"
    m = re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*mm\s*/\s*(\d\d(?:\.\d)?)\s*mm(?:\s*/\s*([01]?\.\d\d))?", both, re.I) or \
        re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*/\s*(\d\d(?:\.\d)?)(?![\d.%])(?:\s*(?:With|w/)?\s*([01]?\.\d\d)\s*A/R)?", both)
    if m and 50 <= float(m.group(1)) <= 110 and 50 <= float(m.group(2)) <= 120:
        spec["compressorInducer"] = num(m.group(1))
        spec["turbineWheel"] = num(m.group(2))
        if m.group(3):
            spec["ar"] = num(m.group(3))
    m = re.search(r"(\d\d(?:\.\d)?)B C/W (\d\d)MM T/W ([01]\.\d\d)", both, re.I)
    if m:
        spec.update(compressorInducer=num(m.group(1)), turbineWheel=num(m.group(2)), ar=num(m.group(3)))
    if "compressorInducer" not in spec:
        m = re.search(r"\bS4(\d\d(?:\.\d)?)\b|\bS3(\d\d(?:\.\d)?)\b(?!\d)|Boxer (\d\d)\b", both)
        if m:
            val = m.group(1) or m.group(2) or m.group(3)
            if val not in ("00",):
                spec["compressorInducer"] = num(val)
        else:
            mm = MM.search(both)
            if mm and 50 <= float(mm.group(1)) <= 110:
                spec["compressorInducer"] = num(mm.group(1))
    # body patterns. BorgWarner K27 style: "60mm/83.7mm 7/7 Blade ... Compressor Wheel", "70mm/58.83mm 12 Blade Turbine Wheel"
    m2 = re.search(r"(\d\d(?:\.\d+)?)\s*mm\s*/\s*(\d\d(?:\.\d+)?)\s*mm[^.]{0,40}?Compressor Wheel", body, re.I)
    if m2 and "compressorInducer" not in spec:
        spec["compressorInducer"], spec["compressorExducer"] = num(m2.group(1)), num(m2.group(2))
    m2 = re.search(r"(\d\d(?:\.\d+)?)\s*mm\s*/\s*(\d\d(?:\.\d+)?)\s*mm[^.]{0,40}?Turbine Wheel", body, re.I)
    if m2 and "turbineWheel" not in spec:
        spec["turbineWheel"], spec["turbineExducer"] = num(m2.group(1)), num(m2.group(2))
    mb = re.search(r"(\d\d(?:\.\d)?)\s*mm[^./]{0,60}?compressor wheel|compressor wheel[^.]{0,20}?(\d\d(?:\.\d)?)\s*mm|"
                   r"(\d\d(?:\.\d)?)\s*mm\s*(?:forged milled|billet|FMW|BBT)", body, re.I)
    if mb and "compressorInducer" not in spec:
        spec["compressorInducer"] = num(mb.group(1) or mb.group(2) or mb.group(3))
    if "turbineWheel" not in spec:
        for pat in (r"turbine wheel[^.]{0,30}?(?<![\d.])(\d\d)\s*mm", r"(?<![\d./])(\d\d(?:\.\d)?)\s*mm[^./]{0,30}?turbine wheel",
                    r"(\d\d)x\d\d\s*mm[^.]{0,20}?turbine"):
            mt = re.search(pat, body, re.I)
            if mt:
                spec["turbineWheel"] = num(mt.group(1))
                break
    mg = re.search(r"Compressor:\s*Inducer:\s*([\d.]+)\s*mm\s*Exducer:\s*([\d.]+)\s*mm(?:\s*Trim:\s*(\d+))?(?:\s*A/R:\s*([\d.]+))?"
                   r".{0,40}?Turbine:\s*Inducer:\s*([\d.]+)\s*mm\s*Exducer:\s*([\d.]+)\s*mm(?:\s*Trim:\s*(\d+))?", body, re.I)
    if mg:
        spec.setdefault("compressorInducer", num(mg.group(1)))
        spec["compressorExducer"] = num(mg.group(2))
        if mg.group(3):
            spec["compressorTrim"] = int(mg.group(3))
        if mg.group(4):
            spec["compressorAr"] = num(mg.group(4))
        spec.setdefault("turbineWheel", num(mg.group(5)))
        spec["turbineExducer"] = num(mg.group(6))
        if mg.group(7):
            spec["turbineTrim"] = int(mg.group(7))
    if "ar" not in spec:
        ma = AR.search(vt) or AR.search(t) or (AR.search(body) if re.search(r"A/R", body) and not re.search(r"Turbine Housing Options", body) else None)
        if ma:
            spec["ar"] = num(ma.group(1) or ma.group(2) or ma.group(3))
    mcm = re.search(r"(\d\d)\s*cm\b", both + " " + body, re.I)
    if mcm:
        spec["housingCm2"] = int(mcm.group(1))
    if re.search(r"\bVGT\b|\bVG\b|HE300VG|HE351VE|HE341VE|HE351VGT|\bVNT\b|AVNT|variable[- ]geometry|GT3788VA|B2BV|VGT actuator", both + " " + body, re.I):
        spec["vgt"] = True
    elif re.search(r"wastegate|PhatShaft|S300|S400|HX35|HX40|HY35|HE351CW|TP38", both + " " + body, re.I):
        spec["vgt"] = False
    mm_ = MODEL.search(t) or MODEL.search(body[:400])
    if mm_:
        spec["model"] = mm_.group(1).upper()
    ser = re.search(r"\bXR2\b|\bXR1\b|\bXR\b|Silver Bullet|Super PhatShaft|Viper|PhatShaft|Boxer|SX-?E|SX-?R|PowerMax|"
                    r"G-Series(?: II)?|G-XRace|\bEFR\b|Quick Spool|Billet Blade", t, re.I)
    if ser:
        spec["series"] = ser.group(0).replace("Powermax", "PowerMax")
    if re.search(r"\bkit\b", t, re.I) and not re.search(r"install", t, re.I):
        spec["kit"] = True
    if re.search(r"compound|twin|R2S", t, re.I):
        spec["compound"] = True
    if re.search(r"Polish", vt, re.I):
        spec["polished"] = not re.search(r"non", vt, re.I)
    mside = re.search(r"\b(Left|Right)\b(?: Side)?", t)
    if mside:
        spec["side"] = mside.group(1)[0]
    mhp = re.search(r"(?:supports?|capable of|handle|good for|rated(?: for)?)\s*(?:up to\s*)?(\d{3,4})\s*\+?\s*(?:rear-wheel )?(?:HP|hp|horsepower|RWHP)|"
                    r"up to (\d{3,4})\s*\+?\s*(?:rear-wheel )?(?:HP|hp|horsepower|RWHP)", body, re.I)
    if mhp:
        spec["hpCapable"] = int(mhp.group(1) or mhp.group(2))
    mr = re.search(r"HP\s*:\s*(\d{3,4})\s*-\s*(\d{3,4})", body)
    if mr:
        spec["hpLow"], spec["hpHigh"] = int(mr.group(1)), int(mr.group(2))
    # per-variant HP in kit option lists: "62/68 SX-E (up to 550hp)"
    if "compressorInducer" in spec and "turbineWheel" in spec:
        mk = re.search(rf"{spec['compressorInducer']}/{spec['turbineWheel']}\s*SX-E\s*\(up to (\d{{3,4}})hp\)", body, re.I)
        if mk:
            spec["hpCapable"] = int(mk.group(1))
    xr = re.search(r"(?:OEM ?/ ?Cross Reference(?: Numbers)?|Cross Reference / OEM Numbers|OEM/ Cross Reference|OEM Cross References?|Cross Reference)\s*:?\s*(.*?)"
                   r"(?=\s(?:Spec Sheet|Product Spec|Fitment|Installation|FAQ|Features|Key Features|Warranty|Turbocharger Specifications|Important|Why |Core Charge|$))", body)
    if xr:
        refs = cross_refs(xr.group(1))
        if refs:
            spec["replacesOem"] = refs
    mrep = re.search(r"Replaces (?:the )?(?:factory|OEM|stock)?\s*([A-Z]{2}\d{3}[A-Z]*|[A-Z]+\d{4}[A-Z]*)", body)
    if mrep:
        spec["replacesModel"] = mrep.group(1)
    spec["condition"] = condition_of(t, body)
    performance = bool(re.search(r"XR\d?\b|PhatShaft|Silver Bullet|Viper|Boxer|upgrade|performance|compound|SX-?E|SX-?R|PowerMax|"
                                 r"G-Series|G-XRace|Billet|BBT|S300|S400|Swap Kit|Turbo Kit", t, re.I))
    return spec, performance


def parse_manifold(p, body, v) -> tuple[dict, bool]:
    t, vt = p["title"], v["title"]
    spec = {}
    spec["type"] = "intake" if re.search(r"intake", t, re.I) else "exhaust"
    mp = re.search(r"(\d)[- ]Piece", t + " " + body, re.I)
    if mp:
        spec["pieces"] = int(mp.group(1))
    mf = re.search(r"\b(T[346])\b", t)
    if mf:
        spec["flange"] = mf.group(1)
    ms = re.search(r"(Driver|Passenger)s?\b", t, re.I)
    if ms:
        spec["side"] = ms.group(1).lower()
    if re.search(r"\bcast\b", t + " " + body, re.I):
        spec["material"] = "cast"
    elif re.search(r"stainless", t + " " + body, re.I):
        spec["material"] = "stainless"
    if vt != "Default Title":
        mfin = re.search(r"(Raw|Textured Black|Gloss Black|Custom Powder|Illusion Cherry|Illusion Lime Time)", vt)
        if mfin:
            spec["finish"] = mfin.group(1)
        if re.search(r"^Yes", vt):
            spec["variantNote"] = "2015/2016 model year version"
    if re.search(r"Pick ?Up", t, re.I):
        spec["variantNote"] = (spec.get("variantNote", "") + " pickup (not cab & chassis)").strip()
    mpn = re.search(r"BD PART NUMBER-?\s*(\d+)", body)
    if mpn:
        spec["mfrPn"] = mpn.group(1)
    performance = bool(re.search(r"upgrade|high[- ]flow|performance|T3|T4", t, re.I))
    return spec, performance


# --------------------------------------------------------------------------- record building
def make_name(cat: str, p: dict, v: dict, spec: dict, fits: list[dict]) -> str:
    t = p["title"]
    parts = []
    fam_txt = None
    y0, y1 = fits[0]["y0"], fits[0]["y1"]
    yrs = f"{y0}-{y1}" if y0 and y1 else (f"{y0}+" if y0 else None)
    if cat == "injector":
        kind = ("competition " if re.search(r"competition", t, re.I) else
                "performance " if spec.get("pctOver") or spec.get("hpRating") else
                "stock " if spec.get("pctOver") == 0 else "")
        parts.append(f"{spec.get('condition') or ''} {kind}injector".strip())
        if spec.get("pctOver"):
            parts.append(f"{spec['pctOver']}% over")
        if spec.get("hpRating"):
            parts.append(f"{spec['hpRating']} HP")
        if spec.get("nozzleCc"):
            parts.append(f"{spec['nozzleCc']} cc")
        if spec.get("set"):
            parts.append("set")
    elif cat == "injectionPump":
        parts.append(f"{spec.get('condition') or ''} {spec.get('type', 'injection')} {'pump kit' if spec.get('kit') else 'pump'}".strip())
        if spec.get("dual"):
            parts.insert(1, "dual")
        if spec.get("pctOver"):
            parts.append(f"{spec['pctOver']}% over")
        if spec.get("strokerMm"):
            parts.append(f"{spec['strokerMm']} mm stroker")
        if spec.get("hpRating"):
            parts.append(f"{spec['hpRating']} HP")
        if spec.get("grade"):
            parts.append(spec["grade"])
    elif cat == "turbo":
        head = []
        if spec.get("series"):
            head.append(spec["series"])
        if spec.get("model"):
            head.append(spec["model"])
        head.append("compound turbo kit" if spec.get("compound") else "turbo kit" if spec.get("kit") else "turbo")
        parts.append(" ".join(head))
        if spec.get("compressorInducer"):
            parts.append(f"{spec['compressorInducer']} mm compressor")
        if spec.get("turbineWheel"):
            parts.append(f"{spec['turbineWheel']} mm turbine")
        if spec.get("ar"):
            parts.append(f"{spec['ar']:.2f} A/R")
        if spec.get("polished"):
            parts.append("polished")
        if spec.get("side"):
            parts.append("left" if spec["side"] == "L" else "right")
        if spec.get("condition"):
            parts.append(spec["condition"])
    else:
        parts.append(f"{spec.get('type')} manifold")
        if spec.get("pieces"):
            parts.append(f"{spec['pieces']}-piece")
        if spec.get("flange"):
            parts.append(spec["flange"])
        if spec.get("side"):
            parts.append(f"{spec['side']} side")
        if spec.get("finish"):
            parts.append(spec["finish"].lower())
    if yrs:
        parts.append(yrs)
    fam_txt = fits[0]["fam"] + (f" {fits[0]['notes']}" if fits[0].get("notes") and fits[0]["fam"] == "Duramax 6.6" else "")
    parts.append(fam_txt)
    return ", ".join(x for x in parts if x)


def extract(products: list[dict], stats: Stats) -> list[dict]:
    recs = []
    for p in products:
        title = re.sub(r"\s+", " ", p["title"]).strip()
        body = strip_html(p.get("body_html", ""))
        cat, reason = classify(p, body)
        label = f"{p['variants'][0].get('sku') or '-'} {title}"
        if reason:
            stats.skip(reason, label)
            continue
        brand = VENDOR_NAME.get(p.get("vendor") or "", p.get("vendor") or "Industrial Injection")
        url = f"https://www.industrialinjection.com/products/{p['handle']}"
        fits = merge_fits(tag_fitment(p.get("tags", [])))
        fit_src = "tags"
        if not fits:
            fits = merge_fits(title_fitment(title, body))
            fit_src = "title"
        if not fits:
            if cat == "turbo" and ("universal turbos" in [x.lower() for x in p["tags"]] or
                                   re.search(r"\bS[234]00|\bS[234]\d\d|G-Series|G-XRace|GTX?\d{4}|EFR|Super Core|\bS1B", title)):
                fits = [{"fam": "Universal", "y0": None, "y1": None, "notes": None, "src": "universal"}]
                fit_src = "universal"
            else:
                stats.skip("no fitment in tags, title or body", label)
                continue
        stages = injector_body_stages(body) if cat == "injector" else {}
        for v in p["variants"]:
            sku = (v.get("sku") or "").strip()
            vt = re.sub(r"\s+", " ", v["title"]).strip()
            if not sku:
                stats.skip("variant without SKU (phantom 'Default Title' variant)", f"{title}: {vt}")
                continue
            if cat == "injector":
                spec, perf = parse_injector(p, body, v, stages)
            elif cat == "injectionPump":
                spec, perf = parse_pump(p, body, v)
            elif cat == "turbo":
                spec, perf = parse_turbo(p, body, v)
            else:
                spec, perf = parse_manifold(p, body, v)
            emis = emissions_for(title, body, perf)
            if cat == "injector" and "pctOver" not in spec:
                stats.qa.append(f"{brand} {sku}: performance injector without a % over figure: {title} / {vt}")
            if cat == "turbo" and "compressorInducer" not in spec:
                if perf:
                    stats.qa.append(f"{brand} {sku}: performance turbo without compressor wheel size in title/variant/body: {title}")
                else:
                    stats.no_wheel_stock += 1
            if cat == "turbo" and spec.get("compressorInducer", 0) >= 80 and fits[0]["fam"] != "Universal":
                stats.qa.append(f"{brand} {sku}: compressor wheel {spec['compressorInducer']} mm quoted on a pickup turbo; "
                                f"probably the exducer/major diameter: {title}")
            if re.search(r"[A-Za-z]{4,} \d", sku):
                stats.qa.append(f"{brand} {sku}: SKU looks like an internal placeholder: {title}")
            if fit_src == "title":
                stats.qa.append(f"{brand} {sku}: fitment from title (no fitment tag): {title} -> {[f['fam'] for f in fits]}")
            for f in fits:
                fam = f["fam"]
                if fam not in FAM:
                    stats.unknown_fams[fam] += 1
                fit = {"fam": fam, "ci": FAM.get(fam, {}).get("ci"), "cyl": FAM.get(fam, {}).get("cyl", UNKNOWN_FAM_CYL.get(fam)),
                       "y0": f["y0"], "y1": f["y1"], "notes": f.get("notes")}
                rec = {
                    "m": brand, "p": sku, "cat": cat,
                    "name": make_name(cat, p, v, spec, [f]),
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
        stats.merged_dupes.append(f"{r['m']} {r['p']} [{r['fit']['fam']}]: kept '{kept['name']}' / dropped '{r['name']}'")
    return [seen[k] for k in order]


NUMERIC_KEYS = {"pctOver", "hpRating", "hpRatingLow", "nozzleCc", "nozzleFlow", "hpCapable", "strokerMm", "compressorInducer",
                "compressorExducer", "compressorTrim", "compressorAr", "turbineWheel", "turbineExducer", "turbineTrim", "ar",
                "housingCm2", "hpLow", "hpHigh", "pieces"}


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
    L.append("# INDUSTRIAL extraction notes (Industrial Injection)\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_industrial.py`. Source: public Shopify "
             f"`https://www.industrialinjection.com/products.json?limit=250&page=N`.\n")
    L.append("## Fetch\n")
    L.append(f"- robots.txt: {stats.robots_note}.")
    L.append(f"- `{HOST}`: {stats.pages} page request(s) of 250 products, {stats.products} products in the listing; "
             f"requests spaced 10 s apart (one request at a time). Pages cached under `dl/industrial/`.")
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
    L.append("- **Scope**: the listing mixes Industrial Injection's own performance products with a bulk-imported "
             "distribution catalog (Bosch, Garrett, BorgWarner, Holset, Alliant Power, Denso, Delphi, Stanadyne, PAI, "
             "BD Diesel, H&S Motorsports, FASS...). Only `injector`, `injectionPump`, `turbo` and `manifold` are emitted; "
             "`m` is the brand named in the listing's vendor field (so a BD manifold or Bosch stock injector resold by "
             "Industrial Injection is filed under BD Diesel / Bosch), and `src.doc` says it came from industrialinjection.com.")
    L.append("- **Skipped by rule**: apparel/decals/gift cards/additives/tools; heavy-duty (tags `heavy duty`, `Cat Heavy "
             "Duty`, `Detroit Heavy Duty`, `Navistar Heavy Duty`, ISX/N14/X15/C15/3406E/DT466/Series 60, vendor "
             "`Industrial Injection HD`, product type `Heavy Duty Turbocharger`, and bulk-catalog items whose "
             "`Fits X applications` lead-in names Cat/Detroit/Navistar/Paccar/Volvo/Mack/Komatsu/Mercedes...); "
             "emissions-system parts (EGR valves/adapters) and anything titled 'delete'. Nozzles, lift pumps (FASS), "
             "injector lines/kits, turbo parts (actuators, CHRAs, super cores, install kits, piping), engine parts, "
             "pistons, heads and blocks are outside the task's four categories and are counted below.")
    L.append("- **Fitment** comes from the site's fitment tags (`cummins 2004.5 - 2007 5.9l`, `duramax 2006 - 2007 6.6l "
             "lly-lbz`, `power stroke 2011 - 2022 6.7L`...). Several tags on one product that resolve to the same family "
             "are merged into one record spanning min(y0)..max(y1) (`2019+` style tags leave `y1` unset); the Duramax "
             "engine codes (LB7/LLY/LBZ/LMM/LGH/LML/L5P) go to `fit.notes`. Half-year model breaks are floored "
             "(`2004.5` -> `y0: 2004`, `from 2004.5` in notes). Cummins 5.9 tags map to `Cummins 5.9 12V` when the "
             "range ends by 1998 and to `Cummins 5.9 24V/CR` from 1998.5. Products without a fitment tag fall back to the "
             "title (year range + engine words), and each such record is flagged below; a product with no fitment at all "
             "is skipped unless it is a universal performance turbo (BorgWarner S200/S300/S400/EFR, Garrett G-Series/"
             "G-XRace/GTX super cores), which is filed under `Universal`.")
    L.append("- **Injectors**: one record per variant. `pctOver` from the variant title (`25% Over`, `R3 40%`), "
             "`hpRating` from `100HP` / `50-60Hp` (upper bound; `hpRatingLow` keeps the lower one), `nozzleCc` from "
             "`120CC`/`145cc` (7.3/6.0 Power Stroke), `nozzleFlow` in LPM from the variant title or the per-stage "
             "'Choosing the Right Injector' accordion in the body, which also gives `fuelRec` (the CP3 / fuel-system "
             "recommendation printed for that stage), `turboUpgrade` and `hpCapable`. `stage` is the II grade code "
             "(DFLY, R1..R6) from the SKU suffix. Stock/OEM listings get `pctOver: 0`. `condition` new/reman.")
    L.append("- **Injection pumps**: `type` CP3/CP4/VP44/P7100/VE/DB2/HPOP/HP4/DCR/K16 from the title; `pctOver` from the "
             "variant (`33% Over`, `Modified 42 CP3` -> 42, `Double Dragon 120` -> 120); `strokerMm` (10/12 mm stroker); "
             "`grade` Modified / Dragon Fire / Double Dragon / Hot Rod (from the variant or the SHO/DF/DD SKU suffix); "
             "`hpRating` for P7100/VP44 listings; `dual`, `kit` (dual-CP3 kits, CP3 conversion/retrofit kits with pump). "
             "HEUI high-pressure oil pumps (Power Stroke HPOP) are filed as `injectionPump` with `type: HPOP`.")
    L.append("- **Turbos**: `compressorInducer`/`turbineWheel` (mm) from `64mm/64mm`, `64.5MM/72MM`, kit variants "
             "`62/68`, BorgWarner `S464`/`S467.7`/`S364.5`, `Boxer 58`, and the body ('64mm Billet Blade Technology "
             "compressor wheel', '68mm turbine wheel', Garrett 'Compressor: Inducer: 73.9mm Exducer: 102mm Trim: 52 "
             "A/R: 0.85' -> also `compressorExducer`, `compressorTrim`, `compressorAr`, `turbineExducer`, `turbineTrim`); "
             "`ar` from `.91 A/R`, `1.00 Turbine`, `0.83 A/R V-Band Inlet`; `housingCm2` from '14 cm exhaust housing'; "
             "`vgt` true for HE300VG/HE351VE/AVNT/GT3788VA/B2BV/variable-geometry units, false for wastegated "
             "PhatShaft/S300/S400/HX35/HY35/TP38; `model` is the turbo frame (HE351VGT, GT3788VA, S300SX-E, K03...); "
             "`series` XR1/XR2/PhatShaft/Silver Bullet/Viper/Boxer/SX-E/PowerMax/G-Series; `kit`, `compound`, "
             "`polished` (variant), `side` L/R (twin-turbo gas applications), `hpCapable` ('supports up to 600 "
             "horsepower'), `hpLow`/`hpHigh` (Garrett 'HP : 750-1550'), `replacesOem` (the listing's OEM / cross "
             "reference part numbers, max 25), `replacesModel` ('Replaces the factory HE300VG').")
    L.append("- **Manifolds**: `type` intake/exhaust, `pieces`, `flange` (T3/T4), `side`, `material`, `finish` "
             "(H&S powder-coat variants), `mfrPn` (BD's own number when the SKU carries a prefix).")
    L.append("- **emissions**: `carb_eo:D-xxx-x` when the body prints a CARB EO number; else `oem_replacement` for "
             "stock/OEM/genuine/direct-replacement listings; else `no_eo_race_only` when the body carries Industrial "
             "Injection's 'Not Legal For On-Road... Dedicated Competition Use Only' disclaimer or 'CAN NOT SHIP TO "
             "CALIFORNIA'; else `unknown`. DPF/DOC/SCR/EGR delete parts: none found in the four categories (the only "
             "'delete' item is a FASS fuel-filter delete kit, skipped).\n")
    L.append("## Skipped\n")
    for reason, n in sorted(stats.skipped.items(), key=lambda x: -x[1]):
        L.append(f"- **{reason}**: {n}")
        for item in stats.skipped_items[reason][:8]:
            L.append(f"  - {item}")
        if n > 8:
            L.append(f"  - ... {n - 8} more")
    L.append("")
    if stats.merged_dupes:
        L.append("## Duplicate SKUs merged (same brand + part number + family; first occurrence kept)\n")
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
    L.append("- The www host answers `/products.json` directly but 301s `/robots.txt` to the bare host; see Fetch above.")
    L.append("- `m` is the listing's vendor, so resold Bosch/Garrett/BorgWarner/Holset/BD/H&S parts are filed under those "
             "brands with `src.doc` = industrialinjection.com. Industrial Injection's own SKUs for Bosch-based reman "
             "injectors/pumps (`0986435505SE-R1`, `-IIS` suffixes) stay under the vendor the site names for that listing "
             "(some stock Bosch reman listings carry vendor `Bosch`, their II-reman twins vendor `Industrial Injection`).")
    L.append("- Injector `hpRating` is the gain the site quotes for that stage ('100HP 20% Over'), not engine output. "
             "7.3L Power Stroke stages quote `120CC/15% 50-60Hp`: `nozzleCc` 120, `pctOver` 15, `hpRating` 60, `hpRatingLow` 50.")
    L.append("- Injection-pump `pctOver` for `Modified 42 CP3` / `Dragon Fire 85` / `Double Dragon 120` variants is taken "
             "from the bare number (the site writes `42% Over` on sibling listings).")
    L.append("- `Cummins 5.9 12V` vs `24V/CR` for products that only say '5.9 Cummins' is decided by the year range "
             "(ends <= 1998 -> 12V; starts >= 1998.5 -> 24V/CR; spans 1998 -> one record per family).")
    L.append("- Turbo `compressorInducer` for XR units is the billet wheel size the title quotes (e.g. `64.5mm BBT`); "
             "for PhatShaft variants it is the variant's `62mm/64mm/66mm/69mm` option; `turbineWheel` comes from the body.")
    L.append("- The S300 SX-E single turbo kit lists SKU 227436 for two different variants (62/74 1.0 A/R and 64/68 1.0 A/R) "
             "on the site; the first is kept and the duplicate is listed above. Verify with Industrial Injection.")
    L.append("- Universal BorgWarner S200/S300/S400/EFR and Garrett G-Series/G-XRace/GTX turbos have no vehicle fitment on "
             "the site and are filed under `fit.fam: \"Universal\"`.")
    L.append("- Turbo 'kits' (PhatShaft/S300/S400/Boxer swap kits, compound kits) are `turbo` records with `spec.kit: true`; "
             "the compressor/turbine sizes are those of the kit's turbo. Install-only kits (no turbo) are skipped.\n")
    L.append(f"- {stats.no_wheel_stock} stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the "
             "OEM/Garrett/Holset/BorgWarner part number); they are not listed individually below.\n")
    L.append("Per-record flags:\n")
    for q in stats.qa:
        L.append(f"- {q}")
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
        rf = DL / "robots.txt"
        stats.robots_note = ("robots.txt fetched and parsed; /products.json allowed" if rf.exists() and
                             any(not l.startswith("#") and l.strip() for l in rf.read_text().splitlines()) else
                             "robots.txt could not be read (www redirects it to the bare host, which this environment's "
                             "network allowlist blocks); proceeded on the brief's stated Crawl-delay 10 and Shopify's "
                             "standard disallow list (which does not cover /products.json)")
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
            "task": "INDUSTRIAL",
            "brand": "Industrial Injection",
            "doc": SRC_DOC,
            "url": f"https://{HOST}/products.json?limit=250&page=N",
            "edition": EDITION,
            "note": "m is the brand named on each listing; resold Bosch/Garrett/BorgWarner/Holset/BD/H&S parts keep their own brand",
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "industrial.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(OUT / "industrial.md", recs, stats, counts, errs)
    log(f"wrote {len(recs)} records; {len(errs)} validation errors; {len(stats.qa)} QA flags")
    for e in errs[:20]:
        log("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
