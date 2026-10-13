# -*- coding: utf-8 -*-
# Curation specs for batch 4 (Jeeps, trucks). Writes vspecs/<slug>.json, draft until approved.
# Public copy must not mention sources; notes say "Also published as..." rather than naming them.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]  # optional: build only these slugs
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."

def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}

S = {}

S["wrangler"] = dict(make="Jeep", model="Wrangler", makeSlug="jeep", slug="wrangler",
  title="Jeep Wrangler Engines by Year (1987–2026)",
  description="Every factory engine in the Jeep Wrangler by year, 1987–2026: the 2.5 four and 4.0 six, the 3.6 Pentastar, 2.0 turbo, EcoDiesel and the 392 V8.",
  intro=["The Wrangler replaced the CJ for 1987 and has been built in four generations: the YJ, TJ, JK and JL. There was no 1996 model year; the YJ ended with 1995 and the TJ arrived as a 1997 model.", PICK],
  generations=[
    G("yj", "YJ", 1987, 1995, "The YJ used AMC's 2.5 four and, through 1990, the carbureted 4.2 six. The fuel-injected 4.0 six replaced the 4.2 for 1991."),
    G("tj", "TJ", 1997, 2006, "The coil-sprung TJ kept the 2.5 four and the 4.0 six; the 2.4 PowerTech four replaced the 2.5 for 2003. The Rubicon arrived in 2003 and the long-wheelbase Unlimited in 2004."),
    G("jk", "JK", 2007, 2018, "The JK started with the 3.8 V6 and switched to the 3.6 Pentastar V6 for 2012. The JK was sold alongside the new JL during 2018."),
    G("jl", "JL", 2018, 2026, "The JL offers the 3.6 Pentastar and a 2.0 turbo four, with the 3.0 EcoDiesel from 2020 to 2023, the 4xe plug-in hybrid from 2021 to 2025, and the 6.4 V8 of the 392 models from 2021.")],
  files=["verify_jeep-wrangler-1987-2006.json", "verify_jeep-wrangler-2007-2026.json"],
  cid_remap={"121": 122})

S["cherokee"] = dict(make="Jeep", model="Cherokee", makeSlug="jeep", slug="cherokee",
  title="Jeep Cherokee Engines by Year (1974–2023)",
  description="Every factory engine in the Jeep Cherokee by year: AMC sixes and V8s in the full-size SJ, the XJ's 2.5 and 4.0, and the 2014–2023 2.4, 3.2 and 2.0 turbo.",
  intro=["Jeep has used the Cherokee name on three different vehicles in the US: a two-door version of the full-size Wagoneer (1974–1983), the compact unibody XJ (1984–2001), and a front-drive-based model sold from 2014 to 2023. The 2002–2012 US model in between was sold as the Liberty.", PICK],
  generations=[
    G("sj", "SJ (full-size)", 1974, 1983, "The full-size Cherokee used AMC's 258 six and 360 and 401 V8s. Jeep's literature stopped quoting horsepower after 1974, so most later years show no rating."),
    G("xj", "XJ", 1984, 2001, "The XJ started with AMC's 2.5 four, a GM-built 2.8 V6 and a Renault 2.1 turbodiesel. The 4.0 six replaced the V6 for 1987 and was rated 190 hp from 1991."),
    G("kl", "KL", 2014, 2023, "The last Cherokee offered the 2.4 Tigershark four, the 3.2 Pentastar V6 and, from 2019, a 2.0 turbo four.")],
  files=["verify_jeep-cherokee.json"], metric_from=1984,
  family_overrides=[{"years": [2014, 2023], "cid": [198], "url": "/engines/jeep/pentastar"}],
  code_notes={})

S["grand-cherokee"] = dict(make="Jeep", model="Grand Cherokee", makeSlug="jeep", slug="grand-cherokee",
  title="Jeep Grand Cherokee Engines by Year",
  description="Every factory engine in the Jeep Grand Cherokee by year, 1993–2026: the 4.0 six, Magnum, PowerTech and Hemi V8s, the SRT8, Trackhawk and 4xe.",
  intro=["The Grand Cherokee arrived for 1993 and has been built in five generations: the ZJ, WJ, WK, WK2 and WL. The three-row Grand Cherokee L joined the WL range for 2021.", PICK],
  generations=[
    G("zj", "ZJ", 1993, 1998, "The ZJ offered the 4.0 six and the 5.2 V8, then the 5.9 V8 in the 1998 5.9 Limited."),
    G("wj", "WJ", 1999, 2004, "The WJ kept the 4.0 six and added the 4.7 PowerTech V8, with a high-output 4.7 from 2002."),
    G("wk", "WK", 2005, 2010, "The WK brought the 3.7 V6, the 5.7 Hemi and, from 2006, the 6.1 Hemi of the SRT8. A Mercedes-built 3.0 turbodiesel was offered for 2007–2008."),
    G("wk2", "WK2", 2011, 2022, "The WK2 used the 3.6 Pentastar V6, the 5.7 Hemi, the 6.4 Hemi of the SRT8 and SRT, a 3.0 EcoDiesel, and in the 2018–2021 Trackhawk the supercharged 6.2 Hellcat V8. A WK2-based Grand Cherokee WK was sold alongside the new model for 2022."),
    G("wl", "WL", 2021, 2026, "The WL offers the 3.6 V6, the 5.7 Hemi through 2024, the 4xe plug-in hybrid for 2022–2025 and, from 2026, the Hurricane 2.0 turbo four.")],
  files=["verify_jeep-grand-cherokee-1993-2010.json", "verify_jeep-grand-cherokee-2011-2026.json"],
  ranges={"2005|287|230": [230, 235]},
  cid_remap={"183": 182},
  family_overrides=[{"years": [1998, 1998], "cid": [360], "url": "/engines/ram/magnum"},
                    {"years": [2018, 2021], "cid": [376], "url": "/engines/dodge/gen-iii-hemi"}],
  no_link=[{"cid": 182, "years": [2007, 2008]}],
  notes={"2005|287|230": "Published ratings for this engine vary."})

S["wagoneer"] = dict(make="Jeep", model="Wagoneer", makeSlug="jeep", slug="wagoneer",
  title="Jeep Wagoneer Engines by Year (1963–1991)",
  description="Every factory engine in the Jeep Wagoneer and Grand Wagoneer by year, 1963–1991: the Tornado six, 327 Vigilante, Buick 350 and AMC sixes and V8s.",
  intro=["Kaiser introduced the full-size Wagoneer for 1963. American Motors bought Jeep in 1970, and the same basic body was built until 1991, renamed Grand Wagoneer from 1984. The compact XJ-based Wagoneer of 1984–1990 is covered with the Cherokee.", PICK],
  generations=[
    G("kaiser", "Kaiser", 1963, 1970, "Kaiser's Wagoneer started with the overhead-cam Tornado six. AMC's 232 six and the 327 Vigilante V8 replaced it during 1965, and Buick's 350 Dauntless V8 took over from the 327 during 1968."),
    G("amc", "AMC", 1971, 1991, "Under AMC the Wagoneer moved to AMC's 258 six and 304, 360 and 401 V8s. Jeep's literature stopped quoting horsepower after 1974, so many later years show no rating. The Grand Wagoneer of 1984–1991 used the 360 V8, with the 258 six available through 1986.")],
  files=["verify_jeep-wagoneer-1963-1991.json"], metric_from=1984,
  family_overrides=[{"years": [1968, 1971], "cid": [350], "url": "/engines/jeep/dauntless"}])

S["gladiator"] = dict(make="Jeep", model="Gladiator", makeSlug="jeep", slug="gladiator",
  title="Jeep Gladiator Engines by Year",
  description="Every factory engine in the Jeep Gladiator pickup by year: the 1963–1971 Tornado six, 327 and Buick 350, and the 2020–2026 3.6 V6 and EcoDiesel.",
  intro=["Jeep has sold two pickups called Gladiator: Kaiser's full-size truck of 1963–1971, which continued as the J-series, and the Wrangler-based Gladiator that arrived for 2020.", PICK],
  generations=[
    G("sj", "1963–1971", 1963, 1971, "The first Gladiator shared the Wagoneer's engines: the Tornado six, then AMC's 232 six and the 327 Vigilante V8, Buick's 350 Dauntless V8, and AMC sixes and V8s from 1971."),
    G("jt", "JT", 2020, 2026, "The Wrangler-based Gladiator uses the 3.6 Pentastar V6, with the 3.0 EcoDiesel offered for 2021–2023.")],
  files=["verify_jeep-gladiator.json"],
  family_overrides=[{"years": [1968, 1971], "cid": [350], "url": "/engines/jeep/dauntless"}],
  cid_remap={"183": 182})

S["cj"] = dict(make="Jeep", model="CJ", makeSlug="jeep", slug="cj",
  title="Jeep CJ Engines by Year (1945–1986)",
  description="Every factory engine in the civilian Jeep CJ by year, 1945–1986: Go-Devil and Hurricane fours, the Dauntless V6, AMC sixes, the 304 V8 and the 2.5 four.",
  intro=["Willys built the first civilian Jeep, the CJ-2A, in 1945. The CJ line ran through the CJ-3A, CJ-3B, CJ-5, CJ-6, CJ-7 and the CJ-8 Scrambler under Willys, Kaiser and American Motors until the Wrangler replaced it for 1987. The trims column shows which CJ models had each engine.", PICK],
  generations=[
    G("willys", "Willys", 1945, 1952, "The CJ-2A and CJ-3A used the 134 cubic-inch Go-Devil four, a flathead."),
    G("willys-kaiser", "Willys and Kaiser", 1953, 1971, "The taller F-head Hurricane four arrived with the CJ-3B for 1953 and powered the CJ-5 and long-wheelbase CJ-6 from 1955. Kaiser added a Perkins diesel in the early 1960s and Buick's 225 Dauntless V6 from 1965."),
    G("amc", "American Motors", 1972, 1986, "AMC fitted its own 232 and 258 sixes and 304 V8, lengthening the CJ-5 to fit them. The CJ-7 arrived for 1976 and the CJ-8 Scrambler for 1981. GM's 151 Iron Duke four was the base engine for 1980–1983, and AMC's 2.5 four replaced it for 1984. Ratings are SAE net from 1972.")],
  files=["verify_jeep-cj-1945-1986.json"], metric_from=1980,
  trim_rewrite=[[r"^(CJ-\w+(?: Scrambler)?).*$", r"\1"]], merge_trims=True,
  ranges={"1984|150|105": [86, 105], "1985|150|105": [86, 105], "1986|150|105": [86, 105]},
  # the flathead Go-Devil has no page; the Hurricane family is the later F-head
  no_link=[{"cid": 134, "years": [1945, 1952]}],
  family_overrides=[{"years": [1965, 1971], "cid": [225], "url": "/engines/jeep/dauntless"}])

S["ck-pickup"] = dict(make="Chevrolet", model="C/K Pickup", makeSlug="chevrolet", slug="ck-pickup",
  title="Chevy C/K Pickup Engines by Year (1960–1998)",
  description="Every factory engine in the Chevrolet C10, K10, C1500 and K1500 half-ton pickup by year, 1960–1998: sixes, small and big blocks, diesels and the 454 SS.",
  intro=["Chevrolet's C/K trucks ran from 1960 to 1998; C means two-wheel drive and K four-wheel drive. This page covers the half-ton models: the C10 and K10 through 1987 and the C1500 and K1500 from 1988. The Silverado name, a trim level until then, became its own model for 1999.", PICK],
  generations=[
    G("1960-1966", "1960–1966", 1960, 1966, "The first C/K trucks used Chevrolet's 235 and 230 sixes, the 261 and 292 sixes and the 283 V8, with the 327 added for 1966."),
    G("1967-1972", "1967–1972", 1967, 1972, "The 1967 redesign kept the 250 and 292 sixes and offered small-block V8s up to the 350. The C10 could be ordered with a big block from 1968: the 396, then the 402, which Chevrolet badged as a 400. Ratings are SAE net from 1972."),
    G("1973-1987", "1973–1987", 1973, 1987, "The square-body trucks ran from the 250 six to the 454 V8, which was offered in the half-ton through 1979. GM's 6.2 diesel arrived for 1982 and the 4.3 V6 for 1985. For 1987 the half-tons were renamed R10 and V10 when the new C/K trucks were announced."),
    G("gmt400", "GMT400", 1988, 1998, "The GMT400 C/K 1500 used the 4.3 V6, the 5.0 and 5.7 V8s and diesels, plus the 454 SS of 1990–1993. Vortec heads arrived for 1996.")],
  files=["verify_chevrolet-ck-1960-1972.json", "verify_chevrolet-ck-1973-1987.json", "verify_chevrolet-ck-1988-1998.json"],
  trim_rewrite=[[r"^(C10|K10|R10|V10|C1500|K1500)\s+(standard|optional)(\s+V8)?$", r"\1"], [r"^(C10|K10) \((2WD|4WD)( only)?\)$", r"\1"]],
  merge_trims=True,
  ranges={"1997|305|230": [220, 230], "1998|305|230": [220, 230]},
  family_overrides=[{"years": [1963, 1965], "cid": [230], "url": "/engines/gmc/chevy-i6-194-292"},
                    {"years": [1990, 1993], "cid": [454], "url": "/engines/chevrolet/chevrolet-454ci"},
                    {"years": [1978, 1981], "cid": [350], "diesel": True, "url": "/engines/oldsmobile/diesel-v8"}],
  code_notes={"LF9": "Oldsmobile-built diesel."})

S["silverado"] = dict(make="Chevrolet", model="Silverado 1500", makeSlug="chevrolet", slug="silverado-1500",
  title="Chevrolet Silverado 1500 Engines by Year",
  description="Every factory engine in the Chevrolet Silverado 1500 by year, 1999–2026: Vortec V6 and V8s, the SS 6.0, the 6.2 V8, the 2.7 TurboMax, the Duramax 3.0 and the EV.",
  intro=["The Silverado replaced the C/K 1500 for 1999 and has been built in four generations. This page covers the half-ton Silverado 1500; the 1500HD of 2001–2007 was built on the heavy-duty chassis and is not included.", PICK],
  generations=[
    G("gmt800", "GMT800", 1999, 2006, "The first Silverado used the 4.3 V6 and Vortec 4.8, 5.3 and 6.0 V8s. The 2003–2007 Silverado SS used a 345 hp 6.0, and a mild hybrid ran from 2004."),
    G("gmt900", "GMT900", 2007, 2013, "The GMT900 arrived for 2007, when the old body was also sold as the Silverado Classic. Later trucks offered Active Fuel Management V8s up to the 6.2 and a two-mode hybrid from 2009."),
    G("k2xx", "K2XX", 2014, 2018, "The K2XX brought direct-injected EcoTec3 engines: the 4.3 V6, 5.3 V8 and 6.2 V8."),
    G("t1", "T1", 2019, 2026, "The current Silverado offers the 2.7 turbo four, the 5.3 and 6.2 V8s with Dynamic Fuel Management and a 3.0 Duramax diesel, plus the electric Silverado EV from 2024. The old body was sold for 2019 as the Silverado LD.")],
  files=["verify_chevrolet-silverado-1999-2013.json", "verify_chevrolet-silverado-2014-2026.json"],
  merge_trims=True,
  exclude={f"{y}|364|300": "1500HD (heavy-duty chassis)" for y in range(2001, 2008)})

S["f-100"] = dict(make="Ford", model="F-100", makeSlug="ford", slug="f-100",
  title="Ford F-100 Engines by Year (1953–1983)",
  description="Every factory engine in the Ford F-100 half-ton pickup by year, 1953–1983: flathead and Y-block V8s, the 223, 240 and 300 sixes, FE 352, 360 and 390, and the 302.",
  intro=["The F-100 was Ford's half-ton pickup from 1953 to 1983. The F-150 joined it for 1975 as a heavier-rated half-ton and replaced it after 1983. Four-wheel drive was offered from 1959 to 1976.", PICK],
  generations=[
    G("gen2", "1953–1956", 1953, 1956, "The first F-100 used the 215 and 223 sixes and the 239 flathead V8, replaced by the overhead-valve Y-block for 1954."),
    G("gen3", "1957–1960", 1957, 1960, "The 223 six and the 272 and 292 Y-block V8s."),
    G("gen4", "1961–1966", 1961, 1966, "The 223 six and the 292 V8, then from 1965 the new 240 and 300 sixes and the FE 352 V8."),
    G("gen5", "1967–1972", 1967, 1972, "The 240 and 300 sixes, the FE 360 and 390 V8s, and the 302 from 1969. Ratings are SAE net from 1972."),
    G("gen6", "1973–1979", 1973, 1979, "Sixes and the 302, 360, 390, 351M and 400 V8s; the 460 was offered in the F-100 for 1974 only."),
    G("gen7", "1980–1983", 1980, 1983, "The last F-100s offered the 300 six, a 3.8 V6 from 1982, and the 4.2 and 5.0 V8s.")],
  files=["verify_ford-f100-1953-1983.json"],
  names={"1964|262|152": "262 inline-six"})

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    v.setdefault("draft", True)
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
