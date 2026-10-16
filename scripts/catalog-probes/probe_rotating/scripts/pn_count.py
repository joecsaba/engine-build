"""Estimate part-number counts per engine family in each catalog PDF.
Walks text lines in order; a heading-like line matching a family regex sets the current family;
part-number regex matches on following lines are attributed to that family. Rough by design."""
import sys, re, json, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import pymupdf

FAM = [
 ("SBC",        r"small[- ]?block chev|sb chev|chevrolet,? small block|\bSBC\b|chev(?:y|rolet) (?:262|265|283|302|305|307|327|350|383|400)\b|chevrolet 265-400|small block\s*$"),
 ("BBC",        r"big[- ]?block chev|bb chev|chevrolet,? big block|\bBBC\b|chev(?:y|rolet) (?:396|402|427|454|502|572)\b|\b409\b.*chev|mark iv"),
 ("LS",         r"\bLS[1-9]?\b|\bLS[- /]?(?:series|engine|lt|/lt)|\bLSX\b|\bLT[1-5]\b|gen ?(?:iii|iv|3|4)(?!\s*hemi)|\b(?:4\.8|5\.3|6\.0|6\.2|7\.0)l(?!.*hemi)|\bLQ[49]\b|\bLM7\b|\bLY6\b"),
 ("SBF",        r"small[- ]?block ford|sb ford|ford,? small block|\bSBF\b|windsor|cleveland|ford (?:221|255|260|289|302|351)\b|\b(?:289|302|351)[wc]?\b.*ford|boss 302"),
 ("FordMod",    r"modular|coyote|\b(?:4\.6|5\.4|5\.2)l\b|5\.0l coyote|godzilla|7\.3l(?!.*power ?stroke)|voodoo|predator|trinity"),
 ("MoparSB",    r"chrysler,? small block|small[- ]?block (?:mopar|chrysler|dodge)|\b(?:273|318|340|360)\b|\bLA\b engine|magnum 5\.[29]"),
 ("MoparBB",    r"chrysler,? big block|big[- ]?block (?:mopar|chrysler|dodge)|\b(?:383|400|413|426|440)\b.*(?:wedge|hemi|chrysler|mopar|dodge|rb)|\bRB\b|\b(?:361|383|400|413|426|440)\b(?!.*chev)"),
 ("Gen3Hemi",   r"gen ?(?:iii|3) hemi|(?:5\.7|6\.1|6\.2|6\.4)l? ?hemi|hellcat|late model hemi|modern hemi|apache|demon|redeye"),
 ("Pontiac",    r"pontiac"),
 ("Olds",       r"oldsmobile|\bolds\b"),
 ("Buick",      r"buick"),
 ("AMC",        r"\bAMC\b|jeep"),
 ("Inline6",    r"inline[- ]?(?:6|six)|straight[- ]?(?:6|six)|slant[- ]six|\bI-?6\b|\b(?:194|230|250|292)\b.*(?:inline|cid|l6|chev)|ford (?:240|300)\b|\b300 ?(?:cid|ci)\b|4\.0l jeep|(?:232|258) ?(?:cid|ci)?.*(?:amc|jeep)|\b2jz\b|\brb2[56]\b|barra|\b4\.2l\b.*(?:jeep|amc)"),
]
FAMRX = [(n, re.compile(p, re.I)) for n, p in FAM]

CATS = {
 "mahle_powerpak_2026.pdf": r"\b930\d{6}\b",
 "arp_catalog.pdf":         r"\b\d{3}-\d{4}\b",
 "eagle_2024_catalog.pdf":  r"\b\d{12}\b|\b(?:CRS|SIR|FSI|ESP)\d{4,5}[A-Z0-9]*\b|\bB?\d{5}\*?\b",
 "uem_icon_catalog.pdf":    r"\b(?:IC|KB|FHR)\d{3,4}[A-Z]*(?:\.\d{3})?\b",
 "cometic_ab23.pdf":        r"\bC\d{4,5}(?:-\d{3})?\b|\bPRO\d{4}[A-Z]?\b",
 "felpro_ls_linecard.pdf":  r"\b\d{4}[A-Z]?(?:-\d{3})?\*?\b",
 "melling_sbc_brochure.pdf": r"\b(?:M|MV|10|55)\d{3,4}[A-Z]{0,2}(?:-\d{3}[A-Z]{0,2})?\b",
 "melling_ls_lt_brochure.pdf": r"\b(?:M|MV|10|55)\d{3,4}[A-Z]{0,2}(?:-\d{3}[A-Z]{0,2})?\b",
}
base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dl")
result = {}
for fn, pnpat in CATS.items():
    path = os.path.join(base, fn)
    if not os.path.exists(path): continue
    pnrx = re.compile(pnpat)
    doc = pymupdf.open(path)
    fam = "unassigned"
    seen = {}   # pn -> family (first)
    per_fam_pages = {}
    for pno, pg in enumerate(doc):
        for line in pg.get_text("text").splitlines():
            s = line.strip()
            if not s: continue
            pns = pnrx.findall(s)
            if not pns and len(s) < 90:
                for name, rx in FAMRX:
                    if rx.search(s):
                        fam = name; break
            for p in pns:
                if p not in seen:
                    seen[p] = fam
    counts = {}
    for p, f in seen.items(): counts[f] = counts.get(f, 0) + 1
    result[fn] = {"pages": doc.page_count, "unique_pn_total": len(seen), "by_family": dict(sorted(counts.items(), key=lambda x: -x[1]))}
    print(f"\n{fn}: pages={doc.page_count} unique part numbers={len(seen)}")
    for f, c in sorted(counts.items(), key=lambda x: -x[1]): print(f"   {f:12s} {c}")
out = os.path.join(os.path.dirname(base), "out", "pn_counts.json")
json.dump(result, open(out, "w"), indent=1)
print("\nsaved", out)
