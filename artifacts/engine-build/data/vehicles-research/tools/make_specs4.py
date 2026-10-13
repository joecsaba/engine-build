# -*- coding: utf-8 -*-
# Curation specs for trucks wave 2 (2026-10-13). Writes vspecs/<slug>.json, draft until approved.
# Public copy must not mention sources.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."
def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}
S = {}

S["s-10"] = dict(make="Chevrolet", model="S-10", makeSlug="chevrolet", slug="s-10",
  title="Chevrolet S-10 Engines by Year (1982–2004)",
  description="Every factory engine in the Chevrolet S-10 pickup by year, 1982–2004: the 1.9, 2.0, 2.2 and 2.5 fours, the Isuzu diesel, the 2.8 V6 and the 4.3 Vortec V6.",
  intro=["Chevrolet's compact S-10 pickup ran from 1982 to 2004 in two generations; four-wheel-drive versions were badged T10 at first. The S-10 Blazer SUV is not included.", PICK],
  generations=[
    G("gen1", "1982–1993", 1982, 1993, "The first S-10 used GM's 1.9 and 2.0 fours, the Iron Duke 2.5, a 2.2 Isuzu diesel for 1984–1985 and the 2.8 V6. The 4.3 V6 arrived during 1988, with a high-output version from 1992."),
    G("gen2", "1994–2004", 1994, 2004, "The second S-10 offered the 2.2 four and the 4.3 Vortec V6 in standard and high-output form. The last 2004 trucks were Crew Cab 4x4s with the 4.3.")],
  files=["verify_chevrolet-s10-1982-2004.json"], merge_trims=True,
  names={f"{y}|119|82": "1.9L / 119 inline-four" for y in range(1982, 1986)},
  ranges={"1985|173|None": [110, 115], "1995|262|None": [180, 191], "1996|262|None": [170, 175], "1997|262|None": [170, 175]})

S["k5-blazer"] = dict(make="Chevrolet", model="K5 Blazer", makeSlug="chevrolet", slug="k5-blazer",
  title="Chevrolet K5 Blazer Engines by Year",
  description="Every factory engine in the full-size Chevrolet K5 Blazer by year, 1969–1994: the 250 six, the 307, 350 and 400 V8s, the 305, and the 6.2 and 6.5 diesels.",
  intro=["The full-size Blazer was built on the C/K pickup from 1969 to 1994; it was sold with two-wheel drive as well until 1982. For 1995 it was renamed the Tahoe. The compact S-10 Blazer is a different vehicle.", PICK],
  generations=[
    G("gen1", "1969–1972", 1969, 1972, "The first Blazer offered the 250 six and the 307 and 350 V8s. Ratings are SAE net from 1972."),
    G("gen2", "1973–1991", 1973, 1991, "The second Blazer added the 400 V8 for 1975–1979, the 305 from 1977, and GM's 6.2 diesel from 1982; the six was dropped after 1982. Several ratings differ from the pickup's because the Blazer often carried heavy-duty emissions equipment."),
    G("gen3", "1992–1994", 1992, 1994, "The GMT400 Blazer used the 5.7 V8, with a 6.5 turbo diesel for 1994.")],
  files=["verify_chevrolet-blazer-k5-1969-1994.json"], merge_trims=True)

S["bronco"] = dict(make="Ford", model="Bronco", makeSlug="ford", slug="bronco",
  title="Ford Bronco Engines by Year",
  description="Every factory engine in the Ford Bronco by year: the 170 and 200 sixes and 289 and 302 V8s, the 300 six, 351 and 400 V8s, and the 2021+ EcoBoost engines.",
  intro=["Ford built the Bronco from 1966 to 1996, first as a compact 4x4 and from 1978 on the F-series chassis, and brought the name back for 2021. The smaller Bronco II and today's Bronco Sport are separate models.", PICK],
  generations=[
    G("gen1", "1966–1977", 1966, 1977, "The early Bronco used the 170 and 200 sixes and the 289, then 302, V8. The 302 was the only engine from 1975."),
    G("gen2", "1978–1979", 1978, 1979, "The full-size Bronco arrived with the 351M and 400 V8s."),
    G("gen3", "1980–1986", 1980, 1986, "The 300 six and the 302 and 351 V8s, with fuel injection on the 302 from 1985 and a high-output 351."),
    G("gen4", "1987–1991", 1987, 1991, "All engines were fuel-injected: the 300 six, the 302 and the 351."),
    G("gen5", "1992–1996", 1992, 1996, "The last full-size Broncos used the 302 and 351 V8s; the six was dropped after 1992."),
    G("gen6", "2021–2026", 2021, 2026, "The new Bronco uses the 2.3 and 2.7 EcoBoost engines, with a 3.0 EcoBoost V6 in the Bronco Raptor from 2022. The ratings shown are on premium fuel.")],
  files=["verify_ford-bronco-1966-1996.json", "verify_ford-bronco-2021-2026.json"], merge_trims=True)

S["dakota"] = dict(make="Dodge", model="Dakota", makeSlug="dodge", slug="dakota",
  title="Dodge Dakota Engines by Year (1987–2011)",
  description="Every factory engine in the Dodge Dakota by year, 1987–2011: the 2.2 and 2.5 fours, 3.9 V6, 5.2 and 5.9 Magnum V8s, the Shelby and R/T, and the 3.7 and 4.7.",
  intro=["Dodge's midsize Dakota pickup ran from 1987 to 2011, sold as the Ram Dakota for its final year. It was the first midsize pickup offered with a V8.", PICK],
  generations=[
    G("gen1", "1987–1996", 1987, 1996, "The first Dakota used the 2.2 and 2.5 fours and the 3.9 V6, then the 5.2 V8 from 1991 and Magnum engines from 1992. The 1989 Shelby Dakota had a 5.2 V8."),
    G("gen2", "1997–2004", 1997, 2004, "The second Dakota offered the 2.5 four, the 3.9 V6, the 5.2 and, in the 1998–2003 R/T, the 5.9 V8, with the 4.7 V8 from 2000 and the 3.7 V6 for 2004."),
    G("gen3", "2005–2011", 2005, 2011, "The last Dakota used the 3.7 V6 and the 4.7 V8, with a high-output 4.7 through 2007.")],
  files=["verify_dodge-dakota-1987-2011.json"], merge_trims=True,
  family_overrides=[{"years": [2004, 2011], "cid": [226], "url": "/engines/ram/powertech"},
                    {"years": [1998, 2003], "cid": [360], "url": "/engines/ram/magnum"},
                    {"years": [1996, 2002], "cid": [150], "url": "/engines/jeep/amc-i4"}],
  ranges={"1990|153|None": [100, 117], "1991|153|None": [100, 117]})

S["j-series"] = dict(make="Jeep", model="J-Series", makeSlug="jeep", slug="j-series",
  title="Jeep J-Series Engines by Year (1972–1988)",
  description="Every factory engine in the Jeep J-series pickup by year, 1972–1988: AMC's 258 six and 304, 360 and 401 V8s in the J10 and J20 trucks.",
  intro=["The Jeep pickup sold as the Gladiator from 1963 was renamed the J-series for 1972 and built until 1988. The J10 was the half-ton; the heavier J20 always came with a V8. Jeep's truck literature stopped quoting horsepower after 1973, so most later years show no rating. The 1963–1971 trucks are on the Gladiator page.", PICK],
  generations=[G("amc", "1972–1988", 1972, 1988, "The J-series used AMC's 258 six (J10 only) and its 304, 360 and 401 V8s.")],
  files=["verify_jeep-jseries-1972-1988.json"], merge_trims=True, metric_from=1984)

S["comanche"] = dict(make="Jeep", model="Comanche", makeSlug="jeep", slug="comanche",
  title="Jeep Comanche Engines by Year (1986–1992)",
  description="Every factory engine in the Jeep Comanche pickup by year, 1986–1992: the AMC 2.5 four, the GM 2.8 V6, the Renault 2.1 turbodiesel and the 4.0 straight six.",
  intro=["The Comanche was a compact pickup built on the Cherokee XJ from 1986 to 1992.", PICK],
  generations=[G("mj", "MJ", 1986, 1992, "It shared the Cherokee's engines: the 2.5 four, a GM 2.8 V6 for 1986, a Renault 2.1 turbodiesel for 1986–1987, and the 4.0 six from 1987.")],
  files=["verify_jeep-comanche-1986-1992.json"], merge_trims=True)

S["ranger"] = dict(make="Ford", model="Ranger", makeSlug="ford", slug="ranger",
  title="Ford Ranger Engines by Year",
  description="Every factory engine in the Ford Ranger by year: Lima fours, Cologne and Vulcan V6s, the 4.0 V6s, two early diesels, the Ranger EV and the EcoBoost engines.",
  intro=["Ford sold the compact Ranger in the US from 1983 to 2011, then brought back a midsize Ranger for 2019. There was no US model for 2012–2018. The Mazda B-series twin is not included.", PICK],
  generations=[
    G("gen1", "1983–1992", 1983, 1992, "The first Ranger used the 2.0 and 2.3 Lima fours, the 2.8 and 2.9 Cologne V6s and two diesels: a Perkins 2.2 for 1983–1984 and a Mitsubishi 2.3 turbodiesel for 1985–1987. The 4.0 V6 arrived for 1990 and the 3.0 Vulcan V6 for 1991."),
    G("gen2", "1993–1997", 1993, 1997, "The 2.3 four, the 3.0 and the 4.0 V6."),
    G("gen3", "1998–2011", 1998, 2011, "The 2.5 four replaced the 2.3 for 1998, and the 2.3 Duratec four and the overhead-cam 4.0 V6 arrived for 2001. Ford also sold an electric Ranger EV for 1998–2001."),
    G("gen4", "2019–2023", 2019, 2023, "The returning Ranger used the 2.3 EcoBoost four."),
    G("gen5", "2024–2026", 2024, 2026, "The current Ranger adds the 2.7 EcoBoost V6, and the Ranger Raptor uses a 3.0 EcoBoost V6.")],
  files=["verify_ford-ranger-1983-2012.json", "verify_ford-ranger-2019-2026.json"], merge_trims=True,
  desc_strip=[r";.*$", r",\s*built by .*$", r"^\d\.\dL\s+"],
  family_overrides=[{"years": [1983, 1988], "cid": [122], "url": "/engines/ford/ford-122ci"},
                    {"years": [1991, 2008], "cid": [182], "url": "/engines/mercury/vulcan"}],
  no_link=[{"cid": 153, "years": [1998, 2001]}, {"cid": 134, "years": [1983, 1984]}])

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    v.setdefault("draft", True)
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
