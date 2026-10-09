"""
Howards Cams Camshaft Scraper
=============================
Crawls the camshaft category on howardscams.com and pulls the published spec
sheet for every part number: lift, advertised and @0.050" duration, LSA,
intake centerline, RPM range, fitment (year/make/engine), UPC.

The category listing carries no specs, so every product page is fetched.
robots.txt asks for Crawl-delay: 10, which this honors -- a full run is
~3,600 requests, roughly 10 hours. Progress is appended to a .jsonl file, so
an interrupted run picks up where it stopped.

Outputs:
  - scripts/howards_cams_urls.json   (listing crawl state, per page)
  - scripts/howards_cams.jsonl       (one raw record per product, resumable)
  - scripts/howards_cams.json        (final cleaned array)

Usage:
  py scripts/scrape_howards_cams.py
  py scripts/scrape_howards_cams.py --limit 20     # first N products only
  py scripts/scrape_howards_cams.py --relist       # re-crawl the listing
  py scripts/scrape_howards_cams.py --build-only   # rebuild .json from .jsonl
  py scripts/scrape_howards_cams.py --delay 20     # resume gently after throttling
"""

import argparse
import json
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

# ─── Config ───────────────────────────────────────────────────────────────────

BASE = "https://www.howardscams.com"
CATEGORY = "/products/category/camshafts-and-cam-lifter-sets"
CRAWL_DELAY = 10.0      # robots.txt Crawl-delay
TIMEOUT = 30
MAX_RETRIES = 5
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EngineBuildBot/1.0; +https://engine-build.com)",
}

HERE = os.path.dirname(os.path.abspath(__file__))
URLS_FILE = os.path.join(HERE, "howards_cams_urls.json")
RAW_FILE = os.path.join(HERE, "howards_cams.jsonl")
OUT_FILE = os.path.join(HERE, "howards_cams.json")

session = requests.Session()
session.headers.update(HEADERS)
_last_request = 0.0
_delay = CRAWL_DELAY
_streak = 0             # consecutive successful requests
RECOVER_EVERY = 10      # successes needed to shave 1s off the delay


def fetch(url):
    """GET with the crawl delay enforced between every request.

    The site is on shared hosting that answers 508 (Resource Limit Reached)
    when it's overloaded. Each 508/429/5xx doubles a cooldown (1 min up to
    10 min) and adds 2s to the per-request delay (max 30s). Every
    RECOVER_EVERY clean requests in a row take 1s back off, never below the
    robots.txt Crawl-delay — so the scraper slows quickly when the host
    struggles and speeds back up slowly once it recovers.
    """
    global _last_request, _delay, _streak
    cooldown = 60
    for attempt in range(1, MAX_RETRIES + 1):
        wait = _delay - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.time()
        try:
            resp = session.get(url, timeout=TIMEOUT)
        except requests.RequestException as e:
            _streak = 0
            print(f"  ! {e} (attempt {attempt}); cooling down {cooldown}s")
            time.sleep(cooldown)
            cooldown = min(cooldown * 2, 600)
            continue
        if resp.status_code == 200:
            _streak += 1
            if _streak % RECOVER_EVERY == 0 and _delay > CRAWL_DELAY:
                _delay = max(_delay - 1, CRAWL_DELAY)
                print(f"  {_streak} clean requests; delay now {_delay:.0f}s")
            return resp.text
        if resp.status_code == 404:
            return None
        _streak = 0
        _delay = min(_delay + 2, 30)
        print(f"  ! HTTP {resp.status_code} (attempt {attempt}); cooling down {cooldown}s, delay now {_delay:.0f}s")
        time.sleep(cooldown)
        cooldown = min(cooldown * 2, 600)
    return None


# ─── Phase 1: listing crawl ───────────────────────────────────────────────────
# Resumable: pages already crawled are kept in URLS_FILE, and a page that fails
# is simply left out so the next run retries it.

def load_listing():
    if os.path.exists(URLS_FILE):
        with open(URLS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    return {"lastPage": None, "pages": {}}


def save_listing(state):
    with open(URLS_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=1)


def listing_urls(state):
    seen, urls = set(), []
    for page in sorted(state["pages"], key=int):
        for u in state["pages"][page]:
            if u["url"] not in seen:
                seen.add(u["url"])
                urls.append(u)
    return urls


def crawl_listing(state):
    page = 0
    while True:
        last = state["lastPage"]
        if last is not None and page > last:
            break
        if str(page) in state["pages"]:
            page += 1
            continue

        html = fetch(f"{BASE}{CATEGORY}?page={page}")
        if html is None:
            print(f"  listing page {page} failed; will retry on next run")
            page += 1
            continue
        soup = BeautifulSoup(html, "html.parser")

        if state["lastPage"] is None:
            nums = [int(n) for n in re.findall(r"camshafts-and-cam-lifter-sets\?page=(\d+)", html)]
            state["lastPage"] = max(nums) if nums else 0
            m = re.search(r"Displaying \d+ - \d+ of (\d+)", html)
            print(f"Listing: {m.group(1) if m else '?'} products over {state['lastPage'] + 1} pages")

        items = []
        for a in soup.select(".views-field-title a[href]"):
            href = a["href"]
            url = href if href.startswith("http") else BASE + href
            items.append({"url": url, "title": a.get_text(strip=True)})
        state["pages"][str(page)] = items
        save_listing(state)
        print(f"  page {page}/{state['lastPage']}: {len(items)} items")
        page += 1

    missing = [p for p in range(state["lastPage"] + 1) if str(p) not in state["pages"]]
    if missing:
        print(f"Listing incomplete — pages {missing} failed; re-run to fill them")
    return listing_urls(state)


# ─── Phase 2: product pages ───────────────────────────────────────────────────

def clean(s):
    return re.sub(r"\s+", " ", s.replace(" ", " ").replace("\xa0", " ")).strip()


def parse_product(html, url):
    soup = BeautifulSoup(html, "html.parser")
    rec = {"url": url}

    # The theme reuses <h1 id=...> for menu/footer headings; the product's is bare.
    h1 = soup.find("h1", id=False)
    rec["title"] = clean(h1.get_text()) if h1 else None

    # Every labelled field on the page: SKU, UPC, Category, and the spec sheet.
    fields = {}
    for label in soup.select(".field-label"):
        key = clean(label.get_text()).rstrip(":").strip()
        val_el = label.find_next_sibling(class_="field-items") or label.find_next_sibling()
        if not key or val_el is None:
            continue
        val = clean(val_el.get_text(" "))
        if val and key not in fields:
            fields[key] = val
    # SKU is a commerce extra field: label div followed by a bare text node.
    sku = soup.select_one(".commerce-product-sku")
    if sku:
        lbl = sku.select_one(".commerce-product-sku-label")
        if lbl:
            lbl.extract()
        fields["SKU"] = clean(sku.get_text())
    rec["fields"] = fields

    desc = soup.select_one(".field-name-field-product-description")
    rec["description"] = clean(desc.get_text(" ")) if desc else None

    img = soup.select_one(".field-name-field-image img, .commerce-product-field img")
    rec["image"] = img["src"] if img and img.get("src") else None
    return rec


def num(v):
    if v is None:
        return None
    m = re.search(r"-?\d*\.?\d+", v)
    if not m:
        return None
    f = float(m.group(0))
    return int(f) if f.is_integer() and "." not in m.group(0) else f


SERIES = [
    "Big Daddy Rattler", "Big Mama Rattler", "Rattler", "Retro-Fit",
    "American Muscle", "Street Force 1", "Street Force 2", "Street Force 3",
    "Street Force 4", "Steel Billet", "Boost", "Oval Track", "Sprint Car",
    "Big Bottle", "4/7 Swap", "Custom Grind",
]


def normalize(rec):
    f = rec.get("fields", {})
    title = rec.get("title") or ""
    rpm = re.findall(r"\d+", f.get("Basic RPM Range", ""))
    years = re.findall(r"\d{4}|Present", f.get("Year", ""))
    sku = f.get("SKU")
    if not sku:
        m = re.search(r"Howards Cams\s+(\S+)\s*$", title)
        sku = m.group(1) if m else None
    return {
        "mfr": "Howards Cams",
        "part": sku,
        "upc": f.get("UPC"),
        "title": title,
        "series": next((s for s in SERIES if s.lower() in title.lower()), None),
        "camType": f.get("Camshaft Type"),
        "make": f.get("Make"),
        "engine": f.get("Engine"),
        "years": f.get("Year"),
        "yearFrom": int(years[0]) if years and years[0].isdigit() else None,
        "yearTo": (None if len(years) < 2 or years[1] == "Present" else int(years[1])),
        "rpmLo": int(rpm[0]) if len(rpm) >= 1 else None,
        "rpmHi": int(rpm[1]) if len(rpm) >= 2 else None,
        "liftInt": num(f.get("Valve Lift Intake")),
        "liftExh": num(f.get("Valve Lift Exhaust")),
        "advInt": num(f.get("Duration Intake")),
        "advExh": num(f.get("Duration Exhaust")),
        "int050": num(f.get("Duration at 050 Intake")),
        "exh050": num(f.get("Duration at 050 Exhaust")),
        "lsa": num(f.get("Lobe Separation")),
        "icl": num(f.get("Intake Centerline")),
        "firingOrder": f.get("Firing Order"),
        "quantity": f.get("Quantity"),
        "description": rec.get("description"),
        "url": rec["url"],
        "image": rec.get("image"),
    }


def build_output():
    by_url = {}
    with open(RAW_FILE, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                r = json.loads(line)
                if r.get("fields") is not None:
                    by_url[r["url"]] = r
    out = [normalize(r) for r in by_url.values()]
    out.sort(key=lambda r: (r["make"] or "", r["engine"] or "", r["part"] or ""))
    with open(OUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    with_050 = sum(1 for r in out if r["int050"])
    print(f"Wrote {len(out)} cams ({with_050} with @0.050 duration) -> {OUT_FILE}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--relist", action="store_true")
    ap.add_argument("--build-only", action="store_true")
    ap.add_argument("--delay", type=float, default=CRAWL_DELAY,
                    help="starting per-request delay (s); never below the robots.txt Crawl-delay")
    args = ap.parse_args()

    global _delay
    _delay = max(args.delay, CRAWL_DELAY)

    if args.build_only:
        build_output()
        return

    state = {"lastPage": None, "pages": {}} if args.relist else load_listing()
    urls = crawl_listing(state)
    print(f"{len(urls)} product URLs from the listing")

    # Only successful records count as done; errored ones are retried.
    done = set()
    if os.path.exists(RAW_FILE):
        with open(RAW_FILE, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    r = json.loads(line)
                    if not r.get("error"):
                        done.add(r["url"])
    todo = [u for u in urls if u["url"] not in done]
    if args.limit:
        todo = todo[: args.limit]
    eta_h = len(todo) * _delay / 3600
    print(f"{len(done)} already scraped, {len(todo)} to go (~{eta_h:.1f} h)")

    with open(RAW_FILE, "a", encoding="utf-8") as out:
        for i, u in enumerate(todo, 1):
            html = fetch(u["url"])
            if html is None:
                rec = {"url": u["url"], "title": u["title"], "fields": None, "error": True}
            else:
                rec = parse_product(html, u["url"])
            out.write(json.dumps(rec) + "\n")
            out.flush()
            sku = (rec.get("fields") or {}).get("SKU", "?")
            print(f"[{i}/{len(todo)}] {sku}  {u['title'][:70]}")

    build_output()


if __name__ == "__main__":
    sys.exit(main())
