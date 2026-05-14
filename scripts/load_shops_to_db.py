"""
Load cleaned machine shops into the database.

1. Creates shops + shop_ratings tables (if not exist) with expanded schema
2. Truncates existing shops (in case re-running)
3. Inserts all cleaned shops from machine_shops_clean.json
"""

import json
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "user": "engine",
    "password": "eng1n3vault!",
    "database": "engine_data",
}

CLEAN_JSON = "scripts/machine_shops_clean.json"

CREATE_SHOPS_SQL = """
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    services TEXT[] NOT NULL DEFAULT '{}',
    turnaround_time TEXT NOT NULL DEFAULT 'Contact for estimate',
    lat REAL,
    lng REAL,
    source TEXT NOT NULL DEFAULT 'user',
    approved INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_state ON shops(state);
CREATE INDEX IF NOT EXISTS idx_shops_approved ON shops(approved);

CREATE TABLE IF NOT EXISTS shop_ratings (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_ratings_shop_id ON shop_ratings(shop_id);

CREATE TABLE IF NOT EXISTS shop_edit_suggestions (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    submitter_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

# Optional: add columns if table was previously created with old schema
ALTER_SHOPS_SQL = """
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='address') THEN
        ALTER TABLE shops ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='zip') THEN
        ALTER TABLE shops ADD COLUMN zip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='email') THEN
        ALTER TABLE shops ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='services') THEN
        ALTER TABLE shops ADD COLUMN services TEXT[] NOT NULL DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='lat') THEN
        ALTER TABLE shops ADD COLUMN lat REAL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='lng') THEN
        ALTER TABLE shops ADD COLUMN lng REAL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='source') THEN
        ALTER TABLE shops ADD COLUMN source TEXT NOT NULL DEFAULT 'user';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shops' AND column_name='updated_at') THEN
        ALTER TABLE shops ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;
"""


def main():
    print("Loading clean shops JSON...")
    with open(CLEAN_JSON, encoding="utf-8") as f:
        shops = json.load(f)
    print(f"  {len(shops)} shops to insert")

    print("Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    print("Creating tables (if not exist)...")
    cur.execute(CREATE_SHOPS_SQL)
    cur.execute(ALTER_SHOPS_SQL)
    conn.commit()

    print("Clearing existing shops...")
    cur.execute("TRUNCATE shops RESTART IDENTITY CASCADE")
    conn.commit()

    print("Inserting shops...")
    insert_sql = """
        INSERT INTO shops (
            name, address, city, state, zip, phone, email, website,
            description, specialties, services, turnaround_time,
            source, approved
        ) VALUES %s
    """

    rows = []
    for s in shops:
        rows.append((
            s.get("name") or "Unknown",
            s.get("address"),
            s.get("city") or "",
            s.get("state") or "",
            s.get("zip"),
            s.get("phone"),
            s.get("email"),
            s.get("website"),
            s.get("description"),
            s.get("specialties", []),
            s.get("services", []),
            "Contact for estimate",
            "searxng-scrape",
            1,
        ))

    execute_values(cur, insert_sql, rows, page_size=100)
    conn.commit()

    # Verify
    cur.execute("SELECT COUNT(*) FROM shops")
    count = cur.fetchone()[0]
    print(f"\n[OK] {count} shops loaded into database")

    cur.execute("""
        SELECT state, COUNT(*) AS n
        FROM shops
        WHERE approved = 1
        GROUP BY state
        ORDER BY n DESC
        LIMIT 10
    """)
    print("\nTop 10 states:")
    for state, n in cur.fetchall():
        print(f"  {state}: {n}")

    # Sample
    cur.execute("""
        SELECT name, city, state, phone, array_length(services,1), array_length(specialties,1)
        FROM shops
        WHERE phone IS NOT NULL AND array_length(services,1) >= 3
        ORDER BY RANDOM()
        LIMIT 5
    """)
    print("\nRandom sample (with 3+ services):")
    for row in cur.fetchall():
        name, city, state, phone, svc, spec = row
        print(f"  {name[:50]:50s} {city}, {state} | {phone} | {svc} svc, {spec} spec")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
