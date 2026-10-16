#!/usr/bin/env python3
"""Parts catalog extractor: FLUIDAMPR (viscous harmonic dampers).

Source: the platform pages on `https://fluidampr.com/` (www redirects to the bare host), e.g.
`/dodge-cummins/`, `/chevy-small-block/`, `/ford/`. Each page carries one two-column HTML
key/value table per part number (`table#one-column-emphasis`: PART #, Fitment, Bore Diameter,
Degree Marking Range, Degree Markings, Engine Balance, Finish, Keyway, Length, Material,
Mounting Hardware Included, Outside Diameter, Safety Rating, Weight / Rotating Weight).
The WooCommerce Store API is disabled, so the tables are the only machine-readable source.

Everything fetched is cached under `dl/fluidampr/` (gitignored) so the parse step is
re-runnable offline. Requests are spaced 6 s apart (robots.txt: allow all, no Crawl-delay);
a 403 / challenge page stops the source.

    python -I scripts/parts-catalog/extract_fluidampr.py             # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_fluidampr.py --offline   # parse the cache only
    python -I scripts/parts-catalog/extract_fluidampr.py --refresh   # re-fetch everything
    python -I scripts/parts-catalog/extract_fluidampr.py --dump      # print raw tables, no output

Writes `out/fluidampr.json`. Nothing is written outside `dl/` and `out/`.
The notes file `out/fluidampr.md` is written by hand from the run summary this script prints.
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import sys
import time
import urllib.robotparser

HERE = pathlib.Path(__file__).resolve().parent
DL = HERE / "dl" / "fluidampr"
OUT = HERE / "out"
HOST = "fluidampr.com"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
BRAND = "Fluidampr"
DOC = "fluidampr.com platform page HTML spec tables"
EDITION = dt.date.today().strftime("%Y-%m")

# Platform pages linked from the site nav ("Find your Fluidampr"). Accessories pages (bolts,
# pin kits, hubs, pulleys, sensor relocation kits) have no shared `cat` and are not fetched.
PAGES = [
    "dodge-cummins", "chevy-duramax", "ford-power-stroke",
    "chevy-small-block", "chevy-big-block", "ford", "chrysler", "pontiac-oldsmobile",
    "competition-series",
    "bmw", "honda", "mazda", "mitsubishi", "nissan", "subaru", "toyota", "vw-audi",
]

CHALLENGE = ("Just a moment", "cf-challenge", "_Incapsula_", "Access Denied", "px-captcha",
             "Please verify you are a human", "Attention Required")


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def clean(obj):
    """Drop None values and empty strings/lists/dicts recursively (keeps 0 and False)."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            v = clean(v)
            if v is None or v == "" or v == [] or v == {}:
                continue
            out[k] = v
        return out
    if isinstance(obj, list):
        return [clean(x) for x in obj if x is not None and x != ""]
    return obj


# --------------------------------------------------------------------------- fetch
class Fetcher:
    def __init__(self, offline: bool, refresh: bool):
        self.offline, self.refresh = offline, refresh
        self.last = 0.0
        self.n_requests = 0
        self.session = None
        self.rp = None
        self.delay = MIN_DELAY
        self.stopped = None
        DL.mkdir(parents=True, exist_ok=True)
        self.logf = open(DL / "fetch_log.jsonl", "a", encoding="utf-8")

    def _robots(self):
        if self.rp is not None:
            return
        import requests
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.8"})
        r = self.session.get(f"https://www.{HOST}/robots.txt", timeout=30)
        self.n_requests += 1
        self.last = time.time()
        txt = r.text if r.status_code == 200 else ""
        (DL / "robots.txt").write_text(f"# status {r.status_code}\n{txt}", encoding="utf-8")
        self.rp = urllib.robotparser.RobotFileParser()
        self.rp.parse(txt.splitlines())
        self.delay = max(MIN_DELAY, self.rp.crawl_delay(UA) or self.rp.crawl_delay("*") or 0)
        log(f"robots.txt: status {r.status_code}, delay {self.delay}s")

    def get(self, url: str, cache: pathlib.Path) -> bytes | None:
        """Return the body (cached or fetched). None = not available (offline / stopped / error)."""
        if cache.exists() and cache.stat().st_size > 0 and not self.refresh:
            return cache.read_bytes()
        if self.offline or self.stopped:
            return None
        self._robots()
        if not (self.rp.can_fetch(UA, url) and self.rp.can_fetch("*", url)):
            log(f"robots disallows {url}; skipping")
            self._log({"url": url, "status": "SKIPPED(robots)"})
            return None
        wait = self.delay - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = self.session.get(url, headers={"Accept": "text/html"}, timeout=60, allow_redirects=True)
        except Exception as e:
            self.last = time.time()
            self.n_requests += 1
            self._log({"url": url, "status": f"ERR {e}"})
            return None
        self.last = time.time()
        self.n_requests += 1
        body = r.content
        text_head = body[:4000].decode("utf-8", "replace")
        entry = {"url": url, "status": r.status_code, "ct": r.headers.get("content-type", ""),
                 "len": len(body), "final_url": r.url}
        if r.status_code in (403, 409, 429, 503) or any(k in text_head for k in CHALLENGE):
            self.stopped = f"{r.status_code} on {url}"
            entry["stopped"] = True
            self._log(entry)
            log(f"STOP: bot gate / {r.status_code} on {url}; not retrying")
            return None
        self._log(entry)
        if r.status_code != 200:
            return None
        cache.write_bytes(body)
        return body

    def _log(self, entry: dict):
        entry["ts"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        self.logf.write(json.dumps(entry) + "\n")
        self.logf.flush()


def page_url(slug: str) -> str:
    return f"https://{HOST}/{slug}/"


# --------------------------------------------------------------------------- page tables
def parse_tables(html: str) -> list[dict]:
    """Every two-column key/value table on the page -> {key: value}, in page order.
    Also carries `_heading` (nearest preceding h1-h4) for the dump / QA."""
    from bs4 import BeautifulSoup
    s = BeautifulSoup(html, "html.parser")
    out = []
    for t in s.find_all("table"):
        kv = {}
        for tr in t.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split()) for c in tr.find_all(["th", "td"])]
            if len(cells) != 2 or not cells[0]:
                continue
            kv[cells[0]] = cells[1]
        if "PART #" not in kv:
            continue
        h = t.find_previous(["h1", "h2", "h3", "h4"])
        kv["_heading"] = h.get_text(" ", strip=True) if h else ""
        out.append(kv)
    return out


def dump(pages: dict[str, list[dict]]):
    keys = {}
    for slug, tables in pages.items():
        print(f"\n=== {slug}: {len(tables)} tables")
        for kv in tables:
            print(f"--- {kv.get('PART #')}  [{kv.get('_heading')}]")
            for k, v in kv.items():
                if k.startswith("_"):
                    continue
                keys[k] = keys.get(k, 0) + 1
                print(f"   {k}: {v}")
    print("\nKEY FREQUENCY")
    for k, n in sorted(keys.items(), key=lambda x: -x[1]):
        print(f"  {n:3d}  {k}")


# --------------------------------------------------------------------------- main
def main(argv):
    offline = "--offline" in argv
    refresh = "--refresh" in argv
    f = Fetcher(offline, refresh)
    pages: dict[str, list[dict]] = {}
    missing = []
    for slug in PAGES:
        body = f.get(page_url(slug), DL / f"page_{slug}.html")
        if body is None:
            missing.append(slug)
            continue
        pages[slug] = parse_tables(body.decode("utf-8", "replace"))
    log(f"pages parsed: {len(pages)} / {len(PAGES)}; missing: {missing}; "
        f"requests this run: {f.n_requests}; stopped: {f.stopped}")
    if "--dump" in argv:
        dump(pages)
        return
    build_and_write(pages, missing, f)


# --------------------------------------------------------------------------- families
# Shared `fit.fam` strings (cam-fitment.json). Families outside that list keep a short label
# built from the page's own heading / fitment text and are flagged in the notes file.
SHARED = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
    "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
}

# PN -> list of (fam, ci list or None, cyl or None, y0, y1, note). y0/y1 None = take them from
# the fitment text (regex); a 4-digit int fixes them; "open" y1 = no end year.
# Each entry is one record. The page's Fitment text is always kept in fit.notes as well.
C59_12, C59_24, C67 = "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7"
FAMS: dict[str, list[tuple]] = {
    # Dodge Cummins
    "960311": [(C59_12, [359], 6, 1989, 1998, "also Cummins 4BT standard")],
    "960301": [(C59_24, [359], 6, 1998, 2002, "1998.5-2002 24V")],
    "920301": [(C59_24, [359], 6, 2003, 2009, "common rail")],
    "920321": [(C67, [408], 6, 2007, "open", "2007.5+")],
    "960341": [(C59_12, [359], 6, 1989, "open", "competition series, no pulley"),
               (C59_24, [359], 6, 1989, "open", "competition series, no pulley")],
    "980301": [(C59_24, [359], 6, 2003, 2018, "competition series, no pulley; listed 2003-2018 5.9L/6.7L common rail"),
               (C67, [408], 6, 2003, 2018, "competition series, no pulley; listed 2003-2018 5.9L/6.7L common rail")],
    # GM diesel
    "800191": [("GM 6.2/6.5 diesel", [379, 395], 8, 1982, 1993, "mechanical fuel pump; AMG crate engines to 2018")],
    "800141": [("GM 6.2/6.5 diesel", [379, 395], 8, 1994, 2018, "electronic fuel pump; AMG crate engines to 2018")],
    "890101": [("Duramax 6.6", [403], 8, 2001, 2005, "LB7 / LLY")],
    "830111": [("Duramax 6.6", [403], 8, 2006, 2010, "LBZ / LMM")],
    "830121": [("Duramax 6.6", [403], 8, 2011, 2017, "LML / LGH")],
    "830141": [("Duramax 6.6", [403], 8, 2017, 2019, "L5P")],
    "830151": [("Duramax 6.6", [403], 8, 2020, "open", "L5P")],
    "760131": [("Duramax 6.6", [403], 8, 2001, "open", None)],
    # Ford Power Stroke
    "720211": [("Powerstroke 7.3", [444], 8, 1999, 2003, None)],
    "720221": [("Powerstroke 7.3", [444], 8, 1994, 1997, "fan spacer included")],
    "870201": [("Powerstroke 6.0", [365], 8, 2003, 2007, "single alternator")],
    "870211": [("Powerstroke 6.0", [365], 8, 2003, 2007, "dual alternators")],
    "800211": [("Powerstroke 6.4", [390], 8, 2008, 2010, None)],
    "800241": [("Powerstroke 6.7", [406], 8, 2011, 2026, None)],
    # Chevy small block / LS / LT
    "620101": [("Small-block Chevy", [262, 350], 8, None, None, "262-350 ci, internal balance; not LT1 1992+"),
               ("Chevy W-series 348/409", [409], 8, None, None, "internal balance"),
               ("Pontiac Iron Duke 151", [151], 4, None, None, None)],
    "720101": [("Small-block Chevy", [262, 350], 8, None, None, "262-350 ci, internal balance; not LT1 1992+"),
               ("Chevy W-series 348/409", [409], 8, None, None, "internal balance")],
    "720111": [("Small-block Chevy", [400], 8, None, None, "Gen I 400, external balance 26 oz")],
    "620121": [("GM LS", [346], 8, 1998, 2006, "LS1 Camaro / Firebird; no pulley")],
    "620131": [("GM LS", None, 8, 1997, 2007, "Corvette 1997-2004, CTS-V 2004-2007; no pulley")],
    "660101": [("GM LS", None, 8, None, None, "custom applications; single 8-rib 6.57 in pulley")],
    "740111": [("GM LS", None, 8, 1998, 2006, "Camaro / Firebird / GTO")],
    "740121": [("GM LS", None, 8, 1997, 2013, "Corvette 1997-2013, CTS-V 2004-2007, G8 2008-2009; not dry sump or supercharged")],
    "760111": [("GM LS", [376], 8, 2010, 2015, "LS3 / L99 Camaro SS; LS truck; stock pulley")],
    "760121": [("GM LS", [376], 8, 2010, 2015, "LS3 / L99 Camaro SS; LS truck; 25% underdrive pulley")],
    "810101": [("GM LS", [376], 8, 2009, 2015, "LSA supercharged; Camaro ZL1 2012-2015, CTS-V 2009-2015")],
    "760161": [("GM LT (Gen V)", [376], 8, 2016, 2022, "LT4 supercharged; Camaro ZL1 2017-2022, CTS-V 2016-2019")],
    "760191": [("GM LT (Gen V)", [376], 8, 2016, 2024, "LT1 Camaro; not supercharged")],
    "760151": [("GM LT (Gen V)", [376, 401], 8, None, None, "6.6L L8T / 6.2L L87, internal balance; A/C pulley")],
    # Chevy big block
    "620111": [("Chevy Mark IV big block", [396, 427], 8, None, None, "396-427 internal balance")],
    "720121": [("Chevy Mark IV big block", [396, 427], 8, None, None, "396-427 internal balance")],
    "800101": [("Chevy Mark IV big block", [396, 427], 8, None, None, "396-427 internal balance")],
    "800131": [("Chevy Mark IV big block", [396, 427], 8, None, None, "396-427 internal balance; dual 3/16 and 1/4 keyways")],
    "800151": [("Chevy Mark IV big block", [396, 427], 8, None, None, "396-427 internal balance; dual 1/4 keyways")],
    "800111": [("Chevy Mark IV big block", [454], 8, None, None, "454-502 external balance 34.5 oz"),
               ("Chevy Gen VI big block", [454, 502], 8, None, None, "454-502 external balance 34.5 oz")],
    "800121": [("Chevy Mark IV big block", [454], 8, None, None, "454-502 external balance 34.5 oz; dual 1/4 keyways"),
               ("Chevy Gen VI big block", [454, 502], 8, None, None, "454-502 external balance 34.5 oz; dual 1/4 keyways")],
    "800181": [("Chevy Mark IV big block", [454], 8, None, None, "454-502 external balance 34.5 oz; dual 3/16 and 1/4 keyways"),
               ("Chevy Gen VI big block", [454, 502], 8, None, None, "454-502 external balance 34.5 oz; dual 3/16 and 1/4 keyways")],
    # Ford
    "650211": [("Small-block Ford (Windsor)", [289, 302, 351], 8, None, None, "external balance 28 oz; 4-bolt pulley; spacer 717656 may be needed 1975+"),
               ("Ford 351C/351M/400", [351, 400], 8, None, None, "external balance 28 oz; 4-bolt pulley; spacer 717656 may be needed 1975+")],
    "650221": [("Small-block Ford (Windsor)", [302], 8, 1982, 1992, "5.0 HO, external balance 50 oz; 1993-95 stock pulleys do not fit")],
    "650231": [("Small-block Ford (Windsor)", [302, 351], 8, None, None, "internal balance, replaces 28 oz external in custom builds; 4-bolt pulley"),
               ("Ford 240/300 inline-6", [300], 6, None, None, "fits 300 I6 only with 0.250 in machined from the end of the hub")],
    "650241": [("Small-block Ford (Windsor)", [302], 8, 1982, 1992, "5.0, internal balance, replaces 34 oz external in custom builds")],
    "720201": [("Ford 429/460", [429, 460], 8, None, None, "internal balance; 429 Boss may need a stepped key"),
               ("Ford FE", [360], 8, None, None, "internal balance; 332/352/390/427/428 need the timing-gear sleeve shortened .500, a .375 pulley spacer and a stepped key")],
    "550201": [("Ford Flathead V8", None, 8, None, None, "wide-belt pulley; black zinc")],
    "550203": [("Ford Flathead V8", None, 8, None, None, "wide-belt pulley; chrome")],
    "610201": [("Ford Barra 4.0 I6", None, 6, 2002, 2016, "10% underdrive pulley")],
    "610211": [("Ford EcoBoost 2.0/2.3", None, 4, 2013, 2024, "integrated 60-2 tone wheel")],
    "700232": [("Ford Coyote", [302], 8, 2011, 2022, "Mustang, F-150, crate engines")],
    "750201": [("Ford Godzilla 7.3", [445], 8, 2020, "open", "Super Duty, F-650/750, E-Series, F-59, crate")],
    # Chrysler
    "720301": [("Mopar LA small block", [318, 340, 360], 8, None, None, "internal balance; 6-bolt pulley, may need one hole redrilled")],
    "720311": [("Mopar B/RB big block", [350, 361, 383, 400, 413, 440], 8, None, None, "internal balance; crank trigger adapter 400309"),
               ("Chrysler 426 Hemi", [426], 8, None, None, "internal balance; crank trigger adapter 400309")],
    "720321": [("Chrysler early Hemi 331/354/392", [331, 354, 392], 8, None, None, "DeSoto too")],
    "720361": [("Chrysler Gen III Hemi 5.7/6.1", [345, 370], 8, None, None, "car and SUV; removable 6-3/8 in 6-rib pulley"),
               ("Chrysler Gen III Hemi 6.2/6.4", [392], 8, None, None, "car and SUV; removable 6-3/8 in 6-rib pulley")],
    "840302": [("Chrysler Gen III Hemi 6.2/6.4", [376], 8, 2015, 2021, "Hellcat / Demon / Trackhawk supercharged; stock drive")],
    "910302": [("Chrysler Gen III Hemi 6.2/6.4", [376], 8, 2015, 2021, "Hellcat / Demon / Trackhawk supercharged; 11% overdrive, may need A/C bracket clearance")],
    # Competition series
    "1243101": [("Tractor pulling (universal, taper-lock hub)", None, None, None, None, None)],
    "1243111": [("Tractor pulling (universal, taper-lock hub)", None, None, None, None, "no pre-drilled bolt holes")],
    "1243121": [("Tractor pulling (6-bolt, 1.381 center)", None, None, None, None, None)],
    # Imports: family label from the page heading / engine code
    "843311": [("BMW M50/S50/M52/S52 I6", None, 6, 1991, 2000, "with 60-2 tone wheel")],
    "843301": [("BMW M52TU/M54 I6", None, 6, 1999, 2006, "without 60-2 tone wheel")],
    "590601": [("Honda B-series", None, 4, 1990, 2001, None)],
    "620601": [("Honda B-series", None, 4, 1990, 2001, "40% underdrive alternator pulley")],
    "570601": [("Honda K-series", None, 4, 2002, 2010, None)],
    "530601": [("Honda F20C/F22C", None, 4, 2000, 2009, "S2000")],
    "521001": [("Mazda B6/BP 1.5-1.8 I4", None, 4, 1992, 2005, "MX-5 1993-2005, MX-3 1.6 1992-1996, Protege 1995-2003")],
    "601011": [("Mazda MZR 2.0 (NC MX-5)", None, 4, 2006, 2014, "professional installation recommended")],
    "601001": [("Mazda MZR 2.3 DISI turbo", None, 4, 2006, 2013, "Mazdaspeed3 / 6, CX-7; professional installation recommended")],
    "570701": [("Mitsubishi 4B11T", None, 4, 2010, 2015, "Evo X")],
    "610701": [("Mitsubishi 4G63 (Evo VIII/IX)", None, 4, 2003, 2006, None)],
    "630701": [("Mitsubishi 4G63 (DSM)", None, 4, 1991, 1998, None)],
    "570901": [("Nissan VR38DETT", None, 6, 2009, 2021, "GT-R R35")],
    "610901": [("Nissan RB26DETT", None, 6, 1989, 1994, "R32, phase 1")],
    "610911": [("Nissan RB26DETT", None, 6, 1993, 2002, "R33 / R34, phase 2")],
    "610921": [("Nissan RB20DET/RB25DET NEO", None, 6, None, None, "R32 RB20DET, R34 RB25DET NEO")],
    "610931": [("Nissan RB25DET", None, 6, None, None, "R33, non-NEO")],
    "630931": [("Nissan SR20DE/DET", None, 4, None, None, None)],
    "640901": [("Nissan VQ35DE", None, 6, 2002, 2012, "350Z, Pathfinder, Infiniti FX35 / G25 / G35 / M35")],
    "531101": [("Subaru EJ", None, 4, None, None, None)],
    "571101": [("Subaru/Toyota FA20 / 4U-GSE", None, 4, 2013, 2022, "BRZ / FR-S / 86, WRX 2015-2022")],
    "571111": [("Subaru/Toyota FA24 / FB20 / FB25", None, 4, 2017, "open", "crank hub adapter kit 300023 included")],
    "840801": [("Toyota 1JZ/2JZ", None, 6, 1990, 2005, "stock-ratio pulley")],
    "840811": [("Toyota 1JZ/2JZ", None, 6, 1990, 2005, "15% underdrive pulley")],
    "840821": [("Toyota 1JZ/2JZ", None, 6, 1990, 2005, "dry sump pulley")],
    "570801": [("Toyota/Lexus UZ V8", None, 8, 1990, 2010, "1UZ / 2UZ / 3UZ")],
    "651211": [("Audi/VW 2.7T / 2.8 / 3.0 V6", None, 6, None, None, "8 M8 bolts included")],
    "551201": [("VW 1.8T", None, 4, 2000, 2005, "4-bolt crank pulley")],
    "551211": [("VW 2.0 FSI EA113", None, 4, 2006, 2008, "6-bolt crank pulley")],
    "551221": [("VW/Audi VR6", None, 6, 1993, 2008, "2.8-3.6, 12v/24v")],
    "551231": [("VW/Audi 2.0 TSI EA888", None, 4, None, None, None)],
}


# --------------------------------------------------------------------------- value parsers
FRAC = re.compile(r"^(\d+)(?:[- ](\d+)/(\d+))?$")


def inches(s: str | None) -> float | None:
    """'9-3/4"', '8 3/8"', '9.525"', 'Ø1.4808"', '5-7/8', '3.25' -> float inches; else None."""
    if not s:
        return None
    t = s.replace("Ø", "").replace("″", "").replace('"', "").replace("in.", "").strip()
    m = re.match(r"^(\d+(?:\.\d+)?)\s*$", t)
    if m:
        return float(m.group(1))
    m = FRAC.match(t)
    if m and m.group(2):
        return round(int(m.group(1)) + int(m.group(2)) / int(m.group(3)), 5)
    return None


def weights(s: str | None) -> tuple[float | None, float | None]:
    """'25.0 lbs / 16.7 lbs' -> (25.0, 16.7)."""
    if not s:
        return None, None
    nums = re.findall(r"(\d+(?:\.\d+)?)\s*lbs?", s)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    if len(nums) == 1:
        return float(nums[0]), None
    return None, None


def balance(s: str) -> tuple[str | None, float | None, str | None]:
    """'External (34.5 oz)' -> ('external', 34.5, None); extra sentence -> note."""
    if not s:
        return None, None, None
    low = s.lower()
    kind = "internal" if low.startswith("internal") else "external" if low.startswith("external") else None
    m = re.search(r"\((\d+(?:\.\d+)?)\s*oz", s)
    oz = float(m.group(1)) if m else None
    rest = re.sub(r"^(internal|external)\.?(\s*\(.*?\))?\.?\s*", "", s, flags=re.I).strip()
    return kind, oz, (rest or None)


PN_RE = re.compile(r"(?:#|p/n|Part ?No\.?|Part#)\s*(\d{6})", re.I)
YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})(?:\.5)?\b")
OPEN_RE = re.compile(r"\b(19\d{2}|20\d{2})(?:\.5)?\s*(?:\+|and Up|[-–]\s*pres(?:ent)?\b)", re.I)


def years(text: str) -> tuple[int | None, int | None]:
    ys = [int(y) for y in YEAR_RE.findall(text)]
    if not ys:
        return None, None
    y0 = min(ys)
    y1 = None if OPEN_RE.search(text) else max(ys)
    if y1 == y0:
        y1 = None if OPEN_RE.search(text) else y1
    return y0, y1


def first_sentence(s: str) -> str:
    return re.split(r"(?<=[a-z0-9\")])\.\s+", s, maxsplit=1)[0].rstrip(".")


def na(s: str | None) -> bool:
    return not s or s.strip().lower().rstrip(".") in ("na", "n/a", "none", "no", "not applicable")


# --------------------------------------------------------------------------- spec
def build_spec(kv: dict, qa: list[str]) -> dict:
    pn = kv["_pn"]
    spec: dict = {}
    d = inches(kv.get("Outside Diameter"))
    if d is None:
        qa.append(f"{pn}: unparsed Outside Diameter {kv.get('Outside Diameter')!r}")
    spec["diameter"] = d
    kind, oz, bal_note = balance(kv.get("Engine Balance", ""))
    spec["balance"] = kind
    if kind is None:
        qa.append(f"{pn}: unparsed Engine Balance {kv.get('Engine Balance')!r}")
    spec["balanceOz"] = oz
    w, rw = weights(kv.get("Weight / Rotating Weight"))
    if w is None:
        qa.append(f"{pn}: unparsed weight {kv.get('Weight / Rotating Weight')!r}")
    spec["weight"], spec["rotatingWeight"] = w, rw
    spec["length"] = inches(kv.get("Length"))
    if spec["length"] is None:
        qa.append(f"{pn}: unparsed Length {kv.get('Length')!r}")
    bore_raw = kv.get("Bore Diameter")
    if not na(bore_raw):
        b = inches(bore_raw)
        if b is None:
            qa.append(f"{pn}: unparsed Bore Diameter {bore_raw!r}")
        elif b < 0.7:
            qa.append(f"{pn}: Bore Diameter {b} is under 0.7 in (bolt-on hub, probably the bolt hole size)")
        spec["bore"] = b
    # timing marks: markings yes/no + range
    marks = kv.get("Degree Markings") or kv.get("Degree Marking") or ""
    rng = kv.get("Degree Marking Range") or ""
    if na(marks) and na(rng):
        spec["timingMarks"] = "none"
    elif na(marks) and not na(rng):
        spec["timingMarks"] = rng.rstrip(".")  # e.g. Cummins "2 notches for sensor pick up"
    else:
        spec["timingMarks"] = (f"{marks.lower()}, {rng.rstrip('.')}" if not na(rng) else marks.lower())
    mat = kv.get("Material") or kv.get("Damper Material")
    if mat:
        spec["material"] = mat.rstrip(".")
    fin = kv.get("Finish") or kv.get("Damper Finish")
    if fin:
        spec["finish"] = fin.rstrip(".")
    key = kv.get("Keyway")
    if key:
        if key.startswith("Drill pin kit") or na(key):
            spec["keyway"] = "none"
        else:
            spec["keyway"] = first_sentence(key)
    sfi = re.search(r"SFI\s*([\d.]+)", kv.get("Safety Rating", ""))
    if sfi:
        spec["sfi"] = sfi.group(1)
    hw = kv.get("Mounting Hardware Included", "")
    if hw:
        spec["hardwareIncluded"] = not hw.lower().startswith("no")
    # pulley facts
    pulley: dict = {}
    pf = kv.get("Pulley Finish")
    if pf and not na(pf):
        pulley["finish"] = pf
    pm = kv.get("Pulley Material")
    if pm and not na(pm):
        pulley["material"] = pm
    pg = kv.get("Pulley Grove Quantity") or kv.get("Pulley Groove Quantity")
    if pg and not na(pg):
        pulley["grooves"] = pg
    belt = kv.get("Drive Belt Type") or kv.get("Belt Drive Type")
    if belt:
        pulley["belt"] = belt.lower()
    ps = kv.get("Pulley Size") or kv.get("Pulley Specs")
    if ps and not na(ps):
        pulley["size"] = first_sentence(ps) if len(ps) > 60 else ps.rstrip(".")
    pb = kv.get("Pulley Bolt Pattern")
    if pb and not na(pb):
        pulley["boltPattern"] = first_sentence(pb)
    if pulley:
        spec["pulley"] = pulley
    # related Fluidampr PNs mentioned anywhere in the table (bolt kits, pin kits, spacers, hubs)
    rel = []
    for k, v in kv.items():
        if k.startswith("_") or k == "PART #":
            continue
        for m in PN_RE.findall(v):
            if m != pn and m not in rel:
                rel.append(m)
    if rel:
        spec["relatedPns"] = rel
    return spec, bal_note


def short_name(spec: dict) -> str:
    bits = ["viscous damper"]
    if spec.get("diameter") is not None:
        bits.append(f"{spec['diameter']:g} in")
    if spec.get("balance"):
        b = f"{spec['balance']} balance"
        if spec.get("balanceOz"):
            b += f" {spec['balanceOz']:g} oz"
        bits.append(b)
    if spec.get("pulley"):
        bits.append("with pulley")
    if spec.get("sfi"):
        bits.append(f"SFI {spec['sfi']}")
    return ", ".join(bits)


# --------------------------------------------------------------------------- build
def build(pages: dict[str, list[dict]]) -> tuple[list[dict], dict]:
    stats = {"qa": [], "by_page": {}, "dupes": [], "unmapped": [], "unknown_fam": set(), "tables": 0}
    # de-dupe tables by PN across pages (same part listed on two platform pages)
    by_pn: dict[str, dict] = {}
    for slug, tables in pages.items():
        stats["by_page"][slug] = len(tables)
        for kv in tables:
            stats["tables"] += 1
            raw = kv["PART #"]
            m = re.match(r"(\d{6,7})\b(.*)$", raw)
            if not m:
                stats["qa"].append(f"unparsed PART # {raw!r} on {slug}")
                continue
            pn, tail = m.group(1), m.group(2).strip(" *")
            kv = dict(kv, _pn=pn, _page=slug, _pn_tail=tail)
            if pn in by_pn:
                prev = by_pn[pn]
                same = {k: v for k, v in kv.items() if not k.startswith("_")} == \
                       {k: v for k, v in prev.items() if not k.startswith("_")}
                stats["dupes"].append((pn, prev["_page"], slug, "identical" if same else "DIFFERENT"))
                if not same:
                    stats["qa"].append(f"{pn}: tables differ between /{prev['_page']}/ and /{slug}/ "
                                       f"(kept /{prev['_page']}/)")
                prev.setdefault("_also", []).append(slug)
                continue
            by_pn[pn] = kv
    recs = []
    for pn, kv in by_pn.items():
        if pn not in FAMS:
            stats["unmapped"].append((pn, kv["_page"], kv.get("Fitment")))
            continue
        spec, bal_note = build_spec(kv, stats["qa"])
        fitment = kv.get("Fitment") or kv.get("Popular Fitments") or ""
        if not kv.get("Fitment"):
            stats["qa"].append(f"{pn}: no 'Fitment' row, used {'Popular Fitments' if kv.get('Popular Fitments') else 'nothing'}")
        ry0, ry1 = years(fitment)
        extra_notes = [kv.get(k) for k in ("Fitment Note", "Installation Note") if kv.get(k)]
        if kv["_pn_tail"]:
            extra_notes.append(kv["_pn_tail"])
        if bal_note:
            extra_notes.append(bal_note)
        src = {"doc": DOC, "edition": EDITION, "url": page_url(kv["_page"])}
        if kv.get("_also"):
            src["alsoOn"] = [page_url(s) for s in kv["_also"]]
        for fam, ci, cyl, y0, y1, note in FAMS[pn]:
            if fam not in SHARED:
                stats["unknown_fam"].add(fam)
            fit = {"fam": fam, "ci": ci, "cyl": cyl}
            fit["y0"] = ry0 if y0 is None else y0
            if y1 == "open":
                pass
            elif y1 is None:
                if y0 is None and ry1 is not None:
                    fit["y1"] = ry1
            else:
                fit["y1"] = y1
            notes = [note] + extra_notes + [f"listed as: {' '.join(fitment.split())}"]
            fit["notes"] = "; ".join(n.rstrip(".") for n in notes if n)
            recs.append(clean({
                "m": BRAND, "p": pn, "cat": "damper", "name": short_name(spec),
                "fit": fit, "spec": spec, "src": src,
            }) | {"emissions": None})
    return recs, stats


# --------------------------------------------------------------------------- validate
NUMERIC = {"diameter", "balanceOz", "weight", "rotatingWeight", "length", "bore"}


def validate(recs: list[dict]) -> list[str]:
    errs = []
    seen = set()

    def walk(o, path):
        if isinstance(o, str) and o == "":
            errs.append(f"empty string at {path}")
        elif isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}")
        elif isinstance(o, list):
            if not o:
                errs.append(f"empty list at {path}")
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]")

    for r in recs:
        key = (r["m"], r["p"], r["fit"]["fam"])
        if key in seen:
            errs.append(f"duplicate p within family: {key}")
        seen.add(key)
        for k in ("m", "p", "cat", "name", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            errs.append(f"{r['p']}: missing fit.fam")
        walk(r, r["p"])
        for k, v in r["spec"].items():
            if k in NUMERIC and not isinstance(v, (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for k in ("ci", "cyl", "y0", "y1"):
            v = r["fit"].get(k)
            if v is None:
                continue
            for x in (v if isinstance(v, list) else [v]):
                if not isinstance(x, int):
                    errs.append(f"{r['p']}: fit.{k} not an int: {x!r}")
        if "diameter" not in r["spec"]:
            errs.append(f"{r['p']}: no diameter")
    return errs


def build_and_write(pages: dict[str, list[dict]], missing: list[str], f: Fetcher):
    recs, stats = build(pages)
    errs = validate(recs)
    for e in errs:
        log("VALIDATION:", e)
    if errs:
        sys.exit(1)
    OUT.mkdir(exist_ok=True)
    doc = {
        "source": {
            "brand": BRAND, "doc": DOC, "edition": EDITION, "host": HOST,
            "robots": "allow all, no Crawl-delay",
            "userAgent": UA,
            "pages": [page_url(s) for s in PAGES if s in pages],
            "pagesMissing": [page_url(s) for s in missing],
            "tables": stats["tables"],
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    out_path = OUT / "fluidampr.json"
    out_path.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    distinct = len({r["p"] for r in recs})
    print(f"wrote {out_path}: {len(recs)} records, {distinct} distinct PNs, {stats['tables']} tables")
    print("tables per page:", stats["by_page"])
    fams = {}
    for r in recs:
        fams[r["fit"]["fam"]] = fams.get(r["fit"]["fam"], 0) + 1
    print("records per family:")
    for fam, n in sorted(fams.items(), key=lambda x: (x[0] in SHARED, x[0])):
        print(f"  {n:3d}  {fam}{'' if fam in SHARED else '   (not a shared family)'}")
    print("PNs on more than one page:", stats["dupes"])
    print("PNs without a family mapping (skipped):", stats["unmapped"])
    print("QA flags:")
    for q in stats["qa"]:
        print(f"  {q}")


if __name__ == "__main__":
    main(sys.argv[1:])
