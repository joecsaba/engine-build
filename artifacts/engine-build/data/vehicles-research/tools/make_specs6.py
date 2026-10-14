# -*- coding: utf-8 -*-
# Curation specs for batch 6 (2026-10-13). Writes vspecs/<slug>.json, draft until approved.
# Public copy must not mention sources.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."
def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}
S = {}

S["magnum"] = dict(make="Dodge", model="Magnum", makeSlug="dodge", slug="magnum",
  title="Dodge Magnum Engines by Year (1978–2008)",
  description="Every factory engine in the Dodge Magnum by year: the 318, 360 and 400 V8s of the 1978–79 coupe, and the V6s, 5.7 Hemi and SRT8 6.1 of the 2005–08 wagon.",
  intro=["Dodge used the Magnum name twice: for a personal-luxury coupe in 1978 and 1979, and for a rear-drive wagon from 2005 to 2008. There was no Magnum in between.", PICK],
  generations=[
    G("1978-1979", "1978–1979 coupe", 1978, 1979, "The 318 and 360 small blocks and, for 1978 only, the 400 big block."),
    G("lx", "2005–2008 wagon (LX)", 2005, 2008, "The 2.7 and 3.5 V6s, the 5.7 Hemi in the R/T, and the 6.1 Hemi in the 2006–2008 SRT8.")],
  files=["verify_dodge-magnum-1978-2008.json"], merge_trims=True)

S["chrysler-300"] = dict(no_link=[{"cid": 392, "years": [1957, 1958]}], desc_strip=[r"inline "], make="Chrysler", model="300", makeSlug="chrysler", slug="300",
  title="Chrysler 300 Engines by Year (1955–2023)",
  description="Every factory engine in the Chrysler 300 by year: letter-car Hemis and wedges, the 440 TNT, the 300M's 3.5 V6, and the Hemi and SRT V8s of the 300C.",
  intro=["The Chrysler 300 began as the 1955 C-300, the first of the letter-series cars that ran to the 1965 300L. A non-letter 300 sport series ran alongside from 1962 to 1971; the name returned for 1979, as the 300M from 1999 to 2004, and as the rear-drive 300 from 2005 to 2023.", PICK],
  generations=[
    G("letter", "Letter series (C-300 to 300L)", 1955, 1965, "The 331 and 354 FirePower Hemis, the 392 Hemi, then the 413 wedge with long or short cross-ram induction. There was no 300I."),
    G("sport", "300 sport series", 1962, 1971, "The 383 and 413 wedges, then the 440 and the 440 TNT, including the 1970 300-H."),
    G("1979", "1979 300", 1979, 1979, "A Cordoba-based coupe with the 360 four-barrel."),
    G("300m", "300M", 1999, 2004, "The 3.5 SOHC V6, uprated for the 300M Special."),
    G("lx", "300 and 300C (LX)", 2005, 2010, "The 2.7 and 3.5 V6s, the 5.7 Hemi in the 300C and the 6.1 Hemi in the SRT8."),
    G("ld", "300 and 300C (LD)", 2011, 2023, "The 3.6 Pentastar V6, the 5.7 Hemi, the 6.4 in the 2012–2014 SRT8 and the 2023 300C.")],
  files=["verify_chrysler-300-1955-1971.json", "verify_chrysler-300-1979-2023.json"], merge_trims=True)

S["3100"] = dict(family_overrides=[{"years": [1947, 1953], "cid": [216], "url": "/engines/chevrolet/chevrolet-216ci"}, {"years": [1955, 1957], "cid": [265], "url": "/engines/chevrolet/chevrolet-265ci"}], make="Chevrolet", model="3100 Pickup", makeSlug="chevrolet", slug="3100",
  title="Chevrolet 3100 Engines by Year (1947–1959)",
  description="Every factory engine in the Chevrolet 3100 half-ton pickup by year, 1947–1959: the 216 and 235 Thriftmaster sixes and the 265 and 283 Trademaster V8s.",
  intro=["The 3100 was Chevrolet's half-ton pickup through the Advance Design and Task Force years, including the Cameo Carrier and the 1958–1959 Apache 31. 1955 had two series: the Advance Design truck early in the year and the Task Force truck from March. Later half-tons are on the C/K pickup page.", PICK],
  generations=[
    G("advance-design", "Advance Design", 1947, 1955, "The 216 Thriftmaster six, replaced by the 235 for 1954. The 1955 first-series trucks kept the 235."),
    G("task-force", "Task Force", 1955, 1959, "The 235 six and Chevrolet's first V8 truck option: the 265 from the 1955 second series, then the 283 for 1958.")],
  files=["verify_chevrolet-3100-1947-1959.json"], merge_trims=True)

S["durango"] = dict(make="Dodge", model="Durango", makeSlug="dodge", slug="durango",
  title="Dodge Durango Engines by Year (1998–2026)",
  description="Every factory engine in the Dodge Durango by year, 1998–2026: Magnum and PowerTech V6s and V8s, the 5.7 Hemi and hybrid, the Pentastar, the 392 and Hellcat.",
  intro=["Dodge launched the Durango for 1998 on the Dakota's frame. The second generation ended in December 2008, so there was no 2010 model; the third generation arrived for 2011 on a unibody shared with the Jeep Grand Cherokee.", PICK],
  generations=[
    G("gen1", "First generation", 1998, 2003, "The 3.9, 5.2 and 5.9 Magnum engines, and the 4.7 PowerTech V8 from 2000."),
    G("gen2", "Second generation", 2004, 2009, "The 3.7 V6, the 4.7 V8 and the 5.7 Hemi, with a two-mode hybrid for 2009."),
    G("gen3", "Third generation", 2011, 2026, "The 3.6 Pentastar V6, the 5.7 Hemi, the 6.4 in the SRT and R/T 392, and the supercharged Hellcat.")],
  files=["verify_dodge-durango-1998-2026.json"], merge_trims=True,
  desc_strip=[r"\s*\((2008 redesign|VVT, MDS)\)"])

S["marauder"] = dict(desc_strip=[r"^Marauder\s+", r"\s*V-8$"], make="Mercury", model="Marauder", makeSlug="mercury", slug="marauder",
  title="Mercury Marauder Engines by Year",
  description="Every factory engine in the Mercury Marauder by year: the 390 and 427 FE V8s of 1963–65, the 390 and 429 of 1969–70, and the 4.6 DOHC V8 of the 2003–04 sedan.",
  intro=["Mercury used the Marauder name three times: for its fastback-roof full-size cars from mid-1963 to 1965, for a big two-door hardtop in 1969 and 1970, and for a high-performance sedan in 2003 and 2004. In between, Marauder named Mercury engines rather than a car.", PICK],
  generations=[
    G("1963-1965", "1963–1965", 1963, 1965, "The 390 FE in several outputs and the 427 FE with one or two four-barrels."),
    G("1969-1970", "1969–1970", 1969, 1970, "The 390 and the 429 385-series V8; the X-100 came only with the 429 four-barrel."),
    G("2003-2004", "2003–2004", 2003, 2004, "The 4.6 DOHC Modular V8, the only engine.")],
  files=["verify_mercury-marauder-1963-2004.json"], merge_trims=True,
  exclude={"1963|406|385": "406 in the 1963 Marauder: factory literature lists only the 390 and 427", "1963|406|405": "406 in the 1963 Marauder: factory literature lists only the 390 and 427"})

S["ramcharger"] = dict(family_overrides=[{"years": [1974, 1992], "cid": [360], "match": "LA 360", "url": "/engines/plymouth/la"}], make="Dodge", model="Ramcharger", makeSlug="dodge", slug="ramcharger",
  title="Dodge Ramcharger Engines by Year (1974–1993)",
  description="Every factory engine in the US Dodge Ramcharger by year, 1974–1993: the 225 Slant Six, the 318 and 360, the 400 and 440 big blocks, and the Magnum V8s.",
  intro=["Dodge's full-size Ramcharger SUV ran in the US from 1974 to 1993, sold alongside the Plymouth Trail Duster through 1981. The first trucks were four-wheel-drive V8s; two-wheel drive and the Slant Six arrived for 1975.", PICK],
  generations=[
    G("gen1", "First generation", 1974, 1980, "The 225 six, the 318 and 360 small blocks, and the 400 and 440 big blocks through 1978."),
    G("gen2", "Second generation", 1981, 1993, "The 318 and 360, with throttle-body injection from 1988 and the Magnum 5.2 and 5.9 at the end.")],
  files=["verify_dodge-ramcharger-1974-1993.json"], merge_trims=True)

S["scout"] = dict(make="International", model="Scout", makeSlug="international", slug="scout",
  title="International Scout Engines (1961–1980)",
  description="Every factory engine in the International Scout by year, 1961–1980: the Comanche fours, AMC sixes, IH V-266, V-304 and V-345 V8s, and the Nissan diesels.",
  intro=["International Harvester built the Scout from 1961 to 1980: the Scout 80, the Scout 800 series and the Scout II, with the Terra and Traveler from 1976. IH quoted gross horsepower through 1972 and net from 1973.", PICK],
  generations=[
    G("scout80", "Scout 80", 1961, 1965, "The 152 Comanche four, half of IH's 304 V8."),
    G("scout800", "Scout 800, 800A and 800B", 1966, 1971, "The 152 and 196 fours, a turbocharged 152, the AMC 232 six, and the IH V-266 and V-304."),
    G("scout2", "Scout II", 1972, 1980, "The 196 four, the AMC 258 six for 1972, the V-304 and V-345, and the Nissan SD33 diesel from 1976 and SD33T turbodiesel for 1980.")],
  files=["verify_international-scout-1961-1980.json"], merge_trims=True,
  family_overrides=[{"years": [1969, 1974], "cid": [232, 258], "url": "/engines/jeep/amc-i6"}])

S["tundra"] = dict(metric_from=1900, make="Toyota", model="Tundra", makeSlug="toyota", slug="tundra",
  title="Toyota Tundra Engines by Year (2000–2026)",
  description="Every factory engine in the Toyota Tundra by year, 2000–2026: the 3.4 and 4.0 V6s, the 4.7, 4.6 and 5.7 V8s, and the twin-turbo i-FORCE and hybrid V6.",
  intro=["Toyota's full-size Tundra pickup arrived for 2000, built in Indiana and later in Texas. Hybrid ratings are for engine and motor combined; dealer-installed TRD superchargers are not listed.", PICK],
  generations=[
    G("gen1", "First generation", 2000, 2006, "The 3.4 5VZ-FE V6 and the 4.7 2UZ-FE V8, then the 4.0 1GR-FE V6 from 2005; ratings from 2006 reflect a change in the SAE test."),
    G("gen2", "Second generation", 2007, 2021, "The 4.0 V6, the 4.7 and then 4.6 V8, and the 5.7 3UR-FE V8, the only engine from 2020."),
    G("gen3", "Third generation", 2022, 2026, "The 3.4 V35A-FTS twin-turbo V6 in three outputs, including the i-FORCE MAX hybrid.")],
  files=["verify_toyota-tundra-2000-2026.json"], merge_trims=True, cid_remap={"207": 206})

S["grand-marquis"] = dict(family_overrides=[{"years": [1978, 1978], "cid": [351], "match": "351M", "url": "/engines/mercury/335-series"}], make="Mercury", model="Grand Marquis", makeSlug="mercury", slug="grand-marquis",
  title="Mercury Grand Marquis Engines (1975–2011)",
  description="Every factory engine in the Mercury Grand Marquis by year, 1975–2011: the 460, 400 and 351M V8s, the 255, 302 and 351 Windsors, and the 4.6 SOHC Modular V8.",
  intro=["The Grand Marquis began as the top Mercury Marquis in 1975 and became its own model for 1983. It shared Ford's Panther platform with the Crown Victoria from 1979 until production ended in 2011.", PICK],
  generations=[
    G("1975-1978", "1975–1978 Marquis Grand Marquis", 1975, 1978, "The 460 and 400 big-car V8s and, for 1978, the 351M."),
    G("1979-1991", "1979–1991 (Panther)", 1979, 1991, "The 302 and 351 Windsor V8s and, in 1981–1982 two-doors, the 255; fuel injection from 1983."),
    G("1992-1997", "1992–1997", 1992, 1997, "The 4.6 SOHC Modular V8, with a dual-exhaust version."),
    G("1998-2011", "1998–2011", 1998, 2011, "The 4.6 Modular V8 in single- and dual-exhaust (Handling Package and LSE) form; flex-fuel in the last years.")],
  files=["verify_mercury-grand-marquis-1975-2011.json"], merge_trims=True)

S["911"] = dict(no_link=[{"cid": 220, "years": [2001, 2011], "match": "Mezger"}, {"cid": 232, "years": [2010, 2011], "match": "Mezger"}, {"cid": 244, "years": [2011, 2011], "match": "Mezger"}], metric_from=1900, force_layout=[6, "flat-six"], din_from_research=True,
  make="Porsche", model="911", makeSlug="porsche", slug="911",
  title="Porsche 911 Engines by Year (1965–2026)",
  description="Every factory engine in the US Porsche 911 by year, 1965–2026: the air-cooled sixes and 930 Turbo, the water-cooled M96, Mezger and 9A engines, and the T-Hybrid.",
  intro=["Porsche brought the 911 to the US for 1965, and every one has had a flat-six engine. US cars were often rated below European ones because of emissions equipment. Where Porsche quoted a US car only in metric (DIN) horsepower, the rating is shown in PS. Hybrid ratings are for engine and motor combined.", PICK],
  generations=[
    G("901", "Original 911", 1965, 1973, "The 2.0, 2.2 and 2.4 air-cooled sixes in the 911, 911T, E, S and L."),
    G("g-series", "G-series", 1974, 1989, "The 2.7, the 3.0 SC and the 3.2 Carrera, plus the 3.0 and 3.3 930 Turbo (not sold in the US 1980–1985)."),
    G("964", "964", 1989, 1994, "The 3.6 M64, the 3.3 Turbo and the 1994 3.6 Turbo."),
    G("993", "993", 1995, 1998, "The last air-cooled 911s: the 3.6, the Varioram 3.6 and the twin-turbo 3.6."),
    G("996", "996", 1999, 2005, "The first water-cooled 911s: the 3.4 and 3.6 M96, and the Mezger engines of the Turbo, GT2 and GT3."),
    G("997", "997", 2005, 2013, "The 3.6 and 3.8 M97, direct-injection 9A1 engines from 2009, and the Mezger Turbo, GT2 and GT3."),
    G("991", "991", 2012, 2019, "The 3.4 and 3.8 9A1, the 3.0 twin-turbo 9A2 from 2017, and the 4.0 GT engines."),
    G("992", "992", 2020, 2026, "The 3.0 twin-turbo 9A2 Evo, the 3.7 Turbo, the 4.0 GT3, and the 3.6 T-Hybrid from 2025.")],
  files=["verify_porsche-911-1965-1998.json", "verify_porsche-911-1999-2026.json"], merge_trims=True)

S["crown-victoria"] = dict(codes={"1983|302|130": "CFI"}, make="Ford", model="Crown Victoria", makeSlug="ford", slug="crown-victoria",
  title="Ford Crown Victoria Engines (1980–2011)",
  description="Every factory engine in the Ford Crown Victoria and LTD Crown Victoria by year, 1980–2011: the Windsor V8s and the 4.6 Modular, including Police Interceptors.",
  intro=["Ford's Panther-platform LTD Crown Victoria arrived for 1980 and became simply the Crown Victoria for 1992. The Police Interceptor carried its own ratings. The last US models were 2011s.", PICK],
  generations=[
    G("panther1", "LTD Crown Victoria", 1980, 1991, "The 302 and 351 Windsor V8s, the 255 in 1981–1982, and the 351 HO police engine; fuel injection from 1983."),
    G("panther2", "1992–1997", 1992, 1997, "The 4.6 SOHC Modular V8, with dual exhaust on the Police Interceptor and handling package, and a CNG version."),
    G("panther3", "1998–2011", 1998, 2011, "The 4.6 Modular V8 in single- and dual-exhaust form, with flex-fuel capability in later years.")],
  files=["verify_ford-crown-victoria-1980-2012.json"], merge_trims=True)

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    v.setdefault("draft", True)
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
