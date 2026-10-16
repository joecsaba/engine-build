#!/usr/bin/env python3
"""Parts catalog extractor: ROCKERS (Scorpion Racing Products + Harland Sharp).

Both manufacturers run Shopify stores, so the public `/products.json` listing is the
source. Fetches are cached under `dl/rockers/` (gitignored) so the parse step is
re-runnable offline; delete the cache to refresh.

    python -I scripts/parts-catalog/extract_rockers.py            # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_rockers.py --offline  # parse the cache only

Writes `out/rockers.json` and `out/rockers.md` next to this file. Nothing else is written
outside `dl/` and `out/`.
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
DL = HERE / "dl" / "rockers"
OUT = HERE / "out"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
EDITION = dt.date.today().strftime("%Y-%m")

HOSTS = {
    "scorpionracingproducts.com": "Scorpion",
    "harlandsharp.com": "Harland Sharp",
}

# fit.fam strings must match artifacts/engine-build/public/data/cam-fitment.json
FAM_CYL = {
    "Small-block Chevy": 8, "Chevy Mark IV big block": 8, "Chevy Gen VI big block": 8,
    "GM LS": 8, "Small-block Ford (Windsor)": 8, "Ford 351C/351M/400": 8, "Ford 429/460": 8,
    "Ford FE": 8, "Ford 240/300 inline-6": 6, "Mopar LA small block": 8,
    "Mopar Magnum 5.2/5.9": 8, "Mopar B/RB big block": 8, "Pontiac V8": 8, "Oldsmobile V8": 8,
    "Buick big block": 8, "Buick V6 181-252": 6, "AMC V8": 8, "AMC/Jeep inline-6": 6,
    "Chevy inline-6": 6,
}
# Families not in cam-fitment.json: catalog heading kept verbatim, flagged in the notes.
UNKNOWN_CYL = {
    "Ford 3.8/4.2 V6": 6, "Ford CVH 1.9 inline-4": 4, "Dodge Magnum 3.9 V6": 6,
    "Dodge Viper V10": 10, "Chevy Corvair": 6, "Triumph Spitfire/Herald 4-cyl": 4,
    "Triumph TR6 inline-6": 6, "Triumph TR4": 4, "BMC B-series (MGB)": 4,
    "BMC A-series 1275": 4, "BMC A-series 948-1100": 4, "Universal": None,
}

STUD_IN = {"5/16": 0.3125, "3/8": 0.375, "7/16": 0.4375, "8mm": 0.315, "8 mm": 0.315}


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = (text.replace("&amp;", "&").replace("&nbsp;", " ").replace("&quot;", '"')
            .replace("&#39;", "'").replace("&rsquo;", "'").replace("&lsquo;", "'")
            .replace("&rdquo;", '"').replace("&ldquo;", '"'))
    return re.sub(r"\s+", " ", text).strip()


def frac_inch(s: str) -> float | None:
    s = s.strip().lower().replace(" ", "")
    return STUD_IN.get(s)


def find_stud(text: str) -> tuple[float | None, str | None]:
    """Return (inches, metric label) for the first stud/bolt size mentioned."""
    m = re.search(r"\b(5/16|3/8|7/16)\b|\b(8\s?mm)\b", text, re.I)
    if not m:
        return None, None
    if m.group(2):
        return 0.315, "M8"
    return frac_inch(m.group(1)), None


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


# --------------------------------------------------------------------------- fetch
def fetch_all(host: str, session) -> list[dict]:
    """Page through /products.json honoring robots.txt and the 6 s floor; cache to DL."""
    DL.mkdir(parents=True, exist_ok=True)
    robots_file = DL / f"{host}_robots.txt"
    rp = urllib.robotparser.RobotFileParser()
    if not robots_file.exists():
        r = session.get(f"https://{host}/robots.txt", timeout=60)
        robots_file.write_text(r.text if r.status_code == 200 else "")
        time.sleep(MIN_DELAY)
    rp.parse(robots_file.read_text().splitlines())
    if not rp.can_fetch(UA, f"https://{host}/products.json"):
        raise SystemExit(f"{host}: robots.txt disallows /products.json; stopping")
    delay = max(MIN_DELAY, rp.crawl_delay(UA) or 0)

    products = []
    page = 1
    while True:
        cache = DL / f"{host}_p{page}.json"
        if cache.exists():
            data = json.loads(cache.read_text())
        else:
            url = f"https://{host}/products.json?limit=250&page={page}"
            r = session.get(url, timeout=60)
            log(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
            if r.status_code in (403, 429) or "Just a moment" in r.text[:2000]:
                raise SystemExit(f"{host}: blocked ({r.status_code}); not retrying")
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


def load_cache(host: str) -> list[dict]:
    products = []
    for f in sorted(DL.glob(f"{host}_p*.json"), key=lambda p: int(p.stem.rsplit("_p", 1)[1])):
        products.extend(json.loads(f.read_text()).get("products", []))
    return products


# --------------------------------------------------------------------------- shared parsing
RATIO_SPLIT = re.compile(
    r"\b(1\.\d{1,3})\s*(?:i|-I|:1)?\s*/\s*(1\.\d{1,3})\s*(?:e|-E|:1)?(?!\d)", re.I)
RATIO_SINGLE = re.compile(r"\b(1\.\d{1,3})(?:F\b|\s*[:.]\s*1\b|\b)")


def parse_ratios(text: str) -> tuple[float | None, float | None]:
    """(intake ratio, exhaust ratio or None). Ratios live in 1.3-2.0 for rockers."""
    m = RATIO_SPLIT.search(text)
    if m:
        a, b = float(m.group(1)), float(m.group(2))
        if 1.2 <= a <= 2.1 and 1.2 <= b <= 2.1:
            return a, (b if b != a else None)
    for m in RATIO_SINGLE.finditer(text):
        v = float(m.group(1))
        if 1.2 <= v <= 2.1:
            return v, None
    return None, None


class Stats:
    def __init__(self):
        self.skipped = collections.Counter()
        self.skipped_items = collections.defaultdict(list)
        self.qa = []
        self.fam_counts = collections.Counter()
        self.unknown_fams = collections.Counter()
        self.merged_dupes = []
        self.requests = {}

    def skip(self, brand, reason, label):
        self.skipped[(brand, reason)] += 1
        self.skipped_items[(brand, reason)].append(label)


# --------------------------------------------------------------------------- Scorpion
SC_HEAD_CUT = re.compile(
    r"Rockers for this engine|Specific features include|Race Series Rocker Arms from|"
    r"Endurance Series Rocker Arms from|Marine Endurance Series Rocker Arms have|"
    r"Made in the USA!|Features include|For the 20\+ years|All Scorpion Rocker Arms Feature|"
    r"Scorpion Racing Products Endurance Series Shaft Mount Rocker Arms Race|"
    r"Scorpion Off Road Series Rocker Arms|Key Benefits", re.I)
SC_NOT_ROCKER = re.compile(
    r"Polylock|Rocker Arm Nut|Rocker Arm Bolt|Stand Bolt|8mm Bolts|Stabilizer|Girdle|"
    r"Fuel Rail|Shim|Rocker Arm Stand|Rocker Arm Shaft \d|Hardware Kit|U-Channel|Adjuster|"
    r"Pedestal Set|Pedestal Sold|Pedestal Mount Each|L-92 Rocker Arm Pedestal|Pedestal Mount Rocker Arms Scorpion",
    re.I)
SC_FASTENER = re.compile(r"Polylock|Rocker Arm Nut|Rocker Arm Bolt|Stand Bolt|8mm Bolts|Stabilizer Nut", re.I)


def sc_families(title: str, head: str, tags: list[str]) -> tuple[list[str], str | None]:
    """Return (families, note). Title tokens first, then the body's lead-in, then tags."""
    t = title
    h = head
    if re.search(r"\bJeep\b", t) or re.search(r"In-?Line 6", h, re.I):
        return ["AMC/Jeep inline-6"], None
    if re.search(r"\bAMC\b", t):
        return ["AMC V8"], None
    if re.search(r"\bOlds\b", t):
        return ["Oldsmobile V8"], None
    if re.search(r"\bPontiac\b", t):
        return ["Pontiac V8"], None
    if re.search(r"SB Chrysler", t, re.I):
        # 5/16 pedestal-bolt rockers are the Magnum head pattern (LA heads use shafts)
        return ["Mopar Magnum 5.2/5.9"], "5/16 pedestal mount (Magnum-style head)"
    if re.search(r"\bL92\b|\bLS\d\b|\bLS\b|\bL76\b|\bL99\b", t):
        return ["GM LS"], None
    if re.search(r"\bBBF\b", t):
        if re.search(r"V-?6|3\.8L", t) or re.search(r"Ford V-6 3\.8L", h):
            return ["Ford 3.8/4.2 V6"], None
        fams = ["Ford 429/460"]
        if re.search(r"351C", h):
            fams.insert(0, "Ford 351C/351M/400")
        return fams, None
    if re.search(r"Ford I-6", t):
        return ["Ford 240/300 inline-6"], None
    if re.search(r"\bSBF\b|SBFShaft|Twisted Wedge|AFR/Roush|N Head", t):
        return ["Small-block Ford (Windsor)"], None
    if re.search(r"\bBBC\b", t) or re.search(r"Big Block Chevy", h, re.I):
        return ["Chevy Mark IV big block", "Chevy Gen VI big block"], None
    if re.search(r"\bSBC\b", t) or re.search(r"Small Block Chevy|Chevy V-8|Chevy V-6", h, re.I):
        note = "Chevy 4.3 V6" if re.search(r"V-6", t + " " + h) else None
        return ["Small-block Chevy"], note
    if re.search(r"\bSBF\b|Small Block Ford|302W|351W", h):
        return ["Small-block Ford (Windsor)"], None
    if "Universal" in tags:
        return ["Universal"], None
    return [], None


def sc_qty(title: str, head: str) -> int | None:
    for pat in (r"Set of (\d+)", r"(\d+) Set\b", r"Sold [Aa]s a? ?(\d+)", r"Set (12|16)\b"):
        m = re.search(pat, title)
        if m:
            return int(m.group(1))
    if re.search(r"\bPair\b", title):
        return 2
    if re.search(r"\bEach\b|\bSingle\b", title):
        return 1
    if re.search(r"Rocker Arm\b(?!s)", title) and not re.search(r"Rocker Arms|\bSet\b|\bKit\b", title):
        return 1
    m = re.search(r"Set of (\d+)", head)
    if m:
        return int(m.group(1))
    if re.search(r"Single [Pp]iece", head):
        return 1
    return None


def extract_scorpion(products: list[dict], stats: Stats) -> list[dict]:
    recs = []
    brand = "Scorpion"
    for p in products:
        title = re.sub(r"\s+", " ", p["title"]).strip()
        body = strip_html(p.get("body_html", ""))
        m = SC_HEAD_CUT.search(body)
        head = body[: m.start()] if m else body[:400]
        tags = p.get("tags", [])
        sku = (p["variants"][0].get("sku") or "").strip()
        url = f"https://scorpionracingproducts.com/products/{p['handle']}"
        label = f"{sku} {title}"
        if not sku:
            stats.skip(brand, "no SKU", label)
            continue
        if re.search(r"Fuel Rail", title, re.I):
            stats.skip(brand, "fuel rail (no category)", label)
            continue
        if re.search(r"Girdle|Valvetrain Stabilizer(?! Nut)", title, re.I):
            stats.skip(brand, "stud girdle (no category)", label)
            continue

        if SC_FASTENER.search(title):
            dia, metric = find_stud(title)
            if re.search(r"Stabilizer Nut", title, re.I):
                app = "stud girdle nut"
            elif re.search(r"Polylock|Rocker Arm Nut", title, re.I):
                app = "rocker polylock nut"
            elif re.search(r"Stand Bolt", title, re.I):
                app = "rocker shaft stand bolt"
            else:
                app = "rocker arm bolt"
            qty = sc_qty(title, head)
            rec = {
                "m": brand, "p": sku, "cat": "fastener",
                "name": f"{app}, {metric or ''}{'' if metric else (str(dia) + ' in')}".replace("  ", " "),
                "fit": {"fam": "Universal", "notes": None},
                "spec": {"application": app, "diameter": dia, "metric": metric,
                         "material": "steel" if re.search(r"\bsteel\b", title + head, re.I) else None,
                         "qty": qty},
                "src": {"doc": "scorpionracingproducts.com Shopify products.json", "edition": EDITION, "url": url},
                "emissions": None,
            }
            recs.append(rec)
            continue

        if SC_NOT_ROCKER.search(title) or not re.search(r"Rocker", title, re.I):
            stats.skip(brand, "valvetrain hardware (pedestal/shim/stand/shaft/adjuster/U-channel)", label)
            continue

        ratio, ratio_exh = parse_ratios(title)
        if ratio is None:
            m2 = re.search(r"Ratio\s+(1\.\d{1,3})", head)
            if m2:
                ratio = float(m2.group(1))
            else:
                ratio, ratio_exh = parse_ratios(head)
        if ratio is None:
            stats.qa.append(f"Scorpion {sku}: no ratio found in title/body: {title}")

        fams, note = sc_families(title, head, tags)
        if not fams:
            stats.qa.append(f"Scorpion {sku}: no engine family from title/body/tags {tags}: {title}")
            fams = [tags[0] if tags else "Unknown"]

        # mount type: title wins, then the body lead-in
        src_text = title
        if re.search(r"Shaft", src_text, re.I):
            mtype = "shaft"
        elif re.search(r"Ped\b|Pedestal", src_text, re.I):
            mtype = "pedestal"
        elif re.search(r"Stud", src_text, re.I):
            mtype = "stud"
        elif re.search(r"Shaft Mount|Shaft Rocker", head, re.I):
            mtype = "shaft"
        elif re.search(r"Pedestal", head, re.I):
            mtype = "pedestal"
        elif re.search(r"Stud Mount", head, re.I):
            mtype = "stud"
        else:
            mtype = None

        stud = metric = None
        if mtype != "shaft":
            stud, metric = find_stud(title)
            if stud is None:
                m3 = re.search(r"(5/16|3/8|7/16|8\s?mm)[- ]+(?:Inch )?(?:Stud|Ped)", head, re.I)
                if m3:
                    stud, metric = find_stud(m3.group(0))
            if mtype is None and stud is not None:
                # Scorpion convention: 3/8 and 7/16 are rocker studs, 5/16 and 8 mm are pedestal bolts
                mtype = "stud" if stud >= 0.375 else "pedestal"
                stats.qa.append(f"Scorpion {sku}: mount type inferred from {metric or stud} size: {title}")
            if stud is None and mtype in ("stud", "pedestal"):
                stats.qa.append(f"Scorpion {sku}: {mtype} mount but no stud/bolt size: {title}")
        if mtype is None:
            stats.qa.append(f"Scorpion {sku}: mount type not stated: {title}")

        if re.search(r"Steel Bodies", title, re.I):
            material = "steel"
        elif re.search(r"Aluminum Bod", body, re.I) or re.search(r"aluminum", head, re.I):
            material = "aluminum"
        else:
            material = None

        series = None
        for s in ("Race Series", "Endurance Series", "Marine Endurance", "Off-Road Series",
                  "Narrow Body", "Self Aligning", "Shaft Mount", "Dart Pro", "AFR Eliminator",
                  "Twisted Wedge"):
            if re.search(re.escape(s), title, re.I):
                series = s
                break
        if series is None:
            for s in ("Race Series", "Endurance Series", "Off Road Series", "Shaft Mount"):
                if re.search(re.escape(s), head, re.I):
                    series = s
                    break

        adjustable = None
        if re.search(r"Non[- ]?Adj?ustable", title + " " + head, re.I):
            adjustable = False
        elif re.search(r"\bAdjustable", title + " " + head, re.I):
            adjustable = True

        offset = side = None
        mo = re.search(r"(\d?\.\d{3})\s*(?:Inch|inch|\")?\s*(?:(Left|Right)\s+)?Offset", title) or \
            re.search(r"(\d?\.\d{3})\s*(?:Inch|inch|\")?\s*(?:(Left|Right)\s+)?Offset", head)
        if mo:
            offset = float(mo.group(1))
        ms = re.search(r"\b(Left|Right)\b", title)
        if ms:
            side = ms.group(1)[0]
        elif re.search(r"\bOffset\b", title) and offset is None:
            offset = None  # offset mentioned, value not given
        offset_flag = bool(re.search(r"\bOffset\b", title)) or offset is not None

        qty = sc_qty(title, head)

        parts = [f"{ratio}" + (f"/{ratio_exh}" if ratio_exh else "") + " ratio roller rocker" if ratio else "roller rocker"]
        if mtype:
            parts.append({"stud": f"{metric or stud} stud" if (metric or stud) else "stud mount",
                          "pedestal": f"{metric or stud} pedestal mount" if (metric or stud) else "pedestal mount",
                          "shaft": "shaft mount"}[mtype])
        if series:
            parts.append(series)
        if offset is not None:
            parts.append(f"{offset} {('L' if side == 'L' else 'R' if side == 'R' else '')} offset".replace("  ", " ").strip())
        elif side:
            parts.append(f"{'left' if side == 'L' else 'right'} offset")
        if qty:
            parts.append({1: "single", 2: "pair"}.get(qty, f"set of {qty}"))
        name = ", ".join(parts)

        for fam in fams:
            fam_note = note
            if fam in UNKNOWN_CYL and fam != "Universal":
                stats.unknown_fams[fam] += 1
            rec = {
                "m": brand, "p": sku, "cat": "rocker", "name": name,
                "fit": {"fam": fam, "cyl": FAM_CYL.get(fam, UNKNOWN_CYL.get(fam)),
                        "notes": fam_note},
                "spec": {"ratio": ratio, "ratioExh": ratio_exh, "stud": stud, "studMetric": metric,
                         "type": mtype, "material": material, "series": series,
                         "adjustable": adjustable, "offset": offset,
                         "offsetSide": side if offset_flag else None, "qty": qty},
                "src": {"doc": "scorpionracingproducts.com Shopify products.json", "edition": EDITION, "url": url},
                "emissions": None,
            }
            if fam_note == "Chevy 4.3 V6":
                rec["fit"]["cyl"] = 6
            recs.append(rec)
    return recs


# --------------------------------------------------------------------------- Harland Sharp
HS_FAMILIES = [  # (regex on product title + product_type, families)
    (r"Canfield 225|Small Block Chev", ["Small-block Chevy"]),
    (r"Big Block Chev", ["Chevy Mark IV big block", "Chevy Gen VI big block"]),
    (r"Chevy Inline 6", ["Chevy inline-6"]),
    (r"Corvair", ["Chevy Corvair"]),
    (r"GM LS|LS1/LS6|LS7|L92 Heads", ["GM LS"]),
    (r"Big Block Ford", ["Ford 351C/351M/400", "Ford 429/460"]),
    (r"\bFE\b|FE Ford", ["Ford FE"]),
    (r"Ford Inline 6", ["Ford 240/300 inline-6"]),
    (r"Ford 3\.8 V6", ["Ford 3.8/4.2 V6"]),
    (r"CVH|Escort", ["Ford CVH 1.9 inline-4"]),
    (r"Small Block Ford|SBF|Ford Racing Z304|Trickflow (Street|Highport|Twisted Race) Heads|"
     r"AFR 185-205-225 Heads|Brodix T1F Heads|Edelbrock Victor Jr\. Heads", ["Small-block Ford (Windsor)"]),
    (r"Small Block Mopar|W2|Trans Am", ["Mopar LA small block"]),
    (r"Big Block Mopar|Edelbrock Victor|Max Wedge|Indy 440|Brodix B1BS|Stage IV|BB Mopar", ["Mopar B/RB big block"]),
    (r"Magnum V8", ["Mopar Magnum 5.2/5.9"]),
    (r"Magnum V6", ["Dodge Magnum 3.9 V6"]),
    (r"Viper", ["Dodge Viper V10"]),
    (r"Oldsmobile", ["Oldsmobile V8"]),
    (r"Pontiac", ["Pontiac V8"]),
    (r"AMC V8", ["AMC V8"]),
    (r"AMC/Jeep Inline 6|AMC Inline 6", ["AMC/Jeep inline-6"]),
    (r"Big Block Buick", ["Buick big block"]),
    (r"Buick V6", ["Buick V6 181-252"]),
    (r"Spitfire", ["Triumph Spitfire/Herald 4-cyl"]),
    (r"^TR6$", ["Triumph TR6 inline-6"]),
    (r"^TR4$", ["Triumph TR4"]),
    (r"^MGB$", ["BMC B-series (MGB)"]),
    (r"^1275$", ["BMC A-series 1275"]),
    (r"^948-1100$", ["BMC A-series 948-1100"]),
]
HS_SKIP_TYPES = {"Gift Cards", "T-Shirts", "LS1/LS6 Conversion Kit", "Shafts", "Hold Downs", "Stands",
                 'Ford "FE" Center Stand Set', 'Ford "FE" End Stand Set', 'Ford "FE" Spacer Kit', "Spacers",
                 "Ball Style Adjusters", "Cup Style Adjusters"}
HS_FASTENER_TYPES = {"Bolts": "rocker shaft bolt", "Stud Girdle Nuts": "stud girdle nut",
                     "Polylocks": "rocker polylock nut", "Nuts": "rocker adjuster jam nut"}
HS_PN_LEAD = re.compile(r"^\s*([A-Z]{0,4}\d[\w-]*\w)")


def same_pn(a: str, b: str) -> bool:
    a, b = a.rstrip("-").upper(), b.rstrip("-").upper()
    return a == b or a.startswith(b) or b.startswith(a)


def hs_fits(body: str) -> tuple[str | None, int | None, int | None]:
    """Return (short fitment phrase, y0, y1) from the 'Fits:' lead-in."""
    m = re.search(r"Fits:\s*(.*?)(?=Special|Harland Sharp|Instructions|$)", body)
    if not m:
        return None, None, None
    fits = m.group(1).strip().rstrip("-* ").strip()
    fits = re.sub(r"\s+", " ", fits)
    fits = re.sub(r"\bV(19\d\d)", r"\1", fits)  # site typo "V1955 to 1999"
    y0 = y1 = None
    ranges = re.findall(r"(?<!\d)(19\d\d|20\d\d)\s*(?:to|-)\s*(19\d\d|20\d\d|\d\d|Present)(?!\d)", fits)
    if not ranges:
        # two-digit forms: '59-78 "B" & "RB" 350-440', 'V8 55-87 262-400'
        ranges = re.findall(r"(?<!\d)(\d\d)-(\d\d)\b(?=.{0,30}?\d{3}-\d{3}|.{0,12}?\d\.\dL)", fits)
        ranges = [(str(1900 + int(a)), str(1900 + int(b))) for a, b in ranges]
    if ranges:
        starts, ends, open_ended = [], [], False
        for a, b in ranges:
            starts.append(int(a))
            if b == "Present":
                open_ended = True
            elif len(b) == 2:
                ends.append((1900 if int(b) > 25 else 2000) + int(b))
            else:
                ends.append(int(b))
        y0 = min(starts)
        y1 = None if open_ended or not ends else max(ends)
    if len(fits) > 90:
        fits = fits[:87].rsplit(" ", 1)[0] + "..."
    return fits or None, y0, y1


def extract_harland(products: list[dict], stats: Stats) -> list[dict]:
    recs = []
    brand = "Harland Sharp"

    # SKU -> ratio seen anywhere; fills variants whose own title omits the ratio.
    sku_ratio: dict[str, tuple[float, float | None]] = {}
    for p in products:
        for v in p["variants"]:
            r, re_ = parse_ratios(v["title"])
            if r and v.get("sku"):
                sku_ratio.setdefault(v["sku"].strip(), (r, re_))

    for p in products:
        title = re.sub(r"\s+", " ", p["title"]).strip()
        ptype = (p.get("product_type") or "").strip()
        body = strip_html(p.get("body_html", ""))
        tags = p.get("tags", [])
        url = f"https://harlandsharp.com/products/{p['handle']}"
        key = f"{title} | {ptype}"

        if ptype in HS_SKIP_TYPES:
            stats.skip(brand, f"{ptype.lower()} (no category)", f"{title} ({len(p['variants'])} variants)")
            continue
        if re.search(r"Stud Girdle$", ptype):
            stats.skip(brand, "stud girdle (no category)", f"{title} ({len(p['variants'])} variants)")
            continue

        if ptype in HS_FASTENER_TYPES:
            app = HS_FASTENER_TYPES[ptype]
            for v in p["variants"]:
                sku = (v.get("sku") or "").strip()
                vt = v["title"]
                if not sku:
                    stats.skip(brand, "no SKU", f"{title}: {vt}")
                    continue
                dia, metric = find_stud(vt)
                ml = re.search(r"x\s*(\d?\.\d+)", vt)
                mq = re.search(r"(\d+) Pieces? per|(\d+) per kit|(\d+) pieces per pack", body, re.I)
                qty = int(next(g for g in mq.groups() if g)) if mq else None
                fam = "Universal"
                if ptype == "Bolts":
                    fam = "Mopar B/RB big block"
                recs.append({
                    "m": brand, "p": sku, "cat": "fastener",
                    "name": f"{app}, {metric or dia} in" if (dia or metric) else app,
                    "fit": {"fam": fam, "cyl": FAM_CYL.get(fam), "notes": None},
                    "spec": {"application": app, "diameter": dia, "metric": metric,
                             "length": float(ml.group(1)) if ml else None,
                             "material": "steel" if re.search(r"\bsteel\b", body, re.I) else None,
                             "qty": qty},
                    "src": {"doc": "harlandsharp.com Shopify products.json", "edition": EDITION, "url": url},
                    "emissions": None,
                })
            continue

        fams = []
        for pat, fs in HS_FAMILIES:
            if re.search(pat, title) or re.search(pat, ptype):
                fams = fs
                break
        if not fams:
            stats.qa.append(f"Harland Sharp: no engine family for product '{title}' type '{ptype}' tags {tags}")
            fams = [ptype or title]

        # series: the title prefix only. The vendor field is unreliable (shaft systems carry
        # vendor "Original"; one "Original" Pontiac product carries vendor "Diamond").
        series = None
        mser = re.match(r"(ORIGINAL|HEAVY DUTY|DIAMOND)\b", title, re.I)
        if mser:
            series = mser.group(1).title()

        # mount type from product type / tags / body
        ctx = f"{title} {ptype} {' '.join(tags)}"
        if re.search(r"\bStud\b", ctx):
            mtype = "stud"
        elif re.search(r"Pedestal", ctx) or re.search(r"pedestal mount|cradle stand", body[:500], re.I):
            mtype = "pedestal"
        elif re.search(r"[Ss]haft", ctx) or re.search(r"shaft (?:mount|rockers|system)|single shaft mount|rocker shafts?\b|duty shafts", body, re.I):
            mtype = "shaft"
        else:
            mtype = None

        stud = metric = None
        if mtype in ("stud", "pedestal"):
            stud, metric = find_stud(ctx)
            if stud is None:
                mb = re.search(r"(5/16|3/8|7/16|8\s?mm)(?: x [\d.]+)? (?:rocker )?(?:[Ss]tud|[Bb]olt)", body)
                if mb:
                    stud, metric = find_stud(mb.group(1))

        if re.search(r"Aluminum body", body, re.I):
            material = "aluminum"
        else:
            material = None

        fits, y0, y1 = hs_fits(body)
        moff = re.search(r"\((\.\d{3}) Offset", body)
        kit_offset = float(moff.group(1)) if moff else None

        for v in p["variants"]:
            vt = re.sub(r"\s+", " ", v["title"]).strip()
            sku = (v.get("sku") or "").strip()
            lead = HS_PN_LEAD.match(vt)
            lead_pn = lead.group(1) if lead and re.search(r"\d", lead.group(1)) and not re.match(r"^\d\.\d", lead.group(1)) else None
            if not sku:
                if lead_pn:
                    sku = lead_pn
                    stats.qa.append(f"Harland Sharp: variant without SKU, PN taken from title: '{vt}' ({title})")
                else:
                    stats.skip(brand, "no SKU", f"{title}: {vt}")
                    continue
            elif lead_pn and not same_pn(lead_pn, sku):
                stats.qa.append(f"Harland Sharp {sku}: variant title starts with a different PN '{lead_pn}' ({title})")

            # non-rocker variants inside rocker products
            if re.search(r"Pedestal|Bolt|adjusters|Shaft-|Shaft\b.*\$|Bolt Kit", vt, re.I) and not re.search(r"\d\.\d+\s*[:.]\s*1", vt):
                stats.skip(brand, "pedestal/bolt/adjuster/shaft variant inside rocker product", f"{sku}: {vt}")
                continue

            ratio, ratio_exh = parse_ratios(vt)
            if ratio is None and sku in sku_ratio:
                ratio, ratio_exh = sku_ratio[sku]
                stats.qa.append(f"Harland Sharp {sku}: ratio taken from same SKU elsewhere: '{vt}' ({title})")
            if ratio is None:
                stats.qa.append(f"Harland Sharp {sku}: no ratio in variant title: '{vt}' ({title})")

            # stud size override from the variant (Ford/Chevy inline-6 list both)
            vstud, vmetric = find_stud(vt)
            if vstud is not None and re.search(r"Stud|\(3/8\)|\(7/16\)", vt):
                stud, metric, mtype_v = vstud, vmetric, "stud"
            else:
                mtype_v = mtype

            if re.search(r"\bSets?\b|Set\b", vt) and not re.search(r"Pcs?\.|Piece|Pair|Unit", vt):
                pack = "set"
            elif re.search(r"\bPair\b|Unit of 2|Units\b|-2\b", vt):
                pack = "pair"
            elif re.search(r"Pcs?\b|Piece|Pc\.|Single|\(Piece\)|Rockers? \([LR]\)|Rocker -|Rocker- |Rockers -", vt) or re.search(r"-1\b", sku):
                pack = "single"
            elif re.search(r"\d+ Pieces", vt):
                pack = "set"
            else:
                pack = None
            if re.match(r"^S", sku) and pack is None:
                pack = "set"

            valve = None
            if re.search(r"Intake", vt, re.I) and re.search(r"Exhaust", vt, re.I):
                valve = None
            elif re.search(r"Intake", vt, re.I):
                valve = "intake"
            elif re.search(r"Exhaust", vt, re.I):
                valve = "exhaust"
            side = None
            ms = re.search(r"\((L|R)\)|\b(Left|Right)\b", vt)
            if ms:
                side = (ms.group(1) or ms.group(2))[0]
            elif re.match(r"^[LR]\d", sku):
                side = sku[0]
            offset = None
            mo = re.search(r"(\.\d{3}) Offset", vt)
            if mo:
                offset = float(mo.group(1))
            elif re.search(r"-(\d{3})-1$", sku):
                offset = int(re.search(r"-(\d{3})-1$", sku).group(1)) / 1000
            elif valve == "intake" and kit_offset and side:
                offset = kit_offset
            adjustable = None
            if re.search(r"Non[- ]?Adjustable", vt, re.I):
                adjustable = False
            elif re.search(r"Adjustable", vt, re.I):
                adjustable = True
            elif re.search(r"Non[- ]?Adjustable", body[:300], re.I) and not re.search(r"Adjustable\b(?! pedestal)", title):
                adjustable = None

            app = title
            app = re.sub(r"^(ORIGINAL|HEAVY DUTY|DIAMOND)\s+", "", app, flags=re.I)
            app = re.sub(r"-\s*S\d+A?$", "", app).strip()
            parts = [f"{ratio}" + (f"/{ratio_exh}" if ratio_exh else "") + " ratio roller rocker" if ratio else "roller rocker"]
            if mtype_v == "stud" and (stud or metric):
                parts.append(f"{metric or stud} stud")
            elif mtype_v:
                parts.append(f"{mtype_v} mount")
            if series:
                parts.append(f"{series} series")
            if valve:
                parts.append(valve)
            if offset is not None:
                parts.append(f"{offset} offset" + (f" {side}" if side else ""))
            elif side:
                parts.append("left" if side == "L" else "right")
            if pack:
                parts.append(pack)
            parts.append(app)
            name = ", ".join(parts)

            for fam in fams:
                if fam in UNKNOWN_CYL:
                    stats.unknown_fams[fam] += 1
                recs.append({
                    "m": brand, "p": sku, "cat": "rocker", "name": name,
                    "fit": {"fam": fam, "cyl": FAM_CYL.get(fam, UNKNOWN_CYL.get(fam)),
                            "y0": y0, "y1": y1, "notes": fits},
                    "spec": {"ratio": ratio, "ratioExh": ratio_exh, "stud": stud, "studMetric": metric,
                             "type": mtype_v, "material": material, "series": series,
                             "adjustable": adjustable, "valve": valve, "offset": offset,
                             "offsetSide": side, "pack": pack},
                    "src": {"doc": "harlandsharp.com Shopify products.json", "edition": EDITION, "url": url},
                    "emissions": None,
                })
    return recs


# --------------------------------------------------------------------------- validate / write
def dedupe(recs: list[dict], stats: Stats) -> list[dict]:
    """One record per (brand, part number, family). Harland Sharp lists the same loose rocker under
    several head-specific products; keep the most generic listing (fewest spec keys), first seen on ties."""
    seen: dict[tuple, dict] = {}
    order: list[tuple] = []
    for r in recs:
        k = (r["m"], r["p"], r["fit"]["fam"])
        if k not in seen:
            seen[k] = r
            order.append(k)
            continue
        kept = seen[k]
        if len(r.get("spec", {})) < len(kept.get("spec", {})):
            seen[k] = r
            kept, r = r, kept
        stats.merged_dupes.append(f"{r['m']} {r['p']} [{r['fit']['fam']}]: kept '{kept['name']}' / dropped '{r['name']}'")
    return [seen[k] for k in order]


def validate(recs: list[dict]) -> list[str]:
    errs = []
    seen = set()
    for r in recs:
        for k in ("m", "p", "cat", "fit", "src"):
            if k not in r:
                errs.append(f"missing {k}: {r}")
        if "fam" not in r.get("fit", {}):
            errs.append(f"missing fit.fam: {r['m']} {r['p']}")
        k = (r["m"], r["p"], r["fit"].get("fam"))
        if k in seen:
            errs.append(f"duplicate p within brand/family: {k}")
        seen.add(k)
        if r["spec"].get("ratio") is not None and not isinstance(r["spec"]["ratio"], (int, float)):
            errs.append(f"ratio not numeric: {r['m']} {r['p']}")
        if r["spec"].get("stud") is not None and not isinstance(r["spec"]["stud"], (int, float)):
            errs.append(f"stud not numeric: {r['m']} {r['p']}")
        if "offset" in r["spec"] and not isinstance(r["spec"]["offset"], (int, float)):
            errs.append(f"offset not numeric: {r['m']} {r['p']}")

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
    L.append("# ROCKERS extraction notes (Scorpion Racing Products + Harland Sharp)\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_rockers.py`. Source: public Shopify "
             f"`/products.json?limit=250&page=N` on both hosts. robots.txt fetched first for each host: neither "
             f"disallows `/products.json` and neither sets a Crawl-delay; requests were spaced 6 s apart.\n")
    L.append("## Fetch\n")
    for host, (pages, n) in stats.requests.items():
        L.append(f"- `{host}`: {pages} page request(s) + robots.txt, {n} products")
    L.append("")
    L.append("## Records\n")
    L.append(f"Total records: **{len(recs)}**\n")
    L.append("| brand | cat | records |\n|---|---|---|")
    for (m, cat), n in sorted(counts["brand_cat"].items()):
        L.append(f"| {m} | {cat} | {n} |")
    L.append("")
    L.append("Rows per engine family (a part that fits several families is one record per family with the same `p`):\n")
    L.append("| brand | fit.fam | records |\n|---|---|---|")
    for (m, fam), n in sorted(counts["brand_fam"].items()):
        flag = " *(not in cam-fitment.json)*" if fam in UNKNOWN_CYL else ""
        L.append(f"| {m} | {fam}{flag} | {n} |")
    L.append("")
    L.append("## How fields were derived\n")
    L.append("- **Scorpion**: one product = one SKU (every product has a single `Default Title` variant). Ratio, stud "
             "size, mount type, offset and set count are regexed from the title first, then from the body's lead-in "
             "sentence(s) (the body before the boilerplate 'Specific features include' / 'Rockers for this engine...'). "
             "Engine family from title tokens (SBC/BBC/SBF/BBF/LS/AMC/Jeep/Olds/Pontiac/SB Chrysler), then body, then "
             "tags. BBC rockers are emitted for both `Chevy Mark IV big block` and `Chevy Gen VI big block`; BBF "
             "rockers whose body lists 351C/351M/400 are also emitted for `Ford 351C/351M/400`.")
    L.append("- **Harland Sharp**: one product = one application group; each variant is a SKU with the ratio in the "
             "variant title (`1.6:1`, also the site's `1.6.1` typo form and split sets `1.5/1.6`). One record per "
             "variant SKU. Series (Original / Heavy Duty / Diamond) from the product-title prefix. Fitment years and the short `fit.notes` phrase come from the body's `Fits:` lead-in.")
    L.append("- `spec.type`: `stud` / `pedestal` / `shaft`. `spec.stud` is the stud or pedestal-bolt diameter in "
             "inches (8 mm bolts stored as 0.315 with `studMetric: \"M8\"`). Shaft-mount rockers have no `stud`.")
    L.append("- Extra `spec` keys beyond the brief's `ratio stud type material`: `ratioExh` (split-ratio sets; the "
             "intake ratio is in `ratio`), `series`, `adjustable`, `offset` (inches), `offsetSide` (`L`/`R`), `valve` "
             "(`intake`/`exhaust` when a single piece is valve-specific), `qty` (pieces, Scorpion) / `pack` "
             "(`set`/`pair`/`single`, Harland Sharp).")
    L.append("- Polylocks, rocker nuts, rocker/stand bolts and stud-girdle nuts are emitted as `fastener` with "
             "`fit.fam: \"Universal\"` (Harland Sharp BK7001 shaft bolts: `Mopar B/RB big block`).")
    L.append("- Prices are not stored. `emissions` is `null` throughout (internal parts).\n")
    L.append("## Skipped\n")
    for (brand, reason), n in sorted(stats.skipped.items()):
        L.append(f"- **{brand}** — {reason}: {n}")
        for item in stats.skipped_items[(brand, reason)][:12]:
            L.append(f"  - {item}")
        if n > 12:
            L.append(f"  - ... {n - 12} more")
    L.append("")
    if stats.merged_dupes:
        L.append("## Duplicate SKUs merged (same brand + part number + family; first occurrence kept)\n")
        L.append("Harland Sharp lists the same individual exhaust rocker (e.g. `L70015-1`) under several Big Block "
                 "Mopar head products; Scorpion has a few near-duplicate listings with one SKU.\n")
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
    L.append("- Scorpion 'SB Chrysler 5/16 pedestal mount' rockers are filed under `Mopar Magnum 5.2/5.9` (5/16 "
             "pedestal-bolt rockers are the Magnum head pattern; LA heads are shaft-mount). Verify.")
    L.append("- Split-ratio sets written without i/e letters (Scorpion `1.6/1.65 SBF Shaft Mount`, `1.7/1.8 Ratio` on "
             "the LS steel-body sets; Harland Sharp `1.5/1.6 Set`, `1.7/1.8 Set`, `Split Ratio Set`) are stored as "
             "`ratio` = first number, `ratioExh` = second. Verify the intake/exhaust order with each manufacturer.")
    L.append("- Harland Sharp `fit.y0/y1` span every year range in the `Fits:` line (e.g. '1997 to 2004 LS1/LS6 & 2005 "
             "to Present LS2/LS4' gives y0 1997 and no y1). Lines that mix several engines (Triumph/BMC, Chevy inline "
             "6 + 153 four) keep the span of whatever years are printed; read `fit.notes` for the detail.")
    L.append("- Harland Sharp pedestal-mount products (Olds/AMC/Magnum/Viper/Ford V6) do not state the pedestal "
             "bolt size, so `stud` is omitted; `type: pedestal` comes from the site's Pedestal tag or body text.")
    L.append("- Harland Sharp series (`Original` / `Heavy Duty` / `Diamond`) is taken only from the product-title "
             "prefix. The site's vendor field is ignored: shaft systems carry vendor 'Original' and the Original "
             "Pontiac product carries vendor 'Diamond'.")
    L.append("- Scorpion LS shaft-rocker sets are tagged Chevrolet, General Motors, Holden and Pontiac on the site; "
             "they are filed under `GM LS` only.")
    L.append("- Harland Sharp SBF head-specific Original rockers (4101–4703 series) do not state stud size or mount "
             "type on the site; `type`/`stud` are omitted for them.")
    L.append("- Harland Sharp site data has SKU/title mismatches (variant SKU differs from the PN printed in the "
             "variant title). The SKU field was kept; each case is listed below.")
    L.append("- Scorpion `qty` is parsed from 'Set of N' / 'Pair' / singular 'Rocker Arm'; records without it had "
             "no count in title or body lead-in.\n")
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
        L.append("Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src`, numeric "
                 "fields are numbers, no empty strings.")
    L.append("")
    path.write_text("\n".join(L), encoding="utf-8")


def main(argv):
    offline = "--offline" in argv
    stats = Stats()
    all_products = {}
    if offline:
        for host in HOSTS:
            all_products[host] = load_cache(host)
    else:
        import requests
        s = requests.Session()
        s.headers["User-Agent"] = UA
        for host in HOSTS:
            all_products[host] = fetch_all(host, s)
    for host, prods in all_products.items():
        pages = len(list(DL.glob(f"{host}_p*.json")))
        stats.requests[host] = (pages, len(prods))
        log(f"{host}: {len(prods)} products from {pages} cached page(s)")

    recs = []
    recs += extract_scorpion(all_products["scorpionracingproducts.com"], stats)
    recs += extract_harland(all_products["harlandsharp.com"], stats)
    recs = [clean_empty(r) for r in recs]
    for r in recs:
        r.setdefault("emissions", None)  # clean_empty drops None; the format wants it explicit
        r.setdefault("spec", {})
    recs = dedupe(recs, stats)
    errs = validate(recs)

    counts = {
        "brand_cat": collections.Counter((r["m"], r["cat"]) for r in recs),
        "brand_fam": collections.Counter((r["m"], r["fit"]["fam"]) for r in recs),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    out = {
        "source": {
            "task": "ROCKERS",
            "brands": {
                "Scorpion": {"doc": "scorpionracingproducts.com Shopify products.json",
                             "url": "https://scorpionracingproducts.com/products.json?limit=250&page=N"},
                "Harland Sharp": {"doc": "harlandsharp.com Shopify products.json",
                                  "url": "https://harlandsharp.com/products.json?limit=250&page=N"},
            },
            "edition": EDITION,
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "rockers.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(OUT / "rockers.md", recs, stats, counts, errs)
    log(f"wrote {len(recs)} records; {len(errs)} validation errors; {len(stats.qa)} QA flags")
    for e in errs[:20]:
        log("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
