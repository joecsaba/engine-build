# -*- coding: utf-8 -*-
# Curation specs for batch 5 (most-searched models, 2026-10-13). Writes vspecs/<slug>.json, draft until approved.
# Public copy must not mention sources.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."
def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}
S = {}
CODES = [r"^(\w{1,4}-?\w{1,4}(-\w{1,4})?)\b"]  # keep Toyota-style codes as the code

S["4runner"] = dict(metric_from=1900, make="Toyota", model="4Runner", makeSlug="toyota", slug="4runner",
  title="Toyota 4Runner Engines by Year (1984–2026)",
  description="Every factory engine in the Toyota 4Runner by year, 1984–2026: the 22R fours, 3VZ and 5VZ V6s, the 4.0 V6 and 4.7 V8, and the turbo four and hybrid of the newest model.",
  intro=["Toyota's 4Runner began in 1984 as a pickup-based SUV and is now in its sixth generation. The engine codes Toyota uses (22R-E, 5VZ-FE, 1GR-FE) are shown with each engine.", PICK],
  generations=[
    G("gen1", "1984–1989", 1984, 1989, "The first 4Runner used the 22R four, fuel-injected as the 22R-E from 1985 and turbocharged as the 22R-TE for 1986–1987, and the 3.0 3VZ-E V6 from 1988."),
    G("gen2", "1990–1995", 1990, 1995, "The 22R-E four and the 3VZ-E V6."),
    G("gen3", "1996–2002", 1996, 2002, "The 2.7 3RZ-FE four and the 3.4 5VZ-FE V6."),
    G("gen4", "2003–2009", 2003, 2009, "The 4.0 1GR-FE V6 and the 4.7 2UZ-FE V8. The 2006 ratings are lower because of a change in the SAE test, not the engines."),
    G("gen5", "2010–2024", 2010, 2024, "The 1GR-FE V6, with a 2.7 four in 2010 two-wheel-drive models."),
    G("gen6", "2025–2026", 2025, 2026, "The current 4Runner uses a 2.4 turbo four, alone or as the i-FORCE MAX hybrid. The hybrid's rating is the combined output of engine and motor.")],
  files=["verify_toyota-4runner-1984-2026.json"], merge_trims=True)

S["tacoma"] = dict(metric_from=1900, make="Toyota", model="Tacoma", makeSlug="toyota", slug="tacoma",
  title="Toyota Tacoma Engines by Year (1995–2026)",
  description="Every factory engine in the Toyota Tacoma by year, 1995–2026: the 2.4 and 2.7 fours, the 3.4, 4.0 and 3.5 V6s, and the 2.4 turbo and i-FORCE MAX hybrid.",
  intro=["The Tacoma replaced Toyota's compact pickup in the US for 1995 and is now in its fourth generation.", PICK],
  generations=[
    G("gen1", "1995–2004", 1995, 2004, "The 2.4 2RZ-FE and 2.7 3RZ-FE fours and the 3.4 5VZ-FE V6."),
    G("gen2", "2005–2015", 2005, 2015, "The 2.7 2TR-FE four and the 4.0 1GR-FE V6; ratings from 2006 reflect a change in the SAE test."),
    G("gen3", "2016–2023", 2016, 2023, "The 2TR-FE four and the 3.5 2GR-FKS V6."),
    G("gen4", "2024–2026", 2024, 2026, "The 2.4 turbo four in two outputs and the i-FORCE MAX hybrid, rated for the combined output of engine and motor.")],
  files=["verify_toyota-tacoma-1995-2026.json"], merge_trims=True)

S["supra"] = dict(metric_from=1900, make="Toyota", model="Supra", makeSlug="toyota", slug="supra",
  title="Toyota Supra Engines by Year",
  description="Every factory engine in the Toyota Supra by year: the 4M-E and 5M sixes, the 7M-GE and 7M-GTE, the 2JZ-GE and twin-turbo 2JZ-GTE, and the BMW-built engines of the GR Supra.",
  intro=["The Supra began as the Celica Supra in 1979, became its own model in 1986, left the US after 1998 and returned as the GR Supra for 2020.", PICK],
  generations=[
    G("a40", "A40 Celica Supra", 1979, 1981, "The first Celica Supra used the 4M-E and then 5M-E inline sixes."),
    G("a60", "A60 Celica Supra", 1982, 1986, "The twin-cam 5M-GE six."),
    G("a70", "A70", 1986, 1992, "The 3.0 7M-GE and the turbocharged 7M-GTE; the A70 arrived partway through 1986."),
    G("a80", "A80", 1993, 1998, "The 3.0 2JZ-GE and the sequential twin-turbo 2JZ-GTE."),
    G("a90", "A90 GR Supra", 2020, 2026, "The GR Supra uses BMW's B58 3.0 turbo six and, for 2021–2024, the B48 2.0 turbo four.")],
  files=["verify_toyota-supra-1979-2026.json"], merge_trims=True)

S["toyota-pickup"] = dict(metric_from=1900, make="Toyota", model="Pickup", makeSlug="toyota", slug="pickup",
  title="Toyota Pickup Engines by Year (1964–1995)",
  description="Every factory engine in the US Toyota compact pickup by year, 1964–1995: the Stout's 3R, the 8R, 18R, 20R and 22R fours, the 3.0 V6, and the L and 2L diesels.",
  intro=["Toyota sold its compact pickup in the US as the Stout from 1964 and the Hi-Lux, later simply the Toyota Truck or Pickup, from 1969 until the Tacoma replaced it for 1995.", PICK],
  generations=[
    G("stout", "Stout", 1964, 1969, "The Stout used the 1.9 3R four."),
    G("gen1", "1969–1972", 1969, 1972, "The first Hi-Lux used the 1.9 8R-C four."),
    G("gen2", "1973–1978", 1973, 1978, "The 2.0 18R-C and then the 2.2 20R."),
    G("gen3", "1979–1983", 1979, 1983, "The 20R and, from 1981, the 2.4 22R and a 2.2 diesel."),
    G("gen4", "1984–1988", 1984, 1988, "The 22R, fuel-injected 22R-E and turbocharged 22R-TE, the 2L and 2L-T diesels, and the 3.0 V6 from 1988."),
    G("gen5", "1989–1995", 1989, 1995, "The 22R-E four and the 3VZ-E V6.")],
  files=["verify_toyota-pickup-1964-1995.json"], merge_trims=True)

S["land-cruiser"] = dict(metric_from=1900, make="Toyota", model="Land Cruiser", makeSlug="toyota", slug="land-cruiser",
  title="Toyota Land Cruiser Engines by Year",
  description="Every factory engine in the US Toyota Land Cruiser by year: the F and 2F sixes of the FJ40 and FJ60, the 3F-E and 1FZ-FE, the 4.7 and 5.7 V8s, and the 2024+ hybrid.",
  intro=["Toyota has sold the Land Cruiser in the US since 1958, from the FJ40 to the 250 series that returned for 2024 after a two-year gap. Only engines sold new in the US are listed.", PICK],
  generations=[
    G("j20-j40", "FJ25 / FJ40", 1958, 1983, "The early Land Cruisers used Toyota's F inline six, replaced by the 2F in 1975."),
    G("j60", "FJ60 / FJ62", 1981, 1990, "The 2F and, from 1988, the fuel-injected 3F-E."),
    G("j80", "80 series", 1991, 1997, "The 3F-E and, from 1993, the 4.5 1FZ-FE twin-cam six."),
    G("j100", "100 series", 1998, 2007, "The 4.7 2UZ-FE V8."),
    G("j200", "200 series", 2008, 2021, "The 5.7 3UR-FE V8."),
    G("j250", "250 series", 2024, 2026, "The i-FORCE MAX hybrid, rated for the combined output of the 2.4 turbo four and motor.")],
  files=["verify_toyota-land-cruiser-1958-2026.json"], merge_trims=True)

S["super-duty"] = dict(make="Ford", model="Super Duty", makeSlug="ford", slug="super-duty",
  title="Ford Super Duty Engines by Year (1999–2026)",
  description="Every factory engine in the Ford F-250 and F-350 Super Duty by year, 1999–2026: Triton V8s and the V10, the 7.3, 6.0, 6.4 and 6.7 Power Stroke diesels, and the 7.3 Godzilla.",
  intro=["Ford split its heavy-duty pickups from the F-150 for 1999 as the F-250 and F-350 Super Duty. This page covers both; earlier F-250s have their own page.", PICK],
  generations=[
    G("gen1", "1999–2007", 1999, 2007, "The 5.4 Triton V8, the 6.8 V10, the 7.3 Power Stroke and, from 2003, the 6.0 Power Stroke."),
    G("gen2", "2008–2010", 2008, 2010, "The 5.4, the 6.8 V10 and the 6.4 Power Stroke."),
    G("gen3", "2011–2016", 2011, 2016, "The 6.2 gasoline V8 and the 6.7 Power Stroke, Ford's own diesel."),
    G("gen4", "2017–2022", 2017, 2022, "The 6.2 and 6.7, with the 7.3 Godzilla gasoline V8 from 2020."),
    G("gen5", "2023–2026", 2023, 2026, "The 6.8 and 7.3 gasoline V8s and the 6.7 Power Stroke in standard and high-output form.")],
  files=["verify_ford-super-duty-1999-2026.json"], merge_trims=True,
  include=["2024|406|475", "2025|406|475", "2025|406|500"])

S["f-250"] = dict(make="Ford", model="F-250", makeSlug="ford", slug="f-250",
  title="Ford F-250 Engines by Year (1953–1997)",
  description="Every factory engine in the Ford F-250 three-quarter-ton pickup by year, 1953–1997: sixes, Y-block and FE V8s, the 460, the IDI diesels and the first Power Stroke.",
  intro=["The F-250 was Ford's three-quarter-ton pickup from 1953 until the Super Duty replaced it; the last old-body F-250 Heavy Duty was a 1997 model. Later F-250s are on the Super Duty page.", PICK],
  generations=[
    G("gen2", "1953–1956", 1953, 1956, "Sixes, the 239 flathead and then Y-block V8s."),
    G("gen3", "1957–1960", 1957, 1960, "The 223 six and the 272 and 292 Y-blocks."),
    G("gen4", "1961–1966", 1961, 1966, "The 223 and 262 sixes and the 292, then the 240 and 300 sixes and the FE 352."),
    G("gen5", "1967–1972", 1967, 1972, "The 240 and 300 sixes and the FE 360 and 390. Ratings are SAE net from 1972."),
    G("gen6", "1973–1979", 1973, 1979, "The 300 six, FE 360 and 390, 351M, 400 and 460."),
    G("gen7", "1980–1986", 1980, 1986, "The 300 six, 302, 351 and 460 V8s and, from 1983, the International 6.9 diesel."),
    G("gen8", "1987–1991", 1987, 1991, "Fuel-injected gasoline engines and the 7.3 IDI diesel."),
    G("gen9", "1992–1997", 1992, 1997, "The 4.9, 5.0, 5.8 and 7.5 gasoline engines, the IDI diesels and, from mid-1994, the 7.3 Power Stroke.")],
  files=["verify_ford-f250-1953-1998.json"], merge_trims=True,
  # the International 7.3 IDI is not the Power Stroke; it has no page yet
  no_link=[{"cid": 444, "years": [1988, 1994], "match": "IDI|^7\\.3L diesel"}])

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    v.setdefault("draft", True)
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
