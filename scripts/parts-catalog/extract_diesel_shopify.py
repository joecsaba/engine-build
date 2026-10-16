#!/usr/bin/env python3
"""Parts catalog extractor: DIESEL-SHOPIFY (Wagler, Colt Cams, Manton, Dynomite, Banks, ATS,
Bullet Proof Diesel, Stainless Diesel, Smeding).

Every store is Shopify, so the public `/products.json?limit=250&page=N` listing is the source.
Specs are mostly prose: the parsers below take only what a regex can read unambiguously
(diameter / wall / length for pushrods, duration / lift / LSA for cams, GPH / psi for lift
pumps, % over / HP for injectors, wheel mm / A/R for turbos, ...) and leave the rest out.

Fetch rules (CLOUD_TASKS.md): robots.txt first, one request at a time, >= 6 s apart (or the
robots Crawl-delay), fixed User-Agent, no retry on 403 / challenge pages. Pages are cached
under `dl/diesel-shopify/<store>/` (gitignored) so the parse step is re-runnable offline and a
crawl that stops can be resumed (cached pages are not requested again). A host that the
network refuses (cloud allowlist, DNS, TLS) is recorded as unreachable and the run continues
with the other hosts.

    python -I scripts/parts-catalog/extract_diesel_shopify.py                 # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_diesel_shopify.py --offline       # parse the cache only
    python -I scripts/parts-catalog/extract_diesel_shopify.py --only banks,manton

Writes `out/diesel-shopify.json` and `out/diesel-shopify.md` next to this file; writes nothing
when no host returned any product (no empty or mocked output). Nothing is written outside
`dl/` and `out/` (the PARTS_CATALOG_DL / PARTS_CATALOG_OUT environment variables redirect both
for tests).
"""
from __future__ import annotations

import collections
import datetime as dt
import html as htmlmod
import json
import os
import pathlib
import re
import sys
import time
import urllib.robotparser

HERE = pathlib.Path(__file__).resolve().parent
DL = pathlib.Path(os.environ.get("PARTS_CATALOG_DL", HERE / "dl")) / "diesel-shopify"
OUT = pathlib.Path(os.environ.get("PARTS_CATALOG_OUT", HERE / "out"))
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
EDITION = dt.date.today().strftime("%Y-%m")
TASK = "DIESEL-SHOPIFY"

# store key -> (host, store brand)
STORES = {
    "wagler": ("www.waglercompetition.com", "Wagler"),
    "colt": ("www.coltcams.com", "Colt Cams"),
    "manton": ("www.mantonpushrods.com", "Manton"),
    "dynomite": ("www.dynomitediesel.com", "Dynomite Diesel"),
    "banks": ("www.bankspower.com", "Banks Power"),
    "ats": ("www.atsdiesel.com", "ATS Diesel"),
    "bulletproof": ("www.bulletproofdiesel.com", "Bullet Proof Diesel"),
    "stainless": ("www.stainlessdiesel.com", "Stainless Diesel"),
    "smeding": ("www.smedingdiesel.com", "Smeding Diesel"),
}
# Shopify `vendor` -> brand on the record (`m`). Unlisted vendors are kept verbatim.
VENDOR_NAME = {
    "Wagler Competition Products": "Wagler", "Wagler Competition": "Wagler", "Wagler": "Wagler",
    "Colt Cams": "Colt Cams", "Manton Pushrods": "Manton", "Manton Rocker Arms": "Manton", "Manton": "Manton",
    "Dynomite Diesel Products Inc.": "Dynomite Diesel", "Dynomite Diesel Products": "Dynomite Diesel",
    "Dynomite Diesel": "Dynomite Diesel", "DDP": "Dynomite Diesel",
    "Banks Power": "Banks Power", "Banks": "Banks Power", "Gale Banks Engineering": "Banks Power",
    "ATS Diesel": "ATS Diesel", "ATS Diesel Performance": "ATS Diesel", "ATS": "ATS Diesel",
    "Bullet Proof Diesel": "Bullet Proof Diesel", "BulletProof Diesel": "Bullet Proof Diesel",
    "Stainless Diesel": "Stainless Diesel", "HSP Diesel Performance": "HSP Diesel", "HSP Diesel": "HSP Diesel",
    "Smeding Diesel LLC": "Smeding Diesel", "Smeding Diesel": "Smeding Diesel",
    "S&S Diesel": "S&S Diesel Motorsport", "S&S Diesel Motorsport": "S&S Diesel Motorsport",
    "Power Driven Diesel": "Power Driven Diesel", "Power Driven": "Power Driven Diesel", "PDD": "Power Driven Diesel",
    "BorgWarner": "BorgWarner", "Garrett": "Garrett", "Holset": "Holset", "Bosch": "Bosch", "ARP": "ARP",
}

# fit.fam strings must match artifacts/engine-build/public/data/cam-fitment.json
FAM = {
    "Cummins 5.9 12V": {"ci": [359], "cyl": 6}, "Cummins 5.9 24V/CR": {"ci": [359], "cyl": 6},
    "Cummins 6.7": {"ci": [408], "cyl": 6}, "Duramax 6.6": {"ci": [403], "cyl": 8},
    "Powerstroke 7.3": {"ci": [444], "cyl": 8}, "Powerstroke 6.0": {"ci": [365], "cyl": 8},
    "Powerstroke 6.4": {"ci": [390], "cyl": 8}, "Powerstroke 6.7": {"ci": [406], "cyl": 8},
    "Small-block Chevy": {"cyl": 8}, "Chevy Mark IV big block": {"cyl": 8}, "Chevy Gen VI big block": {"cyl": 8},
    "Chevy W-series 348/409": {"cyl": 8}, "GM LS": {"cyl": 8}, "GM LT (Gen V)": {"cyl": 8},
    "Small-block Ford (Windsor)": {"cyl": 8}, "Ford 351C/351M/400": {"cyl": 8}, "Ford FE": {"cyl": 8},
    "Ford 429/460": {"cyl": 8}, "Ford Modular": {"cyl": 8}, "Ford Coyote": {"cyl": 8},
    "Ford Godzilla 7.3": {"ci": [445], "cyl": 8}, "Mopar LA small block": {"cyl": 8},
    "Mopar Magnum 5.2/5.9": {"cyl": 8}, "Mopar B/RB big block": {"cyl": 8}, "Chrysler 426 Hemi": {"cyl": 8},
    "Chrysler Gen III Hemi 5.7/6.1": {"cyl": 8}, "Chrysler Gen III Hemi 6.2/6.4": {"cyl": 8},
    "Pontiac V8": {"cyl": 8}, "Oldsmobile V8": {"cyl": 8}, "Buick big block": {"cyl": 8}, "Buick 350": {"cyl": 8},
    "Buick V6 181-252": {"cyl": 6}, "Cadillac 368-500": {"cyl": 8}, "AMC V8": {"cyl": 8},
    "AMC/Jeep inline-6": {"cyl": 6}, "Chevy inline-6": {"cyl": 6}, "Ford 240/300 inline-6": {"cyl": 6},
    "Mopar Slant Six": {"cyl": 6},
}
# Not in cam-fitment.json: catalog heading kept in fit.fam and flagged in the notes.
UNKNOWN_FAM_CYL = {
    "Duramax 8.3 L6P": 8, "GM 6.2/6.5 diesel": 8, "GM 2.8 Duramax": 4, "GM 3.0 Duramax": 6,
    "Ford 6.9/7.3 IDI": 8, "Ford EcoBoost": 6, "Ford 6.2 gas": 8, "Ford 3.0 Powerstroke": 6,
    "RAM 3.0 EcoDiesel": 6, "Jeep 3.6 Pentastar": 6, "Jeep 2.0 turbo": 4, "Jeep 4.0 inline-6": 6,
    "Toyota": None, "Nissan": None, "Volkswagen air-cooled": 4, "Cummins 4BT": 4, "Cummins 8.3 ISC": 6,
    "Cummins": 6, "Duramax": 8, "Power Stroke": 8, "Ford": None, "GM": None, "Universal": None,
}
DMX_YEARS = {"LB7": (2001, 2004), "LLY": (2004, 2005), "LBZ": (2006, 2007), "LMM": (2007, 2010),
             "LGH": (2011, 2016), "LML": (2011, 2016), "L5P": (2017, None), "L5D": (2017, None)}
FRAC_IN = {"5/16": 0.3125, "11/32": 0.344, "3/8": 0.375, "7/16": 0.4375, "1/2": 0.5, "9/16": 0.5625,
           "5/8": 0.625, "3/4": 0.75}
# `emissions` is recorded for these; everything else is an internal part (null).
EMISSIONS_CATS = {"injector", "injectionPump", "turbo", "tuner", "intake", "manifold", "intercooler", "liftPump"}
CHALLENGE = ("Just a moment", "cf-challenge", "_Incapsula_", "Access Denied", "px-captcha",
             "Please verify you are a human", "Attention Required")


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html_lines(h: str) -> str:
    """HTML -> one text line per block element, entities decoded, whitespace collapsed."""
    t = re.sub(r"<style[^>]*>.*?</style>|<script[^>]*>.*?</script>", " ", h or "", flags=re.S | re.I)
    t = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>|</tr>|</div>|</td>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = htmlmod.unescape(t).replace("\xa0", " ").replace("″", '"').replace("”", '"').replace("“", '"')
    t = t.replace("–", "-").replace("—", "-").replace("’", "'").replace("×", "x")
    return "\n".join(" ".join(l.split()) for l in t.splitlines() if l.strip())


def flat(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def num(s) -> float | int | None:
    if s is None:
        return None
    try:
        v = float(str(s).replace(",", "").replace('"', "").strip())
    except ValueError:
        return None
    return int(v) if v.is_integer() else round(v, 4)


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


def short(s: str, n: int = 90) -> str:
    s = flat(s)
    return s if len(s) <= n else s[: n - 3].rsplit(" ", 1)[0] + "..."


class Stats:
    def __init__(self):
        self.skipped = collections.Counter()
        self.skipped_items = collections.defaultdict(list)
        self.qa = []
        self.unknown_fams = collections.Counter()
        self.merged_dupes = []
        self.hosts = {}  # store key -> dict(status, pages, products, note)
        self.no_fit = []
        self.fit_src = collections.Counter()

    def skip(self, brand, reason, label):
        self.skipped[(brand, reason)] += 1
        self.skipped_items[(brand, reason)].append(label)


# --------------------------------------------------------------------------- fetch
def fetch_host(key: str, session, stats: Stats) -> list[dict]:
    """Page through /products.json for one store, honoring robots.txt and the delay floor.
    Cached pages are reused (resumable). Returns the products (possibly from cache only)."""
    import requests

    host, _brand = STORES[key]
    hdir = DL / key
    hdir.mkdir(parents=True, exist_ok=True)
    status = {"status": "ok", "pages": 0, "products": 0, "note": ""}
    stats.hosts[key] = status

    robots_file = hdir / "robots.txt"
    delay = MIN_DELAY
    if not robots_file.exists():
        try:
            r = session.get(f"https://{host}/robots.txt", timeout=60, allow_redirects=True)
            robots_file.write_text(f"# status {r.status_code} final_url {r.url}\n" + (r.text if r.status_code == 200 else ""),
                                   encoding="utf-8")
            log(f"{host}: robots.txt -> {r.status_code}")
            time.sleep(MIN_DELAY)
        except requests.RequestException as e:
            status["status"] = "unreachable"
            status["note"] = f"robots.txt: {type(e).__name__}: {short(str(e), 160)}"
            log(f"{host}: unreachable ({status['note']})")
            return load_cache(key, status)
    txt = robots_file.read_text(encoding="utf-8")
    body = "\n".join(l for l in txt.splitlines() if not l.startswith("#"))
    if body.strip():
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(body.splitlines())
        url0 = f"https://{host}/products.json"
        if not (rp.can_fetch(UA, url0) and rp.can_fetch("*", url0)):
            status["status"] = "robots-disallowed"
            status["note"] = "robots.txt disallows /products.json; not fetched"
            log(f"{host}: {status['note']}")
            return load_cache(key, status)
        delay = max(MIN_DELAY, rp.crawl_delay(UA) or rp.crawl_delay("*") or 0)
        status["note"] = f"robots.txt read; /products.json allowed; request spacing {delay:g} s"
    else:
        status["note"] = f"robots.txt empty or not 200 (see dl/diesel-shopify/{key}/robots.txt); request spacing {delay:g} s"

    products = []
    page = 1
    while True:
        cache = hdir / f"products_p{page}.json"
        if cache.exists():
            data = json.loads(cache.read_text(encoding="utf-8"))
        else:
            url = f"https://{host}/products.json?limit=250&page={page}"
            try:
                r = session.get(url, timeout=60, headers={"Accept": "application/json"})
            except requests.RequestException as e:
                status["status"] = "unreachable" if page == 1 else "partial"
                status["note"] += f"; page {page}: {type(e).__name__}: {short(str(e), 160)}"
                log(f"{host}: {status['note']}")
                break
            log(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
            head = r.text[:4000]
            if r.status_code in (403, 429, 503) or any(k in head for k in CHALLENGE):
                status["status"] = "blocked"
                status["note"] += f"; page {page}: HTTP {r.status_code} / bot gate, not retried"
                log(f"{host}: blocked on page {page}; stopping this host")
                break
            if r.status_code != 200:
                status["status"] = "error"
                status["note"] += f"; page {page}: HTTP {r.status_code}"
                break
            try:
                data = r.json()
            except ValueError:
                status["status"] = "error"
                status["note"] += f"; page {page}: not JSON"
                break
            cache.write_text(json.dumps(data), encoding="utf-8")
            time.sleep(delay)
        batch = data.get("products", [])
        products.extend(batch)
        status["pages"] = page
        if len(batch) < 250:
            break
        page += 1
    status["products"] = len(products)
    return products


def load_cache(key: str, status: dict | None = None) -> list[dict]:
    hdir = DL / key
    products = []
    pages = sorted(hdir.glob("products_p*.json"), key=lambda p: int(p.stem.rsplit("_p", 1)[1]))
    for f in pages:
        products.extend(json.loads(f.read_text(encoding="utf-8")).get("products", []))
    if status is not None:
        status["pages"] = len(pages)
        status["products"] = len(products)
        if pages and status["status"] not in ("ok", "offline (cache)"):
            status["note"] += f"; parsed {len(pages)} cached page(s)"
    return products


# --------------------------------------------------------------------------- fitment
YEARS = re.compile(r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)\s*(?:-|to|thru|through)\s*((?:19|20)?\d\d(?:\.5)?|Current|Present|Up|Newer)(?![\d.])|"
                   r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)\s*\+|(?<![\d.])((?:19|20)\d\d(?:\.5)?)(?:\s*(?:and|&)\s*(?:newer|up|later))", re.I)
YEARS_SHORT = re.compile(r"(?<![\d.])(\d\d(?:\.5)?)\s*-\s*(\d\d(?:\.5)?)(?![\d.%\"])")
DMX_CODE = re.compile(r"\b(LB7|LLY|LBZ|LMM|LGH|LML|L5P|L5D)\b", re.I)
DISP = re.compile(r"(?<![\d.])(\d\.\d)\s*-?\s*L\b", re.I)


def title_years(t: str) -> tuple[float | None, float | None, bool]:
    """(y0, y1, open_ended) from '2004.5-2007', '15-16', '2019+', '2019-Current', '98-02'."""
    m = YEARS.search(t)
    if m:
        if m.group(3) or m.group(4):
            return float(m.group(3) or m.group(4)), None, True
        y0 = float(m.group(1))
        y1s = m.group(2)
        if not re.match(r"\d", y1s):
            return y0, None, True
        y1 = float(y1s) if len(y1s.split(".")[0]) == 4 else float(str(int(y0))[:2] + y1s)
        if y1 < y0:
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


def cummins_split(t: str, y0, y1, open_ended) -> list[str]:
    """12V / 24V-CR / 6.7 from the text, then from the years."""
    twelve = re.search(r"12[ -]?V(?:alve)?\b|P7100|P-?Pump|VE Pump", t, re.I)
    twenty4 = re.search(r"24[ -]?V(?:alve)?\b|VP44|HY35|HE351CW|Common Rail|\bCR\b|CP3", t, re.I)
    six7 = re.search(r"(?<![\d.])6\.7\s*L?\b", t)
    five9 = re.search(r"(?<![\d.])5\.9\s*L?\b", t)
    fams = []
    if six7 and not five9 and not twelve and not twenty4:
        return ["Cummins 6.7"]
    if twelve:
        fams.append("Cummins 5.9 12V")
    if twenty4:
        fams.append("Cummins 5.9 24V/CR")
    if six7:
        fams.append("Cummins 6.7")
    if fams:
        return fams
    if five9:
        if y1 is not None and y1 <= 1998:
            return ["Cummins 5.9 12V"]
        if y0 is not None and y0 >= 1998.5:
            return ["Cummins 5.9 24V/CR"]
        if y0 is not None and y1 is not None:
            return ["Cummins 5.9 12V", "Cummins 5.9 24V/CR"]
        if y0 is not None and open_ended:
            return ["Cummins 5.9 24V/CR" if y0 >= 1998 else "Cummins 5.9 12V"]
        return ["Cummins 5.9 12V", "Cummins 5.9 24V/CR"]
    if y0 is not None:
        if y0 >= 2007.5:
            return ["Cummins 6.7"]
        if y1 is not None and y1 <= 1998:
            return ["Cummins 5.9 12V"]
        if y1 is not None and y1 <= 2007:
            return ["Cummins 5.9 24V/CR"] if y0 >= 1998.5 else ["Cummins 5.9 12V", "Cummins 5.9 24V/CR"]
        if y1 is not None or open_ended:
            return (["Cummins 5.9 24V/CR", "Cummins 6.7"] if y0 >= 1998.5
                    else ["Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7"])
    return ["Cummins"]


def engine_families(text: str) -> tuple[list[str], list[str]]:
    """Engine families named in a title / tag / lead-in string. -> (families, notes)."""
    t = text
    fams, notes = [], []
    y0, y1, open_ended = title_years(t)
    disp = DISP.search(t)
    dispv = float(disp.group(1)) if disp else None

    def add(f, note=None):
        if f not in fams:
            fams.append(f)
        if note and note not in notes:
            notes.append(note)

    # --- diesel
    codes = [c.upper() for c in DMX_CODE.findall(t)]
    if re.search(r"Duramax|\bDMAX\b", t, re.I) or codes:
        if re.search(r"L6P|8\.3\s*L", t, re.I):
            add("Duramax 8.3 L6P")
        elif re.search(r"2\.8\s*L|Colorado|Canyon|LWN", t, re.I) and not re.search(r"6\.6", t):
            add("GM 2.8 Duramax")
        elif re.search(r"3\.0\s*L|LM2|LZ0", t) and not re.search(r"6\.6", t):
            add("GM 3.0 Duramax")
        elif re.search(r"(?<![\d.])6\.[25]\s*L?\b", t) and not re.search(r"6\.6", t):
            add("GM 6.2/6.5 diesel")
        else:
            add("Duramax 6.6", "/".join(dict.fromkeys(codes)) if codes else None)
    ford_diesel = re.search(r"Power ?Stroke|\bT444E\b|\bVT365\b", t, re.I) or (
        re.search(r"\bFord\b|F-?250|F-?350|F-?450|Super ?Duty|Excursion", t, re.I)
        and re.search(r"(?<![\d.])(?:7\.3|6\.0|6\.4|6\.7|6\.9)\s*L?\b|Diesel|IDI", t, re.I)
        and not re.search(r"\bGas\b|Godzilla", t, re.I))
    if ford_diesel:
        if re.search(r"(?<![\d.])3\.0\s*L", t):
            add("Ford 3.0 Powerstroke")
        elif re.search(r"\bIDI\b|(?<![\d.])6\.9\s*L?\b", t):
            add("Ford 6.9/7.3 IDI")
        else:
            found = False
            for d in ("7.3", "6.0", "6.4", "6.7"):
                if re.search(rf"(?<![\d.]){re.escape(d)}\s*L?\b", t):
                    add(f"Powerstroke {d}")
                    found = True
            if not found:
                add("Power Stroke")
    cummins_words = re.search(r"Cummins|\b12v\b|\b24v\b|\bVP44\b|\bP7100\b|\bISB\b|\b4BT\b", t, re.I) or (
        re.search(r"\bRam\b|\bDodge\b", t) and re.search(r"(?<![\d.])(?:5\.9|6\.7)\s*L?\b|Diesel", t, re.I)
        and not re.search(r"Hemi|EcoDiesel|\bGas\b", t, re.I))
    if cummins_words:
        if re.search(r"\b4BT?\b", t):
            add("Cummins 4BT")
        elif re.search(r"\bISC\b|(?<![\d.])8\.3\s*L", t) and not re.search(r"L6P|Duramax", t, re.I):
            add("Cummins 8.3 ISC")
        else:
            for f in cummins_split(t, y0, y1, open_ended):
                add(f)
    if re.search(r"EcoDiesel", t, re.I):
        add("RAM 3.0 EcoDiesel")
    # --- gas
    if re.search(r"EcoBoost", t, re.I):
        add("Ford EcoBoost", f"{dispv}L EcoBoost" if dispv else None)
    if re.search(r"Coyote|(?<![\d.])5\.0\s*L?\s*(?:Coyote|Ti-?VCT)", t, re.I):
        add("Ford Coyote")
    if re.search(r"Godzilla|(?<![\d.])7\.3\s*L?\s*Gas", t, re.I):
        add("Ford Godzilla 7.3")
    if re.search(r"Ford\b.*(?<![\d.])6\.2\s*L?\s*(?:Gas|Boss|V8)|6\.2\s*L?\s*(?:Gas )?Boss", t, re.I):
        add("Ford 6.2 gas")
    if re.search(r"Modular|(?<![\d.])4\.6\s*L?\b|(?<![\d.])5\.4\s*L?\b", t) and re.search(r"Ford|Mustang|Modular", t, re.I):
        add("Ford Modular")
    if re.search(r"Pentastar|Jeep\b.*(?<![\d.])3\.6\s*L|(?<![\d.])3\.6\s*L.*(?:Jeep|Wrangler|Gladiator|Ram 1500)", t, re.I):
        add("Jeep 3.6 Pentastar")
    if re.search(r"Jeep\b.*(?<![\d.])2\.0\s*L|(?<![\d.])2\.0\s*L.*(?:Jeep|Wrangler|Gladiator)", t, re.I):
        add("Jeep 2.0 turbo")
    if re.search(r"Jeep\b.*(?<![\d.])4\.0\s*L|(?<![\d.])4\.0\s*L.*Jeep|Jeep 4\.0|4\.0L (?:Inline|I-?6)", t, re.I):
        add("Jeep 4.0 inline-6")
    if re.search(r"Gen ?III Hemi|\bHemi\b", t, re.I) and not re.search(r"426", t):
        if re.search(r"(?<![\d.])6\.[24]\s*L?\b", t):
            add("Chrysler Gen III Hemi 6.2/6.4")
        if re.search(r"(?<![\d.])(?:5\.7|6\.1)\s*L?\b", t) or not re.search(r"6\.[24]", t):
            add("Chrysler Gen III Hemi 5.7/6.1")
    if re.search(r"426\s*Hemi|Hemi 426", t, re.I):
        add("Chrysler 426 Hemi")
    if re.search(r"\bLS[1-9]\b|\bLS\b(?![\w-])|\bLQ[49]\b|\bLM7\b|\bL92\b|\bL99\b|\bLSX\b|Gen ?III/IV|Gen ?IV\b", t):
        add("GM LS")
    if re.search(r"\bLT[1245]\b|Gen ?V\b|\bL8[3467]\b|\bL8T\b|\bLV3\b", t):
        add("GM LT (Gen V)")
    gm_gas = re.search(r"(?:Chevrolet|Chevy|GM|GMC|Silverado|Sierra|Tahoe|Suburban|Yukon)\b.*(?<![\d.])(?:5\.3|6\.2|6\.0|4\.8|6\.6)\s*L?\s*(?:Gas|V8)|"
                       r"(?<![\d.])(?:5\.3|6\.2|4\.8)\s*L?\s*(?:Gas|V8)?\s*(?:Chevrolet|Chevy|GM|GMC|Silverado|Sierra|Vortec|EcoTec3)", t, re.I)
    if gm_gas and not re.search(r"Duramax|Diesel", t, re.I):
        if (y0 is not None and y0 >= 2014) or re.search(r"EcoTec3|\bL8[3467]\b|\bL8T\b|6\.6\s*L?\s*Gas", t, re.I):
            add("GM LT (Gen V)", "Gen V by model year / engine code")
        elif y0 is not None:
            add("GM LS", "Gen III/IV by model year")
        else:
            add("GM")
    if re.search(r"Small[- ]Block Chev|\bSBC\b|Chevrolet Small Block|Chevy Small Block|Chevrolet, Small Block|SB Chevy", t, re.I):
        add("Small-block Chevy")
    if re.search(r"Big[- ]Block Chev|\bBBC\b|Chevrolet Big Block|Chevy Big Block|Chevrolet, Big Block|BB Chevy", t, re.I):
        add("Chevy Mark IV big block")
        add("Chevy Gen VI big block")
    if re.search(r"\b(?:348|409)\b|W[- ]Series", t) and re.search(r"Chev", t, re.I):
        add("Chevy W-series 348/409")
    if re.search(r"Small[- ]Block Ford|\bSBF\b|Windsor|Ford Small Block|Ford, Small Block|302W|351W|SB Ford", t, re.I):
        add("Small-block Ford (Windsor)")
    if re.search(r"351C|351M|Cleveland|\b400M\b", t, re.I):
        add("Ford 351C/351M/400")
    if re.search(r"\bFE\b|390 Ford|Ford 390|427 Ford|428 Ford|Ford FE", t):
        add("Ford FE")
    if re.search(r"Big[- ]Block Ford|\bBBF\b|429/460|Ford 460|460 Ford|385 Series|BB Ford", t, re.I):
        add("Ford 429/460")
    if re.search(r"Ford\b.*\b(?:240|300)\b.*(?:inline|I-?6|Six)|300 Six|Ford 300 I6", t, re.I):
        add("Ford 240/300 inline-6")
    mopar_sb = re.search(r"Small[- ]Block (?:Mopar|Chrysler|Dodge)|SB (?:Mopar|Chrysler|Dodge)|(?:Mopar|Chrysler|Dodge)\b.*\bLA\b|"
                         r"(?:Mopar|Chrysler|Dodge)\b.*\b(?:318|340|360)\b", t, re.I)
    if mopar_sb and not re.search(r"Magnum", t, re.I):
        add("Mopar LA small block")
    if re.search(r"Magnum (?:5\.[29]|V8)|5\.[29]\s*L?\s*Magnum|(?:Mopar|Dodge|Chrysler)\b.*Magnum", t, re.I):
        add("Mopar Magnum 5.2/5.9")
    if re.search(r"Big[- ]Block (?:Mopar|Chrysler|Dodge)|BB (?:Mopar|Chrysler|Dodge)|\bB/RB\b|"
                 r"(?:Mopar|Chrysler|Dodge)\b.*\b(?:383|400|413|426 Wedge|440)\b", t, re.I):
        add("Mopar B/RB big block")
    if re.search(r"Slant[- ]Six|Slant 6", t, re.I):
        add("Mopar Slant Six")
    if re.search(r"Pontiac", t, re.I) and not re.search(r"GM LS|\bLS\d", t):
        add("Pontiac V8")
    if re.search(r"Oldsmobile|\bOlds\b", t, re.I):
        add("Oldsmobile V8")
    if re.search(r"Buick\b.*\b(?:400|430|455)\b|Big[- ]Block Buick|Buick Big Block", t, re.I):
        add("Buick big block")
    elif re.search(r"Buick\b.*\b350\b|Buick 350", t, re.I):
        add("Buick 350")
    elif re.search(r"Buick\b.*V-?6|3\.8\s*L?\b.*Buick|Buick 231|Grand National|Turbo Buick", t, re.I):
        add("Buick V6 181-252")
    if re.search(r"Cadillac\b.*\b(?:368|425|472|500)\b", t, re.I):
        add("Cadillac 368-500")
    if re.search(r"\bAMC\b.*(?:V-?8|\b(?:290|304|343|360|390|401)\b)|AMC V8", t, re.I):
        add("AMC V8")
    if re.search(r"(?:AMC|Jeep)\b.*\b(?:232|258|4\.2)\b|Jeep Inline|AMC Inline|AMC/Jeep", t, re.I) and "Jeep 4.0 inline-6" not in fams:
        add("AMC/Jeep inline-6")
    if re.search(r"Chev(?:rolet|y)?\b.*\b(?:194|230|250|292)\b.*(?:inline|I-?6|Six)|Chevy Inline|Chevrolet Inline", t, re.I):
        add("Chevy inline-6")
    if re.search(r"Volkswagen Air Cooled|VW Air Cooled|Type 1\b|Type 4\b", t, re.I):
        add("Volkswagen air-cooled")
    if re.search(r"Toyota|Tundra|Tacoma|4Runner|Land Cruiser", t, re.I):
        add("Toyota", short(t, 60))
    if re.search(r"Nissan|Titan XD", t, re.I):
        add("Nissan", short(t, 60))
    return fams, notes


def tag_fitment(tags: list[str], store: str) -> tuple[list[str], float | None, float | None, bool, list[str]]:
    """Families + model years from the store's tag conventions.
    Banks:  Make_Ford / Engine_6.7L Diesel / Year_2017 / Year_2017_Make_..._Model_..._Engine_...
    ATS:    bare years, displacement ('6.7L'), make/engine words ('Cummins', 'Power Stroke')
    Colt:   '12v' '24v' '5.9L' '6.7L' 'Cummins' 'Ford' 'Powerstroke' '6.0L' ...
    Manton: 'cat:...' / 'brand:...' only (no engine) -> nothing from tags."""
    fams, notes = [], []
    years: list[float] = []
    open_ended = False
    if store == "banks":
        makes = [t[5:] for t in tags if t.startswith("Make_")]
        engines = [t[7:] for t in tags if t.startswith("Engine_")]
        for t in tags:
            m = re.fullmatch(r"Year_(\d{4})", t)
            if m:
                years.append(float(m.group(1)))
        pairs = set()
        for c in (t for t in tags if t.startswith("Year_") and "_Make_" in t):
            m = re.match(r"Year_(\d{4})_Make_([^_]+)_Model_(.+?)_Engine_(.+)$", c)
            if m:
                pairs.add((m.group(2), m.group(4)))
        if not pairs:
            pairs = {(mk, en) for mk in (makes or [""]) for en in engines}
        yrs = f" {int(min(years))}-{int(max(years))}" if years else ""
        for mk, en in sorted(pairs):
            fuel = "Diesel" if re.search(r"Diesel", en, re.I) else ("Gas" if re.search(r"Gas", en, re.I) else "")
            if re.search(r"Chevrolet|GMC|Cadillac|Buick", mk, re.I):
                text = f"Duramax {en}{yrs}" if fuel == "Diesel" else f"Chevrolet {en} Gas{yrs}"
            elif re.search(r"Ford|Lincoln", mk, re.I):
                text = f"Ford {en} {'Power Stroke' if fuel == 'Diesel' else 'Gas'}{yrs}"
            elif re.search(r"Ram|Dodge", mk, re.I):
                eng = "Cummins" if fuel == "Diesel" else ("Hemi" if re.search(r"5\.7|6\.4|6\.2|6\.1", en) else "")
                text = f"Ram {en} {eng}{yrs}"
            elif re.search(r"Jeep", mk, re.I):
                text = f"Jeep {en}{yrs}" if fuel != "Diesel" else f"Jeep {en} EcoDiesel{yrs}"
            else:
                text = f"{mk} {en}{yrs}"
            f, n = engine_families(text)
            for x in f:
                if x not in fams:
                    fams.append(x)
            notes += [x for x in n if x not in notes]
    else:
        words = []
        for t in tags:
            m = re.fullmatch(r"(\d{4})\s*-\s*(\d{4}|Current|Present|Up)", t, re.I)
            if re.fullmatch(r"\d{4}(?:\.5)?", t):
                years.append(float(t))
            elif m:
                years.append(float(m.group(1)))
                if m.group(2).isdigit():
                    years.append(float(m.group(2)))
                else:
                    open_ended = True
            elif re.fullmatch(r"\d{4}\+", t):
                years.append(float(t[:4]))
                open_ended = True
            elif re.search(r"Cummins|Duramax|Power ?Stroke|\bFord\b|Dodge|\bRam\b|\bGM\b|Chevy|Chevrolet|\b12v\b|\b24v\b|\d\.\dL|"
                           r"\b(?:LB7|LLY|LBZ|LMM|LML|L5P)\b|EcoDiesel|Hemi|\bLS\b|Jeep|Toyota|Nissan", t, re.I) \
                    and not re.match(r"cat:|brand:|part-type:", t):
                words.append(t)
        if words:
            yrs = ""
            if years:
                yrs = f" {int(min(years))}+" if open_ended else f" {int(min(years))}-{int(max(years))}"
            fams, notes = engine_families(" ".join(words) + yrs)
    y0 = min(years) if years else None
    y1 = None if (not years or open_ended) else max(years)
    return fams, y0, y1, open_ended, notes


def fitment(p: dict, store: str, title: str, text: str, variant_title: str | None = None) -> tuple[list[dict], str]:
    """-> (fits, source). One fit dict per family: fam, ci, cyl, y0, y1, notes."""
    tags = p.get("tags", [])
    src = None
    fams, notes = [], []
    y0 = y1 = None
    open_ended = False
    if variant_title and variant_title != "Default Title":
        f, n = engine_families(variant_title)
        if f:
            fams, notes, src = f, n, "variant"
            y0, y1, open_ended = title_years(variant_title)
    if not fams:
        f, n = engine_families(title)
        if f:
            fams, notes, src = f, n, "title"
            y0, y1, open_ended = title_years(title)
    if not fams:
        f, ty0, ty1, topen, n = tag_fitment(tags, store)
        if f:
            fams, notes, src = f, n, "tags"
            y0, y1, open_ended = ty0, ty1, topen
    if not fams:
        lead = "\n".join(text.splitlines()[:6])
        m = re.search(r"(?:Fits?|For|Application)s?:?\s*(.{5,120}?)(?:\.|\n|$)", lead, re.I)
        probe = m.group(1) if m else lead[:400]
        f, n = engine_families(probe)
        if f:
            fams, notes, src = f, n, "body"
            y0, y1, open_ended = title_years(probe)
    if fams and y0 is None:
        # years from the tags when the title named the engine but not the years (ATS / Banks)
        _f, ty0, ty1, topen, _n = tag_fitment(tags, store)
        if ty0 is not None:
            y0, y1, open_ended = ty0, ty1, topen
    body_lead = "\n".join(text.splitlines()[:8])
    if fams and y0 is None:
        # years from a 'Fits 2001-2016 ...' sentence in the body's first lines
        mf = re.search(r"(?:Fits?|For|Application)s?:?\s*([^\n.]{0,120}?(?:19|20)\d\d[^\n.]{0,80})", body_lead, re.I)
        if mf:
            by0, by1, bopen = title_years(mf.group(1))
            if by0 is not None:
                y0, y1, open_ended = by0, by1, bopen
                notes.append("years from the body's fitment sentence")
    if fams and y0 is None and fams == ["Duramax 6.6"]:
        codes = [c.upper() for c in DMX_CODE.findall(title + " " + " ".join(tags) + " " + body_lead)]
        spans = [DMX_YEARS[c] for c in dict.fromkeys(codes) if c in DMX_YEARS]
        if spans:
            y0 = min(s[0] for s in spans)
            y1 = None if any(s[1] is None for s in spans) else max(s[1] for s in spans)
            open_ended = y1 is None
            notes.append("years from the Duramax engine code(s)")
    fits = []
    for fam in fams:
        fit = {"fam": fam}
        if fam in FAM:
            fit.update(FAM[fam])
        else:
            fit["cyl"] = UNKNOWN_FAM_CYL.get(fam)
        fnotes = list(notes)
        if y0 is not None:
            fit["y0"] = int(y0)
            if y0 != int(y0):
                fnotes.append(f"from {y0}")
        if y1 is not None and not open_ended:
            fit["y1"] = int(y1)
            if y1 != int(y1):
                fnotes.append(f"to {y1}")
        fit["notes"] = "; ".join(dict.fromkeys(n for n in fnotes if n)) or None
        fits.append(fit)
    return fits, src or "none"


# --------------------------------------------------------------------------- classification
MERCH = re.compile(r"t-?shirt|hoodie|sweatshirt|\bhats?\b|beanie|\bcaps?\b(?! kit)|decal|sticker|banner|koozie|gift card|apparel|"
                   r"\bmerch\b|lanyard|keychain|poster|\bflag\b|\bmug\b|tumbler|jacket|\btee\b|socks|shirt", re.I)
MERCH_TYPES = {"Merch", "Apparel", "Gift Cards", "Gift Card", "Decals", "Swag"}
DELETE = re.compile(r"\bdelete\b|race pipe|\bDPF\b|\bDOC\b|\bSCR\b|\bEGR\b|\bDEF\b|cat-?less|test pipe|off-?road pipe|"
                    r"straight pipe|bypass pipe|def tank|emissions? (?:intact|equipped)|block(?:er|off) plate", re.I)
TOOL = re.compile(r"\btools?\b|checking|puller|installer|fixture|\bjig\b|dial indicator|tester|order form|core charge|"
                  r"core deposit|\bdeposit\b|\blabor\b|machining|balanc(?:e|ing) service|installation service|warranty|"
                  r"shipping|\bbook\b|catalog|\bmanual\b|donation|service fee|dyno", re.I)
TRANS = re.compile(r"transmission|torque converter|\bconverter\b|valve body|shift kit|\bTCM\b|thermal bypass|allison|"
                   r"\b68RFE\b|\b48RE\b|\b47RE\b|\b4R100\b|\b5R110\b|\b6R140\b|\b10R140\b|\bAisin\b|\bNAG1\b|flexplate|"
                   r"input shaft|output shaft|billet shaft|clutch|co-?pilot|trans(?:\s|-)?(?:pan|cooler|filter|fluid)|"
                   r"transfer case|differential|diff cover|\baxle|driveshaft|u-?joint|\bPTO\b", re.I)
HARDWARE = re.compile(r"\blines?\b|\bbrackets?\b|o-?rings?|\bseals?\b(?! housing)|washers?\b|\bclamps?\b|\bhoses?\b|\bfittings?\b|"
                      r"\bharness|\bsensor|\bsolenoid|\badapter|\bflanges?\b|\bcoupler|\bboots?\b|\bshims?\b|\bspacers?\b|\bplugs?\b|"
                      r"rebuild kit|repair kit|seal kit|install(?:ation)? kit|hardware kit|mounting kit|\bgrommet|\bstraps?\b|"
                      r"return line|feed line|crossover|\bsleeves?\b|\bconnectors?\b|retainer plate|thrust plate|\bkeys?\b|"
                      r"\bnuts?\b|\bbolts?\b(?! kit)|adjusting screw|adjusters?\b|jam nut|polylock|\bstands?\b|\bshafts?\b|"
                      r"\bbushings?\b|\bgears?\b|\bpulleys?\b|\btensioner|\bbelt\b|\bcovers?\b|\bhousing\b|\bactuator|"
                      r"\bwastegate\b|\bvalve\b(?! spring)|\bdowels?\b|\bstuds?\b(?! kit)", re.I)
EXHAUST = re.compile(r"exhaust system|exhaust kit|cat-?back|turbo-?back|dpf-?back|axle-?back|muffler|\btips?\b|tailpipe|"
                     r"down ?pipe|up-? ?pipes?|hot ?pipe|cold ?pipe|boost tubes?|charge pipe|intercooler pipe|\bpiping\b|"
                     r"intake tube|air filter|filter element|\bpipes?\b|\btubing\b|\btubes?\b|elbow|y-?bridge|"
                     r"cold[- ]side|hot[- ]side|resonator|silencer|heat shield|blanket|intake horn(?! manifold)|"
                     r"intake plenum|exhaust brake|\bstack\b", re.I)
MISC_SKIP = re.compile(r"oil pan|\bpans?\b|dipstick|coolant|radiator|water pump|fan clutch|thermostat|\bfilters?\b|filtration|"
                       r"\bFICM\b|\bIPR\b|\bICP\b|glow plug|\bbattery|alternator|starter|\bwiring|\bmodule|controller|monitor|"
                       r"display|idash|datamonster|pedal ?monster|throttle controller|gauge|\bpods?\b|pillar|\bhood\b|grille|"
                       r"badge|emblem|license|mirror|\bsteps?\b|bumper|wheel spacer|lug nut|lift kit|leveling|shock|traction bar|"
                       r"track bar|steering|tie rod|ball joint|\bbrakes?\b|\brotors?\b|fuel tank|\btank\b|\bsump\b|"
                       r"fuel rail\b(?! pressure)|rail plug|cylinder head stud(?!s)|\bvalve cover\b|cam cover|timing cover|"
                       r"front cover|rear cover|oil cap|\bcap\b|crankcase|\bbreather|\bCCV\b|catch can|oil separator|"
                       r"\bbed\b|tonneau|floor mat|seat|console|dash|\bwinch\b|\blight|\bled\b|\bbulb|\bhorn\b", re.I)
COMPLETE_ENGINE = re.compile(r"complete engine|long block|short block|crate engine|engine assembly|engine block|\bblock\b(?! plate)|"
                             r"cylinder head\b(?!.*(?:stud|bolt|gasket))|\bheads?\b(?= .*(?:assembled|bare|ported|cast))", re.I)


def vendor_brand(p: dict, store_brand: str) -> str:
    v = flat(p.get("vendor") or "")
    if not v:
        return store_brand
    if v in VENDOR_NAME:
        return VENDOR_NAME[v]
    for k, name in VENDOR_NAME.items():
        if v.lower() == k.lower():
            return name
    return v


def classify(p: dict, store: str, title: str, text: str) -> tuple[str | None, str | None]:
    """-> (cat, skip_reason). Exactly one is set. Order matters: skips first, then the most specific
    category words, so 'Turbo Oil Feed Line' is hardware and 'Injector Return Line Kit' is a line."""
    t = title
    pt = flat(p.get("product_type") or "")
    tags = [x.lower() for x in p.get("tags", [])]
    lead = "\n".join(text.splitlines()[:3])

    if pt in MERCH_TYPES or "merch" in tags or "apparel" in tags or MERCH.search(t):
        return None, "apparel / merch"
    if TOOL.search(t) or re.search(r"\bform\b", (p.get("variants") or [{}])[0].get("sku") or "", re.I):
        return None, "tool / service / order form"
    if DELETE.search(t) or re.search(r"\bdelete\b|race (?:use )?only pipe", lead, re.I) and re.search(r"EGR|DPF|SCR|DOC|DEF", t + lead):
        return None, "emissions-system part or delete (skipped by rule)"
    if TRANS.search(t):
        return None, "transmission / driveline"
    if any(x in ("coming soon", "in_development", "in development", "pre-order", "preorder") for x in tags) or \
            re.search(r"coming soon|pre-?order", t, re.I):
        return None, "not released yet (Coming Soon / In_Development)"
    if re.search(r"cylinder heads?\b|\bheads?\b", t, re.I) and re.search(r"cylinder|assembled|bare|ported|cast|stock\+|stage", t, re.I) \
            and not re.search(r"gasket|stud|bolt|cover|light|tool", t, re.I):
        return "head", None
    if re.search(r"\bbundle\b|\bpackage\b(?! of)|\bcombo\b(?! cam)|stage \d (?:kit|package)|power package|complete kit|"
                 r"max air ?flow|air ?flow bundle", t, re.I) and not re.search(r"\bcam\b|camshaft|turbo|intercooler|rotating|cooler|pump|injector", t, re.I):
        return None, "bundle / package of several categories"

    # specific categories, most distinctive words first
    if re.search(r"rotating assembly|rotating kit|stroker kit", t, re.I):
        return "rotatingAssembly", None
    if re.search(r"push ?rods?\b", t, re.I):
        if re.search(r"checking|tool|sleeve|cup only|ball only|ends?\b|adjuster|order form", t, re.I):
            return None, "pushrod hardware / tool"
        return "pushrod", None
    if re.search(r"\brocker arms?\b|\brockers?\b", t, re.I):
        t_own = re.sub(r"\b(?:for|fits?)\b.*$", "", t, flags=re.I)  # 'Rocker Arm ... for Manton, T&D and Crower Stands'
        if re.search(r"adjust(?:er|ing)|screw|shaft|stand|bolt|nut|bushing|trunnion|retainer|shim|spacer|oiling|hold ?down", t_own, re.I) \
                and not re.search(r"rocker arms? (?:set|kit)\b", t, re.I):
            return None, "rocker hardware (adjusters / shafts / stands / trunnions)"
        return "rocker", None
    if re.search(r"\blifters?\b|\btappets?\b", t, re.I):
        if HARDWARE.search(t) and not re.search(r"link ?bar|\bset\b|\bkit\b", t, re.I):
            return None, "lifter hardware"
        return "lifter", None
    if re.search(r"valve springs?\b|\bsprings? (?:kit|set)\b|beehive|dual springs?", t, re.I) and not re.search(r"wastegate|coil ?over", t, re.I):
        return "spring", None
    if re.search(r"\bretainers?\b|\bkeepers?\b|valve locks?\b", t, re.I) and re.search(r"spring|valve|titanium|tool steel", t + " " + lead, re.I):
        return "retainer", None
    if re.search(r"cam(?:shaft)?s?\b", t, re.I) and not re.search(r"cam(?:shaft)? (?:bearing|gear|sensor|position|key|plate|retainer|tool|cover|bolt|degree|thrust|plug|follower|bushing|tunnel)|"
                                                                     r"cam bearings|cam gear|cam sensor|camshaft position|sprocket|timing set|cam tool", t, re.I):
        if re.search(r"camshaft bearing|cam bearing", t, re.I):
            return "bearing", None
        return "cam", None
    if re.search(r"camshaft bearing|cam bearings?\b", t, re.I):
        return "bearing", None
    if re.search(r"\bbearings?\b", t, re.I) and re.search(r"\bmain|\brod\b|\bcam\b|engine bearing", t, re.I):
        return "bearing", None
    if re.search(r"connecting rods?\b|\brods?\b(?! (?:bolt|bearing|journal|end|cap|nut))", t, re.I) and not re.search(r"push ?rod|tie rod|rod bolt", t, re.I):
        return "rod", None
    if re.search(r"\bpistons?\b", t, re.I):
        if re.search(r"ring|pin|cooling|nozzle|cut|tool|oiler", t, re.I) and not re.search(r"pistons? (?:with|w/|and|&) rings", t, re.I):
            return None, "piston hardware (rings / pins / cooling nozzles)"
        return "pistonKit" if re.search(r"with rings|w/ rings|and rings|& rings|piston kit", t, re.I) else "piston", None
    if re.search(r"\bcrank(?:shaft)?s?\b", t, re.I) and not re.search(r"seal|bolt|pulley|damper|key|sensor|gear|hub|adapter|housing", t, re.I):
        return "crank", None
    if re.search(r"head gaskets?\b|fire ring", t, re.I) and not re.search(r"\bkit\b|\bset\b.*(?:complete|full)", t, re.I):
        return "headGasket", None
    if re.search(r"\bgaskets?\b", t, re.I):
        return "gasket", None
    if re.search(r"head studs?\b|main studs?\b|rod bolts?\b|head bolts?\b|main bolts?\b|flywheel bolts?\b|"
                 r"\bstud kit\b|\bARP\b.*(?:stud|bolt)|(?:stud|bolt) kit", t, re.I):
        return "fastener", None
    if re.search(r"\binjectors?\b", t, re.I):
        if re.search(r"nozzle|line|washer|gasket|seal|o-?ring|cup|sleeve|hold ?down|harness|connector|tool|install|"
                     r"return|puller|tester|cleaner|body|tube|clamp|bolt|sock|plug", t, re.I) and not re.search(r"injectors? (?:set|kit)\b", t, re.I):
            return None, "injector hardware / lines"
        return "injector", None
    if re.search(r"\bCP\.?[34](?:\.2)?\b|\bVP44\b|\bP7100\b|P-?Pump|\bVE Pump\b|injection pump|high[- ]pressure (?:fuel )?pump|"
                 r"\bHPFP\b|\bK16\b|\bDCR\b|\bHP4\b|stroker pump|\bCP3\b", t, re.I):
        if re.search(r"gear|bracket|seal|key|tool|line|fitting|plate|cover|plug|hose|w/o pump|without pump|kit only|no pump|"
                     r"\bFCA\b|\bMPROP\b|relief valve|pressure limiter|gasket", t, re.I):
            return None, "injection-pump hardware / kit without the pump"
        return "injectionPump", None
    if re.search(r"lift pump|\bFASS\b|AirDog|fuel (?:system|pump) (?:kit|upgrade)|\bPowerFlo\b|fuel supply|low[- ]pressure (?:fuel )?pump|"
                 r"\d{2,3}\s*GPH|electric fuel pump|fuel boss|mechanical lift", t, re.I):
        if re.search(r"filter|bracket|line|fitting|harness|relay|sump|module|tank|strainer|hose|mount|adapter", t, re.I) and \
                not re.search(r"pump\b.*\bkit|\bsystem\b", t, re.I):
            return None, "lift-pump hardware / filters"
        return "liftPump", None
    if re.search(r"intercooler|charge air cooler|\bCAC\b", t, re.I):
        if re.search(r"pipe|tube|boot|clamp|bracket|hose|coupler|mount", t, re.I) and not re.search(r"intercooler (?:kit|upgrade|system)|\bintercooler\b$", t, re.I):
            return None, "intercooler piping / hardware"
        return "intercooler", None
    if re.search(r"oil cooler|engine oil cooler|oil-?to-?water|oil thermostat", t, re.I) and not re.search(r"trans", t, re.I):
        if re.search(r"gasket|seal|o-?ring|line|hose|fitting|bracket|adapter|bolt|relocation plate", t, re.I) and not re.search(r"cooler (?:kit|system|upgrade)", t, re.I):
            return None, "oil-cooler hardware"
        return "oilCooler", None
    if re.search(r"\bEGR cooler\b", t, re.I):
        return None, "EGR cooler (emissions-system component, not a task category)"
    if re.search(r"\btuner\b|\btuning\b|programmer|\bderringer\b|six-?gun|\becu\b|\bpcm\b|\bEZ Lynk\b|\bAutoCal\b|"
                 r"\bHP Tuners\b|\bMM3\b|\bEFI ?Live\b|\bSCT\b|\bBully ?Dog\b|flash", t, re.I):
        if re.search(r"delete|race|off-?road", t + " " + lead, re.I):
            return None, "tune with emissions deletes (skipped by rule)"
        if re.search(r"harness|cable|mount|unlock|credit|licen[cs]e|support|switch|module", t, re.I) and not re.search(r"tuner|programmer|derringer", t, re.I):
            return None, "tuner accessory"
        return "tuner", None
    if re.search(r"exhaust manifold|intake manifold|manifold\b", t, re.I):
        if re.search(r"gasket|bolt|stud|sensor|plate|\bMAP\b|spacer|flange|heat shield|blanket", t, re.I):
            return None, "manifold hardware / gasket / sensor"
        return "manifold", None
    if re.search(r"monster-?ram|intake elbow|turbo inlet|intake plenum|high[- ]ram|intake horn", t, re.I):
        return "manifold", None
    if re.search(r"\bturbo(?:charger)?s?\b|\bVGT\b|compound kit|twin kit|S3\d\d|S4\d\d|\bS36[0-9]\b|\bS47[0-9]\b|\bHE\d{3}|\bHX\d\d|\bGT\d{4}|\bEFR\b", t, re.I):
        if re.search(r"turbo (?:oil|drain|feed|coolant|inlet|outlet|pedestal|mount|blanket|boot|gasket|flange|clamp|bolt|stud|"
                     r"wastegate|actuator|v-?band|wheel|housing|compressor|cover|shim|rebuild|cartridge|chra|core)|"
                     r"oil (?:drain|feed|return)|drain (?:tube|line|flange)|pedestal|exhaust housing|compressor housing|"
                     r"wastegate|actuator|v-?band|clamp|flange|bolt|stud|gasket|blanket|boot|coupler|install kit|"
                     r"rebuild|cartridge|chra|core only|wheel\b|shaft|bearing|back ?plate|heat shield|up-?pipe|down-?pipe|"
                     r"pipe\b|tube|hose|line|bracket|fitting|resonator|silencer|muffler|intake|filter|elbow|horn|mouthpiece|"
                     r"inlet|outlet|tee|spacer|adapter|plate|cover", t, re.I) and not re.search(r"turbo (?:kit|upgrade|system)|compound|twin", t, re.I):
            return None, "turbo hardware / plumbing"
        return "turbo", None
    if re.search(r"cold air intake|air intake|ram-?air|intake system|intake kit", t, re.I):
        if re.search(r"filter|tube|boot|clamp|hardware|bracket|scoop|lid|sock|wrap", t, re.I) and not re.search(r"intake (?:system|kit)", t, re.I):
            return None, "intake hardware / filter"
        return "intake", None
    if re.search(r"\bheaders?\b", t, re.I) and not re.search(r"gasket|bolt|flange|wrap|collector|reducer", t, re.I):
        return "header", None
    if re.search(r"oil pump", t, re.I) and not re.search(r"gear|pickup|screen|gasket|seal|tube", t, re.I):
        return "oilPump", None
    if re.search(r"\bdamper\b|harmonic balancer|\bbalancer\b", t, re.I) and not re.search(r"bolt|pulley|tool|key|spacer", t, re.I):
        return "damper", None
    if re.search(r"timing (?:set|chain|gear set)", t, re.I):
        return "timingSet", None
    if HARDWARE.search(t):
        return None, "hardware (lines / brackets / seals / fasteners / adapters ...)"
    if EXHAUST.search(t):
        return None, "exhaust / piping / filters (no task category)"
    if MISC_SKIP.search(t):
        return None, "accessory with no task category"
    if COMPLETE_ENGINE.search(t):
        return None, "engine / block / head assembly (no task category)"
    return None, f"other: {pt or 'untyped'}"


# --------------------------------------------------------------------------- spec parsers
INCH3 = r"(?<![\d.])(\d{0,2}\.\d{3})(?![\d])"
DUR_PAIR = re.compile(r"(?<![\d.])(\d{3})\s*(?:°|deg(?:rees)?)?\s*(?:/|x|-|&|and|,)\s*(\d{3})\s*(?:°|deg(?:rees)?)?(?![\d.])")
LIFT_PAIR = re.compile(r"(?<![\d])(\.\d{3})\s*\"?\s*(?:/|x|-|&|and)\s*(\.\d{3})\s*\"?")
PCT = re.compile(r"(\d{1,3})\s*%\s*(?:over|larger|bigger|more)?", re.I)
HP = re.compile(r"(?<![\d,.])(\d{1,2},\d{3}|\d{2,4})(?:\s*[-–]\s*(\d{1,2},\d{3}|\d{2,4}))?\s*\+?\s*(?:RW)?(?:HP|hp|Hp|horsepower|BHP|whp|WHP)\b")
CARB_EO = re.compile(r"\b(D-\d{3}-\d{1,3})\b")
RACE_ONLY = re.compile(r"competition[- ]use only|race (?:use )?only|off-?road use only|not legal for (?:sale or use|street|highway|on-?road)|"
                       r"not (?:legal|for sale) in california|cannot ship to california|no CARB|not CARB", re.I)
STOCK = re.compile(r"\bstock\b|\bOEM?\b|\bOE\b|factory|genuine|\breplacement\b|direct[- ]fit", re.I)


def frac_or_dec(s: str) -> float | None:
    s = s.strip().replace('"', "")
    if s in FRAC_IN:
        return FRAC_IN[s]
    return num(s)


def spec_pushrod(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    """Diameter / wall / length / ends / set count. Manton titles: '<engine>, Series 3 Pushrods, 3/8 x .080 Wall,
    [Cut To Length Kit,] 7.800, Set of 16'. Diesel pushrods: '7/16" x .165 wall', '11mm' etc."""
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''} | {text}"
    m = re.search(r"(?<![\d/.])(5/16|11/32|3/8|7/16|1/2|9/16|5/8|3/4|\.\d{3})\s*(?:\"|in(?:ch)?\.?)?\s*(?:dia(?:meter)?\.?)?\s*(?:x|X|by)\s*"
                  r"(\.\d{3}|0\.\d{3})\s*(?:\"|in)?\s*(?:wall|Wall|WALL)?", t)
    if m:
        spec["diameter"] = frac_or_dec(m.group(1))
        spec["wall"] = num(m.group(2))
    else:
        md = re.search(r"(?<![\d/.])(5/16|11/32|3/8|7/16|1/2|9/16|5/8)\s*(?:\"|in(?:ch)?)?\s*(?:dia(?:meter)?|pushrods?|push rods?)", t, re.I)
        if md:
            spec["diameter"] = FRAC_IN[md.group(1)]
        else:
            mm = re.search(r"(?<![\d.])(\d{1,2}(?:\.\d)?)\s*mm\b(?!\s*(?:lift|stroke|wheel|turbine|compressor))", t, re.I)
            if mm and 7 <= float(mm.group(1)) <= 14:
                spec["diameterMm"] = num(mm.group(1))
                spec["diameter"] = round(float(mm.group(1)) / 25.4, 3)
        mw = re.search(r"(\.\d{3})\s*(?:\"|in)?\s*wall|wall(?: thickness)?\s*(?:of|:)?\s*(\.\d{3})", t, re.I)
        if mw:
            spec["wall"] = num(mw.group(1) or mw.group(2))
    # length: a standalone x.xxx inch value in 4-13 that is not the wall or diameter, title first
    for src in (title, vt if vt != "Default Title" else "", text):
        for mv in re.finditer(r"(?<![\d.])(\d{1,2}\.\d{3})(?![\d])\s*(\"|in(?:ch)?\.?)?\s*(?:long|length|OAL|overall|tip to tip|center)?", src):
            v = float(mv.group(1))
            if 4.0 <= v <= 13.5 and v not in (spec.get("wall"), spec.get("diameter")):
                spec["length"] = num(mv.group(1))
                break
        if "length" in spec:
            break
    if re.search(r"cut[- ]to[- ](?:length|fit)", t, re.I):
        spec["cutToLength"] = True
    ms = re.search(r"Set of (\d{1,2})|\((\d{1,2})\)\s*(?:pcs|pieces)|(\d{1,2})\s*(?:pcs|pieces|pack)\b|\bset\s*(?:of)?\s*(16|12|8|6|24)\b", t, re.I)
    if ms:
        spec["qty"] = int(next(g for g in ms.groups() if g))
    me = re.search(r"(ball|cup)\s*(?:/|-|to|&|and)\s*(ball|cup)", t, re.I)
    if me:
        spec["ends"] = f"{me.group(1).lower()}/{me.group(2).lower()}"
    if re.search(r"4130|chrome ?moly|chromoly", t, re.I):
        spec["material"] = "4130 chromoly"
    elif re.search(r"\bsteel\b", t, re.I):
        spec["material"] = "steel"
    mser = re.search(r"Series\s*(\d)\b", title, re.I)
    if mser:
        spec["series"] = mser.group(1)  # a catalog code, kept as a string like every other `series`
    if re.search(r"one[- ]piece|1-piece|single piece", t, re.I):
        spec["construction"] = "one-piece"
    elif re.search(r"3-piece|three[- ]piece", t, re.I):
        spec["construction"] = "3-piece"
    if "diameter" not in spec:
        qa.append("pushrod diameter not stated")
    return spec, qa


def spec_cam(title: str, text: str, vt: str) -> tuple[dict, list[str], dict]:
    """Duration / lift / LSA / rpm / stage / type from prose. -> (spec, qa, kit_dict)."""
    spec, qa, kit = {}, [], {}
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    body = text
    both = t + "\n" + body
    # duration @ .050: pair within 60 chars of '.050' or 'duration'
    for m in DUR_PAIR.finditer(both):
        a, b = int(m.group(1)), int(m.group(2))
        if not (150 <= a <= 320 and 150 <= b <= 320):
            continue
        ctx = both[max(0, m.start() - 60): m.end() + 60]
        if re.search(r"\.050|050\"|at 50|@\s*\.?050", ctx):
            spec["dur050Int"], spec["dur050Exh"] = a, b
            break
        if re.search(r"advertised|seat[- ]to[- ]seat|@\s*\.?006|\.006", ctx, re.I):
            spec.setdefault("durAdvInt", a)
            spec.setdefault("durAdvExh", b)
        elif re.search(r"duration|\bcam\b|camshaft|grind", ctx, re.I) and "dur050Int" not in spec and "durAdvInt" not in spec:
            spec["dur050Int"], spec["dur050Exh"] = a, b
            qa.append(f"duration {a}/{b} read next to 'duration'/'cam' without an explicit .050 marker")
    m = re.search(r"(?:Int(?:ake)?|In)\s*:?\s*(\d{3})\s*°?\s*(?:@|at)\s*\.?050.{0,40}?(?:Exh(?:aust)?|Ex)\s*:?\s*(\d{3})", both, re.I)
    if m and "dur050Int" not in spec:
        spec["dur050Int"], spec["dur050Exh"] = int(m.group(1)), int(m.group(2))
    m = re.search(r"(?:Int(?:ake)?|In)\s*:?\s*(\d{3})\s*°?\s*(?:adv(?:ertised)?)", both, re.I)
    if m and "durAdvInt" not in spec:
        spec["durAdvInt"] = int(m.group(1))
        me = re.search(r"(?:Exh(?:aust)?|Ex)\s*:?\s*(\d{3})\s*°?\s*(?:adv(?:ertised)?)", both, re.I)
        if me:
            spec["durAdvExh"] = int(me.group(1))
    # lift
    ml = re.search(r"(?:valve )?lift\s*(?:\(.{0,20}\))?\s*:?\s*" + LIFT_PAIR.pattern, both, re.I) or \
        re.search(LIFT_PAIR.pattern + r"\s*(?:\"|in)?\s*(?:valve |gross |net )?lift", both, re.I)
    if ml:
        spec["valveLiftInt"], spec["valveLiftExh"] = num(ml.group(1)), num(ml.group(2))
    else:
        ml = re.search(r"(?:valve |gross |max )?lift\s*(?:\(.{0,20}\))?\s*:?\s*(\.\d{3})\b|(?<![\d])(\.\d{3})\s*\"?\s*(?:of )?(?:valve |gross |max )?lift", both, re.I)
        if ml:
            spec["valveLiftInt"] = num(ml.group(1) or ml.group(2))
    mll = re.search(r"lobe lift\s*:?\s*" + LIFT_PAIR.pattern, both, re.I)
    if mll:
        spec["lobeLiftInt"], spec["lobeLiftExh"] = num(mll.group(1)), num(mll.group(2))
    # LSA / ICL
    m = re.search(r"(?<![\d.])(\d{2,3}(?:\.\d)?)\s*°?\s*(?:LSA|lobe sep(?:a?ration)?(?: angle)?)|(?:LSA|lobe sep(?:a?ration)?(?: angle)?)\s*(?:\(.{0,8}\))?\s*:?\s*(\d{2,3}(?:\.\d)?)", both, re.I)
    if m:
        v = num(m.group(1) or m.group(2))
        if 95 <= v <= 130:
            spec["lsa"] = v
    m = re.search(r"(?<![\d.])(\d{2,3}(?:\.\d)?)\s*°?\s*(?:ICL|intake centerline)|(?:ICL|intake centerline)\s*:?\s*(\d{2,3}(?:\.\d)?)", both, re.I)
    if m:
        spec["icl"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d,])([\d,]{3,6})\s*(?:-|to)\s*([\d,]{4,6})\s*\+?\s*RPM", both, re.I)
    if m:
        lo, hi = int(m.group(1).replace(",", "")), int(m.group(2).replace(",", ""))
        if 500 <= lo < hi <= 9000:
            spec["rpmLow"], spec["rpmHigh"] = lo, hi
    else:
        m = re.search(r"(?:idle|Idle)\s*(?:-|to)\s*([\d,]{4,6})\s*RPM", both)
        if m:
            spec["rpmHigh"] = int(m.group(1).replace(",", ""))
    m = re.search(r"lash\s*:?\s*(\.\d{3})\s*\"?\s*(?:(?:int(?:ake)?|in)\s*)?(?:/|,|and|&)?\s*(\.\d{3})?", both, re.I)
    if m:
        spec["lash"] = num(m.group(1))
        if m.group(2):
            spec["lashExh"] = num(m.group(2))
    if re.search(r"hydraulic roller", both, re.I):
        spec["type"] = "hydraulic_roller"
    elif re.search(r"solid roller|mechanical roller", both, re.I):
        spec["type"] = "solid_roller"
    elif re.search(r"hydraulic flat|hydraulic (?:tappet|lifter)", both, re.I):
        spec["type"] = "hydraulic_flat"
    elif re.search(r"flat[- ]tappet|solid (?:tappet|lifter)|mechanical (?:tappet|lifter)|solid flat", both, re.I):
        spec["type"] = "solid_flat"
    elif re.search(r"roller (?:cam|lifter|tappet)", both, re.I):
        spec["type"] = "hydraulic_roller"
        qa.append("cam type 'roller' without hydraulic/solid stated; recorded hydraulic_roller")
    ms = re.search(r"Stage\s*(\d)", t, re.I) or re.search(r"Stage\s*(\d)", body)
    if ms:
        spec["stage"] = int(ms.group(1))
    mg = re.search(r"\"([^\"]{3,30})\"\s*(?:cam|camshaft|grind)|\|\s*([A-Z][\w ]{2,30})$", title)
    if mg:
        spec["grind"] = (mg.group(1) or mg.group(2)).strip()
    if re.search(r"billet", both, re.I):
        spec["material"] = "billet steel"
    elif re.search(r"\bcast\b", both, re.I) and re.search(r"cast (?:core|iron|camshaft|cam)", both, re.I):
        spec["material"] = "cast"
    elif re.search(r"\b8620\b|forged steel|steel (?:core|billet)", both, re.I):
        spec["material"] = "steel"
    if re.search(r"OEM replacement|stock (?:profile|replacement|grind)|factory (?:profile|grind)", both, re.I):
        spec["grind"] = spec.get("grind") or "OEM replacement"
    if re.search(r"alternate fire|alt(?:ernate)?[- ]fire", both, re.I):
        spec["firingOrder"] = "alternate fire"
    # kit contents ("Kit Includes:" / "Includes:" bullet lines)
    mk = re.search(r"(?:Kit Includes|Includes|What's Included|Package Includes)\s*:?\s*\n((?:.+\n){1,10})", body + "\n", re.I)
    if mk:
        items = []
        for l in mk.group(1).splitlines():
            l = l.strip("-•* ").strip()
            if not l or re.match(r"Optional|Upgrades?|Note|\*", l, re.I) or len(l) > 80:
                break
            items.append(l)
        if items:
            spec["components"] = items
            for it in items:
                low = it.lower()
                if re.search(r"tappet|lifter", low):
                    kit["lifters"] = it
                elif "spring" in low:
                    kit["springs"] = it
                elif "pushrod" in low or "push rod" in low:
                    kit["pushrods"] = it
                elif "retainer" in low or "keeper" in low:
                    kit["retainers"] = it
                elif "timing" in low or "gear" in low:
                    kit["timingSet"] = it
    if not any(k in spec for k in ("dur050Int", "durAdvInt", "valveLiftInt", "lsa")):
        qa.append("no numeric cam spec found in title/body")
    return spec, qa, kit


def spec_lift_pump(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"(?<![\d.])(\d{2,3})\s*(?:GPH|gph|gallons? per hour)", both)
    if m:
        spec["gph"] = int(m.group(1))
    m = re.search(r"(?<![\d.])(\d{1,3})\s*(?:-\s*(\d{1,3})\s*)?(?:psi|PSI)\b", both)
    if m:
        spec["psi"] = int(m.group(2) or m.group(1))
        if m.group(2):
            spec["psiLow"] = int(m.group(1))
    m = re.search(r"(\d{1,2})\s*(?:micron|μ|um)\b", both, re.I)
    if m:
        spec["filtration"] = f"{m.group(1)} micron"
    mh = HP.search(both)
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    if re.search(r"\bkit\b|\bsystem\b", title, re.I):
        spec["kit"] = True
    if not spec.get("gph"):
        qa.append("lift pump flow (GPH) not stated")
    return spec, qa


def spec_injector(title: str, text: str, vt: str) -> tuple[dict, list[str], bool]:
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    both = t + "\n" + text
    mp = PCT.search(vt if vt != "Default Title" else "") or PCT.search(title) or PCT.search(text[:600])
    if mp and int(mp.group(1)) <= 400:
        spec["pctOver"] = int(mp.group(1))
    mh = HP.search(vt if vt != "Default Title" else "") or HP.search(title) or HP.search(text[:600])
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
        if mh.group(2):
            spec["hpRatingLow"] = int(mh.group(1).replace(",", ""))
    m = re.search(r"(\d{2,3})\s*LPM", both, re.I)
    if m:
        spec["nozzleFlow"] = int(m.group(1))
    m = re.search(r"(\d{2,3})\s*cc\b", both, re.I)
    if m:
        spec["nozzleCc"] = int(m.group(1))
    m = re.search(r"(\d)\s*x\s*(\.\d{3}|\d{3})\s*(?:\"|in)?\s*(?:nozzle|hole)", both, re.I)
    if m:
        spec["nozzleHoles"] = int(m.group(1))
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b|exchange", both, re.I):
        spec["condition"] = "reman"
    elif re.search(r"\bNew\b|brand-new", both):
        spec["condition"] = "new"
    if re.search(r"\(Set\)|\bset of (?:6|8)\b|\bset\b", t, re.I):
        spec["set"] = True
    if re.search(r"garage sale|open box|scratch", t, re.I):
        spec["listing"] = "garage sale"
    if "pctOver" not in spec and re.search(r"\bstock\b|\bOEM?\b|factory|replacement", t, re.I) and not re.search(r"performance|over|\d+\s*hp", t, re.I):
        spec["pctOver"] = 0
    performance = bool(spec.get("pctOver")) or "hpRating" in spec or bool(re.search(r"performance|stage|race|competition", t, re.I))
    if "pctOver" not in spec and "hpRating" not in spec:
        qa.append("injector size (% over / HP) not stated")
    return spec, qa, performance


def spec_pump(title: str, text: str, vt: str) -> tuple[dict, list[str], bool]:
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    both = t + "\n" + text
    mt = re.search(r"\bCP\.?3\b|\bCP4(?:\.2)?\b|\bVP44\b|\bP7100\b|P-?Pump|\bVE\b|\bK16\b|\bDCR\b|\bHP4\b|\bHPFP\b", t, re.I)
    if mt:
        typ = mt.group(0).upper().replace(" ", "").replace(".", "").replace("-", "")
        spec["type"] = {"PPUMP": "P7100", "CP42": "CP4.2"}.get(typ, typ)
    mconv = re.search(r"\b(?:CP4(?:\.2)?|HP4|DCR)\s+to\s+(CP3|CP4|DCR)\b|\b(CP3)\s+conversion", t, re.I)
    if mconv:
        spec["type"] = (mconv.group(1) or mconv.group(2)).upper()
        spec["kit"] = True
    if spec.get("type") is None:
        qa.append("injection pump type not stated")
    mp = PCT.search(vt if vt != "Default Title" else "") or PCT.search(title)
    if mp and int(mp.group(1)) <= 400:
        spec["pctOver"] = int(mp.group(1))
    mm = re.search(r"(\d{2})\s*mm\s*(?:stroker|pump)?", both, re.I)
    if mm and 9 <= int(mm.group(1)) <= 14:
        spec["strokerMm"] = int(mm.group(1))
    mh = HP.search(t) or HP.search(text[:600])
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    if re.search(r"\bdual\b|twin", t, re.I):
        spec["dual"] = True
    if re.search(r"\bkit\b|conversion|retrofit", t, re.I):
        spec["kit"] = True
    if re.search(r"tuning required", t + " " + text[:300], re.I):
        spec["tuningRequired"] = True
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b", both, re.I):
        spec["condition"] = "reman"
    elif re.search(r"\bNew\b", both):
        spec["condition"] = "new"
    performance = bool(spec.get("pctOver")) or bool(spec.get("strokerMm")) or bool(re.search(r"stroker|performance|\d+\s*hp", t, re.I))
    return spec, qa, performance


TURBO_MODEL = re.compile(r"\b((?:HE|HX|HY)\d{3}[A-Z]*|GT[A-Z]?\d{4}[A-Z]*|GTX\d{4}R?|G\d\d-\d{3,4}|AVNT\d{4}|G?TP38|K0\d|KP\d\d|BV\d\d|B2BV|"
                         r"S[234]00(?:SX-?E|SX|SX-R|G)?|S4\d\d(?:\.\d)?|S3\d\d(?:\.\d)?|S2\d\d|S1B[A-Z]?|EFR ?\d{4}(?:-B)?|VGT|VNT)\b")


def spec_turbo(title: str, text: str, vt: str) -> tuple[dict, list[str], bool]:
    """Variant title first (it names the turbo of that option: 'S475 / 1.10'), then the product title, then the body."""
    spec, qa = {}, []
    vtx = vt if vt != "Default Title" else ""
    t = f"{title} | {vtx}"
    both = t + "\n" + text
    pair = re.compile(r"(?<![\d.])(\d\d(?:\.\d)?)\s*mm\s*/\s*(\d\d(?:\.\d)?)\s*mm(?:\s*/\s*([01]?\.\d\d))?|"
                      r"(?<![\d.])(\d\d(?:\.\d)?)\s*/\s*(\d\d(?:\.\d)?)(?![\d.%])(?:\s*(?:With|w/)?\s*([01]?\.\d\d)\s*A/R)?", re.I)
    scode = re.compile(r"\bS4(\d\d(?:\.\d)?)\b|\bS3(\d\d)\b")
    ar_re = re.compile(r"(?<![\d.])([01]?\.\d{1,2})\s*(?:A/?R|T/?HSG|turbine housing)|A/?R\s*(?:ratio)?\s*:?\s*([01]?\.\d{1,2})|"
                       r"/\s*([01]\.\d\d)\s*(?:T[346]|V-?Band|$)", re.I)
    for src in (vtx, title, text):
        if not src:
            continue
        m = pair.search(src)
        if m:
            a, b, c = (m.group(1), m.group(2), m.group(3)) if m.group(1) else (m.group(4), m.group(5), m.group(6))
            if 50 <= float(a) <= 110 and 50 <= float(b) <= 125:
                spec.setdefault("compressorInducer", num(a))
                spec.setdefault("turbineWheel", num(b))
                if c:
                    spec.setdefault("ar", num(c))
        ms = scode.search(src)
        if ms and (ms.group(1) or ms.group(2)) != "00":
            spec.setdefault("compressorInducer", num(ms.group(1) or ms.group(2)))
            spec.setdefault("model", "S4" + ms.group(1) if ms.group(1) else "S3" + ms.group(2))
        if src is not text or re.search(r"A/R", text) and not re.search(r"housing options", text, re.I):
            ma = ar_re.search(src)
            if ma:
                spec.setdefault("ar", num(ma.group(1) or ma.group(2) or ma.group(3)))
        if "compressorInducer" in spec and "turbineWheel" in spec and "ar" in spec:
            break
    if "compressorInducer" not in spec:
        # no digits allowed between the mm value and the word, so '63mm compressor, 76mm turbine' reads 63 not 76
        mc = re.search(r"(\d\d(?:\.\d+)?)\s*mm[^\d.\n,]{0,40}?(?:compressor|inducer|billet wheel|forged milled|FMW|BBT)|"
                       r"(?:compressor(?: wheel)?(?: inducer)?|inducer)\s*(?:size|diameter)?\s*:?\s*(\d\d(?:\.\d+)?)\s*mm", both, re.I)
        if mc:
            v = float(mc.group(1) or mc.group(2))
            if 45 <= v <= 115:
                spec["compressorInducer"] = num(mc.group(1) or mc.group(2))
    if "turbineWheel" not in spec:
        mt = re.search(r"(\d\d(?:\.\d+)?)\s*mm[^\d.\n,]{0,30}?turbine|turbine(?: wheel)?\s*(?:size|diameter)?\s*:?\s*(\d\d(?:\.\d+)?)\s*mm", both, re.I)
        if mt:
            v = float(mt.group(1) or mt.group(2))
            if 50 <= v <= 125:
                spec["turbineWheel"] = num(mt.group(1) or mt.group(2))
    mcm = re.search(r"(?<![\d.])(\d\d)\s*cm(?:2|²)?\s*(?:exhaust|turbine|housing)?", both, re.I)
    if mcm and 9 <= int(mcm.group(1)) <= 36:
        spec["housingCm2"] = int(mcm.group(1))
    mb = re.search(r"(\d{1,2})\s*[- ]?blade", t, re.I)
    if mb:
        spec["blades"] = int(mb.group(1))
    if re.search(r"\bVGT\b|\bVNT\b|variable[- ](?:geometry|vane)|HE300VG|HE351VE|HE341VE|GT3788VA|B2BV", both, re.I):
        spec["vgt"] = True
    elif re.search(r"wastegate|fixed[- ]geometry|S300|S400|HX35|HX40|HY35|HE351CW|TP38|GTP38", both, re.I):
        spec["vgt"] = False
    mrep = re.search(r"(?:replaces?|replacement for|drop-?in for|upgrade (?:for|over|from)|over (?:the|your)) (?:the |your )?(?:factory |OEM |stock )?([A-Z]{2,4}\d{3,4}[A-Z]*)\b", both)
    replaced = mrep.group(1).upper() if mrep else None
    if "model" not in spec:
        for src in (vtx, title, text[:500]):
            for mm_ in TURBO_MODEL.finditer(src):
                code = mm_.group(1).upper()
                if code in ("VGT", "VNT") or code == replaced:
                    continue
                spec["model"] = code
                break
            if "model" in spec:
                break
    ser = re.search(r"\b(Aurora\s*\d{4}|PhatShaft|Silver Bullet|Super ?B|Viper|SX-?E|SX-?R|PowerMax|Street Boss|Wicked ?Wheel|"
                    r"Stage \d|Drop-?In|Billet|BBT|Quick ?Spool)\b", t, re.I)
    if ser:
        spec["series"] = re.sub(r"\s+", " ", ser.group(1))
    if re.search(r"compound|twin|\bR2S\b|\batmosphere|\bsecondary\b", t, re.I):
        spec["compound"] = True
    if re.search(r"\bkit\b|\bsystem\b|\bswap\b", t, re.I):
        spec["kit"] = True
    mhp = re.search(r"(?:supports?|capable of|handle|good for|rated(?: for)?|up to)\s*(?:up to\s*)?(\d{3,4})\s*\+?\s*(?:rear-wheel )?(?:HP|hp|horsepower|RWHP|whp)", both, re.I)
    if mhp:
        spec["hpCapable"] = int(mhp.group(1))
    mr = re.search(r"(\d{3,4})\s*(?:-|to)\s*(\d{3,4})\s*\+?\s*(?:RW|W)?HP\b", both, re.I)
    if mr:
        spec["hpLow"], spec["hpHigh"] = int(mr.group(1)), int(mr.group(2))
    if replaced:
        spec["replacesOem"] = [replaced]
    oem = re.findall(r"\b(\d{7,8}|[0-9]{4}-[0-9]{4}|[A-Z]{1,2}\d[A-Z]\d{1,2}-\d[A-Z]\d{3}-[A-Z]{2})\b", text[:1500])
    if re.search(r"OEM (?:part|number|#)|cross[- ]reference|replaces", text, re.I) and oem:
        spec["replacesOem"] = sorted(set(spec.get("replacesOem", []) + oem[:12]))
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b", both, re.I):
        spec["condition"] = "reman"
    elif re.search(r"\bNew\b", both):
        spec["condition"] = "new"
    performance = bool(re.search(r"upgrade|performance|compound|S3\d\d|S4\d\d|SX-?E|billet|BBT|\d+\s*mm|drop-?in|stage", t, re.I))
    if not any(k in spec for k in ("compressorInducer", "turbineWheel", "model", "ar")):
        qa.append("no wheel size / model / A/R found")
    return spec, qa, performance


def spec_intercooler(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title}\n{text}"
    if re.search(r"bar[- ]?(?:and|&)[- ]?plate", both, re.I):
        spec["core"] = "bar-and-plate"
    elif re.search(r"tube[- ]?(?:and|&)[- ]?fin", both, re.I):
        spec["core"] = "tube-and-fin"
    if re.search(r"air[- ]to[- ]water|water[- ]to[- ]air|liquid", both, re.I):
        spec["type"] = "air-to-water"
    elif re.search(r"air[- ]to[- ]air|front[- ]mount|\bFMIC\b", both, re.I):
        spec["type"] = "air-to-air"
    m = re.search(r"(\d{1,2}(?:\.\d{1,2})?)\s*\"?\s*x\s*(\d{1,2}(?:\.\d{1,2})?)\s*\"?\s*x\s*(\d{1,2}(?:\.\d{1,2})?)\s*\"?\s*(?:core|inch)", both, re.I)
    if m:
        spec["coreIn"] = [num(m.group(1)), num(m.group(2)), num(m.group(3))]
    m = re.search(r"(\d{1,2}(?:\.\d{1,2})?)\s*\"?\s*(?:thick|core thickness)", both, re.I)
    if m and "coreIn" not in spec:
        spec["coreThickness"] = num(m.group(1))
    m = re.search(r"(\d{1,2}(?:\.\d)?)\s*\"\s*(?:inlet|outlet|end tank|boots?)", both, re.I)
    if m:
        spec["inletIn"] = num(m.group(1))
    m = re.search(r"(\d{2,3})\s*%\s*(?:more|larger|increase)", both, re.I)
    if m:
        spec["pctLargerThanStock"] = int(m.group(1))
    if re.search(r"\bkit\b|\bsystem\b|\bupgrade\b", title, re.I):
        spec["kit"] = True
    if re.search(r"boost tube|charge pipe|piping|tubes? included|with (?:boost )?tubes", both, re.I):
        spec["tubesIncluded"] = True
    return spec, qa


def spec_manifold(title: str, text: str, vt: str) -> tuple[dict, list[str], bool]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    spec["type"] = "intake" if re.search(r"intake|inlet|monster-?ram|high[- ]ram|plenum|horn", title, re.I) else "exhaust"
    m = re.search(r"(\d)[- ]piece", both, re.I)
    if m:
        spec["pieces"] = int(m.group(1))
    m = re.search(r"\b(T[346])\b(?:\s*flange)?|\bT4i\b|\bT4s\b|\bT6s\b|\bV-?band\b", both)
    if m:
        spec["flange"] = m.group(0).replace(" flange", "").strip()
    if re.search(r"stainless", both, re.I):
        spec["material"] = "stainless"
    elif re.search(r"\bcast\b|ductile|high[- ]silicon", both, re.I):
        spec["material"] = "cast"
    elif re.search(r"billet|6061|aluminum", both, re.I):
        spec["material"] = "aluminum"
    m = re.search(r"(?<![\d.])(\d(?:\.\d{1,2})?)\s*\"?\s*(?:inch|in\.?|\")\s*(?:inlet|outlet|intake|elbow|diameter|ID\b|bore)", both, re.I)
    if m:
        spec["diameterIn"] = num(m.group(1))
    if re.search(r"ceramic|coated|coating", both, re.I):
        spec["coating"] = "ceramic" if re.search(r"ceramic", both, re.I) else "coated"
    performance = bool(re.search(r"upgrade|high[- ]flow|performance|T3|T4|T6|monster|racing|billet", title, re.I))
    return spec, qa, performance


def spec_tuner(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    mh = re.search(r"(?:up to|adds?|gain(?:s|ing)? of|\+)\s*(\d{2,3})\s*\+?\s*(?:HP|hp|horsepower)", both)
    if mh:
        spec["hpGain"] = int(mh.group(1))
    mt = re.search(r"(?:up to|adds?|gain(?:s|ing)? of|\+)\s*(\d{2,3})\s*\+?\s*(?:lb[- ]?ft|ft[- ]?lbs?|torque)", both, re.I)
    if mt:
        spec["torqueGain"] = int(mt.group(1))
    m = re.search(r"(\d)\s*(?:power )?levels?|levels?\s*:?\s*(\d)", both, re.I)
    if m:
        spec["levels"] = int(m.group(1) or m.group(2))
    if re.search(r"plug[- ]and[- ]play|inline|in-line|piggy ?back", both, re.I):
        spec["type"] = "inline module"
    elif re.search(r"flash|reflash|\bOBD\b|programmer|handheld", both, re.I):
        spec["type"] = "ECU flash"
    m = re.search(r"\b(Derringer|Six-?Gun|PedalMonster|iDash|Speedbrake|Diesel Tuner|AutoMind|EZ Lynk|Edge|Bully ?Dog|SCT|Smarty|MM3)\b", title, re.I)
    if m:
        spec["model"] = m.group(1)
    return spec, qa


def spec_piston(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    both = t + "\n" + text
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:bore|in\.? bore)|bore\s*(?:size)?\s*:?\s*(\d\.\d{3,4})", both, re.I)
    if m:
        spec["bore"] = num(m.group(1) or m.group(2))
    mo = re.search(r"\b(STD|Standard|Std)\b|(?<![\d])\.(020|030|040|060|010|025)\s*\"?\s*(?:over(?:size)?|OS)?\b|\+?\s*(0?\.5|0?\.25|1\.0|0\.75)\s*mm", vt if vt != "Default Title" else t, re.I)
    if mo:
        if mo.group(1):
            spec["oversize"] = 0
        elif mo.group(2):
            spec["oversize"] = num("." + mo.group(2))
        else:
            spec["oversizeMm"] = num(mo.group(3))
    m = re.search(r"(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s*:\s*1\b|compression ratio\s*(?:of|:)?\s*(\d{1,2}(?:\.\d{1,2})?)", both, re.I)
    if m:
        v = num(m.group(1) or m.group(2))
        if 10 <= v <= 25:
            spec["cr"] = v
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*(?:compression height|CH\b|comp\.? ht)", both, re.I) or re.search(r"compression height\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["ch"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:pin|wrist pin)|pin\s*(?:diameter|size|bore)?\s*:?\s*(\d\.\d{3,4})", both, re.I)
    if m:
        spec["pin"] = num(m.group(1) or m.group(2))
    m = re.search(r"(-?\d{1,3}(?:\.\d)?)\s*cc\s*(?:dish|bowl|dome)|(?:dish|bowl)\s*(?:volume)?\s*:?\s*(\d{1,3}(?:\.\d)?)\s*cc", both, re.I)
    if m:
        v = num(m.group(1) or m.group(2))
        spec["domeCc"] = -abs(v) if re.search(r"dish|bowl", m.group(0), re.I) else v
    if re.search(r"2618", both):
        spec["alloy"] = "2618"
    elif re.search(r"4032", both):
        spec["alloy"] = "4032"
    elif re.search(r"\bsteel\b.*piston|monotherm|forged steel", both, re.I):
        spec["alloy"] = "steel"
    elif re.search(r"\bcast\b|hypereutectic", both, re.I):
        spec["alloy"] = "cast aluminum"
    elif re.search(r"forged", both, re.I):
        spec["alloy"] = "forged aluminum"
    if re.search(r"de-?lipped|delip", both, re.I):
        spec["bowl"] = "de-lipped"
    if re.search(r"with rings|w/ rings|rings included|&\s*rings|and rings", both, re.I):
        spec["ringsIncluded"] = True
    m = re.search(r"Mahle|Wiseco|JE\b|Diamond|Ross|CP[- ]Carrillo|Arias", both)
    if m:
        spec["forging"] = m.group(0)
    if re.search(r"coated|coating|skirt coat", both, re.I):
        spec["coated"] = True
    m = re.search(r"set of (\d)|\((\d)\)\s*pistons|(\d)\s*pistons", both, re.I)
    if m:
        spec["qty"] = int(next(g for g in m.groups() if g))
    mh = HP.search(t)
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    if not any(k in spec for k in ("bore", "cr", "ch", "pin", "domeCc")):
        qa.append("no numeric piston dimension found")
    return spec, qa


def spec_rod(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    both = t + "\n" + text
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:long|length|center[- ]to[- ]center|c/c|c-c|rod length)|"
                  r"(?:rod )?length\s*(?:of|:)?\s*(\d\.\d{3,4})|(?<![\d.])(\d\.\d{3})\s*\"?\s*rods?\b", both, re.I)
    if m:
        spec["length"] = num(m.group(1) or m.group(2) or m.group(3))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:big end|crank end|housing bore|rod journal)|big end\s*(?:bore|diameter)?\s*:?\s*(\d\.\d{3,4})", both, re.I)
    if m:
        spec["bigEnd"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:pin|small end|wrist pin|pin bore)|(?:pin|small end)\s*(?:bore|diameter|size)?\s*:?\s*(\d\.\d{3,4})|"
                  r"(\d{2}(?:\.\d{1,2})?)\s*mm\s*(?:pin|wrist pin)", both, re.I)
    if m:
        if m.group(3):
            spec["pinMm"] = num(m.group(3))
            spec["pin"] = round(float(m.group(3)) / 25.4, 4)
        else:
            spec["pin"] = num(m.group(1) or m.group(2))
    mb = re.search(r"\b([HIX])[- ]beam\b", both, re.I)
    if mb:
        spec["beam"] = mb.group(1).upper()
    m = re.search(r"\b(4340|4330|300M|4140|C300|Ti6Al4V|titanium)\b", both, re.I)
    if m:
        spec["material"] = m.group(1).upper().replace("TITANIUM", "titanium")
        if re.search(r"forged|billet", both, re.I):
            spec["material"] += " billet" if re.search(r"billet", both, re.I) else " forged"
    m = re.search(r"\b(ARP\s*2000|ARP\s*L19|ARP\s*625\+?|CA625\+?|Custom Age 625\+?|ARP\s*8740|ARP\s*3\.5|L19|ARP)\b(?:\s*(?:rod )?bolts?)?", both, re.I)
    if m:
        spec["bolt"] = re.sub(r"\s+", " ", m.group(1)).upper().replace("CUSTOM AGE 625+", "CA625+")
    m = re.search(r"(\d{3,4})\s*(?:g|grams?)\b", both, re.I)
    if m:
        spec["weight"] = int(m.group(1))
    mh = HP.search(t) or HP.search(text[:500])
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    m = re.search(r"set of (\d)|\((\d)\)\s*rods|(\d)\s*rods\b", both, re.I)
    if m:
        spec["qty"] = int(next(g for g in m.groups() if g))
    if re.search(r"standard length|stock length|OEM length", both, re.I):
        spec["lengthNote"] = "stock length"
    if not any(k in spec for k in ("length", "bigEnd", "pin")):
        qa.append("no numeric rod dimension found")
    return spec, qa


def spec_rotating(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    t = f"{title} | {vt if vt != 'Default Title' else ''}"
    mh = HP.search(t)
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    if re.search(r"un-?balanced", t, re.I):
        spec["balance"] = "unbalanced"
    elif re.search(r"balanced", t, re.I):
        spec["balance"] = "balanced"
    items = []
    mk = re.search(r"(?:Kit Includes|Includes|What's Included|Package Includes|Assembly Includes)\s*:?\s*\n((?:.+\n){1,12})", text + "\n", re.I)
    if mk:
        for l in mk.group(1).splitlines():
            l = l.strip("-•* ").strip()
            if not l or re.match(r"Optional|Upgrades?|Note|\*", l, re.I) or len(l) > 90:
                break
            items.append(l)
    if items:
        spec["components"] = items
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*stroke", t + "\n" + text, re.I)
    if m:
        spec["stroke"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*bore", t + "\n" + text, re.I)
    if m:
        spec["bore"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s*:\s*1\b", t + "\n" + text)
    if m and 10 <= float(m.group(1)) <= 25:
        spec["cr"] = num(m.group(1))
    if vt != "Default Title":
        spec["variant"] = short(vt, 60)
    return spec, qa


def spec_spring(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"(?<![\d.])(\d{2,3})\s*(?:#|lbs?\.?|pounds?)\s*(?:@|at|of)?\s*(?:seat|installed|closed)|seat (?:pressure|load)\s*(?:of|:)?\s*(\d{2,3})", both, re.I)
    if m:
        spec["seatLb"] = int(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d{2,3})\s*(?:#|lbs?\.?)\s*(?:@|at)?\s*(?:open|max lift|full lift)|open (?:pressure|load)\s*(?:of|:)?\s*(\d{2,3})", both, re.I)
    if m:
        spec["openLb"] = int(m.group(1) or m.group(2))
    m = re.search(r"installed height\s*(?:of|:)?\s*(\d\.\d{3})|(?:@|at)\s*(\d\.\d{3})\s*\"?\s*(?:installed|install height)", both, re.I)
    if m:
        spec["installedHt"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?:max(?:imum)? lift|lift (?:capability|capacity))\s*(?:of|:)?\s*(\.\d{3})|up to (\.\d{3})\s*\"?\s*(?:of )?lift", both, re.I)
    if m:
        spec["maxLift"] = num(m.group(1) or m.group(2))
    m = re.search(r"coil bind\s*(?:at|@|:)?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["coilBind"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*(?:OD|outside diameter|O\.D\.)", both, re.I)
    if m:
        spec["od"] = num(m.group(1))
    m = re.search(r"(\d{3})\s*(?:lbs?/in|lb/in|#/in|lbs? per inch)", both, re.I)
    if m:
        spec["rate"] = int(m.group(1))
    if re.search(r"\bdual\b|double", both, re.I):
        spec["dual"] = True
    elif re.search(r"\bsingle\b|beehive|conical", both, re.I):
        spec["dual"] = False
    if re.search(r"beehive|conical", both, re.I):
        spec["style"] = "beehive" if re.search(r"beehive", both, re.I) else "conical"
    m = re.search(r"(?<![\d,])([\d,]{4,5})\s*\+?\s*RPM", both, re.I)
    if m:
        spec["rpmHigh"] = int(m.group(1).replace(",", ""))
    m = re.search(r"set of (\d{1,2})|\((\d{1,2})\)\s*springs|(\d{1,2})\s*springs?\b", both, re.I)
    if m:
        spec["qty"] = int(next(g for g in m.groups() if g))
    if re.search(r"retainers? (?:and|&) (?:locks|keepers) included|includes? retainers|with retainers", both, re.I):
        spec["retainersIncluded"] = True
    if not any(k in spec for k in ("seatLb", "openLb", "installedHt", "maxLift", "rate")):
        qa.append("no numeric spring spec found")
    return spec, qa


def spec_lifter(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    if re.search(r"hydraulic roller", both, re.I):
        spec["style"] = "hydraulic_roller"
    elif re.search(r"solid roller|mechanical roller", both, re.I):
        spec["style"] = "solid_roller"
    elif re.search(r"hydraulic", both, re.I):
        spec["style"] = "hydraulic_flat"
    elif re.search(r"flat|tappet|solid", both, re.I):
        spec["style"] = "solid_flat"
    m = re.search(r"(?<![\d.])(\d?\.\d{3,4})\s*\"?\s*(?:body|dia(?:meter)?|OD)", both, re.I)
    if m:
        spec["bodyDia"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d?\.\d{3,4})\s*\"?\s*(?:roller|wheel)", both, re.I)
    if m:
        spec["rollerDia"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d\.\d{2,3})\s*\"?\s*(?:face|foot)", both, re.I)
    if m:
        spec["faceDia"] = num(m.group(1))
    if re.search(r"link[- ]?bar|tie[- ]bar", both, re.I):
        spec["linkBar"] = True
    if re.search(r"\bDLC\b", both):
        spec["dlc"] = True
    if re.search(r"OEM replacement|stock replacement|direct replacement", both, re.I):
        spec["grade"] = "OEM replacement"
    m = re.search(r"set of (\d{1,2})|\((\d{1,2})\)\s*(?:lifters|tappets)|(\d{1,2})\s*(?:lifters|tappets)\b", both, re.I)
    if m:
        spec["qty"] = int(next(g for g in m.groups() if g))
    return spec, qa


def spec_rocker(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"ratio\s*:?\s*(1\.\d{1,3})", both, re.I) or re.search(r"(1\.\d{1,3})\s*(?::\s*1\b|ratio)", both, re.I)
    if m:
        spec["ratio"] = num(m.group(1))
    m = re.search(r"fulcrum length\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["fulcrumLength"] = num(m.group(1))
    m = re.search(r"(?:pushrod )?offset\s*:?\s*(\.\d{3})\s*(Left|Right)?|(\.\d{3})\s*(?:\"|in)?\s*offset\s*(Left|Right)?", both, re.I)
    if m:
        spec["offset"] = num(m.group(1) or m.group(3))
        side = m.group(2) or m.group(4)
        if side:
            spec["offsetSide"] = side[0].upper()
    if re.search(r"shaft[- ]mount|shaft rocker|for .*stands", both, re.I):
        spec["type"] = "shaft"
    elif re.search(r"pedestal", both, re.I):
        spec["type"] = "pedestal"
    elif re.search(r"\bstud\b", both, re.I):
        spec["type"] = "stud"
    m = re.search(r"\b(5/16|3/8|7/16)\b\s*(?:ball|cup|adjuster)", both, re.I)
    if m:
        spec["adjuster"] = f"{m.group(1)} {re.search(r'ball|cup|adjuster', m.group(0), re.I).group(0).lower()}"
    if re.search(r"I-?beam", both, re.I):
        spec["beam"] = "I"
    if re.search(r"steel", both, re.I):
        spec["material"] = "steel"
    elif re.search(r"aluminum", both, re.I):
        spec["material"] = "aluminum"
    if re.search(r"pressure[- ]fed|pressure fed oil", both, re.I):
        spec["oiling"] = "pressure-fed"
    if "ratio" not in spec:
        qa.append("rocker ratio not stated")
    return spec, qa


def spec_fastener(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    for app in ("head stud", "head bolt", "main stud", "main bolt", "rod bolt", "flywheel bolt", "flexplate bolt", "damper bolt",
                "intake manifold bolt", "exhaust manifold stud", "valve cover bolt", "injector hold down bolt", "bed plate stud"):
        if re.search(app.replace(" ", r"\s*") + r"s?", both, re.I):
            spec["application"] = app
            break
    m = re.search(r"\b(M\d{1,2})\b|(?<![\d/])(\d{1,2}/\d{1,2}|1/2|9/16|5/8)\s*(?:\"|in)?\s*(?:-\s*\d\d)?\s*(?:stud|bolt|thread|dia)", both, re.I)
    if m:
        if m.group(1):
            spec["metric"] = m.group(1)
        elif m.group(2) in FRAC_IN:
            spec["diameter"] = FRAC_IN[m.group(2)]
    m = re.search(r"\b(ARP\s*2000|ARP\s*L19|L19|Custom Age 625\+?|CA625\+?|625\+|8740|4340|ARP\s*3\.5|Inconel|H-?11)\b", both, re.I)
    if m:
        spec["material"] = re.sub(r"\s+", " ", m.group(1)).upper().replace("CUSTOM AGE 625+", "CA625+")
    m = re.search(r"(\d{2,3})\s*(?:ft[- .]?lbs?|lb[- ]?ft|foot pounds)", both, re.I)
    if m:
        spec["torque"] = int(m.group(1))
    m = re.search(r"(\d{3})\s*,?(\d{3})\s*psi", both, re.I)
    if m:
        spec["tensilePsi"] = int(m.group(1) + m.group(2))
    m = re.search(r"\b(12[- ]point|hex)\b", both, re.I)
    if m:
        spec["nut"] = m.group(1).lower().replace(" ", "-")
    m = re.search(r"ARP\s*#?\s*(\d{3}-\d{4})", both)
    if m:
        spec["arpPn"] = m.group(1)
    if "application" not in spec:
        qa.append("fastener application not stated")
    return spec, qa


def spec_head_gasket(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"(?<![\d])(\.\d{3})\s*\"?\s*(?:thick|thickness)|thickness\s*:?\s*(\.\d{3})|(\d\.\d{2,3})\s*mm\s*thick", both, re.I)
    if m:
        if m.group(3):
            spec["thicknessMm"] = num(m.group(3))
            spec["thickness"] = round(float(m.group(3)) / 25.4, 3)
        else:
            spec["thickness"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*bore|bore\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["bore"] = num(m.group(1) or m.group(2))
    if re.search(r"\bMLS\b|multi[- ]layer(?:ed)? steel", both, re.I):
        spec["material"] = "MLS"
    elif re.search(r"copper", both, re.I):
        spec["material"] = "copper"
    elif re.search(r"composite|graphite|fire ring", both, re.I):
        spec["material"] = "composite"
    if re.search(r"fire ring", both, re.I):
        spec["style"] = "fire ring"
    m = re.search(r"grade\s*([A-C])\b|\b([ABC])[- ]grade", both, re.I)
    if m:
        spec["grade"] = (m.group(1) or m.group(2)).upper()
    m = re.search(r"\b(\d{1,2}(?:\.\d)?)\s*mm\s*(?:over|oversize|bore)", both, re.I)
    if m:
        spec["boreOversizeMm"] = num(m.group(1))
    return spec, qa


def spec_gasket(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"\b(T[346]i?s?|V-?band|HX\d\d|HE\d{3}|S300|S400)\b", title)
    if m:
        spec["flange"] = m.group(1)
    for kind in ("exhaust manifold", "intake manifold", "turbo", "valve cover", "oil pan", "front cover", "rear cover", "intake",
                 "exhaust", "intercooler", "up-pipe", "downpipe", "oil cooler", "water pump", "thermostat", "injector", "turbo pedestal"):
        if re.search(kind.replace("-", "-?").replace(" ", r"\s*"), both, re.I):
            spec["application"] = kind
            break
    if re.search(r"\bMLS\b|multi[- ]layer", both, re.I):
        spec["material"] = "MLS"
    elif re.search(r"stainless", both, re.I):
        spec["material"] = "stainless"
    elif re.search(r"copper", both, re.I):
        spec["material"] = "copper"
    elif re.search(r"graphite|composite|fiber", both, re.I):
        spec["material"] = "composite"
    m = re.search(r"(?<![\d])(\.\d{3})\s*\"?\s*thick", both, re.I)
    if m:
        spec["thickness"] = num(m.group(1))
    if re.search(r"\bkit\b|\bset\b", title, re.I):
        spec["kit"] = True
    return spec, qa


def spec_head(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"(?<![\d.])(\d{2,3}(?:\.\d)?)\s*cc\s*(?:chamber|combustion)", both, re.I)
    if m:
        spec["chamberCc"] = num(m.group(1))
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*(?:intake valve|int\.? valve)|intake valves?\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["intakeValve"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*(?:exhaust valve|exh\.? valve)|exhaust valves?\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["exhaustValve"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d{2,3})\s*(?:#|lbs?)\s*(?:valve )?springs?|springs?\s*:?\s*(\d{2,3})\s*(?:#|lbs?)", both, re.I)
    if m:
        spec["springSeatLb"] = int(m.group(1) or m.group(2))
    if re.search(r"\bbare\b", both, re.I):
        spec["bare"] = True
    elif re.search(r"assembled|complete|loaded", both, re.I):
        spec["bare"] = False
    if re.search(r"\bnew cast\b|new casting|brand new", both, re.I):
        spec["casting"] = "new"
    elif re.search(r"reman|rebuilt|remanufactured|core", both, re.I):
        spec["casting"] = "reman"
    if re.search(r"ported|port(?:ed|ing)|CNC", both, re.I):
        spec["ported"] = True
    if re.search(r"fire ring|o-?ring(?:ed)?", both, re.I):
        spec["fireRinged"] = True
    m = re.search(r"Stage\s*(\d)|Stock\s*\+", title, re.I)
    if m:
        spec["grade"] = m.group(0)
    if re.search(r"cast iron|\biron\b", both, re.I):
        spec["material"] = "iron"
    elif re.search(r"aluminum|billet", both, re.I):
        spec["material"] = "aluminum"
    mh = HP.search(both)
    if mh:
        spec["hpRating"] = int((mh.group(2) or mh.group(1)).replace(",", ""))
    return spec, qa


def spec_oil_cooler(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    if re.search(r"relocat", both, re.I):
        spec["type"] = "remote / relocation"
    elif re.search(r"air[- ]to[- ]oil|air cooled|remote", both, re.I):
        spec["type"] = "air-to-oil"
    elif re.search(r"oil[- ]to[- ]water|coolant|water[- ]to[- ]oil|stacked plate|factory location|OEM location", both, re.I):
        spec["type"] = "oil-to-water"
    m = re.search(r"(\d{1,2})\s*(?:-|\s)?(?:row|plate)s?\b", both, re.I)
    if m:
        spec["rows"] = int(m.group(1))
    m = re.search(r"(\d{1,2})\s*(?:micron|μ)\b", both, re.I)
    if m:
        spec["filtration"] = f"{m.group(1)} micron"
    if re.search(r"thermostat|thermostatic", both, re.I):
        spec["thermostat"] = True
    if re.search(r"\bkit\b|\bsystem\b", title, re.I):
        spec["kit"] = True
    if re.search(r"direct (?:fit|replacement)|OEM replacement|factory replacement", both, re.I):
        spec["grade"] = "OEM replacement"
    if re.search(r"upgraded|upgrade|heavy[- ]duty|bulletproof", both, re.I):
        spec["grade"] = spec.get("grade") or "upgraded"
    return spec, qa


def spec_header(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title}\n{text}"
    m = re.search(r"(?<![\d.])(\d(?:[ -]\d/\d)?(?:\.\d{1,3})?)\s*\"?\s*(?:primary|primaries|tube)", both, re.I)
    if m:
        spec["primary"] = m.group(1)
    m = re.search(r"(?<![\d.])(\d(?:\.\d{1,2})?)\s*\"?\s*collector", both, re.I)
    if m:
        spec["collector"] = num(m.group(1))
    if re.search(r"stainless|304|321", both, re.I):
        spec["material"] = "stainless"
    elif re.search(r"mild steel", both, re.I):
        spec["material"] = "mild steel"
    if re.search(r"long[- ]tube", both, re.I):
        spec["type"] = "long-tube"
    elif re.search(r"shorty|short[- ]tube", both, re.I):
        spec["type"] = "shorty"
    return spec, qa


def spec_generic(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    if vt != "Default Title":
        spec["variant"] = short(vt, 60)
    return spec, qa


def spec_bearing(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    spec["position"] = "cam" if re.search(r"\bcam", title, re.I) else "main" if re.search(r"\bmain", title, re.I) else "rod" if re.search(r"\brod", title, re.I) else None
    m = re.search(r"(?<![\d.])(\.0\d\d|\.00\d)\s*\"?\s*(?:under|US\b|undersize)|(STD|standard)\s*(?:size)?", vt if vt != "Default Title" else title, re.I)
    if m:
        spec["undersize"] = 0 if m.group(2) else num(m.group(1))
    m = re.search(r"\b(H[- ]?series|P[- ]?series|HP\b|XP\b|tri-?metal|bi-?metal|coated)\b", both, re.I)
    if m:
        spec["series"] = m.group(1)
    return spec, qa


def spec_crank(title: str, text: str, vt: str) -> tuple[dict, list[str]]:
    spec, qa = {}, []
    both = f"{title} | {vt if vt != 'Default Title' else ''}\n{text}"
    m = re.search(r"(?<![\d.])(\d\.\d{3})\s*\"?\s*stroke|stroke\s*:?\s*(\d\.\d{3})", both, re.I)
    if m:
        spec["stroke"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*(?:main|mains)\b|main journal\s*:?\s*(\d\.\d{3,4})", both, re.I)
    if m:
        spec["mainJournal"] = num(m.group(1) or m.group(2))
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})\s*\"?\s*rod journal|rod journal\s*:?\s*(\d\.\d{3,4})", both, re.I)
    if m:
        spec["rodJournal"] = num(m.group(1) or m.group(2))
    m = re.search(r"\b(4340|4330|EN30B|300M|billet|forged|cast)\b", both, re.I)
    if m:
        spec["material"] = m.group(1)
    if re.search(r"un-?balanced", both, re.I):
        spec["balance"] = "unbalanced"
    elif re.search(r"balanced", both, re.I):
        spec["balance"] = "balanced"
    return spec, qa


SPEC = {
    "pushrod": spec_pushrod, "liftPump": spec_lift_pump, "intercooler": spec_intercooler, "tuner": spec_tuner,
    "piston": spec_piston, "pistonKit": spec_piston, "rod": spec_rod, "rotatingAssembly": spec_rotating,
    "spring": spec_spring, "lifter": spec_lifter, "rocker": spec_rocker, "fastener": spec_fastener,
    "headGasket": spec_head_gasket, "gasket": spec_gasket, "head": spec_head, "oilCooler": spec_oil_cooler,
    "header": spec_header, "bearing": spec_bearing, "crank": spec_crank, "retainer": spec_generic,
    "oilPump": spec_generic, "damper": spec_generic, "timingSet": spec_generic, "intake": spec_generic,
}


def emissions_for(cat: str, tags: list[str], title: str, text: str, performance: bool) -> str | None:
    if cat not in EMISSIONS_CATS:
        return None
    m = CARB_EO.search(text) or CARB_EO.search(title)
    if m:
        return f"carb_eo:{m.group(1)}"
    if any(t.strip().lower() == "ca-exclusion" for t in tags):
        # Banks: 'CA-Exclusion' = not for sale in California = no CARB EO. The enum's only "no EO" value.
        return "no_eo_race_only"
    if RACE_ONLY.search(text) or RACE_ONLY.search(title):
        return "no_eo_race_only"
    if re.search(r"CARB\s*(?:EO|approved|compliant|exempt)|50[- ]state (?:legal|compliant)", text, re.I):
        return "unknown"  # EO claimed without a number: cannot cite it
    if not performance and (STOCK.search(title) or re.search(r"stock replacement|OEM replacement|direct[- ]fit replacement|"
                                                              r"no (?:tuning|programming) required", text[:800], re.I)):
        return "oem_replacement"
    return "unknown"


# --------------------------------------------------------------------------- variants
COSMETIC_OPT = re.compile(r"colou?r|finish|coat(?:ing)?|powder|polish|anodiz", re.I)


def variant_groups(p: dict) -> list[dict]:
    """Collapse variants that differ only by a cosmetic option (color / finish) into one group.
    -> [{sku, title, finishes, skus, variant}] in listing order."""
    options = p.get("options") or []
    names = [o.get("name", "") for o in options]
    cosmetic_idx = {i for i, n in enumerate(names) if COSMETIC_OPT.search(n)}
    groups: dict[tuple, dict] = {}
    order = []
    for v in p.get("variants") or []:
        vals = [v.get("option1"), v.get("option2"), v.get("option3")][: max(1, len(names))]
        key = tuple(val for i, val in enumerate(vals) if i not in cosmetic_idx)
        fin = [val for i, val in enumerate(vals) if i in cosmetic_idx and val]
        title = " / ".join(str(x) for x in key if x) or "Default Title"
        if key not in groups:
            groups[key] = {"sku": flat(v.get("sku") or ""), "title": title, "finishes": [], "skus": [], "variant": v}
            order.append(key)
        g = groups[key]
        if flat(v.get("sku") or ""):
            g["skus"].append(flat(v["sku"]))
        g["finishes"] += [f for f in fin if f not in g["finishes"]]
        if not g["sku"]:
            g["sku"] = flat(v.get("sku") or "")
    return [groups[k] for k in order]


def body_part_number(text: str) -> str | None:
    m = re.search(r"Part\s*(?:Number|No\.?|#)\s*:?\s*([A-Z0-9][A-Z0-9.\-/]{2,30})", text)
    return m.group(1).rstrip(".") if m else None


# --------------------------------------------------------------------------- names
def make_name(cat: str, spec: dict, title: str, fits: list[dict]) -> str:
    bits = []
    if cat == "pushrod":
        bits.append("pushrods" if spec.get("qty", 2) != 1 else "pushrod")
        if "diameter" in spec and "wall" in spec:
            d = f"{spec['diameterMm']} mm" if "diameterMm" in spec else f"{spec['diameter']:.4g}"
            bits.append(f"{d} x {spec['wall']:.3f} wall")
        elif "diameter" in spec:
            bits.append(f"{spec['diameter']:.4g} dia")
        if "length" in spec:
            bits.append(f"{spec['length']:.3f} long" + (" (cut to length)" if spec.get("cutToLength") else ""))
        if spec.get("series"):
            bits.append(f"series {spec['series']}")
        if spec.get("qty"):
            bits.append(f"set of {spec['qty']}")
    elif cat == "cam":
        bits.append(f"stage {spec['stage']} cam" if spec.get("stage") else "cam")
        if "dur050Int" in spec:
            bits.append(f"{spec['dur050Int']}/{spec.get('dur050Exh', '?')} @ .050")
        elif "durAdvInt" in spec:
            bits.append(f"{spec['durAdvInt']}/{spec.get('durAdvExh', '?')} adv")
        if "valveLiftInt" in spec:
            bits.append(f".{int(round(spec['valveLiftInt'] * 1000)):03d}" + (f"/.{int(round(spec['valveLiftExh'] * 1000)):03d}" if spec.get("valveLiftExh") else "") + " lift")
        if "lsa" in spec:
            bits.append(f"{spec['lsa']} LSA")
        if spec.get("grind"):
            bits.append(spec["grind"])
        if spec.get("components"):
            bits.append("combo kit")
    elif cat == "liftPump":
        bits.append("lift pump kit" if spec.get("kit") else "lift pump")
        if "gph" in spec:
            bits.append(f"{spec['gph']} GPH")
        if "psi" in spec:
            bits.append(f"{spec['psi']} psi")
    elif cat == "injector":
        kind = "stock" if spec.get("pctOver") == 0 else "performance" if (spec.get("pctOver") or spec.get("hpRating")) else ""
        bits.append(f"{spec.get('condition', '')} {kind} injector".strip())
        if spec.get("pctOver"):
            bits.append(f"{spec['pctOver']}% over")
        if spec.get("hpRating"):
            bits.append(f"{spec['hpRating']} HP")
        if spec.get("set"):
            bits.append("set")
    elif cat == "injectionPump":
        bits.append(f"{spec.get('type', 'injection')} {'pump kit' if spec.get('kit') else 'pump'}")
        if spec.get("dual"):
            bits.insert(0, "dual")
        if spec.get("pctOver"):
            bits.append(f"{spec['pctOver']}% over")
        if spec.get("strokerMm"):
            bits.append(f"{spec['strokerMm']} mm stroker")
        if spec.get("hpRating"):
            bits.append(f"{spec['hpRating']} HP")
    elif cat == "turbo":
        head = [spec[k] for k in ("series", "model") if spec.get(k)]
        head.append("compound turbo kit" if spec.get("compound") else "turbo kit" if spec.get("kit") else "turbo")
        bits.append(" ".join(head))
        if spec.get("compressorInducer"):
            bits.append(f"{spec['compressorInducer']} mm compressor")
        if spec.get("turbineWheel"):
            bits.append(f"{spec['turbineWheel']} mm turbine")
        if spec.get("ar"):
            bits.append(f"{spec['ar']:.2f} A/R")
        if spec.get("vgt"):
            bits.append("VGT")
        if spec.get("blades"):
            bits.append(f"{spec['blades']} blade")
    elif cat == "intercooler":
        bits.append("intercooler" + (" kit" if spec.get("kit") else ""))
        if spec.get("core"):
            bits.append(spec["core"])
        if spec.get("coreIn"):
            bits.append("x".join(str(x) for x in spec["coreIn"]) + " core")
    elif cat == "manifold":
        bits.append(f"{spec.get('type', '')} manifold".strip())
        if spec.get("pieces"):
            bits.append(f"{spec['pieces']}-piece")
        if spec.get("flange"):
            bits.append(f"{spec['flange']} flange")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "tuner":
        bits.append(f"{spec.get('model', '')} tuner".strip())
        if spec.get("type"):
            bits.append(spec["type"])
        if spec.get("hpGain"):
            bits.append(f"+{spec['hpGain']} HP")
    elif cat in ("piston", "pistonKit"):
        bits.append(f"{spec.get('alloy', '')} piston{'s' if spec.get('qty', 2) != 1 else ''}".strip() + (" with rings" if cat == "pistonKit" else ""))
        if spec.get("bowl"):
            bits.append(spec["bowl"])
        if "bore" in spec:
            bits.append(f"{spec['bore']} bore")
        if "oversize" in spec:
            bits.append("std bore" if spec["oversize"] == 0 else f"+{spec['oversize']:.3f} over")
        if "oversizeMm" in spec:
            bits.append(f"+{spec['oversizeMm']} mm over")
        if "cr" in spec:
            bits.append(f"{spec['cr']}:1")
    elif cat == "rod":
        bits.append(f"{spec.get('material', '')} {spec.get('beam', '')}{'-beam ' if spec.get('beam') else ''}rods".strip())
        if "length" in spec:
            bits.append(f"{spec['length']} long")
        elif spec.get("lengthNote"):
            bits.append(spec["lengthNote"])
        if spec.get("bolt"):
            bits.append(f"{spec['bolt']} bolts")
        if spec.get("hpRating"):
            bits.append(f"{spec['hpRating']} HP")
    elif cat == "rotatingAssembly":
        bits.append("rotating assembly")
        if spec.get("hpRating"):
            bits.append(f"{spec['hpRating']} HP")
        if spec.get("balance"):
            bits.append(spec["balance"])
        if spec.get("variant"):
            bits.append(spec["variant"])
    elif cat == "spring":
        bits.append("dual valve springs" if spec.get("dual") else "valve springs")
        if "seatLb" in spec:
            bits.append(f"{spec['seatLb']} lb seat")
        if "installedHt" in spec:
            bits.append(f"@ {spec['installedHt']:.3f}")
        if "maxLift" in spec:
            bits.append(f"{spec['maxLift']:.3f} max lift")
    elif cat == "lifter":
        bits.append({"hydraulic_roller": "hydraulic roller lifters", "solid_roller": "solid roller lifters",
                     "solid_flat": "flat tappets", "hydraulic_flat": "hydraulic flat lifters"}.get(spec.get("style"), "lifters"))
        if spec.get("rollerDia"):
            bits.append(f"{spec['rollerDia']} roller")
        if spec.get("qty"):
            bits.append(f"set of {spec['qty']}")
    elif cat == "rocker":
        bits.append(f"{spec['ratio']} ratio rocker" if spec.get("ratio") else "rocker arm")
        if spec.get("type"):
            bits.append(f"{spec['type']} mount")
        if "offset" in spec:
            bits.append(f"{spec['offset']:.3f} offset" + (f" {spec['offsetSide']}" if spec.get("offsetSide") else ""))
    elif cat == "fastener":
        bits.append(spec.get("application", "fastener kit"))
        if spec.get("material"):
            bits.append(spec["material"])
        if spec.get("metric"):
            bits.append(spec["metric"])
        elif spec.get("diameter"):
            bits.append(f"{spec['diameter']} in")
    elif cat == "headGasket":
        bits.append(f"{spec.get('style', spec.get('material', ''))} head gasket".strip())
        if "thickness" in spec:
            bits.append(f"{spec['thickness']:.3f} thick")
        if "bore" in spec:
            bits.append(f"{spec['bore']:.3f} bore")
    elif cat == "gasket":
        bits.append(f"{spec.get('application', '')} gasket{' kit' if spec.get('kit') else ''}".strip())
        if spec.get("flange"):
            bits.append(spec["flange"])
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "head":
        bits.append("bare cylinder head" if spec.get("bare") else "cylinder head")
        if spec.get("grade"):
            bits.append(spec["grade"])
        if spec.get("casting"):
            bits.append(f"{spec['casting']} casting")
        if spec.get("fireRinged"):
            bits.append("fire-ringed")
    elif cat == "oilCooler":
        bits.append("oil cooler" + (" kit" if spec.get("kit") else ""))
        if spec.get("type"):
            bits.append(spec["type"])
        if spec.get("grade"):
            bits.append(spec["grade"])
    elif cat == "header":
        bits.append(f"{spec.get('type', '')} headers".strip())
        if spec.get("primary"):
            bits.append(f"{spec['primary']} primaries")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "intake":
        bits.append("cold air intake")
    else:
        bits.append(short(title, 60))
    name = ", ".join(b for b in bits if b)
    return re.sub(r"\s+", " ", name).strip(", ") or short(title, 60)


# --------------------------------------------------------------------------- build
def build(store: str, products: list[dict], stats: Stats) -> list[dict]:
    host, store_brand = STORES[store]
    recs = []
    for p in products:
        title = flat(htmlmod.unescape(re.sub(r"<[^>]+>", " ", p.get("title") or "")))
        text = strip_html_lines(p.get("body_html") or "")
        tags = [flat(t) for t in (p.get("tags") or [])]
        brand = vendor_brand(p, store_brand)
        url = f"https://{host}/products/{p.get('handle', '')}"
        label = f"{brand} | {title}"
        cat, why = classify(p, store, title, text)
        if cat is None:
            stats.skip(store_brand, why, short(label, 110))
            continue
        groups = variant_groups(p)
        if not groups:
            stats.skip(store_brand, "no variants", short(label, 110))
            continue
        body_pn = body_part_number(text)
        for g in groups:
            vt = g["title"]
            sku = g["sku"]
            if len(groups) == 1 and body_pn:
                sku = body_pn if not sku or sku.startswith(body_pn) or body_pn.startswith(sku) else sku
            sku_missing = False
            if not sku:
                if body_pn:
                    sku = body_pn
                    stats.qa.append(f"{brand}: PN taken from the body text 'Part Number:' line: {sku} ({short(title, 70)})")
                else:
                    # No SKU anywhere on the listing: keep the record under the store handle (+ variant), flagged,
                    # as extract_hamilton.py does with `wc-<id>`. The planner needs the specs more than the PN.
                    sku_missing = True
                    sku = p.get("handle") or f"shopify-{p.get('id')}"
                    if vt != "Default Title":
                        sku += "-" + re.sub(r"[^a-z0-9]+", "-", vt.lower()).strip("-")[:40]
                    stats.qa.append(f"{brand}: listing has no SKU; `p` is the store handle '{sku}' ({short(title, 70)})")
            if re.search(r"\b(?:form|core|deposit|gift)\b", sku, re.I):
                stats.skip(store_brand, "tool / service / order form", short(label, 110))
                continue

            perf = False
            qa: list[str] = []
            kit: dict = {}
            if cat == "cam":
                spec, qa, kit = spec_cam(title, text, vt)
                if kit:
                    spec["kit"] = kit
            elif cat == "injector":
                spec, qa, perf = spec_injector(title, text, vt)
            elif cat == "injectionPump":
                spec, qa, perf = spec_pump(title, text, vt)
            elif cat == "turbo":
                spec, qa, perf = spec_turbo(title, text, vt)
            elif cat == "manifold":
                spec, qa, perf = spec_manifold(title, text, vt)
            else:
                spec, qa = SPEC[cat](title, text, vt)
                perf = bool(re.search(r"performance|upgrade|stage|race|competition|billet|\bHP\b", title, re.I))
            if g["finishes"]:
                spec["finishOptions"] = g["finishes"]
            if len(g["skus"]) > 1:
                spec["variantSkus"] = sorted(set(g["skus"]))
            if vt != "Default Title" and "variant" not in spec and cat not in ("rotatingAssembly",):
                spec["variant"] = short(vt, 60)

            fits, fsrc = fitment(p, store, title, text, vt)
            stats.fit_src[fsrc] += 1
            if not fits:
                if store == "manton":
                    heading = title.split(",")[0].strip()
                    fits = [{"fam": heading, "cyl": None, "notes": "catalog heading kept; not in cam-fitment.json"}]
                    stats.qa.append(f"{brand} {sku}: engine heading '{heading}' not mapped to a family ({short(title, 60)})")
                else:
                    fam = "Universal" if re.search(r"\buniversal\b", title, re.I) or (cat == "gasket" and spec.get("flange")) else None
                    if fam is None:
                        stats.no_fit.append(f"{brand} {sku}: {short(title, 80)} [{cat}]")
                        fits = [{"fam": "Unknown", "notes": "no engine named in title / tags / body lead-in"}]
                    else:
                        fits = [{"fam": fam, "notes": "flange gasket, not engine-specific" if cat == "gasket" else None}]
            for q in qa:
                stats.qa.append(f"{brand} {sku}: {q} ({short(title, 60)})")
            emis = emissions_for(cat, tags, title, text, perf)
            src = {"doc": f"{host.removeprefix('www.')} Shopify products.json", "edition": EDITION, "url": url,
                   "id": p.get("id"), "title": short(title, 120)}
            if fsrc == "body":
                src["fitmentFrom"] = "body lead-in"
            if sku_missing:
                src["skuMissing"] = True
            name = make_name(cat, spec, title, fits)
            for fit in fits:
                fam = fit["fam"]
                if fam not in FAM:
                    stats.unknown_fams[fam] += 1
                rec = clean_empty({"m": brand, "p": sku, "cat": cat, "name": name, "fit": fit, "spec": spec, "src": src})
                rec["emissions"] = emis
                rec.setdefault("spec", {})
                recs.append(rec)
    return recs


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
        if len(r.get("spec", {})) > len(kept.get("spec", {})):
            seen[k] = r
            kept, r = r, kept
        stats.merged_dupes.append(f"{k[0]} {k[1]} [{k[2]}]: kept '{kept['name']}' ({kept['src']['url']}) / dropped '{r['name']}' ({r['src']['url']})")
    return [seen[k] for k in order]


NUMERIC = {"diameter", "diameterMm", "wall", "length", "qty", "dur050Int", "dur050Exh", "durAdvInt", "durAdvExh",
           "valveLiftInt", "valveLiftExh", "lobeLiftInt", "lobeLiftExh", "lsa", "icl", "rpmLow", "rpmHigh", "lash", "lashExh",
           "stage", "gph", "psi", "psiLow", "hpRating", "hpRatingLow", "pctOver", "nozzleFlow", "nozzleCc", "nozzleHoles",
           "strokerMm", "compressorInducer", "turbineWheel", "ar", "housingCm2", "blades", "hpCapable", "hpLow", "hpHigh",
           "coreThickness", "inletIn", "pctLargerThanStock", "pieces", "diameterIn", "hpGain", "torqueGain", "levels", "bore",
           "oversize", "oversizeMm", "cr", "ch", "pin", "pinMm", "domeCc", "bigEnd", "weight", "stroke", "seatLb", "openLb",
           "installedHt", "maxLift", "coilBind", "od", "rate", "bodyDia", "rollerDia", "faceDia", "ratio", "fulcrumLength",
           "offset", "torque", "tensilePsi", "thickness", "thicknessMm", "boreOversizeMm", "chamberCc", "intakeValve",
           "exhaustValve", "springSeatLb", "rows", "collector", "undersize", "mainJournal", "rodJournal"}


def validate(recs: list[dict]) -> list[str]:
    errs = []
    seen = set()

    def walk(o, path, pn):
        if isinstance(o, str) and o == "":
            errs.append(f"empty string at {path}: {pn}")
        elif isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}", pn)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]", pn)

    for r in recs:
        for k in ("m", "p", "cat", "fit", "src", "name"):
            if not r.get(k):
                errs.append(f"missing {k}: {r.get('m')} {r.get('p')}")
        if not r.get("fit", {}).get("fam"):
            errs.append(f"missing fit.fam: {r['m']} {r['p']}")
        k = (r["m"], r["p"], r["fit"].get("fam"))
        if k in seen:
            errs.append(f"duplicate p within brand/family: {k}")
        seen.add(k)
        for sk, v in r.get("spec", {}).items():
            if sk in NUMERIC and not isinstance(v, (int, float)):
                errs.append(f"spec.{sk} not numeric ({v!r}): {r['m']} {r['p']}")
        for fk in ("y0", "y1", "cyl"):
            v = r["fit"].get(fk)
            if v is not None and not isinstance(v, int):
                errs.append(f"fit.{fk} not an int ({v!r}): {r['m']} {r['p']}")
        if "emissions" not in r:
            errs.append(f"emissions key missing: {r['m']} {r['p']}")
        walk(r, "", f"{r['m']} {r['p']}")
    return errs


# --------------------------------------------------------------------------- notes
def write_notes(path: pathlib.Path, recs: list[dict], stats: Stats, errs: list[str]):
    L = [f"# {TASK} extraction notes (Wagler, Colt Cams, Manton, Dynomite, Banks, ATS, Bullet Proof Diesel, Stainless Diesel, Smeding)\n"]
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_diesel_shopify.py`. Source: each store's public Shopify "
             f"`/products.json?limit=250&page=N`. robots.txt fetched first per host; one request at a time, spaced 6 s "
             f"(or the robots Crawl-delay) apart; 403 / challenge pages stop that host without retry. Prices are not stored.\n")
    L.append("## Fetch\n")
    L.append("| store | host | status | pages | products | note |\n|---|---|---|---|---|---|")
    for key, (host, brand) in STORES.items():
        h = stats.hosts.get(key)
        if h is None:
            L.append(f"| {brand} | `{host}` | not run | | | |")
        else:
            L.append(f"| {brand} | `{host}` | {h['status']} | {h['pages']} | {h['products']} | {h['note'].strip('; ')} |")
    L.append("")
    L.append("## Records\n")
    L.append(f"Total records: **{len(recs)}** (one record per variant SKU per engine family; variants that differ only by "
             f"color / finish are collapsed into one record with `spec.finishOptions`)\n")
    L.append("| m (brand on the listing) | cat | records |\n|---|---|---|")
    for (m, cat), n in sorted(collections.Counter((r["m"], r["cat"]) for r in recs).items()):
        L.append(f"| {m} | {cat} | {n} |")
    L.append("")
    L.append("| cat | records |\n|---|---|")
    for cat, n in sorted(collections.Counter(r["cat"] for r in recs).items()):
        L.append(f"| {cat} | {n} |")
    L.append("")
    L.append("Rows per engine family (a part that fits several families is one record per family with the same `p`):\n")
    L.append("| fit.fam | records |\n|---|---|")
    for fam, n in sorted(collections.Counter(r["fit"]["fam"] for r in recs).items()):
        flag = " *(not in cam-fitment.json)*" if fam not in FAM else ""
        L.append(f"| {fam}{flag} | {n} |")
    L.append("")
    L.append("Fitment source: " + ", ".join(f"{k} {v}" for k, v in sorted(stats.fit_src.items())) + "\n")
    L.append("Emissions flags: " + ", ".join(f"{k} {v}" for k, v in sorted(collections.Counter(
        str(r["emissions"]).split(":")[0] for r in recs if r["emissions"]).items())) + "\n")
    L.append("## How fields were derived\n")
    L.append("- **Category** from the product title (skip words first: merch, tools / order forms / core charges, "
             "EGR/DPF/DOC/SCR parts and deletes, transmission / driveline, lines / brackets / seals / adapters, "
             "exhaust and piping, accessories), then category words. Everything skipped is counted below with examples.")
    L.append("- **Brand (`m`)** is the Shopify `vendor` (normalized); stores that resell other brands (Wagler: S&S Diesel "
             "kits; Colt Cams: Power Driven Diesel heads; Stainless Diesel: HSP Diesel) keep the maker's name.")
    L.append("- **Part number (`p`)** is the variant SKU. When a product has one variant and the body prints `Part Number: X`, "
             "X is used (HSP lists color SKUs like `602-HSP-RAW` and the base PN in the body). A listing with no SKU at all "
             "keeps the store handle as `p` with `src.skuMissing: true` (flagged below).")
    L.append("- **Fitment** from the variant title, then the product title, then the store's tags (Banks `Make_` / `Engine_` / "
             "`Year_`; ATS bare years + displacement + make; Colt `12v` / `24v` / `5.9L` / `Powerstroke`), then the body's "
             "first lines. Cummins 5.9 is split 12V / 24V-CR by text (12V, 24V, VP44, P7100, common rail) or by model years "
             "(<=1998 12V, >=1998.5 24V); 2007.5+ is `Cummins 6.7`. Duramax engine codes set the years when none are printed. "
             "GM gas trucks are `GM LT (Gen V)` from 2014 and `GM LS` before (judgement call).")
    L.append("- **Specs** are regex reads of the title / variant / body only: pushrod `diameter x wall`, standalone length "
             "(4-13.5 in), `Set of N`; cam `NNN/NNN` next to `.050` (or `advertised`), `.xxx/.xxx lift`, `LSA`, RPM range, "
             "stage, type words; lift pump GPH / psi; injector % over / HP / LPM; pump type / % over / mm stroker; turbo "
             "wheel mm, A/R, VGT, model code; piston bore / CR / CH / pin / dish; rod length / big end / pin / bolt. Missing "
             "numbers are left out and flagged under QA.")
    L.append("- **`emissions`** (injector, injectionPump, turbo, tuner, intake, manifold, intercooler, liftPump only): a CARB EO "
             "number in the body -> `carb_eo:D-xxx-xx`; Banks `CA-Exclusion` tag (not for sale in California, i.e. no EO) or "
             "race-only wording -> `no_eo_race_only`; stock / OEM replacement wording on a non-performance part -> "
             "`oem_replacement`; otherwise `unknown`. Internal parts are `null`.\n")
    L.append("## Skipped\n")
    for (brand, reason), n in sorted(stats.skipped.items()):
        L.append(f"- **{brand}** - {reason}: {n}")
        for item in stats.skipped_items[(brand, reason)][:8]:
            L.append(f"  - {item}")
        if n > 8:
            L.append(f"  - ... {n - 8} more")
    L.append("")
    if stats.merged_dupes:
        L.append("## Duplicate SKUs merged (same brand + part number + family; the record with more spec keys kept)\n")
        for d in stats.merged_dupes[:60]:
            L.append(f"- {d}")
        if len(stats.merged_dupes) > 60:
            L.append(f"- ... {len(stats.merged_dupes) - 60} more")
        L.append("")
    L.append("## Needs human QA\n")
    if stats.unknown_fams:
        L.append("Families not in `cam-fitment.json` (catalog heading kept in `fit.fam`):\n")
        for fam, n in sorted(stats.unknown_fams.items()):
            L.append(f"- `{fam}`: {n} record(s)")
        L.append("")
    if stats.no_fit:
        L.append(f"No engine named anywhere (`fit.fam: \"Unknown\"`), {len(stats.no_fit)} record(s):\n")
        for x in stats.no_fit[:80]:
            L.append(f"- {x}")
        if len(stats.no_fit) > 80:
            L.append(f"- ... {len(stats.no_fit) - 80} more")
        L.append("")
    L.append("Judgement calls:\n")
    L.append("- Banks `CA-Exclusion` is stored as `no_eo_race_only` (the enum's only 'no CARB EO' value); these are street "
             "parts that Banks does not ship to California, not race-only parts. Revisit if the enum grows a `no_eo` value.")
    L.append("- Cam type is recorded only when the text says hydraulic/solid roller/flat; Cummins cams with no type words have "
             "no `type` (they are flat-tappet by design, but the listing did not say so).")
    L.append("- Cam durations read next to the word 'duration' or 'cam' without an explicit `.050` marker are stored as "
             "`dur050` and flagged below; verify against the maker's cam card.")
    L.append("- Upgraded EGR coolers (Bullet Proof Diesel) are skipped: an emissions-system component with no task category. "
             "They are not deletes; add a category if wanted.")
    L.append("- ATS is mostly transmissions / torque converters / thermal bypass valves; only engine parts (turbo kits, "
             "manifolds, injectors, pumps) are emitted.")
    L.append("- Cold-air intake systems (Banks Ram-Air, HSP) are emitted as `intake` with no manifold-type spec; Monster-Ram / "
             "intake elbows / intake horns are `manifold` type `intake`.\n")
    L.append("Per-record flags:\n")
    for q in stats.qa[:400]:
        L.append(f"- {q}")
    if len(stats.qa) > 400:
        L.append(f"- ... {len(stats.qa) - 400} more")
    L.append("")
    L.append("## Validation\n")
    if errs:
        L.append(f"{len(errs)} validation error(s):\n")
        L += [f"- {e}" for e in errs]
    else:
        L.append("Passed: no duplicate `p` within brand+family, every record has `m p cat fit.fam src`, numeric fields are "
                 "numbers, no empty strings.")
    L.append("")
    path.write_text("\n".join(L), encoding="utf-8")


# --------------------------------------------------------------------------- main
def main(argv) -> int:
    offline = "--offline" in argv
    only = None
    for a in argv:
        if a.startswith("--only"):
            val = a.split("=", 1)[1] if "=" in a else argv[argv.index(a) + 1]
            only = [x.strip() for x in val.split(",") if x.strip()]
    keys = only or list(STORES)
    bad = [k for k in keys if k not in STORES]
    if bad:
        log(f"unknown store key(s) {bad}; valid: {', '.join(STORES)}")
        return 2
    stats = Stats()
    all_products: dict[str, list[dict]] = {}
    if offline:
        for k in keys:
            st = {"status": "offline (cache)", "pages": 0, "products": 0, "note": "parsed from dl/ cache only"}
            stats.hosts[k] = st
            all_products[k] = load_cache(k, st)
    else:
        import requests
        s = requests.Session()
        s.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.8"})
        for k in keys:
            all_products[k] = fetch_host(k, s, stats)
    for k, prods in all_products.items():
        log(f"{STORES[k][0]}: {stats.hosts[k]['status']}, {len(prods)} products")
    total = sum(len(v) for v in all_products.values())
    if total == 0:
        log("no products from any host; nothing written (see per-host status above)")
        return 3

    recs = []
    for k, prods in all_products.items():
        recs += build(k, prods, stats)
    recs = dedupe(recs, stats)
    errs = validate(recs)

    OUT.mkdir(parents=True, exist_ok=True)
    out = {
        "source": {
            "task": TASK,
            "stores": {brand: {"doc": f"{host.removeprefix('www.')} Shopify products.json",
                               "url": f"https://{host}/products.json?limit=250&page=N",
                               "fetch": stats.hosts.get(key)} for key, (host, brand) in STORES.items() if key in all_products},
            "edition": EDITION,
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "diesel-shopify.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(OUT / "diesel-shopify.md", recs, stats, errs)
    log(f"wrote {len(recs)} records; {len(errs)} validation errors; {len(stats.qa)} QA flags; {len(stats.no_fit)} without fitment")
    for e in errs[:20]:
        log("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
