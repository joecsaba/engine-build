#!/usr/bin/env python3
"""Callies Performance Products catalog extractor (task CALLIES in CLOUD_TASKS.md).

Usage:
    python -I extract_callies.py crawl   # fetch sitemap + product pages into dl/callies/ (resumable)
    python -I extract_callies.py parse   # parse dl/callies/pages/*.html -> out/callies.json + out/callies.md
    python -I extract_callies.py         # both

Writes only under dl/callies/ and out/.  Obeys robots.txt (Crawl-delay 10) with one request
at a time; never retries a 403 / Cloudflare challenge page.

Source layout (WordPress "Ultimate Product Catalog" plugin): every product page carries its
spec tables twice (large-screen and mobile copies); only the large-screen copy is parsed.
Tables are irregular: an optional title row, a header row containing "Part #", data rows,
and sub-heading rows (series / engine / tier) inside the same table.  Column counts of
header and data rows often differ because of colspans, so rows are aligned positionally,
then by non-empty cells, before giving up on a row.
"""
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.robotparser as rp
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "dl", "callies")
PAGES = os.path.join(DL, "pages")
OUT = os.path.join(HERE, "out")
LOG = os.path.join(DL, "fetch_log.jsonl")

HOST = "https://www.callies.com"
SITEMAP = HOST + "/upcp_product-sitemap.xml"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0

S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"})
_last = [0.0]
_robots = {}


# ============================================================================ fetching
def _log(rec):
    os.makedirs(DL, exist_ok=True)
    rec["t"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")


def robots():
    if "p" in _robots:
        return _robots["p"], _robots["delay"]
    r = S.get(HOST + "/robots.txt", timeout=30)
    _last[0] = time.time()
    p = rp.RobotFileParser()
    p.parse(r.text.splitlines() if r.status_code == 200 else [])
    delay = MIN_DELAY
    for agent in (UA, "*"):
        try:
            cd = p.crawl_delay(agent)
        except Exception:
            cd = None
        if cd:
            delay = max(delay, float(cd))
    # callies.com puts "Crawl-delay: 10" above the first User-agent line, which
    # RobotFileParser ignores; honor any Crawl-delay in the raw text as well.
    if r.status_code == 200:
        for m in re.finditer(r"(?im)^\s*crawl-delay\s*:\s*([\d.]+)", r.text):
            delay = max(delay, float(m.group(1)))
    _robots.update(p=p, delay=delay)
    _log({"url": HOST + "/robots.txt", "status": r.status_code, "crawl_delay": delay})
    print(f"[robots] status={r.status_code} delay={delay}s", file=sys.stderr)
    return p, delay


class Blocked(Exception):
    pass


def get(url):
    """Polite GET. Raises Blocked on 403 / challenge pages (caller must stop the source)."""
    p, delay = robots()
    if not (p.can_fetch(UA, url) and p.can_fetch("*", url)):
        _log({"url": url, "status": "ROBOTS_DISALLOW"})
        raise Blocked(f"robots disallows {url}")
    wait = delay - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    r = S.get(url, timeout=60, allow_redirects=True)
    rec = {"url": url, "final": r.url, "status": r.status_code,
           "ctype": r.headers.get("content-type"), "bytes": len(r.content)}
    _log(rec)
    print(f"[get] {r.status_code} {len(r.content):>7}B {url}", file=sys.stderr)
    if r.status_code == 403:
        raise Blocked(f"403 on {url}")
    low = r.text[:4000].lower()
    if ("just a moment" in low and "cloudflare" in low) or "_incapsula_" in low:
        raise Blocked(f"challenge page on {url}")
    return r


def slug_of(url):
    return urlparse(url).path.rstrip("/").split("/")[-1]


def crawl():
    os.makedirs(PAGES, exist_ok=True)
    sm_path = os.path.join(DL, "upcp_product-sitemap.xml")
    if not os.path.exists(sm_path):
        with open(sm_path, "wb") as f:
            f.write(get(SITEMAP).content)
    urls = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", open(sm_path, encoding="utf-8").read())
    urls = [u for u in urls if slug_of(u) and slug_of(u) != "upcp_product"]
    print(f"[crawl] {len(urls)} product URLs", file=sys.stderr)
    n_fetched = 0
    for u in urls:
        path = os.path.join(PAGES, slug_of(u) + ".html")
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        try:
            r = get(u)
        except Blocked as e:
            print(f"[STOP] {e}", file=sys.stderr)
            return False
        if r.status_code != 200:
            print(f"[skip] status {r.status_code} {u}", file=sys.stderr)
            continue
        with open(path, "wb") as f:
            f.write(r.content)
        n_fetched += 1
    print(f"[crawl] fetched {n_fetched} new pages, {len(os.listdir(PAGES))} on disk", file=sys.stderr)
    return True


# ============================================================================ families
BRAND = "Callies"
DOC = "callies.com product pages (upcp_product-sitemap.xml), HTML spec tables"

# Family strings follow artifacts/engine-build/public/data/cam-fitment.json.
SBC, BBC4, BBC6, LS, LT = ("Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block",
                           "GM LS", "GM LT (Gen V)")
SBF, FORD_351C, BBF, MOD, COYOTE, GODZILLA = ("Small-block Ford (Windsor)", "Ford 351C/351M/400",
                                               "Ford 429/460", "Ford Modular", "Ford Coyote",
                                               "Ford Godzilla 7.3")
HEMI3_SM, HEMI3_LG, MOPAR_BB = ("Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4",
                                "Mopar B/RB big block")
DMAX, CUMMINS_67, PS60, JEEP6 = "Duramax 6.6", "Cummins 6.7", "Powerstroke 6.0", "AMC/Jeep inline-6"

KNOWN_FAMS = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
    "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
}

# Catalog headings outside the shared family list (kept verbatim-ish, flagged in the notes).
VIPER, TOYOTA_2JZ, MITSU_4G63, MITSU_4B11 = "Dodge Viper V10", "Toyota 2JZ", "Mitsubishi 4G63", "Mitsubishi 4B11"
SUBARU_EJ, SUBARU_FA, NISSAN_GTR, NISSAN_VQ35 = "Subaru EJ20/EJ25", "Subaru FA20", "Nissan VR38 (GT-R)", "Nissan VQ35"
NISSAN_RB26, NISSAN_RB30, NISSAN_SR20, NISSAN_VG30 = "Nissan RB26", "Nissan RB30", "Nissan SR20", "Nissan VG30"
HONDA_B, HONDA_F, HONDA_K = "Honda B-series", "Honda F-series", "Honda K-series"

# Ordered (regex, families) rules applied to "section heading [+ row notes]" on multi-family pages.
FAM_RULES = [
    (r"navistar|international", ["Navistar/International"]),
    (r"detroit", ["Detroit Diesel 40 Series"]),
    (r"john deere.*small", ["John Deere small block"]),
    (r"john deere.*big", ["John Deere big block"]),
    (r"coyote\s*/\s*(ford\s*)?modular|modular\s*/\s*(ford\s*)?coyote", [COYOTE, MOD]),
    (r"coyote", [COYOTE]),
    (r"godzilla", [GODZILLA]),
    (r"modular", [MOD]),
    (r"460|429", [BBF]),
    (r"small block ford|ford 302|ford 351|302-351|\bsbf\b", [SBF]),
    (r"big block mopar|mopar b/rb", [MOPAR_BB]),
    (r"big block|\bbbc\b", [BBC4, BBC6]),
    (r"small block|\bsbc\b", [SBC]),
    (r"\blt2?\b", [LT]),
    (r"\bls1?\b|\blsx\b|\bls7\b|\blsa\b", [LS]),
    (r"hemi", [HEMI3_SM, HEMI3_LG]),
    (r"duramax", [DMAX]),
    (r"cummins", [CUMMINS_67]),
    (r"powerstroke 6\.0", [PS60]),
    (r"viper", [VIPER]),
    (r"2jz|toyota", [TOYOTA_2JZ]),
    (r"4g63", [MITSU_4G63]),
    (r"4b11", [MITSU_4B11]),
    (r"fa ?20", [SUBARU_FA]),
    (r"ej20|ej25|subaru", [SUBARU_EJ]),
    (r"gt-?r|vr38", [NISSAN_GTR]),
    (r"vq35", [NISSAN_VQ35]),
    (r"rb26", [NISSAN_RB26]), (r"rb30", [NISSAN_RB30]), (r"sr20", [NISSAN_SR20]), (r"vg30", [NISSAN_VG30]),
    (r"\bb ?16\b|\bb ?18|\bb ?20\b|b[- ]series", [HONDA_B]),
    (r"f[- ]series", [HONDA_F]),
    (r"\bk ?20\b|\bk ?24\b|k[- ]series|honda", [HONDA_K]),
    (r"can-?am", ["Can-Am Maverick"]),
    (r"ar[c]?tic cat", ["Arctic Cat 951 V-Twin"]),
    (r"yamaha", ["Yamaha YXZ 1000R"]),
    (r"polaris", ["Polaris RZR XP1000"]),
    (r"jeep", [JEEP6]),
    (r"^mopar\b", ["Mopar"]),
]


def fams_from_text(text):
    t = (text or "").lower()
    if "ecoboost" in t:
        m = re.search(r"\b(1\.6|2\.0|2\.3|3\.5)\s*l?\b", t)
        return [f"Ford EcoBoost {m.group(1)}" if m else "Ford EcoBoost"]
    for rx, fams in FAM_RULES:
        if re.search(rx, t):
            return list(fams)
    return None


# ============================================================================ page config
# slug -> dict(series, fam, material, ...).  Pages not listed are skipped and reported.
#   series:   catalog series name used in `name`; "auto" = by rod PN prefix (U = Ultra, C = Compstar)
#   fam:      default family / list of families; None = must come from section headings
#   by_section: resolve families from section headings (and row notes if notes=True) via FAM_RULES
#   material: default spec.material ("4340 forged", "4330V billet", ...); rods: by prefix when None
#   beam:     default rod beam; sections mentioning H-Beam / I-Beam override
PAGES_CFG = {}


def cfg(slug, series, fam=None, material=None, by_section=False, notes=False, beam=None, bolt=None,
        skip_sections=None, rod_material=None):
    PAGES_CFG[slug] = dict(series=series, fam=fam, material=material, by_section=by_section, notes=notes,
                           beam=beam, bolt=bolt, skip_sections=skip_sections, rod_material=rod_material)


# --- crankshafts
cfg("apex-ls-lt", "Apex", LS, "4340 forged", by_section=True)
cfg("big-block-chevy-magnum", "Magnum", [BBC4, BBC6], "4340 forged")
cfg("big-block-ford-magnum", "Magnum", BBF, "forged")
cfg("compstar-big-block-chevy", "Compstar", [BBC4, BBC6], "4340")
cfg("compstar-big-block-chevy-spread-bore", "Compstar H/5", [BBC4, BBC6], "4340")
cfg("compstar-big-block-mopar", "Compstar", MOPAR_BB, "4340")
cfg("compstar-comet-small-block-chevy", "Compstar Comet", SBC, "4340 forged")
cfg("compstar-cummins", "Compstar", CUMMINS_67, "4340")
cfg("compstar-duramax", "Compstar Durastar", DMAX, "4340")
cfg("compstar-ford-coyote", "Compstar", COYOTE, "4340", by_section=True)
cfg("compstar-ford-modular", "Compstar", MOD, None, by_section=True)
cfg("compstar-gen-iii-hemi", "Compstar", [HEMI3_SM, HEMI3_LG], "4340")
cfg("compstar-jeep", "Compstar", JEEP6, None)
cfg("compstar-ls-lt", "Compstar", LS, "4340", by_section=True, skip_sections=r"accessor")
cfg("compstar-racesaver-sprint-car", "Compstar Racesaver", SBC, "4340")
cfg("compstar-small-block-chevy", "Compstar", SBC, "4340")
cfg("compstar-small-block-ford", "Compstar", SBF, "4340")
cfg("compstar-viper-billet", "auto", VIPER, "4340 billet", skip_sections=r"stud")
cfg("cummins-ultra-billet", "Ultra Billet", CUMMINS_67, "billet", notes=True)
cfg("dragonslayer-gen-ii-iv-ls1", "DragonSlayer", LS, "4340 forged")
cfg("ecoboost-line", "auto", "Ford EcoBoost", "4340", by_section=True, notes=True)
cfg("ford-godzilla-magnum", "Magnum", GODZILLA, "4340 forged")
cfg("gen-iii-hemi-magnum-8-cwt", "Magnum", [HEMI3_SM, HEMI3_LG], "4340 forged")
cfg("honda-b-series", "auto", HONDA_B, "4340 billet")
cfg("honda-f-series", "Compstar", HONDA_F, "4340 billet")
cfg("honda-k-series", "auto", HONDA_K, "4340 billet")
cfg("ls-lt-magnum", "Magnum", LS, "4340 forged", by_section=True, notes=True)
cfg("ls-ultra-billet-ub", "Ultra Boost", LS, "4330 billet")
cfg("ls-ultra-ud-billet", "Ultra Dirt", LS, "4330 billet")
cfg("ls-ultra-ud-forged", "Ultra Dirt", LS, "4340 forged")
cfg("magnum-billet-xb-small-block-chevy", "Magnum Billet XB", SBC, "4330 billet")
cfg("magnum-xl-big-block-chevy", "Magnum XL", [BBC4, BBC6], "4340 forged")
cfg("magnum-xl-ls1-gen-iii-iv", "Magnum XL", LS, "4340 forged")
cfg("magnum-xl-small-block-chevy", "Magnum XL", SBC, "4340 forged")
cfg("magnum-xl-small-block-ford", "Magnum XL", SBF, "4340 forged")
cfg("mitsubishi-4b11", "auto", MITSU_4B11, "4340 billet")
cfg("mitsubishi-4g63", "auto", MITSU_4G63, "4340 billet")
cfg("mopar-magnum", "Magnum", MOPAR_BB, "4340 forged")
cfg("nissan-gt-r-ultra-billet", "Ultra Billet", NISSAN_GTR, "4330V billet")
cfg("nissan-rb26", "Compstar", NISSAN_RB26, "4340 billet")
cfg("nissan-rb30", "Compstar", NISSAN_RB30, "4340 billet")
cfg("nissan-sr20", "Compstar", NISSAN_SR20, "4340 billet")
cfg("nissan-vg30", "Compstar", NISSAN_VG30, "4340 billet")
cfg("small-block-chevy-magnum", "Magnum", SBC, "4340 forged")
cfg("small-block-chevy-ultra-ud-billet", "Ultra Dirt", SBC, "4330 billet")
cfg("small-block-chevy-ultra-ud-forged", "Ultra Dirt", SBC, "4340 forged")
cfg("small-block-ford-magnum", "Magnum", SBF, "4340 forged")
cfg("small-block-ford-ultra-ud-billet", "Ultra Dirt", SBF, "4330 billet")
cfg("small-block-ford-ultra-ud-forged", "Ultra Dirt", SBF, "4340 forged")
cfg("stock-eliminator", "Stock Eliminator", BBC4, "4340 forged")
cfg("subaru-ej20-ej25", "auto", SUBARU_EJ, "4340 billet")
cfg("subaru_fa_20_copy", "auto", SUBARU_FA, "billet")
cfg("toyota-2jz", "auto", TOYOTA_2JZ, "4340")
cfg("tractor-ultra-billet-ub", "Ultra Billet", None, "EN30B billet", by_section=True)
cfg("ultra-sprint", "Ultra Sprint", SBC, "billet")
# --- connecting rods
cfg("compstar-h-beam", "Compstar", None, by_section=True, beam="H", rod_material="4340")
cfg("compstar-utv", "Compstar UTV", None, by_section=True, beam="H", bolt="ARP", rod_material="4340")
cfg("compstar-xtreme", "Compstar Xtreme", None, by_section=True, bolt="ARP2000 or H11", rod_material="4340")
cfg("enforcer", "Ultra Enforcer", None, by_section=True, beam="I", rod_material="4330V")
cfg("sport-series", "auto", None, by_section=True, notes=True)
cfg("ultra-assassin", "Ultra Assassin", PS60, rod_material="4330V")
cfg("ultra-dirt-h-beam", "Ultra Dirt", SBC, beam="H", bolt='7/16"', rod_material="4330V")
cfg("ultra-enforcer", "Ultra Enforcer", None, by_section=True, notes=True, beam="I",
    skip_sections=r"^mopar$", rod_material="4330V")
cfg("ultra-h-beam", "Ultra", None, by_section=True, beam="H")
cfg("ultra-xd", "Ultra XD", None, by_section=True, rod_material="4330V")

SKIP_REASONS = {
    "3513": "empty page (no title, no content)",
    "balancing-supplies": "tungsten heavy metal slugs, not a crank/rod",
    "alcohol-hemi-billet-aluminum-engine-block": "engine block",
    "bbc-billet-aluminum-engine-blocks": "engine block",
    "bbc-cast-iron-engine-block": "engine block",
    "ls-billet-aluminum-engine-blocks": "engine block",
    "sbf-billet-aluminum-engine-blocks-copy": "engine block",
    "mopar-gen-ii-cast-iron-hemi-wedge-engine-blocks": "engine block",
    "mopar-gen-iii-cast-aluminum-engine-block": "engine block",
    "mopar-gen-iii-cast-iron-hemi": "engine block",
    "damper-studs": "damper stud kits (fastener; out of scope for this task)",
    "head-and-main-studs": "head/main studs (fastener; out of scope for this task)",
    "main-caps": "main caps",
    "reluctors": "reluctor wheels",
    "rotating-assemblies": "prose only, no part numbers",
    "finish-ground-camshafts-and-cores": "links to per-engine cam-list PDFs only, no tables",
    "ultra-i-beam-2": "prose only, no spec table on the page",
    "big-block-chevy-ultra-billet-ub": "Ultra Boost page lists capabilities (stroke/journal ranges) but no part numbers",
    "big-block-mopar-ultra-billet": "Ultra Billet page lists capabilities but no part numbers",
    "ford-460-ultra-billet-ub": "Ultra Boost page lists capabilities but no part numbers",
    "gen-iii-hemi-ultra-billet-ub": "Ultra Boost page lists capabilities but no part numbers",
    "ls-ultra-billet-ub": "Ultra Boost page lists capabilities but no part numbers",
    "small-block-chevy-ultra-billet-ub": "Ultra Boost page lists capabilities but no part numbers",
    "small-block-ford-ultra-billet-ub": "Ultra Boost page lists capabilities but no part numbers",
}

QA_NOTES = [
    "`small-block-chevy-magnum` CAM11A-MG lists a 5.211 rod journal; the PN code (\"11\") and the neighbouring rows "
    "say 2.100. Stored as printed (5.211); almost certainly a typo on the site.",
    "`compstar-cummins` S34002 lists a 2.27171 rod journal where S34000 has 2.7171 (69 mm). Stored as printed; "
    "almost certainly a typo on the site.",
    "`compstar-big-block-chevy` BBQ425 CS is printed with a space; normalised to BBQ425-CS like its neighbours.",
    "Cummins cranks (4.882 stroke = 124 mm) are filed under `Cummins 6.7`; the site does not say whether the "
    "8-bolt-flange S34002 is meant for 5.9 blocks.",
    "Big-block Chevy cranks: rows marked \"1 pc. seal\" are filed under `Chevy Gen VI big block`, all others under "
    "`Chevy Mark IV big block`. BBC rods are emitted for both families.",
    "Gen III Hemi cranks/rods are emitted for both `Chrysler Gen III Hemi 5.7/6.1` and `6.2/6.4` (same 2.559 main).",
    "Compstar Ford Coyote/Modular H-beam rods (C24105, C24106) are emitted for both `Ford Coyote` and `Ford Modular`, "
    "as headed on the site.",
    "Small-block Ford cranks with \"351C\" or \"351-2.750\" mains are kept under `Small-block Ford (Windsor)` with the "
    "main label in `fit.notes`; they need a Cleveland-main block.",
    "`compstar-big-block-chevy-spread-bore` and the 5.000 bore-spacing row of `compstar-big-block-chevy` (BQ+426-CS) are "
    "for 5.000 in bore-spacing aftermarket blocks, not production Mark IV blocks (noted in `fit.notes`).",
    "Main-bearing labels were mapped to diameters: 350=2.450, 400=2.650, 283=2.300 (SBC); 302=2.249, 351=3.000, "
    "351C=2.750 (Ford). \"Honda\" rod journal = 1.888 (Callies code 9, same as the 1.888 rows).",
    "Metric values (mm) were converted to inches and rounded to 4 decimals; where the site prints both, the inch figure "
    "is stored.",
    "`ultra-enforcer` has a \"Mopar\" section repeating the Viper rod row (U14345 6.200/2.123); skipped as a copy error.",
    "The same rod PN carries different lengths on different pages (see 'Conflicting specs' above); the first page in "
    "alphabetical slug order wins in the JSON. C22101-CA at 6.024 on `honda-b-series` (5.291 elsewhere) and S27007 "
    "used for both a Honda F crank and a Toyota 2JZ Honda-pin crank look like site errors.",
    "Rod `rodJournal` is the crank-pin diameter the rod is sized for (what Callies lists), not the housing bore; "
    "`pin` is the wrist-pin bore. Rods carry `beam` only where the page or section says H-Beam / I-Beam.",
    "`spec.cammedForRodLength` on cranks is Callies' \"Cammed for rod length\" column (counterweight profile), "
    "not a hard minimum.",
    "Material is only stored when the page states it (alloy and/or billet vs forged); a bare \"4340\" means the "
    "page did not say forged or billet. Rods with a `-CA` suffix are the Custom Age 625 bolt upgrade (site rule).",
    "Magnum XL Big Block Chevy lists only stroke/journal tiers, no part numbers; 0 rows.",
]


# ============================================================================ cell helpers
def num(s):
    """Dimension in inches.  Accepts '3.750', '3.750″', '55mm', '88.4 mm', '90.77' (mm when > 20),
    '5.985/152mm' and '2.008 / 51mm' (the inch value wins).  None when the cell is not a number."""
    s = s.replace("″", "").replace("”", "").replace('"', "").replace("in.", "").strip().strip("()").strip()
    if not s:
        return None
    m = re.match(r"^(\d*\.?\d+)\s*(mm)?\s*(?:/\s*(\d*\.?\d+)\s*(mm)?)?$", s, re.I)
    if not m:
        return None
    a, a_mm, b, b_mm = float(m.group(1)), m.group(2), m.group(3), m.group(4)
    if b is not None:
        b = float(b)
        if a_mm and not b_mm:
            a, b = b, a
        return a
    if a_mm or a > 20:
        return round(a / 25.4, 4)
    return a


def num_note(s):
    """'6.125     (LS7 Post)' -> (6.125, 'LS7 Post'); '6.100-LW' -> (6.1, 'LW'); '5.400 rod' -> (5.4, None)."""
    s = s.replace("″", "").replace("”", "").replace('"', "")
    m = re.match(r"^\s*(\d*\.?\d+(?:\s*mm)?(?:\s*/\s*\d*\.?\d+\s*mm)?)\s*(?:in\.?)?\s*[-–]?\s*(.*)$", s)
    if not m:
        return None, s.strip() or None
    v = num(m.group(1))
    rest = m.group(2).strip(" ()")
    rest = re.sub(r"^(rod|journal)$", "", rest, flags=re.I).strip()
    return v, (rest or None)


PN_TOKEN = re.compile(r"^[A-Z0-9][A-Z0-9@#&+*\-/.]*$")


def split_pn(s):
    """'U16710 + 2mm' -> ('U16710', '+ 2mm'); 'BBQ425 CS' -> ('BBQ425-CS', None);
    'UJE0BM-CS or T24010' -> ('UJE0BM-CS', 'also listed as T24010')."""
    s = re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()
    s = re.sub(r"(\w)\s+(CS|CM)$", r"\1-\2", s)
    m = re.match(r"^(\S+)\s+or\s+(\S+)$", s)
    if m:
        return m.group(1), f"alt PN {m.group(2)}"
    tok, _, rest = s.partition(" ")
    tok = tok.rstrip("*")
    # Callies encodes stroke/journal as letters, so a PN may have no digit at all (VIF-NI@-UL)
    if not PN_TOKEN.match(tok) or not re.search(r"[A-Z]", tok) \
            or not (re.search(r"\d", tok) or ("-" in tok and len(tok) >= 6)):
        return None, None
    rest = rest.strip(" ()")
    return tok, (rest or None)


# Not part numbers: displacements (5.4L, 4.6L/5.0L), main labels (351C, 409), dimensions with a suffix (6.100-LW)
NOT_PN = re.compile(r"^\d+(\.\d+)?L(/\d+(\.\d+)?L)?$|^\d{3}[A-Z]?$|^\d+\.\d+", re.I)


def looks_like_pn(s):
    """A cell that is a part number, optionally followed by a short note ('U16710 + 2mm')."""
    tok, rest = split_pn(s)
    if tok is None or num(s) is not None or len(tok) < 4 or NOT_PN.match(tok):
        return False
    # a trailing dimension ('LS-1 GM Small Block – 2.559') marks a label, not a part number
    return rest is None or (len(rest) <= 30 and not re.search(r"\d\.\d{3}", rest))


def grams(s):
    m = re.search(r"(\d{3,4})\s*g", s.replace(" ", ""))
    return int(m.group(1)) if m else None


def row_kind(cells):
    ne = [c for c in cells if c]
    if not ne:
        return "blank"
    joined = " ".join(ne).lower()
    short = all(len(c) <= 28 for c in ne)
    if len(ne) >= 3 and short and ("part #" in joined or "part#" in joined or "part number" in joined
                                   or ("stroke" in joined and "main" in joined)):
        return "header"
    if len(ne) == 1:
        return "title"
    nums = [c for c in ne if num_note(c)[0] is not None]
    if not nums:
        return "title"
    if not any(looks_like_pn(c) for c in ne):
        return "title"
    return "data"


def map_header(cells):
    """Return [role or None] per header cell."""
    roles = []
    for c in cells:
        l = c.lower().strip()
        r = None
        if not l:
            r = None
        elif "stroke" in l:
            r = "stroke"
        elif l.startswith("main"):
            r = "main"
        elif l.startswith("pin") or "rod journal" in l or l.startswith("journal"):
            r = "pin"
        elif "rod length" in l or l.startswith("cammed") or l.startswith("length") or l == "description":
            r = "length"
        elif "part" in l:
            r = "pn"
        elif "wt" in l or "weight" in l:
            r = "weight"
        elif "bolt" in l or "fastener" in l:
            r = "bolt"
        elif "bob" in l:
            r = "bobweight"
        else:
            r = "note"
        roles.append(r)
    return roles


def _pairs_ok(pairs):
    """An alignment is plausible when the Part # slot holds a part number and no other slot does."""
    pn_slots = [r for r, v in pairs if v and looks_like_pn(v) and not re.search(r"\d\s*(mm|g)\b", v)]
    if "pn" in [r for r, _ in pairs]:
        return pn_slots == ["pn"]
    return len(pn_slots) <= 1


def _by_content(hroles, cells):
    """Fallback: assign cells by what they contain.  Rods: length 4-9, journal 1.4-3.3, pin < 1.4,
    weight 'g'; cranks (header order stroke, main, pin, [length]): numerics in that order."""
    out, nums = {}, []
    for c in cells:
        if not c:
            continue
        if looks_like_pn(c) and "pn" not in out:
            out["pn"] = [c]
        elif grams(c) and "g" in c.replace(" ", ""):
            out.setdefault("weight", []).append(c)
        elif num_note(c)[0] is not None:
            nums.append(c)
        else:
            out.setdefault("note", []).append(c)
    if "pn" not in out:
        return None
    if "stroke" in hroles:
        order = [r for r in hroles if r in ("stroke", "main", "pin", "length")]
        if order[:3] != ["stroke", "main", "pin"]:
            return None
        for r, c in zip(order, nums):
            out.setdefault(r, []).append(c)
        for c in nums[len(order):]:
            out.setdefault("note", []).append(c)
    else:
        for c in nums:
            v = num_note(c)[0]
            if 4 <= v <= 9 and "length" not in out:
                out["length"] = [c]
            elif 1.4 <= v <= 3.3 and "pin" not in out:
                out["pin"] = [c]          # the crank-pin (journal) column; rod code sorts pin vs journal by size
            elif v < 1.4:
                out.setdefault("pin", []).append(c)
            else:
                out.setdefault("note", []).append(c)
    return out


def align(hroles, hcells, cells):
    """Map header roles onto a data row.  Returns dict role -> list of values (notes accumulate)."""
    candidates = []
    if len(cells) == len(hroles):
        candidates.append(list(zip(hroles, cells)))
    hr = [r for r, c in zip(hroles, hcells) if c]
    dc = [c for c in cells if c]
    if len(hr) == len(dc):
        candidates.append(list(zip(hr, dc)))
    if len(cells) > len(hroles):
        candidates.append(list(zip(hroles, cells[:len(hroles)])))
    for pairs in candidates:
        if _pairs_ok(pairs):
            out = {}
            for r, v in pairs:
                if v:
                    out.setdefault(r or "note", []).append(v)
            return out
    return _by_content(hroles, cells)


# ============================================================================ page parsing
def tables_in_order(soup):
    big = soup.find("div", class_="ewd-upcp-product-page-large-screen") or soup
    for t in big.find_all("table"):
        if t.find_parent("table"):
            continue
        rows = []
        for tr in t.find_all("tr"):
            cells = [html.unescape(c.get_text(" ", strip=True)).replace("\xa0", " ") for c in tr.find_all(["th", "td"])]
            rows.append([re.sub(r"\s+", " ", c).strip() for c in cells])
        yield rows


NOISE = re.compile(r"for parts listed below.*|contact our sales.*|also available.*|add -ca to part.*|"
                   r"\*?custom age bolts.*|-ca = custom age.*|\*typically ships with", re.I)


def clean_section(s):
    if not s:
        return None
    s = NOISE.sub("", s).strip(" :-*")
    return s or None


def iter_rows(soup):
    """Yield (section, hroles, hcells, cells) for every data row on the page."""
    for rows in tables_in_order(soup):
        section, hroles, hcells, pending = None, None, None, None
        for cells in rows:
            kind = row_kind(cells)
            if kind == "blank":
                continue
            if kind == "title":
                t = clean_section(" ".join(c for c in cells if c))
                if t:
                    pending = t
                continue
            if kind == "header":
                hroles, hcells = map_header(cells), cells
                section, pending = pending, None
                continue
            if hroles is None:
                continue
            yield (pending or section), hroles, hcells, cells


MAIN_LABELS = {"283": 2.30, "350": 2.45, "400": 2.65, "302": 2.249, "351": 3.00, "351w": 3.00, "351c": 2.75}
SEAL_RE = re.compile(r"(\d)\s*[- ]?\s*(?:pc|piece)", re.I)
PIN_NOTE_RE = re.compile(r"(\.\d{3})\s*(?:wrist\s*)?pin", re.I)
BOLT_RE = re.compile(r"((?:3/8|7/16|1/2)\s*[\"”]?\s*(?:ARP\s*)?(?:3\.5\s*Multiphase|H11|L19|bolts?))", re.I)
ALLOY_RE = re.compile(r"\b(4330V|4340|4330|EN30B|300M)\b", re.I)


def parse_main(s):
    """'2.750' | '350' | '351-2.750' | '(350) GM Small Block – 2.448' -> (diameter, label)."""
    s = s.strip()
    v = num(s)
    if v is not None and not re.fullmatch(r"\d{3}", s):     # a plain dimension (2.750, 55mm, 54.995mm)
        return v, None
    lm = re.match(r"^\(?(\d{3}[A-Za-z]?)\)?", s)
    label = lm.group(1) if lm else None
    m = re.search(r"(?<![\d.])(\d\.\d{3,4})", s)
    if m and not (label and label == m.group(1)):
        return float(m.group(1)), label
    if label and label.lower() in MAIN_LABELS:
        return MAIN_LABELS[label.lower()], label
    v = num(s)
    return (v, None) if v is not None and v < 10 else (None, s or None)


def resolve_fams(c, section, notes_text, rec_cat, spec):
    fams = None
    if c["by_section"]:
        fams = fams_from_text(section + (" " + notes_text if c["notes"] else ""))
    if fams is None:
        fams = c["fam"]
        if fams is None:
            return None
        fams = [fams] if isinstance(fams, str) else list(fams)
    if rec_cat == "crank" and set(fams) == {BBC4, BBC6}:
        fams = [BBC6] if spec.get("rearSeal") == "1-pc" else [BBC4]
    return fams


def material_for(c, cat, pn, row_notes):
    """Cranks: the page's stated material.  Rods: the page's rod material, else by PN prefix
    (U = Ultra, TimkenSteel 4330V on every Ultra page that names the grade; C = Compstar 4340),
    refined by 'Billet' / 'Forged' / alloy words in the row."""
    if cat == "rod":
        mat = c["rod_material"]
        if mat is None:
            mat = "4330V" if pn.startswith("U") and c["slug"] != "ultra-h-beam" else ("4340" if pn.startswith("C") else None)
    else:
        mat = c["material"]
    txt = " ".join(row_notes)
    am = ALLOY_RE.search(txt)
    form = "forged" if re.search(r"\bforged\b", txt, re.I) else ("billet" if re.search(r"\bbillet\b", txt, re.I) else None)
    if am or form:
        alloy = am.group(1).upper() if am else (mat.split()[0] if mat and re.match(r"^[0-9E]", mat) else None)
        form = form or (mat.split()[-1] if mat and mat.split()[-1] in ("forged", "billet") else None)
        mat = " ".join(x for x in (alloy, form) if x) or mat
    return mat


def series_for(c, cat, pn, section):
    s = c["series"]
    if s != "auto":
        return s
    if cat == "crank":
        return "Compstar"
    sec = (section or "").lower()
    if pn.startswith("U"):
        return "Ultra Enforcer" if "enforcer" in sec else "Ultra"
    return "Compstar"


def row_to_records(slug, c, section, hroles, hcells, cells, url, today, flagged, skipped):
    section = section or ""
    if c["skip_sections"] and re.search(c["skip_sections"], section, re.I):
        return []
    got = align(hroles, hcells, cells)
    if got is None:
        skipped.append((slug, section, cells, "column count does not match the header"))
        return []
    cat = "crank" if "stroke" in hroles else ("rod" if "length" in hroles else None)
    if cat is None:
        skipped.append((slug, section, cells, "table is neither crank (Stroke) nor rod (Length/Description)"))
        return []
    pn_raw = (got.get("pn") or [None])[0]
    if pn_raw is None:
        for k in ("note", "length"):
            for v in got.get(k, []):
                if looks_like_pn(v):
                    pn_raw = v
                    break
            if pn_raw:
                break
    if not pn_raw:
        skipped.append((slug, section, cells, "no part number"))
        return []
    pn, pn_note = split_pn(pn_raw)
    if not pn or len(pn) < 4:
        skipped.append((slug, section, cells, f"part number not recognised: {pn_raw!r}"))
        return []
    notes = [pn_note] if pn_note else []
    spec = {}

    if cat == "crank":
        stroke = num((got.get("stroke") or [""])[0])
        if stroke is None:
            skipped.append((slug, section, cells, "crank row without a numeric stroke"))
            return []
        spec["stroke"] = stroke
        if got.get("main"):
            d, label = parse_main(got["main"][0])
            if d is not None:
                spec["mainJournal"] = d
            if label:
                notes.append(f"{label} main")
        if got.get("pin"):
            v = got["pin"][0]
            j = num(v)
            if j is not None:
                spec["rodJournal"] = j
            elif v.lower().startswith("honda"):
                spec["rodJournal"] = 1.888
                notes.append("Honda rod journal")
            else:
                notes.append(f"{v} rod journal")
        for v in got.get("length", []):
            n, rest = num_note(v)
            if n is not None and 4 < n < 9:
                spec["cammedForRodLength"] = n
            elif n is None and rest and rest.lower() in ("billet", "forged"):
                notes.append(rest)
            elif rest:
                notes.append(rest)
            if n is not None and rest:
                notes.append(rest)
        for v in got.get("bobweight", []):
            n = num(v)
            if n:
                spec["bobweight"] = n
        for v in got.get("note", []):
            if v == pn_raw:
                continue
            sm = SEAL_RE.search(v)
            if sm and ("seal" in v.lower() or "rms" in v.lower()):
                spec["rearSeal"] = f"{sm.group(1)}-pc"
            elif "post" in v.lower() and len(v) < 25:
                spec["snout"] = v
            else:
                notes.append(v)
        name = [None, "crank", f"{stroke:.3f} stroke"]
        if "rodJournal" in spec:
            name.append(f"{spec['rodJournal']:.3f} rod journal")
    else:
        length = journal = pin = None
        for v in got.get("length", []):
            if looks_like_pn(v) and v == pn_raw:
                continue
            n, rest = num_note(v)
            if n is not None and length is None:
                length = n
                if rest:
                    m2 = re.match(r"^/?\s*(\d\.\d{2,4})\s*(.*)$", rest)
                    if m2:
                        journal = float(m2.group(1))
                        rest = m2.group(2).strip(" ()")
                    rest = re.sub(r"^(journal)\b", "", rest, flags=re.I).strip()
                    if rest:
                        notes.append(rest)
            elif rest:
                notes.append(rest)
        if length is None:
            skipped.append((slug, section, cells, "rod row without a numeric length"))
            return []
        for v in got.get("pin", []):
            n = num(v)
            if n is None:
                notes.append(v)
            elif n > 1.4:
                journal = journal if journal is not None else n
            else:
                pin = n
        for v in got.get("weight", []):
            w = grams(v)
            if w:
                spec["weight"] = w
            else:
                n = num(v)
                if n is None:
                    notes.append(v)
                elif n < 1.4:
                    pin = pin if pin is not None else n
                else:
                    journal = journal if journal is not None else n
        for v in got.get("bolt", []):
            spec["bolt"] = v
        for v in got.get("note", []):
            if v != pn_raw:
                notes.append(v)
        joined = " ".join(notes)
        if journal is None and re.search(r"honda\s*journal", joined, re.I):
            journal = 1.888
        pm = PIN_NOTE_RE.search(joined)
        if pm and pin is None:
            pin = float(pm.group(1))
        bm = BOLT_RE.search(joined)
        if bm and "bolt" not in spec:
            spec["bolt"] = re.sub(r"\s+", " ", bm.group(1)).replace("”", '"')
        if "bolt" not in spec and c["bolt"]:
            spec["bolt"] = c["bolt"]
        if pn.endswith("-CA"):
            spec["bolt"] = "Custom Age 625"
        spec["length"] = length
        if journal is not None:
            spec["rodJournal"] = journal
        if pin is not None:
            spec["pin"] = pin
        sec_l = section.lower()
        beam = c["beam"]
        if "h-beam" in sec_l or "h beam" in sec_l:
            beam = "H"
        elif "i-beam" in sec_l or "i beam" in sec_l or "enforcer" in sec_l:
            beam = "I"
        if beam:
            spec["beam"] = beam
        name = [None, f"{beam}-beam rod" if beam else "rod", f"{length:.3f} length"]
        if journal is not None:
            name.append(f"{journal:.3f} journal")

    mat = material_for(dict(c, slug=slug), cat, pn, notes)
    if mat:
        spec["material"] = mat
    series = series_for(c, cat, pn, section)
    name[0] = series
    notes = [n for n in notes if n and not re.fullmatch(r"(billet|forged)", n.strip(), re.I)]
    notes_text = "; ".join(dict.fromkeys(n.strip(" ;") for n in notes if n and n.strip(" ;")))
    fams = resolve_fams(c, section, notes_text, cat, spec)
    if not fams:
        skipped.append((slug, section, cells, "no engine family for this section"))
        return []
    if section:
        notes_text = "; ".join(x for x in (section, notes_text) if x)
    recs = []
    for fam in fams:
        if fam not in KNOWN_FAMS:
            flagged.setdefault(fam, set()).add(slug)
        fit = {"fam": fam}
        if notes_text:
            fit["notes"] = notes_text
        recs.append({
            "m": BRAND, "p": pn, "cat": cat,
            "name": " ".join(x for x in name if x),
            "fit": fit,
            "spec": {k: v for k, v in spec.items() if v is not None and v != ""},
            "src": {"doc": DOC, "edition": today[:7], "url": url},
            "emissions": None,
        })
    return recs


# ============================================================================ driver
def validate(parts):
    errs, seen = [], set()

    def walk(o, path, p):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, f"{path}.{k}", p)
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i}]", p)
        elif o == "":
            errs.append(f"{p}: empty string at {path}")

    for r in parts:
        for k in ("m", "p", "cat", "fit", "src"):
            if not r.get(k):
                errs.append(f"{r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            errs.append(f"{r['p']}: missing fit.fam")
        k = (r["p"], r["fit"].get("fam"), r["cat"])
        if k in seen:
            errs.append(f"duplicate {k}")
        seen.add(k)
        walk(r, "", r["p"])
        for key in ("stroke", "mainJournal", "rodJournal", "length", "pin", "weight", "bobweight", "cammedForRodLength"):
            if key in r["spec"] and not isinstance(r["spec"][key], (int, float)):
                errs.append(f"{r['p']}: spec.{key} not numeric: {r['spec'][key]!r}")
    if errs:
        for e in errs[:60]:
            print("[validate]", e, file=sys.stderr)
        raise SystemExit(f"validation failed: {len(errs)} problems")


def conflicts(parts):
    """Same PN with different stroke/length across pages."""
    by = {}
    for r in parts:
        key = "stroke" if r["cat"] == "crank" else "length"
        by.setdefault(r["p"], set()).add((r["spec"].get(key), r["spec"].get("rodJournal"), r["src"]["url"].split("/")[-2]))
    out = []
    rnd = lambda x: None if x is None else round(x, 2)   # ignore mm-vs-inch rounding noise
    for p, s in sorted(by.items()):
        vals = {(rnd(a), rnd(b)) for a, b, _ in s}
        if len(vals) > 1:
            out.append((p, sorted(s, key=lambda x: str(x))))
    return out


def parse():
    today = dt.date.today().isoformat()
    files = sorted(f for f in os.listdir(PAGES) if f.endswith(".html"))
    raw, skipped, flagged, per_page, skipped_pages = [], [], {}, {}, {}
    for fn in files:
        slug = fn[:-5]
        c = PAGES_CFG.get(slug)
        if c is None:
            skipped_pages[slug] = SKIP_REASONS.get(slug, "not a crank/rod page (no config)")
            continue
        soup = BeautifulSoup(open(os.path.join(PAGES, fn), "rb").read(), "html.parser")
        url = f"{HOST}/upcp_product/{slug}/"
        n = 0
        for section, hroles, hcells, cells in iter_rows(soup):
            recs = row_to_records(slug, c, section, hroles, hcells, cells, url, today, flagged, skipped)
            if recs:
                n += 1
                raw.extend(recs)
        per_page[slug] = n
        if n == 0:
            skipped_pages[slug] = SKIP_REASONS.get(slug, "configured, but no data rows with part numbers")
    # one record per (PN, family, cat); the first page in slug order wins
    seen, parts, dups = set(), [], 0
    for r in raw:
        k = (r["p"], r["fit"]["fam"], r["cat"])
        if k in seen:
            dups += 1
            continue
        seen.add(k)
        parts.append(r)
    validate(parts)
    conf = conflicts(raw)
    os.makedirs(OUT, exist_ok=True)
    data = {"source": {"brand": BRAND, "doc": DOC, "url": SITEMAP,
                       "robots": "Crawl-delay 10, nothing disallowed", "pages": len(files),
                       "userAgent": UA},
            "extracted": today, "count": len(parts), "parts": parts}
    with open(os.path.join(OUT, "callies.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    write_notes(parts, per_page, skipped, skipped_pages, flagged, dups, conf, today, len(files))
    print(f"[parse] {len(parts)} records from {sum(1 for v in per_page.values() if v)} pages; "
          f"{len(skipped_pages)} pages without records; {dups} duplicate rows dropped; "
          f"{len(skipped)} rows skipped", file=sys.stderr)


def write_notes(parts, per_page, skipped, skipped_pages, flagged, dups, conf, today, n_pages):
    by_fam, by_cat = {}, {}
    for r in parts:
        by_fam[r["fit"]["fam"]] = by_fam.get(r["fit"]["fam"], 0) + 1
        by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
    log = []
    if os.path.exists(LOG):
        log = [json.loads(l) for l in open(LOG, encoding="utf-8") if l.strip()]
    statuses = {}
    for r in log:
        statuses[str(r.get("status"))] = statuses.get(str(r.get("status")), 0) + 1
    L = [f"# Callies extraction notes ({today})", ""]
    L += ["## What was fetched", "",
          f"- `https://www.callies.com/robots.txt` (Crawl-delay 10, nothing disallowed), "
          f"`upcp_product-sitemap.xml` (fetched once with curl before the script existed) and the {n_pages} product "
          f"pages it lists. Request log: {len(log)} requests, statuses " +
          ", ".join(f"{k}×{v}" for k, v in sorted(statuses.items())) + f". User-Agent `{UA}`. No challenge pages.",
          "- Pacing: the first crawl run was stopped after robots.txt and one page fetched 6 s apart, because "
          "RobotFileParser ignores the `Crawl-delay: 10` line that callies.com puts above its first `User-agent` "
          "line; the script now also reads Crawl-delay from the raw text, and every later request was 10 s apart "
          "(logged as 9-10 s with 1 s timestamp resolution).",
          "- Pages are cached under `dl/callies/pages/<slug>.html` (gitignored); the crawl is resumable (existing "
          "files are not re-fetched). Request log: `dl/callies/fetch_log.jsonl`.",
          "- Only the `ewd-upcp-product-page-large-screen` copy of each page is parsed; the mobile copy duplicates "
          "every table.", ""]
    L += ["## Output", "",
          f"- {len(parts)} records: " + ", ".join(f"{v} {k}" for k, v in sorted(by_cat.items())) +
          f". {dups} duplicate rows dropped (same PN + family repeated on another page or under another heading; "
          "the first page in slug order wins).",
          "- A PN that fits several families is emitted once per family with the same `p`.",
          "- Prices are not published on the site; none stored.", ""]
    L += ["## Rows per page (data rows with a part number)", ""]
    for slug, n in sorted(per_page.items()):
        if n:
            L.append(f"- `{slug}`: {n}")
    L += ["", "## Records per family", ""]
    for k, v in sorted(by_fam.items(), key=lambda x: (-x[1], x[0])):
        L.append(f"- {k}: {v}" + ("  *(not in the shared family list)*" if k not in KNOWN_FAMS else ""))
    L += ["", "## Pages without records", ""]
    for slug, why in sorted(skipped_pages.items()):
        L.append(f"- `{slug}`: {why}")
    L += ["", f"## Rows skipped ({len(skipped)})", ""]
    for slug, section, cells, why in skipped:
        L.append(f"- `{slug}` [{section or '-'}] {why}: `{' | '.join(c for c in cells if c)[:110]}`")
    L += ["", "## Conflicting specs for the same PN across pages", ""]
    if not conf:
        L.append("- none")
    for p, s in conf:
        L.append(f"- `{p}`: " + "; ".join(f"{a} / {b} on `{u}`" for a, b, u in s))
    L += ["", "## Needs human QA", ""]
    L += [f"- {x}" for x in QA_NOTES]
    if flagged:
        L.append("- Families not in the shared list (kept as the catalog heading): " +
                 "; ".join(f"`{k}` ({', '.join(sorted(v))})" for k, v in sorted(flagged.items())))
    with open(os.path.join(OUT, "callies.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    if step in ("crawl", "all"):
        if not crawl() and step == "all":
            sys.exit(2)
    if step in ("parse", "all"):
        parse()
