#!/usr/bin/env python3
"""Parts catalog extractor: FLEECE (Fleece Performance Engineering, fleeceperformance.com).

Magento 2 store with no JSON catalog endpoint. Sources:

* `https://www.fleeceperformance.com/sitemap.xml` (~1,060 URLs). Product pages are the root-level
  clean `.html` URLs with `<priority>1.0</priority>` (~617); category pages carry 0.5 and the
  nested `/dodge/...`, `/chevy-gmc/...` paths are category listings (not fetched).
* Each product page: a `Product` JSON-LD block (name, sku, mpn, description, price) plus the
  Magento detail tabs: Details (description HTML), Fitment (one `<li>` per model year, e.g.
  `2013 Ram 2500/3500 6.7L 24V Cummins`), Interchange (OEM part numbers replaced),
  Specifications (UPC, shipping weight) and Certifications (CARB EO#, SEMA cert).
* The lift-pump fitment PDFs linked from `/resources`:
  `/media/wysiwyg/Fleece_and_Titan_Powerflo_Fitment.pdf` (PowerFlo / SureFlo by cab and bed,
  with the matching Titan tank PN) and `/media/wysiwyg/Fleece_SB_PF_SF_Fitment.pdf` (same for
  S&B tanks). Both are one-page tables with merged cells; the rows are transcribed below in
  `TITAN_FITMENT` / `SB_FITMENT` and every part number in them is checked against the PDF text
  at run time, so a changed PDF fails loudly instead of silently drifting.

robots.txt: no Crawl-delay; `/catalog/product/view/`, `/catalog/category/view/`, `/index.php/`
are disallowed and never requested (the clean `.html` URLs are allowed). Requests are spaced
6 s apart, one at a time; a 403 / challenge page stops the source. Everything fetched is cached
under `dl/fleece/` (gitignored) so the parse step is re-runnable offline and the crawl resumes
where it stopped.

    python -I scripts/parts-catalog/extract_fleece.py               # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_fleece.py --fetch-only  # crawl / resume only
    python -I scripts/parts-catalog/extract_fleece.py --offline     # parse the cache only
    python -I scripts/parts-catalog/extract_fleece.py --refresh     # re-fetch everything
    python -I scripts/parts-catalog/extract_fleece.py --dump        # print parsed pages, no output

Writes `out/fleece.json` and `out/fleece.md`. Nothing is written outside `dl/` and `out/`.
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
DL = HERE / "dl" / "fleece"
PAGES = DL / "pages"
OUT = HERE / "out"
HOST = "www.fleeceperformance.com"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
BRAND = "Fleece Performance"
DOC = "fleeceperformance.com product pages (JSON-LD + fitment/interchange/certification tabs)"
PDF_DOC = "fleeceperformance.com Fleece_and_Titan_Powerflo_Fitment.pdf / Fleece_SB_PF_SF_Fitment.pdf"
EDITION = dt.date.today().strftime("%Y-%m")
PDFS = {
    "titan": "/media/wysiwyg/Fleece_and_Titan_Powerflo_Fitment.pdf",
    "sb": "/media/wysiwyg/Fleece_SB_PF_SF_Fitment.pdf",
}

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
    if isinstance(obj, str):
        return obj.strip()
    return obj


def num(s) -> float | int | None:
    if s is None:
        return None
    try:
        v = float(str(s).replace(",", ""))
    except ValueError:
        return None
    return int(v) if v.is_integer() else round(v, 3)


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
        self.robots_status = None
        DL.mkdir(parents=True, exist_ok=True)
        PAGES.mkdir(parents=True, exist_ok=True)
        self.logf = open(DL / "fetch_log.jsonl", "a", encoding="utf-8")

    def _robots(self):
        if self.rp is not None:
            return
        import requests
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.8"})
        r = self.session.get(f"https://{HOST}/robots.txt", timeout=30)
        self.n_requests += 1
        self.last = time.time()
        self.robots_status = r.status_code
        txt = r.text if r.status_code == 200 else ""
        (DL / "robots.txt").write_text(f"# status {r.status_code}\n{txt}", encoding="utf-8")
        self.rp = urllib.robotparser.RobotFileParser()
        self.rp.parse(txt.splitlines())
        self.delay = max(MIN_DELAY, self.rp.crawl_delay(UA) or self.rp.crawl_delay("*") or 0)
        log(f"robots.txt: status {r.status_code}, delay {self.delay}s")

    def get(self, url: str, cache: pathlib.Path, accept: str = "text/html") -> bytes | None:
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
            r = self.session.get(url, headers={"Accept": accept}, timeout=90, allow_redirects=True)
        except Exception as e:
            self.last = time.time()
            self.n_requests += 1
            self._log({"url": url, "status": f"ERR {e}"})
            log(f"ERR {url}: {e}")
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
            log(f"{r.status_code} {url}")
            return None
        cache.write_bytes(body)
        return body

    def _log(self, entry: dict):
        entry["ts"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        self.logf.write(json.dumps(entry) + "\n")
        self.logf.flush()


def product_urls(sitemap_xml: str) -> list[str]:
    """Root-level clean .html URLs with priority 1.0 (= products; categories carry 0.5)."""
    urls = []
    for block in re.findall(r"<url>(.*?)</url>", sitemap_xml, re.S):
        loc = re.search(r"<loc>(.*?)</loc>", block)
        pr = re.search(r"<priority>(.*?)</priority>", block)
        if not loc or not pr or pr.group(1) != "1.0":
            continue
        u = loc.group(1).strip()
        if not u.endswith(".html") or u.count("/") != 3:
            continue
        if "/catalog/" in u or "/index.php/" in u:
            continue
        urls.append(u)
    return sorted(set(urls))


def slug_of(url: str) -> str:
    return url.rsplit("/", 1)[1][:-5]


def fetch_all(f: Fetcher) -> tuple[list[str], dict[str, bytes], list[str]]:
    sm = f.get(f"https://{HOST}/sitemap.xml", DL / "sitemap.xml", accept="application/xml,text/xml")
    if sm is None:
        raise SystemExit("no sitemap (offline without cache, or blocked)")
    urls = product_urls(sm.decode("utf-8", "replace"))
    log(f"sitemap: {len(urls)} product URLs")
    for key, path in PDFS.items():
        f.get(f"https://{HOST}{path}", DL / f"{key}_fitment.pdf", accept="application/pdf")
    pages: dict[str, bytes] = {}
    missing = []
    for i, u in enumerate(urls):
        body = f.get(u, PAGES / f"{slug_of(u)}.html")
        if body is None:
            missing.append(u)
            if f.stopped:
                break
            continue
        pages[u] = body
        if f.n_requests and f.n_requests % 25 == 0 and not f.offline:
            log(f"  fetched {i + 1}/{len(urls)} ({f.n_requests} requests this run)")
    if f.stopped:
        missing.extend(urls[len(pages) + len(missing):])
    return urls, pages, missing


# --------------------------------------------------------------------------- page parsing
def parse_page(url: str, html: str) -> dict | None:
    """Everything the page says about the product, as plain data. None = not a product page."""
    from bs4 import BeautifulSoup
    s = BeautifulSoup(html, "html.parser")
    prod = None
    crumbs = []
    for sc in s.find_all("script", type="application/ld+json"):
        try:
            d = json.loads(sc.string or sc.get_text())
        except Exception:
            continue
        if d.get("@type") == "Product":
            prod = d
        elif d.get("@type") == "BreadcrumbList":
            crumbs = [it["item"]["name"] for it in d.get("itemListElement", []) if it.get("item")]
    if prod is None:
        return None
    det = s.select_one("div.product.info.detailed")

    def tab(id_):
        return det.find(id=id_) if det else None

    def li_values(el):
        return [" ".join(li.get_text(" ", strip=True).split()) for li in el.select("li.value")] if el else []

    desc_el = s.select_one("div.product.attribute.description div.value") or tab("description")
    desc_text = desc_el.get_text("\n", strip=True) if desc_el else ""
    desc_lines = [" ".join(x.split()) for x in desc_text.split("\n") if x.strip()]
    overview = s.select_one(".product.attribute.overview")
    over_lines = [" ".join(li.get_text(" ", strip=True).split()) for li in overview.find_all("li")] if overview else []
    spec_kv = {}
    sp = tab("specifications")
    if sp:
        for a in sp.select("div.product.attribute"):
            k = a.select_one(".type")
            v = a.select_one(".value")
            if k and v:
                spec_kv[k.get_text(strip=True).rstrip(":")] = v.get_text(" ", strip=True)
    cert = tab("certification.tab")
    cert_text = " ".join(cert.get_text(" ", strip=True).split()) if cert else ""
    desc_tables = []
    if desc_el:
        for t in desc_el.find_all("table"):
            rows = []
            for tr in t.find_all("tr"):
                rows.append([" ".join(c.get_text(" ", strip=True).split()) for c in tr.find_all(["td", "th"])])
            desc_tables.append(rows)
    title = s.title.get_text(strip=True) if s.title else ""
    offers = prod.get("offers") or []
    if isinstance(offers, dict):
        offers = [offers]
    avail = ""
    if offers:
        avail = (offers[0].get("availability") or "").rsplit("/", 1)[-1]
    return {
        "url": url, "slug": slug_of(url), "title": title,
        "name": " ".join((prod.get("name") or "").split()),
        "sku": (prod.get("sku") or "").strip(), "mpn": (prod.get("mpn") or "").strip(),
        "brand": ((prod.get("brand") or {}).get("name") if isinstance(prod.get("brand"), dict) else prod.get("brand")) or "",
        "crumbs": crumbs[1:],  # drop Home
        "desc": desc_lines, "overview": over_lines, "desc_tables": desc_tables,
        "fitment": li_values(tab("fitment")),
        "interchange": li_values(tab("interchange")),
        "spec_kv": spec_kv, "cert": cert_text, "availability": avail,
        "ld_desc": " ".join((prod.get("description") or "").split()),
    }


# --------------------------------------------------------------------------- families
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
# Not in cam-fitment.json: the catalog's own engine wording is kept in fit.fam and flagged.
UNKNOWN_FAM = {
    "RAM 3.0 EcoDiesel": {"cyl": 6}, "GM 3.0 Duramax (LM2/LZ0)": {"cyl": 6}, "GM 2.8 Duramax": {"cyl": 4},
    "Cummins ISX/QSX": {"cyl": 6}, "Ford 6.9/7.3 IDI": {"cyl": 8}, "Cummins 4BT": {"cyl": 4},
}
DMX_CODE = re.compile(r"\b(LB7|LLY|LBZ|LMM|LGH|LML|L5P|L5D|LM2|LZ0|LWN)\b")


def engine_family(text: str, year: float | None) -> tuple[str | None, str | None]:
    """(fam, engine-note) from the engine wording of one fitment line / a title."""
    t = text
    if re.search(r"\bISX\b|\bQSX\b", t):
        return "Cummins ISX/QSX", None
    if re.search(r"\b4BT\b", t):
        return "Cummins 4BT", None
    if re.search(r"6\.7\s*L?\b.*Cummins|Cummins.*6\.7\s*L?\b", t, re.I):
        return "Cummins 6.7", None
    if re.search(r"5\.9\s*L?\b.*Cummins|Cummins.*5\.9\s*L?\b|12[- ]?Valve|24[- ]?Valve", t, re.I) or \
            re.search(r"\bCummins\b", t) and re.search(r"\b(12|24)V\b", t):
        if re.search(r"\b12\s*V(?:alve)?\b", t, re.I):
            return "Cummins 5.9 12V", None
        if re.search(r"\b24\s*V(?:alve)?\b", t, re.I):
            return "Cummins 5.9 24V/CR", None
        if year is not None:
            return ("Cummins 5.9 12V" if year <= 1998 else "Cummins 5.9 24V/CR"), None
        return None, None
    if re.search(r"6\.6\s*L?\b.*Duramax|Duramax.*6\.6\s*L?\b", t, re.I) or DMX_CODE.search(t) and not re.search(r"LM2|LZ0|LWN", t):
        codes = sorted(set(DMX_CODE.findall(t)))
        return "Duramax 6.6", ("/".join(codes) if codes else None)
    if re.search(r"3\.0\s*L?\b.*Duramax|Duramax.*3\.0\s*L?\b|\bLM2\b|\bLZ0\b", t, re.I):
        return "GM 3.0 Duramax (LM2/LZ0)", None
    if re.search(r"2\.8\s*L?\b.*Duramax|Duramax.*2\.8\s*L?\b|\bLWN\b", t, re.I):
        return "GM 2.8 Duramax", None
    m = re.search(r"(7\.3|6\.0|6\.4|6\.7)\s*L?\b.*Power ?Stroke|Power ?Stroke.*?(7\.3|6\.0|6\.4|6\.7)\s*L?\b", t, re.I)
    if m:
        return f"Powerstroke {m.group(1) or m.group(2)}", None
    if re.search(r"IDI|6\.9\s*L?\b.*Ford|Ford.*6\.9\s*L?\b", t, re.I):
        return "Ford 6.9/7.3 IDI", None
    if re.search(r"Eco ?Diesel", t, re.I):
        return "RAM 3.0 EcoDiesel", None
    return None, None


FIT_LINE = re.compile(r"^(19\d\d|20\d\d)(\.5)?\s+(.*)$")
ENGINE_SPLIT = re.compile(r"\b\d\.\dL\b|\bCummins\b|\bDuramax\b|\bPower ?Stroke\b|\bEco ?Diesel\b|\bISX\b|\bQSX\b|\b\d\dV\b|\bLB7\b|\bLLY\b|\bLBZ\b|\bLMM\b|\bLML\b|\bL5P\b", re.I)
ENGINE_CODE = re.compile(r"\b(VP44|P7100|P-?Pump|HO|SO|VE|CR)\b")


def fitment_from_lines(lines: list[str]) -> tuple[list[dict], list[str]]:
    """Fitment-tab lines ('2013 Ram 2500/3500 6.7L 24V Cummins') -> one entry per family."""
    by_fam: dict[str, dict] = {}
    unparsed = []
    for ln in lines:
        m = FIT_LINE.match(ln)
        if not m:
            unparsed.append(ln)
            continue
        year = int(m.group(1)) + (0.5 if m.group(2) else 0)
        rest = m.group(3)
        fam, code = engine_family(rest, year)
        if fam is None:
            unparsed.append(ln)
            continue
        me = ENGINE_SPLIT.search(rest)
        vehicle = rest[:me.start()].strip() if me else rest
        vehicle = re.sub(r"\s+", " ", vehicle)
        vehicle = re.sub(r"^Dodge Ram\b", "Ram", vehicle)
        g = by_fam.setdefault(fam, {"fam": fam, "years": [], "vehicles": [], "codes": set()})
        g["years"].append(year)
        if vehicle and vehicle not in g["vehicles"]:
            g["vehicles"].append(vehicle)
        if code:
            g["codes"].update(code.split("/"))
        g["codes"].update(ENGINE_CODE.findall(rest[me.start():] if me else rest))
    out = []
    for fam, g in by_fam.items():
        y0, y1 = min(g["years"]), max(g["years"])
        notes = []
        if y0 != int(y0):
            notes.append(f"from {y0}")
        if g["codes"]:
            notes.append("/".join(sorted(g["codes"])))
        if g["vehicles"]:
            notes.append("; ".join(g["vehicles"]))
        out.append({"fam": fam, "y0": int(y0), "y1": int(y1), "notes": ", ".join(notes) or None, "src": "fitment tab"})
    return out, unparsed


YEARS = re.compile(r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)\s*(?:[-–—]|to)\s*((?:19|20)?\d\d(?:\.5)?)(?![\d.])|(?<![\d.])(20\d\d)\s*\+")


def fitment_from_desc(lines: list[str]) -> list[dict]:
    """Application-notes lines such as 'Cummins 5.9L 24V (2003 - 2007) - Requires removal of the heat shield'
    or 'Fits 1989-2023 Cummins 12 valve and 5.9/6.7L 24 valve engines'."""
    out: dict[str, dict] = {}
    for ln in lines:
        if not re.search(r"Cummins|Duramax|Power ?Stroke|EcoDiesel|ISX", ln, re.I):
            continue
        m = YEARS.search(ln)
        if not m:
            continue
        if m.group(3):
            y0, y1 = float(m.group(3)), None
        else:
            y0 = float(m.group(1))
            y1s = m.group(2)
            y1 = float(y1s) if len(y1s.split(".")[0]) == 4 else float(str(int(y0))[:2] + y1s)
        fams = []
        if re.search(r"12 valve|12V", ln, re.I) and re.search(r"24 valve|24V", ln, re.I):
            fams = [("Cummins 5.9 12V", None)]
            if re.search(r"5\.9", ln):
                fams.append(("Cummins 5.9 24V/CR", None))
            if re.search(r"6\.7", ln):
                fams.append(("Cummins 6.7", None))
        else:
            fam, code = engine_family(ln, y0)
            if fam:
                fams = [(fam, code)]
        note = ln.split(")", 1)[1].strip(" -") if ")" in ln and re.search(r"\(\s*\d{4}", ln) else None
        for fam, code in fams:
            g = out.setdefault(fam, {"fam": fam, "y0": y0, "y1": y1, "notes": [], "src": "description"})
            g["y0"] = min(g["y0"], y0)
            g["y1"] = None if (y1 is None or g["y1"] is None) else max(g["y1"], y1)
            for n in (code, note):
                if n and n not in g["notes"]:
                    g["notes"].append(n)
    res = []
    for g in out.values():
        notes = list(g["notes"])
        if g["y0"] != int(g["y0"]):
            notes.insert(0, f"from {g['y0']}")
        res.append({"fam": g["fam"], "y0": int(g["y0"]), "y1": int(g["y1"]) if g["y1"] is not None else None,
                    "notes": ", ".join(notes) or None, "src": "description"})
    return res


def fitment_from_name(name: str, crumbs: list[str]) -> list[dict]:
    """Fallback when the Fitment tab is empty: year range + engine words from the name, else
    the breadcrumb (`Dodge (Cummins)` > `2013-2018 (6.7L)`)."""
    y0 = y1 = None
    m = YEARS.search(name)
    if m:
        if m.group(3):
            y0 = float(m.group(3))
        else:
            y0 = float(m.group(1))
            y1s = m.group(2)
            y1 = float(y1s) if len(y1s.split(".")[0]) == 4 else float(str(int(y0))[:2] + y1s)
    else:
        ms = re.search(r"\bfor (19\d\d|20\d\d)(?:\.5)?\b", name)
        if ms:
            y0 = y1 = float(ms.group(1))
    fam, code = engine_family(name, y0)
    src = "name"
    if fam is None and len(crumbs) >= 2:
        mk, yrs = crumbs[0], crumbs[1]
        mc = re.search(r"\((\d\.\dL)\)", yrs)
        eng = (mc.group(1) + " ") if mc else ""
        if "Cummins" in mk:
            eng += "Cummins"
        elif "Chevy" in mk or "GM" in mk:
            eng += "Duramax"
        elif "Ford" in mk:
            eng += "Power Stroke"
        my = YEARS.search(yrs)
        if my and y0 is None:
            if my.group(3):
                y0 = float(my.group(3))
            else:
                y0, y1 = float(my.group(1)), float(my.group(2))
        fam, code = engine_family(eng, y0)
        src = "breadcrumb"
    if fam is None:
        return []
    notes = []
    if y0 is not None and y0 != int(y0):
        notes.append(f"from {y0}")
    if code:
        notes.append(code)
    return [{"fam": fam, "y0": int(y0) if y0 is not None else None, "y1": int(y1) if y1 is not None else None,
             "notes": ", ".join(notes) or None, "src": src}]


# --------------------------------------------------------------------------- classification
HARDWARE = re.compile(
    r"\b(fittings?|hose|hoses|pigtail|harness|bracket|brackets|plug|plugs|cap|caps|cover|covers|nut|nuts|washer|washers|"
    r"stud|studs|bolt|bolts|sleeve|reducer|clamp|clamps|adapter|adapters|line|lines|tube|tubes|gasket|gaskets|o-ring|"
    r"keychain|banner|decal|hoodie|shirt|t-shirt|hat|beanie|sticker|koozie|tool|tools|sensor|sensors|actuator|"
    r"resonator|thermostat|drain|feed|return|regulator|extension|idler|pulley|block|mount|mounting|service kit|"
    r"repair kit|install(?:ation)? kit|hardware kit|conversion harness|filter|filters|relocation|bypass|elbow|"
    r"bung|bungs|quick connect|barb|flange|spacer|shim|coupler|boot|clip|clips|seal|seals|wrench|socket)\b", re.I)


def classify(p: dict) -> tuple[str | None, str | None]:
    """Return (cat, skip_reason). Exactly one is set."""
    name = p["name"]
    cats = " > ".join(p["crumbs"][:-1])
    low = name.lower()
    if re.search(r"Apparel|Merchandise", cats, re.I) or re.search(r"hoodie|shirt|\bhat\b|beanie|decal|sticker|keychain|banner|koozie|flag\b|lanyard|gift card", low):
        return None, "apparel / merchandise"
    if re.search(r"\bdelete\b", low) and re.search(r"EGR|DPF|DOC|SCR|emission|catalyst", name + " " + " ".join(p["desc"]), re.I):
        return None, "emissions delete part (skipped by rule)"
    if re.search(r"Cylinder Heads?", cats) or re.search(r"\bcylinder head", low):
        if HARDWARE.search(low) or re.search(r"\bfor\b.*cylinder heads?\b|dowel", low):
            return None, "cylinder-head hardware"
        return "head", None
    if re.search(r"gasket (?:set|kit)|upper gasket|lower gasket", low):
        return "gasket", None
    if re.search(r"\btappets?\b|\blifters?\b", low) and not re.search(r"tool(?! steel)|bore", low):
        return "lifter", None
    if re.search(r"rocker (?:arm )?bridge|crosshead|valve bridge", low):
        return None, "valvetrain hardware (bridges / crossheads)"
    if re.search(r"rocker arm", low) and not re.search(r"bolt|stud|shaft only|tool|cover|box", low):
        return "rocker", None
    if re.search(r"spring and retainer|valve springs?\b|spring (?:set|kit)", low) and not re.search(r"compressor|tool|seal", low):
        return "spring", None
    if re.search(r"intake plenum|intake plate|intake manifold", low) and not re.search(r"gasket|bolt|heater|upgrade kit|cold weather|sensor|elbow|boot|coupler|hose", low):
        return "intake", None
    if re.search(r"under bed filter|fuel filter", low):
        return None, "fuel filters / distribution blocks"
    if re.search(r"Long Blocks?|Short Blocks?", cats) or re.search(r"\b(long|short) block", low):
        return None, "short / long block (no shared category)"
    if re.search(r"turbo", low):
        if re.search(r"turbocharger|cheetah", low) and not re.search(
                r"drain|plug|adapter|\bline\b|kit for|install|pigtail|harness|stud|nut|washer|sleeve|keychain|banner|"
                r"actuator|sensor|cover|resonator|thermostat|mount|speed|feed|oil|coolant|gasket|clamp|flange|"
                r"compressor discharge|intake horn|downpipe|exhaust", low):
            return "turbo", None
        return None, "turbo hardware / plumbing / install kit"
    if re.search(r"powerflo|sureflo|lift pump|sending unit|fuel system upgrade", low):
        if re.search(r"pigtail|harness|bracket|fitting|\bline\b|hose|filter kit|filter upgrade|filter head|wrench|"
                     r"sock|strainer|repair|rebuild|service|relocation|adapter|block", low) and not re.search(r"with powerflo", low):
            return None, "lift-pump hardware / pigtail / filter"
        if re.search(r"\bcp3\b|\bcp4\b", low):
            return "injectionPump", None
        return "liftPump", None
    if re.search(r"\bcp3\b|\bcp4\b|injection pump|high pressure fuel pump|\bcp3k\b", low) or re.search(r"Injection Pumps", cats):
        if re.search(r"no pump|without pump|hardware kit|w/o|feed|return|fitting|harness|bracket|nut cover|pulley|"
                     r"hose|\bline\b|adapter|regulator|extension|block|idler|cover|gear|tool|kit only|sensor|mounting", low):
            return None, "injection-pump hardware / kit without the pump"
        return "injectionPump", None
    if re.search(r"\binjectors?\b", low) and not HARDWARE.search(low):
        return "injector", None
    if re.search(r"\bpushrods?\b", low) and not re.search(r"cup|seat|tool", low):
        return "pushrod", None
    if re.search(r"valve springs?\b", low) and not re.search(r"compressor|tool|retainer|seal", low):
        return "spring", None
    if re.search(r"head gasket", low) and not re.search(r"tool|bolt", low):
        return "headGasket", None
    if re.search(r"head studs?\b|main studs?\b|rod bolts?\b|manifold stud", low) and not re.search(r"tool|washer|nut\b|replacement 12 point", low):
        return "fastener", None
    if re.search(r"dual pump", low) and re.search(r"hardware|kit", low):
        return None, "injection-pump hardware / kit without the pump"
    if re.search(r"silicone|\bcac\b|hump hose|intercooler pipe|charge pipe|intake horn|air intake", low):
        return None, "turbo hardware / plumbing / install kit"
    if re.search(r"\bmanifold\b", low) and not re.search(r"gasket|bolt|stud|sensor|plate|plug|adapter|clamp|elbow|boot|hose|coupler|universal", low):
        return "manifold", None
    if re.search(r"intercooler|charge air cooler", low) and not HARDWARE.search(low):
        return "intercooler", None
    if re.search(r"Plumbing|Fittings|Hoses", cats, re.I) or re.search(r"\bAN\b|NPT|hose barb|quick connect|o-ring", name):
        return None, "fittings / hoses / plumbing"
    if re.search(r"Electronics|Pigtails|Harness", cats, re.I) or re.search(r"pigtail|harness|sensor|switch|module|connector|relay|tapshifter|lights", low):
        return None, "electronics / pigtails / harnesses"
    if re.search(r"Fuel Lines|Injection Line", cats + " " + name, re.I):
        return None, "fuel lines"
    if re.search(r"fuel filter|distribution block|primer bulb|filter head|filter kit|filter conversion|fuel sock|strainer", low):
        return None, "fuel filters / distribution blocks"
    if re.search(r"Fluids?", cats) or re.search(r"additive|\bfluid\b|\bquart\b|\bgallon\b", low) and not re.search(r"cooler|tank", low):
        return None, "fluids / consumables"
    if re.search(r"coolant bypass|billet|cap\b|cover|plug|bracket|clamp|stack|hood|roll bar|drain|thermostat housing|"
                 r"water pump|freeze plug|dipstick|breather|ccv|pcv|crankcase|valve cover|bushing|mount|spacer|pulley|idler|"
                 r"tensioner|belt|grill|badge|emblem", low) or re.search(r"Pulleys|Billet", cats):
        return None, "engine dress / hardware (not a task category)"
    if re.search(r"transmission|allison|68rfe|a/c line|air conditioning|a-c-line", low):
        return None, "transmission / chassis parts"
    return None, f"other: {cats or 'uncategorised'}"


# --------------------------------------------------------------------------- spec parsing
CARB_EO = re.compile(r"\b(D-\d{3}-\d{1,3})\b")
SEMA = re.compile(r"\b(SC-[A-Z0-9]{3,8}-\d{3,5})\b")
HP_CAP = re.compile(r"(?:up to|supporting(?: vehicle modifications)?(?: up to)?|capable of(?: supporting)?(?: up to)?|supports?(?: up to)?|"
                    r"rated (?:for|to|at)(?: up to)?|good for)\s*(\d{1,2}(?:,\d{3})|\d{3,4})\s*\+?\s*(RWHP|rear[- ]wheel (?:horse ?power|hp)|HP|hp|horsepower)\b", re.I)
MM = re.compile(r"(?<![\d.])(\d\d(?:\.\d)?)\s*-?\s*mm\b", re.I)
TURBO_MODEL = re.compile(r"\b(HE[0-9]{3}[A-Z]{1,3}|HX[0-9]{2}[A-Z]?|HY35[A-Z]?|GT[0-9]{4}[A-Z]{0,2}|S3[0-9]{2}(?:SX-?E)?|S4[0-9]{2}(?:SX-?E)?|"
                         r"K0[0-9]|BV[0-9]{2}|GTP38R?|TP38|VGT|VNT|GT3782VA|GT3788VA|LB7|RHG6)\b")


def all_text(p: dict) -> str:
    return " ".join([p["name"]] + p["overview"] + p["desc"])


def parse_hp(text: str) -> tuple[int | None, str | None]:
    mr = re.search(r"Rear Wheel HP Rating:?\s*(\d{1,2}(?:,\d{3})|\d{3,4})", text, re.I)
    if mr:
        return int(mr.group(1).replace(",", "")), "RWHP"
    best = None
    for m in HP_CAP.finditer(text):
        v = int(m.group(1).replace(",", ""))
        unit = "RWHP" if re.match(r"RW|rear", m.group(2), re.I) else "HP"
        if best is None or v > best[0]:
            best = (v, unit)
    return best if best else (None, None)


def parse_turbo(p: dict, qa: list[str]) -> dict:
    name, text = p["name"], all_text(p)
    spec: dict = {}
    # "63mm", "63/67", "64mm FMW", "63mm FMW Holset VGT"
    m = re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*/\s*(\d\d(?:\.\d)?)(?![\d.%])", name + " " + p["title"])
    if m and 50 <= float(m.group(1)) <= 110:
        spec["compressorInducer"], spec["turbineWheel"] = num(m.group(1)), num(m.group(2))
    mc = re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*-?\s*mm\b[^.]{0,40}?(?:FMW|compressor|billet)", text, re.I) or \
        re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*-?\s*mm\b", name + " " + p["title"], re.I)
    if mc and "compressorInducer" not in spec and 50 <= float(mc.group(1)) <= 110:
        spec["compressorInducer"] = num(mc.group(1))
    mt = re.search(r"(\d\d(?:\.\d)?)\s*-?\s*mm\b[^.]{0,30}?turbine", text, re.I) or re.search(r"turbine[^.]{0,30}?(\d\d(?:\.\d)?)\s*-?\s*mm\b", text, re.I)
    if mt and "turbineWheel" not in spec:
        spec["turbineWheel"] = num(mt.group(1))
    ma = re.search(r"([01]?\.\d{1,2})\s*A/R|A/R\s*:?\s*([01]?\.\d{1,2})", text, re.I)
    if ma:
        spec["ar"] = num(ma.group(1) or ma.group(2))
    mw = re.search(r"wastegate[^.]{0,40}?(\d{1,2}(?:\.\d)?)\s*psi|(\d{1,2}(?:\.\d)?)\s*psi\s*wastegate", text, re.I)
    if mw:
        spec["wastegatePsi"] = num(mw.group(1) or mw.group(2))
    if re.search(r"\bVGT\b|\bVNT\b|\bVG\b|variable[- ](?:geometry|vane)|HE351VE|HE300VG|HE400VG|HE451VE|GT3788|GT3782|GT37", name + " " + p["title"] + " " + text):
        spec["vgt"] = True
    elif re.search(r"HX35|HX40|HE351CW|wastegate|S300|S400|HY35", name + " " + p["title"] + " " + text, re.I):
        spec["vgt"] = False
    models = []
    for mm_ in TURBO_MODEL.finditer(name + " " + p["title"] + " " + " ".join(p["overview"])):
        v = mm_.group(1).upper()
        if v in ("VGT", "VNT", "LB7") or v in models:
            continue
        models.append(v)
    if models:
        spec["model"] = models[0]
    if re.search(r"Cheetah", name, re.I):
        spec["series"] = "Cheetah"
        if re.search(r"street", name, re.I):
            spec["series"] = "Cheetah Street"
    if re.search(r"\bFMW\b|forged mill(?:ed)? (?:compressor )?wheel", text, re.I):
        spec["compressorWheel"] = "FMW (forged milled)"
    if re.search(r"inconel", text, re.I):
        spec["turbineMaterial"] = "Inconel"
    hp, unit = parse_hp(text)
    if hp:
        spec["hpCapable"], spec["hpBasis"] = hp, unit
    mb = re.search(r"(\d{2})\s*-\s*(\d{2})\s*PSI of boost|(\d{2})\s*PSI of boost", text, re.I)
    if mb:
        spec["boostPsiMax"] = int(mb.group(2) or mb.group(3))
    if re.search(r"brand new", name, re.I) or re.search(r"no core charge", text, re.I):
        spec["condition"] = "new"
    elif re.search(r"core (?:charge|return)", text, re.I):
        spec["condition"] = "remanufactured, core exchange"
    if re.search(r"new actuator", text, re.I):
        spec["newActuator"] = True
    if re.search(r"exhaust brake", text, re.I):
        spec["exhaustBrake"] = True
    # HE400VG-style spec block: "Compressor wheel: Blade count: 7x7 Inducer: 64mm Exducer: 92mm Turbine wheel: Blade count: 11 Inducer: 72mm Exducer: 67mm"
    mcw = re.search(r"Compressor wheel:?\s*(?:Blade count:?\s*([\dx]+)\s*)?Inducer:?\s*(\d\d(?:\.\d)?)\s*mm\s*Exducer:?\s*(\d\d(?:\.\d)?)\s*mm", text, re.I)
    if mcw:
        spec["compressorInducer"], spec["compressorExducer"] = num(mcw.group(2)), num(mcw.group(3))
        if mcw.group(1):
            spec["compressorBlades"] = mcw.group(1)
    mtw = re.search(r"Turbine wheel:?\s*(?:Blade count:?\s*(\d+)\s*)?Inducer:?\s*(\d\d(?:\.\d)?)\s*mm\s*Exducer:?\s*(\d\d(?:\.\d)?)\s*mm", text, re.I)
    if mtw:
        spec["turbineWheel"], spec["turbineExducer"] = num(mtw.group(2)), num(mtw.group(3))
        if mtw.group(1):
            spec["turbineBlades"] = int(mtw.group(1))
    mfit = re.search(r"Fits (Cummins ISX[^.]{0,60}?)(?:\s*Replaces|\s*Prior|$)", text)
    if mfit:
        spec["applicationNote"] = mfit.group(1).strip()
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    else:
        refs = desc_pn_refs(text)
        if refs:
            spec["replacesOem"] = refs
    if "compressorInducer" not in spec:
        qa.append(f"{p['sku']}: turbo without a compressor wheel size on the page ({name})")
    return spec


def parse_lift_pump(p: dict, qa: list[str]) -> dict:
    name, text = p["name"], all_text(p)
    spec: dict = {}
    low = name.lower()
    if re.search(r"sureflo|sending unit", low):
        spec["type"] = "in-tank sending unit with pump"
    elif re.search(r"in-?tank", name + " " + p["title"] + " " + text, re.I):
        spec["type"] = "in-tank"
    elif re.search(r"frame[- ]mounted (?:lift )?pump|external (?:lift )?pump|inline (?:lift )?pump", text, re.I):
        spec["type"] = "frame-mounted"
    if re.search(r"fuel system upgrade|complete fuel system", low):
        spec["kit"] = True
    if re.search(r"under[- ]bed filter", low):
        spec["underBedFilter"] = True
    mg = re.search(r"(\d{2,3})\s*(?:GPH|gal(?:lons)?(?: per|/)\s*h(?:ou)?r)", text, re.I)
    if mg:
        spec["gph"] = int(mg.group(1))
    mp = re.search(r"(\d{1,2}(?:\.\d)?)\s*(?:-|–|to)\s*(\d{1,2}(?:\.\d)?)\s*psi", text, re.I)
    if mp:
        spec["psiLow"], spec["psiHigh"] = num(mp.group(1)), num(mp.group(2))
    else:
        mp1 = re.search(r"(\d{1,2}(?:\.\d)?)\s*psi", text, re.I)
        if mp1:
            spec["psi"] = num(mp1.group(1))
    mf = re.search(r"(\d{1,3})\s*micron", text, re.I)
    if mf:
        spec["filtration"] = f"{mf.group(1)} micron"
    hp, unit = parse_hp(text)
    if hp:
        spec["hpCapable"], spec["hpBasis"] = hp, unit
    if re.search(r"dual gerotor", text, re.I):
        spec["pumpType"] = "dual gerotor"
    mb = re.search(r"up to (\d{1,2})\s*%\s*bio", text, re.I)
    if mb:
        spec["biodieselMaxPct"] = int(mb.group(1))
    mbed = re.search(r"\b(short|long) bed\b", name + " " + p["title"], re.I)
    if mbed:
        spec["bed"] = mbed.group(1).lower()
    mcab = re.search(r"\b(crew|mega|quad|extended|regular)[ -]cab\b", name + " " + p["title"], re.I)
    if mcab:
        spec["cab"] = mcab.group(1).lower()
    mtank = re.search(r"(\d{2})[- ]gal(?:lon)?", name + " " + p["title"], re.I)
    if mtank:
        spec["tankGal"] = int(mtank.group(1))
    if re.search(r"cab (?:&|and) chassis|c&c|c-c", low):
        spec["cabChassis"] = True
        mloc = re.search(r"(midship|over[- ]rear[- ]axle|rear)\b", low)
        if mloc:
            spec["tankLocation"] = mloc.group(1).replace("-", " ")
    if re.search(r"not for use with cab (?:&|and) chassis", text, re.I):
        spec["cabChassis"] = False
    if re.search(r"retains the factory water-in-fuel sensor", text, re.I):
        spec["retainsWif"] = True
    mth = re.search(r"-(\d) O-ring fitting \((\d/\d\"?-\d\d) thread\)", text)
    if mth:
        spec["outletThread"] = f"{mth.group(2).replace(chr(34), ' in')} (-{mth.group(1)} ORB)"
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


def parse_injection_pump(p: dict, qa: list[str]) -> dict:
    name, text = p["name"], all_text(p)
    spec: dict = {}
    mt = re.search(r"\b(CP3|CP4)\b", name + " " + p["title"], re.I)
    if mt:
        spec["type"] = mt.group(1).upper()
    ms = re.search(r"(\d{1,2})\s*-?\s*mm\s*(?:stroker|stroke)", text, re.I) or re.search(r"-(\d{2})MM-", p["sku"])
    if ms:
        spec["strokerMm"] = int(ms.group(1))
    mm = re.search(r"PowerFlo\W*(750|1000)|\bCP3K\b|\bHD CP3\b", name, re.I)
    if mm:
        spec["model"] = ("PowerFlo " + mm.group(1)) if mm.group(1) else mm.group(0).upper()
    if re.search(r"conversion kit|\bkit\b", name, re.I):
        spec["kit"] = True
        if re.search(r"with (?:hd )?cp3", name, re.I):
            spec["kitIncludesPump"] = True
    if re.search(r"dual", name, re.I):
        spec["dual"] = True
    hp, unit = parse_hp(text)
    if hp:
        spec["hpCapable"], spec["hpBasis"] = hp, unit
    mr = re.search(r"(?:fuel delivery|full fuel) (?:to|through) (\d{1},?\d{3})\+?\s*RPM", text, re.I)
    if mr:
        spec["rpmHigh"] = int(mr.group(1).replace(",", ""))
    if re.search(r"no core charge", text, re.I) or re.search(r"new bosch|brand new|new oem", text, re.I) and not re.search(r"reman|core charge", text, re.I):
        spec["condition"] = "new"
    elif re.search(r"reman|core charge|core return", text, re.I):
        spec["condition"] = "remanufactured, core exchange"
    if re.search(r"unmodified FCA|stock FCA", text, re.I):
        spec["fca"] = "new OEM, unmodified"
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


def parse_head(p: dict, qa: list[str]) -> dict:
    name, text = p["name"], all_text(p)
    spec: dict = {}
    if re.search(r"aluminum|aluminium", text, re.I):
        spec["material"] = "aluminum"
    elif re.search(r"cast iron|\biron\b", text, re.I):
        spec["material"] = "cast iron"
    ms = re.search(r"\b(driver|passenger)\b", name, re.I)
    if ms:
        spec["side"] = "L" if ms.group(1).lower() == "driver" else "R"
    if re.search(r"cupless", name + " " + text, re.I):
        spec["injectorBore"] = "cupless"
    if re.search(r"\bbare\b", text, re.I):
        spec["bare"] = True
    elif re.search(r"assembled|complete|loaded|with valves", text, re.I):
        spec["bare"] = False
    mi = re.search(r"(\d\.\d{2,3})\s*(?:\"|in(?:ch)?)?\s*intake valve", text, re.I)
    if mi:
        spec["intakeValve"] = num(mi.group(1))
    me = re.search(r"(\d\.\d{2,3})\s*(?:\"|in(?:ch)?)?\s*exhaust valve", text, re.I)
    if me:
        spec["exhaustValve"] = num(me.group(1))
    mc = re.search(r"(\d{2,3}(?:\.\d)?)\s*cc\s*(?:combustion )?chamber", text, re.I)
    if mc:
        spec["chamberCc"] = num(mc.group(1))
    if re.search(r"Freedom Series", name, re.I):
        spec["series"] = "Freedom Series"
    mg = re.search(r"\((Street(?: - HD)?|Performance|Race|Competition|Stage \d)\)", name, re.I)
    if mg:
        spec["grade"] = mg.group(1).replace(" - ", " ")
    mi = re.search(r"(\d\.\d{2,3})\s*(?:\"|”)?\s*[\w ]{0,30}?intake valves?", text, re.I)
    if mi:
        spec["intakeValve"] = float(mi.group(1))
    me = re.search(r"(\d\.\d{2,3})\s*(?:\"|”)?\s*[\w ]{0,30}?exhaust valves?", text, re.I)
    if me:
        spec["exhaustValve"] = float(me.group(1))
    if re.search(r"inconel[\w ]{0,20}exhaust valves?", text, re.I):
        spec["exhaustValveMaterial"] = "Inconel"
    if re.search(r"stainless[\w ]{0,20}intake valves?", text, re.I):
        spec["intakeValveMaterial"] = "stainless"
    mfr = re.search(r"(\d\.\d{3})\s*(?:\"|”)?\s*diameter (?:fire )?rings", text, re.I)
    if mfr:
        spec["fireRingDia"] = float(mfr.group(1))
    if re.search(r"fire ring gasket kit", text, re.I):
        spec["fireRingGasketIncluded"] = True
    if re.search(r"fully assembled|ready to install", text, re.I):
        spec["bare"] = False
    if re.search(r"o-?ring(?:ed)? (?:groove|cut|the)", text, re.I) or re.search(r"fire ?ring", text, re.I):
        spec["fireRinged"] = True
    msp = re.search(r"(?<![\d.])(\d{2,3})\s*(?:#|lbs?)?\s*valve springs?", text, re.I)
    if msp:
        spec["valveSpringLb"] = int(msp.group(1))
    elif re.search(r"(?:new )?Cummins valve springs|stock valve springs|OEM valve springs", text, re.I):
        spec["valveSprings"] = "stock"
    if re.search(r"screw[- ]in freeze plugs", text, re.I):
        spec["screwInFreezePlugs"] = True
    if re.search(r"press-in valve seats", text, re.I):
        spec["valveSeats"] = "hardened oversized press-in"
    mhg = re.search(r"recommend the use of (?:Cummins )?(\d{7})(?: or Fleece Performance (FPE-[A-Z0-9.-]+))?", text)
    if mhg:
        spec["headGasketRec"] = [x for x in (mhg.group(1), mhg.group(2)) if x]
    if re.search(r"no core charge", text, re.I):
        spec["condition"] = "new"
    elif re.search(r"core (?:charge|return|and crate)", text, re.I):
        spec["condition"] = "remanufactured, core exchange"
    hp, unit = parse_hp(text)
    if hp:
        spec["hpCapable"], spec["hpBasis"] = hp, unit
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


FRACTION = {"1/4": 0.25, "5/16": 0.3125, "3/8": 0.375, "7/16": 0.4375, "1/2": 0.5, "9/16": 0.5625, "5/8": 0.625}


def parse_pushrod(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    md = re.search(r"(\d/\d{1,2})\s*(?:\"|”|in(?:ch)?)?\s*diameter|(\.\d{3})\s*(?:\"|”|in(?:ch)?)?\s*diameter", text, re.I)
    if md:
        spec["diameter"] = FRACTION.get(md.group(1)) if md.group(1) else float(md.group(2))
    mw = re.search(r"(\.\d{3})\s*(?:\"|”)?\s*wall", text, re.I)
    if mw:
        spec["wall"] = float(mw.group(1))
    ml = re.search(r"(\d{1,2}\.\d{2,3})\s*(?:\"|”|in(?:ch)?)\s*(?:long|length|overall)", text, re.I)
    if ml:
        spec["length"] = float(ml.group(1))
    elif re.search(r"factory length|stock length|OEM stock length", text, re.I):
        spec["lengthNote"] = "stock length"
    mm = re.search(r"(4130|4340|chrome ?moly(?:bdenum)?(?: steel)?)", text, re.I)
    if mm:
        spec["material"] = "4130 chromoly" if "4130" in text else mm.group(1)
    if re.search(r"cup ends|cup end", text, re.I):
        spec["ends"] = "cup"
    elif re.search(r"ball ends|ball end", text, re.I):
        spec["ends"] = "ball"
    if re.search(r"one-piece|1-piece", text, re.I):
        spec["onePiece"] = True
    mh = re.search(r"Rockwell\s*R?c\s*(\d{2})", text, re.I)
    if mh:
        spec["hardnessRc"] = int(mh.group(1))
    ms = re.search(r"Stage (\d)", p["name"])
    if ms:
        spec["grade"] = f"Stage {ms.group(1)}"
    if re.search(r"set of (\d+)|\((\d+) pushrods\)", text, re.I):
        m = re.search(r"set of (\d+)|\((\d+) pushrods\)", text, re.I)
        spec["qty"] = int(m.group(1) or m.group(2))
    return spec


def parse_spring(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    ms = re.search(r"(\d{2,3})\s*(?:#|lbs?)\s*(?:seat|installed|closed)|seat pressure of (\d{2,3})\s*(?:#|lbs?)", text, re.I) or \
        re.search(r"(\d{2,3})\s*#\s*valve springs?", text, re.I)
    if ms:
        spec["seatLb"] = int(ms.group(1) or ms.group(2))
    mo = re.search(r"(\d{2,3})\s*(?:#|lbs?)\s*(?:open|nose|at max(?:imum)? lift)|open pressure of (\d{2,3})\s*(?:#|lbs?)", text, re.I)
    if mo:
        spec["openLb"] = int(mo.group(1) or mo.group(2))
    mm = re.search(r"chrome silicon|chrome vanadium|\bH11\b|ovate", text, re.I)
    if mm:
        spec["material"] = mm.group(0).lower()
    if re.search(r"retainer", p["name"], re.I):
        spec["retainersIncluded"] = True
        mr = re.search(r"retainers are[^.]{0,30}?(4140|titanium|tool steel|chrome ?moly)", text, re.I)
        if mr:
            spec["retainerMaterial"] = mr.group(1)
    if re.search(r"does not include retainer locks", text, re.I):
        spec["locksIncluded"] = False
    mi = re.search(r"installed height:?\s*(\d\.\d{2,3})", text, re.I)
    if mi:
        spec["installedHt"] = float(mi.group(1))
    if re.search(r"dual spring|double spring", text, re.I):
        spec["dual"] = True
    mr = re.search(r"(\d{1,2},?\d{3})\s*\+?\s*RPM", text)
    if mr:
        spec["rpmHigh"] = int(mr.group(1).replace(",", ""))
    return spec


def parse_head_gasket(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    mt = re.search(r"(\d?\.\d{2,3})\s*(?:\"|”|in(?:ch)?)?\s*(?:thick|compressed)", text, re.I)
    if mt:
        spec["thickness"] = float(mt.group(1))
    mb = re.search(r"(\d\.\d{2,3})\s*(?:\"|”|in(?:ch)?)?\s*bore", text, re.I)
    if mb:
        spec["bore"] = float(mb.group(1))
    if re.search(r"\bMLS\b|multi-?layer", text, re.I):
        spec["material"] = "MLS"
    elif re.search(r"copper", text, re.I):
        spec["material"] = "copper"
    elif re.search(r"composite|graphite", text, re.I):
        spec["material"] = "composite"
    if re.search(r"fire ?ring", text, re.I):
        spec["fireRing"] = True
        mw = re.search(r"(0?\.\d{3})\s*(?:\"|”)?\s*stainless steel fire rings", text, re.I)
        if mw:
            spec["fireRingWire"] = float(mw.group(1))
    mfor = re.search(r"provided with Fleece Performance cylinder head part number:?\s*(FPE-[A-Z0-9-]+)", text)
    if mfor:
        spec["matchesHead"] = mfor.group(1)
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


def parse_fastener(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    ma = re.search(r"(head stud|head bolt|main stud|main bolt|rod bolt|exhaust manifold stud|manifold stud)s?", p["name"], re.I)
    if ma:
        spec["application"] = ma.group(1).lower()
    md = re.search(r"\bM?(\d{1,2})\s*mm\b|(\d/\d{1,2})\s*(?:\"|”)", p["name"])
    if md and not re.search(r"hex head|allen|socket", p["name"][md.start():md.end() + 20], re.I):
        spec["diameter"] = f"{md.group(1)} mm" if md.group(1) else FRACTION.get(md.group(2))
    mh = re.search(r"(\d{1,2})\s*mm (external hex|allen socket) head", p["name"], re.I)
    if mh:
        spec["head"] = f"{mh.group(1)} mm {mh.group(2).lower()}"
    mm = re.search(r"\b(ARP ?2000|ARP ?625\+?|L19|Custom Age 625\+?|8740|Custom 625|CA625\+?|(?:aged )?630 stainless(?: steel)?|stainless steel)\b", text, re.I)
    if mm:
        spec["material"] = mm.group(1)
    mt = re.search(r"(\d{2,3})\s*ft[- ]?lbs?", text, re.I)
    if mt:
        spec["torque"] = int(mt.group(1))
    if re.search(r"includes? 12 point nuts", text, re.I):
        spec["nutsIncluded"] = True
    return spec


def parse_lifter(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    if re.search(r"tappet|flat", text, re.I) and not re.search(r"roller", text, re.I):
        spec["style"] = "solid_flat"
    elif re.search(r"roller", text, re.I):
        spec["style"] = "solid_roller" if re.search(r"solid", text, re.I) else "hydraulic_roller"
    mf = re.search(r"(\d\.\d{2,3})\s*(?:\"|”)?\s*(?:foot|face)", text, re.I) or re.search(r"(\d\.\d{3})\s*(?:tool steel )?tappets?", p["name"], re.I)
    if mf:
        spec["footDia"] = float(mf.group(1))
    mm = re.search(r"\b(M2 tool steel|tool steel|8620|chilled iron|DLC)\b", text, re.I)
    if mm:
        spec["material"] = mm.group(1)
    mr = re.search(r"(\d{4,5})\s*\+?\s*rpm", text, re.I)
    if mr:
        spec["rpmHigh"] = int(mr.group(1))
    return spec


def parse_rocker(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    if re.search(r"OE replacement|direct fit replacement|OE alternative", text, re.I):
        spec["type"] = "OE replacement"
    if re.search(r"assembly", p["name"], re.I):
        spec["assembly"] = True
    mr = re.search(r"(\d\.\d{1,2})\s*:?\s*1?\s*ratio|ratio:?\s*(\d\.\d{1,2})", text, re.I)
    if mr:
        spec["ratio"] = float(mr.group(1) or mr.group(2))
    refs = desc_pn_refs(text)
    if refs:
        spec["replacesOem"] = refs
    return spec


def parse_intake(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    spec["type"] = "diesel intake plate" if re.search(r"plenum|plate", p["name"], re.I) else "efi"
    if re.search(r"cast aluminum", text, re.I):
        spec["material"] = "cast aluminum"
    elif re.search(r"billet", text, re.I):
        spec["material"] = "billet aluminum"
    if re.search(r"replaces the (?:troublesome )?factory grid heater", text, re.I):
        spec["replacesGridHeater"] = True
    if re.search(r"fits both pickup truck and cab (?:&|and) chassis", text, re.I):
        spec["cabChassis"] = True
    return spec


def parse_gasket(p: dict, qa: list[str]) -> dict:
    text = all_text(p)
    spec: dict = {}
    spec["set"] = "upper" if re.search(r"upper", p["name"], re.I) else "lower" if re.search(r"lower", p["name"], re.I) else "set"
    if re.search(r"no head gasket|without head gasket|-NHG\b", p["name"] + " " + p["sku"], re.I):
        spec["headGasketIncluded"] = False
    elif re.search(r"with head gasket|head gasket", p["name"], re.I):
        spec["headGasketIncluded"] = True
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


def desc_pn_refs(text: str) -> list[str]:
    out = []
    for m in re.finditer(r"(?:Replaces|Supersed\w+|alternative|Cross-?reference|Prior Part Numbers)[^.]{0,40}?P/?N'?s?:?\s*((?:[A-Z0-9-]{5,14}[,\s/]+)+)", text, re.I):
        for tok in re.split(r"[,\s/]+", m.group(1)):
            if re.search(r"\d{4}", tok) and tok not in out:
                out.append(tok)
    for m in re.finditer(r"Replaces (?:Cummins|Holset|Bosch|GM|Ford|Mopar) part number:?\s*([A-Z0-9-]{5,14})", text, re.I):
        if m.group(1) not in out:
            out.append(m.group(1))
    return out[:30]


def parse_generic(p: dict, qa: list[str]) -> dict:
    spec: dict = {}
    hp, unit = parse_hp(all_text(p))
    if hp:
        spec["hpCapable"], spec["hpBasis"] = hp, unit
    if p["interchange"]:
        spec["replacesOem"] = p["interchange"][:30]
    return spec


PARSERS = {"turbo": parse_turbo, "liftPump": parse_lift_pump, "injectionPump": parse_injection_pump, "head": parse_head,
           "pushrod": parse_pushrod, "spring": parse_spring, "headGasket": parse_head_gasket, "fastener": parse_fastener,
           "lifter": parse_lifter, "rocker": parse_rocker, "intake": parse_intake, "gasket": parse_gasket}


# --------------------------------------------------------------------------- emissions
def emissions_for(cat: str, p: dict) -> str | None:
    m = CARB_EO.search(p["cert"]) or CARB_EO.search(all_text(p))
    if m:
        return f"carb_eo:{m.group(1)}"
    if cat in ("turbo", "injectionPump", "injector", "manifold", "intercooler", "intake"):
        text = all_text(p) + " " + p["cert"]
        if re.search(r"race (?:use )?only|competition (?:use )?only|off-?road use only|not legal for (?:sale or use )?(?:on|in) (?:highway|california|pollution)|"
                     r"not for sale (?:on|in|to) (?:licensed )?california", text, re.I):
            return "no_eo_race_only"
        plain = re.sub(r"Fleece Performance( Engineering)?", "Fleece", text)
        if re.search(r"(?:stock|OEM|OE|factory|direct) replacement", plain, re.I) and not re.search(r"performance|upgrade|FMW|stroker|high flow", plain, re.I):
            return "oem_replacement"
        return "unknown"
    return None


# --------------------------------------------------------------------------- lift-pump fitment PDFs
# Transcribed from the two one-page PDFs (their merged-cell tables do not extract cleanly).
# Each row: make, model, years, cab, bed, tank PN, PowerFlo PNs, SureFlo PNs, locking ring / tank gal, note.
# Superscript footnote digits in the PDF ("FPE-345631" = FPE-34563 + footnote 1) are dropped.
TITAN_FITMENT = [
    ("GM", "2500 & 3500", "2004.5-2010", "Crew", "Short Bed", "7010201",
     [("FPE-34789", "MY2004.5-2007"), ("FPE-34790", "MY2007.5-2010")], [("FPE-SF-GM-0410", None)], True, None),
    ("GM", "2500 & 3500", "2004.5-2010", "Crew", "Long Bed", "7010301",
     [("FPE-34789", "MY2004.5-2007"), ("FPE-34790", "MY2007.5-2010")], [("FPE-SF-GM-0410", None)], False, None),
    ("GM", "2500 & 3500", "2011-2016", "Crew", "Short Bed", "7010211", [("FPE-34563", None)], [("FPE-SF-GM-1116-SB", None)], False, None),
    ("GM", "2500 & 3500", "2011-2016", "Extended", "Long Bed", "7010511", [("FPE-34564", None)], [("FPE-SF-GM-1116-LB", None)], False, None),
    ("GM", "2500 & 3500", "2011-2012, 2014-2016", "Crew", "Long Bed", "7010511", [("FPE-34564", None)], [("FPE-SF-GM-1116-LB", None)], False,
     "2014-2016: two piece driveshaft trucks only"),
    ("GM", "2500 & 3500", "2013-2016", "Crew", "Long Bed", "7010511", [("FPE-34564", None)], [("FPE-SF-GM-1116-LB", None)], False,
     "two piece driveshaft trucks only"),
    ("DODGE/RAM", "2500 & 3500", "2005-2012", "Crew", "Long Bed", "7030303",
     [("FPE-34560", "MY2005-09"), ("FPE-34561", "MY2010"), ("FPE-34562", "MY2011+")],
     [("FPE-SF-CUMM-0509", "MY2005-09"), ("FPE-SF-CUMM-2010", "MY2010"), ("FPE-SF-CUMM-1121", "MY2011+")], False, None),
    ("DODGE/RAM", "2500 & 3500", "2013-2024", "Crew or Quad", "Long Bed", "7030313", [("FPE-34562", None)], [("FPE-SF-CUMM-1121", None)], True, None),
    ("DODGE/RAM", "2500 & 3500", "2013-2024", "Mega", "Short Bed", "7030213", [("FPE-34562", None)], [("FPE-SF-CUMM-1121", None)], True, None),
    ("DODGE/RAM", "2500 & 3500", "2013-2024", "Crew 4x4 only", "Short Bed", "7030313", [("FPE-34562", None)], [("FPE-SF-CUMM-1121", None)], True, None),
    ("DODGE/RAM", "2500 & 3500", "2010-2012", "Crew", "Short Bed", "7030210",
     [("FPE-34561", "MY2010"), ("FPE-34562", "MY2011+")], [("FPE-SF-CUMM-2010", "MY2010"), ("FPE-SF-CUMM-1121", "MY2011+")], False, None),
    ("FORD", "F250 & F350", "2011-2016", "Crew", "Short Bed", "7021211", [("FPE-PF-FMC-1116-SB", None)], [("FPE-SF-FMC-1116-SB", None)], True, None),
    ("FORD", "F250 & F350", "2011-2016", "Crew", "Long Bed", "7020311", [("FPE-PF-FMC-1116-LB", None)], [("FPE-SF-FMC-1116-LB", None)], True, None),
]
SB_FITMENT = [
    ("DODGE/RAM", "2500 & 3500", "2005-2023", "Crew Cab / Quad Cab", "Short Bed", "10-1021-1",
     [("FPE-34560", "MY2005-09"), ("FPE-34561", "MY2010"), ("FPE-34562", "MY2011+")],
     [("FPE-SF-CUMM-0509", "MY2005-09"), ("FPE-SF-CUMM-10", "MY2010"), ("FPE-SF-CUMM-1121", "MY2011+")], 52, None),
    ("DODGE/RAM", "2500 & 3500", "2005-2012", "Crew Cab", "Long Bed", "10-1018",
     [("FPE-34560", "MY2005-09"), ("FPE-34561", "MY2010"), ("FPE-34562", "MY2011+")],
     [("FPE-SF-CUMM-0509", "MY2005-09"), ("FPE-SF-CUMM-10", "MY2010"), ("FPE-SF-CUMM-1121", "MY2011+")], 60, None),
    ("DODGE/RAM", "2500 & 3500", "2006-2024", "Mega Cab", "Short Bed", "10-1009",
     [("FPE-34560", "MY2005-09"), ("FPE-34561", "MY2010"), ("FPE-34562", "MY2011+")],
     [("FPE-SF-CUMM-0509", "MY2005-09"), ("FPE-SF-CUMM-10", "MY2010"), ("FPE-SF-CUMM-1121", "MY2011+")], 55, None),
    ("DODGE/RAM", "2500 & 3500", "2013-2024", "Crew Cab", "Long Bed", "10-1007", [("FPE-34562", None)], [("FPE-SF-CUMM-1121", None)], 60, None),
    ("FORD", "250 & 350", "2011-2016", "Crew Cab", "Short Bed", "10-1000", [("FPE-SF-FMC-1116-SB", None)], [("FPE-SF-FMC-1116-SB", None)], 56,
     "PDF prints the SureFlo PN in the PowerFlo column"),
    ("FORD", "250 & 350", "2011-2016", "Crew Cab", "Long Bed", "10-1003", [("FPE-SF-FMC-1116-LB", None)], [("FPE-SF-FMC-1116-LB", None)], 70,
     "PDF prints the SureFlo PN in the PowerFlo column"),
]


def pdf_text(path: pathlib.Path) -> str:
    import pdfplumber
    with pdfplumber.open(str(path)) as pdf:
        return "\n".join((pg.extract_text() or "") for pg in pdf.pages)


def verify_pdf_tables(stats) -> dict[str, str]:
    """Check that every PN / tank PN / year range in the transcriptions is printed in the PDFs.
    Returns {key: status text} for the notes file."""
    status = {}
    for key, rows in (("titan", TITAN_FITMENT), ("sb", SB_FITMENT)):
        path = DL / f"{key}_fitment.pdf"
        if not path.exists():
            status[key] = "PDF not downloaded; transcription unverified"
            stats.qa.append(f"{key} fitment PDF missing from dl/; transcription not verified against it")
            continue
        txt = pdf_text(path)
        flat = re.sub(r"\s+", " ", txt)
        missing = []
        for row in rows:
            tank = row[5]
            tokens = [tank] + [pn for pn, _ in row[6]] + [pn for pn, _ in row[7]] + [y.strip() for y in row[2].split(",")]
            for tok in tokens:
                if not re.search(re.escape(tok) + r"\d?(?![\w-])", flat):
                    missing.append(tok)
        n_pn = len({pn for row in rows for pn, _ in row[6] + row[7]})
        if missing:
            status[key] = f"{len(rows)} rows transcribed; NOT found in the PDF text: {sorted(set(missing))}"
            stats.qa.append(f"{key} fitment PDF: transcribed tokens not found in the PDF text: {sorted(set(missing))}")
        else:
            status[key] = f"{len(rows)} rows, {n_pn} Fleece PNs; every PN, tank PN and year range verified present in the PDF text"
    return status


def tank_fitment_for(pn: str) -> list[dict]:
    """PDF rows that list this Fleece PN (PowerFlo or SureFlo column)."""
    out = []
    for key, rows, brand in (("titan", TITAN_FITMENT, "Titan"), ("sb", SB_FITMENT, "S&B")):
        for make, model, years, cab, bed, tank, pf, sf, extra, note in rows:
            hit = [(x, my) for x, my in pf + sf if x == pn]
            if not hit:
                continue
            my = hit[0][1]
            ent = {"tank": f"{brand} {tank}", "make": make, "model": model, "years": years, "cab": cab, "bed": bed}
            if my:
                ent["pumpModelYears"] = my
            if brand == "Titan":
                ent["lockingRing"] = bool(extra)
            else:
                ent["tankGal"] = extra
            if note:
                ent["note"] = note
            out.append(ent)
    return out


# --------------------------------------------------------------------------- records
def make_name(cat: str, p: dict, spec: dict, fit: dict) -> str:
    bits = []
    yrs = f"{fit['y0']}-{fit['y1']}" if fit.get("y0") and fit.get("y1") and fit["y0"] != fit["y1"] else (str(fit["y0"]) if fit.get("y0") else None)
    if cat == "turbo":
        head = []
        if spec.get("series"):
            head.append(spec["series"])
        if spec.get("model"):
            head.append(spec["model"])
        head.append("turbo")
        bits.append(" ".join(head))
        if spec.get("compressorInducer"):
            bits.append(f"{spec['compressorInducer']:g} mm compressor")
        if spec.get("turbineWheel"):
            bits.append(f"{spec['turbineWheel']:g} mm turbine")
        if spec.get("vgt"):
            bits.append("VGT")
        if spec.get("hpCapable"):
            bits.append(f"to {spec['hpCapable']} {spec.get('hpBasis', 'HP')}")
    elif cat == "liftPump":
        kind = "SureFlo sending unit" if "sending unit" in spec.get("type", "") else "PowerFlo lift pump"
        if spec.get("kit"):
            kind = "fuel system kit with PowerFlo lift pump"
        bits.append(kind)
        if spec.get("bed"):
            bits.append(f"{spec['bed']} bed")
        if spec.get("tankGal"):
            bits.append(f"{spec['tankGal']} gal tank")
        if spec.get("cabChassis"):
            bits.append("cab & chassis")
        if spec.get("hpCapable"):
            bits.append(f"to {spec['hpCapable']} {spec.get('hpBasis', 'HP')}")
    elif cat == "injectionPump":
        head = [spec.get("model") or "", spec.get("type") or "injection", "pump kit" if spec.get("kit") else "pump"]
        bits.append(" ".join(x for x in head if x))
        if spec.get("strokerMm"):
            bits.append(f"{spec['strokerMm']} mm stroker")
        if spec.get("hpCapable"):
            bits.append(f"to {spec['hpCapable']} {spec.get('hpBasis', 'HP')}")
    elif cat == "head":
        bits.append(f"{spec.get('series', '')} cylinder head".strip())
        if spec.get("grade"):
            bits.append(spec["grade"])
        if spec.get("side"):
            bits.append("driver side" if spec["side"] == "L" else "passenger side")
        if spec.get("injectorBore"):
            bits.append(f"{spec['injectorBore']} injector bore")
        if spec.get("hpCapable"):
            bits.append(f"to {spec['hpCapable']} {spec.get('hpBasis', 'HP')}")
    elif cat == "pushrod":
        bits.append(f"{spec.get('grade', '')} pushrods".strip())
        if spec.get("diameter"):
            bits.append(f"{spec['diameter']:g} in dia")
        if spec.get("wall"):
            bits.append(f"{spec['wall']:g} wall")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "headGasket":
        bits.append("head gasket")
        if spec.get("thickness"):
            bits.append(f"{spec['thickness']:g} thick")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "fastener":
        bits.append(spec.get("application", "fastener") + " kit")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "spring":
        bits.append("valve spring and retainer set" if spec.get("retainersIncluded") else "valve springs")
        if spec.get("seatLb"):
            bits.append(f"{spec['seatLb']} lb seat")
        if spec.get("openLb"):
            bits.append(f"{spec['openLb']} lb open")
    elif cat == "rocker":
        bits.append(f"{spec.get('type', '')} rocker arm {'assembly' if spec.get('assembly') else ''}".strip())
    elif cat == "lifter":
        bits.append("flat tappets" if spec.get("style") == "solid_flat" else "lifters")
        if spec.get("footDia"):
            bits.append(f"{spec['footDia']:g} in foot")
        if spec.get("material"):
            bits.append(spec["material"])
    elif cat == "gasket":
        bits.append(f"{spec.get('set', '')} gasket set".strip())
        if spec.get("headGasketIncluded") is True:
            bits.append("with head gasket")
        elif spec.get("headGasketIncluded") is False:
            bits.append("without head gasket")
    elif cat == "intake":
        bits.append(spec.get("type", "intake"))
        if spec.get("replacesGridHeater"):
            bits.append("replaces grid heater plate")
    else:
        bits.append(cat)
    if yrs:
        bits.append(yrs)
    bits.append(fit["fam"])
    return ", ".join(bits)


class Stats:
    def __init__(self):
        self.skipped = collections.Counter()
        self.skipped_items = collections.defaultdict(list)
        self.qa = []
        self.unknown_fams = collections.Counter()
        self.fit_src = collections.Counter()
        self.unparsed_fit = []


def build(parsed: list[dict], stats: Stats) -> list[dict]:
    recs = []
    seen = set()
    for p in sorted(parsed, key=lambda x: x["slug"]):
        cat, why = classify(p)
        label = f"{p['sku']} {p['name']}"
        if cat is None:
            stats.skipped[why] += 1
            stats.skipped_items[why].append(label)
            continue
        if not p["sku"]:
            stats.skipped["no SKU in JSON-LD"] += 1
            stats.skipped_items["no SKU in JSON-LD"].append(label)
            continue
        fits, unparsed = fitment_from_lines(p["fitment"])
        for u in unparsed:
            stats.unparsed_fit.append(f"{p['sku']}: {u}")
        if not fits:
            fits = fitment_from_desc(p["desc"])
            if not fits:
                fits = fitment_from_name(p["name"], p["crumbs"])
            if fits:
                stats.qa.append(f"{p['sku']}: no usable Fitment tab; family from the {fits[0]['src']}: {p['name']} -> "
                                f"{[f['fam'] for f in fits]}")
        if not fits:
            stats.skipped["no fitment (tab, name or breadcrumb)"] += 1
            stats.skipped_items["no fitment (tab, name or breadcrumb)"].append(label)
            continue
        spec = PARSERS.get(cat, parse_generic)(p, stats.qa)
        if cat == "liftPump":
            tf = tank_fitment_for(p["sku"])
            if tf:
                spec["aftermarketTankFitment"] = tf
        if p["spec_kv"].get("UPC"):
            spec["upc"] = p["spec_kv"]["UPC"]
        ms = SEMA.search(p["cert"])
        if ms:
            spec["semaCert"] = ms.group(1)
        if p["availability"] == "Discontinued":
            spec["discontinued"] = True
        emis = emissions_for(cat, p)
        src = {"doc": DOC, "edition": EDITION, "url": p["url"]}
        if cat == "liftPump" and spec.get("aftermarketTankFitment"):
            src["alsoFrom"] = PDF_DOC
        for fit in fits:
            fam = fit["fam"]
            stats.fit_src[fit["src"]] += 1
            if fam not in FAM:
                stats.unknown_fams[fam] += 1
            key = (p["sku"], fam)
            if key in seen:
                stats.qa.append(f"{p['sku']}: duplicate SKU for {fam} (second page {p['url']} dropped)")
                continue
            seen.add(key)
            fitd = {"fam": fam}
            fitd.update(FAM.get(fam) or UNKNOWN_FAM.get(fam, {}))
            fitd["y0"], fitd["y1"] = fit["y0"], fit["y1"]
            fitd["notes"] = fit["notes"]
            recs.append(clean({
                "m": BRAND, "p": p["sku"], "cat": cat, "name": make_name(cat, p, spec, fitd),
                "fit": fitd, "spec": spec, "src": src,
            }) | {"emissions": emis})
    return recs


# --------------------------------------------------------------------------- validate
NUMERIC = {"compressorInducer", "turbineWheel", "ar", "wastegatePsi", "boostPsiMax", "hpCapable", "gph", "psi", "psiLow", "psiHigh",
           "strokerMm", "rpmHigh", "tankGal", "biodieselMaxPct", "intakeValve", "exhaustValve", "chamberCc", "valveSpringLb",
           "wall", "length", "hardnessRc", "qty", "seatLb", "openLb", "installedHt", "thickness", "bore", "torque",
           "compressorExducer", "turbineExducer", "turbineBlades", "footDia", "ratio", "fireRingDia", "fireRingWire"}


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
        if "emissions" not in r:
            errs.append(f"{r['p']}: missing emissions")
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
    return errs


# --------------------------------------------------------------------------- main
def main(argv):
    offline = "--offline" in argv
    refresh = "--refresh" in argv
    f = Fetcher(offline, refresh)
    urls, raw_pages, missing = fetch_all(f)
    log(f"pages available: {len(raw_pages)} / {len(urls)}; missing: {len(missing)}; "
        f"requests this run: {f.n_requests}; stopped: {f.stopped}")
    if "--fetch-only" in argv:
        return
    parsed = []
    not_product = []
    for u, body in raw_pages.items():
        p = parse_page(u, body.decode("utf-8", "replace"))
        if p is None:
            not_product.append(u)
        else:
            parsed.append(p)
    log(f"parsed {len(parsed)} product pages; {len(not_product)} pages without a Product JSON-LD")
    if "--dump" in argv:
        for p in parsed:
            print(json.dumps(p, ensure_ascii=False))
        return
    build_and_write(parsed, urls, missing, not_product, f)


def build_and_write(parsed, urls, missing, not_product, f):
    stats = Stats()
    pdf_status = verify_pdf_tables(stats)
    recs = build(parsed, stats)
    errs = validate(recs)
    for e in errs:
        log("VALIDATION:", e)
    if errs:
        sys.exit(1)
    OUT.mkdir(exist_ok=True)
    robots_txt = (DL / "robots.txt").read_text(encoding="utf-8") if (DL / "robots.txt").exists() else ""
    doc = {
        "source": {
            "task": "FLEECE", "brand": BRAND, "doc": DOC, "edition": EDITION, "host": HOST,
            "sitemap": f"https://{HOST}/sitemap.xml",
            "fitmentPdfs": [f"https://{HOST}{p}" for p in PDFS.values()],
            "robots": "no Crawl-delay; /catalog/product/view/, /catalog/category/view/ and /index.php/ disallowed (not requested)",
            "userAgent": UA,
            "productPages": len(parsed), "pagesMissing": len(missing),
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "fleece.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(recs, stats, parsed, urls, missing, not_product, f, pdf_status)
    print(f"wrote out/fleece.json: {len(recs)} records, {len({r['p'] for r in recs})} distinct PNs; out/fleece.md")


def write_notes(recs, stats: Stats, parsed, urls, missing, not_product, f, pdf_status):
    n_req = sum(1 for _ in open(DL / "fetch_log.jsonl", encoding="utf-8")) if (DL / "fetch_log.jsonl").exists() else 0
    by_cat = collections.Counter(r["cat"] for r in recs)
    by_fam = collections.Counter((r["fit"]["fam"], r["cat"]) for r in recs)
    by_em = collections.Counter("null" if r["emissions"] is None else r["emissions"] for r in recs)
    L = []
    L.append("# FLEECE extraction notes (Fleece Performance Engineering)\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_fleece.py`. Source: `https://{HOST}/sitemap.xml` -> "
             f"product pages (Magento, JSON-LD `Product` + Fitment / Interchange / Specifications / Certifications tabs) and the "
             f"two lift-pump fitment PDFs linked from `/resources`.\n")
    L.append("## Fetch\n")
    L.append(f"- robots.txt: status {f.robots_status if f.robots_status is not None else 'cached'}; no Crawl-delay for any agent; "
             f"`/catalog/product/view/`, `/catalog/category/view/`, `/index.php/` and the Magento system paths are disallowed and were "
             f"never requested (products are reached by their clean root-level `.html` URLs, which are allowed). Requests spaced "
             f"{MIN_DELAY:g} s apart, one at a time, UA `{UA}`.")
    L.append(f"- Sitemap: 1 request, {len(urls)} product URLs (root-level `.html` entries with `<priority>1.0</priority>`; the 11 root-level "
             f"category pages carry 0.5 and the ~430 nested `/dodge/...`, `/chevy-gmc/...`, `/ford/...` entries are category listings; "
             f"neither were fetched).")
    L.append(f"- Product pages fetched: {len(parsed)} parsed as products, {len(not_product)} without a Product JSON-LD, "
             f"{len(missing)} not retrieved{' (stopped: ' + f.stopped + ')' if f.stopped else ''}. "
             f"Fitment PDFs: 2 requests. Total requests logged in `dl/fleece/fetch_log.jsonl` across all runs: {n_req}.")
    L.append("- Before the scripted crawl, the probe fetched robots.txt, the sitemap, the two PDFs, `/resources` and three product pages "
             "by hand with the same UA and spacing (8 requests, not in the log); the script reused those cached files. Three product "
             "pages failed once on a proxy disconnect (not a site refusal) and were fetched on the next run.")
    L.append("- Prices (USD, in the JSON-LD offers) are not stored. Pages are cached under `dl/fleece/pages/` (gitignored).\n")
    L.append("## Records\n")
    L.append(f"Total records: **{len(recs)}** ({len({r['p'] for r in recs})} distinct part numbers; a part that fits several engine "
             f"families is one record per family with the same `p`)\n")
    L.append("| cat | records |\n|---|---|")
    for c, n in sorted(by_cat.items()):
        L.append(f"| {c} | {n} |")
    L.append("\n| fit.fam | cat | records |\n|---|---|---|")
    for (fam, c), n in sorted(by_fam.items()):
        flag = "" if fam in FAM else " *(not in cam-fitment.json)*"
        L.append(f"| {fam}{flag} | {c} | {n} |")
    L.append("\n| emissions | records |\n|---|---|")
    for e, n in sorted(by_em.items(), key=lambda x: -x[1]):
        L.append(f"| `{e}` | {n} |")
    L.append(f"\nFitment source: {dict(stats.fit_src)} (records).\n")
    L.append("## How fields were derived\n")
    L.append("- **Scope**: Fleece's own catalog only (`m` = Fleece Performance for every record; the JSON-LD brand on every page is "
             "'Fleece Performance Engineering'). Emitted categories: `turbo` (Cheetah turbochargers), `liftPump` (PowerFlo in-tank lift "
             "pumps, SureFlo sending units, fuel-system kits built around a PowerFlo pump), `injectionPump` (CP3K, PowerFlo 750 / 1000 "
             "CP3 pumps, LML CP3 conversion kits that include the pump) and `head` (Freedom Series cylinder heads). Everything else on "
             "the site (fittings, hoses, pigtails, harnesses, billet caps and covers, coolant bypass kits, fuel lines, turbo drains and "
             "install kits, CP3 fittings and brackets, short/long blocks, fluids, apparel) is skipped and counted below.")
    L.append("- **Part number** `p` is the JSON-LD `sku` (identical to `mpn` on every page). `spec.upc` is the UPC from the "
             "Specifications tab. `spec.semaCert` is the SEMA Garage certificate number from the Certifications tab.")
    L.append("- **Fitment** comes from the page's Fitment tab, one line per model year (`2013 Ram 2500/3500 6.7L 24V Cummins`). Lines are "
             "grouped by engine family: `y0`/`y1` = min/max model year (half-year model breaks are floored and kept as `from 2007.5` in "
             "`fit.notes`), the vehicle wording (`Ram 2500/3500`) and Duramax engine codes go to `fit.notes`. `5.9L Cummins` lines "
             "resolve to `Cummins 5.9 12V` for 1998 and earlier and `Cummins 5.9 24V/CR` from 1998.5 unless the line says 12V/24V. "
             "Pages without a usable Fitment tab fall back to the year range and engine words in the product name, then to the "
             "breadcrumb (`Dodge (Cummins)` > `2013-2018 (6.7L)`); each such record is flagged below.")
    L.append("- **Turbos**: `compressorInducer` (mm) from `63mm FMW Compressor Wheel` / `63/67` in the name; `turbineWheel` when the page "
             "quotes a turbine size; `vgt` true for VGT/VNT/HE351VE/HE300VG/GT37xx units, false for HX35 / wastegated units; `model` the "
             "Holset/Garrett frame when named; `series` Cheetah / Cheetah Street; `compressorWheel` FMW (Fleece's forged-milled wheel); "
             "`turbineMaterial` Inconel when stated; `hpCapable` + `hpBasis` from 'Capable of supporting vehicle modifications up to 700 "
             "RWHP' (`hpBasis` is `RWHP` or `HP`, exactly as the page quotes it); `newActuator`, `exhaustBrake` (page says OEM exhaust-brake "
             "function is retained); `condition` 'new' when the name says Brand New, else 'remanufactured, core exchange' when a core "
             "charge is mentioned; `replacesOem` = the Interchange tab (OEM part numbers the unit replaces, max 30).")
    L.append("- **Lift pumps**: `type` in-tank / in-tank sending unit with pump (SureFlo) / frame-mounted; `hpCapable` ('up to 800 hp'); "
             "`psiLow`/`psiHigh` from 'Operating Pressure: 18-20 psi'; `gph` and `filtration` when quoted; `pumpType` dual gerotor; "
             "`biodieselMaxPct`; `bed`, `cab`, `tankGal`, `cabChassis`, `tankLocation` from the name; `retainsWif` (factory water-in-fuel "
             "sensor retained); `outletThread`; `kit` for the complete fuel-system kits; `replacesOem` = Interchange tab. "
             "`aftermarketTankFitment` lists the rows of the Titan / S&B fitment PDFs that name the pump (tank PN, cab, bed, years, "
             "locking-ring or tank gallons).")
    L.append("- **Injection pumps**: `type` CP3/CP4; `model` CP3K / PowerFlo 750 / PowerFlo 1000; `strokerMm` (10/12 mm stroker, from the "
             "text or the `-12MM-` SKU segment); `hpCapable` + `hpBasis`; `rpmHigh` ('full fuel delivery to 6,000+ RPM'); `kit` and "
             "`kitIncludesPump` for the LML conversion kits; `condition`; `fca` when the page says the FCA is new and unmodified; "
             "`replacesOem` = Interchange tab (Bosch / Mopar / GM numbers).")
    L.append("- **Heads**: `material`, `side` (L = driver), `injectorBore` cupless, `bare`, valve sizes / chamber cc only when the page "
             "quotes them, `series` Freedom Series.")
    L.append("- **emissions**: `carb_eo:D-xxx-xx` from the Certifications tab ('CARB EO# D-834-2'; Fleece holds EO D-834-* on most of its "
             "turbos, lift pumps and CP3 pumps). Turbos / injection pumps without an EO: `no_eo_race_only` if the page says race/competition "
             "use only, `oem_replacement` if described as a stock replacement with no performance claim, else `unknown`. Lift pumps and "
             "heads without an EO: `null` (internal / fuel-supply parts). No DPF/DOC/SCR/EGR delete products were found on the site; the "
             "'Duramax turbo thermostat delete plug' is a coolant-thermostat plug, not an emissions part, and is skipped as hardware anyway.")
    L.append("\n## Lift-pump fitment PDFs\n")
    for key, label in (("titan", "Fleece_and_Titan_Powerflo_Fitment.pdf"), ("sb", "Fleece_SB_PF_SF_Fitment.pdf")):
        L.append(f"- `{label}`: {pdf_status.get(key, 'not checked')}.")
    L.append("- Both are one-page tables with merged cells (pdfplumber returns one row per table), so the rows are transcribed in "
             "`TITAN_FITMENT` / `SB_FITMENT` in the script and verified token-by-token against the PDF text on every run. The PDFs are undated.")
    L.append("- The MY2010 Cummins SureFlo is printed as `FPE-SF-CUMM-2010` in the Titan PDF and `FPE-SF-CUMM-10` in the S&B PDF; both are "
             "kept as printed (see QA). The S&B PDF prints the SureFlo PN in the PowerFlo column for the two Ford rows; kept as printed and "
             "noted on those rows.")
    L.append("\n## Skipped\n")
    for why, n in stats.skipped.most_common():
        L.append(f"- **{why}**: {n}")
        for lab in stats.skipped_items[why][:8]:
            L.append(f"  - {lab}")
        if n > 8:
            L.append(f"  - ... {n - 8} more")
    if not_product:
        L.append(f"- **pages without a Product JSON-LD (not products)**: {len(not_product)}")
        for u in not_product[:8]:
            L.append(f"  - {u}")
    if missing:
        L.append(f"- **pages not retrieved**: {len(missing)}")
        for u in missing[:8]:
            L.append(f"  - {u}")
    L.append("\n## Needs human QA\n")
    if stats.unknown_fams:
        L.append("Families not in `cam-fitment.json` (catalog wording kept in `fit.fam`):\n")
        for fam, n in sorted(stats.unknown_fams.items()):
            L.append(f"- `{fam}`: {n} record(s)")
        L.append("")
    if stats.unparsed_fit:
        L.append("Fitment-tab lines that could not be mapped to an engine family (ignored):\n")
        for x in stats.unparsed_fit[:40]:
            L.append(f"- {x}")
        if len(stats.unparsed_fit) > 40:
            L.append(f"- ... {len(stats.unparsed_fit) - 40} more")
        L.append("")
    L.append("Judgement calls:\n")
    L.append("- `hpCapable` is the vehicle power the page says the part supports (mostly quoted at the rear wheels, `hpBasis: RWHP`), not a "
             "rating of the part itself.")
    L.append("- Cheetah turbos are built on Holset / Garrett cores with Fleece's FMW compressor wheel; `condition` is 'remanufactured, core "
             "exchange' whenever the page carries a core charge, 'new' only when the name says Brand New.")
    L.append("- SureFlo 'performance sending units' are complete in-tank sending units with the PowerFlo pump built in; they are filed as "
             "`liftPump` with `type: in-tank sending unit with pump`.")
    L.append("- The LML 'CP3 conversion hardware kit (no pump)' is skipped; the conversion kits that include a CP3 are `injectionPump` with "
             "`kit: true`, `kitIncludesPump: true`.")
    L.append("- Heavy-duty Cummins ISX/QSX turbos are kept under `fit.fam: Cummins ISX/QSX` (not a shared family).")
    L.append("")
    if stats.qa:
        L.append("Per-record flags:\n")
        for q in stats.qa:
            L.append(f"- {q}")
    L.append("\n## Validation\n")
    L.append("Passed: no duplicate `p` within brand+family, every record has `m p cat name fit.fam src emissions`, numeric fields are "
             "numbers, years are integers, no empty strings or empty lists.")
    (OUT / "fleece.md").write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])
