#!/usr/bin/env python3
"""Parts catalog extractor: BD (BD Diesel, bddiesel.com).

Source is the public Shopify listing on the Canadian storefront
`https://ca.bddiesel.com/products.json?limit=250&page=N` (the US hosts fail TLS chain verification;
the CA mirror carries the same catalog priced in CAD, and prices are not stored). Pages are cached
under `dl/bd/` (gitignored) so the parse step is re-runnable offline; the fetch is resumable (a page
that is already cached is not requested again).

    python -I scripts/parts-catalog/extract_bd.py              # fetch (cached) + parse
    python -I scripts/parts-catalog/extract_bd.py --offline    # parse the cache only
    python -I scripts/parts-catalog/extract_bd.py --fetch-only # crawl only

Emits `injector`, `turbo` and `manifold` records with `emissions`; everything else in the listing
(transmissions, converters, exhaust brakes, injection pumps, lift pumps, flexplates, apparel...) is
counted in the notes. Writes `out/bd.json` and `out/bd.md` next to this file. Nothing else is
written outside `dl/` and `out/`.
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
DL = HERE / "dl" / "bd"
OUT = HERE / "out"
HOST = "ca.bddiesel.com"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_DELAY = 6.0
EDITION = dt.date.today().strftime("%Y-%m")
SRC_DOC = "bddiesel.com Shopify products.json (ca.bddiesel.com storefront)"
BRAND = "BD Diesel"

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
    "GM LS": {"cyl": 8},
    "Chrysler Gen III Hemi 5.7/6.1": {"ci": [345], "cyl": 8},
    "Chrysler Gen III Hemi 6.2/6.4": {"ci": [392], "cyl": 8},
}
# Not in cam-fitment.json: the catalog's own heading is kept in fit.fam and flagged in the notes.
UNKNOWN_FAM_CYL = {
    "GM 6.2/6.5 diesel": 8, "GM 2.8 Duramax": 4, "Ford 6.9/7.3 IDI": 8, "Ford 3.0 Powerstroke": 6,
    "RAM 3.0 EcoDiesel": 6, "Ford EcoBoost": 6, "Ford 6.2 Boss": 8, "Cummins ISX": 6, "Caterpillar 3406E/C15": 6,
    "Caterpillar C12": 6, "Detroit Diesel": 6, "Universal": None,
}

# BD's application tags ("Dodge / 5.9L Cummins 04.5-07") -> family, year window, note
APP_FAM = {
    "Dodge / 5.9L Cummins 89-93": ("Cummins 5.9 12V", 1989, 1993, None),
    "Dodge / 5.9L Cummins 94-98 12 Valve": ("Cummins 5.9 12V", 1994, 1998, None),
    "Dodge / 5.9L Cummins 98.5-02 24-Valve": ("Cummins 5.9 24V/CR", 1998.5, 2002, None),
    "Dodge / 5.9L Cummins 03-04": ("Cummins 5.9 24V/CR", 2003, 2004, None),
    "Dodge / 5.9L Cummins 04.5-07": ("Cummins 5.9 24V/CR", 2004.5, 2007, None),
    "Dodge / 6.7L Cummins 07.5-12": ("Cummins 6.7", 2007.5, 2012, None),
    "Dodge / 6.7L Cummins 13-18": ("Cummins 6.7", 2013, 2018, None),
    "Dodge / 6.7L Cummins 19-up": ("Cummins 6.7", 2019, None, None),
    "Chevy/GM / Duramax 6.6L 01-04 LB7": ("Duramax 6.6", 2001, 2004, "LB7"),
    "Chevy/GM / Duramax 6.6L 04.5-06 LLY": ("Duramax 6.6", 2004.5, 2006, "LLY"),
    "Chevy/GM / Duramax 6.6L 06-07 LBZ": ("Duramax 6.6", 2006, 2007, "LBZ"),
    "Chevy/GM / Duramax 6.6L 07.5-10 LMM": ("Duramax 6.6", 2007.5, 2010, "LMM"),
    "Chevy/GM / Duramax 6.6L 11-16 LML-LGH": ("Duramax 6.6", 2011, 2016, "LML/LGH"),
    "Chevy/GM / Duramax 6.6L 17-up L5P": ("Duramax 6.6", 2017, None, "L5P"),
    "Chevy/GM / 6.2L & 6.5L 82-00": ("GM 6.2/6.5 diesel", 1982, 2000, None),
    "Chevy/GM / Duramax 2.8L": ("GM 2.8 Duramax", None, None, None),
    "Ford / 7.3L Powerstroke 94-97": ("Powerstroke 7.3", 1994, 1997, None),
    "Ford / 7.3L Powerstroke 99-03": ("Powerstroke 7.3", 1999, 2003, None),
    "Ford / 6.0L Powerstroke 03-07": ("Powerstroke 6.0", 2003, 2007, None),
    "Ford / 6.4L Powerstroke 08-10": ("Powerstroke 6.4", 2008, 2010, None),
    "Ford / 6.7L Powerstroke 11-16": ("Powerstroke 6.7", 2011, 2016, None),
    "Ford / 6.7L Powerstroke 17-up": ("Powerstroke 6.7", 2017, None, None),
    "Ford / 6.9L/7.3L IDI 83-94": ("Ford 6.9/7.3 IDI", 1983, 1994, None),
    "Ford / 3.0L Powerstroke": ("Ford 3.0 Powerstroke", None, None, None),
    "Dodge / 3.0L ECO Diesel": ("RAM 3.0 EcoDiesel", None, None, None),
    "Heavy Duty / Cummins ISX": ("Cummins ISX", None, None, None),
    "Heavy Duty / Detroit": ("Detroit Diesel", None, None, None),
}
# displacement codes in the per-year fit tags (`2013/dodge-ram/ram-3500/6-7`) that belong to each family
FAM_DISP = {
    "Cummins 5.9 12V": {"5-9"}, "Cummins 5.9 24V/CR": {"5-9"}, "Cummins 6.7": {"6-7"}, "Duramax 6.6": {"6-6"},
    "Powerstroke 7.3": {"7-3"}, "Powerstroke 6.0": {"6-0"}, "Powerstroke 6.4": {"6-4"}, "Powerstroke 6.7": {"6-7"},
    "GM 6.2/6.5 diesel": {"6-2", "6-5"}, "GM 2.8 Duramax": {"2-8"}, "Ford 6.9/7.3 IDI": {"6-9", "7-3"},
    "Ford 3.0 Powerstroke": {"3-0"}, "RAM 3.0 EcoDiesel": {"3-0"}, "Ford EcoBoost": {"3-5"}, "Ford 6.2 Boss": {"6-2"},
    "GM LS": {"4-8", "5-3", "6-0", "6-2"}, "Chrysler Gen III Hemi 5.7/6.1": {"5-7"}, "Chrysler Gen III Hemi 6.2/6.4": {"6-4"},
}
NON_FIT_HEADS = ("Misc", "Parts & Accessories", "Race Turbos")
BRAND_TYPES = {"Garrett": "Garrett", "BorgWarner": "BorgWarner", "Bosch": "Bosch", "Alliant Power": "Alliant Power",
               "Bostech": "Bostech", "Bully Dog": "Bully Dog", "Flo-Pro Exhaust": "Flo-Pro", "FLOPRO": "Flo-Pro"}


# --------------------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)


def strip_html(html: str) -> str:
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html or "", flags=re.S | re.I)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&amp;", "&").replace("&nbsp;", " ").replace("&quot;", '"').replace("&#39;", "'")
            .replace("&rsquo;", "'").replace("&lsquo;", "'").replace("&rdquo;", '"').replace("&ldquo;", '"')
            .replace("&ndash;", "-").replace("&mdash;", "-").replace("’", "'").replace("“", '"')
            .replace("”", '"').replace("–", "-").replace("—", "-"))
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
    if not robots_file.exists() or robots_file.stat().st_size == 0:
        r = session.get(f"https://{HOST}/robots.txt", timeout=60)
        log(f"robots.txt -> {r.status_code}")
        robots_file.write_text(r.text if r.status_code == 200 else "")
        time.sleep(MIN_DELAY)
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(robots_file.read_text().splitlines())
    if not rp.can_fetch(UA, f"https://{HOST}/products.json"):
        raise SystemExit(f"{HOST}: robots.txt disallows /products.json; stopping")
    delay = max(MIN_DELAY, rp.crawl_delay(UA) or 0)
    stats.robots_note = robots_note(delay)

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
            if r.status_code in (403, 429) or "Just a moment" in r.text[:2000] or "Incapsula" in r.text[:2000]:
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


def robots_note(delay: float) -> str:
    return (f"robots.txt fetched and parsed (`User-agent: *` / `Allow: /`, no Crawl-delay; /products.json is not "
            f"disallowed); requests spaced {delay:.0f} s apart, one at a time")


def load_cache() -> list[dict]:
    products = []
    for f in sorted(DL.glob("products_p*.json"), key=lambda p: int(p.stem.rsplit("_p", 1)[1])):
        products.extend(json.loads(f.read_text()).get("products", []))
    return products


# --------------------------------------------------------------------------- classification
TURBO_TYPES = {"screamer turbos", "screamer turbo", "oem turbos", "garrett", "borgwarner", "super b turbos", "race turbos",
               "heavy duty turbo", "heavy duty turbos", "turbo", "iron horn", "turbo thruster", "supermax turbos", "large parcel"}
INJ_TYPES = {"cr injectors", "isb injectors", "6bta injectors", "uptime", "alliant power", "bosch", "bostech"}
MAN_TYPES = {"exhaust manifolds", "exhaust manifold", "uppipes"}
TURBO_PARTS = re.compile(
    r"install kit|mounting kit|mounting & conversion|gasket|actuator|harness|elbow|intake horn|coolant tube|wastegate control|"
    r"waste ?gate kit|boost control|turnbuckle|blanket|clamp|oil drain|air filter|pedestal|turbine housing|compressor wheel|"
    r"billet wheel|boost elbow|down ?pipe|controller|outlet|adapter|flange|wheel & waste|thruster ii kit\b.*pedestal", re.I)
INJ_PARTS = re.compile(r"line set|line kit|connector|seal kit|feed tubes?|fuel rail plug|nozzle|pigtail|o-ring|washer|harness|"
                       r"^injector install kit", re.I)
MAN_PARTS = re.compile(r"gasket|bolt|spacer|bracket|stud|tool|regulator|adapter|flange|^up-?pipes? kit|^passenger side up-pipe|clamp", re.I)


def classify(p: dict, body: str) -> tuple[str | None, str | None]:
    """Return (cat, skip_reason). Exactly one of the two is set."""
    t = re.sub(r"\s+", " ", p["title"]).strip()
    pt = (p.get("product_type") or "").strip().lower()
    tags = p.get("tags", [])
    if pt == "apparel" or any(x.startswith("Misc / Apparel") for x in tags) or re.search(r"t-shirt|hoodie|\bhat\b|decal", t, re.I):
        return None, "apparel / merch"
    if re.search(r"\bdelete\b", t, re.I):
        return None, "delete part (skipped by rule)"
    if re.search(r"\b(EGR|DPF|SCR|DOC)\b", t) and not re.search(r"w/ ?o? ?SCR|w/SCR", t, re.I):
        return None, "emissions-system part (EGR / DPF / SCR)"

    is_turbo_title = re.search(r"\bturbo(?:charger)?s?\b", t, re.I)
    is_man_title = re.search(r"\bmanifold\b", t, re.I)
    is_inj_title = re.search(r"\binjectors?\b", t, re.I)

    if pt in ("exhaust brakes", "exhaust brake"):
        return None, "exhaust brake (not a task category)"
    if pt in ("transmissions", "torque converters", "valve bodies", "rebuild-it", "build-it", "trans filters", "trans controls",
              "trans parts", "trans coolers", "flex plates", "pans/covers", "pas", "tapshifter", "short shift", "2 low",
              "cooler bypass", "protect68", "lock out", "pto provision") or "transmission" in pt or "converter" in pt:
        return None, "transmission / converter / driveline"
    if pt in ("p7100 pumps", "cp3 pumps", "vp44 pumps", "ve pumps", "common rail pumps", "venom cp3") or \
            re.search(r"\b(CP3|CP4|VP44|P7100|VE)\b.*\bpump\b|\bpump\b.*\b(CP3|CP4|VP44|P7100)\b|injection pump", t, re.I) and not is_inj_title:
        return None, "injection pump (not in this task's categories)"
    if pt in ("venom lift pump", "flow max", "fuel systems", "pressureloc") and not is_inj_title:
        return None, "lift pump / fuel-system hardware"

    # manifolds (checked before turbo: 'Screamer Turbo Manifold Package' is a turbo + manifold package -> turbo)
    if is_man_title and not is_turbo_title or pt in MAN_TYPES and is_man_title:
        if MAN_PARTS.search(t) and not re.search(r"manifold kit|manifold & up-pipe kit|manifold driver side kit|manifold passenger side kit|"
                                                r"manifold (?:driver|passenger) side|manifold \(single\)|manifold set", t, re.I):
            return None, "manifold hardware / gasket / tool"
        return "manifold", None
    if pt in MAN_TYPES and re.search(r"up-?pipe", t, re.I):
        return None, "up-pipe kit (not a manifold)"

    if is_inj_title or pt in INJ_TYPES and re.search(r"injector|nozzle", t, re.I):
        if INJ_PARTS.search(t) and not re.search(r"injectors & install kit|injector set|injectors set", t, re.I):
            if re.search(r"nozzle", t, re.I):
                return None, "injector nozzle set (no category)"
            return None, "injector hardware / lines / install kit (no injectors)"
        return "injector", None

    if is_turbo_title or pt in TURBO_TYPES and is_turbo_title:
        core = re.sub(r"\([^)]*\)", " ", t)  # '(LLY requires sensor adapter)' is a fitment note, not the part
        if re.search(r"air filter|clamp|blanket|oil drain|down ?pipe|controller|install kit|pedestal upgrade|relocation", core, re.I):
            return None, "turbo parts / hardware / accessories"
        if TURBO_PARTS.search(core) and not re.search(r"turbo kit|turbo manifold package|twin turbo|turbo thruster ii kit", core, re.I):
            return None, "turbo parts / hardware / accessories"
        return "turbo", None
    return None, f"other: {p.get('product_type') or 'untyped'}"


# --------------------------------------------------------------------------- fitment
FIT_TAG = re.compile(r"^(\d{4})/([a-z0-9-]+)/([a-z0-9-]+)/([a-z0-9-]+)$")
YEARS = re.compile(r"(?<![\d.])((?:19|20)\d\d(?:\.5)?)\s*(?:-|to)\s*((?:19|20)?\d\d(?:\.5)?)(?![\d.])|(?<![\d.])(20\d\d)\s*\+")


def title_years(t: str) -> tuple[float | None, float | None]:
    m = YEARS.search(t)
    if not m:
        return None, None
    if m.group(3):
        return float(m.group(3)), None
    y0 = float(m.group(1))
    y1s = m.group(2)
    y1 = float(y1s) if len(y1s.split(".")[0]) == 4 else float(str(int(y0))[:2] + y1s)
    if y1 < y0:
        y1 += 100
    return y0, y1


def gas_fams(title: str, disp_codes: set[str]) -> list[tuple[str, str | None]]:
    """Gasoline applications: the family comes from the engine named in the title / fit tags."""
    out = []
    if re.search(r"EcoBoost", title, re.I) or "3-5" in disp_codes and re.search(r"F-?150|Transit|Expedition", title, re.I):
        out.append(("Ford EcoBoost", "3.5L EcoBoost"))
    if re.search(r"6\.2L? GAS|BOSS", title, re.I):
        out.append(("Ford 6.2 Boss", "6.2L Boss V8"))
    if re.search(r"5\.7L? (?:& 6\.4L? )?HEMI", title, re.I):
        out.append(("Chrysler Gen III Hemi 5.7/6.1", "5.7L Hemi"))
    if re.search(r"6\.4L? HEMI|5\.7L? & 6\.4L?", title, re.I):
        out.append(("Chrysler Gen III Hemi 6.2/6.4", "6.4L Hemi"))
    if re.search(r"Silverado 1500|Sierra 1500|\bV8\b", title, re.I) and disp_codes & {"4-8", "5-3", "6-0", "6-2"}:
        out.append(("GM LS", "4.8/5.3/6.0/6.2 truck LS"))
    return out


def fitment(p: dict, title: str, cat: str, stats: Stats, label: str) -> tuple[list[dict], str]:
    """One entry per family from the application tags; years clipped by the per-year fit tags."""
    tags = p.get("tags", [])
    fit_years: dict[str, set[float]] = collections.defaultdict(set)  # displacement code -> years
    for t in tags:
        m = FIT_TAG.match(t)
        if m:
            fit_years[m.group(4)].add(float(m.group(1)))
    heads = []
    for t in tags:
        parts = t.split(" / ")
        if len(parts) == 2 and not FIT_TAG.match(t):  # top-level application tag (no sub-category)
            head = f"{parts[0]} / {parts[1]}"
            if head not in heads:
                heads.append(head)
    fams: list[tuple[str, float | None, float | None, str | None]] = []
    unmapped = []
    for head in heads:
        if head in APP_FAM:
            fams.append(APP_FAM[head])
        elif head.endswith("/ Gasoline"):
            for fam, note in gas_fams(title, set(fit_years)):
                fams.append((fam, None, None, note))
            if not gas_fams(title, set(fit_years)):
                unmapped.append(head)
        elif head.startswith("Heavy Duty / CAT"):
            fam = "Caterpillar C12" if re.search(r"\bC12\b", title) else "Caterpillar 3406E/C15"
            fams.append((fam, None, None, None))
        elif head.startswith(NON_FIT_HEADS):
            continue
        else:
            unmapped.append(head)
    src = "tags"
    if not fams and unmapped:
        for head in unmapped:
            fams.append((head, None, None, None))
            stats.qa.append(f"{label}: application tag '{head}' has no family mapping; catalog heading kept in fit.fam")
    if not fams:
        if cat == "turbo" and re.search(r"\bS[34]\d\d|S400SX4|SX-?E", title):
            return [{"fam": "Universal", "y0": None, "y1": None, "notes": None}], "universal"
        return [], "none"
    ty0, ty1 = title_years(title)
    merged: dict[str, dict] = {}
    order = []
    for fam, wy0, wy1, note in fams:
        yrs = set()
        for code in FAM_DISP.get(fam, set()):
            yrs |= fit_years.get(code, set())
        # clip the per-year fit tags to the application tag's window (5.9L 12V vs 24V share the '5-9' code)
        if wy0 is not None:
            yrs = {y for y in yrs if y >= int(wy0)}
        if wy1 is not None:
            yrs = {y for y in yrs if y <= wy1}
        if yrs:
            y0, y1 = min(yrs), max(yrs)
            if wy0 is not None and wy0 != int(wy0) and y0 == int(wy0):
                y0 = wy0
        else:
            y0, y1 = wy0, wy1
            if y0 is None and ty0 is not None:
                y0, y1 = ty0, ty1
        g = merged.setdefault(fam, {"fam": fam, "y0": y0, "y1": y1, "open": wy1 is None and wy0 is not None, "notes": []})
        if fam not in order:
            order.append(fam)
        else:
            if y0 is not None:
                g["y0"] = y0 if g["y0"] is None else min(g["y0"], y0)
            if wy1 is None and wy0 is not None:
                g["open"] = True
            if y1 is not None and g["y1"] is not None:
                g["y1"] = max(g["y1"], y1)
            elif y1 is not None:
                g["y1"] = y1
        if note and note not in g["notes"]:
            g["notes"].append(note)
    out = []
    for fam in order:
        g = merged[fam]
        y0, y1 = g["y0"], g["y1"]
        notes = list(g["notes"])
        codes = [n for n in notes if re.fullmatch(r"L[A-Z0-9]{2}(?:/L[A-Z0-9]{2})?", n)]
        if codes:
            notes = [n for n in notes if n not in codes] + ["/".join(codes)]
        if y0 is not None and y0 != int(y0):
            notes.insert(0, f"from {y0}")
        if g["open"] and y1 is not None:
            notes.append(f"listed through {int(y1)}")
        out.append({"fam": fam, "y0": int(y0) if y0 is not None else None, "y1": int(y1) if y1 is not None else None,
                    "notes": ", ".join(notes) or None})
    return out, src


def fit_notes_from_title(title: str) -> list[str]:
    notes = []
    if re.search(r"cab[ -]?(?:&|and)?[ -]?chassis", title, re.I) and not re.search(r"pick-?up", title, re.I):
        notes.append("cab & chassis")
    elif re.search(r"pick-?up", title, re.I) and not re.search(r"cab[ -]?(?:&|and)?[ -]?chassis", title, re.I):
        notes.append("pickup")
    m = re.search(r"\bw/\s?o\s?SCR\b|\bw/o SCR\b", title, re.I)
    if m:
        notes.append("without SCR")
    elif re.search(r"\bw/\s?SCR\b", title, re.I):
        notes.append("with SCR")
    if re.search(r"Non-California Spec", title, re.I):
        notes.append("non-California spec")
    if re.search(r"Manual Trans", title, re.I) and not re.search(r"Auto", title, re.I):
        notes.append("manual transmission")
    if re.search(r"\bE-Series\b|No E-Series", title, re.I):
        notes.append("not E-Series")
    m = re.search(r"\((?:after|up to) \d\d/\d\d/\d{4}\)", title)
    if m:
        notes.append(m.group(0).strip("()"))
    return notes


# --------------------------------------------------------------------------- emissions
RACE_ONLY = re.compile(r"Dedicated Competition Use Only|Not Legal For .{0,30}On-Road|CAN ?NOT SHIP TO CALIFORNIA|"
                       r"not legal for sale or use in California|race (?:use )?only|off-?road use only|competition use only", re.I)
CARB_EO = re.compile(r"\b(D-\d{3}-\d{1,3})\b")
CARB_CLAIM = re.compile(r"50[- ]state legal|C\.?A\.?R\.?B\.? ?(?:compliant|legal|approved|exempt)", re.I)
STOCK = re.compile(r"\bstock\b|\bOEM?\b|\bOE\b|factory|genuine|\breplacement\b|Standard Output|High Output|exchange", re.I)


def emissions_for(title: str, body: str, tags: list[str], performance: bool, stock: bool) -> tuple[str, str | None]:
    m = CARB_EO.search(body) or CARB_EO.search(title)
    if m:
        return f"carb_eo:{m.group(1)}", None
    claim = CARB_CLAIM.search(body)
    if RACE_ONLY.search(body):
        return "no_eo_race_only", None
    if not performance and (stock or "Stock Replacement" in tags or STOCK.search(title) or
                            re.search(r"stock replacement|direct[- ]fit replacement|service replacement", body, re.I)):
        return "oem_replacement", None
    return "unknown", (claim.group(0) if claim else None)


# --------------------------------------------------------------------------- spec parsing
PCT = re.compile(r"(\d{1,3})\s*%")
HP = re.compile(r"(\d{2,4})\s*(?:hp|HP|Hp)\b")
HP_RANGE = re.compile(r"(\d{2,4})\s*(?:hp)?\s*[-–]\s*(\d{2,4})\s*(?:hp|HP)\b", re.I)
MODEL = re.compile(r"\b(HE\d{3}[A-Z]{0,3}|HX\d\d|HY\d\d|GT\d{2,4}[A-Z]*|GTP\d\d[A-Z]?|AVNT\d{4}|GM-?[58]|K3[0-9]|S4\d\dSX4|S4\d\d[A-Z]?|"
                   r"S3\d\d(?:\.\d)?(?:SXE|SX-E)?|S2\d\d|HE451VE/HE400VG|GT3788VA)\b")


def condition_of(title: str, body: str, handle: str = "") -> str | None:
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b|\bExchange\b", title, re.I) or re.search(r"^exchange-|-exchange\b", handle):
        return "reman"
    if re.search(r"\bNew\b", title) and not re.search(r"new design|new nozzle|new compressor|new larger|new rail", title, re.I):
        return "new"
    lead = body[:300]
    if re.search(r"brand new|from NEW parts|is a new,|new, direct-fit", lead, re.I):
        return "new"
    if re.search(r"\bReman(?:ufactured)?\b|\bRebuilt\b|\bExchange\b|\brefreshed\b|remanufactured", lead, re.I):
        return "reman"
    return None


def oem_refs(title: str, body: str) -> list[str]:
    refs = []
    for m in re.finditer(r"\(([A-Z0-9]{2,5}-[A-Z0-9]{3,6}-[A-Z]{1,2}|\d{10}|\d{7}[A-Z]\d|[0-9]{4,7})\)", title):
        refs.append(m.group(1))
    m = re.search(r"Replaces (?:OE|OEM|Cummins) ?(?:Part)? ?#?s?:?\s*-?\s*(.*?)(?=\.(?:\s|$)|Replaces|$)", body)
    if m:
        for x in re.split(r",\s*", m.group(1)):
            x = re.sub(r"\s*\(x?\d\)", "", x).strip(" .;")
            if 5 <= len(x) <= 20 and re.search(r"\d", x) and re.fullmatch(r"[A-Za-z0-9-]+", x) and x not in refs:
                refs.append(x)
    return refs[:12]


def parse_injector(p, body, v, vt) -> tuple[dict, bool]:
    t = p["title"]
    spec = {}
    text = vt if vt != "Default Title" else ""
    both = t + " | " + text
    mp = PCT.search(text)
    if mp:
        spec["pctOver"] = int(mp.group(1))
    mr = HP_RANGE.search(text) or HP_RANGE.search(t)
    mh = HP.search(text)
    if mh and not (mr and HP_RANGE.search(text)):
        spec["hpRating"] = int(mh.group(1))
    elif mr:
        spec["hpRating"], spec["hpRatingLow"] = int(mr.group(2)), int(mr.group(1))
    if re.search(r"StockPlus|Stock Plus", text, re.I):
        spec["grade"] = "StockPlus"
    elif re.search(r"^Stock\b", text) or (vt == "Default Title" and re.search(r"\bstock\b", t, re.I)):
        spec["pctOver"] = 0
    if re.search(r"Premium", text):
        spec["variantNote"] = "Premium option"
    mo = re.search(r"(Standard Output|High Output)", text)
    if mo:
        spec["oemRating"] = mo.group(1)
        spec["pctOver"] = 0
    ms = re.search(r"Stage (\d)", text)
    if ms:
        spec["stage"] = f"Stage {ms.group(1)}"
    if re.search(r"Pump & Injectors Package", t, re.I):
        spec["package"] = "CP3 12 mm stroker pump + injector set"
        spec["set"] = True
    if re.search(r"\bSet\b|Injectors & Install Kit|Injector Kit", t, re.I):
        spec["set"] = True
    if re.search(r"Injectors & Install Kit", t, re.I):
        spec["kit"] = True
    mdi = re.search(r"DI Code (A[A-Z])", t)
    if mdi:
        spec["diCode"] = mdi.group(1)
    mcyl = re.search(r"#8-Cylinder|Cylinders 1-7", t)
    if mcyl:
        spec["cylinders"] = "8" if "#8" in mcyl.group(0) else "1-7"
    mn = re.search(r"VCO Type (\d+)-degree (\d+) Hole", body)
    if mn:
        spec["tip"] = f"VCO {mn.group(1)}-degree {mn.group(2)}-hole"
    if re.search(r"extrude honed", body, re.I):
        spec["nozzleProcess"] = "extrude honed"
    if re.search(r"P7100", t):
        spec["type"] = "P7100 mechanical"
    elif re.search(r"\bISB\b|24-valve", t, re.I) and "CR" not in t:
        spec["type"] = "ISB (VP44 era)"
    elif re.search(r"HEUI|7\.3L|6\.0L|6\.4L", t):
        spec["type"] = "HEUI" if re.search(r"7\.3L|6\.0L", t) else "common rail"
    elif re.search(r"Cummins|Duramax|CR\b", t):
        spec["type"] = "common rail"
    if re.search(r"UpTime", p.get("product_type") or ""):
        spec["line"] = "UpTime"
        spec.setdefault("pctOver", 0)  # UpTime DI-code injectors are refreshed stock-spec units
    elif re.search(r"BD-Built", t):
        spec["line"] = "BD-Built"
    refs = oem_refs(t, body)
    if refs:
        spec["replacesOem"] = refs
    spec["condition"] = condition_of(t, body, p.get("handle", ""))
    if "pctOver" not in spec and "hpRating" not in spec and "stage" not in spec:
        if re.search(r"\bstock\b|replacement", t, re.I) or re.search(r"stock replacement", body, re.I):
            spec["pctOver"] = 0
    performance = bool(spec.get("pctOver")) or "hpRating" in spec or "stage" in spec or bool(re.search(r"performance", t, re.I))
    return spec, performance


def parse_turbo(p, body, v, vt) -> tuple[dict, bool]:
    t = p["title"]
    text = vt if vt != "Default Title" else ""
    both = t + " | " + text
    spec = {}
    # variant 'S364SXE/80 0.91 AR' -> S364 SX-E, 64 mm compressor, 80 mm turbine, 0.91 A/R
    m = re.search(r"\bS3(\d\d(?:\.\d)?)(SXE|SX-?E)?/(\d\d)\s*([01]\.\d\d)\s*AR", text)
    if m:
        spec["model"] = f"S3{m.group(1)} SX-E" if m.group(2) else f"S3{m.group(1)}"
        spec["compressorInducer"], spec["turbineWheel"], spec["ar"] = num(m.group(1)), num(m.group(3)), num(m.group(4))
    # title 'S400 78/96 1.32', '75mm / 96mm / 1.32 A/R'
    m = re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*(?:mm)?\s*/\s*(\d\d(?:\.\d)?)\s*(?:mm)?\s*/?\s*([01]\.\d\d)\s*A/?R", t, re.I)
    if m and "compressorInducer" not in spec:
        spec["compressorInducer"], spec["turbineWheel"], spec["ar"] = num(m.group(1)), num(m.group(2)), num(m.group(3))
    # body: '61.5mm billet compressor wheel', '66 mm Ballistic Billet compressor wheel', '78mm billet compressor wheel',
    # '66.2mm compressor and 67mm turbine wheels', '13-blade 66mm turbine wheel', '96mm turbine wheel'
    if "compressorInducer" not in spec:
        mb = re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*-?\s*mm[^.;]{0,40}?compressor(?: wheel)?", body, re.I)
        if mb:
            spec["compressorInducer"] = num(mb.group(1))
    if "turbineWheel" not in spec:
        mt = re.search(r"compressor and (\d\d(?:\.\d)?)\s*mm turbine", body, re.I) or \
             re.search(r"(?<![\d.])(\d\d(?:\.\d)?)\s*-?\s*mm(?:(?!compressor)[^.;]){0,30}?turbine wheel", body, re.I)
        if mt:
            spec["turbineWheel"] = num(mt.group(1))
    if "ar" not in spec:
        ma = re.search(r"([01]\.\d\d)\s*A/?R\b", both + " " + body, re.I)
        if ma:
            spec["ar"] = num(ma.group(1))
    # SX-E frame in the title: 'S363', 'S364.5', 'S358', 'S361'
    if "compressorInducer" not in spec:
        ms = re.search(r"\bS3(\d\d(?:\.\d)?)\b", t)
        if ms:
            spec["compressorInducer"] = num(ms.group(1))
    mm_ = MODEL.search(text) or MODEL.search(t) or (MODEL.search(body[:300]) if not re.search(r"Screamer|Super B|Iron Horn", t) else None)
    if mm_ and "model" not in spec:
        spec["model"] = mm_.group(1).upper().replace("SXE", " SX-E").replace("SX-E", " SX-E").replace("  ", " ")
    if re.search(r"SX-?E", both) and spec.get("model") and "SX-E" not in spec["model"]:
        spec["model"] += " SX-E"
    if re.search(r"\bVGT\b|\bVG\b|\bVE\b|AVNT|GT37\b|GT3788|HE300VG|HE351VE|HE451VE|variable", both + " " + body, re.I) \
            and not re.search(r"NON-VGT", t, re.I):
        spec["vgt"] = True
    elif re.search(r"waste ?gate|non-wastegated|HX35|HX40|HE351CW|GTP38|S300|S400|S4\d\d|S3\d\d|SX-?E|K31", both + " " + body, re.I):
        spec["vgt"] = False
    ser = re.search(r"Screamer|Super B(?: Killer| Special| 600| Single)?|Iron Horn|Howler|Turbo Thruster II|SuperMax", t, re.I)
    if ser:
        spec["series"] = ser.group(0).title() if ser.group(0).isupper() else ser.group(0)
    mst = re.search(r"Stage (\d)", t)
    if mst:
        spec["stage"] = f"Stage {mst.group(1)}"
    if re.search(r"\bkit\b|package", t, re.I) and not re.search(r"install kit", t, re.I):
        spec["kit"] = True
    if re.search(r"manifold package", t, re.I):
        spec["includesManifold"] = True
    if re.search(r"twin|V2S|compound", t, re.I):
        spec["compound"] = True
    if re.search(r"turbochargers\b|a pair of", t + " " + body[:200], re.I) and re.search(r"EcoBoost|6\.4L", t, re.I):
        spec["pair"] = True
    mf = re.search(r"\b(T[346])\b", t)
    if mf:
        spec["flange"] = mf.group(1)
    mhp = re.search(r"(?:up to|capable of up to|right up to)\s*(\d{3,4})\s*\+?\s*(?:hp|horsepower)", body, re.I)
    if mhp:
        spec["hpCapable"] = int(mhp.group(1))
    mr = re.search(r"(\d{3,4})\s*hp\s*-\s*(\d{3,4})\s*hp", body, re.I) or re.search(r"(\d{3})/(\d{3}) HP", t)
    if mr:
        spec["hpLow"], spec["hpHigh"] = int(mr.group(1)), int(mr.group(2))
    mr = re.search(r"(\d{3})hp-(\d{3})hp", t, re.I)
    if mr:
        spec["hpLow"], spec["hpHigh"] = int(mr.group(1)), int(mr.group(2))
    mfl = re.search(r"up to (\d{2,3}) lb/min", body, re.I)
    if mfl:
        spec["flowLbMin"] = int(mfl.group(1))
    mps = re.search(r"boost to (\d\d) ?psi", body, re.I)
    if mps:
        spec["boostPsi"] = int(mps.group(1))
    mint = re.search(r"(W/O|C/W) Intake System", text, re.I)
    if mint:
        spec["variantNote"] = "with intake system" if mint.group(1).upper() == "C/W" else "without intake system"
    if re.search(r"w/o Pedestal", t, re.I):
        spec["variantNote"] = "without pedestal"
    if re.search(r"c/w (?:Vane )?Position Sensor", t, re.I):
        spec["variantNote"] = "with vane position sensor"
    if re.search(r"Ballistic Billet|billet compressor", body, re.I) or re.search(r"Billet Wheel", t, re.I):
        spec["billetCompressor"] = True
    refs = oem_refs(t, body)
    if refs:
        spec["replacesOem"] = refs
    if re.search(r"Borg ?Warner SX-?E cartridge", body, re.I):
        spec["cartridge"] = "BorgWarner SX-E"
    spec["condition"] = condition_of(t, body, p.get("handle", ""))
    performance = bool(re.search(r"Screamer|Super B|Iron Horn|Howler|Thruster|SuperMax|performance|upgrade|High Power|kit|billet",
                                 t, re.I)) and not re.search(r"Howler Stock", t, re.I)
    return spec, performance


def parse_manifold(p, body, v, vt) -> tuple[dict, bool]:
    t = p["title"]
    text = vt if vt != "Default Title" else ""
    spec = {"type": "intake" if re.search(r"intake", t, re.I) else "exhaust"}
    ms = re.search(r"(Driver|Passenger)s?\b", t, re.I)
    if ms:
        spec["side"] = ms.group(1).lower()
    elif re.search(r"\(SINGLE\)", t, re.I):
        spec["side"] = "single"
    elif re.search(r"\bkit\b|\bset\b", t, re.I) and re.search(r"Power Stroke|HEMI|GAS|ECOBOOST|V8|Duramax", t, re.I) and \
            not re.search(r"Cummins|CAT", t, re.I):
        spec["side"] = "both"
    mp = re.search(r"(\d)-piece", t + " " + body, re.I)
    if mp:
        spec["pieces"] = int(mp.group(1))
    mf = re.search(r"\b(T[346])\b", text) or re.search(r"\b(T[346])\b", t)
    if mf:
        spec["flange"] = mf.group(1)
    if re.search(r"STOCK MOUNT|STOCK/T3|HE351 \(OEM\)|Stock Mount", t + " " + text, re.I):
        spec["mount"] = "stock"
        if re.search(r"STOCK/T3", t, re.I):
            spec["flange"] = "T3"
    elif "flange" in spec:
        spec["mount"] = spec["flange"]
    if re.search(r"HE351 \(OEM\)", text):
        spec["flange"] = "HE351 (OEM)"
    mang = re.search(r"(\d\d)-degree", t, re.I)
    if mang:
        spec["angleDeg"] = int(mang.group(1))
    if re.search(r"waste ?gated", t, re.I):
        spec["wastegated"] = True
    if re.search(r"pulse manifold|fully divided|divided pulse", body, re.I) or re.search(r"PULSE", t):
        spec["pulse"] = True
    if re.search(r"ductile iron", body, re.I):
        spec["material"] = "high-silicon ductile iron"
    elif re.search(r"cast[- ]iron", body, re.I):
        spec["material"] = "cast iron"
    mw = re.search(r"(0\.\d{2,3})[\"”]\s*(?:uniform )?thick", body)
    if mw:
        spec["wallThickness"] = num(mw.group(1))
    if re.search(r"ceramic[- ]coated", t, re.I):
        spec["coating"] = "ceramic"
    if re.search(r"\bkit\b", t, re.I):
        spec["kit"] = True
    if re.search(r"up-pipe kit", t, re.I):
        spec["includesUpPipes"] = True
    if re.search(r"EGR compatible|emissions-compliant", body, re.I):
        spec["egrCompatible"] = True
    if re.search(r"EGT probe|pyrometer", body, re.I):
        spec["egtPort"] = True
    mcab = re.search(r"Cab-Chassis (\d{4})-(\d{4})", text)
    if mcab:
        spec["variantNote"] = f"cab & chassis {mcab.group(1)}-{mcab.group(2)}"
    elif re.search(r"Cab-Chassis", text):
        spec["variantNote"] = "cab & chassis"
    elif re.search(r"Pick-Up", text):
        spec["variantNote"] = "pickup"
    mflow = re.search(r"(\d{1,2})% (?:increase in flow|better than the OEM|flow improvement)|outflow the factory manifolds by (\d{1,2})%|"
                      r"increase overall flow[^.]{0,30}?by (\d{1,2})%|flow (\d{1,2})% better", body, re.I)
    if mflow:
        spec["flowGainPct"] = int(next(g for g in mflow.groups() if g))
    performance = bool(re.search(r"\bT4\b|\bT6\b|waste ?gated|upgrade", t + " " + text, re.I))
    return spec, performance


# --------------------------------------------------------------------------- record building
def make_name(cat: str, spec: dict, fit: dict) -> str:
    parts = []
    y0, y1 = fit["y0"], fit["y1"]
    yrs = (str(y0) if y0 == y1 else f"{y0}-{y1}") if y0 and y1 else (f"{y0}+" if y0 else None)
    if cat == "injector":
        kind = ("stock " if spec.get("pctOver") == 0 and not spec.get("grade") else
                "StockPlus " if spec.get("grade") == "StockPlus" else
                "performance " if spec.get("pctOver") or spec.get("hpRating") or spec.get("stage") else "")
        head = f"{spec.get('condition') or ''} {kind}injector".strip()
        if spec.get("package"):
            head = "CP3 pump + injector package"
        parts.append(head)
        if spec.get("stage"):
            parts.append(spec["stage"].lower())
        if spec.get("pctOver"):
            parts.append(f"{spec['pctOver']}% over")
        if spec.get("hpRating"):
            parts.append(f"{spec['hpRatingLow']}-{spec['hpRating']} HP" if spec.get("hpRatingLow") else f"{spec['hpRating']} HP")
        if spec.get("oemRating"):
            parts.append(spec["oemRating"].lower())
        if spec.get("diCode"):
            parts.append(f"DI code {spec['diCode']}")
        if spec.get("set"):
            parts.append("set")
        if spec.get("variantNote") == "Premium option":
            parts.append("premium")
    elif cat == "turbo":
        head = []
        if spec.get("series"):
            head.append(spec["series"])
        if spec.get("stage"):
            head.append(spec["stage"].lower())
        if spec.get("model"):
            head.append(spec["model"])
        head.append("compound turbo kit" if spec.get("compound") and spec.get("kit") else "twin turbos" if spec.get("compound") else
                    "turbo + manifold package" if spec.get("includesManifold") else "turbo kit" if spec.get("kit") else
                    "turbo pair" if spec.get("pair") else "turbo")
        parts.append(" ".join(head))
        if spec.get("compressorInducer"):
            parts.append(f"{spec['compressorInducer']} mm compressor")
        if spec.get("turbineWheel"):
            parts.append(f"{spec['turbineWheel']} mm turbine")
        if spec.get("ar"):
            parts.append(f"{spec['ar']:.2f} A/R")
        if spec.get("condition"):
            parts.append(spec["condition"])
        if spec.get("variantNote"):
            parts.append(spec["variantNote"])
    else:
        head = f"{spec.get('type')} manifold"
        if spec.get("wastegated"):
            head = "wastegated " + head
        elif spec.get("pulse"):
            head = "pulse " + head
        parts.append(head + (" kit" if spec.get("kit") else ""))
        if spec.get("side") and spec["side"] not in ("both",):
            parts.append(f"{spec['side']} side")
        if spec.get("flange"):
            parts.append(f"{spec['flange']} flange")
        elif spec.get("mount") == "stock":
            parts.append("stock mount")
        if spec.get("angleDeg"):
            parts.append(f"{spec['angleDeg']}-degree")
        if spec.get("includesUpPipes"):
            parts.append("with up-pipes")
        if spec.get("variantNote"):
            parts.append(spec["variantNote"])
    if yrs:
        parts.append(yrs)
    fam_txt = fit["fam"] + (f" {fit['notes'].split(', ')[-1]}" if fit.get("notes") and fit["fam"] == "Duramax 6.6"
                            and re.search(r"L[A-Z0-9]{2}", fit["notes"].split(", ")[-1]) else "")
    parts.append(fam_txt)
    return ", ".join(x for x in parts if x)


def brand_of(p: dict, title: str, sku: str) -> str:
    pt = (p.get("product_type") or "").strip()
    if pt in BRAND_TYPES:
        return BRAND_TYPES[pt]
    if re.fullmatch(r"0445\d{6}|0986\d{6}", sku):
        return "Bosch"
    if re.fullmatch(r"\d{6}-\d{4}[A-Z]?(?:-[A-Z])?", sku):
        return "Garrett"
    if re.match(r"^AP\d{4,5}", sku):
        return "Alliant Power"
    return BRAND


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
        fits, fit_src = fitment(p, title, cat, stats, label)
        if not fits:
            stats.skip("no fitment in application tags", label)
            continue
        if fit_src == "universal":
            stats.qa.append(f"{label}: no application tag; universal turbo filed under fit.fam 'Universal'")
        tnotes = fit_notes_from_title(title)
        url = f"https://{HOST}/products/{p['handle']}"
        for v in p["variants"]:
            sku = (v.get("sku") or "").strip()
            vt = re.sub(r"\s+", " ", v["title"]).strip()
            if not sku:
                stats.skip("variant without SKU", f"{title}: {vt}")
                continue
            if cat == "injector":
                spec, perf = parse_injector(p, body, v, vt)
            elif cat == "turbo":
                spec, perf = parse_turbo(p, body, v, vt)
            else:
                spec, perf = parse_manifold(p, body, v, vt)
            brand = brand_of(p, title, sku)
            # stock = replaces the OEM part in its stock form (a stock-rated injector, a stock-flange manifold)
            stock = (spec.get("pctOver") == 0 and not spec.get("grade")) if cat == "injector" else (cat == "manifold" and not perf)
            emis, claim = emissions_for(title, body, p.get("tags", []), perf, stock)
            if claim:
                spec["carbClaim"] = claim
                stats.qa.append(f"{brand} {sku}: body claims '{claim}' but prints no CARB EO number; emissions left 'unknown': {title}")
            if cat == "injector" and "pctOver" not in spec and "hpRating" not in spec and "stage" not in spec:
                stats.qa.append(f"{brand} {sku}: injector without a % over / HP figure: {title} / {vt}")
            if cat == "turbo" and "compressorInducer" not in spec:
                if perf:
                    stats.qa.append(f"{brand} {sku}: performance turbo without compressor wheel size in title/variant/body: {title} / {vt}")
                else:
                    stats.no_wheel_stock += 1
            for f in fits:
                fam = f["fam"]
                if fam not in FAM:
                    stats.unknown_fams[fam] += 1
                notes = [x for x in [f.get("notes")] if x] + tnotes
                fit = {"fam": fam, "ci": FAM.get(fam, {}).get("ci"), "cyl": FAM.get(fam, {}).get("cyl", UNKNOWN_FAM_CYL.get(fam)),
                       "y0": f["y0"], "y1": f["y1"], "notes": ", ".join(notes) or None}
                rec = {
                    "m": brand, "p": sku, "cat": cat,
                    "name": make_name(cat, spec, {**f, "notes": f.get("notes")}),
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


NUMERIC_KEYS = {"pctOver", "hpRating", "hpRatingLow", "hpCapable", "compressorInducer", "turbineWheel", "ar", "hpLow", "hpHigh",
                "pieces", "angleDeg", "wallThickness", "flowGainPct", "flowLbMin", "boostPsi"}


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
    L.append("# BD extraction notes (BD Diesel)\n")
    L.append(f"Extracted {dt.date.today().isoformat()} by `extract_bd.py`. Source: public Shopify "
             f"`https://ca.bddiesel.com/products.json?limit=250&page=N` (the Canadian storefront; the US hosts fail TLS chain "
             f"verification, as the brief says).\n")
    L.append("## Fetch\n")
    L.append(f"- robots.txt: {stats.robots_note}.")
    L.append(f"- `{HOST}`: {stats.pages} page request(s) of up to 250 products, {stats.products} products in the listing. "
             f"Pages cached under `dl/bd/`.")
    L.append("- Prices (CAD on this storefront) are not stored.\n")
    L.append("## Records\n")
    L.append(f"Total records: **{len(recs)}** (one record per variant SKU per engine family)\n")
    L.append("| m (brand) | cat | records |\n|---|---|---|")
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
    L.append("- **Scope**: the listing is BD Diesel's full catalog (transmissions, converters, exhaust brakes, injection pumps, "
             "lift pumps, manifolds, turbos, injectors, hardware, apparel). Only `injector`, `turbo` and `manifold` are emitted, "
             "as the brief asks. Injection pumps (P7100 / VP44 / CP3 / VE, about 30 products) are in the catalog but outside "
             "this task's three categories; they are counted under Skipped and could be added as `injectionPump` later.")
    L.append("- **Brand** (`m`): the Shopify `vendor` field on this store is just the SKU, so the brand is taken from the product "
             "type (Garrett, BorgWarner, Alliant Power, Bosch) or the SKU shape (Bosch `0445…`/`0986…` numbers, Garrett "
             "`nnnnnn-nnnnS`, Alliant `APnnnnn`); everything else is `BD Diesel`. Resold Garrett/Bosch/Alliant Power stock parts "
             "therefore keep their own brand, with `src.doc` saying they came from bddiesel.com.")
    L.append("- **Fitment** comes from BD's application tags (`Dodge / 5.9L Cummins 04.5-07`, `Chevy/GM / Duramax 6.6L 11-16 "
             "LML-LGH`, `Ford / 6.7L Powerstroke 17-up`, ...) mapped to the shared family strings; the year range is then taken "
             "from the per-year fit tags (`2013/dodge-ram/ram-3500/6-7`) for that family's displacement, clipped to the "
             "application tag's window (so the 94-98 12-valve and 98.5-02 24-valve tags, which share the `5-9` code, get "
             "separate ranges). A product with both `07.5-12` and `13-18` tags becomes one `Cummins 6.7` record spanning both. "
             "Half-year breaks are floored into `y0` with `from 2004.5` in `fit.notes`; `19-up` / `17-up` tags leave `y1` as "
             "the last model year the fit tags list, noted as `listed through 2024`. Duramax engine codes (LB7/LLY/LBZ/LMM/"
             "LML/LGH/L5P) go to `fit.notes`, as do pickup vs cab & chassis, with/without SCR and 'non-California spec' from "
             "the title. Gasoline applications (`Ford / Gasoline`, `Dodge / Gasoline`, `Chevy/GM / Gasoline`) are resolved from "
             "the engine named in the title (3.5L EcoBoost, 6.2L Boss, 5.7L / 6.4L Hemi, Silverado 1500 V8 -> `GM LS`). "
             "Heavy-duty applications (Cummins ISX, Cat 3406E/C15/C12, Detroit) keep the catalog heading and are flagged.")
    L.append("- **Injectors**: one record per variant. `pctOver` and `hpRating` from the variant title (`33% (60hp)`, `50 HP`, "
             "`StockPlus 5-15 HP` -> `hpRatingLow` 5 / `hpRating` 15 with `grade: StockPlus`); plain `Stock` and stock "
             "replacement listings get `pctOver: 0`; the Ram 2019+ Bosch injectors carry `oemRating` Standard/High Output. "
             "`variantNote: Premium option` marks BD's Premium variant (the listing does not say what it adds). `stage` for the "
             "CP3-pump + injector packages (`package` says what is included). `type` common rail / HEUI / ISB / P7100 mechanical "
             "from the title; `diCode` and `cylinders` for the 7.3L HEUI DI-code injectors; `replacesOem` from the Bosch / "
             "Navistar numbers in the title; `tip` for the 12-valve VCO nozzles; `condition` new/reman (UpTime and Alliant "
             "Power 'refreshed' units are reman, exchange injectors are reman).")
    L.append("- **Turbos**: `compressorInducer` / `turbineWheel` (mm) and `ar` from the Iron Horn variant codes "
             "(`S364SXE/80 0.91 AR` -> 64 / 80 / 0.91, model `S364 SX-E`), the title (`S400 78/96 1.32`, `75mm / 96mm / 1.32 "
             "A/R`) or the body ('61.5mm billet compressor wheel', '13-blade 66mm turbine wheel', '66.2mm compressor and 67mm "
             "turbine wheels', '0.84 A/R turbine housing'); `model` is the turbo frame (HE351CW, HE300VG, HX35, GT37, GTP38, "
             "AVNT3788, GT3788VA, S400SX4, S478, S363 SX-E...); `vgt` true for VGT / AVNT / GT37 / HE300VG units, false for "
             "wastegated HX35 / S300 / S400 / GTP38 frames; `series` Screamer / Super B / Iron Horn / Howler / Turbo Thruster II; "
             "`stage`; `kit` and `includesManifold` for turbo + manifold packages; `compound` / `pair` for the 6.4L twins and "
             "EcoBoost pairs; `flange` T3/T4/T6; `hpCapable` from 'up to 690 horsepower'; `hpLow`/`hpHigh` from '600hp-750hp'; "
             "`flowLbMin`, `boostPsi`; `billetCompressor`; `cartridge` BorgWarner SX-E; `replacesOem` from the Ford number in the "
             "title; `condition` new / reman (exchange and remanufactured units).")
    L.append("- **Manifolds**: all exhaust. `side` driver / passenger / single / both (kits for V8s), `flange` T3/T4/T6 or "
             "`HE351 (OEM)`, `mount: stock` for stock-mount replacements, `angleDeg` for the 20/40-degree Cummins manifolds, "
             "`wastegated`, `pulse` (divided pulse manifold), `pieces`, `material` (high-silicon ductile iron), `wallThickness` "
             "(inches, from '0.275\" thick-walled'), `coating`, `kit` (gaskets + hardware included), `includesUpPipes`, "
             "`egrCompatible`, `egtPort`, `flowGainPct` (BD's quoted flow gain over stock).")
    L.append("- **emissions**: no CARB EO number is printed anywhere in this listing, so `carb_eo:` is never emitted. "
             "`oem_replacement` for stock-rated injectors (`pctOver: 0`), stock / OEM / exchange / service-replacement turbos "
             "(and the 'Stock Replacement' tag), and exhaust manifolds that keep the stock turbo flange (BD's thicker "
             "replacement castings); `no_eo_race_only` would come from a race-only / not-for-California disclaimer (none "
             "found); everything else (performance injectors, StockPlus, Screamer / Super B / Iron Horn / Howler turbos, "
             "T4 / T6 / wastegated manifolds) is `unknown`. Two turbos claim '50-state legal' / 'C.A.R.B. compliant' without "
             "a number: `spec.carbClaim` records the wording and they are flagged below for a human to look up the EO. "
             "Delete parts: none in the three categories (the only 'delete' items are transmission cooler-bypass deletes).\n")
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
    L.append("- The brief says BD holds CARB EOs on several lines; the products.json bodies never print an EO number, so every "
             "record is `unknown` or `oem_replacement`. The EO numbers would have to come from BD's CARB documentation page "
             "(not fetched: not part of the products.json source).")
    L.append("- Injector `hpRating` is the gain BD quotes for that variant ('33% (60hp)'), not engine output; 'StockPlus 5-15 HP' "
             "is a 5-15 HP gain with no % figure.")
    L.append("- 'INJECTORS & INSTALL KIT' listings include a set of BD-Built stock injectors plus lines and tubes: `injector` "
             "with `set` and `kit`. 'INJECTOR INSTALL KIT' (no injectors) is skipped.")
    L.append("- 'Performance CR Pump & Injectors Package' (Stage 1/2/3) bundles a 12 mm stroker CP3 with injectors; filed as "
             "`injector` with `spec.package` so the pump is not lost, since `injectionPump` is outside this task.")
    L.append("- 'Screamer Turbo Manifold Package' and 'Iron Horn Turbo Manifold Package' are `turbo` records with "
             "`includesManifold`; the Iron Horn 5.9L kit's 11 variants are the BorgWarner SX-E frame / turbine / A/R options.")
    L.append("- The 5.9L Super B and Iron Horn kits are tagged for both 94-98 12-valve and 98.5-02 24-valve, so they appear "
             "once per family with the same `p`.")
    L.append("- Howler 'VGT Turbo Kit' and 'Howler Stock VGT Turbo Kit' include the HE351VE-type turbo; the Howler controller "
             "and install kits (no turbo) are skipped.")
    L.append("- The 'Replacement S400SX4 Turbo' listed under product type `Turbo` with Cummins ISX / Detroit tags is filed under "
             "those heavy-duty headings; its BorgWarner twin (product type `BorgWarner`) is filed under brand BorgWarner.")
    L.append("- Exhaust manifold `side: both` is set for V8 'kit' / 'set' listings whose body says the set includes both sides; "
             "Cummins inline-6 kits are single manifolds with hardware.\n")
    L.append(f"- {stats.no_wheel_stock} stock-replacement turbo record(s) carry no wheel sizes (the listing gives only the "
             "frame / OEM number); they are not listed individually below.\n")
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
        stats.robots_note = robots_note(MIN_DELAY)
    else:
        import requests
        s = requests.Session()
        s.headers["User-Agent"] = UA
        products = fetch_all(s, stats)
    stats.pages = len(list(DL.glob("products_p*.json")))
    stats.products = len(products)
    log(f"{HOST}: {len(products)} products from {stats.pages} cached page(s)")
    if "--fetch-only" in argv:
        return 0

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
            "task": "BD",
            "brand": BRAND,
            "doc": SRC_DOC,
            "url": f"https://{HOST}/products.json?limit=250&page=N",
            "edition": EDITION,
            "note": "m is BD Diesel except resold Garrett / BorgWarner / Bosch / Alliant Power parts, which keep their own brand",
        },
        "extracted": dt.date.today().isoformat(),
        "count": len(recs),
        "parts": recs,
    }
    (OUT / "bd.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    write_notes(OUT / "bd.md", recs, stats, counts, errs)
    log(f"wrote {len(recs)} records; {len(errs)} validation errors; {len(stats.qa)} QA flags")
    for e in errs[:20]:
        log("  ERR", e)
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
