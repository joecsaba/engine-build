# -*- coding: utf-8 -*-
# Curation specs for the nine models after the Camaro. Writes vspecs/<slug>.json.
import json, os, sys
SP = sys.argv[1]
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."

def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}

S = {}
S["chevelle"] = dict(make="Chevrolet", model="Chevelle", makeSlug="chevrolet", slug="chevelle",
  title="Chevrolet Chevelle Engines by Year (1964–1977)",
  description="Every factory engine in the Chevrolet Chevelle, Malibu and SS by year, 1964–1977: RPO codes and ratings from the 194 six to the LS6 454.",
  intro=["Chevrolet's mid-size Chevelle ran from 1964 to 1977 and carried everything from a 194 cubic-inch six to the 450 hp LS6 454.", PICK],
  generations=[
    G("gen1", "First generation", 1964, 1967, "The first Chevelle offered inline sixes and the 283 and 327 small blocks. The 396 big block arrived in 1965 in the Z16 Malibu SS 396 and became the SS 396 engine from 1966."),
    G("gen2", "Second generation", 1968, 1972, "The second-generation Chevelle went from a 140 hp six to the 450 hp LS6 454 in three years. The big blocks were tied to the SS: a separate SS 396 series in 1968, then an SS option package on the Malibu, 300 Deluxe coupe and El Camino from 1969.", "Horsepower is advertised gross through 1971 and SAE net for 1972, which is why the 1972 numbers look so much lower."),
    G("gen3", "Third generation", 1973, 1977, "The Colonnade Chevelle of 1973–1977 carried SAE net ratings and emissions equipment. The 454 lasted through 1975 and the 400 small block through 1976; by 1977 the list was down to the 250 six, the 305 and the 350.")],
  files=["verify_chevrolet-chevelle-1968-1972.json", "verify_chevelle-rest.json"],
  notes={"1965|396|375": "Z16 Malibu SS 396 package.",
         "1967|396|375": "Reinstated around April 1967.",
         "1969|427|425": "COPO 9562 special order, not in the regular order guide.",
         "1970|402|330": "Badged as a 396; displaces 402 cubic inches.",
         "1970|402|350": "Badged as a 396; displaces 402 cubic inches.",
         "1970|402|375": "Badged as a 396; displaces 402 cubic inches.",
         "1971|402|300": "Badged as a 396; displaces 402 cubic inches.",
         "1975|454|215": "Down from 235 hp in 1974."})

S["bel-air"] = dict(make="Chevrolet", model="Bel Air", makeSlug="chevrolet", slug="bel-air",
  title="Chevrolet Bel Air Engines by Year (1950–1975)",
  description="Every factory engine in the Chevrolet Bel Air by year, 1950–1975: Stovebolt sixes, the 265 and 283, the 348 and 409, and the big blocks.",
  intro=["The Bel Air name ran on Chevrolet's US full-size cars from 1950 to 1975. It began as the hardtop of the Styleline De Luxe, became Chevrolet's top series in 1953, and from 1959 sat below the Impala.", PICK],
  generations=[
    G("1950-1954", "Stovebolt years", 1950, 1954, "Before 1955 every Chevrolet had an inline six: the 216 with a manual transmission and the 235 with the Powerglide automatic, until the 235 became the only engine in 1953."),
    G("tri-five", "Tri-Five", 1955, 1957, "The Tri-Five Chevrolets introduced the small-block V8. It arrived in 1955 as a 265, gained dual four-barrels in 1956 and grew to 283 cubic inches in 1957, when Ramjet fuel injection made 283 hp.", "Every engine below was available in all three series, the 150, 210 and Bel Air, including the Nomad wagon."),
    G("1958-1964", "1958–1964", 1958, 1964, "The longer, lower 1958 car added the 348 W-series V8 above the 283, and the 409 followed in 1961."),
    G("1965-1970", "1965–1970", 1965, 1970, "From 1965 the full-size Chevrolet offered big-block V8s alongside the six and the small blocks."),
    G("1971-1975", "1971–1975", 1971, 1975, "The last US Bel Airs were Chevrolet's lowest-priced full-size series. Ratings are SAE net from 1972, and from 1974 the base engine was a 350 V8; no six was offered.")],
  files=["verify_chevrolet-tri-five-1955-1957.json", "verify_bel-air.json"],
  family_overrides=[{"years": [1950, 1952], "cid": [216], "url": "/engines/chevrolet/chevrolet-216ci"}],
  notes={"1957|283|250": "Ramjet fuel injection.", "1957|283|283": "Ramjet fuel injection."})

S["mustang"] = dict(make="Ford", model="Mustang", makeSlug="ford", slug="mustang",
  title="Ford Mustang Engines by Year (1964½–2026)",
  description="Every factory engine in the Ford Mustang by year, 1964½–2026: sixes, the K-code 289, Boss and Cobra Jet V8s, the 5.0 HO, Coyote and Voodoo.",
  intro=["Ford has built the Mustang without a break since April 1964. Over seven generations it has carried inline sixes and fours, a turbocharged 2.3, V6s, and V8s from the 260 to the supercharged 5.2 Predator.", PICK],
  generations=[
    G("gen1", "First generation", 1964, 1973, "The Mustang launched in April 1964 with a 170 six and a 260 V8, and by 1968 it offered a 428. By 1969–1971 the list ran to the Boss 302, the Boss 429 and the 428 and 429 Cobra Jets.", "Ford changed engines in the middle of model years several times, most notably the 260-to-289 switch in 1964 and the 428 Cobra Jet's arrival on April 1, 1968. The notes mark each one."),
    G("mustang-ii", "Mustang II", 1974, 1978, "The smaller Mustang II dropped the V8 for 1974, offering a 2.3 four and a 2.8 V6; the 302 returned in 1975. Published ratings from these years vary, so several are shown as ranges."),
    G("fox", "Fox body", 1979, 1993, "The Fox-body Mustang brought the turbocharged 2.3, offered in 1979–1980 and again in the 1984–1986 SVO, and the 5.0 High Output V8, fuel-injected from 1986."),
    G("sn95", "SN95", 1994, 2004, "The 1994 redesign kept the 5.0 for two years before the 4.6 modular V8 took over in 1996, with a four-cam version in the SVT Cobra."),
    G("s197", "S197", 2005, 2014, "The 2005 Mustang used a 4.0 V6 and a three-valve 4.6 V8. The 2011 update brought the 3.7 V6 and the 5.0 Coyote. Shelby GT500s used supercharged 5.4 and, for 2013–2014, 5.8 V8s."),
    G("s550", "S550", 2015, 2023, "The S550 added the 2.3 EcoBoost turbo four, the flat-plane-crank 5.2 Voodoo in the Shelby GT350, and the supercharged 5.2 Predator in the 2020–2022 GT500."),
    G("s650", "S650", 2024, 2026, "The current car offers the 2.3 EcoBoost and the 5.0 Coyote, including the 500 hp Dark Horse, and the supercharged 5.2 in the GTD.")],
  files=["verify_ford-mustang-1965-1968.json", "verify_mustang-1969-1993.json", "verify_mustang-1994-2026.json"],
  family_overrides=[{"years": [2011, 2026], "cid": [302, 307], "url": "/engines/ford/coyote"}],
  cid_fix={"2004|238|193": 237},
  ranges={"1972|250|99": [95, 99], "1975|140|87": [83, 88], "1975|171|97": [97, 105], "1975|302|129": [122, 140],
          "1976|171|100": [100, 105], "1976|302|133": [133, 140], "1977|140|88": [88, 93], "1977|171|93": [93, 104],
          "1977|302|134": [122, 137], "1978|171|90": [90, 104], "1978|302|139": [134, 139], "1980|140|132": [132, 150],
          "1982|140|86": [86, 88], "1983|140|88": [88, 90], "1983|232|112": [105, 112]},
  notes={"1964|289|271": "Available from June 1964.",
         "1968|302|210": "Replaced the 289 two-barrel partway through the year.",
         "1968|390|280": "Automatic only. Added during the 1968 model year.",
         "1968|428|335": "Cobra Jet, introduced April 1, 1968.",
         "1985|302|180": "Rated 165 hp until November 1984."})

S["torino"] = dict(make="Ford", model="Torino", makeSlug="ford", slug="torino",
  title="Ford Torino Engines by Year (1968–1976)",
  description="Every factory engine in the Ford Torino, Torino GT, Cobra and Gran Torino by year, 1968–1976: the 302 and 351, 390, 428 and 429 Cobra Jets, and the 460.",
  intro=["Ford's intermediate went from FE big blocks to the 385-series 429 and 460 in its nine years. The Fairlane shared the Torino's engines through 1970 and is included in those years' tables.", PICK],
  generations=[
    G("1968-1971", "1968–1971", 1968, 1971, "The 428 Cobra Jet was standard in the 1969 Cobra, and for 1970 the 429 came in Thunder Jet, Cobra Jet and Super Cobra Jet form."),
    G("1972-1976", "1972–1976", 1972, 1976, "The 1972 redesign put the Torino on a separate frame. Ratings from 1972 are SAE net. The 351 Cobra Jet lasted through 1974, and the 460 was offered from 1974.")],
  files=["verify_ford-torino-1968-1971.json", "verify_torino-1972-1976.json"],
  ranges={"1973|250|92": [88, 92], "1974|460|220": [215, 220]},
  notes={})

S["gto"] = dict(make="Pontiac", model="GTO", makeSlug="pontiac", slug="gto",
  title="Pontiac GTO Engines by Year, 1964–2006",
  description="Every factory engine in the Pontiac GTO by year: the 389 Tri-Power, Ram Air 400s and 455 H.O. from 1964–1974, and the LS1 and LS2 of 2004–2006.",
  intro=["The GTO started in 1964 as an option package on the Tempest LeMans, became its own series in 1966 and was built until 1974. Pontiac revived the name for 2004–2006 on a Holden-built coupe with GM's LS V8s.", PICK],
  generations=[
    G("1964-1967", "1964–1967", 1964, 1967, "The first GTOs used the 389 with a four-barrel or three two-barrel Tri-Power carburetors. The 1967 GTO replaced the 389 with the 400 and dropped Tri-Power for a single four-barrel."),
    G("1968-1972", "1968–1972", 1968, 1972, "The 1968 GTO brought Ram Air 400s, which reached the Ram Air IV in 1969, and a 455 from 1970. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1974", "1973–1974", 1973, 1974, "The 1973 GTO was an option on the Colonnade LeMans with a 400 or 455. For 1974 it moved to the compact Ventura with a 350."),
    G("2004-2006", "2004–2006", 2004, 2006, "The revived GTO used the 5.7L LS1 in 2004 and the 6.0L LS2 in 2005–2006.")],
  files=["verify_pontiac-gto-1964-1967.json", "verify_gto-rest.json"],
  require_trim={"verify_pontiac-gto-1964-1967.json": "GTO"},
  notes={"1968|400|366": "Ram Air II, added partway through 1968. Also published as 360 hp.",
         "1969|400|265": "Two-barrel economy 400."})

S["firebird"] = dict(make="Pontiac", model="Firebird", makeSlug="pontiac", slug="firebird",
  title="Pontiac Firebird Engines by Year (1967–2002)",
  description="Every factory engine in the Pontiac Firebird and Trans Am by year, 1967–2002: OHC six, Ram Air and Super Duty 455, 301 Turbo, TPI, LT1 and LS1.",
  intro=["Pontiac built the Firebird from 1967 to 2002 alongside the Camaro. Until 1976 it used Pontiac's own engines. From 1977 many came from Chevrolet, Buick and Oldsmobile, and the notes say which division built each one.", PICK],
  generations=[
    G("gen1", "First generation", 1967, 1969, "Pontiac's version of the Camaro started with an overhead-cam inline six that no other American maker offered. The V8s ran from the 326 (350 from 1968) up to the 400, which went through three Ram Air versions by 1969."),
    G("gen2", "Second generation", 1970, 1981, "The second generation went from the 1970 Ram Air IV to the 1973–1974 Super Duty 455 and, from 1977, a mix of Pontiac, Oldsmobile, Chevrolet and Buick engines. The 1980–1981 Turbo Trans Am used a turbocharged 301."),
    G("gen3", "Third generation", 1982, 1992, "The third generation offered the Iron Duke four, Chevrolet V6s and 305 and 350 V8s, with Tuned Port Injection from 1985, and the 1989 Turbo Trans Am's 3.8 turbo V6."),
    G("gen4", "Fourth generation", 1993, 2002, "The fourth generation used the LT1 350 until 1997 and the aluminum LS1 from 1998, with WS6 Ram Air versions, plus Chevrolet and Buick V6s. SLP Firehawk conversions were dealer-installed and are not listed.")],
  files=["verify_pontiac-firebird-1967-1969.json", "verify_firebird-1970-2002.json"],
  built_by_notes=True, own_division="^Pontiac",
  include=["1970|400|345"],
  ranges={"1979|231|115": [105, 115], "1979|305|125": [125, 135], "1979|350|165": [160, 170], "1982|173|102": [102, 105],
          "1983|151|92": [90, 92], "1984|151|92": [90, 92], "1985|305|155": [155, 160], "1987|305|170": [155, 170]},
  notes={"1970|400|345": "Ram Air IV.",
         "1980|301|210": "Turbocharged.", "1981|301|200": "Turbocharged.",
         "1989|231|250": "Turbocharged 3.8, assembled by PAS Inc. under contract to Pontiac."})

S["charger"] = dict(make="Dodge", model="Charger", makeSlug="dodge", slug="charger",
  title="Dodge Charger Engines by Year (1966–2026)",
  description="Every factory engine in the Dodge Charger by year, 1966–2026: the 426 Hemi and 440 Six Pack, the Shelby Charger 2.2, Hemi V8s, Hellcats and the Hurricane six.",
  intro=["Dodge has used the Charger name on four different cars: the 1966–1978 coupes, a front-drive hatchback in 1982–1987, the four-door sedan of 2006–2023, and the current car, sold as the electric Daytona and the Hurricane-powered Sixpack.", PICK],
  generations=[
    G("1966-1967", "1966–1967", 1966, 1967, "The first Charger was a fastback Coronet with V8s only, from the 318 to the 426 Hemi. The 440 Magnum arrived for 1967."),
    G("1968-1970", "1968–1970", 1968, 1970, "The second-generation Charger ran from a 225 slant six to the 426 Hemi. The R/T came with the 440 Magnum as standard and the Hemi as its only option. The 1969 Charger 500 and Daytona, built for NASCAR, used the same 440 and Hemi.", "The 440 Six Pack joined the Charger R/T for 1970."),
    G("1971-1978", "1971–1978", 1971, 1978, "The 1971 redesign kept the Hemi and the 440 Six Pack for one more year. Ratings are SAE net from 1972, and from 1975 the Charger was a personal-luxury coupe sharing the Chrysler Cordoba's body."),
    G("1982-1987", "1982–1987", 1982, 1987, "The front-drive Charger used Chrysler's 2.2 and a 1.6 four, with the turbocharged 2.2 in the Shelby Charger from 1985 and the 175 hp Turbo II in the 1987 Shelby Charger GLHS."),
    G("2006-2023", "2006–2023", 2006, 2023, "The sedan offered V6s, the 5.7, 6.1 and 6.4 Hemi V8s, and from 2015 the supercharged 6.2 Hellcat, which reached 807 hp in the 2023 Redeye Jailbreak."),
    G("2024-2026", "2024–2026", 2024, 2026, "The current Charger launched as the Daytona EV for 2024. The Sixpack, with the 3.0 Hurricane twin-turbo inline six, followed for 2026.")],
  files=["verify_dodge-charger-1968-1970.json", "verify_charger-classic.json", "verify_charger-modern.json"],
  ranges={"1976|400|175": [170, 175], "1977|318|145": [135, 145], "1977|400|190": [190, 195], "2008|167|190": [178, 190]},
  notes={"1968|225|145": "Added partway through the 1968 model year.",
         "1969|440|375": "Also used in the 1969 Charger 500 and Charger Daytona.",
         "1969|426|425": "Also used in the 1969 Charger 500 and Charger Daytona.",
         "2006|167|190": "Fleet sales only in 2006.",
         "2015|376|707": "Supercharged Hellcat."})

S["barracuda"] = dict(make="Plymouth", model="Barracuda", makeSlug="plymouth", slug="barracuda",
  title="Plymouth Barracuda Engines by Year (1964–1974)",
  description="Every factory engine in the Plymouth Barracuda and 'Cuda by year, 1964–1974: slant sixes, the Commando 273, 340, 383, 440 and 426 Hemi.",
  intro=["Plymouth built the Barracuda for eleven model years, starting as a fastback Valiant in 1964 and ending as the E-body 'Cuda in 1974.", PICK],
  generations=[
    G("1964-1966", "1964–1966", 1964, 1966, "The first Barracuda used the Valiant's slant sixes and the 273 V8, with the four-barrel Commando 273 from 1965."),
    G("1967-1969", "1967–1969", 1967, 1969, "The 1967 redesign made room for the 383 big block. The 340 arrived in 1968, and a 'Cuda package added the 440 partway through 1969. Hurst built a small run of Hemi Barracudas for Super Stock racing in 1968."),
    G("1970-1974", "1970–1974", 1970, 1974, "The E-body Barracuda split its engines by model. The Barracuda and Gran Coupe ran from the slant six to the 383; the 'Cuda started at the 383 four-barrel and offered the 440 and 426 Hemi. The 1970 AAR 'Cuda had its own 340 with three two-barrel carburetors.", "Ratings are advertised gross for 1970–1971 and SAE net from 1972, after the big blocks were gone.")],
  files=["verify_barracuda-1964-1969.json", "verify_plymouth-barracuda-1970-1974.json"],
  names={"1968|426|425": "426 Hemi, Hurst-built BO29 Super Stock"},
  notes={"1969|440|375": "Added partway through 1969. Automatic only.",
         "1970|340|290": "AAR 'Cuda, with three two-barrel carburetors."})

S["road-runner"] = dict(make="Plymouth", model="Road Runner", makeSlug="plymouth", slug="road-runner",
  title="Plymouth Road Runner Engines (1968–1980)",
  description="Every factory engine in the Plymouth Road Runner by year, 1968–1980: the 383, the 440 Six Barrel and 426 Hemi, then the 340, 400 and Volaré-era 318 and 360.",
  intro=["The Road Runner began in 1968 as a low-priced B-body muscle car and ended in 1980 as an appearance and performance package on the compact Volaré.", PICK],
  generations=[
    G("1968-1970", "1968–1970", 1968, 1970, "The first Road Runner was built to a price, so its engine list was short: a 383 rated at 335 hp as standard and the 426 Hemi as the option. The 440 with three two-barrels (the A12 package) arrived partway through 1969, and the 1970 Superbird was the only Road Runner offered with the four-barrel 440."),
    G("1971-1974", "1971–1974", 1971, 1974, "The 1971 redesign kept the Hemi and the 440 Six Barrel for one year. The standard engine was a 400 in 1972 and a 318 in 1973 and 1974, with 340, 360, 400 and 440 options. Ratings are SAE net from 1972."),
    G("1975", "1975", 1975, 1975, "For 1975 the Road Runner moved to the larger Fury body."),
    G("1976-1980", "1976–1980", 1976, 1980, "From 1976 the Road Runner was a package on the Volaré coupe with the 318 and 360. The 225 slant six joined in 1979, and the 360 was gone for 1980.")],
  files=["verify_plymouth-road-runner-1968-1970.json", "verify_road-runner-1971-1980.json"],
  notes={"1971|440|385": "Six Barrel, three two-barrel carburetors.",
         "1978|318|155": "California four-barrel."})

# Independent third sources found in a follow-up pass (third_source_found.json).
SLUG = {"Chevrolet Bel Air": "bel-air", "Chevrolet Chevelle": "chevelle", "Pontiac Firebird": "firebird"}
tp = os.path.join(SP, "third_source_found.json")
if os.path.exists(tp):
    for x in json.load(open(tp, encoding="utf-8")):
        if "source" in x and x["model"] in SLUG:
            S[SLUG[x["model"]]].setdefault("add_sources", {}).setdefault(f'{x["year"]}|{x["cid"]}|{x["hp"]}', []).append(x["source"])

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    v.pop("draft", None)  # approved 2026-10-12
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(S))
