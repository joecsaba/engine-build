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
         "1988|97|110": "Twin Cam, 16 valves."})

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
  description="Every factory engine in the Dodge Coronet and Super Bee by year: Red Ram Hemi V8s of the 1950s, then the 383 Magnum, 440 Six Pack and 426 Hemi of 1965–1976.",
  intro=["Dodge used the Coronet name on its full-size cars from 1949 to 1959 and on its mid-size cars from 1965 to 1976. The Super Bee (1968–1970) and R/T were Coronet models, and the trims column marks the engines only they got.", PICK],
  generations=[
    G("1949-1959", "1949–1959", 1949, 1959, "The early Coronet used Dodge's 230 flathead six and, from 1953, the Red Ram Hemi V8, later joined by wedge-head V8s up to the 383. The D-500 packages were Dodge's performance engines."),
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
  no_link=[{"cid": 122, "years": [1999, 2002]}],
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

os.makedirs(os.path.join(SP, "vspecs"), exist_ok=True)
for k, v in S.items():
    if ONLY and k not in ONLY: continue
    v.setdefault("draft", True)
    json.dump(v, open(os.path.join(SP, "vspecs", f"{k}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("specs:", ", ".join(k for k in S if not ONLY or k in ONLY))
