"""
Machine Shop Directory Scraper
==============================
Searches for engine machine shops across major US metro areas using SearXNG,
then scrapes individual shop pages for contact info and services.

Outputs:
  - engine-db/init/09_seed_machine_shops.sql  (SQL INSERT statements)
  - scripts/machine_shops.json                (raw JSON for review)

Usage:
  py scripts/scrape_machine_shops.py
  py scripts/scrape_machine_shops.py --cities 5    # limit to first N cities
  py scripts/scrape_machine_shops.py --dry-run     # just search, no page scraping
"""

import argparse
import json
import os
import re
import sys
import time
from urllib.parse import urlparse, quote_plus

import requests
from bs4 import BeautifulSoup

# ─── Config ───────────────────────────────────────────────────────────────────

SEARXNG_URL = "http://192.168.16.138:8080/search"
DELAY_BETWEEN_SEARCHES = 2.0   # seconds between SearXNG queries
DELAY_BETWEEN_SCRAPES = 1.5    # seconds between individual site scrapes
SCRAPE_TIMEOUT = 10            # seconds

SEARCH_QUERIES = [
    "engine machine shop",
    "engine rebuilder",
    "automotive machine shop",
    "cylinder head machine shop",
]

# Comprehensive US city list — loaded from us_cities_30k.json (1000 cities, all >30k pop)
# Falls back to the curated short list below if the file is missing.
import os as _os
_CITIES_FILE = _os.path.join(_os.path.dirname(__file__), "us_cities_30k.json")
if _os.path.exists(_CITIES_FILE):
    with open(_CITIES_FILE) as _f:
        CITIES = json.load(_f)
else:
    CITIES = [
        # Fallback: top 80 metros if dataset file is missing
        "Houston TX", "Dallas TX", "San Antonio TX", "Austin TX", "Fort Worth TX",
    "Los Angeles CA", "San Diego CA", "San Francisco CA", "Sacramento CA", "Fresno CA",
    "Phoenix AZ", "Tucson AZ",
    "Denver CO", "Colorado Springs CO",
    "Chicago IL", "Rockford IL",
    "Indianapolis IN", "Fort Wayne IN",
    "Detroit MI", "Grand Rapids MI",
    "Minneapolis MN",
    "St Louis MO", "Kansas City MO",
    "Charlotte NC", "Raleigh NC",
    "Nashville TN", "Memphis TN", "Knoxville TN",
    "Atlanta GA", "Savannah GA",
    "Jacksonville FL", "Tampa FL", "Orlando FL", "Miami FL",
    "New York NY", "Buffalo NY",
    "Philadelphia PA", "Pittsburgh PA",
    "Boston MA",
    "Baltimore MD",
    "Richmond VA", "Virginia Beach VA",
    "Columbus OH", "Cleveland OH", "Cincinnati OH",
    "Milwaukee WI",
    "Portland OR", "Seattle WA",
    "Las Vegas NV",
    "Salt Lake City UT",
    "Oklahoma City OK", "Tulsa OK",
    "Omaha NE",
    "Boise ID",
    "Albuquerque NM",
    "Louisville KY", "Lexington KY",
    "Birmingham AL", "Huntsville AL",
    "New Orleans LA", "Baton Rouge LA",
    "Little Rock AR",
    "Jackson MS",
    "Charleston SC",
    "Sioux Falls SD",
    "Wichita KS",
    "Des Moines IA",
    "Spokane WA",
    "Reno NV",
    "Boise ID",
    "Anchorage AK",
    "Honolulu HI",
    "Hartford CT",
    "Providence RI",
    "Manchester NH",
    "Portland ME",
    "Wilmington DE",
    "Charleston WV",
    "Billings MT",
    "Cheyenne WY",
    "Burlington VT",
    "Fargo ND",
    ]

# Domains to skip (aggregators, not actual shops)
SKIP_DOMAINS = {
    "yelp.com", "yellowpages.com", "google.com", "facebook.com",
    "bbb.org", "mapquest.com", "superpages.com", "manta.com",
    "angieslist.com", "thumbtack.com", "homeadvisor.com",
    "linkedin.com", "twitter.com", "instagram.com", "tiktok.com",
    "youtube.com", "reddit.com", "wikipedia.org", "amazon.com",
    "ebay.com", "craigslist.org", "nextdoor.com", "indeed.com",
    "glassdoor.com", "oreillyauto.com", "autozone.com", "napaonline.com",
    "tripadvisor.com", "trustpilot.com", "angi.com",
    "machineshop.directory", "machineshoplist.com", "doss.com",
    "thomasnet.com", "iqsdirectory.com", "machineshopweb.com",
    "cncmachines.com", "samtech.edu",
    "mybesthouston.com", "besthou.net", "chamberofcommerce.com",
    "wheree.com", "united.com", "auto-tune-up-and-repair-options.com",
    "ls1tech.com", "corvetteforum.com", "honda-tech.com",
    "mustangforums.com", "forabodiesonly.com", "jalopyjournal.com",
    "hotrodders.com", "pro-touring.com", "garage-journal.com",
    "pirate4x4.com", "cumminsforum.com", "dieselplace.com",
    "thedieselstop.com", "ford-trucks.com", "careers.united.com",
    "remangroupinc.com",
}

# Known engine-related service keywords
SERVICE_KEYWORDS = {
    "bore": "Bore & Hone",
    "hone": "Bore & Hone",
    "honing": "Bore & Hone",
    "boring": "Bore & Hone",
    "deck": "Deck Surfacing",
    "decking": "Deck Surfacing",
    "resurface": "Deck Surfacing",
    "resurfacing": "Deck Surfacing",
    "valve job": "Valve Job",
    "valve seat": "Valve Job",
    "3-angle": "Valve Job",
    "three angle": "Valve Job",
    "head port": "Head Porting",
    "porting": "Head Porting",
    "cnc port": "CNC Porting",
    "crank grind": "Crank Grinding",
    "crankshaft grind": "Crank Grinding",
    "balanc": "Balancing",
    "align bore": "Align Boring",
    "align hone": "Align Boring",
    "line bore": "Line Boring",
    "line hone": "Line Boring",
    "engine build": "Full Engine Assembly",
    "engine assembly": "Full Engine Assembly",
    "complete engine": "Full Engine Assembly",
    "crate engine": "Full Engine Assembly",
    "dyno": "Dyno Tuning",
    "dynamometer": "Dyno Tuning",
    "hot tank": "Hot Tank",
    "jet wash": "Hot Tank",
    "magnaflux": "Magnaflux",
    "crack check": "Magnaflux",
    "crack detect": "Magnaflux",
    "cam bearing": "Cam Bearing Install",
    "press work": "Press Work",
    "sleeve": "Sleeve Install",
    "cylinder sleeve": "Sleeve Install",
    "block repair": "Block Repair / Welding",
    "welding": "Block Repair / Welding",
    "head rebuild": "Head Rebuilding",
    "cylinder head rebuild": "Head Rebuilding",
    "flow bench": "Flow Bench Testing",
    "flow test": "Flow Bench Testing",
}

SPECIALTY_KEYWORDS = {
    "chevy": "SBC",
    "chevrolet": "SBC",
    "small block chevy": "SBC",
    "sbc": "SBC",
    "big block chevy": "BBC",
    "bbc": "BBC",
    "ls engine": "LS",
    "ls swap": "LS",
    "ls1": "LS",
    "ls3": "LS",
    "lt1": "LS",
    "gen iii": "LS",
    "gen iv": "LS",
    "ford": "Ford",
    "mustang": "Ford",
    "windsor": "Ford",
    "coyote": "Ford",
    "modular": "Ford",
    "mopar": "Mopar",
    "chrysler": "Mopar",
    "dodge": "Mopar",
    "hemi": "Hemi",
    "import": "Import",
    "honda": "Import",
    "toyota": "Import",
    "nissan": "Import",
    "subaru": "Import",
    "diesel": "Diesel",
    "cummins": "Diesel",
    "duramax": "Diesel",
    "powerstroke": "Diesel",
    "marine": "Marine",
    "boat": "Marine",
    "motorcycle": "Motorcycle",
    "small engine": "Small Engine",
    "pontiac": "Pontiac",
    "buick": "Buick",
    "oldsmobile": "Oldsmobile",
    "industrial": "Industrial",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_phone(text: str) -> str | None:
    """Find a US phone number in text.

    Matches multiple formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx,
    xxx) xxx-xxxx (with stripped opening paren), and xxx xxx xxxx.
    """
    patterns = [
        # Full standard format with separators
        r'\(?\d{3}\)?[\s\-\.]?\s?\d{3}[\s\-\.]\d{4}',
        # 10 digits with no separators
        r'(?<!\d)\d{10}(?!\d)',
    ]
    for pat in patterns:
        for m in re.finditer(pat, text):
            raw = m.group()
            digits = re.sub(r'\D', '', raw)
            if len(digits) != 10:
                continue
            # Reject obviously fake numbers
            if digits[0] in "01":  # area code can't start with 0 or 1
                continue
            if digits[3] in "01":  # exchange code can't start with 0 or 1
                continue
            # Reject if all digits are the same or sequential
            if len(set(digits)) <= 2:
                continue
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return None


def extract_email(text: str) -> str | None:
    """Find an email address in text."""
    m = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    if m:
        email = m.group().lower()
        # Skip common non-shop emails
        if any(x in email for x in ['example.com', 'sentry.io', 'wixpress', 'googleapis']):
            return None
        return email
    return None


_STREET_RE = re.compile(
    r'\b(\d{2,6})\s+'                                          # 2-6 digit number
    r'((?:[NSEW]\.?\s+)?'                                      # optional N/S/E/W
    r'(?:[A-Z][a-zA-Z\']*\.?\s+){1,4}'                         # 1-4 capitalized words
    r'(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|'
    r'Ln|Lane|Way|Ct|Court|Pl|Place|Hwy|Highway|Pike|Pkwy|Parkway|'
    r'Cir|Circle|Ter|Terrace|Trail|Trl|Loop|Sq|Square))'
    r'\.?(?:\s+(?:#|Suite|Ste|Unit|Apt|Bldg|Building)\s*[\w\d-]+)?',
    re.IGNORECASE,
)

# Words that indicate a false positive — not a real street
_BAD_STREET_WORDS = {
    "view", "views", "year", "years", "month", "months", "review", "reviews",
    "page", "pages", "result", "results", "comment", "comments",
    "engine", "engines", "shop", "shops", "service", "services",
    "part", "parts", "item", "items", "product", "products",
    "happy", "satisfied", "customer", "customers", "client", "clients",
    "follower", "followers", "like", "likes", "share", "shares",
    "state", "states", "united", "minute", "minutes", "second", "seconds",
    "day", "days", "week", "weeks", "hour", "hours",
    "thanks", "thank", "contact", "about", "home", "click", "call",
    "pieces", "piece", "horsepower", "torque", "rpm", "cfm",
    "chrome", "moly", "steel", "aluminum", "iron", "billet",
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "open", "closed", "open:", "closed:",
}


def _is_likely_real_address(street: str) -> bool:
    """Heuristic: does this look like a real street name?"""
    # Reject ALL-CAPS multi-word streets (most fake matches are headlines)
    words = street.split()
    if len(words) >= 2 and all(w.isupper() for w in words[:2] if len(w) > 1):
        return False
    # Reject if any word other than the suffix is also a street suffix
    # (e.g., "Castleton Avenue St" - bad double match)
    suffixes = {"st", "ave", "rd", "blvd", "dr", "ln", "way", "ct", "pl", "hwy", "pkwy"}
    middle = [w.lower().strip(".") for w in words[:-1]]
    if any(w in suffixes for w in middle):
        return False
    return True


def extract_address(text: str) -> str | None:
    """Try to find a street address in text. Returns None for obvious false positives."""
    for m in _STREET_RE.finditer(text):
        number, street = m.group(1), m.group(2).strip()
        # Reject if first word is a known bad word
        first_word = street.split()[0].lower().strip(".'")
        if first_word in _BAD_STREET_WORDS:
            continue
        # Reject if any word in street is bad (catches "Thanks For St", "Contact Us Ter")
        words = [w.lower().strip(".'") for w in street.split()]
        if any(w in _BAD_STREET_WORDS for w in words):
            continue
        # Reject single-letter / very short street names
        if len(street.replace(".", "").replace(" ", "")) < 4:
            continue
        if not _is_likely_real_address(street):
            continue
        return f"{number} {street}".strip()
    return None


def extract_zip(text: str) -> str | None:
    """Find a US ZIP code (5 or 9 digit) in text."""
    m = re.search(r'\b(\d{5})(?:-\d{4})?\b', text)
    return m.group(1) if m else None


def extract_address_from_jsonld(soup) -> tuple[str | None, str | None, str | None]:
    """Parse JSON-LD structured data for PostalAddress. Returns (street, city, zip)."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
        except (json.JSONDecodeError, TypeError):
            continue

        # JSON-LD can be a list, dict, or @graph
        candidates = []
        if isinstance(data, list):
            candidates = data
        elif isinstance(data, dict):
            if "@graph" in data:
                candidates = data["@graph"]
            else:
                candidates = [data]

        for item in candidates:
            if not isinstance(item, dict):
                continue
            addr = item.get("address")
            if isinstance(addr, dict):
                street = addr.get("streetAddress")
                city = addr.get("addressLocality")
                zip_code = addr.get("postalCode")
                if street:
                    return (
                        str(street).strip() if street else None,
                        str(city).strip() if city else None,
                        str(zip_code).strip() if zip_code else None,
                    )
            elif isinstance(addr, str) and len(addr) > 10:
                return (addr.strip(), None, None)
    return (None, None, None)


def detect_services(text: str) -> list[str]:
    """Scan text for known machine shop services."""
    text_lower = text.lower()
    found = set()
    for keyword, service in SERVICE_KEYWORDS.items():
        if keyword in text_lower:
            found.add(service)
    return sorted(found)


def detect_specialties(text: str) -> list[str]:
    """Scan text for engine platform specialties."""
    text_lower = text.lower()
    found = set()
    for keyword, specialty in SPECIALTY_KEYWORDS.items():
        if keyword in text_lower:
            found.add(specialty)
    return sorted(found)


def parse_city_state(city_state: str) -> tuple[str, str]:
    """Parse 'Houston TX' into ('Houston', 'TX')."""
    parts = city_state.rsplit(" ", 1)
    return parts[0], parts[1] if len(parts) > 1 else ""


def is_shop_domain(url: str) -> bool:
    """Check if URL is likely an actual shop website (not an aggregator)."""
    try:
        domain = urlparse(url).netloc.lower().replace("www.", "")
        return not any(skip in domain for skip in SKIP_DOMAINS)
    except Exception:
        return False


def sql_escape(s: str) -> str:
    """Escape a string for SQL."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def sql_array(items: list[str]) -> str:
    """Format a Python list as a PostgreSQL array literal."""
    if not items:
        return "ARRAY[]::text[]"
    escaped = ", ".join(sql_escape(i) for i in items)
    return f"ARRAY[{escaped}]"


# ─── Search ───────────────────────────────────────────────────────────────────

def search_shops(query: str, city: str) -> list[dict]:
    """Search SearXNG for machine shops in a city."""
    full_query = f"{query} {city}"
    try:
        resp = requests.get(SEARXNG_URL, params={
            "q": full_query,
            "format": "json",
            "categories": "general",
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for r in data.get("results", []):
            url = r.get("url", "")
            title = r.get("title", "")
            content = r.get("content", "")
            if url and is_shop_domain(url):
                results.append({
                    "title": title,
                    "url": url,
                    "snippet": content,
                    "search_city": city,
                })
        return results
    except Exception as e:
        print(f"  [WARN] Search failed for '{full_query}': {e}", file=sys.stderr)
        return []


# ─── Scrape ───────────────────────────────────────────────────────────────────

def scrape_shop_page(url: str) -> dict:
    """Scrape a shop's website for contact info and services."""
    info = {"url": url}
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        }
        resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Get all visible text
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)

        # Title
        title_tag = soup.find("title")
        if title_tag:
            info["page_title"] = title_tag.get_text(strip=True)

        # Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            info["meta_description"] = meta_desc["content"]

        # Phone - check structured data first, then page text
        phone = None
        for a in soup.find_all("a", href=True):
            if a["href"].startswith("tel:"):
                digits = re.sub(r'\D', '', a["href"])
                if len(digits) == 10 or (len(digits) == 11 and digits[0] == "1"):
                    digits = digits[-10:]
                    phone = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
                    break
        if not phone:
            phone = extract_phone(text)
        info["phone"] = phone

        # Email - check mailto links first
        email = None
        for a in soup.find_all("a", href=True):
            if a["href"].startswith("mailto:"):
                raw = a["href"].replace("mailto:", "").split("?")[0].strip().lower()
                if "@" in raw and not any(x in raw for x in ['example', 'sentry', 'wixpress']):
                    email = raw
                    break
        if not email:
            email = extract_email(text)
        info["email"] = email

        # Address — try JSON-LD first (most accurate), then microdata, then regex
        ld_street, ld_city, ld_zip = extract_address_from_jsonld(soup)
        if ld_street:
            info["address"] = ld_street
            if ld_zip:
                info["zip"] = ld_zip
        else:
            addr_el = soup.find(attrs={"itemprop": "streetAddress"})
            if addr_el:
                info["address"] = addr_el.get_text(strip=True)
            else:
                info["address"] = extract_address(text)

        # ZIP fallback — look for postal code microdata, then regex on text
        if not info.get("zip"):
            zip_el = soup.find(attrs={"itemprop": "postalCode"})
            if zip_el:
                info["zip"] = zip_el.get_text(strip=True)
            elif info.get("address"):
                # Try to find ZIP in text near the address
                info["zip"] = extract_zip(text)

        # Services and specialties from full page text
        combined_text = text
        if info.get("meta_description"):
            combined_text += " " + info["meta_description"]

        info["services"] = detect_services(combined_text)
        info["specialties"] = detect_specialties(combined_text)

    except Exception as e:
        info["error"] = str(e)

    return info


# ─── Deduplicate ──────────────────────────────────────────────────────────────

def deduplicate_shops(shops: list[dict]) -> list[dict]:
    """Deduplicate shops by domain name."""
    seen_domains = {}
    unique = []
    for shop in shops:
        try:
            domain = urlparse(shop["website"]).netloc.lower().replace("www.", "")
        except Exception:
            domain = shop.get("website", "")

        if domain not in seen_domains:
            seen_domains[domain] = True
            unique.append(shop)
        else:
            # Merge: keep the one with more data
            for existing in unique:
                try:
                    ed = urlparse(existing["website"]).netloc.lower().replace("www.", "")
                except Exception:
                    ed = ""
                if ed == domain:
                    # Merge services and specialties
                    existing["services"] = sorted(set(existing.get("services", []) + shop.get("services", [])))
                    existing["specialties"] = sorted(set(existing.get("specialties", []) + shop.get("specialties", [])))
                    break

    return unique


# ─── Output ───────────────────────────────────────────────────────────────────

def generate_sql(shops: list[dict], output_path: str):
    """Generate SQL INSERT statements."""
    lines = [
        "-- Machine Shop Directory Seed Data",
        "-- Auto-generated by scrape_machine_shops.py",
        f"-- {len(shops)} shops",
        "",
        "INSERT INTO shops (name, city, state, specialties, services, turnaround_time, phone, website, description, approved, source)",
        "VALUES",
    ]

    values = []
    for shop in shops:
        name = sql_escape(shop.get("name", "Unknown"))
        city = sql_escape(shop.get("city", ""))
        state = sql_escape(shop.get("state", ""))
        specialties = sql_array(shop.get("specialties", []))
        services = sql_array(shop.get("services", []))
        turnaround = sql_escape("Contact for estimate")
        phone = sql_escape(shop.get("phone"))
        website = sql_escape(shop.get("website"))
        description = sql_escape(shop.get("description"))
        source = sql_escape("searxng-scrape")

        values.append(
            f"  ({name}, {city}, {state}, {specialties}, {services}, "
            f"{turnaround}, {phone}, {website}, {description}, 1, {source})"
        )

    lines.append(",\n".join(values))
    lines.append("ON CONFLICT DO NOTHING;")
    lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n[OK] SQL written to {output_path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape machine shop data for directory")
    parser.add_argument("--cities", type=int, default=0, help="Limit to first N cities (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Search only, skip page scraping")
    parser.add_argument("--query-limit", type=int, default=2, help="Number of search queries per city (1-4)")
    args = parser.parse_args()

    cities = CITIES[:args.cities] if args.cities > 0 else CITIES
    queries = SEARCH_QUERIES[:args.query_limit]

    print(f"Machine Shop Directory Scraper")
    print(f"  Cities: {len(cities)}")
    print(f"  Queries per city: {len(queries)}")
    print(f"  Dry run: {args.dry_run}")
    print()

    # Phase 1: Search for shops
    all_results = []
    seen_urls = set()

    for i, city in enumerate(cities):
        for q in queries:
            label = f"[{i+1}/{len(cities)}] {q} in {city}"
            print(f"  Searching: {label}...", end="", flush=True)

            results = search_shops(q, city)
            new = 0
            for r in results:
                url = r["url"].rstrip("/").lower()
                if url not in seen_urls:
                    seen_urls.add(url)
                    r["search_city"] = city
                    all_results.append(r)
                    new += 1

            print(f" {len(results)} results, {new} new")
            time.sleep(DELAY_BETWEEN_SEARCHES)

    print(f"\nPhase 1 complete: {len(all_results)} unique shop URLs found")

    if args.dry_run:
        # Just dump search results
        with open("scripts/machine_shops_search.json", "w", encoding="utf-8") as f:
            json.dump(all_results, f, indent=2)
        print(f"Search results saved to scripts/machine_shops_search.json")
        return

    # Phase 2: Scrape individual pages
    print(f"\nPhase 2: Scraping {len(all_results)} shop pages...")
    shops = []

    for i, result in enumerate(all_results):
        url = result["url"]
        city_str = result["search_city"]
        city, state = parse_city_state(city_str)

        print(f"  [{i+1}/{len(all_results)}] {url[:70]}...", end="", flush=True)

        page_info = scrape_shop_page(url)

        if "error" in page_info:
            print(f" ERROR: {page_info['error'][:40]}")
            continue

        # Build shop record
        # Use search result title, cleaned up
        name = result["title"]
        # Remove common suffixes from title
        for suffix in [" - Home", " | Home", " – Home", " - Official", " | Official",
                       " - About", " | About", " |", " -", " –"]:
            if name.endswith(suffix):
                name = name[:-len(suffix)]
        # Trim to reasonable length
        name = name[:100].strip()
        if not name:
            name = page_info.get("page_title", urlparse(url).netloc)

        # Description from meta or snippet
        description = page_info.get("meta_description") or result.get("snippet", "")
        if len(description) > 300:
            description = description[:297] + "..."

        shop = {
            "name": name,
            "city": city,
            "state": state,
            "website": url,
            "phone": page_info.get("phone"),
            "email": page_info.get("email"),
            "address": page_info.get("address"),
            "zip": page_info.get("zip"),
            "description": description if description else None,
            "services": page_info.get("services", []),
            "specialties": page_info.get("specialties", []),
        }

        shops.append(shop)
        svc_count = len(shop["services"])
        spec_count = len(shop["specialties"])
        print(f" OK ({svc_count} services, {spec_count} specialties)")

        time.sleep(DELAY_BETWEEN_SCRAPES)

    # Phase 3: Deduplicate
    print(f"\nPhase 3: Deduplicating...")
    shops = deduplicate_shops(shops)
    print(f"  {len(shops)} unique shops after dedup")

    # Phase 4: Output
    print(f"\nPhase 4: Writing output...")

    # JSON for review
    json_path = os.path.join("scripts", "machine_shops.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(shops, f, indent=2, ensure_ascii=False)
    print(f"  JSON: {json_path}")

    # SQL for import
    sql_path = os.path.join("engine-db", "init", "09_seed_machine_shops.sql")
    generate_sql(shops, sql_path)

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"  Total shops: {len(shops)}")
    print(f"  With phone: {sum(1 for s in shops if s.get('phone'))}")
    print(f"  With email: {sum(1 for s in shops if s.get('email'))}")
    print(f"  With services: {sum(1 for s in shops if s.get('services'))}")
    print(f"  With specialties: {sum(1 for s in shops if s.get('specialties'))}")

    # Top services
    from collections import Counter
    all_services = Counter()
    for s in shops:
        all_services.update(s.get("services", []))
    print(f"\n  Top services:")
    for svc, count in all_services.most_common(10):
        print(f"    {svc}: {count}")

    all_specs = Counter()
    for s in shops:
        all_specs.update(s.get("specialties", []))
    print(f"\n  Top specialties:")
    for spec, count in all_specs.most_common(10):
        print(f"    {spec}: {count}")


if __name__ == "__main__":
    main()
