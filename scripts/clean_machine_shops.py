"""
Clean and filter the scraped machine shops data.
Removes forums, blogs, listings, auto-repair-only shops, and other junk.
"""

import json
import re
import sys
from urllib.parse import urlparse
from collections import Counter

INPUT_PATH = "scripts/machine_shops.json"
OUTPUT_JSON = "scripts/machine_shops_clean.json"
OUTPUT_SQL = "engine-db/init/09_seed_machine_shops.sql"
REJECTS_PATH = "scripts/machine_shops_rejected.json"

# URL patterns that indicate aggregators, forums, or content (not actual shops)
REJECT_URL_PATTERNS = [
    r"/forum", r"forums?\.", r"/threads", r"/showthread",
    r"reddit\.com", r"\.reddit\.",
    r"wikipedia", r"wiki/",
    r"/blog/", r"/blog\.", r"/article",
    r"/best-?of", r"/top-?\d+", r"/best-?engine",
    r"/listing", r"/directory", r"/categories?/",
    r"/jobs?", r"/careers?",
    r"youtube\.com", r"tiktok\.com", r"pinterest\.com",
    r"medium\.com", r"substack\.com",
    r"highergov", r"industrynet", r"collectorcarguide",
    r"\.gov/", r"\.edu/",
    r"sitemap",
]

# Name keywords that strongly indicate this IS a machine shop / engine builder
SHOP_NAME_KEYWORDS = [
    "machine shop", "machine works", "machining", "machinist",
    "engine builder", "engine rebuilder", "engine rebuilding",
    "engine machine", "auto machine", "racing engines",
    "performance engines", "high performance engines",
    "engine specialists", "engine specialist", "engine works",
    "engine inc", "engine company", "engine co.",
    "head rebuild", "cylinder head", "engine and balancing",
    "engine and machine", "engine & machine", "engine pros",
    "racing", "speed shop", "performance machine",
    "automotive machine", "diesel engine",
    "engine &", "engine and dyno", "engine dyno",
    "performance engine", "crate engine", "motor sport", "motorsport",
    "auto machine", "motor machine", "engine remanufactur",
]

# Name patterns that suggest junk
REJECT_NAME_PATTERNS = [
    r"forum", r"reddit", r"wikipedia",
    r"\b(top|best)\s+\d+\b",
    r"my\s+wordpress\s+blog",
    r"\bnews?\b.*\|",
    r"directory",
    r"blog$", r"^blog\b",
    r"recommendation", r"suggest",
    r"^lookin[g]?\s+for", r"^anyone\b", r"^need\b",
    r"\?$",   # questions are forum posts
    r"hospital", r"\bclinic\b", r"church", r"school",
    r"university", r"\brestaurant\b", r"pizza", r"grocery",
    r"\bcareers?\b", r"\bjobs?\b",
    # Non-machine-shop business types
    r"\btire\b", r"\blube\b", r"oil change",
    r"transmission shop", r"\bcollision\b", r"body shop",
    r"\bglass\b", r"\btowing\b", r"wheel alignment", r"mufflers?",
    r"smog check", r"emissions test", r"oil and lube",
]

# Shop must have at least one of these to count as engine machine work
MACHINE_SERVICE_KEYWORDS = {
    "Bore & Hone", "Deck Surfacing", "Valve Job", "Head Porting",
    "CNC Porting", "Crank Grinding", "Balancing", "Align Boring",
    "Line Boring", "Full Engine Assembly", "Magnaflux",
    "Sleeve Install", "Block Repair / Welding", "Head Rebuilding",
    "Flow Bench Testing", "Cam Bearing Install",
}

# Services that are weak signals on their own (a regular auto shop might have these)
WEAK_SERVICES = {"Hot Tank", "Press Work", "Dyno Tuning"}


def matches_any(text: str, patterns: list[str]) -> str | None:
    """Return the first matching pattern, or None."""
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            return p
    return None


def has_real_machine_work(shop: dict) -> bool:
    """Check if shop has at least 2 strong machine-work services."""
    services = set(shop.get("services", []))
    return len(services & MACHINE_SERVICE_KEYWORDS) >= 2


def name_indicates_machine_shop(name: str) -> bool:
    """Check if shop name contains explicit machine-shop keywords."""
    name_lower = name.lower()
    return any(kw in name_lower for kw in SHOP_NAME_KEYWORDS)


def clean_name(name: str) -> str:
    """Clean up a shop name."""
    # Remove common location suffixes
    name = re.sub(r'\s*[-|–]\s*(home|official|about|contact|services?).*$', '', name, flags=re.IGNORECASE)
    # Remove " in <city>, <state>" suffixes
    name = re.sub(r'\s*[-|–]\s*\d+\s+\w+.*$', '', name)
    # Trim quotes and pipes
    name = name.strip(' "\'|–-')
    # Collapse whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name[:120]


def main():
    with open(INPUT_PATH, encoding="utf-8") as f:
        shops = json.load(f)

    print(f"Loaded {len(shops)} shops")
    print()

    accepted = []
    rejected = []

    for shop in shops:
        url = shop.get("website", "")
        name = shop.get("name", "")
        reason = None

        # Check 1: URL pattern reject
        bad_url = matches_any(url, REJECT_URL_PATTERNS)
        if bad_url:
            reason = f"url-pattern: {bad_url}"

        # Check 2: Name pattern reject
        if not reason:
            bad_name = matches_any(name, REJECT_NAME_PATTERNS)
            if bad_name:
                reason = f"name-pattern: {bad_name}"

        # Check 3: Must have phone (real shops have phones)
        if not reason and not shop.get("phone"):
            reason = "no-phone"

        # Check 4: Must be identifiable as a machine shop by:
        #   (a) name contains shop-related keyword, OR
        #   (b) has 2+ strong machine-work services detected
        if not reason:
            name_match = name_indicates_machine_shop(name)
            machine_work = has_real_machine_work(shop)
            if not name_match and not machine_work:
                reason = "not-clearly-a-machine-shop"

        # Check 5: Name must not be empty after cleaning
        if not reason:
            cleaned_name = clean_name(name)
            if not cleaned_name or len(cleaned_name) < 3:
                reason = "empty-name"

        if reason:
            rejected.append({**shop, "reject_reason": reason})
        else:
            shop["name"] = clean_name(name)
            accepted.append(shop)

    print(f"Accepted: {len(accepted)}")
    print(f"Rejected: {len(rejected)}")
    print()

    # Reject reason breakdown
    reasons = Counter(r["reject_reason"].split(":")[0] for r in rejected)
    print("Reject reasons:")
    for reason, count in reasons.most_common():
        print(f"  {reason}: {count}")
    print()

    # Detailed reject reason
    detailed = Counter(r["reject_reason"] for r in rejected)
    print("Top 15 specific reasons:")
    for reason, count in detailed.most_common(15):
        print(f"  [{count:3d}] {reason}")
    print()

    # Write outputs
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(accepted, f, indent=2, ensure_ascii=False)
    print(f"[OK] Clean shops: {OUTPUT_JSON}")

    with open(REJECTS_PATH, "w", encoding="utf-8") as f:
        json.dump(rejected, f, indent=2, ensure_ascii=False)
    print(f"[OK] Rejected shops: {REJECTS_PATH}")

    # Generate clean SQL
    sql_escape = lambda s: "NULL" if s is None else "'" + s.replace("'", "''") + "'"

    def sql_array(items):
        if not items:
            return "ARRAY[]::text[]"
        return "ARRAY[" + ", ".join(sql_escape(i) for i in items) + "]"

    lines = [
        "-- Machine Shop Directory Seed Data (cleaned)",
        f"-- {len(accepted)} verified shops",
        "",
        "INSERT INTO shops (name, city, state, specialties, services, turnaround_time, phone, website, description, approved, source)",
        "VALUES",
    ]
    values = []
    for s in accepted:
        values.append(
            f"  ({sql_escape(s.get('name'))}, {sql_escape(s.get('city'))}, "
            f"{sql_escape(s.get('state'))}, {sql_array(s.get('specialties', []))}, "
            f"{sql_array(s.get('services', []))}, {sql_escape('Contact for estimate')}, "
            f"{sql_escape(s.get('phone'))}, {sql_escape(s.get('website'))}, "
            f"{sql_escape(s.get('description'))}, 1, {sql_escape('searxng-scrape')})"
        )
    lines.append(",\n".join(values))
    lines.append("ON CONFLICT DO NOTHING;")
    lines.append("")

    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] Clean SQL: {OUTPUT_SQL}")

    # Show sample of accepted
    print()
    print("=== Sample of accepted shops ===")
    for s in accepted[:8]:
        svc_count = len(s.get('services', []))
        spec_count = len(s.get('specialties', []))
        print(f"  {s['name'][:55]}")
        print(f"    {s['city']}, {s['state']} | {s.get('phone', '—')} | {svc_count} svc, {spec_count} spec")


if __name__ == "__main__":
    main()
