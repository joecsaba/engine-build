# Public engine names for the water-cooled 911: keep only source-stated codes;
# provisional sub-codes (Mezger M96/7x, M97/xx, MA1.xx, "MA2") become the family name.
import json, re
p = "verify_porsche-911-1999-2026.json"
d = json.load(open(p, encoding="utf-8"))
def clean(r):
    kit = " Powerkit" if "Powerkit" in r else ""
    if r.startswith("Mezger"): return "Mezger" + kit
    if r.startswith("M97"): return "M97"
    if r.startswith("9A1"): return "9A1" + kit
    if r.startswith("9A2 Evo"): return "9A2 Evo (MDC.K)"
    if r.startswith("9A2"): return "9A2"
    if r.startswith("T-Hybrid"): return "T-Hybrid"
    if r.startswith("M96/01"): return "M96"
    if r.startswith("M96/03"): return "M96/03" + kit
    return r
for v in d["years"].values():
    for e in (v["engines"] if isinstance(v, dict) else v):
        e.setdefault("rpo_raw", e["rpo"]); e["rpo"] = clean(e["rpo_raw"])
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sorted({e["rpo"] for v in d["years"].values() for e in (v["engines"] if isinstance(v, dict) else v)}))
