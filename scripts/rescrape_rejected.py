"""
Re-scrape rejected shops (those rejected for no-phone) with the improved phone regex.
Skips SearXNG entirely — uses URLs from the previous reject log.

Adds recovered shops to the database directly if they now have a phone.
"""

import json
import sys
import time
sys.path.insert(0, "scripts")

from scrape_machine_shops import scrape_shop_page, parse_city_state
from clean_machine_shops import (
    clean_name, has_real_machine_work, name_indicates_machine_shop,
    matches_any, REJECT_URL_PATTERNS, REJECT_NAME_PATTERNS,
)

import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "engine",
    "password": "eng1n3vault!",
    "database": "engine_data",
}

REJECTED_PATH = "scripts/machine_shops_rejected.json"


def main():
    with open(REJECTED_PATH, encoding="utf-8") as f:
        rejects = json.load(f)

    # Only re-scrape ones that were rejected for "no-phone" (the bug we fixed)
    candidates = [r for r in rejects if r.get("reject_reason") == "no-phone"]
    print(f"Re-scraping {len(candidates)} 'no-phone' rejects...")

    recovered = []

    for i, r in enumerate(candidates, 1):
        url = r["website"]
        print(f"  [{i}/{len(candidates)}] {url[:70]}...", end="", flush=True)

        info = scrape_shop_page(url)
        if "error" in info:
            print(f" ERROR")
            continue

        phone = info.get("phone")
        if not phone:
            print(f" still no phone")
            continue

        # Build the shop record using the original search context + new info
        original_city = r.get("city", "")
        original_state = r.get("state", "")

        name = clean_name(r.get("name", ""))

        shop = {
            "name": name,
            "city": original_city,
            "state": original_state,
            "website": url,
            "phone": phone,
            "email": info.get("email") or r.get("email"),
            "address": info.get("address") or r.get("address"),
            "zip": info.get("zip"),
            "description": r.get("description"),
            "services": list(set(info.get("services", []) + r.get("services", []))),
            "specialties": list(set(info.get("specialties", []) + r.get("specialties", []))),
        }

        # Apply same acceptance rules as cleaner
        url_match = matches_any(url, REJECT_URL_PATTERNS)
        name_match = matches_any(name, REJECT_NAME_PATTERNS)
        if url_match or name_match:
            print(f" filtered (url/name)")
            continue

        if not (name_indicates_machine_shop(shop["name"]) or has_real_machine_work(shop)):
            print(f" filtered (not-machine-shop)")
            continue

        recovered.append(shop)
        print(f" RECOVERED ({phone})")
        time.sleep(1.0)

    print(f"\n{len(recovered)} shops recovered")
    if not recovered:
        return

    # Insert into DB
    print("\nInserting into database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    inserted = 0
    skipped = 0
    for s in recovered:
        # Skip if same website already exists (avoid duplicates)
        cur.execute("SELECT id FROM shops WHERE website = %s LIMIT 1", (s["website"],))
        if cur.fetchone():
            skipped += 1
            continue

        cur.execute("""
            INSERT INTO shops (
                name, address, city, state, zip, phone, email, website,
                description, specialties, services, turnaround_time, source, approved
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            s["name"], s["address"], s["city"], s["state"], s["zip"],
            s["phone"], s["email"], s["website"], s["description"],
            s["specialties"], s["services"],
            "Contact for estimate", "searxng-scrape-rescue", 1,
        ))
        inserted += 1
    conn.commit()

    print(f"  Inserted: {inserted}")
    print(f"  Skipped (already in DB): {skipped}")

    cur.execute("SELECT COUNT(*) FROM shops")
    total = cur.fetchone()[0]
    print(f"\n  Total shops in DB: {total}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
