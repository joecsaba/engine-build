# -*- coding: utf-8 -*-
# Public notes must not name or discuss sources (sources are tracked privately).
import json, sys, re
SP = sys.argv[1]
CAMARO = {
 "1980|305|155": None, "1981|229|110": None, "1981|305|150": None,
 "1983|151|94": "Also published as 92 hp.",
 "1983|305|175": "Cross-Fire Injection.",
 "1983|305|190": "H.O. four-barrel, added in April 1983.",
 "1984|305|190": None, "1985|305|155": None, "1991|305|205": None,
 "1996|350|285": "Up from 275 hp in 1995.",
 "1998|346|320": "SS package. Also published as 325 hp.",
}
p = SP + "/vspecs/camaro.json"; d = json.load(open(p, encoding="utf-8"))
for k, v in CAMARO.items():
    if v is None: d["notes"].pop(k, None)
    else: d["notes"][k] = v
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

p = SP + "/make_specs.py"; s = open(p, encoding="utf-8").read()
R = [
 ('"1967|396|375": "Reinstated around April 1967. Some sources describe it as dealer-installed.",', '"1967|396|375": "Reinstated around April 1967.",'),
 ('"1975|454|215": "Some sources repeat the 1974 figure of 235 hp; GM gives 215 for 1975."', '"1975|454|215": "Down from 235 hp in 1974."'),
 ('"1968|390|280": "Automatic only. Listed in Ford\'s revised December 1967 brochure.",', '"1968|390|280": "Automatic only. Added during the 1968 model year.",'),
 ('notes={"1972|400|168": "Rating from NHRA; Ford\'s brochures give none."})', 'notes={})'),
 ('"1970|400|345": "Ram Air IV. NHRA lists 370 hp, the GTO rating.",', '"1970|400|345": "Ram Air IV.",'),
 ('"1968|400|366": "Ram Air II, added partway through 1968. Some sources give 360 hp.",', '"1968|400|366": "Ram Air II, added partway through 1968. Also published as 360 hp.",'),
 ('"1969|400|265": "Two-barrel economy 400, offered in 1969 despite some sources saying it was dropped."', '"1969|400|265": "Two-barrel economy 400."'),
 (" Published ratings from these years differ between sources, so several are shown as ranges.", " Published ratings from these years vary, so several are shown as ranges."),
 (" Ford's brochures from these years print no horsepower, so ratings come from NHRA and published road tests.", ""),
]
for a, b in R:
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
open(p, "w", encoding="utf-8").write(s)

p = SP + "/to_vehicle.py"; s = open(p, encoding="utf-8").read()
a = '"Published ratings for this engine differ between sources."'
assert s.count(a) == 1; s = s.replace(a, '"Published ratings for this engine vary."')
open(p, "w", encoding="utf-8").write(s)
print("renoted")
