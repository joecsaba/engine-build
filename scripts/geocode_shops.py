"""
Backfill lat/lng for shops using the US Census Geocoder (free, no API key).

Strategy:
  1. For shops with full address: try precise address geocoding
  2. For shops with only city+state: geocode the city center
  3. Skip if both attempts fail (rare; usually private/PO Box addresses)

Census Geocoder API: https://geocoding.geo.census.gov/geocoder/
"""

import sys
import time
import requests
import psycopg2

# Make stdout safe for Unicode shop names on Windows cp1252
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "engine",
    "password": "eng1n3vault!",
    "database": "engine_data",
}

CENSUS_BASE = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"
DELAY = 0.3   # Census - no strict limit
NOMINATIM_DELAY = 1.1   # Nominatim - 1 req/sec policy
TIMEOUT = 10


def geocode_census(address: str) -> tuple[float, float] | None:
    """Geocode via US Census (good for street addresses, USA only)."""
    try:
        resp = requests.get(CENSUS_BASE, params={
            "address": address,
            "benchmark": "Public_AR_Current",
            "format": "json",
        }, timeout=TIMEOUT)
        resp.raise_for_status()
        matches = resp.json().get("result", {}).get("addressMatches", [])
        if not matches:
            return None
        coords = matches[0].get("coordinates", {})
        lat = coords.get("y")
        lng = coords.get("x")
        if lat is not None and lng is not None:
            return (float(lat), float(lng))
        return None
    except Exception:
        return None


def geocode_nominatim(address: str) -> tuple[float, float] | None:
    """Geocode via Nominatim (handles city/ZIP/partial addresses)."""
    try:
        resp = requests.get(NOMINATIM_BASE, params={
            "q": address,
            "countrycodes": "us",
            "format": "json",
            "limit": "1",
        }, headers={"User-Agent": "engine-build.com directory backfill"}, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        return (float(data[0]["lat"]), float(data[0]["lon"]))
    except Exception:
        return None


def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, address, city, state, zip
        FROM shops
        WHERE lat IS NULL OR lng IS NULL
        ORDER BY id
    """)
    shops = cur.fetchall()
    print(f"Geocoding {len(shops)} shops...")

    success = 0
    fallback = 0
    failed = 0

    for i, (shop_id, name, address, city, state, zip_code) in enumerate(shops, 1):
        coords = None
        method = "none"

        # Try 1: Census with full address
        if address:
            full = f"{address}, {city}, {state}"
            if zip_code:
                full += f" {zip_code}"
            coords = geocode_census(full)
            if coords:
                method = "census-addr"
                success += 1
            time.sleep(DELAY)

        # Try 2: Nominatim with full address (catches what Census misses)
        if not coords and address:
            coords = geocode_nominatim(f"{address}, {city}, {state} {zip_code or ''}")
            if coords:
                method = "nominatim-addr"
                success += 1
            time.sleep(NOMINATIM_DELAY)

        # Try 3: Nominatim with city + state (city center fallback)
        if not coords:
            coords = geocode_nominatim(f"{city}, {state}")
            if coords:
                method = "nominatim-city"
                fallback += 1
            time.sleep(NOMINATIM_DELAY)

        # Update DB
        if coords:
            lat, lng = coords
            cur.execute(
                "UPDATE shops SET lat = %s, lng = %s WHERE id = %s",
                (lat, lng, shop_id)
            )
            safe_name = name.encode("ascii", "replace").decode()[:40]
            print(f"  [{i}/{len(shops)}] OK ({method:15s}) {safe_name:40s} -> {lat:.4f}, {lng:.4f}")
        else:
            failed += 1
            safe_name = name.encode("ascii", "replace").decode()[:40]
            print(f"  [{i}/{len(shops)}] FAILED                 {safe_name}")

        # Commit every 25 to avoid losing progress
        if i % 25 == 0:
            conn.commit()

    conn.commit()

    print(f"\n=== SUMMARY ===")
    print(f"  Precise (address):  {success}")
    print(f"  Fallback (city):    {fallback}")
    print(f"  Failed:             {failed}")
    print(f"  Total geocoded:     {success + fallback} / {len(shops)}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
