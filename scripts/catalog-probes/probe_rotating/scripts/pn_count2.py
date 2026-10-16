"""Refined part-number counts per engine family. Make + sub-family state machine over text lines.
UEM pages are clipped to exclude the right-hand sidebar tabs."""
import sys, re, json, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import pymupdf

MAKES = {
 "CHEV": r"\bchev(?:y|rolet)?\b|\bgm\b|\bgmc\b",
 "FORD": r"\bford\b|\blincoln\b|\bmercury\b",
 "MOPAR": r"\bchrysler\b|\bmopar\b|\bdodge\b|\bplymouth\b|\bram\b|\bjeep\b",
 "PONTIAC": r"\bpontiac\b", "OLDS": r"\boldsmobile\b|\bolds\b", "BUICK": r"\bbuick\b", "AMC": r"\bamc\b",
}
# explicit family patterns (checked first)
EXPL = [
 ("Gen3Hemi", r"gen ?(?:iii|3) ?hemi|(?:5\.7|6\.1|6\.2|6\.4|7\.0)l? ?hemi|hellcat|late model hemi|modern hemi|\bapache\b|drag pak|hemi v8 20"),
 ("LS",       r"\bLS[1-9]?\b|\bLS[ -]?series|\bLSX\b|\bLS next\b|\bLT[1-5]\b|\blt series|gen ?(?:iii|iv)(?:/iv)? ?(?:ls|small block)|ls1/ls6|\b(?:4\.8|5\.3|6\.0|6\.2|7\.0)l\b(?!.*(?:hemi|power|duramax|ford))"),
 ("FordMod",  r"modular|coyote|voodoo|predator|godzilla|\b(?:4\.6|5\.4|5\.2)l?\b.*(?:v8|mod|sohc|dohc)|mod motor|\b4\.6 ?(?:&|/)|\b7\.3l\b(?!.*power)"),
 ("SBC",      r"small[- ]?block chev|chev(?:y|rolet),? small block|chevrolet sbc|\bsbc\b|chev(?:y|rolet) (?:262|265|283|302|305|307|327|350|383|395|400)\b|chevrolet 302/327|23 degree small block|18/23 degree"),
 ("BBC",      r"big[- ]?block chev|chev(?:y|rolet),? big block|chevrolet bbc|\bbbc\b|chev(?:y|rolet) (?:396|402|409|427|454|502|572)\b|chevy bb\b|big block v8 - gen|mark iv"),
 ("SBF",      r"small[- ]?block ford|ford,? small block|\bsbf\b|windsor|cleveland|ford (?:221|255|260|289|302|331|347|351)\b|\b289 / 302|boss 302|ford sb\b"),
 ("MoparSB",  r"chrysler,? small block|small[- ]?block (?:mopar|chrysler|dodge)|chrysler (?:273|318|340|360|408)\b|chrysler sb\b|\bLA\b.*(?:engine|v8)|magnum 5\.[29]"),
 ("MoparBB",  r"chrysler,? big block|big[- ]?block (?:mopar|chrysler|dodge)|chrysler (?:361|383|400|413|426|440)\b|chrysler bb\b|\bRB\b|383-440 wedge|early hemi|354-392|426 hemi"),
 ("Pontiac",  r"pontiac"), ("Olds", r"oldsmobile|\bolds\b"), ("Buick", r"buick"), ("AMC", r"\bamc\b|jeep"),
 ("Inline6",  r"inline[- ]?(?:6|six)|straight[- ]?(?:6|six)|slant[- ]six|\b6-cylinder|\bI-?6\b|\b(?:194|230|250|292)\b.*(?:inline|1962)|ford (?:240|300)\b|\b300 ?(?:cid|ci|six)|\b2jz\b|\brb2[56]\b|barra|\b4\.0l\b.*jeep|jeep.*4\.0"),
]
OTHER = re.compile(r"honda|acura|nissan|datsun|toyota|lexus|mitsubishi|subaru|mazda|bmw|audi|volkswagen|vw|porsche|volvo|saab|mini|hyundai|kia|suzuki|kawasaki|yamaha|harley|motorcycle|sport compact|cummins|duramax|power ?stroke|diesel|navistar|caterpillar|accessor|bulk|hardware|tools?|bolts? & nuts|drive ?line|driveline|flywheel|flexplate|pulley|header|intake|carburetor|misc|sheet material|rear main seal|lotus|cosworth|ecoboost|powersports|v-twin|marine|tractor|sprint|midget|inline 5|inline 4|4-cylinder|4 cylinder|v6|corvair|vega|2\.[0-9]l|3\.[0-9]l", re.I)
GENERIC = [("SB", r"^small[- ]?block\b|small block v8"), ("BB", r"^big[- ]?block\b|big block v8")]
MK = {k: re.compile(v, re.I) for k, v in MAKES.items()}
EX = [(n, re.compile(p, re.I)) for n, p in EXPL]
GEN = [(n, re.compile(p, re.I)) for n, p in GENERIC]
COMBO = {("CHEV","SB"):"SBC",("CHEV","BB"):"BBC",("FORD","SB"):"SBF",("FORD","BB"):"FordBB",("MOPAR","SB"):"MoparSB",("MOPAR","BB"):"MoparBB",
         ("PONTIAC",None):"Pontiac",("OLDS",None):"Olds",("BUICK",None):"Buick",("AMC",None):"AMC"}
CATS = {
 "mahle_powerpak_2026.pdf": (r"\b930\d{6}\b", None),
 "arp_catalog.pdf":         (r"\b\d{3}-\d{4}\b", None),
 "eagle_2024_catalog.pdf":  (r"\b\d{12}\b|\b(?:CRS|SIR|FSI|ESP)\d{4,5}[A-Z0-9]*\b|\bB?\d{5}\*?\b", None),
 "uem_icon_catalog.pdf":    (r"\b(?:IC|KB|FHR)\d{3,4}[A-Z]*\b", pymupdf.Rect(0, 0, 540, 792)),
 "cometic_ab23.pdf":        (r"\bC\d{4,5}(?:-\d{3})?\b|\bPRO\d{4}[A-Z]?\b", None),
 "felpro_ls_linecard.pdf":  (r"\b\d{4}[A-Z]?(?:-\d{3})?\*?\b", None),
 "melling_sbc_brochure.pdf": (r"\b(?:M|MV|10|55)\d{3,4}[A-Z]{0,2}(?:-\d{3}[A-Z]{0,2})?\b", None),
 "melling_ls_lt_brochure.pdf": (r"\b(?:M|MV|10|55)\d{3,4}[A-Z]{0,2}(?:-\d{3}[A-Z]{0,2})?\b", None),
}
base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dl")
result = {}
for fn, (pnpat, clip) in CATS.items():
    path = os.path.join(base, fn)
    if not os.path.exists(path): continue
    pnrx = re.compile(pnpat); doc = pymupdf.open(path)
    make, fam = None, "unassigned"; seen = {}
    for pg in doc:
        txt = pg.get_text("text", clip=clip) if clip else pg.get_text("text")
        for line in txt.splitlines():
            s = line.strip()
            if not s: continue
            pns = pnrx.findall(s)
            if not pns and len(s) < 80:
                hit = None
                for n, rx in EX:
                    if rx.search(s): hit = n; break
                if hit: fam = hit
                elif OTHER.search(s) and not any(rx.search(s) for rx in MK.values()): fam = "other"
                elif OTHER.search(s) and (s.upper() == s or len(s) < 45): fam = "other"
                else:
                    m = next((k for k, rx in MK.items() if rx.search(s)), None)
                    g = next((n for n, rx in GEN if rx.search(s)), None)
                    if m and len(s) < 40 and s.upper() == s:  # make heading
                        make = m
                        fam = COMBO.get((m, None), fam if g is None else COMBO.get((m, g), fam))
                    if g and make: fam = COMBO.get((make, g), fam)
            for p in pns:
                seen.setdefault(p, fam)
    counts = {}
    for p, f in seen.items(): counts[f] = counts.get(f, 0) + 1
    result[fn] = {"pages": doc.page_count, "unique_pn_total": len(seen), "by_family": dict(sorted(counts.items(), key=lambda x: -x[1]))}
    print(f"\n{fn}: pages={doc.page_count} unique PNs={len(seen)} :: " + ", ".join(f"{f}={c}" for f, c in sorted(counts.items(), key=lambda x: -x[1])))
json.dump(result, open(os.path.join(os.path.dirname(base), "out", "pn_counts.json"), "w"), indent=1)
