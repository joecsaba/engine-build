#!/usr/bin/env python3
"""Parts catalog extractor: HAMILTON (Hamilton Cams, Cummins diesel valvetrain).

Sources
  1. WooCommerce Store API, `https://hamiltoncams.com/wp-json/wc/store/v1/products?per_page=100&page=N`
     (public, not disallowed by robots.txt). 52 products in one page; name, sku, categories
     (engine-year groups), attributes, short_description, description (HTML).
  2. One product page per part (`permalink`): the "Vehicle Fitment" tab table
     (`table#ymm_applicable_list`: Make | Model | Year) and the JSON-LD Product block (sku
     cross-check). Pages are fetched only for products that produce a record.

Everything fetched is cached under `dl/hamilton/` (gitignored) so the parse step is
re-runnable offline. Requests are spaced 6 s apart; a 403 / challenge page stops the source.

    python -I scripts/parts-catalog/extract_hamilton.py             # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_hamilton.py --offline   # parse the cache only
    python -I scripts/parts-catalog/extract_hamilton.py --refresh   # re-fetch everything

Writes `out/hamilton.json`. Nothing is written outside `dl/` and `out/`.
The notes file `out/hamilton.md` is written by hand from the run summary this script prints.
"""
from __future__ import annotations

import datetime as dt
import html as htmlmod
import json
import pathlib
import re
import sys
import time
import urllib.robotparser

HERE = pathlib.Path(__file__).resolve().parent
DL = HERE / "dl" / "hamilton"
OUT = HERE / "out"
HOST = "hamiltoncams.com"
API = f"https://{HOST}/wp-json/wc/store/v1/products?per_page=100&page={{page}}"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
BRAND = "Hamilton Cams"
DOC = "hamiltoncams.com WooCommerce Store API + product page fitment table"
EDITION = dt.date.today().strftime("%Y-%m")

# Store API category name -> (fit.fam, y0, y1, sub-range label). y1 None = open-ended.
CAT_FAM = {
    "1989–1998 12-Valve 5.9L Cummins": ("Cummins 5.9 12V", 1989, 1998, "1989–1998 12V"),
    "1998.5–2002 5.9L Cummins": ("Cummins 5.9 24V/CR", 1998, 2002, "1998.5–2002 24V VP44"),
    "2003–2007 5.9L Cummins": ("Cummins 5.9 24V/CR", 2003, 2007, "2003–2007 common rail"),
    "2007.5–2018 6.7L Cummins": ("Cummins 6.7", 2007, 2018, "2007.5–2018"),
    "2019–2024 6.7L Cummins": ("Cummins 6.7", 2019, 2024, "2019–2024"),
    "2025+ 6.7L Cummins": ("Cummins 6.7", 2025, None, "2025+"),
}
FAM_CI = {"Cummins 5.9 12V": 359, "Cummins 5.9 24V/CR": 359, "Cummins 6.7": 408}
CYL = 6

CHALLENGE = ("Just a moment", "cf-challenge", "_Incapsula_", "Access Denied", "px-captcha",
             "Please verify you are a human", "Attention Required")


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html(h: str) -> str:
    """HTML -> one text line per block element, entities decoded, whitespace collapsed."""
    t = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>|</tr>|</div>", "\n", h or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = htmlmod.unescape(t).replace(" ", " ")
    return "\n".join(" ".join(l.split()) for l in t.splitlines() if l.strip())


def num(s: str) -> float | int:
    s = s.replace(",", "")
    return float(s) if "." in s else int(s)


def inch(s: str) -> float:
    """'.056' / '0.056' / '4.560' -> float inches."""
    return float(s.replace("″", "").replace('"', ""))


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
        self.stopped = None
        DL.mkdir(parents=True, exist_ok=True)
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
        txt = r.text if r.status_code == 200 else ""
        (DL / "robots.txt").write_text(f"# status {r.status_code}\n{txt}", encoding="utf-8")
        self.rp = urllib.robotparser.RobotFileParser()
        self.rp.parse(txt.splitlines())
        self.delay = max(MIN_DELAY, self.rp.crawl_delay(UA) or self.rp.crawl_delay("*") or 0)
        log(f"robots.txt: status {r.status_code}, delay {self.delay}s")

    def get(self, url: str, cache: pathlib.Path, accept: str) -> bytes | None:
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
            r = self.session.get(url, headers={"Accept": accept}, timeout=60, allow_redirects=True)
        except Exception as e:  # network error: record and go on (cache may still have it)
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


def fetch_products(f: Fetcher) -> list[dict]:
    products = []
    page = 1
    while True:
        body = f.get(API.format(page=page), DL / f"products_p{page}.json", "application/json")
        if body is None:
            if page == 1:
                sys.exit("no Store API data (offline without cache, or fetch stopped)")
            break
        items = json.loads(body)
        if not items:
            break
        products.extend(items)
        if len(items) < 100:
            break
        page += 1
    # de-dupe by id (defensive: WooCommerce paging can repeat items when stock changes)
    seen, out = set(), []
    for p in products:
        if p["id"] not in seen:
            seen.add(p["id"])
            out.append(p)
    return out


def fetch_page(f: Fetcher, product: dict) -> str | None:
    slug = product["slug"]
    body = f.get(product["permalink"], DL / f"page_{slug}.html", "text/html")
    return body.decode("utf-8", "replace") if body else None


# --------------------------------------------------------------------------- product pages
def parse_page(html: str) -> dict:
    """Vehicle Fitment table rows + JSON-LD Product sku."""
    from bs4 import BeautifulSoup
    s = BeautifulSoup(html, "html.parser")
    out = {"vehicles": [], "jsonld_sku": None}
    tb = s.find("table", id="ymm_applicable_list")
    if tb:
        for tr in tb.find_all("tr"):
            cells = [" ".join(c.get_text(" ", strip=True).split()) for c in tr.find_all(["th", "td"])]
            if len(cells) != 3 or cells[0] == "Make":
                continue
            make, model, years = cells
            m = re.match(r"(\d{4})\s*-\s*(\d{4})$", years)
            v = {"make": make, "model": model}
            if m:
                v["y0"], v["y1"] = int(m.group(1)), int(m.group(2))
            else:
                v["years"] = years
            out["vehicles"].append(v)
    for sc in s.find_all("script", type="application/ld+json"):
        try:
            j = json.loads(sc.string or sc.get_text())
        except Exception:
            continue
        for node in j.get("@graph", [j]) if isinstance(j, dict) else []:
            if node.get("@type") == "Product":
                sku = node.get("sku")
                # WooCommerce emits the numeric product id as `sku` when the product has none
                out["jsonld_sku"] = sku if isinstance(sku, str) and not sku.isdigit() else None
    return out


# --------------------------------------------------------------------------- classification
TOOL_RE = re.compile(r"\btool\b|puller|barring|holder|tray kit", re.I)


def classify(p: dict) -> tuple[str | None, str]:
    """-> (cat, reason). cat None = skipped."""
    cats = {c["name"] for c in p["categories"]}
    name = htmlmod.unescape(p["name"])
    if "Apparel" in cats:
        return None, "apparel"
    if re.search(r"tool steel retainers", name, re.I):
        return "retainer", ""
    if "Install Tools" in cats or TOOL_RE.search(name):
        return None, "tool"
    if "Blocks" in cats:
        return None, "engine block (no shared cat)"
    if re.search(r"zinc additive", name, re.I):
        return None, "oil additive"
    if "CamShafts" in cats:
        if re.search(r"\bkey\b", name, re.I):
            return None, "cam key (no shared cat)"
        return "cam", ""
    if "Valve Springs" in cats:
        return "spring", ""
    if "Pushrods" in cats:
        return "pushrod", ""
    if "Gaskets" in cats:
        if re.search(r"head ?gasket|fire ring", name, re.I) and not re.search(r"\bkit\b", name, re.I):
            return "headGasket", ""
        return "gasket", ""
    if "Lifters/Tappets" in cats:
        return "lifter", ""
    if re.search(r"rocker arm", name, re.I):
        return "rocker", ""
    if re.search(r"cam bearings", name, re.I):
        return "bearing", ""
    if re.search(r"cam retainer", name, re.I):
        return None, "cam gear retainer / thrust plate (no shared cat)"
    if re.search(r"bridges", name, re.I):
        return None, "valve bridges (no shared cat)"
    return None, "unclassified"


# --------------------------------------------------------------------------- fitment
def families(p: dict) -> list[dict]:
    """One fit dict per shared family, merging the engine-year categories."""
    groups: dict[str, list] = {}
    for c in p["categories"]:
        if c["name"] in CAT_FAM:
            fam, y0, y1, label = CAT_FAM[c["name"]]
            groups.setdefault(fam, []).append((y0, y1, label))
    fits = []
    for fam, spans in groups.items():
        spans.sort(key=lambda s: s[0])
        y0 = spans[0][0]
        y1s = [s[1] for s in spans]
        y1 = None if None in y1s else max(y1s)
        fit = {"fam": fam, "ci": [FAM_CI[fam]], "cyl": CYL, "y0": y0}
        if y1 is not None:
            fit["y1"] = y1
        fit["notes"] = "; ".join(s[2] for s in spans)
        fits.append(fit)
    return fits


# --------------------------------------------------------------------------- spec parsers
def parse_cam(name: str, text: str, p: dict) -> tuple[dict, list[str], list[str]]:
    """-> (spec, fit notes, qa flags)."""
    spec, notes, qa = {}, [], []
    dur = (re.search(r"Duration at \.050. of lift\s*(\d{3}) Intake,\s*(\d{3}) Exhaust", text)
           or re.search(r"(\d{3})° intake / (\d{3})° exhaust on a ([\d.]+)° LSA", text))
    if dur:
        spec["dur050Int"], spec["dur050Exh"] = int(dur.group(1)), int(dur.group(2))
        if dur.lastindex == 3:
            spec["lsa"] = num(dur.group(3))
    else:
        m_i = re.search(r"Intake\s*:\s*(\d{3})° @ \.050″ duration / (\.\d{3})″ lift", text)
        m_e = re.search(r"Exhaust\s*:\s*(\d{3})° @ \.050″ duration / (\.\d{3})″ lift", text)
        if m_i and m_e:
            spec["dur050Int"], spec["dur050Exh"] = int(m_i.group(1)), int(m_e.group(1))
            spec["liftInt"], spec["liftExh"] = inch(m_i.group(2)), inch(m_e.group(2))
        else:
            m = (re.search(r"(\d{3})/(\d{3}) (?:Forged )?[Cc]amshaft", text)
                 or re.search(r"(\d{3})[-/](\d{3}) steel cams", text))
            if m:
                spec["dur050Int"], spec["dur050Exh"] = int(m.group(1)), int(m.group(2))
            else:
                m = re.search(r"Our (\d{3}) steel cams", text)
                if m:
                    spec["dur050Int"] = int(m.group(1))
                    qa.append("only the intake duration is stated")
    m = re.search(r"Lobe Separation Angle \(LSA\)\s*:\s*([\d.]+)°", text)
    if m:
        spec["lsa"] = num(m.group(1))
    m = re.search(r"(\.\d{3}) intake lift (\.\d{3}) exhaust lift", text)
    if m:
        spec["liftInt"], spec["liftExh"] = inch(m.group(1)), inch(m.group(2))
    m = re.search(r"RPM Range:\s*(Idle|[\d,]+)-([\d,]+)", text, re.I)
    if m:
        if m.group(1).lower() != "idle":
            spec["rpmLow"] = int(m.group(1).replace(",", ""))
        else:
            spec["rpmLowText"] = "idle"
        spec["rpmHigh"] = int(m.group(2).replace(",", ""))
    if re.search(r"Operation above 4,000 RPM|do not exceed 4,000 ?rpm", text):
        spec.setdefault("rpmHigh", 4000)
    if re.search(r"\(\.010″ intake/\.020″ exhaust\)|Intake Valve Lash\s*:\s*0\.010″", text):
        spec["lashInt"], spec["lashExh"] = 0.010, 0.020
    # type / material
    if re.search(r"roller cam", name, re.I):
        spec["type"] = "hydraulic_roller"
        notes.append("for the factory hydraulic roller lifters, retains OEM pushrods")
    else:
        spec["type"] = "solid_flat"
    if re.search(r"\bcast\b", name, re.I):
        spec["material"] = "cast"
    elif re.search(r"\bsteel\b", name, re.I) or re.search(r"Forged (?:Steel )?[Cc]amshafts?", text):
        spec["material"] = "forged steel" if re.search(r"forged", text, re.I) else "steel"
    if re.search(r"OEM replacement|OEM Replacement|factory cam profile|original lift and duration", text):
        spec["grind"] = "OEM replacement"
        notes.append("stock-profile replacement")
        if p["id"] == 9199 and "dur050Int" not in spec:
            # The 07-cc-OEMCR combo lists this same cam as "161/191 Camshaft (fits 07.5-2018)".
            spec["dur050Int"], spec["dur050Exh"] = 161, 191
            notes.append("161/191 @ .050 taken from the 07-cc-OEMCR combo listing")
            qa.append("duration inferred from the combo listing, not stated on this page")
    # combos / kits
    inc = re.search(r"What.s included:\n((?:.+\n){1,6})", text)
    comes = re.search(r"It comes with\n((?:– .+\n){1,5})", text)
    items = []
    if inc or comes:
        for l in (inc or comes).group(1).splitlines():
            l = l.strip("– -")
            if not l or l.endswith(":") or len(l) > 70:  # next heading / prose paragraph
                break
            items.append(l)
    elif re.search(r"conversion kit", name, re.I):
        # 2025-2026 kit lists its parts as section headings, not bullets
        items = [h for h in ("Forged Steel Camshafts", "DLC-Coated Tappets", "Heavy-Duty Pushrods",
                             "Upgraded Rocker Arms") if re.search(rf"^{re.escape(h)}$", text, re.M)]
    if items:
        spec["components"] = items
        # Component PNs are inferred by matching each bullet to the standalone listing
        # (103 lb springs = 07-s-003, 155 lb = 07-s-001, 12V/24V pushrods = 07-p-002/004).
        # The 2019+ conversion kits use parts that are not sold separately: no PNs there.
        combo = bool(re.search(r"\bcombo\b", name, re.I))
        kit = {}
        for it in items:
            if re.search(r"103", it) and re.search(r"spring", it, re.I):
                kit["springs"] = "07-s-003"
            elif re.search(r"155", it) and re.search(r"spring", it, re.I):
                kit["springs"] = "07-s-001"
            elif re.search(r"Extreme duty pushrods", it, re.I) and combo and "12 Valve" in name:
                kit["pushrods"] = "07-p-002"
            elif re.search(r"Heavy duty pushrods", it, re.I) and combo and "24" in name:
                kit["pushrods"] = "07-p-004"
            elif re.search(r"pushrods", it, re.I):
                kit.setdefault("pushrods", "heavy-duty pushrods (PN not stated)")
            elif re.search(r"DLC[- ]coated (?:steel )?tappets", it, re.I):
                kit["lifters"] = "DLC coated steel tappets (PN not stated)"
            elif re.search(r"tappets|lifters", it, re.I):
                kit["lifters"] = "1.45 in tappets (PN not stated)"
            elif re.search(r"retainers and locks", it, re.I):
                kit["retainers"] = "included with 07-s-001"
            elif re.search(r"rocker arms", it, re.I):
                kit["rockers"] = "adjustable rockers, DLC trunnions (PN not stated)"
        spec["kit"] = kit
    if re.search(r"at least two bushings installed in the cam tunnel", text):
        notes.append("steel cam: needs at least two cam-tunnel bushings")
    if re.search(r"Use Hamilton Cams 1\.45-inch lifters", text):
        notes.append("requires 1.45 in tappets")
    if re.search(r"not recommended for daily driving|competition-only", text, re.I):
        notes.append("competition only")
    if re.search(r"SEMA-Certified \(49-State Compliance\)|49 state (?:certified|EPA)", text):
        notes.append("49-state emissions certified (not CA)")
    elif re.search(r"Meets 49 state EPA standards on 1998-2024 5\.9l and 6\.7l", text):
        notes.append("49-state EPA on 1998–2024 5.9/6.7; 12V certification pending")
    if re.search(r"Not for sale in the state of CA", text):
        notes.append("not for sale in CA")
    if re.search(r"Backorder availability", text):
        notes.append("listed on backorder")
    return spec, notes, qa


def parse_spring(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {}, [], []
    # Title first ("103# 24v springs", "110 Valve Spring set"); the 103 page also quotes the
    # *stock* spring's 80 lb seat pressure, so the text patterns must name Hamilton's own spring.
    m = (re.search(r"(?<!\d)(\d{3})(?:#| lb|\s+Valve Spring)", name)
         or re.search(r"delivering (\d{3}) lbs of seat pressure", text)
         or re.search(r"\((\d{3}) lb [Ss]eat [Pp]ressure\)", text))
    if m:
        spec["seatLb"] = int(m.group(1))
    m = re.search(r"\((\d{3}) lbs @ (\d\.\d{3})″\)", text)
    if m:
        spec["installedHt"] = inch(m.group(2))
    m = re.search(r"up to (\.\d{3})″ lift", text)
    if m:
        spec["maxLift"] = inch(m.group(1))
    m = re.search(r"(?:rev to|up to|Up to) ([\d,]{4,6}) ?RPM", text)
    if m:
        spec["rpmHigh"] = int(m.group(1).replace(",", ""))
    spec["dual"] = bool(re.search(r"\bdual\b", name, re.I))
    if re.search(r"conical beehive", text, re.I):
        spec["style"] = "conical beehive"
    if re.search(r"[Rr]etainers (?:&|and) (?:10° )?[Ll]ocks (?:Included|included)|Includes Retainers", text):
        spec["retainersIncluded"] = True
    elif re.search(r"retainers are not included", text, re.I):
        spec["retainersIncluded"] = False
    m = re.search(r"(\d{2}) ?lbs?\.? of boost", text, re.I)
    if m:
        spec["maxBoostPsi"] = int(m.group(1))
    if re.search(r"not recommended for daily drivers", text, re.I):
        notes.append("competition, above 4,500 rpm")
    if re.search(r"steel cam and steel tappets are recommended", text, re.I):
        notes.append("steel cam and steel tappets recommended")
    if "12 Valve" in name or "12 valve" in name.lower():
        pass
    return spec, notes, qa


def parse_pushrod(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {}, [], []
    m = (re.search(r"(\d{1,2}(?:\.\d)?)mm diameter and (\.\d{3})″ wall", text)
         or re.search(r"\((\d{1,2}(?:\.\d)?)mm, (\.\d{3})″ Wall\)", text))
    if m:
        mm = float(m.group(1))
        spec["diameterMm"] = mm if mm != int(mm) else int(mm)
        spec["diameter"] = round(mm / 25.4, 3)
        spec["wall"] = inch(m.group(2))
    m = re.search(r"buckling strength of up to ([\d,]+) lbs|([\d,]+) lb buckling strength", text)
    if m:
        spec["bucklingLb"] = int((m.group(1) or m.group(2)).replace(",", ""))
    if re.search(r"3-piece design", text):
        spec["construction"] = "3-piece"
    spec["material"] = "steel"
    return spec, notes, qa


def parse_head_gasket(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {}, [], []
    m = re.search(r"Thickness\s*:\s*(\.\d{3})″", text) or re.search(r"(\.\d{3})″ (?:thick|Thick|Thickness)", name + "\n" + text)
    if m:
        spec["thickness"] = inch(m.group(1))
    if re.search(r"fire ring", name + text, re.I):
        spec["style"] = "fire ring"
        spec["material"] = "composite"
        m = re.search(r"(\d\.\d{3})″ (?:x \.105″ Wire|Wire O\.D\.|Diameter Wire|wire diameter)", text) or re.search(r"Wire O\.D\.\s*:\s*(\d\.\d{3})″", text)
        if m:
            spec["bore"] = inch(m.group(1))
        m = re.search(r"(?<![\d.])(\.\d{3})″ wire|Wire Size\s*:\s*(\.\d{3})″", text, re.I)
        if m:
            spec["wireDia"] = inch(next(g for g in m.groups() if g))
        m = re.search(r"(\.\d{3})″\s*[–-]\s*(\.\d{3})″ (?:depth|radiused groove|if cutting)", text) or re.search(r"depth of (\.\d{3})″\s*[–-]\s*(\.\d{3})″", text)
        if m:
            spec["grooveDepth"] = [inch(m.group(1)), inch(m.group(2))]
        if re.search(r"130 ft-lbs?", text):
            spec["initialTorqueFtLb"] = 130
        notes.append("head studs required; groove cut for the fire ring")
    if re.search(r"OEM Replacement", text, re.I):
        spec["style"] = "OEM replacement"
    if re.search(r"Coming Soon", text):
        notes.append("listing says 'coming soon'")
    return spec, notes, qa


def parse_gasket_kit(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {}, [], []
    m = re.search(r"(?:What.s Included|Kit contents)\n((?:.+\n)+?)(?:Choose|Surface|\d{4})", text + "\n")
    items = []
    if m:
        for l in m.group(1).splitlines():
            l = re.sub(r"\s+—.*$", "", l.strip())
            if l and not l.endswith("Fitment"):
                items.append(l)
    spec["includes"] = items
    spec["headGasketIncluded"] = any(re.search(r"head gasket", i, re.I) for i in items)
    spec["kit"] = "top end"
    return spec, notes, qa


def parse_lifter(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {"style": "solid_flat", "linkBar": False}, [], []
    m = re.search(r"(\d\.\d{2})″", name)
    if m:
        spec["faceDia"] = inch(m.group(1))
    if re.search(r"DLC", name):
        spec["dlc"] = True
        spec["material"] = "steel"
        notes.append("for 110 lb or heavier springs, high rpm")
    else:
        spec["dlc"] = False
    if re.search(r"1989–2016", text):
        notes.append("text says fits 1989–2016")
    if re.search(r"clear the 12V fuel pump eccentric", text):
        notes.append("clears 12V P-pump eccentric")
    return spec, notes, qa


def parse_rocker(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {"type": "pedestal", "material": "cast steel"}, [], ["rocker ratio not stated"]
    if re.search(r"DLC-coated trunnions", text):
        spec["trunnion"] = "DLC coated"
    if re.search(r"Swaged steel tips", text):
        spec["tips"] = "swaged steel"
    return spec, notes, qa


def parse_bearing(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {"position": "cam"}, [], []
    m = re.search(r"stock-size cam journals \((\d\.\d{3})″ diameter\)", text)
    if m:
        spec["journal"] = inch(m.group(1))
    m = re.search(r"require a (\d\.\d{3})″ \(\+/− 0\.0005″\) cam bore", text)
    if m:
        spec["housing"] = inch(m.group(1))
    m = re.search(r"set of (\d)", name, re.I)
    if m:
        spec["qty"] = int(m.group(1))
    spec["series"] = "HC-1"
    notes.append("block must be line-bored to the stated cam bore; 12V stock uses one bearing (journal 1)")
    return spec, notes, qa


def parse_retainer(name: str, text: str) -> tuple[dict, list[str], list[str]]:
    spec, notes, qa = {"material": "tool steel"}, [], []
    notes.append("for 110 lb springs / above 4,500 rpm")
    return spec, notes, qa


PARSERS = {
    "spring": parse_spring, "pushrod": parse_pushrod, "headGasket": parse_head_gasket,
    "gasket": parse_gasket_kit, "lifter": parse_lifter, "rocker": parse_rocker,
    "bearing": parse_bearing, "retainer": parse_retainer,
}


# --------------------------------------------------------------------------- names
def short_name(cat: str, name: str, spec: dict) -> str:
    bits = []
    if cat == "cam":
        if spec.get("kit"):
            bits.append("cam combo")
        elif spec.get("grind") == "OEM replacement":
            bits.append("OEM replacement cam")
        else:
            bits.append(f"{spec.get('material', '')} cam".strip())
        if "dur050Int" in spec and "dur050Exh" in spec:
            bits.append(f"{spec['dur050Int']}/{spec['dur050Exh']} @ .050")
        elif "dur050Int" in spec:
            bits.append(f"{spec['dur050Int']} int @ .050")
        if "lsa" in spec:
            bits.append(f"{spec['lsa']} LSA")
        if spec.get("type") == "hydraulic_roller":
            bits.append("roller")
        if "rpmHigh" in spec:
            bits.append(f"{spec.get('rpmLow', spec.get('rpmLowText', ''))}-{spec['rpmHigh']} rpm".lstrip("-"))
        if re.search(r"flat tappet conversion", name, re.I):
            bits = ["flat tappet conversion kit"] + [b for b in bits if b != "cam combo"]
    elif cat == "spring":
        bits.append("dual valve springs" if spec.get("dual") else "valve springs")
        if "seatLb" in spec:
            bits.append(f"{spec['seatLb']} lb seat")
        if "installedHt" in spec:
            bits.append(f"@ {spec['installedHt']:.3f}")
        if "rpmHigh" in spec:
            bits.append(f"to {spec['rpmHigh']} rpm")
        bits.append("12V" if "12 Valve" in name else "24V")
    elif cat == "pushrod":
        bits.append("pushrods")
        if "diameterMm" in spec:
            bits.append(f"{spec['diameterMm']} mm x {spec['wall']:.3f} wall")
        bits.append("12V" if "12 Valve" in name else "24V")
    elif cat == "headGasket":
        bits.append(f"{spec.get('style', 'head')} head gasket")
        if "thickness" in spec:
            bits.append(f"{spec['thickness']:.3f} thick")
        if "bore" in spec:
            bits.append(f"{spec['bore']:.3f} wire OD")
    elif cat == "gasket":
        bits.append("top end gasket kit")
        bits.append("with head gasket" if spec.get("headGasketIncluded") else "without head gasket")
    elif cat == "lifter":
        bits.append("flat tappets")
        if "faceDia" in spec:
            bits.append(f"{spec['faceDia']:.2f} face")
        if spec.get("dlc"):
            bits.append("DLC steel")
    elif cat == "rocker":
        bits.append("OE-style rocker arms, DLC trunnions, 24V")
    elif cat == "bearing":
        bits.append("cam bearings")
        if "journal" in spec:
            bits.append(f"{spec['journal']:.3f} journal")
        if "qty" in spec:
            bits.append(f"set of {spec['qty']}")
    elif cat == "retainer":
        bits.append("tool steel spring retainers, 24V")
    return ", ".join(b for b in bits if b)


# --------------------------------------------------------------------------- build
def build(products: list[dict], pages: dict[int, dict | None]) -> tuple[list[dict], dict]:
    recs, stats = [], {"skipped": [], "qa": [], "by_cat": {}, "no_sku": [], "no_fitment_table": [],
                       "sku_mismatch": []}
    for p in products:
        name = htmlmod.unescape(p["name"])
        cat, why = classify(p)
        if cat is None:
            stats["skipped"].append((p["id"], name, why))
            continue
        text = strip_html(p["short_description"]) + "\n" + strip_html(p["description"]) + "\n"
        if cat == "cam":
            spec, notes, qa = parse_cam(name, text, p)
        else:
            spec, notes, qa = PARSERS[cat](name, text)
        sku = (p.get("sku") or "").strip()
        page = pages.get(p["id"]) or {}
        if page.get("jsonld_sku") and sku and page["jsonld_sku"] != sku:
            stats["sku_mismatch"].append((p["id"], sku, page["jsonld_sku"]))
        if not sku:
            sku = page.get("jsonld_sku") or f"wc-{p['id']}"
            if sku.startswith("wc-"):
                stats["no_sku"].append((p["id"], name))
        fits = families(p)
        if not fits:
            stats["skipped"].append((p["id"], name, "no engine-year category"))
            continue
        if not page.get("vehicles"):
            stats["no_fitment_table"].append((p["id"], name))
        for q in qa:
            stats["qa"].append((sku, q))
        # listing-title / spec conflicts worth a flag
        m = re.search(r"(?<![\d.])(\d{3})[-/](\d{3})(?![\d.])", name)
        if cat == "cam" and m and "dur050Int" in spec and int(m.group(1)) != spec["dur050Int"]:
            stats["qa"].append((sku, f"title says {m.group(1)}/{m.group(2)}, spec block says "
                                     f"{spec['dur050Int']}/{spec.get('dur050Exh')}"))
            notes.append(f"title/SKU say {m.group(1)}/{m.group(2)} @ .050, description says "
                         f"{spec['dur050Int']}/{spec.get('dur050Exh')}; verify with Hamilton")
        src = {"doc": DOC, "edition": EDITION, "url": p["permalink"], "id": p["id"]}
        if sku.startswith("wc-"):
            src["skuMissing"] = True
        for fit in fits:
            fit = dict(fit)
            all_notes = [fit["notes"]] + notes
            fit["notes"] = "; ".join(n for n in all_notes if n)
            if page.get("vehicles"):
                fit["vehicles"] = page["vehicles"]
            recs.append(clean({
                "m": BRAND, "p": sku, "cat": cat,
                "name": short_name(cat, name, spec),
                "fit": fit, "spec": spec, "src": src, "emissions": None,
            }) | {"emissions": None})
        stats["by_cat"][cat] = stats["by_cat"].get(cat, 0) + len(fits)
    return recs, stats


# --------------------------------------------------------------------------- validate
NUMERIC = {"dur050Int", "dur050Exh", "lsa", "liftInt", "liftExh", "rpmLow", "rpmHigh", "lashInt",
           "lashExh", "seatLb", "installedHt", "maxLift", "diameter", "diameterMm", "wall",
           "bucklingLb", "thickness", "bore", "wireDia", "faceDia", "journal", "housing", "qty",
           "initialTorqueFtLb", "maxBoostPsi"}


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
        if r["fit"]["fam"] not in FAM_CI:
            errs.append(f"{r['p']}: unknown family {r['fit']['fam']}")
        walk(r, r["p"])
        for k, v in r["spec"].items():
            if k in NUMERIC and not isinstance(v, (int, float)):
                errs.append(f"{r['p']}: spec.{k} not numeric: {v!r}")
        for k in ("ci", "cyl", "y0"):
            v = r["fit"].get(k)
            if isinstance(v, list):
                v = v[0]
            if not isinstance(v, int):
                errs.append(f"{r['p']}: fit.{k} not an int")
    return errs


# --------------------------------------------------------------------------- main
def main(argv):
    offline = "--offline" in argv
    refresh = "--refresh" in argv
    f = Fetcher(offline, refresh)
    products = fetch_products(f)
    log(f"Store API: {len(products)} products")
    pages: dict[int, dict | None] = {}
    for p in products:
        cat, _ = classify(p)
        if cat is None:
            continue
        html = fetch_page(f, p)
        pages[p["id"]] = parse_page(html) if html else None
    log(f"product pages parsed: {sum(1 for v in pages.values() if v)} / {len(pages)}; "
        f"requests this run: {f.n_requests}; stopped: {f.stopped}")
    recs, stats = build(products, pages)
    errs = validate(recs)
    for e in errs:
        log("VALIDATION:", e)
    if errs:
        sys.exit(1)
    OUT.mkdir(exist_ok=True)
    doc = {
        "source": {
            "brand": BRAND, "doc": DOC, "edition": EDITION,
            "api": API.format(page=1), "host": HOST,
            "storeProducts": len(products),
            "productPages": sorted(p["permalink"] for p in products if pages.get(p["id"])),
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    out_path = OUT / "hamilton.json"
    out_path.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    distinct = len({r["p"] for r in recs})
    print(f"wrote {out_path}: {len(recs)} records, {distinct} distinct PNs")
    print("by cat:", stats["by_cat"])
    print("skipped:")
    for pid, name, why in stats["skipped"]:
        print(f"  {pid} {name!r}: {why}")
    print("no SKU (p = wc-<id>):", stats["no_sku"])
    print("no fitment table on page:", stats["no_fitment_table"])
    print("sku mismatch API vs JSON-LD:", stats["sku_mismatch"])
    print("QA flags:")
    for sku, q in stats["qa"]:
        print(f"  {sku}: {q}")


if __name__ == "__main__":
    main(sys.argv[1:])
