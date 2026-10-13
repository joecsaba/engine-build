# -*- coding: utf-8 -*-
# Curation specs for batches 2 and 3. Writes vspecs/<slug>.json (draft until approved).
# Public copy must not mention sources; notes say "Also published as..." rather than naming them.
import json, os, sys
SP = sys.argv[1]
ONLY = sys.argv[2:]  # optional: build only these slugs
PICK = "Pick a year to see every engine offered that model year, with its code, rated horsepower and the trims it came in. Each engine links to its full specs."

def G(key, name, a, b, *intro): return {"key": key, "name": name, "years": [a, b], "intro": list(intro)}

S = {}

S["corvette"] = dict(make="Chevrolet", model="Corvette", makeSlug="chevrolet", slug="corvette",
  title="Chevrolet Corvette Engines by Year (1953–2026)",
  description="Every factory engine in the Chevrolet Corvette by year, 1953–2026: the Blue Flame six, fuelie small blocks, 427 big blocks, LT1, LS and LT V8s.",
  intro=["The Corvette has been built in eight generations since 1953. It started with an inline six and has carried a V8 since 1955: fuel-injected small blocks, big-block 427s and 454s, the LT1 and LS families, and today's mid-engine LT2, LT6 and twin-turbo LT7.", PICK],
  generations=[
    G("c1", "C1", 1953, 1962, "The first Corvettes used the Blue Flame inline six. The 265 V8 arrived in 1955, and from 1957 the 283 could be ordered with Ramjet mechanical fuel injection, rated at one horsepower per cubic inch in its top form."),
    G("c2", "C2 Sting Ray", 1963, 1967, "The Sting Ray offered the 327 in several ratings, including the fuel-injected L84 through 1965, the 396 big block for 1965, and from 1966 the 427, which reached 435 hp with three two-barrel carburetors."),
    G("c3", "C3", 1968, 1982, "The C3 carried big blocks through 1974: the 427 until 1969 and the 454 from 1970. Ratings are SAE net from 1972. The 1980 California car used a 305, and the 1982 model introduced Cross-Fire Injection."),
    G("c4", "C4", 1984, 1996, "There was no 1983 production Corvette. The C4 used Cross-Fire Injection for 1984, Tuned Port Injection from 1985 and the second-generation LT1 from 1992. The ZR-1's four-cam LT5, built by Mercury Marine, ran from 1990 to 1995, and the 1996 Grand Sport used the 330 hp LT4."),
    G("c5", "C5", 1997, 2004, "The C5 introduced the aluminum LS1. The Z06 used the higher-output LS6 from 2001."),
    G("c6", "C6", 2005, 2013, "The C6 started with the 6.0L LS2, switched to the 6.2L LS3 in 2008, and added the 7.0L LS7 in the Z06 and the supercharged LS9 in the 2009–2013 ZR1."),
    G("c7", "C7", 2014, 2019, "The C7 used the direct-injected LT1, the supercharged LT4 in the Z06 from 2015, and the 755 hp supercharged LT5 in the 2019 ZR1."),
    G("c8", "C8", 2020, 2026, "The mid-engine C8 uses the LT2. The Z06 adds the flat-plane-crank LT6, the E-Ray pairs the LT2 with an electric front axle, and the ZR1 and ZR1X use the twin-turbocharged LT7.")],
  files=["verify_corvette-1953-1982.json", "verify_corvette-1984-2026.json"],
  cid_remap={"336": 333},
  notes={"1957|283|283": "Ramjet fuel injection.", "1957|283|250": "Ramjet fuel injection.",
         "1960|283|275": "Ramjet fuel injection. Also published as 250 hp.",
         "1960|283|315": "Ramjet fuel injection. Also published as 290 hp.",
         "2019|376|755": "Supercharged. ZR1 only."},
  trim_notes={r"E-Ray": "E-Ray adds a 160 hp electric motor driving the front wheels; 655 hp combined.",
              r"ZR1X": "ZR1X adds a front electric motor; 1,250 hp combined."},
  code_notes={"LT5": "Four-cam, 32-valve. ZR-1 only.", "L88": "Rated 430 hp; built for racing.",
              "ZL1": "All-aluminum 427."})

S["nova"] = dict(make="Chevrolet", model="Nova", makeSlug="chevrolet", slug="nova",
  title="Chevrolet Nova Engines by Year (1962–1988)",
  description="Every factory engine in the Chevy II and Nova by year, 1962–1988: the 153 four and sixes, the 283 and 327, the L79, SS 350 and 396, and the Toyota-built 1.6.",
  intro=["Chevrolet sold its compact as the Chevy II from 1962 and as the Nova from 1969, when the trim name became the model name, through 1979. The name returned for 1985–1988 on a front-drive car built with Toyota.", PICK],
  generations=[
    G("1962-1967", "Chevy II", 1962, 1967, "The first Chevy II offered a four and a six. Chevrolet added V8s in 1964, and the 327 followed in 1965, reaching 350 hp in the 1966 L79."),
    G("1968-1979", "1968–1979", 1968, 1979, "The 1968 redesign made room for the 396 big block, offered in the Nova SS through 1970, when it displaced 402 cubic inches. Ratings are SAE net from 1972, and the last Novas offered the 250 six, the 305 and the 350."),
    G("1985-1988", "1985–1988", 1985, 1988, "The front-drive Nova was built in California by NUMMI, a GM–Toyota joint venture, with Toyota's 1.6 four. The 1988 Twin Cam used a 16-valve version.")],
  files=["verify_nova.json"],
  notes={"1970|402|350": "Badged as a 396; displaces 402 cubic inches.",
         "1970|402|375": "Badged as a 396; displaces 402 cubic inches.",
         "1988|97|110": "Twin Cam, 16 valves.",
         "1970|350|360": "Ordered by Yenko Chevrolet through Central Office Production Order (COPO) 9010; 175 built."},
  # Factory COPO, like the Camaro COPOs; third and fourth sources in yenko_deuce_sources.json.
  include=["1970|350|360"],
  codes={"1970|350|360": "LT1"}, trims={"1970|350|360": ["Yenko Deuce"]},
  add_sources={"1970|350|360": [
    {"name": "Yenko Supercar Registry (yenko.net) - April 2001 Feature Car", "url": "https://www.yenko.net/features/2001/April2001.htm", "says": "COPO 9010/9737 Novas with the 360 hp LT-1; 175 built"},
    {"name": "Wikipedia - Chevrolet LT-1", "url": "https://en.wikipedia.org/wiki/Chevrolet_LT-1", "says": "LT-1 350/360 offered in the 1970 Nova via COPO for Yenko"}]})

S["impala"] = dict(make="Chevrolet", model="Impala", makeSlug="chevrolet", slug="impala",
  title="Chevrolet Impala Engines by Year (1958–2020)",
  description="Every factory engine in the Chevrolet Impala by year, 1958–2020: the 348 and 409, 327, 396, 427 and 454 V8s, the LT1 Impala SS, and the front-drive V6s.",
  intro=["The Impala began in 1958 as the top Bel Air and became Chevrolet's best-selling full-size car. It was built through 1985, revived as the rear-drive Impala SS for 1994–1996, and returned as a front-drive sedan from 2000 to 2020.", PICK],
  generations=[
    G("1958-1964", "1958–1964", 1958, 1964, "The early Impala offered the 348 W-series V8 and, from 1961, the 409. The 1963 Z11 427 was a factory drag-racing package."),
    G("1965-1970", "1965–1970", 1965, 1970, "Big blocks took over from the 409 during 1965: the 396 and, from 1966, the 427."),
    G("1971-1976", "1971–1976", 1971, 1976, "Ratings are SAE net from 1972. The 454 stayed available through 1976."),
    G("1977-1985", "1977–1985", 1977, 1985, "The downsized 1977 Impala ran from the 250 six to the 350, with V6s and an Oldsmobile-built 5.7 diesel in the early 1980s, and Chevrolet's 4.3 V6 for 1985."),
    G("1994-1996", "Impala SS", 1994, 1996, "The Impala SS used the 5.7 LT1 V8, rated at 260 hp, in the Caprice body."),
    G("2000-2020", "2000–2020", 2000, 2020, "The front-drive Impala used GM's 60-degree V6s, a supercharged 3800 in the 2004–2005 SS, a 5.3 V8 in the 2006–2009 SS, and from 2012 the 3.6 V6, with a 2.5 four from 2014.")],
  files=["verify_impala-1958-1985.json", "verify_impala-modern.json"],
  cid_remap={"152": 150},
  code_notes={"LF9": "Oldsmobile-built diesel.", "Z11": "Factory drag-racing package."})

S["challenger"] = dict(make="Dodge", model="Challenger", makeSlug="dodge", slug="challenger",
  title="Dodge Challenger Engines by Year (1970–2023)",
  description="Every factory engine in the Dodge Challenger by year, 1970–2023: the 340 Six Pack, 440 and 426 Hemi, Mitsubishi fours, and Hemi, Hellcat and Demon V8s.",
  intro=["Dodge has sold three different Challengers: the 1970–1974 pony car, a 1978–1983 compact coupe built by Mitsubishi, and the 2008–2023 modern car, which ended with the 1,025 hp Demon 170.", PICK],
  generations=[
    G("1970-1974", "1970–1974", 1970, 1974, "The first Challenger shared the Plymouth Barracuda's body and engines, from the 225 slant six to the 426 Hemi. The 1970 Challenger T/A used a 340 with three two-barrel carburetors. Ratings are SAE net from 1972, after the big blocks were gone."),
    G("1978-1983", "1978–1983", 1978, 1983, "The second Challenger was a Mitsubishi-built coupe with Mitsubishi 1.6 and 2.6 four-cylinder engines."),
    G("2008-2023", "2008–2023", 2008, 2023, "The modern Challenger ran from V6s through the 5.7, 6.1 and 6.4 Hemi V8s to the supercharged 6.2 Hellcat family, which ended with the 807 hp Jailbreak. The 2018 Demon and 2023 Demon 170 were limited-production drag-oriented models whose top ratings need race fuel or E85.")],
  files=["verify_challenger.json"],
  cid_remap={"98": 97},
  ranges={"1982|156|105": [100, 105], "1983|156|105": [103, 105]},
  notes={"1970|340|290": "Challenger T/A, three two-barrel carburetors."},
  trim_notes={r"Demon 170": "Rated on E85 fuel.", r"Demon": "Rated on 100-octane fuel; 808 hp on 91 octane."})

S["cutlass"] = dict(make="Oldsmobile", model="Cutlass", makeSlug="oldsmobile", slug="cutlass",
  title="Oldsmobile Cutlass Engines by Year (1961–1999)",
  description="Every factory engine in the Oldsmobile Cutlass, 442 and Cutlass Supreme by year, 1961–1999: the Jetfire turbo, the 400 and 455 W-30, Olds V8s and V6s.",
  intro=["The Cutlass name ran on Oldsmobile's compact and mid-size cars from 1961 to 1999, and covered the 442, the Hurst/Olds and several later front-drive lines. The 442 began as an option package and was a separate model for 1968–1971; the trims column shows which engines it got.", PICK],
  generations=[
    G("1961-1963", "1961–1963", 1961, 1963, "The first F-85 and Cutlass used Oldsmobile's aluminum 215 V8, and the 1962–1963 Jetfire added a turbocharger."),
    G("1964-1972", "1964–1972", 1964, 1972, "From 1964 the Cutlass used Oldsmobile's cast-iron V8s: the 330, then the 350, with the 400 in the 442 and, from 1968, the 455. The W-30 package was the top 442 engine. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1977", "1973–1977", 1973, 1977, "The Colonnade Cutlass carried SAE net ratings and Oldsmobile's 260, 350 and 455, with the 403 arriving for 1977."),
    G("1978-1987", "1978–1987", 1978, 1987, "The downsized rear-drive Cutlass Supreme, Salon, Calais and Cruiser used Buick V6s, Oldsmobile's 260, 307 and 350 V8s, and Oldsmobile diesels; the 1985–1987 4-4-2 used a 307. The front-drive Cutlass Ciera arrived in 1982 and the Cutlass Calais in 1985."),
    G("1988-1999", "1988–1999", 1988, 1999, "The front-drive Cutlass Supreme replaced the rear-drive car after 1988. The Ciera, Calais and the 1997–1999 Cutlass used GM fours and V6s, including Oldsmobile's Quad 4.")],
  files=["verify_cutlass-1961-1977.json", "verify_cutlass-1978-1999.json"],
  include=["1982|260|100"],
  ranges={"1964|330|230": [210, 230], "1969|400|360": [350, 360], "1979|260|105": [105, 110], "1980|260|105": [105, 110],
          "1980|307|155": [148, 155], "1982|231|110": [110, 115], "1982|307|140": [140, 155], "1986|173|125": [125, 130]},
  notes={"1962|215|215": "Jetfire, turbocharged.", "1963|215|215": "Jetfire, turbocharged.",
         "1982|307|140": "Cruiser wagon only. Published ratings for this engine vary."},
  code_notes={"W-30": "W-30 package.", "LF9": "Diesel.", "LT7": "V6 diesel."})

S["skylark"] = dict(make="Buick", model="Skylark", makeSlug="buick", slug="skylark",
  title="Buick Skylark Engines by Year (1953–1998)",
  description="Every factory engine in the Buick Skylark and Gran Sport by year, 1953–1998: the Nailhead, aluminum 215, GS 400 and 455 Stage 1, and later V6s and fours.",
  intro=["Buick used the Skylark name on a 1953–1954 luxury convertible, on its compact and mid-size cars from 1961 to 1972, and on smaller Buicks through 1998. The Gran Sport, a Skylark-based performance model, carried Buick's largest engines; the trims column shows which ones.", PICK],
  generations=[
    G("1953-1954", "1953–1954", 1953, 1954, "The original Skylark was a limited-production convertible with Buick's 322 Nailhead V8."),
    G("1961-1963", "1961–1963", 1961, 1963, "The compact Skylark used Buick's aluminum 215 V8."),
    G("1964-1972", "1964–1972", 1964, 1972, "The mid-size Skylark moved to cast-iron V8s: the 300, 340 and 350, with the 401 Nailhead, 400 and 455 reserved for the Gran Sport. The 455 Stage 1 was the top engine from 1970. Ratings are gross through 1971 and SAE net from 1972."),
    G("1975-1979", "1975–1979", 1975, 1979, "The compact rear-drive Skylark used Buick's 231 V6 and V8s built by Buick, Oldsmobile, Pontiac and Chevrolet; the notes say which."),
    G("1980-1998", "1980–1998", 1980, 1998, "From 1980 the Skylark was front-drive, with GM fours and V6s: the 2.5, the 2.8, Buick's 3.0 and 3.3, Oldsmobile's Quad 4 and 2.4, and the 3100.")],
  files=["verify_skylark-1953-1972.json", "verify_skylark-1975-1998.json"],
  built_by_notes=True, own_division="^Buick",
  ranges={"1969|400|345": [340, 350], "1972|350|155": [145, 155], "1972|350|180": [175, 180]},
  notes={"1969|400|345": "Stage 1. Published ratings for this engine vary."})

S["regal"] = dict(make="Buick", model="Regal", makeSlug="buick", slug="regal",
  title="Buick Regal Engines by Year (1973–2020)",
  description="Every factory engine in the Buick Regal by year, 1973–2020: the 3.8 turbo V6 of the Grand National and GNX, Buick and Olds V8s, the supercharged GS and 2.0T.",
  intro=["Buick sold the Regal as a mid-size rear-drive car from 1973 to 1987, as a front-drive car from 1988 to 2004, and as a European-developed sedan and wagon from 2011 to 2020. Its best-known engine is the turbocharged 3.8 V6 of the Grand National and GNX.", PICK],
  generations=[
    G("1973-1977", "1973–1977", 1973, 1977, "The first Regal used Buick's 350 and 455 V8s and, from 1975, the 231 V6."),
    G("1978-1987", "1978–1987", 1978, 1987, "The downsized Regal introduced Buick's turbocharged 3.8 V6 in 1978. It gained sequential fuel injection in 1984 and an intercooler in 1986, reaching 245 hp in the 1987 Grand National and 276 hp in the GNX, which ASC/McLaren finished for Buick."),
    G("1988-2004", "1988–2004", 1988, 2004, "The front-drive Regal used the 2.8 and 3.1 V6s and the 3800, supercharged in the GS from 1997."),
    G("2011-2020", "2011–2020", 2011, 2020, "The last Regals used 2.4 and turbocharged 2.0 fours and, in the 2018–2020 GS, a 3.6 V6.")],
  files=["verify_regal.json"],
  cid_fix={"2018|220|310": 217, "2019|220|310": 217, "2020|220|310": 217},
  include=["1979|305|155"],
  ranges={"1999|231|200": [195, 200]},
  trim_notes={r"GNX": "Finished by ASC/McLaren for Buick."},
  code_notes={"LF9": "Oldsmobile-built diesel.", "LT7": "Oldsmobile-built V6 diesel."})

S["monte-carlo"] = dict(make="Chevrolet", model="Monte Carlo", makeSlug="chevrolet", slug="monte-carlo",
  title="Chevrolet Monte Carlo Engines (1970–2007)",
  description="Every factory engine in the Chevrolet Monte Carlo by year: the SS 454 of 1970–71, small blocks, the 1983–88 SS H.O. 305, V6s and the 2006–07 SS 5.3 V8.",
  intro=["Chevrolet built the Monte Carlo as a rear-drive personal luxury coupe from 1970 to 1988 and as a front-drive coupe from 1995 to 2007. The SS name marked its performance versions: a 454 in 1970–1971, a high-output 305 in 1983–1988 and a 5.3 V8 in 2006–2007.", PICK],
  generations=[
    G("1970-1972", "1970–1972", 1970, 1972, "The first Monte Carlo shared the Chevelle's engines, from the 350 to the 402 big block badged as a 396, with the 454 in the SS. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1977", "1973–1977", 1973, 1977, "The Colonnade Monte Carlo offered the 350, 400 and 454, with the 454 available through 1975 and the 305 arriving for 1976."),
    G("1978-1988", "1978–1988", 1978, 1988, "The downsized Monte Carlo added V6s, including a turbocharged 3.8 in 1980–1981, and Oldsmobile-built diesels in the early 1980s. From 1983 the SS used a high-output 305."),
    G("1995-2007", "1995–2007", 1995, 2007, "The front-drive Monte Carlo used GM's 60-degree V6s and the 3800, supercharged in the 2004–2005 SS, and a 5.3 V8 in the 2006–2007 SS.")],
  files=["verify_monte-carlo.json"],
  notes={"1970|402|330": "Badged as a 396; displaces 402 cubic inches.",
         "1971|402|300": "Badged as a 396; displaces 402 cubic inches.",
         "1972|402|240": "Badged as a 396; displaces 402 cubic inches."},
  code_notes={"LF9": "Oldsmobile-built diesel.", "LT6": "Oldsmobile-built V6 diesel.", "LC8": "Turbocharged.",
              "L69": "High-output four-barrel 305."})

S["gtx"] = dict(make="Plymouth", model="GTX", makeSlug="plymouth", slug="gtx",
  title="Plymouth GTX Engines by Year (1967–1971)",
  description="Every factory engine in the Plymouth GTX by year, 1967–1971: the 440 Super Commando standard engine, the 440 Six Barrel and the 426 Street Hemi.",
  intro=["The GTX was Plymouth's premium mid-size muscle car, with a 440 as its standard engine and the 426 Street Hemi as the option. It was its own model from 1967 to 1971; from 1972 the GTX name continued as a 440 package on the Road Runner, listed on the Road Runner page.", PICK],
  generations=[
    G("1967-1971", "1967–1971", 1967, 1971, "Every GTX came with a big block. The 440 Six Barrel, with three two-barrel carburetors, joined the list for 1970. The 1971 ratings are gross, with net figures in the notes where published.")],
  files=["verify_gtx.json"],
  exclude={"1972|440|280": "1972 Road Runner GTX package; on the Road Runner page",
           "1972|440|330": "1972 Road Runner GTX package; on the Road Runner page"},
  notes={"1971|440|370": "305 hp net.", "1971|440|385": "Six Barrel. 330 hp net.", "1971|426|425": "350 hp net.",
         "1970|440|390": "Six Barrel, three two-barrel carburetors."})

S["coronet"] = dict(make="Dodge", model="Coronet", makeSlug="dodge", slug="coronet",
  title="Dodge Coronet Engines by Year (1949–1976)",
  description="Every factory engine in the Dodge Coronet and Super Bee by year: 1950s Hemi and poly-head V8s, then the 383 Magnum, 440 Six Pack and 426 Hemi of 1965–1976.",
  intro=["Dodge used the Coronet name on its full-size cars from 1949 to 1959 and on its mid-size cars from 1965 to 1976. The Super Bee (1968–1970) and R/T were Coronet models, and the trims column marks the engines only they got.", PICK],
  generations=[
    G("1949-1959", "1949–1959", 1949, 1959, "The early Coronet used Dodge's 230 flathead six and, from 1953, V8s. The 1953–1954 241 was the Red Ram Hemi. From 1955 Dodge built Hemi-head versions and lower-cost poly-head versions of its V8s, and from 1958 it added wedge-head B engines. The D-500 packages were Dodge's performance engines."),
    G("1965-1970", "1965–1970", 1965, 1970, "The mid-size Coronet ran from the slant six to the 426 Street Hemi. The R/T came with the 440 Magnum, the Super Bee with the 383 Magnum, and the 440 Six Pack arrived during 1969. Ratings are gross."),
    G("1971-1976", "1971–1976", 1971, 1976, "The last Coronets were mainly sedans and wagons, with the slant six, 318, 360 and 400. Ratings are SAE net from 1972.")],
  files=["verify_coronet.json"],
  notes={"1969|440|390": "Six Pack, three two-barrel carburetors. Added during 1969.",
         "1970|440|390": "Six Pack, three two-barrel carburetors."})

S["dart"] = dict(make="Dodge", model="Dart", makeSlug="dodge", slug="dart",
  title="Dodge Dart Engines by Year (1960–2016)",
  description="Every factory engine in the Dodge Dart by year: 1960–62 big-block Darts, the slant six, 273, 340, 383 and 440 GTS of the compact Dart, and the 2013–16 fours.",
  intro=["Dodge used the Dart name on its full-size cars in 1960–1962, on its compact from 1963 to 1976, and on a front-drive compact from 2013 to 2016. The compact Dart ran from the slant six to the 340, 383 and 440 in the GTS and Swinger 340.", PICK],
  generations=[
    G("1960-1962", "1960–1962", 1960, 1962, "The first Darts were full-size Dodges with the 225 slant six, the 318 and the 361 and 383 wedges. The 1962 car offered the 413 Ramcharger, the Max Wedge built for drag racing."),
    G("1963-1966", "1963–1966", 1963, 1966, "The compact Dart started with the 170 and 225 slant sixes; the 273 V8 arrived in 1964 and the four-barrel Commando 273 in 1965. The 1966 D-Dart package was a 275 hp competition version of the 273."),
    G("1967-1976", "1967–1976", 1967, 1976, "The 1967 redesign made room for the 383 in the GTS and, for 1969, the 440. The 340 powered the GTS, Swinger 340 and Demon 340, and the 360 replaced it for 1974. Ratings are SAE net from 1972. Hurst built a small run of Hemi Darts for drag racing in 1968."),
    G("2013-2016", "2013–2016", 2013, 2016, "The front-drive Dart used a 2.0 and 2.4 Tigershark four and a turbocharged 1.4 MultiAir four.")],
  files=["verify_dart.json"],
  notes={"1966|273|275": "D-Dart competition package."})

S["cougar"] = dict(make="Mercury", model="Cougar", makeSlug="mercury", slug="cougar",
  title="Mercury Cougar Engines by Year (1967–2002)",
  description="Every factory engine in the Mercury Cougar by year, 1967–2002: the 289 and 390, 428 Cobra Jet and Boss 302 Eliminator, Fox and MN12 V6s and V8s and the Zetec.",
  intro=["Mercury's Cougar began in 1967 as an upscale relative of the Mustang and changed character several times: a larger coupe in 1974–1976, a full intermediate line in 1977–1979, rear-drive coupes through 1997, and a front-drive hatchback in 1999–2002.", PICK],
  generations=[
    G("1967-1973", "1967–1973", 1967, 1973, "The first Cougars shared the Mustang's engines, from the 289 to the 390 and 428 Cobra Jet, with the Boss 302 in the 1969–1970 Eliminator. Ratings are SAE net from 1972."),
    G("1974-1979", "1974–1979", 1974, 1979, "The Cougar moved to Ford's intermediate platform with the 351, 400 and 460, and for 1977–1979 the name covered sedans and wagons as well as the XR-7 coupe."),
    G("1980-1988", "1980–1988", 1980, 1988, "The Fox-platform Cougar used Ford's 2.3 four, 3.3 six, 3.8 V6 and 4.2 and 5.0 V8s; the 1984–1986 XR-7 had a turbocharged 2.3."),
    G("1989-1997", "1989–1997", 1989, 1997, "The MN12 Cougar offered the 3.8 V6, supercharged in the 1989–1990 XR-7, and V8s: the 5.0 and, from 1994, the 4.6."),
    G("1999-2002", "1999–2002", 1999, 2002, "The last Cougar was a front-drive hatchback with Ford's 2.0 Zetec four and 2.5 Duratec V6.")],
  files=["verify_cougar.json"],
  cid_remap={"122": 121, "153": 155},
  ranges={"1972|351|262": [248, 262], "1973|351|168": [168, 173], "1973|351|264": [253, 264],
          "1977|302|130": [130, 137], "1978|400|160": [160, 166], "1979|302|133": [130, 133]},
  notes={"1969|302|290": "Boss 302, Eliminator.", "1970|302|290": "Boss 302, Eliminator.",
         "1968|428|335": "Cobra Jet.", "1969|428|335": "Cobra Jet.", "1970|428|335": "Cobra Jet."})

S["duster"] = dict(make="Plymouth", model="Duster", makeSlug="plymouth", slug="duster",
  title="Plymouth Duster Engines by Year (1970–1976)",
  description="Every factory engine in the Plymouth Duster by year, 1970–1976: the 198 and 225 slant sixes, the 318, the Duster 340 and the Duster 360.",
  intro=["The Duster was the coupe version of Plymouth's compact Valiant, built from 1970 to 1976. Its performance models were the Duster 340 (1970–1973) and the Duster 360 (1974–1976).", PICK],
  generations=[
    G("1970-1976", "1970–1976", 1970, 1976, "Ratings are gross for 1970–1971 and SAE net from 1972. The 1976 Feather Duster used a lighter 225 calibrated for economy.")],
  files=["verify_duster.json"],
  notes={"1975|360|190": "California version.", "1976|360|220": "Not sold in California.",
         "1971|198|125": "105 hp net.", "1971|225|145": "110 hp net.", "1971|318|230": "155 hp net.", "1971|340|275": "235 hp net."})

S["fairlane"] = dict(make="Ford", model="Fairlane", makeSlug="ford", slug="fairlane",
  title="Ford Fairlane Engines by Year (1955–1970)",
  description="Every factory engine in the Ford Fairlane by year, 1955–1970: Y-block V8s incl. the supercharged 312, the FE 352 and 390, the 427 and the 428 Cobra Jet.",
  intro=["Ford used the Fairlane name on its top full-size series from 1955 to 1961 and on its mid-size car from 1962 to 1970, after which the Torino took over.", PICK],
  generations=[
    G("1955-1961", "1955–1961", 1955, 1961, "The full-size Fairlane offered Ford's six and Y-block V8s, including a supercharged 312 in 1957, then the FE-series 332 and 352 and, for 1961, the 390."),
    G("1962-1965", "1962–1965", 1962, 1965, "The mid-size Fairlane introduced Ford's small-block V8 as the 221 and 260, followed by the 289, including the 271 hp high-performance version."),
    G("1966-1970", "1966–1970", 1966, 1970, "The 1966 redesign made room for the 390 FE, and the 427 was offered in 1966–1967. From 1968 the Fairlane shared the Torino's engines, including the 428 and 429 Cobra Jets.")],
  files=["verify_fairlane.json"],
  notes={"1957|312|300": "Supercharged.", "1966|390|275": "With Cruise-O-Matic; 265 hp with a manual transmission.",
         "1968|428|335": "Cobra Jet.", "1969|428|335": "Cobra Jet."})

S["satellite"] = dict(make="Plymouth", model="Satellite", makeSlug="plymouth", slug="satellite",
  title="Plymouth Satellite Engines by Year (1965–1974)",
  description="Every factory engine in the Plymouth Satellite and Sport Satellite by year, 1965–1974: the 273 and 318, the 383, the 426 Street Hemi and the 400.",
  intro=["The Satellite was Plymouth's mid-size car from 1965 to 1974: the top of the Belvedere line until 1970, and from 1971 the name for the whole intermediate range. The Road Runner and GTX were related models and have their own pages.", PICK],
  generations=[
    G("1965-1967", "1965–1967", 1965, 1967, "The early Satellite was V8-only, from the 273 to the 383, with the 426 Street Wedge in 1965 and the 426 Street Hemi offered from 1966."),
    G("1968-1970", "1968–1970", 1968, 1970, "The 1968 redesign added the 225 slant six to the Satellite; the 383 was the top engine outside the Road Runner and GTX."),
    G("1971-1974", "1971–1974", 1971, 1974, "From 1971 the Satellite name covered sedans, wagons and the Sebring coupe. Ratings are SAE net from 1972, and the 400 replaced the 383.")],
  files=["verify_satellite.json"],
  notes={"1967|426|425": "Rare; few were built."})

S["valiant"] = dict(make="Plymouth", model="Valiant", makeSlug="plymouth", slug="valiant",
  title="Plymouth Valiant Engines by Year (1960–1976)",
  description="Every factory engine in the Plymouth Valiant by year, 1960–1976: the 170 and 225 slant sixes it introduced, the 198, and the 273 and 318 V8s.",
  intro=["The Valiant was Plymouth's compact from 1960 to 1976 and the car that introduced Chrysler's slant six. It was sold as a separate Valiant brand in 1960 and as a Plymouth from 1961; the Duster, its coupe version, has its own page.", PICK],
  generations=[
    G("1960-1966", "1960–1966", 1960, 1966, "The first Valiants used the 170 and, from 1961, the 225 slant six. The 273, Chrysler's first small-block V8, arrived in 1964, with a four-barrel Commando version from 1965."),
    G("1967-1976", "1967–1976", 1967, 1976, "The 1967 redesign kept the slant sixes and small blocks; the 318 joined in 1968 and the 198 six replaced the 170 in 1970. Ratings are SAE net from 1972.")],
  files=["verify_valiant.json"],
  ranges={"1976|318|150": [145, 150]},
  notes={"1964|273|180": "Added during the 1964 model year.", "1961|225|145": "Added during the 1961 model year."})

S["maverick"] = dict(make="Ford", model="Maverick", makeSlug="ford", slug="maverick",
  title="Ford Maverick Engines by Year (1970–1977)",
  description="Every factory engine in the Ford Maverick car by year, 1970–1977: the 170, 200 and 250 sixes and the 302 V8, including the Grabber and Stallion models.",
  intro=["The Maverick was Ford's compact car from 1970 to 1977, with inline sixes and, from 1971, the 302 V8. The Grabber (1970–1975) and Stallion (1976) were appearance and performance packages. The 2022-on Maverick is a pickup and is not covered here.", PICK],
  generations=[
    G("1970-1977", "1970–1977", 1970, 1977, "Ratings are gross for 1970–1971 and SAE net from 1972. The 250 six was added during 1970, and the 170 was dropped after 1972.")],
  files=["verify_maverick.json"],
  include=["1977|302|137"],
  exclude={"1977|302|122": "Second 1977 NHRA rating for the same engine; shown as a range on the 137 row"},
  ranges={"1977|302|137": [122, 137]},
  notes={"1977|302|137": "California cars used a variable-venturi carburetor. Published ratings vary.",
         "1970|250|155": "Added during the 1970 model year."})

S["falcon"] = dict(make="Ford", model="Falcon", makeSlug="ford", slug="falcon",
  title="Ford Falcon Engines by Year (1960–1970)",
  description="Every factory engine in the Ford Falcon by year, 1960–1970: the 144, 170 and 200 sixes, the 260 and 289 V8s, the 302 and the 1970½ 429 Cobra Jet.",
  intro=["The Falcon was Ford's compact from 1960 to 1970. It began with a 144 cubic-inch six and added V8s in 1963 with the Sprint. In its last months the name went onto a low-priced Torino-based 1970½ model that could be ordered with a 429.", PICK],
  generations=[
    G("1960-1965", "1960–1965", 1960, 1965, "The first Falcons used the 144 and 170 sixes; the 260 V8 arrived in early 1963 with the Sprint, and the 289 replaced it for 1965."),
    G("1966-1970", "1966–1970", 1966, 1970, "The second Falcon used Ford's sixes and small blocks through 1970. The 1970½ Falcon was a low-priced Torino with that car's engines, up to the 429 Cobra Jet; the notes mark its rows.")],
  files=["verify_falcon.json"],
  trim_notes={r"1970 1/2": "1970½ Torino-based Falcon."},
  notes={"1963|260|164": "Added in early 1963; standard on the Sprint."})

S["el-camino"] = dict(make="Chevrolet", model="El Camino", makeSlug="chevrolet", slug="el-camino",
  title="Chevrolet El Camino Engines (1959–1987)",
  description="Every factory engine in the Chevrolet El Camino by year: the 1959–60 full-size pickup, the SS 396 and 454 LS6 of the Chevelle years, and 1980s V6s and V8s.",
  intro=["The El Camino was Chevrolet's car-based pickup: a full-size model in 1959–1960, then built on the Chevelle and later the Malibu platform from 1964 to 1987. It shared those cars' engines, including the SS 396 and 454.", PICK],
  generations=[
    G("1959-1960", "1959–1960", 1959, 1960, "The first El Camino was based on the full-size Chevrolet, with the 235 six, the 283 and the 348 W-series V8."),
    G("1964-1967", "1964–1967", 1964, 1967, "The Chevelle-based El Camino offered sixes, the 283 and 327, and from 1966 the 396."),
    G("1968-1972", "1968–1972", 1968, 1972, "The El Camino SS shared the Chevelle SS engines, including the 1970 LS6 454. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1977", "1973–1977", 1973, 1977, "The Colonnade El Camino carried SAE net ratings, from the 250 six to the 454."),
    G("1978-1987", "1978–1987", 1978, 1987, "The downsized El Camino used V6s, the 267, 305 and 350, the Oldsmobile-built 5.7 diesel, and from 1985 the 4.3 V6.")],
  files=["verify_el-camino.json"],
  notes={"1970|402|350": "Badged as a 396; displaces 402 cubic inches.", "1970|402|375": "Badged as a 396; displaces 402 cubic inches.",
         "1970|454|450": "LS6."},
  code_notes={"LF9": "Oldsmobile-built diesel."})

S["vega"] = dict(make="Chevrolet", model="Vega", makeSlug="chevrolet", slug="vega",
  title="Chevrolet Vega Engines by Year (1971–1977)",
  description="Every factory engine in the Chevrolet Vega by year, 1971–1977: the aluminum-block 2.3 four in one- and two-barrel form, and the twin-cam Cosworth Vega.",
  intro=["The Vega was Chevrolet's subcompact from 1971 to 1977. Every Vega used a 2.3 four with an aluminum cylinder block, and the 1975–1976 Cosworth Vega used a twin-cam, fuel-injected version.", PICK],
  generations=[
    G("1971-1977", "1971–1977", 1971, 1977, "Ratings are gross for 1971 and SAE net from 1972. The one-barrel engine was dropped after 1976, leaving the two-barrel as the only engine for 1977.")],
  files=["verify_vega-chevette.json"], require_model="Vega",
  code_notes={"LY3": "Cosworth Vega: twin-cam, fuel-injected."},
  trim_notes={r"Cosworth": "Cosworth Vega: twin-cam, fuel-injected."})

S["chevette"] = dict(make="Chevrolet", model="Chevette", makeSlug="chevrolet", slug="chevette",
  title="Chevrolet Chevette Engines by Year (1976–1987)",
  description="Every factory engine in the Chevrolet Chevette by year, 1976–1987: the 1.4 and 1.6 overhead-cam fours, the 1.6 HO, and the Isuzu-built 1.8 diesel.",
  intro=["The Chevette was Chevrolet's rear-drive subcompact from 1976 to 1987, sold with small overhead-cam fours and, from late 1981, an Isuzu-built 1.8 diesel.", PICK],
  generations=[
    G("1976-1987", "1976–1987", 1976, 1987, "The 1.4 was offered through 1977; from 1978 the Chevette used the 1.6, with a high-output version in 1978–1980.")],
  files=["verify_vega-chevette.json"], require_model="Chevette",
  code_notes={"LJ5": "Isuzu-built diesel."})

S["galaxie"] = dict(make="Ford", model="Galaxie", makeSlug="ford", slug="galaxie",
  title="Ford Galaxie Engines by Year (1959–1974)",
  description="Every factory engine in the Ford Galaxie by year, 1959–1974: the 352, the 390 and 406 tri-power, the 427 and 7-Litre 428, and the 429 and 460.",
  intro=["The Galaxie was Ford's full-size car from 1959 to 1974, and in the early 1960s its main racing car. Its engine list ran from the six through the FE big blocks, the 406 and 427, to the 429 and 460 of its last years.", PICK],
  generations=[
    G("1959-1964", "1959–1964", 1959, 1964, "The Galaxie's FE V8s grew from the 352 to the 390 and, for 1962, the 406 with three two-barrel carburetors. The 427 arrived in 1963, and Ford built lightweight Galaxies for drag racing in 1963–1964."),
    G("1965-1968", "1965–1968", 1965, 1968, "The 1965 redesign brought the 240 six and, for 1966, the 7-Litre model with the 428."),
    G("1969-1974", "1969–1974", 1969, 1974, "From 1969 the Galaxie offered the 429 and later the 400 and 460. Ratings are SAE net from 1972.")],
  files=["verify_galaxie.json"],
  notes={"1960|352|360": "Added during the 1960 model year.", "1963|289|195": "Added during the 1963 model year.",
         "1963|427|410": "Added during the 1963 model year.", "1963|427|425": "Added during the 1963 model year."},
  trim_notes={r"7-Litre": "7-Litre model."})

S["javelin"] = dict(make="AMC", model="Javelin", makeSlug="amc", slug="javelin",
  title="AMC Javelin Engines by Year (1968–1974)",
  description="Every factory engine in the AMC Javelin by year, 1968–1974: the 232 and 258 sixes and AMC's 290, 304, 343, 360, 390 and 401 V8s, incl. the AMX models.",
  intro=["The Javelin was American Motors' pony car from 1968 to 1974. It used AMC's own sixes and V8s, from the 232 to the 401, and from 1971 the AMX name was its top model.", PICK],
  generations=[
    G("1968-1970", "1968–1970", 1968, 1970, "The first Javelin ran from the 232 six to the 390 V8; the 1970 Mark Donohue model came with a 360 four-barrel."),
    G("1971-1974", "1971–1974", 1971, 1974, "The 1971 redesign added the 401 and made the AMX a Javelin model. Ratings are SAE net from 1972.")],
  files=["verify_javelin-amx.json"], require_model="Javelin",
  notes={"1972|360|195": "Single exhaust; 220 hp with dual exhaust."})

S["amx"] = dict(make="AMC", model="AMX", makeSlug="amc", slug="amx",
  title="AMC AMX Engines by Year (1968–1980)",
  description="Every factory engine in the AMC AMX by year: the 1968–1970 two-seater's 290, 343, 360 and 390 V8s, and the 1977–1980 Hornet, Concord and Spirit AMX.",
  intro=["AMC used the AMX name on a two-seat sports car from 1968 to 1970 and on sporty versions of the Hornet, Concord and Spirit from 1977 to 1980. From 1971 to 1974 the AMX was a Javelin model and is listed on the Javelin page.", PICK],
  generations=[
    G("1968-1970", "1968–1970", 1968, 1970, "The two-seat AMX had only V8s: the 290, 343 and 390, then the 360 and 390 for 1970. Hurst built a small run of Super Stock AMXs for drag racing in 1969."),
    G("1977-1980", "1977–1980", 1977, 1980, "The later AMX used AMC's 258 six and 304 V8. No horsepower rating is listed for the six in these years.")],
  files=["verify_javelin-amx.json"], require_model="AMX")

S["lemans"] = dict(make="Pontiac", model="LeMans", makeSlug="pontiac", slug="lemans",
  title="Pontiac LeMans Engines by Year (1961–1993)",
  description="Every factory engine in the Pontiac Tempest and LeMans by year: the Trophy 4, aluminum 215, OHC six, 326 to 455 V8s, and the Daewoo-built LeMans.",
  intro=["The Tempest and LeMans were Pontiac's compact and then mid-size cars from 1961 to 1981. The LeMans name returned for 1988–1993 on a small car built by Daewoo in Korea. The GTO began as a LeMans option and has its own page.", PICK],
  generations=[
    G("1961-1963", "1961–1963", 1961, 1963, "The first Tempest used a 195 cubic-inch four made from half of Pontiac's 389 V8, and offered Buick's aluminum 215 V8 and, for 1963, the 326."),
    G("1964-1972", "1964–1972", 1964, 1972, "The mid-size Tempest and LeMans used a Chevrolet-built six in 1964–1965, Pontiac's overhead-cam six from 1966 to 1969, and Pontiac V8s from the 326 to the 455. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1981", "1973–1981", 1973, 1981, "The Colonnade and later LeMans used Pontiac V8s and, from 1977, engines from Buick, Chevrolet and Oldsmobile; the notes say which division built each one."),
    G("1988-1993", "1988–1993", 1988, 1993, "The front-drive LeMans was built by Daewoo with a 1.6 four and, in the GSE, a 2.0.")],
  files=["verify_lemans.json"],
  built_by_notes=True, own_division="^Pontiac",
  code_notes={"Trophy 4": "Trophy 4: half of Pontiac's 389 V8."})

S["grand-prix"] = dict(make="Pontiac", model="Grand Prix", makeSlug="pontiac", slug="grand-prix",
  title="Pontiac Grand Prix Engines by Year (1962–2008)",
  description="Every factory engine in the Pontiac Grand Prix by year, 1962–2008: the 389 and 421, 428 and SJ 455, G-body V6s and V8s, the supercharged GTP and the GXP V8.",
  intro=["The Grand Prix was Pontiac's personal luxury car from 1962 to 2008: built on the full-size chassis until 1968, on the mid-size platform from 1969 to 1987, and front-drive from 1988.", PICK],
  generations=[
    G("1962-1968", "1962–1968", 1962, 1968, "The early Grand Prix used Pontiac's 389 and 421, including the 421 H.O. and Tri-Power versions, then the 400 and 428 from 1967. A few factory 421 Super Duty cars were built for racing in 1962."),
    G("1969-1972", "1969–1972", 1969, 1972, "The 1969 redesign introduced the SJ, whose 428 was replaced by the 455 for 1970. Ratings are gross through 1971 and SAE net from 1972."),
    G("1973-1977", "1973–1977", 1973, 1977, "The Colonnade Grand Prix used Pontiac's 400 and 455 and, from 1976, the 350 and 301, with Oldsmobile engines in some 1977 California cars."),
    G("1978-1987", "1978–1987", 1978, 1987, "The downsized Grand Prix used Buick V6s, Pontiac's 301 and 265, Chevrolet's 305 and 4.3, and the Oldsmobile 5.7 diesel. The 1986 2+2 had a four-barrel 305."),
    G("1988-2008", "1988–2008", 1988, 2008, "The front-drive Grand Prix used GM's 60-degree V6s, the Quad 4 and the 3800, supercharged in the GTP, plus the 1989–1990 Turbo Grand Prix's 3.1 turbo and the 2005–2008 GXP's 5.3 V8.")],
  files=["verify_grand-prix-1962-1987.json", "verify_grand-prix-1988-2008.json"],
  built_by_notes=True, own_division="^Pontiac",
  code_notes={"LG5": "Turbocharged; converted by ASC/McLaren for Pontiac.", "LF9": "Oldsmobile-built diesel."})

S["thunderbird"] = dict(make="Ford", model="Thunderbird", makeSlug="ford", slug="thunderbird",
  title="Ford Thunderbird Engines by Year (1955–2005)",
  description="Every factory engine in the Ford Thunderbird by year: the 292 and supercharged 312, the 352, 390, 428, 429 and 460, the Turbo Coupe and the Super Coupe.",
  intro=["Ford built the Thunderbird from 1955 to 1997 and again from 2002 to 2005, starting as a two-seater and growing into a four-seat personal luxury car. Its engines ran from the Y-block V8s to the 460, and later included the Turbo Coupe's 2.3 turbo four and the Super Coupe's supercharged 3.8.", PICK],
  generations=[
    G("1955-1957", "1955–1957", 1955, 1957, "The two-seat Thunderbird used the 292 and 312 Y-block V8s; the 1957 F-code 312 was supercharged."),
    G("1958-1966", "1958–1966", 1958, 1966, "The four-seat Thunderbird used the 352, the 430 shared with Lincoln in 1959–1960, then the 390, including the 1962–1963 M-code with three two-barrel carburetors, and the 428 for 1966."),
    G("1967-1976", "1967–1976", 1967, 1976, "The Thunderbird used the 390, 428 and 429 and, from 1972, the 460. Ratings are SAE net from 1972."),
    G("1977-1979", "1977–1979", 1977, 1979, "The downsized Thunderbird shared Ford's intermediate engines: the 302, 351 and 400."),
    G("1980-1997", "1980–1997", 1980, 1997, "The Fox and MN12 Thunderbirds offered sixes, the 3.8 V6, the 5.0 and 4.6 V8s, the 1983–1988 Turbo Coupe's 2.3 turbo four, and the 1989–1995 Super Coupe's supercharged 3.8."),
    G("2002-2005", "2002–2005", 2002, 2005, "The retro Thunderbird used a 3.9 four-cam V8 shared with the Lincoln LS.")],
  files=["verify_thunderbird-1955-1979.json", "verify_thunderbird-1980-2005.json"],
  include=["1979|302|133", "1979|351|142", "1979|351|151"],
  ranges={"1975|460|220": [218, 224], "1978|400|166": [160, 166], "1981|200|88": [88, 94], "1982|255|122": [111, 122]},
  notes={"1957|312|300": "Supercharged F-code.", "1962|390|340": "M-code, three two-barrel carburetors.",
         "1963|390|340": "M-code, three two-barrel carburetors.", "1968|390|315": "Standard until January 1, 1968, when the 429 replaced it."})

# Independent third sources found in follow-up passes (third_source_found_*.json).
by_model = {f'{v["make"]} {v["model"]}': k for k, v in S.items()}
for fn in ("third_source_found_elc.json", "third_source_found_rest.json"):
    tp = os.path.join(SP, fn)
    if not os.path.exists(tp): continue
    for x in json.load(open(tp, encoding="utf-8")):
        slug = by_model.get(x.get("model"))
        if slug and "source" in x:
            S[slug].setdefault("add_sources", {}).setdefault(f'{x["year"]}|{x["cid"]}|{x["hp"]}', []).append(x["source"])

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    pass  # batch 2/3 approved and published 2026-10-12; new models should set draft=True
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
