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

S["4runner"] = dict(family_overrides=[{"years": [1995, 2004], "cid": [164], "url": "/engines/toyota/rz"}, {"years": [2005, 2026], "cid": [164], "url": "/engines/toyota/tr"}], metric_from=1900, make="Toyota", model="4Runner", makeSlug="toyota", slug="4runner",
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

S["tacoma"] = dict(family_overrides=[{"years": [1995, 2004], "cid": [164], "url": "/engines/toyota/rz"}, {"years": [2005, 2026], "cid": [164], "url": "/engines/toyota/tr"}], metric_from=1900, make="Toyota", model="Tacoma", makeSlug="toyota", slug="tacoma",
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

S["land-cruiser"] = dict(no_link=[{"cid": 241, "years": [1988, 1992], "match": "3F"}], metric_from=1900, make="Toyota", model="Land Cruiser", makeSlug="toyota", slug="land-cruiser",
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

S["jimmy"] = dict(family_overrides=[{"years": [1970, 1991], "cid": [307], "url": "/engines/chevrolet/chevrolet-307ci"}, {"years": [1970, 1991], "cid": [350], "url": "/engines/chevrolet/chevrolet-350ci"}, {"years": [1970, 1991], "cid": [400], "url": "/engines/chevrolet/chevrolet-400ci"}], make="GMC", model="Jimmy", makeSlug="gmc", slug="jimmy",
  title="GMC Jimmy Engines by Year (1970–2005)",
  description="Every factory engine in the GMC Jimmy by year: the full-size K5 Jimmy's sixes, V8s and 6.2 diesel, and the compact S-15 Jimmy's fours, V6s and Typhoon turbo.",
  intro=["GMC used the Jimmy name on two SUVs: the full-size K5 Jimmy of 1970–1991, GMC's version of the K5 Blazer, and the compact S-15 Jimmy of 1983–2005, GMC's version of the S-10 Blazer. The 1992–1993 Typhoon was a turbocharged all-wheel-drive Jimmy.", PICK],
  generations=[
    G("k5", "Full-size K5 Jimmy", 1970, 1991, "The full-size Jimmy shared Chevrolet's 250 six, small-block V8s and 400, the 6.2 diesel from 1982, and the 5.7 to the end. Ratings are SAE net from 1972."),
    G("s15", "S-15 Jimmy", 1983, 1994, "The compact Jimmy used GM's 2.0 and 2.5 fours and 2.8 and 4.3 V6s; the 1992–1993 Typhoon had a turbocharged 4.3."),
    G("gmt330", "1995–2005", 1995, 2005, "The redesigned compact Jimmy used the 4.3 Vortec V6.")],
  files=["verify_gmc-jimmy-1970-2005.json"], merge_trims=True)

S["silverado-hd"] = dict(cid_fix={"2020|403|401": 401, "2021|403|401": 401, "2022|403|401": 401, "2023|403|401": 401, "2024|403|401": 401, "2025|403|401": 401, "2026|403|401": 401}, make="Chevrolet", model="Silverado HD", makeSlug="chevrolet", slug="silverado-hd",
  title="Chevrolet Silverado HD Engines by Year",
  description="Every factory engine in the Chevrolet Silverado 2500HD and 3500HD by year, 1999–2026: Vortec 6.0 and 8.1 V8s, every Duramax diesel from LB7 to L5P, and the 6.6 gas V8.",
  intro=["Chevrolet's heavy-duty Silverado pickups, the 2500HD and 3500HD, arrived with the 2001 GMT800 trucks; the 1999–2000 light-duty Silverado 2500 is included. The 3500 shares the 2500's engines, sometimes at lower ratings for the heaviest models.", PICK],
  generations=[
    G("gmt800", "GMT800", 1999, 2007, "The 6.0 and 8.1 Vortec V8s and the Duramax diesel: the LB7, then the LLY for 2004.5–2005 and the LBZ from 2006."),
    G("gmt900", "GMT900", 2008, 2014, "The 6.0 V8 and the LMM and then LML Duramax."),
    G("k2xx", "K2XX", 2015, 2019, "The 6.0 V8 and the LML, then the L5P Duramax from 2017."),
    G("t1", "T1", 2020, 2026, "The 6.6 gasoline V8 and the L5P Duramax, uprated for 2024.")],
  files=["verify_chevrolet-silverado-hd-1999-2026.json"], merge_trims=True,
  exclude={k: "1999-2000 C/K HD carry-over, not a Silverado" for k in ["1999|350|255", "1999|454|290", "1999|395|195", "2000|350|255", "2000|454|290", "2000|395|195"]})

S["rx-7"] = dict(make="Mazda", model="RX-7", makeSlug="mazda", slug="rx-7", metric_from=1900,
  title="Mazda RX-7 Engines by Year (1979–1995)",
  description="Every factory engine in the US Mazda RX-7 by year, 1979–1995: the 12A and 13B two-rotor rotaries, the Turbo II and the sequential twin-turbo 13B-REW of the third generation.",
  intro=["Mazda sold the RX-7 in the US from 1979 to 1995, always with a two-rotor Wankel rotary engine. Rotary displacement is quoted for both rotors. There was no official 1992 US model.", PICK],
  generations=[
    G("fb", "First generation (FB)", 1979, 1985, "The 1.1 12A rotary, with the fuel-injected 1.3 13B in the 1984–1985 GSL-SE."),
    G("fc", "Second generation (FC)", 1986, 1991, "The 13B, naturally aspirated and as the turbocharged Turbo II from 1987."),
    G("fd", "Third generation (FD)", 1993, 1995, "The 13B-REW with sequential twin turbochargers.")],
  files=["verify_mazda-rx7-1979-2002.json"], merge_trims=True, force_layout=[2, "two-rotor rotary"])

# Batch 5 wave C (import tuners) and the GM SUVs; appended to make_specs5.py's S
S["miata"] = dict(family_overrides=[{"years": [2016, 2026], "cid": [122], "url": "/engines/mazda/skyactiv-g"}], default_layout=[4, "inline-four"], make="Mazda", model="MX-5 Miata", makeSlug="mazda", slug="miata", metric_from=1900,
  title="Mazda Miata Engines by Year (1990–2026)",
  description="Every factory engine in the US Mazda MX-5 Miata by year, 1990–2026: the 1.6 and 1.8 B-series fours, the Mazdaspeed turbo, and the 2.0 MZR and Skyactiv-G.",
  intro=["Mazda's two-seat roadster has been sold in the US since 1990, always with a four-cylinder engine. There was no 1998 US model; the second generation arrived as a 1999.", PICK],
  generations=[
    G("na", "First generation (NA)", 1990, 1997, "The 1.6 B6-ZE, then the 1.8 BP-ZE from 1994."),
    G("nb", "Second generation (NB)", 1999, 2005, "The 1.8 BP, with variable valve timing from 2001 and the turbocharged Mazdaspeed in 2004–2005."),
    G("nc", "Third generation (NC)", 2006, 2015, "The 2.0 LF-VE; automatics were rated lower."),
    G("nd", "Fourth generation (ND)", 2016, 2026, "The 2.0 Skyactiv-G, revised for 2019 with a higher redline.")],
  files=["verify_mazda-miata-1990-2026.json"], merge_trims=True)

S["integra"] = dict(family_overrides=[{"years": [1986, 1989], "cid": [97], "url": "/engines/acura/honda-d-series"}], default_layout=[4, "inline-four"], make="Acura", model="Integra", makeSlug="acura", slug="integra", metric_from=1900,
  title="Acura Integra Engines by Year (1986–2026)",
  description="Every factory engine in the Acura Integra by year: the D16 and B-series fours of 1986–2001, the GS-R and Type R VTEC engines, and the 2023-on turbos.",
  intro=["The Integra was one of Acura's two launch models in 1986. It was replaced by the RSX for 2002 and the name returned for 2023.", PICK],
  generations=[
    G("da", "First generation", 1986, 1989, "The 1.6 D16A1 twin-cam four."),
    G("db1", "Second generation", 1990, 1993, "The 1.8 B18A1, with the 1.7 B17A1 VTEC in the 1992–1993 GS-R."),
    G("dc", "Third generation", 1994, 2001, "The 1.8 B18B1, the B18C1 VTEC in the GS-R and the B18C5 in the Type R. There was no 1999 US Type R."),
    G("db8", "Fifth generation", 2023, 2026, "The 1.5 turbo, and the 2.0 turbo in the Type S from 2024.")],
  files=["verify_acura-integra-1986-2026.json"], merge_trims=True)

S["wrx"] = dict(family_overrides=[{"years": [2015, 2021], "cid": [122], "url": "/engines/subaru/fa"}], default_layout=[4, "flat-four"], make="Subaru", model="WRX", makeSlug="subaru", slug="wrx", metric_from=1900,
  title="Subaru WRX Engines by Year (2002–2026)",
  description="Every factory engine in the US Subaru WRX and WRX STI by year, 2002–2026: the EJ205, EJ255 and EJ257 turbo boxers, the FA20DIT and the 2.4 FA24DIT.",
  intro=["Subaru brought the turbocharged Impreza WRX to the US for 2002 and the STI for 2004. Every engine is a turbocharged flat four. The STI ended after 2021.", PICK],
  generations=[
    G("gd", "Impreza WRX (GD/GG)", 2002, 2007, "The 2.0 EJ205, the 2.5 EJ255 from 2006, and the EJ257 in the STI."),
    G("gr", "Impreza WRX (GR/GV)", 2008, 2014, "The EJ255 and, in the STI, the EJ257."),
    G("va", "WRX (VA)", 2015, 2021, "The 2.0 FA20DIT and the EJ257 in the STI, including the limited Type RA and S209."),
    G("vb", "WRX (VB)", 2022, 2026, "The 2.4 FA24DIT; there is no STI.")],
  files=["verify_subaru-wrx-2002-2026.json"], merge_trims=True)

S["eclipse"] = dict(cid_remap={"231": 233, "144": 145}, no_link=[{"cid": 122, "years": [1995, 1999], "match": "420A"}], default_layout=[4, "inline-four"], make="Mitsubishi", model="Eclipse", makeSlug="mitsubishi", slug="eclipse", metric_from=1900,
  title="Mitsubishi Eclipse Engines by Year (1990–2012)",
  description="Every factory engine in the Mitsubishi Eclipse by year, 1990–2012: the 4G63 turbo and other fours, the Chrysler 420A, and the 3.0 and 3.8 V6s.",
  intro=["The Eclipse was built in Illinois from 1990 to 2012. The first two generations shared their engines with the Plymouth Laser and Eagle Talon.", PICK],
  generations=[
    G("1g", "First generation", 1990, 1994, "The 1.8 4G37, the 2.0 4G63 and the 4G63 turbo, also in the all-wheel-drive GSX."),
    G("2g", "Second generation", 1995, 1999, "The Chrysler 2.0 420A, the 4G63 turbo, and the 2.4 4G64 in the Spyder GS."),
    G("3g", "Third generation", 2000, 2005, "The 2.4 4G64 and the 3.0 6G72 V6."),
    G("4g", "Fourth generation", 2006, 2012, "The 2.4 4G69 and the 3.8 6G75 V6.")],
  files=["verify_mitsubishi-eclipse-1990-2012.json"], merge_trims=True)

S["240sx"] = dict(default_layout=[4, "inline-four"], make="Nissan", model="240SX", makeSlug="nissan", slug="240sx", metric_from=1900,
  title="Nissan 240SX Engines by Year (1989–1998)",
  description="Every factory engine in the Nissan 240SX by year, 1989–1998: the single-cam KA24E and the twin-cam KA24DE 2.4 fours. The SR20DET was never sold in a US car.",
  intro=["Nissan sold the rear-drive 240SX in the US from 1989 to 1998. Every US car had a 2.4 KA24 four; the turbocharged SR20DET was a Japan-market engine.", PICK],
  generations=[
    G("s13", "S13", 1989, 1994, "The single-cam KA24E, then the twin-cam KA24DE from 1991."),
    G("s14", "S14", 1995, 1998, "The KA24DE.")],
  files=["verify_nissan-240sx-1989-1998.json"], merge_trims=True)

S["z"] = dict(family_overrides=[{"years": [1984, 1996], "cid": [181], "url": "/engines/infiniti/vg"}, {"years": [2023, 2026], "cid": [183], "url": "/engines/infiniti/vr"}], make="Nissan", model="Z", makeSlug="nissan", slug="z", metric_from=1900,
  title="Nissan Z Engines by Year (1970–2026)",
  description="Every factory engine in the Datsun and Nissan Z cars by year, from the 240Z's L24 six through the 300ZX, 350Z and 370Z V6s to today's twin-turbo Z.",
  intro=["Datsun's 240Z arrived in 1970, and the line continued as the 260Z, 280Z, 280ZX, 300ZX, 350Z, 370Z and, from 2023, the Z. There were no US models for 1997–2002, 2021 or 2022.", PICK],
  generations=[
    G("s30", "240Z, 260Z, 280Z (S30)", 1970, 1978, "The L-series straight sixes: the 2.4 L24, the 2.6 L26 and the fuel-injected 2.8 L28E."),
    G("s130", "280ZX (S130)", 1979, 1983, "The L28E and, from 1981, the turbocharged L28ET."),
    G("z31", "300ZX (Z31)", 1984, 1989, "The 3.0 VG30E V6 and the VG30ET turbo."),
    G("z32", "300ZX (Z32)", 1990, 1996, "The twin-cam VG30DE and the twin-turbo VG30DETT."),
    G("z33", "350Z (Z33)", 2003, 2009, "The 3.5 VQ35DE, the higher-revving Rev-Up version and the VQ35HR."),
    G("z34", "370Z (Z34)", 2009, 2020, "The 3.7 VQ37VHR, and a stronger version in the NISMO."),
    G("rz34", "Z (RZ34)", 2023, 2026, "The 3.0 VR30DDTT twin-turbo V6, uprated in the NISMO.")],
  files=["verify_nissan-z-1970-2026.json"], merge_trims=True)

S["tahoe"] = dict(make="Chevrolet", model="Tahoe", makeSlug="chevrolet", slug="tahoe",
  title="Chevrolet Tahoe Engines by Year (1995–2026)",
  description="Every factory engine in the Chevrolet Tahoe by year, 1995–2026: the 5.7 V8 and 6.5 diesel, the Vortec and EcoTec3 V8s, the hybrid and the 3.0 Duramax.",
  intro=["Chevrolet renamed the full-size two-door Blazer the Tahoe for 1995 and added a four-door that year. Yukon-only engines are not listed.", PICK],
  generations=[
    G("gmt400", "GMT400", 1995, 1999, "The 5.7 V8, TBI in 1995 and Vortec from 1996, and the 6.5 turbodiesel in the two-door 4WD."),
    G("gmt800", "GMT800", 2000, 2006, "The 4.8 and 5.3 Vortec V8s, with a FlexFuel 5.3 from 2002."),
    G("gmt900", "GMT900", 2007, 2014, "The 4.8, 5.3 and 6.2 V8s and the 6.0 two-mode hybrid."),
    G("k2xx", "K2XX", 2015, 2020, "The 5.3 EcoTec3 V8, with the 6.2 in the RST from 2018."),
    G("t1", "T1", 2021, 2026, "The 5.3 and 6.2 V8s and the 3.0 Duramax inline-six diesel.")],
  files=["verify_chevrolet-tahoe-1995-2026.json"], merge_trims=True)

S["suburban"] = dict(make="Chevrolet", model="Suburban", makeSlug="chevrolet", slug="suburban",
  title="Chevrolet Suburban Engines by Year (1960–2026)",
  description="Every factory engine in the Chevrolet Suburban by year, 1960–2026: sixes, small and big block V8s, the 6.2 and 6.5 diesels, Vortec V8s and the Duramax.",
  intro=["The Suburban is the longest-running nameplate in American motoring. Through 1991 this page lists the half-ton Suburban; from 1992 it lists the 1500 and 2500, with 2500-only engines marked. Heavier half-ton Suburbans from about 1975 carried heavy-duty emissions ratings that differ from the pickups.", PICK],
  generations=[
    G("1960-1966", "1960–1966", 1960, 1966, "The 235, 230 and 250 sixes, the 292 six from 1963, and the 283 and 327 V8s."),
    G("1967-1972", "1967–1972", 1967, 1972, "The sixes and the 283, 307, 327, 350, 396 and 402 V8s."),
    G("1973-1991", "1973–1991", 1973, 1991, "The 250 six, the 305, 350, 400 and 454 V8s, and the 6.2 diesel from 1982."),
    G("gmt400", "GMT400", 1992, 1999, "The 5.7 and 7.4 V8s and the 6.5 turbodiesel."),
    G("gmt800", "GMT800", 2000, 2006, "The 5.3, 6.0 and 8.1 Vortec V8s."),
    G("gmt900", "GMT900", 2007, 2014, "The 5.3 and 6.0 V8s."),
    G("k2xx", "K2XX", 2015, 2020, "The 5.3 EcoTec3 V8 and the 6.2 from 2018."),
    G("t1", "T1", 2021, 2026, "The 5.3 and 6.2 V8s and the 3.0 Duramax diesel.")],
  files=["verify_chevrolet-suburban-1960-1991.json", "verify_chevrolet-suburban-1992-2026.json"], merge_trims=True)

S["civic"] = dict(no_link=[{"cid": 82, "years": [1980, 1987]}, {"cid": 82, "years": [2003, 2011], "match": "LDA"},
    {"cid": 110, "years": [2006, 2015], "match": "R18|CNG"}, {"cid": 122, "years": [2025, 2026], "match": "LFC"}],
  family_overrides=[{"years": [1994, 2000], "cid": [97], "match": "B16", "url": "/engines/acura/honda-b-series"},
    {"years": [1988, 2000], "cid": [91], "match": r"\bD15", "url": "/engines/honda/d-series"},
    {"years": [2001, 2005], "cid": [102], "match": r"\bD17", "url": "/engines/honda/d-series"},
    {"years": [2002, 2026], "cid": [122, 144], "match": r"\bK2", "url": "/engines/honda/k-series"}], default_layout=[4, "inline-four"], make="Honda", model="Civic", makeSlug="honda", slug="civic", metric_from=1900,
  title="Honda Civic Engines by Year (1973–2026)",
  description="Every factory engine in the US Honda Civic by year, 1973–2026: the CVCC fours, the D-series, the VTEC engines of the Si and Type R, the hybrids and turbos.",
  intro=["Honda brought the Civic to the US for 1973. Every Civic engine has been a four-cylinder; hybrid ratings are for engine and motor combined. The del Sol, sold as a Civic through 1995, is included.", PICK],
  generations=[
    G("gen1", "First generation", 1973, 1979, "The 1.2 EB and, from 1975, the 1.5 CVCC stratified-charge engine."),
    G("gen2", "Second generation", 1980, 1983, "The 1.3 and 1.5 CVCC engines."),
    G("gen3", "Third generation", 1984, 1987, "The 1.3 and 1.5 CVCC engines, the CRX HF and the fuel-injected Si."),
    G("gen4", "Fourth generation", 1988, 1991, "The 1.5 D15B engines and the 1.6 D16A6 in the Si."),
    G("gen5", "Fifth generation", 1992, 1995, "The D15 and D16 engines, the lean-burn VX, and the B16A3 VTEC in the del Sol."),
    G("gen6", "Sixth generation", 1996, 2000, "The D16Y engines, the CNG GX and the B16A2 in the 1999–2000 Si."),
    G("gen7", "Seventh generation", 2001, 2005, "The 1.7 D17 engines, the K20A3 in the Si hatchback and the first Civic Hybrid."),
    G("gen8", "Eighth generation", 2006, 2011, "The 1.8 R18 and the 2.0 K20Z3 in the Si."),
    G("gen9", "Ninth generation", 2012, 2015, "The 1.8 R18, the 2.4 K24 in the Si and the 1.5 Hybrid."),
    G("gen10", "Tenth generation", 2016, 2021, "The 2.0 K20C2, the 1.5 turbo, and the 2.0 turbo K20C1 in the Type R from 2017."),
    G("gen11", "Eleventh generation", 2022, 2026, "The 2.0 and 1.5 turbo, the Si and Type R, and the two-motor hybrid from 2025.")],
  files=["verify_honda-civic-1973-2000.json", "verify_honda-civic-2001-2026.json"], merge_trims=True,
  desc_strip=[r"\s*\(code disputed\)", r"\s*\(?D15A3 stamp 1987\)?"])

S["ram-hd"] = dict(desc_strip=[r"\s*'BGE'"], make="Ram", model="2500 and 3500", makeSlug="ram", slug="2500-3500",
  title="Ram 2500 and 3500 Engines by Year (1994–2026)",
  description="Every factory engine in the Dodge and Ram 2500 and 3500 pickups by year, 1994–2026: Magnum V8s and the V10, the 5.7 and 6.4 Hemis, and the 5.9 and 6.7 Cummins.",
  intro=["Dodge's heavy-duty Ram 2500 and 3500 arrived with the 1994 redesign; they have been Rams since the 2011 model year. Chassis-cab ratings are not listed. The 5.2 V8 was offered only in the light-duty 2500.", PICK],
  generations=[
    G("gen2", "1994–2002", 1994, 2002, "The 5.2 and 5.9 Magnum V8s, the 8.0 V10, and the 5.9 Cummins: 12-valve to 1998, then the 24-valve."),
    G("gen3", "2003–2009", 2003, 2009, "The 5.7 Hemi, the 8.0 V10 for 2003, and the common-rail 5.9 Cummins, replaced by the 6.7 in 2007."),
    G("gen4", "2010–2018", 2010, 2018, "The 5.7 Hemi, the 6.4 Hemi from 2014, and the 6.7 Cummins in standard and High Output tunes."),
    G("gen5", "2019–2026", 2019, 2026, "The 6.4 Hemi and the 6.7 Cummins; from 2025 the High Output is the only diesel.")],
  files=["verify_ram-hd-1994-2026.json"], merge_trims=True,
  family_overrides=[{"years": [1994, 2003], "cid": [360], "url": "/engines/ram/magnum"}])

S["sierra"] = dict(family_overrides=[{"years": [1988, 1995], "cid": [350], "url": "/engines/chevrolet/chevrolet-350ci"}], make="GMC", model="Sierra 1500", makeSlug="gmc", slug="sierra",
  title="GMC Sierra 1500 Engines by Year (1988–2026)",
  description="Every factory engine in the GMC Sierra 1500 by year, 1988–2026: the 4.3 V6, small block, Vortec and EcoTec3 V8s, diesels, the 2.7 turbo and the Sierra EV.",
  intro=["GMC's half-ton pickup took the Sierra name with the 1988 redesign. When a new generation arrived, the previous truck stayed on sale for a time as the Sierra Classic or Sierra Limited; the trims column marks those years.", PICK],
  generations=[
    G("gmt400", "GMT400", 1988, 1998, "The 4.3 V6, the 5.0 and 5.7 V8s, the 6.2 diesel and, from 1994, the 6.5 diesel; Vortec engines from 1996."),
    G("gmt800", "GMT800", 1999, 2007, "The 4.3 V6, the 4.8, 5.3 and 6.0 Vortec V8s, the Denali's 6.0, and a hybrid from 2004."),
    G("gmt900", "GMT900", 2007, 2013, "The 4.3 V6, the 4.8, 5.3 and 6.2 V8s, and the two-mode hybrid."),
    G("k2xx", "K2XX", 2014, 2018, "The 4.3 V6 and the 5.3 and 6.2 EcoTec3 V8s, with eAssist from 2016."),
    G("t1", "T1", 2019, 2026, "The 2.7 turbo four, the 5.3 and 6.2 V8s, the 3.0 Duramax diesel and, from 2024, the electric Sierra EV.")],
  files=["verify_gmc-sierra-1988-2026.json"], merge_trims=True)

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    pass  # batch 5 published 2026-10-13; new models must set draft=True themselves
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
