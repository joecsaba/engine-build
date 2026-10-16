#!/usr/bin/env python3
"""Parts catalog: BRODIX task (brodix.com cylinder-head series pages).

Re-runnable and resumable. Every fetched page is cached under dl/brodix/ and only re-fetched
with --refresh. Writes out/brodix.json (+ dl/brodix/brodix.run.json) and nothing else outside
dl/ and out/.

    python -I scripts/parts-catalog/extract_brodix.py [--refresh] [--fetch-only]

Ground rules honoured: robots.txt fetched and checked (Disallow / Crawl-delay) before any page;
one request at a time, >= 6 s apart; a 403 / Cloudflare / Incapsula response is recorded and the
source stopped, never retried or bypassed.

Source structure: WordPress (Beaver Builder) pages under https://brodix.com/heads-2/<group>/<series>
(plus /90-v6). Each series page carries three tables, normally inside a tabbed module
(Description | Photos | Details | Flow Chart | Easy Order Numbers | Instruction Sheet | Videos):

  * Details      - "Package Heads | Facts and Related Components": bullet list with valve PNs,
                   spring PN + closed/open lb + installed height + max lift, retainers, gaskets,
                   head studs, valve angle, rocker / piston / intake requirements.
  * Flow Chart   - "Part Number | Valve Size | 0.200 ... 0.900": intake row then exhaust row per
                   head model, cfm @ 28" H2O.
  * Easy Order   - "Part# | Easy Order # | Port Vol. | Cham. Vol. | Int/Exh Valve | Spring Seat
                   Pressure | Spring Diam. | Ret. ST/TI | Per": one row per orderable part number.

One `head` record is emitted per Easy Order row (per engine family). Tables are located by their
header signature, not by tab label, because one page (11 X) has broken tab shortcodes.
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
DL = HERE / "dl" / "brodix"
OUT = HERE / "out"
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
MIN_GAP = 6.0
HOSTS = {"brodix.com", "www.brodix.com"}
ROOT = "https://brodix.com/"
CATEGORY_PAGES = [
    "https://brodix.com/heads-2",
    "https://brodix.com/heads-2/small-block-chevrolet-compatible-heads",
    "https://brodix.com/heads-2/big-block-chevrolet-compatible-heads",
    "https://brodix.com/heads-2/ford-mopar",
    "https://brodix.com/ls-compatible-heads",
    "https://brodix.com/v6-chevy",
]
SERIES_RX = re.compile(r"^https?://(?:www\.)?brodix\.com/(heads-2/[^/?#]+/[^/?#]+|90-v6)/?$")
SRC_DOC = "brodix.com cylinder head series pages (Easy Order Numbers, Flow Chart and Details tables)"
EDITION = "2026-10"

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
SBC = ["Small-block Chevy"]
BBC = ["Chevy Mark IV big block", "Chevy Gen VI big block"]
LS = ["GM LS"]
SBF = ["Small-block Ford (Windsor)"]
MOPAR_LA = ["Mopar LA small block"]
MOPAR_BB = ["Mopar B/RB big block"]

# slug -> (families, fit.notes).  Families not in the shared list are the catalog's own heading and
# are flagged in the notes file.  Slugs missing here fall back to the URL group.
SLUG_FAMILY = {
    "br-ls": (LS, "LS7-style rectangle port"),
    "br-3-series-ls-compatible-series-cylinder-heads15": (LS, "LS3/L92-style rectangle port"),
    "br-1-13-series-ls-compatible-series-cylinder-heads13-5": (LS, "cathedral port"),
    "4-500-bore-series-head": (["Chevy 4.500 bore spacing small block"],
                               "4.500 bore spacing block only (Brodix aluminum block)"),
    "pb-5000-series15": (["Chevy 5.0 bore spacing big block"], "5.0 bore spacing block only"),
    "race-rite-big-block-series26": (BBC, "exhaust ports in stock location"),
    "race-rite-big-block-series24": (BBC, "exhaust ports in stock location"),
    "bf-series": (SBF, "shaft rockers required"),
    "lh-series": (SBF, "Windsor"),
    "head-hunter-f-series15": (SBF, "Windsor"),
    "ik-ford": (SBF, "Windsor"),
    "st-series": (SBF, "Windsor; raised exhaust port"),
    "track-1": (SBF, "Windsor; raised exhaust port"),
    "90-v6": (["Chevy 90-degree V6"], None),
}
GROUP_FAMILY = {
    "small-block-chevrolet-compatible-heads": SBC,
    "big-block-chevrolet-compatible-heads": BBC,
}
# model-prefix overrides on the mixed Ford/Mopar/Chevy pages (B1 series, ASCS/SUPR, Spec)
MODEL_FAMILY = [
    (r"^B1 BA\b", MOPAR_LA, "340/360 LA (also R block); stock-type rockers on B1 stands"),
    (r"^B1 BS\b|^STS B1 BS\b", MOPAR_BB, "B/RB; B1 BS rocker system"),
    (r"^B1 MO\b", MOPAR_BB, "B/RB; B1 intake manifold and shaft rockers required"),
    (r"^SP CH\b|^11 SP", SBC, None),
    (r"^SP FO\b|^27-223|T1 F STD", SBF, None),
    (r"^SP MO\b|^27-222", MOPAR_LA, None),
]
CYL6_FAMILIES = {"Chevy 90-degree V6", "Buick V6 181-252"}
# engine codes the ASCS/SUPR and Spec pages use in place of model names
ALL_CODES = {"CH", "FO", "MO", "SPCH", "SPFO", "SPMO"}


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

    def get(self, url, cache_name):
        """Return page text (cached), following same-site redirects. Raises Blocked."""
        cache = DL / cache_name
        if cache.exists() and not self.refresh:
            self.cached += 1
            return cache.read_text(encoding="utf-8", errors="replace")
        for _hop in range(5):
            host = urlsplit(url).netloc
            if host not in HOSTS:
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


def cache_name(url):
    p = urlsplit(url).path.strip("/").replace("/", "__") or "home"
    return re.sub(r"[^A-Za-z0-9_.-]", "_", p) + ".html"


def discover_series(f, info):
    """Series page URLs from the site nav and the category pages (ordered, de-duplicated)."""
    urls = []
    for cat in [ROOT] + CATEGORY_PAGES:
        try:
            html = f.get(cat, cache_name(cat))
        except Blocked as e:
            info.setdefault("errors", []).append(f"{cat}: {e}")
            continue
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            h = urljoin(cat, a["href"]).split("#")[0].split("?")[0].rstrip("/")
            if SERIES_RX.match(h) and h not in urls:
                urls.append(h)
    info["series_urls"] = urls
    return urls


# --------------------------------------------------------------------------- helpers

def clean(s):
    return re.sub(r"\s+", " ", s.replace("\xa0", " ").replace("™", "")).strip()


def num(s):
    s = clean(s).replace('"', "").replace(",", "")
    if not re.fullmatch(r"[+-]?\d*\.?\d+", s):
        return None
    v = float(s)
    return int(v) if v.is_integer() and "." not in s else v


def norm_key(s):
    """Model-name key: upper, no trademark/parentheticals, 'Track 1' -> 'T1', no spaces/hyphens."""
    s = clean(s).upper()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"\b4\.600 BORE\b", " ", s)
    s = re.sub(r"\bTRACK\s*1", "T1", s)
    s = re.sub(r"[\s\-–/]+", "", s)
    return s


def cells(tr):
    return [clean(c.get_text(" ")) for c in tr.find_all(["td", "th"])]


# --------------------------------------------------------------------------- Details table

SPRING_RX = re.compile(
    r"(\d\.\d{3})\s+([A-Za-z \-]*?Spring)\s*[-–]\s*([A-Z]{2,3}\s*[\dA-Z]+(?:\s*OR\s*[A-Z]{2,3}\s*[\dA-Z]+)?)\s*,?\s*"
    r"(\d+)\s*lb\s*Closed,?\s*(\d+)\s*lb\s*Open,?\s*(\d\.\d{3})\s*Installed Height,?\s*"
    r"(\.\d{3})\s*Max\w*\s*Lift\s*(\([^)]*\))?", re.I | re.S)


def parse_details(table):
    """-> dict key(lower) -> value text, from the two bullet-list cells."""
    out = {}
    rows = table.find_all("tr")
    for tr in rows[1:]:
        for td in tr.find_all(["td", "th"]):
            txt = td.get_text("\n", strip=True).replace("\xa0", " ")
            for item in re.split(r"\n?\s*•\s*", txt):
                item = clean(item.replace("\n", " "))
                if not item:
                    continue
                if ":" in item:
                    k, v = item.split(":", 1)
                    k = clean(k).lower().rstrip(":")
                    if k and k not in out:
                        out[k] = clean(v)
                else:
                    out.setdefault("_bare", []).append(item)
    return out


def parse_springs(text):
    opts = []
    for m in SPRING_RX.finditer(text or ""):
        od, kind, pn, closed, opened, ih, lift, qual = m.groups()
        k = kind.lower()
        if "hydraulic roller" in k:
            ctype = "hydraulic_roller"
        elif "hydraulic" in k:
            ctype = "hydraulic_flat"
        elif "flat tappet" in k:
            ctype = "flat_tappet"
        else:
            ctype = "solid_roller"
        opts.append({"od": float(od), "pn": clean(pn.upper().replace(" OR ", " or ")), "seatLb": int(closed),
                     "openLb": int(opened), "installedHt": float(ih), "maxLift": float(lift),
                     "camType": ctype, "qual": clean(qual or "")})
    return opts


def model_tokens(paren):
    """Split '(BR 7, STS BR 7 273)' / '(IK 215, BP IK 210)' / '(229)' / '(PB 1800-1802)' into keys."""
    inner = paren.strip("() ")
    inner = re.sub(r"\b(Standard Package|Spring Upgrade|Trim to Fit)\b", "", inner, flags=re.I)
    toks = []
    for part in re.split(r",|\bor\b|&|\band\b|;|/", inner):
        part = clean(part).strip("-– ")
        if not part:
            continue
        m = re.fullmatch(r"(.*?)(\d{3,4})\s*-\s*(\d{3,4})", part)
        if m:
            a, b = int(m.group(2)), int(m.group(3))
            if 0 < b - a < 10:
                for n in range(a, b + 1):
                    toks.append(norm_key(f"{m.group(1)}{n}"))
                continue
        toks.append(norm_key(part))
    return [t for t in toks if t]


def tok_quality(tok, key, port, codes=()):
    """How well a parenthetical token names this model: 2 exact, 1 prefix/suffix, 0 no."""
    if not tok:
        return 0
    if tok.isdigit():
        return 2 if (port is not None and int(tok) == port) else 0
    if tok in codes:
        return 2
    k2 = key.replace("STD", "")
    if tok == key or tok == k2:
        return 2
    if key.startswith(tok) or k2.startswith(tok) or key.endswith(tok) or tok.endswith(key) or tok.endswith(k2):
        return 1
    return 0


def tok_matches(tok, key, port, codes=()):
    return tok_quality(tok, key, port, codes) > 0


def pick(text, key, port, page_keys, codes=()):
    """Pick the segment of a Details value that applies to this model, or the whole value.

    Values look like 'A (model, model) B (model)' or 'A (Standard Package) B (Spring Upgrade)'.
    If any parenthetical names a model of this page, the value is model-qualified and only the
    best-matching segment(s) are returned (exact model match beats a prefix match; None when
    nothing matches)."""
    if not text:
        return None
    # thickness / bolt-point qualifiers such as '(.060)' or '(12 pt)' are not model lists
    text = re.sub(r"\(\s*(\.\d+|\d+\s*pt\.?)\s*\)", " ", text, flags=re.I)
    parens = list(re.finditer(r"\([^)]*\)", text))
    if not parens:
        return clean(text)
    qualified = False
    segs = []
    start = 0
    for p in parens:
        toks = model_tokens(p.group(0))
        is_model = any(any(tok_matches(t, k, None, codes) for k in page_keys) or t.isdigit() or t in ALL_CODES
                       for t in toks)
        seg = clean(text[start:p.start()]).strip(" -–,")
        q = max((tok_quality(t, key, port, codes) for t in toks), default=0) if is_model else 0
        segs.append((seg, q, is_model))
        start = p.end()
        qualified = qualified or is_model
    tail = clean(text[start:]).strip(" -–,")
    if not qualified:
        return clean(re.sub(r"\([^)]*\)", "", text))
    best = max(q for _, q, _ in segs)
    # a segment with an empty text inherits the previous segment's text (shared value, two lists)
    prev = ""
    chosen = []
    for seg, q, is_model in segs:
        val = seg or prev
        prev = val
        if is_model and q and q == best:
            chosen.append(val)
        elif not is_model and seg:
            chosen.append(seg)         # unqualified text (e.g. 'Standard Package') applies to all
    if tail and not segs[-1][2]:
        chosen.append(tail)
    chosen = [c for c in chosen if c]
    if not chosen:
        return None
    return " / ".join(dict.fromkeys(chosen))


def parse_valve_angle(text):
    """'26° and 4° Intake, 17° and 4° Exhaust' -> (26, 17, 4); '15°' -> (15, None, None)."""
    if not text:
        return None, None, None
    m = re.search(r"(\d+(?:\.\d+)?)°\s*(?:and|&)\s*(\d+)°\s*Intake.*?(\d+(?:\.\d+)?)°\s*(?:and|&)\s*(\d+)°\s*Exhaust",
                  text, re.I | re.S)
    if m:
        return float(m.group(1)), float(m.group(3)), float(m.group(2))
    m = re.search(r"(\d+(?:\.\d+)?)\s*°", text)
    if m:
        return float(m.group(1)), None, None
    return None, None, None


# --------------------------------------------------------------------------- Flow table

def parse_flow(table, qa, page):
    rows = table.find_all("tr")
    header = cells(rows[0])
    lifts = []
    for h in header[2:]:
        v = num(h)
        if v is None:
            qa.append(f"{page}: flow header cell {h!r} not numeric")
            lifts.append(None)
            continue
        if v > 1:                # typos such as '7.000' / '8.000' for .700 / .800
            v = v / 10
        lifts.append(round(v, 3))
    models = []
    cur = None
    for tr in rows[1:]:
        c = cells(tr)
        if len(c) == len(header):
            label, valve, vals = c[0], c[1], c[2:]
            cur = {"label": label, "key": norm_key(label), "flow": [], "intakeValve": None, "exhaustValve": None,
                   "intSeat": None, "exhSeat": None, "cnc": None}
            low = label.lower()
            if "cnc ported" in low:
                cur["cnc"] = "CNC ported"
            elif "cnc combustion" in low:
                cur["cnc"] = "CNC combustion chamber"
            elif "hand ported" in low:
                cur["cnc"] = "hand ported"
            elif "(ported)" in low:
                cur["cnc"] = "ported"
            models.append(cur)
            side = "int"
        elif len(c) == len(header) - 1 and cur is not None:
            valve, vals = c[0], c[1:]
            side = "exh"
        else:
            if any(c):
                qa.append(f"{page}: flow row with {len(c)} cells skipped: {c[:3]}")
            continue
        m = re.match(r"(\d\.\d{2,3})\s*(Intake|Exhaust)\s*(\d+)?°?", valve, re.I)
        if not m:
            qa.append(f"{page}: flow valve cell {valve!r} not parsed")
            continue
        if side == "int":
            cur["intakeValve"] = float(m.group(1))
            cur["intSeat"] = int(m.group(3)) if m.group(3) else None
        else:
            cur["exhaustValve"] = float(m.group(1))
            cur["exhSeat"] = int(m.group(3)) if m.group(3) else None
        for lift, v in zip(lifts, vals):
            if lift is None:
                continue
            n = num(v)
            if n is None:
                continue
            pt = next((p for p in cur["flow"] if p["lift"] == lift), None)
            if pt is None:
                pt = {"lift": lift}
                cur["flow"].append(pt)
            pt[side] = n
    for mdl in models:
        mdl["flow"].sort(key=lambda p: p["lift"])
    return models


def flow_index(models):
    """key -> model dict (first wins), with range / slash aliases."""
    idx = {}

    def put(k, m):
        if k and k not in idx:
            idx[k] = m

    for m in models:
        put(m["key"], m)
        lab = re.sub(r"\([^)]*\)", "", m["label"])
        r = re.match(r"^(.*?)(\d{3})\s*-\s*(\d{3})\s*$", clean(lab))
        if r and 0 < int(r.group(3)) - int(r.group(2)) < 10:
            for n in range(int(r.group(2)), int(r.group(3)) + 1):
                put(norm_key(f"{r.group(1)}{n}"), m)
        if "/" in lab:
            a, b = lab.split("/", 1)
            head = clean(a).rsplit(" ", 1)
            if len(head) == 2:
                put(norm_key(f"{head[0]} {head[1]}"), m)
                put(norm_key(f"{head[0]} {b}"), m)
    put("BPHHBBX", idx.get("HHX"))
    put("BPLH17195", idx.get("BPLHF17195"))
    return idx


def find_flow(idx, key, port, lightened):
    cands = [key]
    if "STD" in key:
        cands.append(key.replace("STD", ""))
    if port:
        cands += [c + str(port) for c in list(cands)]
    if key.startswith("BP"):
        cands.append(key[2:])
    if lightened:
        cands += [c[:-1] for c in list(cands) if c.endswith("L")]
    for c in cands:
        if c in idx and idx[c] is not None:
            return idx[c]
    return None


# --------------------------------------------------------------------------- Easy Order table

KIND_RX = re.compile(r"\b(BARE|PKG|PACKAGE|COMBO|SPECIAL)\b", re.I)


def parse_part_name(raw):
    """'** BP BR 3 PKG **' -> model 'BP BR 3', kind 'pkg', extras."""
    s = clean(raw).strip("*").strip()
    extras = {}
    if raw.strip().startswith("**"):
        extras["popular"] = True
    m = re.search(r"\((\d+(?:\.\d+)?)°\)", s)
    if m:
        extras["valveAngle"] = float(m.group(1))
        s = s.replace(m.group(0), " ")
    if re.search(r"\bW/\s*DN\b", s, re.I):
        extras["downNozzle"] = True
        s = re.sub(r"\bW/\s*DN\b", " ", s, flags=re.I)
    m = re.search(r"\bWith T&D Rockers?\b", s, re.I)
    if m:
        extras["comboRockers"] = "T&D"
        s = s[:m.start()]
    kind = None
    m = KIND_RX.search(s)
    if m:
        kind = m.group(1).lower()
        if kind == "package":
            kind = "pkg"
        model = clean(s[:m.start()] + " " + s[m.end():])
    else:
        model = clean(s)
    m = re.search(r"\b(350|400)$", model)
    if m and kind == "combo":
        extras["comboIntakeFor"] = int(m.group(1))
        model = clean(model[:m.start()])
    if re.search(r"\bCNC$", model):
        extras["cncMachinedBare"] = True
        model = clean(model[:-3])
    if re.search(r"\s(L)$", model):
        extras["lightened"] = True
        model = clean(model[:-2])
    return model, kind, extras


def parse_valves(s):
    """'2.165 / 1.590', '2.500TI/1.830TI', '2.180 TI / 1.625 ST' -> (2.165, 1.59, {'int': 'titanium', ...})."""
    s = clean(s)
    if not s:
        return None, None, {}
    parts = [p.strip() for p in s.split("/")]
    if len(parts) != 2:
        return None, None, {}
    vals, mats = [], {}
    for side, p in zip(("int", "exh"), parts):
        m = re.match(r"(\d\.\d{1,3})\s*(TI|ST)?", p, re.I)
        if not m:
            return None, None, {}
        vals.append(float(m.group(1)))
        if m.group(2):
            mats[side] = "titanium" if m.group(2).upper() == "TI" else "steel"
    return vals[0], vals[1], mats


def parse_easy(table, page, qa):
    rows = table.find_all("tr")
    header = cells(rows[0])
    if not (header and header[0].startswith("Part") and len(header) >= 9):
        qa.append(f"{page}: easy-order table has unexpected header {header}")
        return [], []
    out, skipped = [], []
    for tr in rows[1:]:
        c = cells(tr)
        if len(c) < 9:
            if c and not c[0].startswith("*"):
                skipped.append(f"{page}: short easy-order row {c}")
            continue
        raw, pn, port, cham, valves, seat, sdia, ret, per = c[:9]
        pn = clean(pn.replace(" ", " "))
        if not pn:
            skipped.append(f"{page}: no Easy Order number for {raw!r}")
            continue
        if not re.fullmatch(r"\d{7}(-\d)?( [AS])?", pn):
            skipped.append(f"{page}: odd Easy Order number {pn!r} for {raw!r}")
            continue
        if re.search(r"custom", port, re.I) or re.search(r"custom", cham, re.I):
            skipped.append(f"{page}: {raw!r} {pn} is custom order (no specs)")
            continue
        model, kind, extras = parse_part_name(raw)
        if kind == "special":
            skipped.append(f"{page}: {raw!r} {pn} is a 'Special' (custom order) line")
            continue
        iv, ev, mats = parse_valves(valves)
        if valves and iv is None:
            qa.append(f"{page}: {pn} valve cell {valves!r} not parsed")
        ports = [int(x) for x in re.findall(r"\d{3}", port)]
        out.append({
            "raw": clean(raw), "pn": pn, "model": model, "kind": kind, "extras": extras,
            "port": ports[0] if len(ports) == 1 else None,
            "portOptions": ports if len(ports) > 1 else None,
            "chamber": num(cham), "intakeValve": iv, "exhaustValve": ev, "valveMaterial": mats,
            "seatLb": num(seat), "springDia": num(sdia),
            "retainer": {"ST": "steel", "TI": "titanium"}.get(ret.upper()) if ret else None,
            "per": num(per),
        })
    return out, skipped


# --------------------------------------------------------------------------- page -> records

def page_tables(soup):
    det = flow = easy = None
    for t in soup.find_all("table"):
        rows = t.find_all("tr")
        if not rows:
            continue
        h = cells(rows[0])
        if h[:1] == ["Package Heads"] and det is None:
            det = t
        elif len(h) > 2 and h[1] == "Valve Size" and flow is None:
            flow = t
        elif h and h[0].startswith("Part") and any("Easy" in x for x in h) and easy is None:
            easy = t
    return det, flow, easy


def page_title(soup):
    t = soup.find("h1")
    if t and clean(t.get_text(" ")):
        return clean(t.get_text(" "))
    if soup.title:
        return clean(soup.title.get_text().split("–")[0])
    return ""


def families_for(slug, group, model):
    for rx, fams, note in MODEL_FAMILY:
        if re.search(rx, model):
            return fams, note
    if slug in SLUG_FAMILY:
        return SLUG_FAMILY[slug]
    return GROUP_FAMILY.get(group, [slug]), None


def head_name(row, spec):
    parts = [row["model"] + (" " + row["kind"].capitalize() if row["kind"] else "")]
    if spec.get("intakeRunnerCc"):
        parts.append(f"{spec['intakeRunnerCc']} cc intake port")
    elif spec.get("intakeRunnerCcOptions"):
        parts.append("/".join(str(x) for x in spec["intakeRunnerCcOptions"]) + " cc intake port")
    if spec.get("chamberCc"):
        parts.append(f"{spec['chamberCc']} cc chamber")
    if spec.get("intakeValve") and spec.get("exhaustValve"):
        parts.append(f"{spec['intakeValve']:.3f}/{spec['exhaustValve']:.3f} valves")
    if spec.get("seatLb"):
        parts.append(f"{spec['seatLb']} lb seat")
    if spec.get("valveAngle") is not None:
        parts.append(f"{spec['valveAngle']:g}° valve angle")
    return ", ".join(parts)


def extract_page(url, html, notes, qa, skipped, seen):
    soup = BeautifulSoup(html, "html.parser")
    path = urlsplit(url).path.strip("/").split("/")
    slug, group = path[-1], (path[1] if len(path) > 2 else path[0])
    title = page_title(soup)
    det_t, flow_t, easy_t = page_tables(soup)
    page = slug
    pinfo = {"url": url, "title": title, "tables": {"details": det_t is not None, "flow": flow_t is not None,
                                                     "easyOrder": easy_t is not None}}
    notes["pages"][slug] = pinfo
    if easy_t is None:
        pinfo["records"] = 0
        skipped.append(f"{page}: no Easy Order table (title {title!r})")
        return []
    rows, sk = parse_easy(easy_t, page, qa)
    skipped.extend(sk)
    page_keys = {r["model"] and norm_key(r["model"]) for r in rows}
    flows = parse_flow(flow_t, qa, page) if flow_t is not None else []
    fidx = flow_index(flows)
    det = parse_details(det_t) if det_t is not None else {}
    springs = parse_springs(det.get("valve springs"))
    page_angles = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)°", title)]
    title_angle = page_angles[0] if len(page_angles) == 1 else None
    body_text = soup.get_text(" ")
    a356 = bool(re.search(r"A-?356", body_text))
    min_bore = None
    for item in det.get("_bare", []):
        m = re.search(r"(\d\.\d{3})\s*Min\w*\s*Bore", item, re.I)
        if m:
            min_bore = float(m.group(1))
    pinfo["flowModels"] = [m["label"] for m in flows]
    pinfo["springOptions"] = [f"{s['pn']} {s['od']:.3f} {s['seatLb']}/{s['openLb']} lb @ {s['installedHt']:.3f}"
                              + (f" {s['qual']}" if s["qual"] else "") for s in springs]
    unmatched_flow = []
    recs = []
    for r in rows:
        key = norm_key(r["model"])
        fams, fnote = families_for(slug, group, r["model"])
        # the ASCS/SUPR and Spec pages qualify their facts with engine codes instead of model names
        codes = {SBC[0]: ("CH", "SPCH"), SBF[0]: ("FO", "SPFO"), MOPAR_LA[0]: ("MO", "SPMO")}.get(fams[0], ())
        spec = {}
        if r["port"] is not None:
            spec["intakeRunnerCc"] = r["port"]
        if r["portOptions"]:
            spec["intakeRunnerCcOptions"] = r["portOptions"]
            qa.append(f"{page}: {r['pn']} lists two port volumes {r['portOptions']} (combo of two head options)")
        if r["chamber"] is not None:
            spec["chamberCc"] = r["chamber"]
        if r["intakeValve"]:
            spec["intakeValve"] = r["intakeValve"]
            spec["exhaustValve"] = r["exhaustValve"]
        if r["valveMaterial"]:
            spec["valveMaterial"] = r["valveMaterial"]
        if r["seatLb"] is not None:
            spec["seatLb"] = r["seatLb"]
        if r["springDia"] is not None:
            spec["springDia"] = r["springDia"]
        if r["retainer"]:
            spec["retainer"] = r["retainer"]
        kind = r["kind"]
        if kind == "bare":
            spec["bare"] = True
        elif kind in ("pkg", "combo"):
            spec["bare"] = False
        else:
            spec["bare"] = r["seatLb"] is None and r["intakeValve"] is None
        if kind == "combo":
            spec["package"] = "combo (heads + intake manifold)"
            if r["extras"].get("comboIntakeFor"):
                spec["comboIntakeFor"] = r["extras"]["comboIntakeFor"]
            if r["extras"].get("comboRockers"):
                spec["comboRockers"] = r["extras"]["comboRockers"]
        elif kind == "pkg":
            spec["package"] = "assembled"
        for k in ("downNozzle", "lightened", "cncMachinedBare", "popular"):
            if r["extras"].get(k):
                spec[k] = True
        # valve angle: row parenthetical > Details > page title
        va, vae, cant = parse_valve_angle(pick(det.get("valve angle"), key, r["port"], page_keys, codes))
        if r["extras"].get("valveAngle") is not None:
            va = r["extras"]["valveAngle"]
        if va is None:
            va = title_angle
        if va is not None:
            spec["valveAngle"] = va
        if vae is not None:
            spec["valveAngleExh"] = vae
        if cant is not None:
            spec["valveCant"] = cant
        # flow
        fm = find_flow(fidx, key, r["port"], r["extras"].get("lightened"))
        if fm is not None and r["port"] is not None:
            # combos named after one head but carrying another head's port volume (e.g. 'DS 320 Combo' 365 cc)
            lab_nums = [int(x) for x in re.findall(r"\b(\d{3})\b", re.sub(r"\([^)]*\)", "", fm["label"]))]
            if lab_nums and r["port"] not in lab_nums:
                stem = re.sub(r"\d{3}", "", key)
                alt = next((m for m in flows if r["port"] in [int(x) for x in re.findall(r"\b(\d{3})\b", m["label"])]
                            and re.sub(r"\d{3}", "", m["key"]) == stem), None)
                if alt is not None:
                    qa.append(f"{page}: {r['pn']} {r['raw']!r} has {r['port']} cc port; flow taken from "
                              f"{alt['label']!r} instead of {fm['label']!r}")
                    fm = alt
        if fm is not None:
            if fm["flow"]:
                spec["flow"] = [dict(p) for p in fm["flow"]]
                spec["flowModel"] = fm["label"]
                spec["flowDepression"] = 28
            if fm["cnc"]:
                spec["porting"] = fm["cnc"]
            if fm["intSeat"]:
                spec["intakeSeatAngle"] = fm["intSeat"]
            if fm["exhSeat"]:
                spec["exhaustSeatAngle"] = fm["exhSeat"]
            if spec.get("intakeValve") and fm["intakeValve"] and (
                    abs(spec["intakeValve"] - fm["intakeValve"]) > 0.001
                    or (fm["exhaustValve"] and abs(spec["exhaustValve"] - fm["exhaustValve"]) > 0.001)):
                spec["flowValves"] = f"{fm['intakeValve']:.3f}/{fm['exhaustValve']:.3f}" if fm["exhaustValve"] else f"{fm['intakeValve']:.3f}"
                qa.append(f"{page}: {r['pn']} valves {spec['intakeValve']}/{spec['exhaustValve']} differ from "
                          f"flow chart {spec['flowValves']} ({fm['label']})")
        else:
            unmatched_flow.append(f"{r['raw']} ({r['pn']})")
        if "porting" not in spec and re.match(r"^(BP|STS|WP)\b", r["model"]):
            spec["porting"] = "CNC ported"
        # spring (from Details) matched by diameter then nearest seat pressure
        if r["springDia"] is not None and springs:
            cands = []
            for s in springs:
                q = None
                if s["qual"]:
                    toks = model_tokens(s["qual"])
                    is_model = any(any(tok_matches(t, k, None, codes) for k in page_keys) for t in toks)
                    if is_model:
                        q = max(tok_quality(t, key, r["port"], codes) for t in toks)
                        if not q:
                            continue
                if abs(s["od"] - r["springDia"]) <= 0.021:
                    cands.append((q, s))
            best_q = max((q for q, _ in cands if q), default=None)
            cands = [s for q, s in cands if q is None or q == best_q]
            if cands:
                seat = r["seatLb"] if r["seatLb"] is not None else -1
                best = min(cands, key=lambda s: abs(s["seatLb"] - seat))
                if r["seatLb"] is None or abs(best["seatLb"] - r["seatLb"]) <= 30:
                    spec["spring"] = {k: best[k] for k in ("pn", "od", "seatLb", "openLb", "installedHt", "maxLift")}
                    spec["maxLift"] = best["maxLift"]
                    spec["camType"] = best["camType"]
        # facts from Details that apply to this model
        rel = {}
        for dk, sk_ in (("intake valves", "intakeValvePn"), ("exhaust valves", "exhaustValvePn"),
                        ("intake gaskets", "intakeGasket"), ("head gaskets", "headGasket"),
                        ("exhaust gaskets", "exhaustGasket"), ("head studs", "headStuds"),
                        ("head bolts", "headBolts"), ("intake manifold", "intakeManifold"),
                        ("intake manifolds", "intakeManifold"), ("rocker arms", "rockerArms"),
                        ("pistons", "pistons"), ("spring pockets", "springPocket")):
            v = pick(det.get(dk), key, r["port"], page_keys, codes)
            if v and sk_ not in rel:
                rel[sk_] = v
        if rel.get("rockerArms"):
            ra = rel["rockerArms"].lower()
            if "shaft" in ra and "standard" not in ra:
                spec["rockers"] = "shaft"
            elif "standard" in ra or "stock" in ra or "roller rockers" in ra:
                spec["rockers"] = "stud"
        if rel.get("pistons"):
            pz = rel["pistons"].lower()
            spec["pistons"] = "standard" if pz.startswith("standard") else "special"
        if rel.get("springPocket"):
            m = re.search(r"(\d\.\d{3})\D*$", rel["springPocket"])
            m2 = re.findall(r"(\d\.\d{3})", rel["springPocket"])
            if m2:
                spec["maxSpringPocket"] = float(m2[-1])
        for k in ("intakeValvePn", "exhaustValvePn", "intakeGasket", "headGasket", "exhaustGasket",
                  "headStuds", "headBolts", "intakeManifold"):
            if rel.get(k) and rel[k].lower() not in ("n/a", "standard", "call for options"):
                spec.setdefault("related", {})[k] = rel[k]
        if min_bore:
            spec["minBore"] = min_bore
        bs = pick(det.get("bore sizes"), key, r["port"], page_keys, codes)
        if bs:
            spec["boreRange"] = bs
        if a356:
            spec["material"] = "A356 aluminum"
        m = re.fullmatch(r"\d{7}(?:-\d)? ([AS])", r["pn"])
        if m:
            spec["sparkPlug"] = "angle" if m.group(1) == "A" else "straight"
        if r["per"] is not None:
            spec["per"] = r["per"]
        spec["catalogDesc"] = r["raw"].strip("*").strip()

        fnotes = [fnote] if fnote else []
        if spec.get("rockers") == "shaft" and "shaft rockers" not in (fnote or ""):
            fnotes.append("shaft rockers required")
        if spec.get("pistons") == "special":
            fnotes.append("special pistons")
        for fam in fams:
            k = (r["pn"], fam)
            if k in seen:
                msg = f"{page}: duplicate Easy Order number {r['pn']} ({r['raw']}) - kept first"
                if msg not in skipped:
                    skipped.append(msg)
                continue
            seen.add(k)
            fit = {"fam": fam}
            if fam in CYL6_FAMILIES:
                fit["cyl"] = 6
            elif fam in KNOWN_FAMILIES or "bore spacing" in fam:
                fit["cyl"] = 8
            if fnotes:
                fit["notes"] = "; ".join(fnotes)
            if fam not in KNOWN_FAMILIES:
                notes.setdefault("unknown_families", {}).setdefault(fam, []).append(r["pn"])
            recs.append({
                "m": "Brodix",
                "p": r["pn"],
                "cat": "head",
                "name": head_name(r, spec),
                "fit": fit,
                "spec": json.loads(json.dumps(spec)),
                "src": {"doc": SRC_DOC, "edition": EDITION, "url": url},
                "emissions": None,
            })
    pinfo["rows"] = len(rows)
    pinfo["records"] = len(recs)
    pinfo["families"] = sorted({x["fit"]["fam"] for x in recs})
    if unmatched_flow:
        pinfo["noFlowMatch"] = unmatched_flow
    return recs


# --------------------------------------------------------------------------- validate / main

NUMERIC_KEYS = ("chamberCc", "intakeRunnerCc", "intakeValve", "exhaustValve", "seatLb", "springDia", "maxLift",
                "valveAngle", "valveAngleExh", "valveCant", "minBore", "per", "maxSpringPocket",
                "intakeSeatAngle", "exhaustSeatAngle", "comboIntakeFor")


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
        for k in NUMERIC_KEYS:
            v = r["spec"].get(k)
            if v is not None and not isinstance(v, (int, float)):
                problems.append(f"{r['m']} {r['p']}: spec.{k} not numeric: {v!r}")
        for p in r["spec"].get("flow", []):
            for k, v in p.items():
                if not isinstance(v, (int, float)):
                    problems.append(f"{r['m']} {r['p']}: flow {k} not numeric: {v!r}")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="ignore the dl/ cache and re-fetch")
    ap.add_argument("--fetch-only", action="store_true", help="discover and cache the pages, no parsing")
    args = ap.parse_args()
    DL.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    f = Fetcher(refresh=args.refresh)
    info = {}
    urls = discover_series(f, info)
    pages = {}
    for u in urls:
        try:
            pages[u] = f.get(u, cache_name(u))
        except Blocked as e:
            info.setdefault("errors", []).append(f"{u}: {e}")
            if f.blocked_hosts:
                break
    print(f"series pages: {len(urls)} fetched={len(pages)} requests={f.requests} cached={f.cached}")
    if args.fetch_only:
        print(json.dumps(info, indent=1))
        return 0

    notes = {"pages": {}}
    qa, skipped = [], []
    seen = set()
    parts = []
    for u, html in pages.items():
        parts.extend(extract_page(u, html, notes, qa, skipped, seen))
    problems = validate(parts)
    today = dt.date.today().isoformat()
    doc = {
        "source": {
            "brand": "Brodix",
            "doc": SRC_DOC,
            "url": "https://brodix.com/heads-2",
            "robots": "no Crawl-delay, only /wp-content/cache/ disallowed for *; 6 s spacing used",
            "pages": len(pages),
            "userAgent": UA,
        },
        "extracted": today,
        "count": len(parts),
        "parts": parts,
    }
    (OUT / "brodix.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    fams = {}
    for r in parts:
        fams[r["fit"]["fam"]] = fams.get(r["fit"]["fam"], 0) + 1
    run = {"date": today, "requests": f.requests, "cached": f.cached, "log": f.log, "discovery": info,
           "notes": notes, "skipped": skipped, "qa": qa, "problems": problems,
           "counts": {"records": len(parts), "distinctPns": len({r["p"] for r in parts}), "byFamily": fams,
                      "withFlow": sum(1 for r in parts if r["spec"].get("flow")),
                      "withSpring": sum(1 for r in parts if r["spec"].get("spring"))}}
    (DL / "brodix.run.json").write_text(json.dumps(run, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in run.items() if k not in ("log", "notes", "discovery")}, indent=1,
                     ensure_ascii=False))
    print(f"requests={f.requests} cached={f.cached} parts={len(parts)} problems={len(problems)}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
