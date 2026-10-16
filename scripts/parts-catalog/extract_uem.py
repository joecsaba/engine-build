#!/usr/bin/env python3
"""Extract UEM (United Engine & Machine) pistons: ICON Premium / ELITE / FHR forged, KB hypereutectic
and Dualoy diesel, from the catalog PDFs linked on https://www.uempistons.com/rt-5-catalogs.

Sources (all PDFs, no product pages crawled):
  - Listing Section 12.20.20.pdf      numerical listing (PN | MFG | DISP | ROD | DESCRIPTION | RING PACK | PG)
                                       + diametrical listing (BORE | COMP. HT. | PN | PAGE); extract_tables() is clean
  - Icon_catalog.pdf                  ICON Premium / ELITE forged, per-application blocks with CH, pin, dome, CR per
                                       chamber cc, weight, top land, valve relief depth/dia, alloy, deck, oversizes
  - ICON FHR 12.20.20.pdf             same layout for the FHR (formed head relief) 4032 line
  - KB 12.20.20 (1).pdf               KB hypereutectic catalog: pages 3-50 are scanned images with no text layer, so
                                       it cannot be parsed here (no OCR in the environment); recorded in the notes
  - 2026-uem-supplement-final-v2-small.pdf  text PDF: new ICON Premium / FHR part numbers, the only text-layer KB
                                       rows, and the Dualoy diesel piston application table
  - 2025-uem-supplement-rev-G-small.pdf     downloaded for a diff only (two KB part numbers dropped in 2026)

Output: out/uem.json (records in the shared parts format) and out/uem.md (notes).
Re-runnable: PDFs are downloaded once into dl/uem/ and reused; --offline never touches the network.
Writes nothing outside dl/ and out/. Run with `python -I`.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
import re
import sys
import time
from collections import Counter, OrderedDict, defaultdict
from urllib.parse import quote, urljoin

BASE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(BASE, "dl", "uem")
OUT = os.path.join(BASE, "out")
HOST = "https://www.uempistons.com"
CATALOG_PAGE = HOST + "/rt-5-catalogs"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
TODAY = dt.date.today().isoformat()

# href on the catalogs page (as printed in the HTML) -> local file name
PDFS = OrderedDict([
    ("listing", ("themes/UEM/images/Listing Section 12.20.20.pdf", "listing_section.pdf")),
    ("icon", ("/themes/UEM/images/Icon_catalog.pdf", "icon_premium.pdf")),
    ("fhr", ("/themes/UEM/images/ICON FHR 12.20.20.pdf", "icon_fhr.pdf")),
    ("kb", ("themes/UEM/images/KB 12.20.20 (1).pdf", "kb.pdf")),
    ("supp2026", ("/sites/default/files/2026-uem-supplement-final-v2-small.pdf", "supplement_2026.pdf")),
    ("supp2025", ("/sites/default/files/2025-uem-supplement-rev-G-small.pdf", "supplement_2025.pdf")),
])
DOCS = {
    "listing": ("UEM ICON catalog 12.20.20, Listing Section (numerical + diametrical listing, PDF)", "2020-12"),
    "icon": ("UEM ICON Premium Forged Pistons catalog 12.20.20 (PDF)", "2020-12"),
    "fhr": ("UEM ICON FHR Forged Pistons catalog 12.20.20 (PDF)", "2020-12"),
    "kb": ("UEM KB Hypereutectic / Claimer Pistons catalog 12.20.20 (PDF, image-only)", "2020-12"),
    "supp2026": ("UEM 2026 Supplement Catalog rev A (PDF)", "2026"),
    "supp2025": ("UEM 2025 Supplement Catalog rev G (PDF)", "2025"),
}
ICON_PRINTED_OFFSET = -2   # Icon_catalog.pdf page 9 = printed page 7
FHR_PRINTED_OFFSET = 58    # ICON FHR pdf page 5 = printed page 63

# fit.fam strings follow artifacts/engine-build/public/data/cam-fitment.json
KNOWN_FAM = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409", "GM LS",
    "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE", "Ford 429/460", "Ford Modular",
    "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block", "Mopar Magnum 5.2/5.9", "Mopar B/RB big block",
    "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8",
    "Oldsmobile V8", "Buick big block", "Buick 350", "Buick V6 181-252", "Cadillac 368-500", "AMC V8",
    "AMC/Jeep inline-6", "Chevy inline-6", "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V",
    "Cummins 5.9 24V/CR", "Cummins 6.7", "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4",
    "Powerstroke 6.7",
}
BBC = ("Chevy Mark IV big block", "Chevy Gen VI big block")
FAM_CYL = {"AMC/Jeep inline-6": 6, "Cummins 5.9 12V": 6, "Cummins 5.9 24V/CR": 6, "Cummins 6.7": 6,
           "Ford EcoBoost 2.7L": 6, "Ford EcoBoost 3.5L": 6, "GM 2.8 Duramax": 4, "GM 3.0 Duramax": 6,
           "RAM 3.0 EcoDiesel": 6, "Mercedes Sprinter": 6}

# ----------------------------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------------------------
_last_request = 0.0


def fetch(url, dest, log, delay=6.0):
    """Download url to dest unless it exists. One request at a time, >= 6 s apart. Never retries a non-200."""
    global _last_request
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        log.append(f"cached: {url} -> {os.path.relpath(dest, BASE)}")
        return dest
    import requests  # lazy so --offline needs no network libs

    wait = delay - (time.time() - _last_request)
    if wait > 0:
        time.sleep(wait)
    r = requests.get(url, headers={"User-Agent": UA}, timeout=180)
    _last_request = time.time()
    log.append(f"GET {url} -> {r.status_code} {len(r.content)} bytes")
    os.makedirs(DL, exist_ok=True)
    with open(os.path.join(DL, "fetch_log.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "url": url,
                            "status": r.status_code, "bytes": len(r.content), "ctype": r.headers.get("content-type")}) + "\n")
    if r.status_code != 200:
        raise SystemExit(f"{url}: HTTP {r.status_code}; not retrying")
    if b"Just a moment" in r.content[:4000] or b"_Incapsula_" in r.content[:4000]:
        raise SystemExit(f"{url}: bot challenge page; stopping")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(r.content)
    return dest


def check_robots(log):
    path = fetch(HOST + "/robots.txt", os.path.join(DL, "robots.txt"), log)
    txt = open(path, encoding="utf-8", errors="replace").read()
    agent, disallow, allow, delay = None, [], [], None
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
        elif agent == "*" and k == "allow" and v:
            allow.append(v)
        elif agent == "*" and k == "crawl-delay":
            delay = float(v)
    log.append(f"robots.txt: '*' group disallows {disallow}; allows {allow}; crawl-delay {delay}")
    return disallow, delay


def robots_ok(path, disallow):
    # longest-match semantics are not needed: the PDF folders are explicitly allowed and not in any disallow
    for d in disallow:
        pat = "^" + re.escape(d).replace(r"\*", ".*").replace(r"\$", "$")
        if re.match(pat, path):
            return False
    return True


def discover_and_fetch(log, offline):
    """Fetch robots.txt, the catalogs page, then the catalog PDFs listed there (one request per 6 s)."""
    paths = {}
    if offline:
        for key, (_, name) in PDFS.items():
            p = os.path.join(DL, name)
            paths[key] = p if os.path.exists(p) else None
        return paths
    disallow, delay = check_robots(log)
    delay = max(6.0, delay or 0)
    html_path = fetch(CATALOG_PAGE, os.path.join(DL, "catalogs.html"), log, delay)
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(open(html_path, encoding="utf-8", errors="replace").read(), "html.parser")
    hrefs = [a["href"] for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower()]
    log.append(f"catalogs page lists {len(hrefs)} PDF links")
    for key, (href, name) in PDFS.items():
        if href not in hrefs:
            log.append(f"WARNING: expected link {href!r} not on the catalogs page; using the recorded URL")
        url = urljoin(CATALOG_PAGE, quote(href, safe="/:"))
        path = "/" + url[len(HOST) + 1:]
        if not robots_ok(path, disallow):
            log.append(f"robots.txt disallows {path}; skipped")
            paths[key] = None
            continue
        paths[key] = fetch(url, os.path.join(DL, name), log, delay)
    return paths


# ----------------------------------------------------------------------------------------------
# PDF text
# ----------------------------------------------------------------------------------------------
def page_texts(pdf_path, fix_split_decimals=False):
    """Yield (page_no, [lines]) using only upright characters (drops the rotated side tabs).
    fix_split_decimals: the FHR catalog font breaks '5.700' into '5 .700'; real separators before a
    leading-dot number are printed as a double space, so protect those and re-join the single-space ones."""
    import pdfplumber

    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            up = page.filter(lambda o: o.get("object_type") != "char" or o.get("upright", True))
            txt = up.extract_text(x_tolerance=1.5) or ""
            lines = []
            for l in txt.splitlines():
                l = l.replace("”", '"').replace("“", '"').replace("’", "'").replace("–", "-")
                if fix_split_decimals:
                    l = l.replace("  .", " \x00.")
                    l = re.sub(r"(?<![\d./])(?<!/ )(\d+) \.(\d)", r"\1.\2", l)
                    l = l.replace("\x00", "")
                    l = re.sub(r"(\w) \.(?=\s|$)", r"\1.", l)  # 'Offset Pin .' -> 'Offset Pin.'
                l = re.sub(r"(\d\.\d)\.(?=\s)", r"\1", l)  # '10.6.' typo in a CR column
                l = re.sub(r"(^|\s)o(?=\s*(IC\d|STD\b|\d-\d|\.\d{3}))", r"\1", l)  # bullet glyph rendered as 'o'
                l = re.sub(r"\s+", " ", l).strip()
                if l:
                    lines.append(l)
            yield pno, lines


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ----------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------
def num(s):
    if s is None:
        return None
    s = str(s).strip().rstrip('"').replace('"', "").replace("*", "")
    if s in ("", "NA", "N/A", "TBD", "-"):
        return None
    try:
        return float(s) if ("." in s) else int(s)
    except ValueError:
        return None


def rnd(x, nd=4):
    return None if x is None else round(float(x), nd)


def liters_to_ci(l):
    return int(round(l * 61.0237))


def parse_crown(desc):
    """'DOME /2V', '.250" H/Dome -', 'FT/2V', 'STEP-DISH', 'D-CUP', 'OC', 'DISH-3V' -> (crownType, reliefs, domeHt)."""
    d = desc.replace('"', "").strip(" -/")
    reliefs = None
    m = re.search(r"(\d)\s?V\b", d)
    if m:
        reliefs = int(m.group(1))
    ht = None
    m = re.match(r"^(\.\d{2,3})\s", d + " ")
    if m:
        ht = float(m.group(1))
    u = d.upper()
    if "STEP" in u:
        ct = "step-dish"
    elif "D-CUP" in u or "DCUP" in u:
        ct = "d-cup"
    elif "CIR" in u:
        ct = "circular dish"
    elif "OC" == u[:2] or "OPEN" in u:
        ct = "open-chamber dome"
    elif "H/DOME" in u or "HLW" in u:
        ct = "hollow dome"
    elif "S/DOME" in u or "SLD" in u:
        ct = "solid dome"
    elif "DOME" in u:
        ct = "dome"
    elif "DISH" in u:
        ct = "dish"
    elif "FT" in u or "FLAT" in u:
        ct = "flat top"
    elif "HEMI" in u:
        ct = "hemi"
    else:
        ct = d.lower() or None
    return ct, reliefs, ht


def dome_cc_from_catalog(v):
    """UEM prints domes negative and dishes positive; the shared format wants dome positive, dish negative."""
    return None if v is None else -v


def ring_pack_split(s):
    """Split 'RING PACK: 2-1/16" / 1-3/16" The Top Of The Dome...' into (ring pack text, trailing note)."""
    s = s.strip()
    toks = s.split()
    keep = []
    for t in toks:
        tt = t.strip("*†¹,")
        if re.match(r"^(\d-)?(\d+/\d+\"?|\.\d{2,3}\"?|\d\.\d+mm,?|\d+mm,?|\d\.\d,?|\d,?)$", tt) or tt in ("/", ",", "x", "X") or t in ("*", "†", "¹"):
            keep.append(t)
        else:
            break
    rp = " ".join(keep).strip(" ,/")
    note = " ".join(toks[len(keep):]).strip()
    rp = re.sub(r"\s*,\s*", ", ", rp)
    return rp or None, note or None


# ----------------------------------------------------------------------------------------------
# listing section
# ----------------------------------------------------------------------------------------------
def parse_listing(pdf_path):
    import pdfplumber

    num_rows, dia_rows = [], []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            for t in page.extract_tables():
                for r in t:
                    # a cell can hold two table lines ('IC941\nIC942') or the header glued to the first row
                    split = [[s.strip() for s in (c or "").split("\n")] for c in r]
                    n_lines = max(len(s) for s in split)
                    for k in range(n_lines):
                        cells = [s[k] if k < len(s) else s[-1] for s in split]
                        cells[0] = re.sub(r"^I\s+(?=IC)", "", cells[0])  # 'I IC546' stray glyph
                        pn_col = 0 if len(cells) == 7 else 2
                        if len(cells) not in (4, 7) or not re.match(r"^(IC|KB)\d+", cells[pn_col]):
                            continue
                        if len(cells) == 7:
                            pn, mfg, disp, rod, desc, rp, pg = cells
                            num_rows.append({"pn": pn, "mfg": mfg, "disp": disp, "rod": rod, "desc": desc,
                                             "ringPack": re.sub(r"\s+", " ", rp), "pg": num(pg), "pdfPage": pno})
                        else:
                            bore, ch, pn, pg = cells
                            dia_rows.append({"bore": bore, "ch": ch, "pn": pn, "pg": num(pg), "pdfPage": pno})
    return num_rows, dia_rows


def listing_desc(desc):
    """'STEP-DISH 25.8cc 2V' / 'SLD DOME -6.3cc 2V' / 'DOME' / 'FLAT TOP - 7cc' -> crown, catalog cc, reliefs."""
    d = desc.replace('"', "")
    m = re.search(r"(-?\s?\d*\.?\d+)\s*cc", d)
    cc = float(m.group(1).replace(" ", "")) if m else None
    rel = None
    m2 = re.search(r"(\d)V\b", d)
    if m2:
        rel = int(m2.group(1))
    crown, _, ht = parse_crown(re.sub(r"-?\s?\d*\.?\d+\s*cc", "", d))
    return crown, cc, rel, ht


def listing_family(mfg, disp, desc, pg, page_section):
    """Family for a listing row: the detail catalog section printed on that page, else MFG/DISP heuristics."""
    sec = page_section.get(pg)
    if sec:
        return sec, "page"
    mfg = mfg.upper()
    d = str(disp).upper()
    if mfg == "CHEVY":
        if d in ("348", "409") or "W" in desc.upper().split():
            return ["Chevy W-series 348/409"], "mfg"
        n = num(d)
        if n and n >= 396 and n not in (400, 406, 409, 414, 421, 434, 436):
            return list(BBC), "mfg"
        return ["Small-block Chevy"], "mfg"
    if mfg == "GM":
        return ["GM LS"], "mfg"
    if mfg == "CHRY":
        if "HEMI" in d:
            return ["Chrysler Gen III Hemi 5.7/6.1"], "mfg"
        n = num(re.sub(r"[^\d.]", "", d))
        if n and n >= 383:
            return ["Mopar B/RB big block"], "mfg"
        return ["Mopar LA small block"], "mfg"
    if mfg == "FORD":
        if "FLATHEAD" in d.upper():
            return ["Ford Flathead V8"], "mfg"
        if d.endswith("L"):
            return ["Ford Modular"], "mfg"
        n = num(re.sub(r"[^\d.]", "", d))
        if "C" in d:
            return ["Ford 351C/351M/400"], "mfg"
        if n and 390 <= n <= 428 and "W" not in d:
            return ["Ford FE"], "mfg"
        if n and n >= 429:
            return ["Ford 429/460"], "mfg"
        return ["Small-block Ford (Windsor)"], "mfg"
    if mfg == "PONT":
        return ["Pontiac V8"], "mfg"
    if mfg == "OLDS":
        return ["Oldsmobile V8"], "mfg"
    if mfg == "AMC":
        return ["AMC/Jeep inline-6"], "mfg"
    return [f"{mfg.title()} {disp}"], "unknown"


# ----------------------------------------------------------------------------------------------
# ICON Premium / FHR detail catalogs
# ----------------------------------------------------------------------------------------------
SECTION_FAM = [
    # (regex on the section/page heading, families, series override)
    (r"^CHEVROLET W-HEAD", ["Chevy W-series 348/409"]),
    (r"^CHEVROLET SBC", ["Small-block Chevy"]),
    (r"^CHEVROLET BBC", list(BBC)),
    (r"^CHEVROLET LS ENGINE|^GM LS\b", ["GM LS"]),
    (r"^CHRYSLER SB\b", ["Mopar LA small block"]),
    (r"^CHRYSLER BB HEMI", ["Chrysler 426 Hemi"]),
    (r"^CHRYSLER BB\b", ["Mopar B/RB big block"]),
    (r"^CHRYSLER (5\.7|6\.1)L HEMI$", ["Chrysler Gen III Hemi 5.7/6.1"]),
    (r"^CHRYSLER 6\.4L HEMI$", ["Chrysler Gen III Hemi 6.2/6.4"]),
    (r"^FORD FLATHEAD", ["Ford Flathead V8"]),
    (r"^FORD MODULAR", ["Ford Modular"]),
    (r"^FORD (SB )?WINDSOR", ["Small-block Ford (Windsor)"]),
    (r"^FORD CLEVELAND", ["Ford 351C/351M/400"]),
    (r"^FORD FE", ["Ford FE"]),
    (r"^FORD (429 - )?460", ["Ford 429/460"]),
    (r"^OLDSMOBILE", ["Oldsmobile V8"]),
    (r"^PONTIAC", ["Pontiac V8"]),
    (r"^AMC / JEEP", ["AMC/Jeep inline-6"]),
]
SECTION_RE = re.compile(r"^(CHEVROLET (W-HEAD|SBC|BBC|LS ENGINE)( FHR)?( CONTINUED)?\b.*|GM LS 4\.[78]L.*|CHRYSLER (SB|BB|BB HEMI)( FHR)?|"
                        r"CHRYSLER (5\.7|6\.1|6\.4)L HEMI|FORD (FLATHEAD|MODULAR|WINDSOR|SB WINDSOR FHR|CLEVELAND|FE|460|429 - 460)( FHR)?|"
                        r"OLDSMOBILE( FHR)?|PONTIAC( FHR)?|AMC / JEEP)$")
APP_RE = re.compile(r"^(CHEVROLET|CHRYSLER|FORD(?: / MERC)?|PONTIAC|OLDSMOBILE|AMC / JEEP)\s+(?P<rest>.*(?:V8|V-8|INLINE|HEMI-2V|FLATHEAD|-\dV).*)$")
LS_APP_RE = re.compile(r"^GM (?P<rest>\d\.\dL.*BLOCK.*)$")
HDR_VALUES_RE = re.compile(r"^\*?(?P<bore>\d\.\d{3,4})\s+(?P<second>\*?SEE BELOW|[\*†]?\d\.\d{3}(?:\s?/\s?[\*†]?\d\.\d{3})?|\.\d{3}\"?\s?[xX]\s?\.?\d\.\d{3}\"?(?:\s?[xX]\s?\.\d{3}\"?)?)\s+(?P<deck>\d{1,2}\.\d{3})\"?\s+(?P<alloy>2618|4032)\s*(?P<lock>.*)$")
PIN_RE = re.compile(r"^(?P<dia>\d?\.\d{3,4})\"?\s*[xX]\s*\.?(?P<len>\d\.\d{3})\"?")
PIN_ONLY_RE = re.compile(r"^\d?\.\d{3,4}$")
ROW_A_RE = re.compile(r"^(?P<flags>[\*†¹²³o ]*)(?P<pn>IC\d{3,5}[A-Z]*)\s*/?\s*(?P<kit>KT[DSM])?[\*†]?\s+(?P<rest>[\*†]?\d.*)$")
REST_A_NOCC_RE = re.compile(
    r"^(?P<crown>[A-Za-z][A-Za-z/.\"\d-]*?(?:\s[A-Za-z/-]+)*)\s+(?P<crs>(?:(?:\*?\d{1,2}(?:\.\d{1,2})?|NA|N/A)\s+)*)"
    r"(?P<wt>\d{3})\s*/\s*(?P<pinwt>\d{2,3})\s+(?:0\s+)?(?P<land>\d?\.\d{3})\"?\s*(?P<vr>.*)$")
ROW_B_RE = re.compile(
    r"^(?P<pn>IC\d+[A-Z]*?)\s*\.?\s*(?P<size>STD|\d{3})\s+(?P<kit>IC\d+[A-Z]*KT[SDM]\.(?:STD|\d{3}))\s+(?P<cid>\d{3})\s+"
    r"(?P<bore>\d\.\d{3})\s+(?P<stroke>\d\.\d{3})\s+(?P<rod>\d\.\d{3})\s+(?P<ch>\d\.\d{3})\s+(?P<pin>\d?\.\d{3})\s+"
    r"(?P<cc>-?\d+(?:\.\d+)?)\s*(?:cc)?\s+(?:(?P<crown>Flat Top|Dish|Dome)\s+)?(?P<wt>\d{3})\s*/\s*(?P<pinwt>\d{2,3})\s+"
    r"(?P<land>\.\d{3})\s+(?P<crs>(?:\d{1,2}\.\d\s+)+)(?P<ring>\S+)$")
REST_A_RE = re.compile(
    r"^(?P<crown>.*?)\s*(?P<cc>-?\s?\d*\.?\d+)\s*cc\s+(?P<crown2>(?:[A-Za-z][A-Za-z/-]*\s+)*?)"
    r"(?P<crs>(?:(?:\*?\d{1,2}(?:\.\d{1,2})?|NA|N/A)\s+)*)(?P<wt>\d{3})\s*/\s*(?P<pinwt>\d{2,3})\s+(?:0\s+)?(?P<land>\d?\.\d{3})\"?\s*(?P<vr>.*)$")
FLATHEAD_RE = re.compile(r"^(?P<cid>\d{3})\s+(?P<stroke>\d\.\d{3})\s+(?P<rod>\d\.\d{3})\s+(?P<ch>\d\.\d{3})\s+(?P<pin>\.\d{3})\s*x\s*(?P<pinlen>\d\.\d{3})\"?\s+(?P<rp>.+?)\s+(?P<wt>\d{3})/(?P<pinwt>\d{2,3})\s+(?P<land>\.\d{3})")


def fam_for_section(section):
    for pat, fams in SECTION_FAM:
        if re.match(pat, section):
            return list(fams)
    return None


def app_ci(heading):
    """'CHEVROLET 431/489-V8 DISH' -> [431, 489]; 'FORD 4.6L-V8' -> [281]; 'AMC / JEEP 4.6L - INLINE 6' -> [281]."""
    h = heading.replace("–", "-")
    m = re.search(r"\b(\d{3}(?:\s?[/-]\s?\d{3})*)\s?-?\s?V8", h)
    if m:
        return [int(x) for x in re.findall(r"\d{3}", m.group(1))]
    m = re.search(r"\b(\d\.\d)L", h)
    if m:
        return [liters_to_ci(float(m.group(1)))]
    m = re.search(r"\b(\d{3})\b", h)
    if m:
        return [int(m.group(1))]
    return None


def parse_detail(pdf_path, series_default, printed_offset, fix_split, qa):
    """Parse the ICON Premium or FHR catalog into row dicts (one per catalog line)."""
    rows = []
    page_section = {}  # printed page -> families (for the listing's PG column)
    section, fams, series = None, None, series_default
    app, hdr, oversizes, ring_pack, ring_set, notes, lock = None, {}, None, None, None, [], None
    cols, chambers, ls_ctx, ls_alloy, ls_ring = "std", [], None, None, None
    for pno, lines in page_texts(pdf_path, fix_split):
        printed = pno + printed_offset
        i = 0
        while i < len(lines):
            l = lines[i]
            i += 1
            if l in (", continued", "FHR SERIES", "Option Available") or l.startswith("For Piston and Ring Kit"):
                continue
            if re.match(r"^(PREMIUM|ELITE)\b", l):
                series = "ICON Elite" if l.startswith("ELITE") else "ICON Premium"
                if series_default == "ICON FHR":
                    series = series_default
                continue
            # a footnote PN glued in front of a keyword line ('†IC9974 OVERSIZES: ...', 'IC510LCA RING PACK: ...')
            l = re.sub(r"^[\*†]?IC\d+[A-Z]*\s+(?=(OVERSIZES|RING PACK|RINGSET|NOTES):)", "", l)
            if SECTION_RE.match(l):
                section = re.sub(r" CONTINUED$", "", l)
                f = fam_for_section(section)
                if f:
                    fams = f
                    page_section.setdefault(printed, fams)
                continue
            m = LS_APP_RE.match(l)
            if m:
                ls_ctx = l
                app = l
                hdr = {"deck": num((re.search(r"(\d\.\d{3})\"? ?DECK", l) or [None, None])[1]) if "DECK" in l else None}
                oversizes, ring_set, notes = None, None, []
                continue
            m = APP_RE.match(l)
            if m and not l.startswith("PART"):
                app = re.sub(r'\s+For Piston and Ring Kit add "KT[DS]"\.?$', "", l)
                hdr, oversizes, ring_pack, ring_set, notes, lock = {}, None, None, None, [], None
                cols, chambers = "std", []
                continue
            if l.startswith("FEATURES:") or l.startswith("ALLOY:") or "ALLOY:" in l:
                m2 = re.search(r"ALLOY:\s*(2618|4032)", l)
                if m2:
                    ls_alloy = m2.group(1)
                continue
            if l.startswith("LOCK RINGS:"):
                lock = l.split(":", 1)[1].strip()
                continue
            if l.startswith("Bore ") and "Deck" in l:
                hdr_names = l
                if i < len(lines):
                    m2 = HDR_VALUES_RE.match(lines[i])
                    if m2:
                        i += 1
                        hdr = {"bore": num(m2.group("bore")), "deck": num(m2.group("deck")), "alloy": m2.group("alloy"),
                               "lock": m2.group("lock").strip() or None}
                        sec = m2.group("second")
                        if "Stroke" in hdr_names and re.match(r"^[\*†]?\d\.\d{3}", sec):
                            strokes = [num(x) for x in re.findall(r"\d\.\d{3}", sec)]
                            hdr["stroke"] = strokes[0]
                            if len(strokes) > 1:
                                hdr["strokeOptions"] = strokes
                        elif "Pin" in hdr_names:
                            pm = PIN_RE.match(sec)
                            if pm:
                                hdr["pin"] = num(pm.group("dia"))
                                hdr["pinLength"] = num(pm.group("len"))
                        if i < len(lines) and re.match(r"^\*\d{1,2}\.\d{3}\"?$", lines[i]):
                            hdr["deckAlt"] = num(lines[i].strip("*"))
                            i += 1
                    else:
                        qa.append(f"{os.path.basename(pdf_path)} p{pno}: header values not parsed: {lines[i]!r}")
                continue
            if l.startswith("OVERSIZES:"):
                body = l.split(":", 1)[1]
                note = None
                if "NOTES:" in body:
                    body, note = body.split("NOTES:", 1)
                oversizes, trailing = [], []
                for t in body.split():
                    t2 = t.strip("¹²³*†")
                    if trailing or not (re.match(r"^(STD\.?|\.\d{3,4})$", t2, re.I) or t2 in ("/", "")):
                        trailing.append(t)
                    elif t2 and t2 != "/":
                        oversizes.append(0.0 if t2.upper().startswith("STD") else num(t2))
                if trailing:
                    notes.append(" ".join(trailing))
                if note and note.strip():
                    notes.append(note.strip())
                continue
            if l.startswith("NOTES:"):
                notes.append(l.split(":", 1)[1].strip())
                continue
            if l.startswith("RING PACK:"):
                rp, note = ring_pack_split(l.split(":", 1)[1])
                ring_pack = rp
                if rp and (ls_ctx or "LS" in (section or "")):
                    ls_ring = rp
                if note:
                    notes.append(note)
                continue
            if l.startswith("RINGSET PART NO:") or l.startswith("RING REPLACEMENT"):
                body = l.split(":", 1)[1].strip()
                m2 = re.match(r"^((?:[\*†]?\d{4}[A-Z]{2,3}\d?(?:\.\d{3})?(?:\s*/\s*|,\s*)?)+)\s*(.*)$", body)
                if m2:
                    ring_set = re.sub(r"\s*/\s*", " / ", m2.group(1)).strip(" ,/")
                    if m2.group(2).strip():
                        notes.append(m2.group(2).strip())
                else:
                    ring_set = body
                continue
            if l.startswith("PART #"):
                if "CID" in l:
                    cols = "flathead"
                elif "ROD C/H STROKE" in l:
                    cols = "hemi"
                elif "ROD STROKE C/H" in l:
                    cols = "elite"
                else:
                    cols = "std"
                continue
            if re.search(r"\d\s?cc", l) and ("WEIGHT" in l or "LAND" in l or re.match(r"^(\d+(?:\.\d+)?cc\s*)+$", l)):
                chambers = [c.replace(" ", "") for c in re.findall(r"(\d+ ?(?:\.\d+)?)cc", l)]
                continue
            if "Piston/Pin Land" in l or ("Piston Set" in l and "cc" in l):
                chambers = re.findall(r"(\d+(?:\.\d+)?)cc", l)
                continue
            if re.match(r"^(C/R GRAM TOP|Gram Wgt\.|Piston Set|\d+ \| |800-648-7970|TECH LINE|\d{2}\d{2}0000)", l):
                continue
            # ---- rows
            mb = ROW_B_RE.match(l)
            if mb:
                d = mb.groupdict()
                crs = [num(x) for x in d["crs"].split()]
                rows.append({"kind": "B", "pdf": os.path.basename(pdf_path), "page": pno, "printed": printed,
                             "section": section, "fams": fams, "series": series, "app": app, "pn": d["pn"],
                             "size": d["size"], "kitPn": d["kit"], "ci": int(d["cid"]), "bore": num(d["bore"]),
                             "stroke": num(d["stroke"]), "rod": num(d["rod"]), "ch": num(d["ch"]), "pin": num(d["pin"]),
                             "cc": num(d["cc"]), "crownText": d["crown"] or (re.search(r"(FLAT TOP|DISH|DOME)", app or "") or [None, ""])[1],
                             "wt": int(d["wt"]), "pinWt": int(d["pinwt"]),
                             "land": num(d["land"]), "crs": crs, "chambers": list(chambers), "ringSet": d["ring"],
                             "alloy": ls_alloy, "ringPack": ls_ring, "deck": hdr.get("deck"), "lock": lock,
                             "notes": list(notes)})
                continue
            ma = ROW_A_RE.match(l)
            if ma and app:
                d = ma.groupdict()
                rest = d["rest"].strip()
                row = {"kind": "A", "pdf": os.path.basename(pdf_path), "page": pno, "printed": printed,
                       "section": section, "fams": fams, "series": series, "app": app, "pn": d["pn"],
                       "kit": d["kit"], "flags": d["flags"].replace(" ", ""), "hdr": dict(hdr),
                       "oversizes": oversizes, "ringPack": ring_pack, "ringSet": ring_set, "notes": list(notes),
                       "lock": lock, "cols": cols, "chambers": list(chambers)}
                if cols == "flathead":
                    mf = FLATHEAD_RE.match(rest)
                    if not mf:
                        qa.append(f"{row['pdf']} p{pno}: flathead row not parsed: {l!r}")
                        continue
                    f = mf.groupdict()
                    row.update({"ci": int(f["cid"]), "stroke": num(f["stroke"]), "rod": num(f["rod"]), "ch": num(f["ch"]),
                                "pin": num(f["pin"]), "pinLength": num(f["pinlen"]), "rowRingPack": f["rp"],
                                "wt": int(f["wt"]), "pinWt": int(f["pinwt"]), "land": num(f["land"]), "crs": [],
                                "cc": None, "crownText": "dome"})
                    rows.append(row)
                    continue
                toks = rest.split()
                try:
                    row["rod"] = num(toks[0].lstrip("*"))
                    if cols == "elite":
                        row["stroke"], row["ch"] = num(toks[1]), num(toks[2])
                        k = 3
                    elif cols == "hemi":
                        row["ch"], row["stroke"] = num(toks[1]), num(toks[2])
                        k = 3
                    else:
                        row["ch"] = num(toks[1])
                        k = 2
                        pm = PIN_RE.match(" ".join(toks[k:k + 3]))
                        if pm:
                            row["pin"], row["pinLength"] = num(pm.group("dia")), num(pm.group("len"))
                            consumed = len(pm.group(0).split())
                            k += consumed
                        elif PIN_ONLY_RE.match(toks[k]):
                            row["pin"] = num(toks[k])
                            k += 1
                        else:
                            qa.append(f"{row['pdf']} p{pno}: pin not parsed: {l!r}")
                except (IndexError, ValueError):
                    qa.append(f"{row['pdf']} p{pno}: geometry not parsed: {l!r}")
                    continue
                rest2 = " ".join(toks[k:])
                if "cc" not in rest2:
                    rest2 = re.sub(r"^((?:\S+\s+)*?(?:DOME|DISH|Dish|Dome|FT/\dV|D-CUP))\s+(-?\d*\.?\d+)\s+(?=\d{1,2}\.\d\s)", r"\1 \2cc ", rest2)
                mr = REST_A_RE.match(rest2)
                if mr:
                    r = mr.groupdict()
                    crown = (r["crown"] + " " + (r["crown2"] or "")).strip()
                    cc = num(r["cc"].replace(" ", ""))
                else:
                    mr = REST_A_NOCC_RE.match(rest2)
                    if not mr:
                        qa.append(f"{row['pdf']} p{pno}: row tail not parsed: {l!r}")
                        continue
                    r = mr.groupdict()
                    crown, cc = r["crown"].strip(), None
                    qa.append(f"{row['pn']} ({row['pdf']} p{pno}): no crown volume printed ({crown!r})")
                row.update({"crownText": crown, "cc": cc,
                            "crs": [num(x) for x in r["crs"].split()], "wt": int(r["wt"]), "pinWt": int(r["pinwt"]),
                            "land": num(r["land"])})
                vr = [num(x) for x in re.findall(r"\d*\.\d{3}", r["vr"])]
                row["vr"] = vr
                rows.append(row)
                continue
            if re.match(r"^[\*†]?IC\d{3}", l) and len(re.findall(r"\d\.\d{3}", l)) >= 2:
                qa.append(f"{os.path.basename(pdf_path)} p{pno}: unparsed part line: {l!r}")
    return rows, page_section


# ----------------------------------------------------------------------------------------------
# 2026 supplement
# ----------------------------------------------------------------------------------------------
SUPP_ROW_RE = re.compile(
    r"^(?:(?P<fn>\d)\s+)?(?P<set>N/A|Sold as kit only|(?:IC|KB)\S+)\s+(?P<kit>(?:IC|KB)\S+(?:\s?K1)?)\s+(?P<disp>\d+(?:\.\d+)?)(?:ci|L)?\s+"
    r"(?P<bore>\d\.\d{2,4})\s+(?P<stroke>\d\.\d{3,4})\s+(?P<rod>\d\.\d{2,3})\s+(?P<ch>N/A|\d\.\d{3})\s+(?P<pin>\d?\.\d{3})[†*]?\s+"
    r"(?P<cc>-?\d+(?:\.\d+)?)\s+(?P<crown>Flat Top|Flat|Dish|Dome)\s+(?P<wt>N/A|\d{3}(?:\s*/\s*\d{0,3})?)\s+(?P<land>\d?\.\d{2,3})\s+"
    r"(?P<hcc>N/A|\d+(?:\.\d+)?(?:cc)?)\s+(?P<cr>N/A|NA|\d{1,2}\.\d{1,2}(?::1)?)\s+(?P<ring>\S+)$")
SUPP_FHR_RE = re.compile(
    r"^(?P<pn>IC\d+)\s?(?P<flag>[*†])?\s+(?P<kit>IC\d+-(?:_ ?)+K1)\s+(?P<sizes>(?:STD|\.\d{3})(?:\s+\.\d{3})*)\s+"
    r"(?P<nums>(?:\d?\.\d{3}\s+){5})(?P<cc>-?\d+(?:\.\d+)?)\s+(?P<crown>Flat|Dish|Dome)\s+(?P<wt>\d{3}/\d{2,3})\s+"
    r"(?P<land>\.\d{3})\s+(?P<tail>.+?)\s+(?P<sup>IC\d+)$")
DUALOY_KIT_RE = re.compile(r"\b(?P<kit>DU\d{5}(?:-(?:_ ?)+K1)?|\d{4}D(?:KT|K|-(?:_ ?)+K1)?)\b")
DUALOY_ROW_RE = re.compile(r"(?P<y0>\d{4})-(?P<y1>\d{4})\s+(?P<engine>.+)$")


def supp_family(make, sub, disp_text):
    """Family from the supplement's make heading + sub-heading (+ row displacement for EcoBoost)."""
    s = (make + " | " + sub).upper()
    if "ECOBOOST" in s:
        return [f"Ford EcoBoost {disp_text}L"]
    if "BOSS" in s or "6.2L V8" in s:
        return ["Ford 6.2L Boss V8"]
    if "FE" in s.split() or "BLOCK FE" in s:
        return ["Ford FE"]
    if "HEMI GEN III" in s:
        return ["Chrysler Gen III Hemi 6.2/6.4"] if "6.4" in s or "6.2" in s else ["Chrysler Gen III Hemi 5.7/6.1"]
    if "BIG BLOCK B" in s:
        return ["Mopar B/RB big block"]
    if "GEN V" in s or "DIRECT INJECTED" in s:
        return ["GM LT (Gen V)"]
    if "GEN III/IV" in s or "LS" in s.split() or "LS1" in s:
        return ["GM LS"]
    if "GEN I" in s or "GEN 1" in s or "350/400" in s or "CRATE 350" in s:
        return ["Small-block Chevy"]
    if "BIG BLOCK 396" in s:
        return list(BBC)
    if "SMALL BLOCK 340" in s or "340, 360" in s:
        return ["Mopar LA small block"]
    if "WINDSOR" in s:
        return ["Small-block Ford (Windsor)"]
    if "AMC" in s or "4.6L STROKER" in s:
        return ["AMC/Jeep inline-6"]
    if "351M" in s:
        return ["Ford 351C/351M/400"]
    if "COYOTE" in s or "5.0L" in s:
        return ["Ford Coyote"]
    if "GODZILLA" in s or "7.3L" in s:
        return ["Ford Godzilla 7.3"]
    if "HOLDEN" in s:
        return ["Holden V8"]
    return [sub.strip() or make.strip()]


def supp_sizes_from_pn(pn):
    """'IC10180-.020' -> ('IC10180', '.020'); 'IC592CA.25MM' -> ('IC592CA', '.25MM'); 'KB10179-STD' -> ('KB10179','STD')."""
    m = re.match(r"^((?:IC|KB)\d+[A-Z]*?)(?:TK|KTS|KTD|KTM|K1|KT|K)?[-.]+\.?(STD|\d{3}|\d*\.?\d+MM|\d\.\d{1,2})$", pn)
    if m:
        size = m.group(2)
        return m.group(1), size
    return pn, None


def parse_supplement(pdf_path, qa):
    rows, dualoy = [], []
    make, sub, deck, alloy, lock, ring_pack, notes, cr_cols, section = None, None, None, None, None, None, [], [], None
    for pno, lines in page_texts(pdf_path):
        if pno < 4 or pno > 19:
            continue
        if 10 <= pno <= 12 or 14 <= pno <= 17:
            continue  # sport compact imports, Silvolite OEM replacements
        if pno in (18, 19):
            group = None
            for l in lines:
                if re.match(r"^(GENERAL MOTORS|DODGE RAM/JEEP|FORD F250|NAVISTAR|DODGE SPRINTER|MERCEDES SPRINTER)", l):
                    group = l
                    continue
                mk = DUALOY_KIT_RE.search(l)
                my = DUALOY_ROW_RE.search(l)
                if not (mk and my) or my.start() > mk.start():
                    continue
                pre = l[my.start():mk.start()].strip()
                post = l[mk.end():].strip()
                my2 = DUALOY_ROW_RE.match(pre)
                eng_toks = my2.group("engine").split()
                vin = []
                while eng_toks and re.match(r"^[A-Z0-9](?:,\s?[A-Z0-9])*,?$", eng_toks[-1]) and (len(eng_toks[-1]) == 1 or "," in eng_toks[-1]):
                    vin.insert(0, eng_toks.pop().rstrip(","))
                engine = " ".join(eng_toks).strip(" ,")
                sizes = re.findall(r"STD|TBD|\d*\.\d+MM", post)
                tail = re.sub(r"^(?:STD|TBD|\d*\.\d+MM|\s)+", "", post)
                mahle = re.findall(r"224-\d{4}(?:\([RL]\))?", tail)
                tail2 = re.sub(r"224-\d{4}(?:\([RL]\))?", " ", tail)
                oe = [t.strip(",") for t in tail2.replace("/", " ").split() if re.search(r"\d{4}", t) and t.lower() not in ("subs",)]
                dualoy.append({"page": pno, "group": group, "y0": int(my2.group("y0")), "y1": int(my2.group("y1")), "engine": engine,
                               "vin": ",".join(vin) if vin else None, "kit": mk.group("kit"), "sizes": sizes,
                               "oe": oe, "mahle": mahle, "line": l})
            continue
        i = 0
        ctx = []
        while i < len(lines):
            l = lines[i]
            i += 1
            if re.match(r"^(AMC/JEEP|Ford( \(Con.t\))?|Mopar|GENERAL MOTORS|General Motors|CHRYSLER \| DODGE|FORD|Holden|PREMIUM)$", l, re.I):
                if l.upper() != "PREMIUM":
                    make = l
                    ctx = []
                continue
            if l.startswith("KB CAST") or l.startswith("FHR FORGED"):
                section = "KB" if l.startswith("KB") else "FHR"
                continue
            # heading context: short non-keyword lines between the make heading and the table header
            if (not re.search(r"(Notes:|ALLOY:|LOCK RINGS?:|RING PACK:|RING #|REPLACEMENT|Piston Set|Item Number|^Type |^CC Type|^FN |Footnotes)", l)
                    and len(l) < 70 and not re.match(r"^(\d{4}[A-Z]|\d\s|N/A|Sold|IC\d|KB\d|\d{1,2}$)", l)
                    and not re.match(r"^[a-z]", l) and not re.search(r"\.\s|\.$", l)):
                ctx.append(l.split("OE DECK HEIGHT")[0].strip(" :"))
            if l.startswith("Item Number") or l.startswith("FN Piston Set") or l.startswith("Piston Set"):
                sub = " / ".join(c for c in ctx if c)
                ctx = []
            m = re.search(r"ALLOY:\s*(.+)$", l)
            if m:
                alloy = m.group(1).strip()
            m = re.search(r"LOCK RINGS?:\s*(.+)$", l)
            if m:
                lock = m.group(1).strip()
            m = re.search(r"RING PACK:\s*(.+)$", l)
            if m:
                ring_pack = m.group(1).strip()
            m = re.search(r"OE DECK HEIGHT:\s*(\d{1,2}\.\d{2,3})", l)
            if m:
                deck = num(m.group(1))
                continue
            m = re.match(r"^(\d{1,2}\.\d{3})\"? [Dd]eck [Hh]eight$", l)
            if m:
                deck = num(m.group(1))
                continue
            if l.startswith("Notes:"):
                notes = [l.split(":", 1)[1].split("ALLOY:")[0].strip()]
                continue
            if l.startswith("Item Number") or l.startswith("FN Piston Set") or l.startswith("Piston Set"):
                cr_cols = re.findall(r"(\d+(?:\.\d+)?)cc", l)
                if i < len(lines) and lines[i].startswith("Type Piston/Pin Land"):
                    cr_cols = re.findall(r"(\d+(?:\.\d+)?)cc", lines[i]) or cr_cols
                    i += 1
                continue
            if l.startswith("Type Piston/Pin Land") or l.startswith("CC Type") or l.startswith("Footnotes") or re.match(r"^\d{1,2}$", l):
                continue
            mf = SUPP_FHR_RE.match(l)
            if mf:
                d = mf.groupdict()
                nums = [num(x) for x in d["nums"].split()]
                bore, stroke = nums[0], nums[1]
                rest3 = sorted(nums[2:])
                pin, ch, rod = rest3[0], rest3[1], rest3[2]
                tail = d["tail"].split()
                hcc, cr = None, {}
                if cr_cols and len(cr_cols) >= 2:
                    for c, v in zip(cr_cols, tail):
                        if num(v) is not None:
                            cr[c] = num(v)
                else:
                    hcc = num(tail[0]) if len(tail) > 1 else None
                    v = num(tail[-1])
                    if v is not None and hcc is not None:
                        cr[str(hcc)] = v
                rows.append({"kind": "SF", "page": pno, "make": make, "sub": sub, "series": "ICON FHR", "pn": d["pn"],
                             "flag": d["flag"], "kit": re.sub(r"(_ ?)+", "___", d["kit"]), "sizes": d["sizes"].split(),
                             "bore": bore, "stroke": stroke, "rod": rod, "ch": ch, "pin": pin, "cc": num(d["cc"]),
                             "crown": d["crown"], "wt": d["wt"], "land": num(d["land"]), "cr": cr, "hcc": hcc,
                             "supersedes": d["sup"], "deck": deck, "alloy": alloy, "lock": lock, "ringPack": ring_pack,
                             "notes": list(notes)})
                continue
            ms = SUPP_ROW_RE.match(l)
            if ms:
                d = ms.groupdict()
                set_pn = None if d["set"] in ("N/A", "Sold as kit only") else d["set"]
                base, size = supp_sizes_from_pn(set_pn or d["kit"].replace(" ", ""))
                if size is None:
                    qa.append(f"supplement p{pno}: size suffix not recognised in {set_pn or d['kit']!r}")
                cr = {}
                crv = num(d["cr"].replace(":1", ""))
                hcc = d["hcc"].replace("cc", "")
                if crv is not None:
                    cr[hcc if num(hcc) is not None else "unstated"] = crv
                series = "KB Hypereutectic" if base.startswith("KB") else ("ICON FHR" if section == "FHR" else "ICON Premium")
                disp_text = d["disp"]
                rows.append({"kind": "SP", "page": pno, "make": make, "sub": sub, "series": series, "fn": d["fn"],
                             "pn": base, "size": size, "setPn": set_pn, "kitPn": d["kit"].replace(" ", ""),
                             "dispText": disp_text, "bore": num(d["bore"]), "stroke": num(d["stroke"]), "rod": num(d["rod"]),
                             "ch": num(d["ch"]), "pin": num(d["pin"]), "cc": num(d["cc"]), "crown": d["crown"],
                             "wt": d["wt"], "land": num(d["land"]), "cr": cr, "ring": d["ring"], "deck": deck,
                             "alloy": alloy, "lock": lock, "ringPack": ring_pack, "notes": list(notes)})
                continue
            if re.match(r"^(\d\s+)?(N/A\s+|Sold as kit only\s+)?(IC|KB)\d{3}", l):
                qa.append(f"supplement p{pno}: unparsed row: {l!r}")
    return rows, dualoy


def dualoy_family(engine):
    e = engine.upper()
    if "6.6L DURAMAX" in e:
        return "Duramax 6.6", 8
    if "2.8L DURAMAX" in e:
        return "GM 2.8 Duramax", 4
    if "3.0L DURAMAX" in e:
        return "GM 3.0 Duramax", 6
    if "6.5L" in e:
        return "GM 6.2/6.5 diesel", 8
    if "5.9L 12V" in e:
        return "Cummins 5.9 12V", 6
    if "5.9L 24V" in e:
        return "Cummins 5.9 24V/CR", 6
    if "6.7L 24V" in e or ("CUMMINS" in e and "6.7" in e):
        return "Cummins 6.7", 6
    if "ECODIESEL" in e:
        return "RAM 3.0 EcoDiesel", 6
    if "7.3L" in e and "POWER STROKE" in e:
        return "Powerstroke 7.3", 8
    if "6.0L" in e and "POWER STROKE" in e:
        return "Powerstroke 6.0", 8
    if "6.4L" in e and "POWER STROKE" in e:
        return "Powerstroke 6.4", 8
    if "6.7L POWER STROKE" in e:
        return "Powerstroke 6.7", 8
    if "MAXXFORCE" in e:
        return "Navistar MaxxForce 7", 8
    if "OM642" in e or "EXM" in e:
        return "Mercedes Sprinter", 6
    return engine, None


# ----------------------------------------------------------------------------------------------
# records
# ----------------------------------------------------------------------------------------------
def clean(d):
    """Drop None values and empty containers, recursively."""
    if isinstance(d, dict):
        out = OrderedDict()
        for k, v in d.items():
            v = clean(v)
            if v is None or v == [] or v == {} or v == "":
                continue
            out[k] = v
        return out
    if isinstance(d, list):
        return [clean(x) for x in d if x is not None]
    return d


def cr_map(chambers, crs):
    cr = OrderedDict()
    for c, v in zip(chambers, crs):
        if v is not None:
            cr[c] = v
    return cr


def make_name(series, bore, crown, cc, rod, stroke=None):
    parts = [f"{series} forged piston" if not series.startswith("KB") else "KB hypereutectic cast piston"]
    if bore:
        parts.append(f"{bore:.3f} bore")
    if crown:
        c = crown
        if cc is not None:
            c += f" {cc:+.1f}cc"
        parts.append(c)
    if stroke:
        parts.append(f"{stroke:.3f} stroke")
    if rod:
        parts.append(f"{rod:.3f} rod")
    return ", ".join(parts)


def src_for(key, paths, page=None, printed=None, section=None):
    doc, ed = DOCS[key]
    href, _ = PDFS[key]
    s = OrderedDict([("doc", doc), ("edition", ed), ("url", urljoin(CATALOG_PAGE, quote(href, safe="/:")))])
    if page is not None:
        s["page"] = page
    if printed is not None:
        s["printedPage"] = printed
    if section:
        s["section"] = section
    return s


def build_records(detail_rows, supp_rows, dualoy_rows, num_rows, dia_rows, page_section, paths, qa, unknown):
    records = []
    detail_index = defaultdict(list)   # base pn -> records (all families)

    def emit(rec, key):
        records.append(rec)
        detail_index[key].append(rec)

    def application_of(rec, src_section=None):
        sp = rec["spec"]
        return OrderedDict([("application", src_section or rec["src"].get("section")), ("ci", rec["fit"].get("ci")),
                            ("bore", sp.get("bore")), ("stroke", sp.get("stroke")), ("rodLength", sp.get("rodLength")),
                            ("ch", sp.get("ch")), ("cr", sp.get("cr")), ("page", rec["src"].get("page"))])

    def merge_or_emit(rec, key):
        """Same PN already recorded for this family (another bore/stroke block): keep one record, list the combos."""
        existing = [x for x in detail_index.get(key, []) if x["fit"]["fam"] == rec["fit"]["fam"] and x["m"] == rec["m"]]
        if not existing:
            emit(rec, key)
            return rec
        ex = existing[0]
        if rec["spec"].get("sizes") and ex["spec"].get("sizes"):
            # the 2026 supplement adds bore sizes to a PN the 2020 catalog already lists
            known = {s.get("size") for s in ex["spec"]["sizes"]}
            for s in rec["spec"]["sizes"]:
                if s.get("size") not in known:
                    ex["spec"]["sizes"].append(s)
            ex["spec"]["boreOptions"] = sorted(set(ex["spec"].get("boreOptions") or []) | set(rec["spec"].get("boreOptions") or []))
            ex["src"]["also"] = rec["src"]["doc"] + f" p{rec['src'].get('page')}"
            return ex
        apps = ex["spec"].setdefault("applications", [application_of(ex)])
        apps.append(application_of(rec))
        for c in rec["fit"].get("ci") or []:
            if c not in (ex["fit"].get("ci") or []):
                ex["fit"]["ci"] = sorted((ex["fit"].get("ci") or []) + [c])
        return ex

    # ---- ICON Premium / FHR format A rows: one record per PN x family
    for r in detail_rows:
        if r["kind"] != "A":
            continue
        fams = r["fams"] or ["unknown section"]
        if r["section"] and r["section"].startswith("FORD MODULAR") and re.search(r"\b5\.0L|COYOTE", r["app"], re.I):
            fams = ["Ford Coyote"]
        if r["section"] and r["section"].startswith("CHRYSLER SB") and re.search(r"MAGNUM", r["app"], re.I):
            fams = ["Mopar Magnum 5.2/5.9"]
        h = r["hdr"]
        crown, reliefs, dome_ht = parse_crown(r["crownText"])
        cc = dome_cc_from_catalog(r["cc"])
        vr = r.get("vr") or []
        bore = h.get("bore")
        oversizes = r["oversizes"]
        bore_opts = [rnd(bore + o, 4) for o in oversizes] if (bore and oversizes) else None
        pin = r.get("pin") or h.get("pin")
        pin_len = r.get("pinLength") or h.get("pinLength")
        notes = " ".join(n for n in r["notes"] if n).strip() or None
        pin_offset = None
        if notes:
            if re.search(r"centered pin|pin is centered", notes, re.I):
                pin_offset = "centered"
            elif re.search(r"offset pin|offset wrist|pin offset|offset pins", notes, re.I):
                pin_offset = "offset"
        spec = OrderedDict([
            ("series", r["series"]), ("bore", bore), ("boreOptions", bore_opts), ("oversizes", oversizes),
            ("stroke", r.get("stroke") or h.get("stroke")), ("rodLength", r.get("rod")), ("ch", r.get("ch")),
            ("pin", pin), ("pinLength", pin_len), ("domeCc", cc), ("crown", crown), ("domeHeight", dome_ht),
            ("valveReliefs", reliefs), ("alloy", h.get("alloy")), ("weight", r.get("wt")), ("pinWeight", r.get("pinWt")),
            ("topLand", r.get("land")), ("cr", cr_map(r["chambers"], r["crs"]) if r["crs"] else None),
            ("ringPack", r.get("rowRingPack") or r["ringPack"]), ("ringSet", r["ringSet"]), ("lockRings", h.get("lock") or r["lock"]),
            ("deckHeight", h.get("deck")), ("pinOffset", pin_offset), ("kitSuffix", r["kit"]),
        ])
        if r["crs"] and len(r["crs"]) != len(r["chambers"]):
            spec["crValues"] = r["crs"]
            spec["cr"] = cr_map(r["chambers"], r["crs"]) if len(r["crs"]) < len(r["chambers"]) else None
            qa.append(f"{r['pn']} ({r['pdf']} p{r['page']}): {len(r['crs'])} CR values for chamber header {r['chambers']}; kept positional")
        if vr and any(vr):
            if len(vr) >= 2 and (vr[0] or vr[1]):
                spec["valveReliefDepthInt"], spec["valveReliefDiaInt"] = (vr[0] or None), (vr[1] or None)
            if len(vr) >= 4 and (vr[2] or vr[3]):
                spec["valveReliefDepthExh"], spec["valveReliefDiaExh"] = (vr[2] or None), (vr[3] or None)
        if h.get("deckAlt"):
            spec["deckHeightOptions"] = [h["deck"], h["deckAlt"]]
        if h.get("strokeOptions"):
            spec["strokeOptions"] = h["strokeOptions"]
        if r["flags"]:
            spec["catalogFlag"] = r["flags"]
        ci = app_ci(r["app"]) if r.get("ci") is None else [r["ci"]]
        for fam in fams:
            if fam not in KNOWN_FAM:
                unknown[fam] += 1
            rec = OrderedDict([
                ("m", "ICON"), ("p", r["pn"]), ("cat", "piston"),
                ("name", make_name(r["series"], bore, crown, cc, r.get("rod"), spec["stroke"])),
                ("fit", OrderedDict([("fam", fam), ("ci", ci), ("cyl", FAM_CYL.get(fam, 8)), ("notes", notes)])),
                ("spec", OrderedDict(spec)),
                ("src", src_for("icon" if r["pdf"].startswith("icon_premium") else "fhr", paths, r["page"], r["printed"], r["app"])),
                ("emissions", None),
            ])
            merge_or_emit(rec, r["pn"])

    # ---- format B (LS tables): group rows per base PN
    groups = OrderedDict()
    for r in detail_rows:
        if r["kind"] == "B":
            groups.setdefault(r["pn"], []).append(r)
    for pn, rs in groups.items():
        r0 = next((x for x in rs if x["size"] == "STD"), rs[0])
        crown, reliefs, _ = parse_crown(r0["crownText"])
        sizes = []
        for x in rs:
            sizes.append(OrderedDict([("size", x["size"]), ("sku", f"{pn}.{x['size']}"), ("kit", x["kitPn"]), ("bore", x["bore"]),
                                      ("ci", x["ci"]), ("cr", cr_map(x["chambers"], x["crs"])), ("ringSet", x["ringSet"])]))
        spec = OrderedDict([
            ("series", r0["series"]), ("bore", r0["bore"]), ("boreOptions", sorted({x["bore"] for x in rs})),
            ("stroke", r0["stroke"]), ("rodLength", r0["rod"]), ("ch", r0["ch"]), ("pin", r0["pin"]),
            ("domeCc", dome_cc_from_catalog(r0["cc"])), ("crown", crown), ("valveReliefs", reliefs), ("alloy", r0["alloy"]),
            ("weight", r0["wt"]), ("pinWeight", r0["pinWt"]), ("topLand", r0["land"]), ("cr", cr_map(r0["chambers"], r0["crs"])),
            ("ringPack", r0["ringPack"]), ("ringSet", r0["ringSet"]), ("lockRings", r0["lock"]), ("deckHeight", r0["deck"]),
            ("pinOffset", "offset"), ("sizes", sizes),
        ])
        fams = r0["fams"] or ["GM LS"]
        notes = " ".join(n for n in r0["notes"] if n).strip() or None
        for fam in fams:
            rec = OrderedDict([
                ("m", "ICON"), ("p", pn), ("cat", "piston"),
                ("name", make_name(r0["series"], r0["bore"], crown, spec["domeCc"], r0["rod"], r0["stroke"])),
                ("fit", OrderedDict([("fam", fam), ("ci", sorted({x["ci"] for x in rs})), ("cyl", 8), ("notes", notes)])),
                ("spec", spec),
                ("src", src_for("icon" if r0["pdf"].startswith("icon_premium") else "fhr", paths, r0["page"], r0["printed"], r0["app"])),
                ("emissions", None),
            ])
            emit(rec, pn)

    # ---- 2026 supplement: Premium / KB tables grouped per base PN, FHR table rows
    sgroups = OrderedDict()
    for r in supp_rows:
        if r["kind"] == "SP":
            sgroups.setdefault(r["pn"], []).append(r)
    for pn, rs in sgroups.items():
        r0 = next((x for x in rs if (x["size"] or "").upper() == "STD"), rs[0])
        crown, _, _ = parse_crown(r0["crown"])
        disp_text = r0["dispText"]
        fams = supp_family(r0["make"] or "", r0["sub"] or "", disp_text)
        d = num(disp_text)
        ci = [liters_to_ci(d)] if d and d < 20 else ([int(d)] if d else None)
        wt, pinwt = None, None
        m = re.match(r"^(\d{3})\s*/\s*(\d{2,3})$", r0["wt"] or "")
        if m:
            wt, pinwt = int(m.group(1)), int(m.group(2))
        elif num(r0["wt"]) is not None:
            wt = num(r0["wt"])
        sizes = []
        for x in rs:
            sizes.append(OrderedDict([("size", x["size"]), ("sku", x["setPn"]), ("kit", x["kitPn"]), ("bore", x["bore"]),
                                      ("cr", x["cr"] or None), ("ringSet", x["ring"])]))
        # sign convention: the supplement's Premium pages print dome volumes positive and dish/relief volumes positive
        # with the head type telling which; its KB page keeps the 2020 catalog convention (dome negative)
        if r0["series"].startswith("KB"):
            dome_cc = -r0["cc"]
        elif r0["crown"] == "Dome":
            dome_cc = r0["cc"]
            if r0["cc"] < 0:
                qa.append(f"{pn} (supplement p{r0['page']}): head type Dome with negative crown cc {r0['cc']}; stored as printed (net dish)")
        else:
            dome_cc = -abs(r0["cc"])
        # bore per size: the row's own bore column when it varies, else standard bore + the size suffix
        bore_opts = sorted({x["bore"] for x in rs})
        if len(bore_opts) == 1 and len(rs) > 1:
            opts = set()
            for x in rs:
                s = (x["size"] or "").upper()
                if s == "STD":
                    opts.add(r0["bore"])
                elif re.match(r"^\d{3}$", s):
                    opts.add(rnd(r0["bore"] + int(s) / 1000, 4))
                elif s.endswith("MM"):
                    v = s[:-2] or "0"
                    v = v if "." in v else "0." + v  # '.5MM' loses its dot in the PN split
                    opts.add(rnd(r0["bore"] + float(v) / 25.4, 4))
                elif re.match(r"^\d\.\d{1,2}$", s):
                    opts.add(rnd(r0["bore"] + float(s) / 25.4, 4))
            bore_opts = sorted(opts) or bore_opts
        cr = r0["cr"] or None
        cr_values = None
        if cr and "unstated" in cr:
            cr_values, cr = [cr["unstated"]], None
        spec = OrderedDict([
            ("series", r0["series"]), ("bore", r0["bore"]), ("boreOptions", bore_opts),
            ("stroke", r0["stroke"]), ("rodLength", r0["rod"]), ("ch", r0["ch"]), ("pin", r0["pin"]),
            ("domeCc", dome_cc),
            ("crown", crown), ("alloy", r0["alloy"]), ("weight", wt), ("pinWeight", pinwt), ("topLand", r0["land"]),
            ("cr", cr), ("crValues", cr_values), ("ringPack", r0["ringPack"]), ("ringSet", r0["ring"]), ("lockRings", r0["lock"]),
            ("deckHeight", r0["deck"]), ("sizes", sizes), ("kitOnly", True if r0["setPn"] is None else None),
        ])
        # footnote-marked rows (Mopar BB head designs) keep the footnote number
        if r0.get("fn"):
            spec["headNote"] = {"1": "Brodix B-1 Original heads", "2": "572-13 / 600-13X Indy heads",
                                "3": "Edelbrock, Trick Flow 240/270 and 440 Source Stealth heads"}.get(r0["fn"])
        notes = " ".join(n for n in r0["notes"] if n).strip() or None
        brand = "KB" if pn.startswith("KB") else "ICON"
        for fam in fams:
            if fam not in KNOWN_FAM:
                unknown[fam] += 1
            rec = OrderedDict([
                ("m", brand), ("p", pn), ("cat", "piston"),
                ("name", make_name(r0["series"], r0["bore"], crown, spec["domeCc"], r0["rod"], r0["stroke"])),
                ("fit", OrderedDict([("fam", fam), ("ci", ci), ("cyl", FAM_CYL.get(fam, 8)), ("notes", notes)])),
                ("spec", spec),
                ("src", src_for("supp2026", paths, r0["page"], r0["page"], (r0["make"] or "") + " / " + (r0["sub"] or ""))),
                ("emissions", None),
            ])
            merge_or_emit(rec, pn)
    for r in supp_rows:
        if r["kind"] != "SF":
            continue
        crown, _, _ = parse_crown(r["crown"])
        fams = supp_family(r["make"] or "", r["sub"] or "", "")
        wt, pinwt = (int(x) for x in r["wt"].split("/"))
        oversizes = [0.0 if s == "STD" else num(s) for s in r["sizes"]]
        spec = OrderedDict([
            ("series", r["series"]), ("bore", r["bore"]), ("boreOptions", [rnd(r["bore"] + o, 4) for o in oversizes]),
            ("oversizes", oversizes), ("stroke", r["stroke"]), ("rodLength", r["rod"]), ("ch", r["ch"]), ("pin", r["pin"]),
            ("domeCc", -r["cc"]), ("crown", crown), ("alloy", r["alloy"]), ("weight", wt), ("pinWeight", pinwt),
            ("topLand", r["land"]), ("cr", r["cr"] or None), ("ringPack", r["ringPack"]), ("lockRings", r["lock"]),
            ("deckHeight", r["deck"]), ("kitPn", r["kit"]), ("supersedes", r["supersedes"]),
            ("pinOffset", "offset" if r["flag"] == "†" else ("centered" if r["flag"] == "*" else None)),
        ])
        ci = None
        m = re.search(r"\b(\d{3})\b", r["sub"] or "")
        notes = " ".join(n for n in r["notes"] if n).strip() or None
        for fam in fams:
            if fam not in KNOWN_FAM:
                unknown[fam] += 1
            rec = OrderedDict([
                ("m", "ICON"), ("p", r["pn"]), ("cat", "piston"),
                ("name", make_name(r["series"], r["bore"], crown, -r["cc"], r["rod"], r["stroke"])),
                ("fit", OrderedDict([("fam", fam), ("ci", app_ci(r["sub"] or "") if r["sub"] else None), ("cyl", 8), ("notes", notes)])),
                ("spec", spec),
                ("src", src_for("supp2026", paths, r["page"], r["page"], (r["make"] or "") + " / " + (r["sub"] or ""))),
                ("emissions", None),
            ])
            # the same PN listed under two stroke combos (IC10025/IC10026: 289/302 and 351W) keeps both in applications
            merge_or_emit(rec, r["pn"])
    # supersedes links back onto the 2020 records
    for r in supp_rows:
        if r["kind"] == "SF":
            for old in detail_index.get(r["supersedes"], []):
                old["spec"]["supersededBy"] = r["pn"]

    # ---- Dualoy diesel application table
    for r in dualoy_rows:
        fam, cyl = dualoy_family(r["engine"])
        if fam not in KNOWN_FAM:
            unknown[fam] += 1
        base = re.sub(r"(-(?:_ ?)+K1|KT|K)$", "", r["kit"])
        rch = None
        m = re.search(r"-?\.?(\d{3})\"? RCH", r["engine"])
        if m:
            rch = float("0." + m.group(1))
        elif "Reduced Comp" in r["engine"]:
            rch = 0.010
        mm = [0.0 if s == "STD" else num(s.replace("MM", "")) for s in r["sizes"] if s != "TBD"]
        spec = OrderedDict([
            ("series", "Dualoy diesel"), ("kitPn", re.sub(r"(_ ?)+", "___", r["kit"])), ("oversizesMm", mm or None),
            ("availability", "TBD" if "TBD" in r["sizes"] else None), ("reducedCh", rch),
            ("replacesOem", r["oe"] or None), ("mahleRef", r["mahle"] or None), ("vin", r["vin"]),
            ("solidCrown", True if "Hammer" in r["engine"] else None),
        ])
        rec = OrderedDict([
            ("m", "Dualoy"), ("p", base), ("cat", "piston"),
            ("name", "cast diesel piston and ring kit, " + re.sub(r"\s+", " ", r["engine"])),
            ("fit", OrderedDict([("fam", fam), ("cyl", cyl), ("y0", r["y0"]), ("y1", r["y1"]), ("notes", r["engine"])])),
            ("spec", spec),
            ("src", src_for("supp2026", paths, r["page"], r["page"], r["group"])),
            ("emissions", None),
        ])
        key = (base, fam, r["y0"], rch)
        dup = [x for x in detail_index.get(base, []) if x["fit"]["fam"] == fam and x["fit"].get("y0") == r["y0"]]
        if dup:
            dup[0]["fit"]["notes"] += "; " + r["engine"]
            continue
        emit(rec, base)

    # ---- listing: attach applications / cross-check, or create listing-only records
    dia = defaultdict(list)
    for d in dia_rows:
        dia[(d["pn"], d["pg"])].append(d)
    listing_only, attached, skipped_sc = 0, 0, []
    seen_listing = set()
    for n in num_rows:
        pn = n["pn"]
        rod = num(n["rod"])
        crown, cc_cat, reliefs, dome_ht = listing_desc(n["desc"])
        ci_val = num(re.sub(r"[^\d.]", "", n["disp"])) if not n["disp"].upper().endswith("L") else None
        if n["disp"].upper().endswith("L") and num(n["disp"][:-1]):
            ci_val = liters_to_ci(num(n["disp"][:-1]))
        if ci_val is not None:
            ci_val = int(ci_val)
        dias = dia.get((pn, n["pg"])) or [d for k, d2 in dia.items() if k[0] == pn for d in d2]
        bore = num(dias[0]["bore"]) if dias else None
        ch_txt = dias[0]["ch"] if dias else None
        ch = num(ch_txt.split("/")[0]) if ch_txt else None
        app = OrderedDict([("ci", ci_val), ("disp", n["disp"]), ("rodLength", rod), ("desc", n["desc"]), ("ringPack", n["ringPack"]),
                           ("catalogPage", n["pg"])])
        matches = detail_index.get(pn) or []
        if not matches:
            # LS parts are listed as IC551 but printed IC551C / IC551CA in the catalog, and the listing's IC665C is
            # the catalog's IC665 (coated variant of the same piston)
            cands = [k for k in detail_index if re.match(rf"^{re.escape(pn)}(C|CA|LCA)$", k)]
            m_base = re.match(r"^(IC\d+)(C|CA)$", pn)
            if m_base and m_base.group(1) in detail_index:
                cands.append(m_base.group(1))
            for k in cands:
                matches += detail_index[k]
        if matches:
            attached += 1
            for rec in matches:
                if rec["m"] == "Dualoy":
                    continue
                rec["spec"].setdefault("listingPn", pn)
                sp = rec["spec"]
                apps = sp.setdefault("listingApplications", [])
                if app not in apps:
                    apps.append(app)
                if rod and sp.get("rodLength") and abs(rod - sp["rodLength"]) > 0.0005 and all(a.get("rodLength") != sp["rodLength"] for a in apps[:-1]):
                    pass  # a second rod length for the same PN is a different application, kept in listingApplications
                if bore and sp.get("bore") and abs(bore - sp["bore"]) > 0.0105 and (pn, "bore") not in seen_listing:
                    seen_listing.add((pn, "bore"))
                    qa.append(f"{pn}: diametrical listing bore {bore} vs catalog bore {sp['bore']} ({rec['fit']['fam']}); catalog kept")
                if ch and sp.get("ch") and abs(ch - sp["ch"]) > 0.0015 and (pn, "ch") not in seen_listing and not sp.get("applications"):
                    seen_listing.add((pn, "ch"))
                    qa.append(f"{pn}: diametrical listing CH {ch} vs catalog CH {sp['ch']}; catalog kept")
            continue
        if n["pg"] and 77 <= n["pg"] <= 85:
            skipped_sc.append(pn)
            continue
        fams, how = listing_family(n["mfg"], n["disp"], n["desc"], n["pg"], page_section)
        if how == "unknown":
            unknown[fams[0]] += 1
        for fam in fams:
            if fam not in KNOWN_FAM:
                unknown[fam] += 1
            key_exists = [x for x in detail_index.get(pn, []) if x["fit"]["fam"] == fam]
            if key_exists:
                key_exists[0]["spec"].setdefault("listingApplications", []).append(app)
                continue
            spec = OrderedDict([
                ("series", "ICON FHR" if (n["pg"] and n["pg"] >= 61) else "ICON Premium"), ("bore", bore), ("rodLength", rod), ("ch", ch),
                ("chOptions", [num(x) for x in ch_txt.split("/")] if ch_txt and "/" in ch_txt else None),
                ("domeCc", dome_cc_from_catalog(cc_cat)), ("crown", crown), ("domeHeight", dome_ht), ("valveReliefs", reliefs),
                ("ringPack", n["ringPack"]), ("listingPn", pn), ("listingApplications", [app]), ("detailMissing", True),
            ])
            rec = OrderedDict([
                ("m", "ICON"), ("p", pn), ("cat", "piston"),
                ("name", make_name(spec["series"], bore, crown, spec["domeCc"], rod)),
                ("fit", OrderedDict([("fam", fam), ("ci", [ci_val] if ci_val else None), ("cyl", FAM_CYL.get(fam, 8))])),
                ("spec", spec),
                ("src", src_for("listing", paths, n["pdfPage"], None, f"numerical listing; catalog page {n['pg']}")),
                ("emissions", None),
            ])
            emit(rec, pn)
            listing_only += 1
    return records, {"attached": attached, "listingOnly": listing_only, "skippedSportCompact": sorted(set(skipped_sc))}


# ----------------------------------------------------------------------------------------------
# validation
# ----------------------------------------------------------------------------------------------
NUMERIC_SPEC = ("bore", "stroke", "rodLength", "ch", "pin", "pinLength", "domeCc", "domeHeight", "weight", "pinWeight",
                "topLand", "deckHeight", "valveReliefDepthInt", "valveReliefDiaInt", "valveReliefDepthExh", "valveReliefDiaExh",
                "valveReliefs", "reducedCh")
NUMERIC_LIST_SPEC = ("boreOptions", "oversizes", "chOptions", "deckHeightOptions", "oversizesMm", "crValues")


def validate(records):
    errs, seen = [], set()
    for rec in records:
        for k in ("m", "p", "cat"):
            if not rec.get(k):
                errs.append(f"{rec.get('p')}: missing {k}")
        if not rec.get("fit", {}).get("fam"):
            errs.append(f"{rec.get('p')}: missing fit.fam")
        if not rec.get("src"):
            errs.append(f"{rec.get('p')}: missing src")
        key = (rec["m"], rec["p"], rec["fit"]["fam"], rec["fit"].get("y0"))
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
        for k in NUMERIC_SPEC:
            v = rec["spec"].get(k)
            if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float))):
                errs.append(f"{rec['p']}: spec.{k} is not a number: {v!r}")
        for k in NUMERIC_LIST_SPEC:
            v = rec["spec"].get(k)
            if v is not None and (not isinstance(v, list) or not all(isinstance(x, (int, float)) for x in v)):
                errs.append(f"{rec['p']}: spec.{k} is not a list of numbers: {v!r}")
        cr = rec["spec"].get("cr")
        if cr is not None and (not isinstance(cr, dict) or not all(isinstance(v, (int, float)) for v in cr.values())):
            errs.append(f"{rec['p']}: spec.cr malformed: {cr!r}")
    return errs


# ----------------------------------------------------------------------------------------------
# notes
# ----------------------------------------------------------------------------------------------
def write_notes(path, log, paths, detail_rows, supp_rows, dualoy_rows, num_rows, dia_rows, records, stats, qa, errs, unknown, kb_info):
    L = []
    L.append("# UEM (ICON / KB / Dualoy) — extraction notes\n")
    L.append(f"Extracted {TODAY} by `scripts/parts-catalog/extract_uem.py`.\n")
    L.append("## What was fetched\n")
    L.append("All requests to `www.uempistons.com`, one at a time, 6 s apart, UA `" + UA + "` "
             "(every network GET ever made by this script is appended to `dl/uem/fetch_log.jsonl`; this run's log follows):")
    for l in log:
        L.append(f"- {l}")
    fl = os.path.join(DL, "fetch_log.jsonl")
    if os.path.exists(fl):
        L.append("")
        L.append("Downloads on record (`dl/uem/fetch_log.jsonl`):")
        L.append("")
        L.append("| when (UTC) | url | status | bytes |\n|---|---|---|---|")
        for line in open(fl, encoding="utf-8"):
            try:
                e = json.loads(line)
            except ValueError:
                continue
            L.append(f"| {e.get('ts')} | {e.get('url')} | {e.get('status')} | {e.get('bytes')} |")
    L.append("")
    L.append("robots.txt (`*` group) disallows Drupal admin/user/search paths and `?sort=/?page=/?combine=` query URLs; it "
             "explicitly allows `/themes/` and `/sites/default/files/` where the catalog PDFs live. No Crawl-delay. "
             "No product pages were crawled: one HTML page (the catalogs index) and the PDFs it links. PDFs are kept in "
             "`dl/uem/` (gitignored); `--offline` re-parses them without the network.\n")
    L.append("| file | pages | sha256 |\n|---|---|---|")
    for key, (_, name) in PDFS.items():
        p = paths.get(key)
        if p and os.path.exists(p):
            L.append(f"| {name} | {kb_info.get(name, {}).get('pages', '?')} | {sha256(p)[:16]}… |")
    L.append("")
    L.append("## What was parsed\n")
    n_a = sum(1 for r in detail_rows if r["kind"] == "A")
    n_b = sum(1 for r in detail_rows if r["kind"] == "B")
    n_sp = sum(1 for r in supp_rows if r["kind"] == "SP")
    n_sf = sum(1 for r in supp_rows if r["kind"] == "SF")
    L.append("| source | what | rows |\n|---|---|---|")
    L.append(f"| Listing Section 12.20.20 (6 pp) | numerical listing rows (PN × application), pp 1–4 | {len(num_rows)} |")
    L.append(f"| Listing Section 12.20.20 | diametrical listing rows (bore, CH, PN, page), pp 5–6 | {len(dia_rows)} |")
    L.append(f"| Icon_catalog.pdf (62 pp) + ICON FHR (18 pp) | per-application table rows (`PART # / KTD ROD C/H PIN DISH/DOME C/R …`) | {n_a} |")
    L.append(f"| Icon_catalog.pdf + ICON FHR | LS-style rows (one SKU per bore size, `IC551C.STD IC551CKTS.STD …`) | {n_b} |")
    L.append(f"| 2026 supplement pp 4–6, 13 | ICON Premium / KB rows (one SKU per bore size) | {n_sp} |")
    L.append(f"| 2026 supplement pp 7–9 | ICON FHR rows (oversize list per PN) | {n_sf} |")
    L.append(f"| 2026 supplement pp 18–19 | Dualoy diesel application rows | {len(dualoy_rows)} |")
    L.append("")
    L.append(f"Records: **{len(records)}** (one per part number per fitment family). Listing part numbers matched to a detail "
             f"row: {stats['attached']}; listing-only records (no detail row found): {stats['listingOnly']}.\n")
    L.append("### How the sources combine\n")
    L.append("- The ICON Premium / FHR catalogs are the primary source: every table line becomes one record per family "
             "(`spec` = catalog columns). Each application block's header supplies bore, stroke, OE deck height, alloy, lock "
             "ring, oversizes, ring pack and ring-set PN; `spec.boreOptions` = standard bore + each listed oversize.")
    L.append("- LS pages (Icon pp 8–10, FHR pp 5–6) and the 2026 supplement list one SKU per bore size (`IC551C.STD`, "
             "`IC551C.030`, …). These collapse to one record per base PN; `spec.sizes[]` keeps every SKU with its bore, "
             "displacement, CR and ring-set PN, and `spec.bore` / `spec.cr` are the STD-bore row's.")
    L.append("- The numerical listing is an index of the same catalog: its rows are attached to the matching record as "
             "`spec.listingApplications[]` (displacement, rod length, description, ring pack, catalog page), with the listing "
             "PN in `spec.listingPn` (the listing prints `IC551` for the catalog's `IC551C`). A PN that only appears in the "
             "listing becomes a record with `spec.detailMissing: true`, bore and CH from the diametrical listing and the family "
             "from the catalog page the listing points to.")
    L.append("- Bore/CH from the diametrical listing are cross-checked against the detail row; differences are listed under QA.")
    L.append("- 2026 supplement FHR rows name the 2020 PN they supersede: `spec.supersedes` on the new record and "
             "`spec.supersededBy` on the old one.")
    L.append("")
    L.append("### Column mapping\n")
    L.append("- `spec.ch` = catalog `C/H` (compression height); `spec.pin` / `pinLength` = `PIN` (`.927 x 2.750\"`); "
             "`spec.weight` / `pinWeight` = `GRAM WEIGHT` piston/pin; `spec.topLand` = `TOP LAND`; "
             "`spec.valveReliefDepthInt/DiaInt/DepthExh/DiaExh` = `VALVE-RLF DEPTH-DIA. INT • EXH` (zeros dropped).")
    L.append("- **Sign convention:** UEM prints domes negative and dishes positive (`DOME -89.1cc`, `DISH 20cc`). The shared "
             "format wants `domeCc` positive for a dome and negative for a dish, so every 2020-catalog value is negated. "
             "The 2026 supplement's ICON Premium pages print the magnitude with a head-type column (`0.8 Dome`, `12.0 Dish`), "
             "so there dome = +cc and dish/flat = −cc; its FHR and KB pages keep the 2020 convention (`-6.1 Dome`) and are negated. "
             "`spec.crown` is the normalised head type (`flat top`, `dish`, `step-dish`, `d-cup`, `solid dome`, `hollow dome`, "
             "`open-chamber dome`, `dome`); `spec.domeHeight` is the dome height when printed (`.250\" H/Dome`); "
             "`spec.valveReliefs` = the `2V`/`4V` count.")
    L.append("- `spec.cr` is keyed by the chamber cc printed in the column header (`58cc 64cc 76cc` → `{\"58\": 12.1, \"64\": 11.0, "
             "\"76\": 9.4}`). The catalog computes CR at zero deck with a .040\" gasket unless the NOTES say otherwise. Rows that "
             "print fewer CR values than the header has chambers keep the values positionally in `spec.crValues` and are flagged.")
    L.append("- `spec.series`: `ICON Premium` (2618/4032 fully machined), `ICON Elite` (2618, LS and BBC drag pages), "
             "`ICON FHR` (4032 formed head relief), `KB Hypereutectic`, `Dualoy diesel`. `spec.kitSuffix` (`KTD`/`KTS`/`KTM`) "
             "is what the catalog appends to the PN for the piston-and-ring kit.")
    L.append("- Supplement rows sold only as a piston-and-ring kit (`N/A` / `Sold as kit only` in the piston-set column) carry "
             "`spec.kitOnly: true`; `spec.sizes[].sku` / `.kit` are the orderable numbers per bore size. A supplement size "
             "added to a 2020 PN (e.g. `IC9990C.007`) is merged into that record's `sizes` with `src.also` naming the supplement page.")
    L.append("- `spec.pinOffset` comes from the NOTES text (`Centered Pin.` / `Offset Pin.`); `fit.notes` carries the rest of "
             "the block's NOTES (head compatibility, block, rod requirements). The catalog prints notes in a second column "
             "interleaved with the RING PACK / RINGSET lines, so a few notes are joined out of order; treat them as hints.")
    L.append("- Dualoy rows carry only what the table gives: kit PN pattern (`DU10096-___K1`, `7208DKT`), oversizes in mm, "
             "reduced compression height, replaced OE piston PNs and MAHLE cross-reference numbers; `p` is the kit PN without "
             "its kit/oversize suffix.")
    L.append("- `emissions` is `null` throughout (internal engine parts).")
    L.append("")
    L.append("### Family mapping\n")
    L.append("- Catalog sections → families: `CHEVROLET SBC` → Small-block Chevy; `CHEVROLET BBC` → both `Chevy Mark IV big "
             "block` and `Chevy Gen VI big block` (same pistons, as in the MAHLE extract); `CHEVROLET W-HEAD` → Chevy W-series "
             "348/409; `CHEVROLET LS ENGINE` / `GM LS` → GM LS; `CHRYSLER SB` → Mopar LA small block (not duplicated into Magnum); "
             "`CHRYSLER BB` → Mopar B/RB big block; `CHRYSLER 5.7L / 6.1L HEMI` → Chrysler Gen III Hemi 5.7/6.1; supplement "
             "`Hemi Gen III 6.4L` → Chrysler Gen III Hemi 6.2/6.4; `CHRYSLER BB HEMI` (472/528) → Chrysler 426 Hemi; "
             "`FORD MODULAR` (4.6L / 4.9L stroker / 5.4L) → Ford Modular; `FORD WINDSOR` → Small-block Ford (Windsor); "
             "`FORD CLEVELAND` → Ford 351C/351M/400; `FORD FE` → Ford FE; `FORD 460` → Ford 429/460; `OLDSMOBILE` → Oldsmobile V8; "
             "`PONTIAC` → Pontiac V8; `AMC / JEEP 4.6L INLINE 6` → AMC/Jeep inline-6.")
    L.append("- Listing-only rows use the family of the catalog page they point to; when the page is unmapped, MFG + "
             "displacement heuristics (CHEVY ≥ 396 ci → big block, FORD 390–428 → FE, ≥ 429 → 429/460, `C` suffix → Cleveland).")
    L.append("- Dualoy: `6.6L Duramax` (LB7 … L5P) → Duramax 6.6; `5.9L 12V` → Cummins 5.9 12V; `5.9L 24V` → Cummins 5.9 "
             "24V/CR; `6.7L 24V ISB` → Cummins 6.7; Power Stroke 7.3 / 6.0 / 6.4 / 6.7 by displacement.")
    if unknown:
        L.append("- **Families not in the fitment list** (`fit.fam` = catalog heading; needs a decision): " +
                 "; ".join(f"`{k}` ({v})" for k, v in sorted(unknown.items())) + ".")
    L.append("")
    # per-family counts
    L.append("## Records per brand and family\n")
    L.append("| brand | family | records |\n|---|---|---|")
    cnt = Counter((r["m"], r["fit"]["fam"]) for r in records)
    for (m, fam), c in sorted(cnt.items(), key=lambda x: (x[0][0], -x[1])):
        L.append(f"| {m} | {fam} | {c} |")
    L.append(f"| **total** | | {len(records)} |")
    L.append("")
    L.append("## Rows per catalog section\n")
    L.append("| pdf | page | section / application | rows |\n|---|---|---|---|")
    sec = Counter((r["pdf"], r["page"], r["app"]) for r in detail_rows)
    for (pdf, pg, app), c in sorted(sec.items(), key=lambda x: (x[0][0], x[0][1])):
        L.append(f"| {pdf} | {pg} | {app} | {c} |")
    L.append("")
    L.append("## Not extracted / skipped\n")
    L.append("- Before this script existed, the same robots.txt, catalogs page and PDFs (plus `Claimer 12.20.20.pdf`, which is "
             "the same 50-page KB/Claimer catalog) were fetched once by hand with curl on 2026-10-16, 6 s apart, same UA; "
             "the script's own downloads above returned byte-identical files. The one 404 in the log was a wrong relative-URL "
             "join on the first scripted run, fixed and not retried.")
    L.append("- **KB 12.20.20 (1).pdf (50 pp) and the Claimer PDF beside it are scanned images**: only the cover, contents and "
             "tech-tip pages have a text layer; the Claimer (pp 6–8) and Hypereutectic (pp 10–47) application pages and the KB "
             "numerical listing (pp 48–49) have none. There is no OCR engine in this environment (no tesseract, no "
             "PyMuPDF/OCR packages install without network), so the 2020 KB range is not extracted. KB rows come only from "
             "the 2026 supplement (p 13): AMC 4.6L stroker, Ford 351M/400 and a Holden 383 kit. Follow-up: OCR the KB PDF "
             "locally (or ask UEM for a text PDF) — expect several hundred KB part numbers.")
    L.append("- The 2025 supplement (rev G) was downloaded for a diff: it lists `KB438C` / `KB442C` (AMC 4.6L, KTM kits) that the "
             "2026 supplement no longer shows; everything else in 2025 is in 2026. Only 2026 is parsed.")
    L.append(f"- ICON Sport Compact pages (catalog pp 77–85; Chrysler 2.4, Ford 2300, Honda, Mitsubishi, Nissan, Subaru, Toyota) "
             f"are a separate PDF that was not downloaded; their listing rows are skipped: "
             f"{', '.join(stats['skippedSportCompact'])}. The 2026 supplement sport-compact pages (10–12: BMW B48/B58, Ford Barra, "
             f"Honda K24, Mitsubishi, Subaru) are skipped for the same reason (no import families in the fitment list).")
    L.append("- 2026 supplement pp 14–17 (Silvolite OEM-replacement cast pistons by year range), pp 20–21 (Speed of Air kits), "
             "pp 22–34 (ring sets by bore) and p 35 (Dualoy overhaul kits) are not extracted; rings would be a `ring` follow-up.")
    L.append("- Icon_catalog.pdf p 4 (piston-and-ring-kit PN table) and p 62 (notes) carry no piston specs.")
    L.append("- Marketing text (features, alloy descriptions) is not stored.")
    L.append("")
    L.append("## Needs human QA\n")
    if qa:
        for q in qa:
            L.append(f"- {q}")
    else:
        L.append("- nothing flagged")
    L.append("")
    L.append("## Validation\n")
    L.append("Checks: every record has `m p cat fit.fam src`; no duplicate `p` within a brand and family (Dualoy: per family "
             "and year range); numeric spec fields are numbers (inches as decimals, cc as numbers); no empty strings.\n")
    if errs:
        L.append(f"- **{len(errs)} errors**")
        for e in errs[:50]:
            L.append(f"  - {e}")
    else:
        L.append("- passed")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--offline", action="store_true", help="do not touch the network; parse dl/uem/ as is")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    log, qa = [], []
    unknown = Counter()
    paths = discover_and_fetch(log, args.offline)
    for key in ("listing", "icon", "fhr", "supp2026"):
        if not paths.get(key):
            raise SystemExit(f"missing {key} PDF in {DL}; run without --offline")
    import pdfplumber

    kb_info = {}
    for key, (_, name) in PDFS.items():
        p = paths.get(key)
        if p and os.path.exists(p):
            with pdfplumber.open(p) as pdf:
                kb_info[name] = {"pages": len(pdf.pages)}
                if key == "kb":
                    text_pages = sum(1 for pg in pdf.pages if len(pg.extract_text() or "") > 150)
                    log.append(f"KB catalog: {len(pdf.pages)} pages, only {text_pages} with a text layer (scanned images)")

    num_rows, dia_rows = parse_listing(paths["listing"])
    icon_rows, page_section = parse_detail(paths["icon"], "ICON Premium", ICON_PRINTED_OFFSET, False, qa)
    fhr_rows, fhr_pages = parse_detail(paths["fhr"], "ICON FHR", FHR_PRINTED_OFFSET, True, qa)
    page_section.update(fhr_pages)
    supp_rows, dualoy_rows = parse_supplement(paths["supp2026"], qa)
    detail_rows = icon_rows + fhr_rows
    records, stats = build_records(detail_rows, supp_rows, dualoy_rows, num_rows, dia_rows, page_section, paths, qa, unknown)
    records = [clean(r) for r in records]
    for r in records:
        r.setdefault("emissions", None)
    errs = validate(records)
    out = OrderedDict([
        ("source", OrderedDict([
            ("task", "UEM"),
            ("brands", OrderedDict([
                ("ICON", {"doc": DOCS["icon"][0], "url": src_for("icon", paths)["url"], "edition": "2020-12",
                          "also": [src_for("fhr", paths)["url"], src_for("listing", paths)["url"], src_for("supp2026", paths)["url"]]}),
                ("KB", {"doc": DOCS["supp2026"][0], "url": src_for("supp2026", paths)["url"], "edition": "2026",
                        "note": "2020 KB catalog PDF is image-only; not extracted"}),
                ("Dualoy", {"doc": DOCS["supp2026"][0], "url": src_for("supp2026", paths)["url"], "edition": "2026"}),
            ])),
            ("catalogIndex", CATALOG_PAGE), ("fetched", TODAY),
        ])),
        ("extracted", TODAY), ("count", len(records)), ("parts", records),
    ])
    with open(os.path.join(OUT, "uem.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    write_notes(os.path.join(OUT, "uem.md"), log, paths, detail_rows, supp_rows, dualoy_rows, num_rows, dia_rows, records,
                stats, qa, errs, unknown, kb_info)
    print(f"rows: listing {len(num_rows)}+{len(dia_rows)}, detail {len(detail_rows)}, supplement {len(supp_rows)}, dualoy {len(dualoy_rows)}")
    print(f"records: {len(records)}; qa: {len(qa)}; validation errors: {len(errs)}; unknown fams: {dict(unknown)}")
    for e in errs[:20]:
        print("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
