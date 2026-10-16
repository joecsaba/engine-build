#!/usr/bin/env python3
"""Parts catalog: LIFTERS task (Morel via johncalliesinc.com + Johnson Lifters).

Re-runnable and resumable. Every fetched page is cached under dl/lifters/ and is only
re-fetched with --refresh. Writes out/lifters.json and nothing else outside dl/ and out/.

    python -I scripts/parts-catalog/extract_lifters.py [--refresh] [--no-detail]

Ground rules honoured: one request at a time per host, >= 6 s apart; robots.txt fetched and
checked for Disallow / Crawl-delay before any page; a 403 / 409-cookie-challenge / Cloudflare /
Incapsula response is recorded and that source is stopped, never retried or bypassed.
"""
import argparse
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent
DL = HERE / "dl" / "lifters"
OUT = HERE / "out"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_GAP = 6.0

MOREL_URL = "https://www.johncalliesinc.com/morel_products.php"
JOHNSON_PAGES = {
    "hydraulic_roller": "https://www.johnsonlifters.com/Products/Hydraulic-Roller-Lifters",
    "solid_roller": "https://www.johnsonlifters.com/Products/Solid-Roller-Lifters",
}
JOHNSON_HOSTS = {"www.johnsonlifters.com", "johnsonlifters.com"}

# --------------------------------------------------------------------------- fetching

class Blocked(Exception):
    pass


class Fetcher:
    def __init__(self, refresh=False):
        self.refresh = refresh
        self.last = {}          # host -> time of last request
        self.requests = 0
        self.cached = 0
        self.log = []
        self.robots = {}        # host -> (disallow list, crawl delay)
        self.blocked_hosts = set()
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA

    def _wait(self, host):
        gap = max(MIN_GAP, self.robots.get(host, ([], 0))[1])
        t = self.last.get(host)
        if t is not None:
            time.sleep(max(0.0, gap - (time.time() - t)))

    def _raw_get(self, url):
        host = urlsplit(url).netloc
        if host in self.blocked_hosts:
            raise Blocked(f"{host} previously blocked")
        self._wait(host)
        r = self.s.get(url, timeout=60, allow_redirects=False)
        self.last[host] = time.time()
        self.requests += 1
        self.log.append(f"GET {url} -> {r.status_code}")
        return r

    def robots_ok(self, url):
        host = urlsplit(url).netloc
        if host not in self.robots:
            cache = DL / f"robots_{host}.txt"
            if cache.exists() and not self.refresh:
                txt = cache.read_text(encoding="utf-8", errors="replace")
                self.cached += 1
            else:
                r = self._raw_get(f"https://{host}/robots.txt")
                txt = r.text if r.status_code == 200 else ""
                cache.write_text(txt, encoding="utf-8")
            dis, delay, mine = [], 0.0, False
            for line in txt.splitlines():
                line = line.split("#", 1)[0].strip()
                if not line or ":" not in line:
                    continue
                k, v = (x.strip() for x in line.split(":", 1))
                k = k.lower()
                if k == "user-agent":
                    mine = v == "*" or v.lower() in UA.lower()
                elif mine and k == "disallow" and v:
                    dis.append(v)
                elif mine and k == "crawl-delay":
                    try:
                        delay = float(v)
                    except ValueError:
                        pass
            self.robots[host] = (dis, delay)
        path = urlsplit(url).path or "/"
        return not any(path.startswith(d) for d in self.robots[host][0])

    def get(self, url, cache_name, hosts_ok):
        """Return page text (cached), following same-site redirects. Raises Blocked."""
        cache = DL / cache_name
        if cache.exists() and not self.refresh:
            self.cached += 1
            return cache.read_text(encoding="utf-8", errors="replace")
        for _hop in range(5):
            host = urlsplit(url).netloc
            if host not in hosts_ok:
                raise Blocked(f"redirect left site: {url}")
            if not self.robots_ok(url):
                raise Blocked(f"robots.txt disallows {url}")
            r = self._raw_get(url)
            if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                url = urljoin(url, r.headers["location"])
                continue
            body = r.text
            low = body[:4000].lower()
            if (r.status_code in (401, 403, 409, 429, 503)
                    or "just a moment" in low or "incapsula" in low or "_incapsula_resource" in low
                    or ("document.cookie" in low and "document.location.reload" in low)):
                self.blocked_hosts.add(host)
                raise Blocked(f"{url} -> HTTP {r.status_code} (bot gate / challenge); not retried")
            if r.status_code != 200:
                raise Blocked(f"{url} -> HTTP {r.status_code}")
            cache.write_text(body, encoding="utf-8")
            return body
        raise Blocked(f"too many redirects from {url}")


# --------------------------------------------------------------------------- helpers

def num(s):
    s = s.strip().replace('"', "")
    if not re.fullmatch(r"[+-]?\d*\.?\d+", s):
        return None
    return float(s)


def clean(s):
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()


def ci_list(s):
    """'348-409' / '401-425-455' / '352-390-410-428' -> [348, 409] ..."""
    return [int(x) for x in re.findall(r"\b(\d{3})\b", s)]


# --------------------------------------------------------------------------- Morel

MOREL_FAMILY_RULES = [
    # (regex on UPPER description, [families], ci or None)
    (r"^SBC/BUICK\b", ["Small-block Chevy"], None),
    (r"^SBC\b.*\bSTK REP\b", ["Small-block Chevy", "GM LS", "GM LT (Gen V)"], None),
    (r"^SBC\b", ["Small-block Chevy"], None),
    (r"^LS\s*&\s*GEN V-?LT\b", ["GM LS", "GM LT (Gen V)"], None),
    (r"^LS\b", ["GM LS"], None),
    (r"^AFM/DOD\b.*\bLS/GEN V-?LT\b", ["GM LS", "GM LT (Gen V)"], None),
    (r"^AFM/DOD\b.*\bGEN V-?LT\b", ["GM LT (Gen V)"], None),
    (r"^BBC\b", ["Chevy Mark IV big block", "Chevy Gen VI big block"], None),
    (r"^AMC\b", ["AMC V8"], [304, 360, 390, 401]),
    (r"^CAD\b", ["Cadillac 368-500"], [425, 472, 500]),
    (r"^BUICK\b.*\bV6 TURBO\b", ["Buick V6 181-252"], None),
    (r"^BUICK\b.*\b350 CU", ["Buick 350"], [350]),
    (r"^BUICK\b.*\b401-425-455\b", ["Buick big block"], [401, 425, 455]),
    (r"^BUICK\b", ["Buick big block"], None),
    (r"^OLDS\b", ["Oldsmobile V8"], [400, 403, 425, 455]),
    (r"^HOLDEN\b", ["Holden V8"], None),
    (r"^CHEVY 348-409\b", ["Chevy W-series 348/409"], [348, 409]),
    (r"^PONT 4 CYL\b", ["Pontiac 4-cyl Super Duty"], None),
    (r"^PONT\b", ["Pontiac V8"], [400, 421, 428, 455]),
    (r"^RO-?7\b", ["Chevrolet R07 (NASCAR)"], None),
    (r"^MOPAR SB\b.*\bMAGNUM\b", ["Mopar LA small block", "Mopar Magnum 5.2/5.9"], None),
    (r"^MOPAR SB\b", ["Mopar LA small block"], None),
    (r"^MOPAR A\b", ["Mopar LA small block"], None),
    (r"^MOPAR B\b", ["Mopar B/RB big block"], None),
    (r"^CHRY\b.*\b426 HEMI\b", ["Chrysler 426 Hemi"], [426]),
    (r"^CHRY\b", None, None),                         # falls back to the catalog heading
    (r"^VIPER V10\b", ["Dodge Viper V10"], None),
    (r"^FORD WIND\s*(&|/)\s*CLEV\b", ["Small-block Ford (Windsor)", "Ford 351C/351M/400"], None),
    (r"^FORD WIND\b", ["Small-block Ford (Windsor)"], None),
    (r"^FORD CLEV\b", ["Ford 351C/351M/400"], None),
    (r"^FORD BB 429-460\s*&\s*FE\b", ["Ford 429/460", "Ford FE"], None),
    (r"^FORD BB\s*&\s*FE\b", ["Ford 429/460", "Ford FE"], None),
    (r"^FORD BB \(FE\)", ["Ford FE"], [352, 390, 410, 428]),
    (r"^FORD BB 429-460\b", ["Ford 429/460"], [429, 460]),
]
KNOWN_FAMILIES = {
    "Small-block Chevy", "Chevy Mark IV big block", "Chevy Gen VI big block", "Chevy W-series 348/409",
    "GM LS", "GM LT (Gen V)", "Small-block Ford (Windsor)", "Ford 351C/351M/400", "Ford FE",
    "Ford 429/460", "Ford Modular", "Ford Coyote", "Ford Godzilla 7.3", "Mopar LA small block",
    "Mopar Magnum 5.2/5.9", "Mopar B/RB big block", "Chrysler 426 Hemi", "Chrysler Gen III Hemi 5.7/6.1",
    "Chrysler Gen III Hemi 6.2/6.4", "Pontiac V8", "Oldsmobile V8", "Buick big block", "Buick 350",
    "Buick V6 181-252", "Cadillac 368-500", "AMC V8", "AMC/Jeep inline-6", "Chevy inline-6",
    "Ford 240/300 inline-6", "Mopar Slant Six", "Cummins 5.9 12V", "Cummins 5.9 24V/CR", "Cummins 6.7",
    "Duramax 6.6", "Powerstroke 7.3", "Powerstroke 6.0", "Powerstroke 6.4", "Powerstroke 6.7",
}


def morel_families(heading, desc):
    d = desc.upper()
    d = re.sub(r"^DISCONTINUED \d{2}/\d{2}/\d{4}\s*", "", d)
    for rx, fams, ci in MOREL_FAMILY_RULES:
        if re.search(rx, d):
            if fams is None:
                break
            return fams, ci
    return [heading.strip()], None


def morel_style(heading, desc):
    h, d = heading.upper(), desc.upper()
    if re.search(r"\bHYD(RAULIC)?\b", d):
        return "hydraulic_roller"
    if re.search(r"\bMECH(ANICAL)?\b", d):
        return "solid_roller"
    if "HYDRAULIC" in h or re.search(r"\bHYD\b", h):
        if not re.search(r"\bMECH\b", h):
            return "hydraulic_roller"
    if "MECHANICAL" in h or re.search(r"\bMECH\b", h):
        if "HYD" not in h:
            return "solid_roller"
    # headings like "AMC V-8 ... HYD & MECH" with no cue in the row: Morel's U/P, P/O, BLACK MAMBA,
    # PRO SPORTSMAN, KEYED and NASCAR lines are all mechanical roller designs
    if re.search(r"\b(U/P|BLACK MAMBA|PRO SPORTSMAN|KEYED|KEYWAY|NASCAR|TOP ALCOHOL|TOP FUEL|PRO MOD)", d):
        return "solid_roller"
    return None


def morel_spec(heading, desc, body, roll, pair):
    d = desc.upper()
    spec = {}
    style = morel_style(heading, desc)
    if style:
        spec["style"] = style
    if body is not None:
        spec["bodyDia"] = body
    if roll is not None:
        spec["rollerDia"] = roll
    if "T/B" in d:
        spec["linkBar"] = True
    elif re.search(r"\bKEYED|KEYWAY\b", d):
        spec["linkBar"] = False
        spec["keyed"] = True
    m = re.search(r"\+\s*\.(\d{3})\s*T/B", d)
    if m:
        spec["tieBarRaise"] = float("0." + m.group(1))
    if "HORIZ T/B" in d:
        spec["tieBar"] = "horizontal"
    m = re.search(r"\.(\d{3})\s*(L&R|LEFT|RIGHT|L OR R|INT & EX|INT&EX)", d)
    if m:
        spec["offset"] = float("0." + m.group(1))
        side = m.group(2)
        spec["offsetSide"] = {"LEFT": "left", "RIGHT": "right", "L&R": "left+right",
                              "L OR R": "left or right", "INT & EX": "int+exh", "INT&EX": "int+exh"}[side]
        if "INT" in d[m.start():m.end() + 12] and "EX" not in d[m.start():m.end() + 12]:
            spec["offsetValve"] = "intake"
        elif "INT" in d[m.start():m.end() + 12]:
            spec["offsetValve"] = "intake+exhaust"
    elif "O/C" in d:
        spec["offset"] = 0.0
    if "W/DLC" in d or "W/ DLC" in d or "DLC COATED" in d:
        spec["dlc"] = True
    elif "W/O DLC" in d:
        spec["dlc"] = False
    if "LIMITED TRAVEL" in d:
        spec["travelType"] = "limited"
    if "W/PUSHROD OIL" in d:
        spec["pushrodOil"] = True
    elif "NO PUSHROD OIL" in d:
        spec["pushrodOil"] = False
    if "BEARING UFRS" in d or "BUSHING UFRS" in d:
        spec["bushed"] = True
    for series in ("BLACK MAMBA LITE", "BLACK MAMBA", "PRO SPORTSMAN", "STREET PERF"):
        if series in d:
            spec["series"] = series.title()
            break
    m = re.search(r"\((\d\.\d{2,3}) BORE SPACE\)", d)
    if m:
        spec["boreSpacing"] = float(m.group(1))
    if pair:
        spec["pairPn"] = pair
    if "DISCONTINUED" in d or "DISCONTINUED" in heading.upper():
        spec["discontinued"] = True
    spec["catalogDesc"] = clean(desc)
    return spec


def morel_fit_notes(desc):
    d = desc.upper()
    notes = []
    m = re.search(r"STK REP (\d{2})-(\d{2}) ([\d., &A-Z]+?)(?:,|$| HYD)", d)
    if m:
        notes.append("stock replacement 1987-1993 5.0/5.7/4.3 and LS/LT")
    if "AFM/DOD" in d:
        notes.append("AFM/DOD replacement")
    if re.search(r"FITS? 5 & MOST 6\s*HBP", d):
        notes.append("fits 5-bolt and most 6-bolt head bolt pattern heads")
    if "REQ LIFTER BUSHING" in d or "REQUIRES KEYED BUSHING" in d or "USE CHE PRODUCTS BUSHING" in d:
        notes.append("requires lifter bore bushings")
    if "SB2 HEADS" in d:
        notes.append("not for SB2 heads on standard block (see offset set)")
    if "302" in d and "HEAD" in d and "REMOV" in d:
        notes.append("302: heads must be removed to install")
    if "MAGNUM" in d:
        notes.append("fits Magnum and early LA blocks")
    if "R-1 / 48 DEGREE" in d or "R-1/48" in d:
        notes.append("R-1 / 48-degree block")
    if "DART" in d:
        notes.append("10-degree Dart head")
    if "STOCK LIFTER BOX" in d or "LIFTER BOX" in d:
        notes.append("fits stock lifter guide tray")
    if "SBC/BUICK" in d:
        notes.append("also listed for Buick")
    if "RACE ONLY" in d:
        notes.append("race only")
    if "DO NOT USE OIL HEAVIER THAN 5W40" in d:
        notes.append("oil no heavier than 5W-40")
    if "SMALL BASE CIRCLE" in d:
        notes.append("works with small base circle cams")
    if "DISCONTINUED" in d:
        m = re.search(r"DISCONTINUED (\d{2}[-/]\d{2}[-/]\d{4})", d)
        notes.append("discontinued " + m.group(1) if m else "discontinued")
    return "; ".join(notes) if notes else None


def morel_name(spec, style):
    parts = []
    parts.append({"hydraulic_roller": "Hydraulic roller lifter set", "solid_roller": "Solid roller lifter set"}
                 .get(style, "Roller lifter set"))
    if "bodyDia" in spec:
        parts.append(f"{spec['bodyDia']:.3f} body")
    if "rollerDia" in spec:
        parts.append(f"{spec['rollerDia']:.3f} roller")
    if spec.get("linkBar"):
        parts.append("tie bar" + (f" +{spec['tieBarRaise']:.3f}" if "tieBarRaise" in spec else ""))
    elif spec.get("keyed"):
        parts.append("keyed")
    if spec.get("offset"):
        parts.append(f"{spec['offset']:.3f} {spec.get('offsetSide', '')} offset".replace("  ", " "))
    elif spec.get("offset") == 0.0:
        parts.append("on-center")
    if spec.get("series"):
        parts.append(spec["series"])
    if spec.get("travelType") == "limited":
        parts.append("limited travel")
    return ", ".join(parts)


def extract_morel(f, notes):
    recs, skipped = [], []
    try:
        html = f.get(MOREL_URL, "morel_products_php.html", {"www.johncalliesinc.com", "johncalliesinc.com"})
    except Blocked as e:
        notes["morel"] = {"error": str(e)}
        return recs, skipped
    soup = BeautifulSoup(html, "html.parser")
    sections = soup.find_all("div", class_="CatalogSection")
    tables = 0
    per_heading = {}
    seen = set()
    for sec in sections:
        hd = sec.find("div", class_="CatalogSectionHeader")
        heading = clean(hd.get_text(" ")) if hd else "?"      # get_text() skips the HTML comments
        table = sec.find("table")
        if table is None:
            continue
        tables += 1
        rows = table.find_all("tr")
        header = [clean(c.get_text(" ")) for c in rows[0].find_all(["td", "th"])]
        if header[:4] != ["Set#", "Pair#", "BodyD", "RollD"]:
            skipped.append(f"Morel table under '{heading}': unexpected header {header}")
            continue
        n = 0
        for tr in rows[1:]:
            cells = [clean(c.get_text(" ")) for c in tr.find_all(["td", "th"])]
            if len(cells) < 5 or not cells[0]:
                skipped.append(f"Morel '{heading}': short row {cells}")
                continue
            setno, pair, body, roll, desc = cells[0], cells[1], num(cells[2]), num(cells[3]), cells[4]
            avail = cells[5] if len(cells) > 5 else ""
            a = tr.find("a", href=True)
            url = urljoin(MOREL_URL, a["href"]) if a else MOREL_URL
            if not re.fullmatch(r"\d{4}[A-Z]?", setno):
                skipped.append(f"Morel '{heading}': odd set number {setno!r}")
                continue
            fams, ci = morel_families(heading, desc)
            style = morel_style(heading, desc)
            spec = morel_spec(heading, desc, body, roll, pair)
            if avail.upper().replace("\\", "/") == "N/A":
                spec["discontinued"] = True
            fitnotes = morel_fit_notes(desc)
            for fam in fams:
                key = (setno, fam)
                if key in seen:
                    skipped.append(f"Morel {setno} repeated for {fam} (listed under two headings) - kept first")
                    continue
                seen.add(key)
                fit = {"fam": fam}
                if ci:
                    fit["ci"] = ci
                if fam in ("Buick V6 181-252",):
                    fit["cyl"] = 6
                elif fam == "Dodge Viper V10":
                    fit["cyl"] = 10
                elif fam == "Pontiac 4-cyl Super Duty":
                    fit["cyl"] = 4
                elif fam in KNOWN_FAMILIES and "inline-6" not in fam and "Slant" not in fam:
                    fit["cyl"] = 8
                nn = fitnotes
                if "STK REP" in desc.upper() and fam == "Small-block Chevy":
                    fit["y0"], fit["y1"] = 1987, 1993
                if nn:
                    fit["notes"] = nn
                if fam not in KNOWN_FAMILIES:
                    notes.setdefault("unknown_families", {}).setdefault(fam, []).append(setno)
                recs.append({
                    "m": "Morel",
                    "p": setno,
                    "cat": "lifter",
                    "name": morel_name(spec, style),
                    "fit": fit,
                    "spec": spec,
                    "src": {"doc": "johncalliesinc.com Morel Products catalog page", "edition": "2026-10",
                            "url": url},
                    "emissions": None,
                })
                n += 1
        per_heading[heading] = n
    notes["morel"] = {"tables": tables, "sections": len(sections), "rows_by_heading": per_heading}
    return recs, skipped


# --------------------------------------------------------------------------- Johnson

JOHNSON_FAMILY = {
    # section heading -> (families, fit extras, qa flag)
    "GM Drop-in Roller": (None, {}, None),      # decided per row below
    "GM Small Block": (["Small-block Chevy"], {"cyl": 8}, None),
    "GM Big Block": (["Chevy Mark IV big block", "Chevy Gen VI big block"], {"cyl": 8}, None),
    "LS": (["GM LS"], {"cyl": 8}, None),
    "LS 6-Bolt Head": (["GM LS"], {"cyl": 8, "notes": "for 6-bolt-per-cylinder head blocks"}, None),
    "Buick V6": (["Buick V6 181-252"], {"cyl": 6}, None),
    "Olds/Pontiac": (["Oldsmobile V8", "Pontiac V8"], {"cyl": 8}, None),
    "GM 409": (["Chevy W-series 348/409"], {"cyl": 8, "ci": [348, 409]}, None),
    "GM Nail Head": (["Buick Nailhead"], {"cyl": 8}, "unknown family"),
    "Cadillac 500": (["Cadillac 368-500"], {"cyl": 8, "ci": [500]}, None),
    "Ford Small Block": (["Small-block Ford (Windsor)"], {"cyl": 8}, None),
    "Ford Big Block": (["Ford 429/460"], {"cyl": 8}, None),
    "Chrysler Small Block": (["Mopar LA small block"], {"cyl": 8}, None),
    "Chrysler Big Block": (["Mopar B/RB big block"], {"cyl": 8}, None),
    "Chrysler Gen.III Hemi": (["Chrysler Gen III Hemi 5.7/6.1", "Chrysler Gen III Hemi 6.2/6.4"], {"cyl": 8}, None),
    "Gen. 1-3 Viper": (["Dodge Viper V10 Gen 1-3"], {"cyl": 10}, "unknown family"),
    "Gen. IV Viper": (["Dodge Viper V10 Gen IV"], {"cyl": 10}, "unknown family"),
    "Dodge Hemi (315 & 325)": (["Dodge early Hemi 315/325"], {"cyl": 8, "ci": [315, 325]}, "unknown family"),
    "Desoto Hemi (330, 341,& 345)": (["DeSoto Hemi 330/341/345"], {"cyl": 8, "ci": [330, 341, 345]}, "unknown family"),
    "AMC": (["AMC V8"], {"cyl": 8}, None),
    "Harley": (["Harley-Davidson"], {}, "unknown family (motorcycle)"),
    "Powerstroke Diesel": (None, {"cyl": 8}, None),   # decided from the detail page
}


def johnson_detail_desc(f, url, pn, listing_url):
    """Return the APPLICATION/DESCRIPTION line from a Johnson product page, or None.

    The listed href (www host, .aspx) 301s twice to johnsonlifters.com/Products/<Listing>/<slug>;
    request that final form directly and only fall back to the listed href if it is not found.
    """
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", pn)
    slug = urlsplit(url).path.rstrip("/").split("/")[-1]
    slug = re.sub(r"\.aspx$", "", slug, flags=re.I)
    direct = f"https://johnsonlifters.com/Products/{listing_url.rstrip('/').split('/')[-1]}/{slug}"
    try:
        try:
            html = f.get(direct, f"johnson_{safe}.html", JOHNSON_HOSTS)
        except Blocked as e:
            if "HTTP 404" not in str(e):
                raise
            html = f.get(url, f"johnson_{safe}.html", JOHNSON_HOSTS)
    except Blocked as e:
        return None, str(e)
    soup = BeautifulSoup(html, "html.parser")

    def tab(kind):
        div = soup.find("div", id=re.compile(rf"^lt-\d+-{kind}$"))
        if not div:
            return []
        out = []
        for t in div.get_text("\n").split("\n"):
            t = clean(t)
            if not t or "COMING SOON" in t.upper():
                continue
            if kind == "application" and t.upper() == t and not re.search(r"\d", t):
                continue        # a repeated section heading such as "OLDS / PONTIAC"
            out.append(t)
        return out

    return {"application": tab("application"), "description": tab("description")}, None


LIFTER_BODY_DIAS = ("842", "875", "903", "904", "936")


def johnson_spec(style, heading, desc, detail):
    d = desc
    dtext = " ".join((detail or {}).get("application", []) + (detail or {}).get("description", []))
    spec = {"style": style}
    m = re.search(r"\.(\d{3})\b", d)
    if m and m.group(1) in LIFTER_BODY_DIAS:
        spec["bodyDia"] = float("0." + m.group(1))
    else:
        m = re.search(r"\.(" + "|".join(LIFTER_BODY_DIAS) + r")\b", dtext)
        if m:
            spec["bodyDia"] = float("0." + m.group(1))
    if re.search(r"\.300\s*Tall", d, re.I) or re.search(r'\.300"?\s*(tall|taller|short)', dtext, re.I):
        spec["tall"] = 0.3
    m = re.search(r"\.(\d{3})\"?\s*Max(?:imum)? Lobe Lift", dtext, re.I)
    if m and "Drop-in" in heading:      # only the drop-in pages state this for their own part
        spec["maxLobeLift"] = float("0." + m.group(1))
    if re.search(r"Centered Pushrod Seat", dtext, re.I):
        spec["centeredPushrodSeat"] = True
    if re.search(r"Short Travel", d, re.I):
        spec["travelType"] = "short"
    elif re.search(r"Reduced Travel", d, re.I):
        spec["travelType"] = "reduced"
    elif re.search(r"Standard Travel", d, re.I):
        spec["travelType"] = "standard"
    if re.search(r"Axle Oiling", d, re.I):
        spec["axleOiling"] = True
    if re.search(r"Reduced Seat Height", d, re.I):
        spec["reducedSeatHeight"] = True
    if re.search(r"High Flow Oiling", d, re.I):
        spec["highFlowOiling"] = True
    if re.search(r"Drop-?in|Dog Bone", d, re.I) or "Drop-in" in heading:
        spec["linkBar"] = False
        spec["dropIn"] = True
    elif re.search(r"tie[- ]?bar", dtext, re.I):
        spec["linkBar"] = True
    m = re.search(r"\.(\d{3})\"?\s*roller", dtext, re.I)
    if m:
        spec["rollerDia"] = float("0." + m.group(1))
    if d:
        spec["catalogDesc"] = d
    return spec


# Lines of the GM drop-in application list -> family. Engines with no family in the shared list
# (Pontiac 2.5 Iron Duke, Olds-based Cadillac 5.0/5.7, 90-degree 4.3 V6) stay in fit.applications only.
DROPIN_LINE_FAMILY = [
    (r"\bLS\d|LS2|LQ9|L92|V-?8\s*(4\.8|5\.3|6\.0)L", "GM LS"),
    (r"GM\s*V-?8\s*(4\.3|5\.[0O]|5\.7)L", "Small-block Chevy"),
    (r"Buick\s*V-?6|GM\s*V-?6\s*3\.3L", "Buick V6 181-252"),
]
YEAR_RANGE = re.compile(r"\b(19\d{2}|20\d{2})\s*(?:[-–]\s*(19\d{2}|20\d{2})|(and up))?\b")


def johnson_fit(heading, pn, desc, detail, notes, qa):
    """Return [(family, fit-extras)] for one Johnson row.

    Detail pages are used cautiously: several carry copy-pasted APPLICATION text from another part
    (e.g. a .903 tie-bar lifter showing the drop-in GM list), so application lines are stored only
    when they are a single line, or for the GM drop-in parts whose list is the product's own.
    """
    fams, extras, flag = JOHNSON_FAMILY.get(heading, (None, {}, "unknown family"))
    extras = dict(extras)
    app = (detail or {}).get("application", [])
    desc_lines = (detail or {}).get("description", [])
    dd = " ".join(app + desc_lines)
    per_family_years = {}
    if heading == "GM Drop-in Roller":
        if "BBC" in desc.upper():
            fams = ["Chevy Gen VI big block"]
            extras = {"cyl": 8, "notes": "OE-style drop-in for factory hydraulic roller blocks"}
            if app:
                qa.append(f"{pn}: drop-in BBC part carries an application list; check it: {app[:3]}")
        else:
            fams = []
            for line in app:
                for rx, fam in DROPIN_LINE_FAMILY:
                    if re.search(rx, line, re.I):
                        if fam not in fams:
                            fams.append(fam)
                        m = YEAR_RANGE.search(line)
                        if m:
                            y0 = int(m.group(1))
                            y1 = int(m.group(2)) if m.group(2) else (None if m.group(3) else y0)
                            lo, hi = per_family_years.get(fam, (9999, 0))
                            per_family_years[fam] = (min(lo, y0), None if y1 is None or hi is None else max(hi, y1))
                        break
            if not fams:
                fams = ["Small-block Chevy"]
            extras = {"cyl": 8, "notes": "OE-style drop-in for factory hydraulic roller blocks, uses dog bones/spider"}
            if app:
                extras["applications"] = app
    elif heading == "Powerstroke Diesel":
        m = re.search(r"\b(7\.3|6\.0|6\.4|6\.7)\b", dd)
        if m:
            fams = ["Powerstroke " + m.group(1)]
        else:
            fams = ["Powerstroke Diesel"]
            flag = "unknown family (Powerstroke displacement not stated on site)"
    elif fams is None:
        fams = [heading]
    elif heading == "Ford Small Block" and re.search(r"cleveland|351C", dd, re.I):
        fams = fams + ["Ford 351C/351M/400"]
    elif heading == "Ford Big Block" and re.search(r"\bFE\b|390|428", dd):
        fams = fams + ["Ford FE"]
    elif heading == "Chrysler Small Block" and re.search(r"magnum", dd, re.I):
        fams = fams + ["Mopar Magnum 5.2/5.9"]
    elif heading == "Chrysler Big Block" and re.search(r"hemi 426|426 hemi|426 CID", dd, re.I):
        fams = fams + ["Chrysler 426 Hemi"]
    if flag:
        for fam in fams:
            notes.setdefault("unknown_families", {}).setdefault(fam, []).append(pn)
    if heading != "GM Drop-in Roller" and app:
        if len(app) == 1:
            extras["applications"] = app
            m = YEAR_RANGE.search(app[0])
            # a lone "1955-1986 GM Small block" style line gives a year range; qualified lines don't
            if m and m.group(2) and not re.search(r"\band\b|,|/", app[0]) and len(fams) == 1:
                extras["y0"], extras["y1"] = int(m.group(1)), int(m.group(2))
        else:
            qa.append(f"{pn} ({heading}): multi-line application tab looks copied from another part; ignored: {app[:2]}")
    out = []
    for fam in fams:
        e = dict(extras)
        if fam == "Buick V6 181-252":
            e["cyl"] = 6
        if fam in per_family_years:
            lo, hi = per_family_years[fam]
            e["y0"] = lo
            if hi:
                e["y1"] = hi
        out.append((fam, e))
    return out


def johnson_name(style, spec, heading):
    parts = [{"hydraulic_roller": "Hydraulic roller lifter set", "solid_roller": "Solid roller lifter set"}[style]]
    parts.append(heading)
    if "bodyDia" in spec:
        parts.append(f"{spec['bodyDia']:.3f} body")
    if spec.get("tall"):
        parts.append(f"+{spec['tall']:.3f} tall")
    if spec.get("travelType"):
        parts.append(spec["travelType"] + " travel")
    if spec.get("axleOiling"):
        parts.append("axle oiling")
    if spec.get("dropIn"):
        parts.append("drop-in")
    return ", ".join(parts)


def extract_johnson(f, notes, detail=True):
    recs, skipped = [], []
    info = {"pages": {}, "detail_pages": 0, "detail_errors": []}
    seen = set()
    for style, url in JOHNSON_PAGES.items():
        try:
            html = f.get(url, url.rstrip("/").split("/")[-1] + ".html", JOHNSON_HOSTS)
        except Blocked as e:
            info["pages"][style] = {"error": str(e)}
            continue
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")
        per = {}
        for table in tables:
            # nearest enclosing section.toggle carries the engine-family heading button
            sec = table.find_parent("section", class_="toggle")
            btn = sec.find("button", class_="toggle-heading") if sec else None
            heading = clean(btn.get_text(" ")) if btn else "?"
            n = 0
            for tr in table.find_all("tr"):
                cells = [clean(c.get_text(" ")) for c in tr.find_all(["td", "th"])]
                if len(cells) < 3 or not cells[0] or cells[0].upper() == "MSRP":
                    continue
                pn, desc = cells[0], cells[2]
                a = tr.find("a", href=True)
                page_url = urljoin(url, a["href"]) if a else url
                if not re.fullmatch(r"[A-Z]{0,2}\d{4}[A-Z0-9-]*", pn):
                    skipped.append(f"Johnson '{heading}': odd part number {pn!r}")
                    continue
                det, err = (None, None)
                if detail and a:
                    det, err = johnson_detail_desc(f, page_url, pn, url)
                    if err:
                        info["detail_errors"].append(f"{pn}: {err}")
                    else:
                        info["detail_pages"] += 1
                spec = johnson_spec(style, heading, desc, det)
                if det is not None:
                    info.setdefault("detail_text", {})[pn] = det
                for fam, extras in johnson_fit(heading, pn, desc, det, notes, info.setdefault("qa", [])):
                    key = (pn, fam)
                    if key in seen:
                        skipped.append(f"Johnson {pn} repeated for {fam} - kept first")
                        continue
                    seen.add(key)
                    fit = {"fam": fam}
                    fit.update(extras)
                    recs.append({
                        "m": "Johnson Lifters",
                        "p": pn,
                        "cat": "lifter",
                        "name": johnson_name(style, spec, heading),
                        "fit": fit,
                        "spec": spec,
                        "src": {"doc": "johnsonlifters.com product listing (price table effective 2021-04-01)",
                                "edition": "2026-10", "url": page_url},
                        "emissions": None,
                    })
                    n += 1
            per[heading] = n
        info["pages"][style] = {"url": url, "tables": len(tables), "rows_by_heading": per}
    notes["johnson"] = info
    return recs, skipped


# --------------------------------------------------------------------------- validate / main

def validate(parts):
    problems = []
    seen = set()
    for r in parts:
        for k in ("m", "p", "cat", "fit", "src"):
            if not r.get(k):
                problems.append(f"{r.get('m')} {r.get('p')}: missing {k}")
        if not r["fit"].get("fam"):
            problems.append(f"{r['m']} {r['p']}: missing fit.fam")
        key = (r["m"], r["p"], r["fit"].get("fam"))
        if key in seen:
            problems.append(f"duplicate {key}")
        seen.add(key)

        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    walk(v, path + "." + k)
            elif isinstance(o, list):
                for i, v in enumerate(o):
                    walk(v, f"{path}[{i}]")
            elif isinstance(o, str) and o == "":
                problems.append(f"{r['m']} {r['p']}: empty string at {path}")
        walk(r, "")
        for k in ("bodyDia", "rollerDia", "offset", "tieBarRaise", "tall", "boreSpacing"):
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append(f"{r['m']} {r['p']}: spec.{k} not numeric: {v!r}")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="ignore the dl/ cache and re-fetch")
    ap.add_argument("--no-detail", action="store_true", help="skip Johnson per-part detail pages")
    args = ap.parse_args()
    DL.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    f = Fetcher(refresh=args.refresh)
    notes = {}
    morel, sk1 = extract_morel(f, notes)
    johnson, sk2 = extract_johnson(f, notes, detail=not args.no_detail)
    parts = morel + johnson
    problems = validate(parts)
    today = dt.date.today().isoformat()
    doc = {
        "source": {
            "task": "LIFTERS",
            "brands": {
                "Morel": {"url": MOREL_URL, "doc": "John Callies Inc. Morel Products page (HTML tables)"},
                "Johnson Lifters": {"urls": list(JOHNSON_PAGES.values()),
                                    "doc": "johnsonlifters.com product listings + per-part pages"},
            },
            "userAgent": UA,
        },
        "extracted": today,
        "count": len(parts),
        "parts": parts,
    }
    (OUT / "lifters.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    run = {"date": today, "requests": f.requests, "cached": f.cached, "log": f.log, "notes": notes,
           "skipped": sk1 + sk2, "problems": problems,
           "counts": {"Morel": len(morel), "Johnson Lifters": len(johnson), "total": len(parts)}}
    (DL / "lifters.run.json").write_text(json.dumps(run, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in run.items() if k != "log"}, indent=1, ensure_ascii=False))
    print(f"requests={f.requests} cached={f.cached} parts={len(parts)} problems={len(problems)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
