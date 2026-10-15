# -*- coding: utf-8 -*-
# Curation specs for batch 7 (2026-10-15). Writes vspecs/<slug>.json, draft until approved.
# Public copy must not mention sources.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."
def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}
S = {}

S["model-a"] = dict(no_link=[{"cid": 221, "years": [1932, 1934]}], make="Ford", model="Model A to Model 40", makeSlug="ford", slug="model-a",
  title="Ford Model A, B and 18 Engines (1928–1934)",
  description="Every factory engine in the Ford Model A, the 1932 Ford (Model B four and Model 18 flathead V8) and the 1933–34 Model 40, by year, with bore, stroke and rated hp.",
  intro=["Ford's Model A replaced the Model T for 1928. For 1932 the new car came two ways from the same body: the four-cylinder Model B and the Model 18 with Ford's first V8, the flathead that made the '32 Ford the hot rod. The 1933–1934 Model 40 kept both engines.", PICK],
  generations=[
    G("model-a", "Model A (1928–1931)", 1928, 1931, "The 201 cubic-inch four, rated 40 hp."),
    G("1932", "1932 Ford: Model B and Model 18", 1932, 1932, "The Model B's improved four and the Model 18's 221 cubic-inch flathead V8."),
    G("model-40", "Model 40 (1933–1934)", 1933, 1934, "The four and the flathead V8, uprated each year.")],
  files=["verify_ford-model-a-1928-1934.json"], merge_trims=True)

S["explorer"] = dict(family_overrides=[{"years": [2011, 2019], "cid": [213], "match": "Duratec", "url": "/engines/mercury/duratec"}, {"years": [2013, 2019], "cid": [227], "url": "/engines/mercury/duratec"}], make="Ford", model="Explorer", makeSlug="ford", slug="explorer",
  title="Ford Explorer Engines by Year (1991–2026)",
  description="Every factory engine in the Ford Explorer by year, 1991–2026: the 4.0 V6s, 5.0 and 4.6 V8s, the 3.5 and EcoBoost engines, the hybrid and Police Interceptor.",
  intro=["Ford's Explorer replaced the Bronco II for 1991 and has been the best-selling SUV in America for much of its life. The two-door Explorer Sport and the Explorer Sport Trac pickup are included; Police Interceptor Utility engines are marked, and hybrid ratings are for engine and motor combined.", PICK],
  generations=[
    G("gen1", "First generation", 1991, 1994, "The 4.0 Cologne OHV V6."),
    G("gen2", "Second generation", 1995, 2001, "The 4.0 OHV and, from 1997, the 4.0 SOHC V6, plus the 5.0 Windsor V8."),
    G("gen3", "Third generation", 2002, 2005, "The 4.0 SOHC V6 and the 4.6 Modular V8."),
    G("gen4", "Fourth generation", 2006, 2010, "The 4.0 SOHC V6 and the 4.6 three-valve V8."),
    G("gen5", "Fifth generation", 2011, 2019, "The 3.5 V6, the 2.0 and 2.3 EcoBoost fours, the 3.5 EcoBoost, and the Police Interceptor's 3.7."),
    G("gen6", "Sixth generation", 2020, 2026, "The 2.3 EcoBoost, the 3.0 EcoBoost V6 in the ST and top trims, and the 3.3 hybrid.")],
  files=["verify_ford-explorer-1991-2026.json"], merge_trims=True)

S["expedition"] = dict(codes={"2001|281|None": "Triton", "2002|281|None": "Triton"}, make="Ford", model="Expedition", makeSlug="ford", slug="expedition",
  title="Ford Expedition Engines by Year (1997–2026)",
  description="Every factory engine in the Ford Expedition by year, 1997–2026: the 4.6 and 5.4 Triton V8s, the three-valve 5.4, and the 3.5 EcoBoost V6 and its High Output tune.",
  intro=["Ford's full-size Expedition replaced the Bronco for 1997, with the longer EL (now MAX) from 2007. Engines offered only in the Lincoln Navigator are not listed.", PICK],
  generations=[
    G("gen1", "First generation", 1997, 2002, "The 4.6 and 5.4 Triton V8s."),
    G("gen2", "Second generation", 2003, 2006, "The 4.6 and 5.4, then the three-valve 5.4 alone from 2005."),
    G("gen3", "Third generation", 2007, 2017, "The 5.4 three-valve V8, flex-fuel from 2009, then the 3.5 EcoBoost from 2015."),
    G("gen4", "Fourth generation", 2018, 2024, "The 3.5 EcoBoost V6 in standard and High Output tunes, including the Timberline."),
    G("gen5", "Fifth generation", 2025, 2026, "The 3.5 EcoBoost V6, with the High Output standard on the Tremor.")],
  files=["verify_ford-expedition-1997-2026.json"], merge_trims=True)

S["caprice"] = dict(make="Chevrolet", model="Caprice", makeSlug="chevrolet", slug="caprice",
  title="Chevrolet Caprice Engines by Year (1965–2017)",
  description="Every factory engine in the Chevrolet Caprice by year: small and big block V8s from 1965, the '80s V6s and diesel, the LT1 B-body and the 2011–17 police Caprice.",
  intro=["The Caprice began as a 1965 luxury package on the Impala Sport Sedan and became Chevrolet's top full-size car through 1996; the 1994–1996 Impala SS has its own page. The name returned from 2011 to 2017 on a police-only sedan. Police engines are marked; California-only engines are noted.", PICK],
  generations=[
    G("1965-1970", "1965–1970", 1965, 1970, "Small and big block V8s, from the 283 and 327 to the 396, 427 and 454."),
    G("1971-1976", "1971–1976", 1971, 1976, "The 350, 400, 402 and 454; ratings are SAE net from 1972."),
    G("1977-1990", "1977–1990 (downsized)", 1977, 1990, "The 250 six and V6s, the 267, 305 and 350 V8s, the Olds 350 diesel and 307, and the 4.3 V6."),
    G("1991-1996", "1991–1996", 1991, 1996, "The 305 and 350, then the 4.3 L99 and the LT1, including the 9C1 police package."),
    G("ppv", "Caprice PPV (2011–2017, police only)", 2011, 2017, "The 6.0 L77 V8 and, from 2012, the 3.6 V6.")],
  files=["verify_chevrolet-caprice-1965-2017.json"], merge_trims=True)

S["beetle"] = dict(metric_from=1900, force_layout=[4, "flat-four"], basis_from_research=True,
  make="Volkswagen", model="Beetle", makeSlug="volkswagen", slug="beetle",
  title="VW Beetle Engines by Year (1949–1979)",
  description="Every factory engine in the US air-cooled Volkswagen Beetle by year, 1949–1979: the 1100, 1200, 1300, 1500 and 1600 flat fours, carbureted and fuel-injected.",
  intro=["Volkswagen sold the air-cooled Beetle in the US from 1949. The sedan, including the Super Beetle, left after 1977 and the convertible after 1979. Every engine was an air-cooled flat four in the back; ratings are the US figures, SAE gross until 1972 and net from 1973. The water-cooled New Beetle of 1998 on is a different car.", PICK],
  generations=[
    G("1949-1953", "1949–1953", 1949, 1953, "The 1131 cc flat four."),
    G("1954-1960", "1954–1960", 1954, 1960, "The 1192 cc 1200."),
    G("1961-1965", "1961–1965", 1961, 1965, "The 1200, uprated for 1961."),
    G("1966-1979", "1966–1979", 1966, 1979, "The 1300, then the 1500 and 1600, with fuel injection from 1975.")],
  files=["verify_volkswagen-beetle-1949-1979.json"], merge_trims=True)

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    pass  # batch 7 published 2026-10-15; new models must set draft=True themselves
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
