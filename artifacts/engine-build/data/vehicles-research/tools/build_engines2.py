# -*- coding: utf-8 -*-
# Engine spec records for batch 2/3 vehicle engines (only fields with 3+ sources),
# FE/385 geometry fixes, families.json registration, private source files.
import json, os, re, sys, subprocess
REPO, SP = sys.argv[1], sys.argv[2]
ENG = "artifacts/engine-build/public/data/engines"
SRC = os.path.join(REPO, "artifacts", "engine-build", "data", "engine-sources")
os.makedirs(SRC, exist_ok=True)

def dump(o): return json.dumps(o, separators=(", ", " : ")) + "\n"
def head_text(rel):
    return subprocess.run(["git", "-C", REPO, "show", f"HEAD:{rel}"], capture_output=True, text=True, encoding="utf-8").stdout
def val(f, k):
    v = f.get(k); return v.get("value") if isinstance(v, dict) else v
def years(y):
    if isinstance(y, int): return [y]
    m = re.match(r"(\d{4})\s*[-–]\s*(\d{4})", str(y))
    return list(range(int(m.group(1)), int(m.group(2)) + 1)) if m else [int(str(y)[:4])]
def material(t):
    t = str(t or "").lower()
    return "aluminum" if "alumin" in t else "cast iron" if "iron" in t else None
def valvetrain(t):
    t = str(t or "")
    for v in ("DOHC", "SOHC", "OHV"):
        if v in t: return v
    return None
def num(x):
    if isinstance(x, (int, float)): return x
    m = re.search(r"\d+(\.\d+)?", str(x or "")); return float(m.group()) if m else None

ALL = {}
for fn in ("engine_specs_gm2.json", "engine_specs_fordamc.json", "engine_specs_mopar2.json"):
    d = json.load(open(os.path.join(SP, fn), encoding="utf-8"))
    for e in d["engines"]: ALL[e["id"]] = e
    if d.get("geometry_fixes"): GEOM = d["geometry_fixes"]

# id -> (folder, family_slug, family_name, manufacturer, configuration, fuel, prefix, extra)
PLAN = {
  "buick-225-v6": ("buick", "buick-225ci", "Buick 225ci", "Buick", "V6", "gas", "buick", {}),
  "chevrolet-200-v6": ("chevrolet", "chevrolet-200ci", "Chevrolet 200ci", "Chevrolet", "V6", "gas", "chevr", {}),
  "chevrolet-lt6": ("chevrolet", "chevrolet-333ci", "Chevrolet 333ci", "Chevrolet", "V8", "gas", "chevr", {"code": "LT6"}),
  "chevrolet-lt7": ("chevrolet", "chevrolet-333ci", "Chevrolet 333ci", "Chevrolet", "V8", "gas", "chevr", {"code": "LT7"}),
  "isuzu-111-diesel-lj5": ("chevrolet", "chevrolet-111ci", "Chevrolet 111ci diesel", "Chevrolet", "I4", "diesel", "chevr", {"code": "LJ5"}),
  "ford-223-mileage-maker": ("ford", "ford-223ci", "Ford 223ci", "Ford", "I6", "gas", "ford", {"code": "Mileage Maker 223"}),
  "ford-272-y-block": ("ford", "ford-272ci", "Ford 272ci", "Ford", "V8", "gas", "ford", {}),
  "ford-292-y-block": ("ford", "ford-292ci", "Ford 292ci", "Ford", "V8", "gas", "ford", {}),
  "ford-312-y-block": ("ford", "ford-312ci", "Ford 312ci", "Ford", "V8", "gas", "ford", {}),
  "amc-290": ("american_motors", "american-motors-290ci", "American Motors 290ci", "American Motors", "V8", "gas", "amc", {}),
  "dodge-241-red-ram-hemi": ("dodge", "dodge-241ci", "Dodge 241ci", "Dodge", "V8", "gas", "dodge", {}),
  "dodge-270-red-ram": ("dodge", "dodge-270ci", "Dodge 270ci", "Dodge", "V8", "gas", "dodge", {}),
  "dodge-315-d500-hemi": ("dodge", "dodge-315ci", "Dodge 315ci", "Dodge", "V8", "gas", "dodge", {}),
  "dodge-325-red-ram": ("dodge", "dodge-325ci", "Dodge 325ci", "Dodge", "V8", "gas", "dodge", {}),
  "dodge-326-a-poly": ("dodge", "dodge-326ci", "Dodge 326ci", "Dodge", "V8", "gas", "dodge", {}),
  "fiat-chrysler-1-4-multiair-turbo": ("dodge", "dodge-83ci", "Dodge 83ci", "Dodge", "I4", "gas", "dodge", {"code": "1.4 MultiAir Turbo", "induction": "turbocharged"}),
}
APPEND = {  # into existing families
  "ford-zetec-2-0": ("mercury/mercury_zetec.json", "mercury_cougar_zetec", {"code": "Zetec 2.0"}),
  "ford-duratec-2-5": ("mercury/mercury_duratec.json", "mercury_cougar_duratec", {}),
  "chrysler-350-b": ("plymouth/plymouth_b.json", "plymouth_b_1958_350", {}),
}

def records(eid, prefix, fuel, extra):
    e = ALL[eid]; f = e.get("fields", {})
    bore, stroke = val(f, "bore_in"), val(f, "stroke_in")
    assert bore and stroke, eid
    ci = val(f, "displacement_ci") or round(bore * bore * stroke * 0.7854 * (val(f, "num_cylinders") or 8))
    out = []
    for v in e.get("variants", []):
        for y in years(v.get("year") or v.get("years")):
            hp = v.get("hp")
            r = {"engine_id": f"{prefix}_{y}_{round(ci)}_{hp}hp" if hp else f"{prefix}_{y}_{round(ci)}",
                 "year": y, "displacement_ci": ci, "displacement_l": val(f, "displacement_l") or round(ci * 0.016387, 1),
                 "num_cylinders": val(f, "num_cylinders"), "bore_in": bore, "stroke_in": stroke,
                 "rod_length_in": num(val(f, "rod_length_in")),
                 "compression_ratio": num(v.get("compression_ratio")) or num(val(f, "compression_ratio")),
                 "advertised_hp": hp, "fuel_type": fuel, "firing_order": val(f, "firing_order"),
                 "block_material": material(val(f, "block_material")), "head_material": material(val(f, "head_material")),
                 "valvetrain": valvetrain(val(f, "valvetrain")), "nhra_verified": False, "vehicles": None,
                 "variants": [{"code": extra["code"], "description": None}] if extra.get("code") else None,
                 "head": None, "clearances": None, "torque_specs": None}
            if extra.get("induction") or v.get("induction"):
                r["induction"] = extra.get("induction") or v.get("induction")
            out.append(r)
    # one record per (year, hp)
    seen, uniq = set(), []
    for r in out:
        k = (r["year"], r["advertised_hp"], r["compression_ratio"])
        if k not in seen: seen.add(k); uniq.append(r)
    return uniq

new_fams, files = {}, {}
for eid, (folder, slug, name, mfr, config, fuel, prefix, extra) in PLAN.items():
    key = (folder, slug)
    files.setdefault(key, {"family": name, "manufacturer": mfr, "configuration": config, "engines": []})
    files[key]["engines"] += records(eid, f"{prefix}", fuel, extra)
for (folder, slug), doc in files.items():
    p = os.path.join(REPO, ENG, folder, slug + ".json")
    assert not os.path.exists(p), p
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8", newline="\n").write(dump(doc))
    new_fams[slug] = {"family_slug": slug, "manufacturer_slug": folder, "manufacturer_name": doc["manufacturer"],
                      "family_name": doc["family"], "configuration": doc["configuration"], "engine_count": len(doc["engines"])}

counts = {}
for eid, (rel, prefix, extra) in APPEND.items():
    d = json.loads(head_text(f"{ENG}/{rel}"))
    d["engines"] += records(eid, prefix, "gas", extra)
    counts[rel] = d
# --- FE / 385 geometry fixes (3+ sources each, in engine_specs_fordamc.json) ---
FIX = {390: (4.05, 3.784), 428: (4.132, 3.984), 429: (4.36, 3.59), 460: (4.36, 3.85)}
for rel in ("mercury/mercury_fe.json", "mercury/mercury_385.json"):
    d = counts.get(rel) or json.loads(head_text(f"{ENG}/{rel}"))
    for e in d["engines"]:
        c = round(e.get("displacement_ci") or 0)
        if c in FIX:
            b, s = FIX[c]
            if abs((e.get("bore_in") or 0) - b) > 0.006 or abs((e.get("stroke_in") or 0) - s) > 0.006:
                e["data_note"] = f'Bore/stroke corrected 2026-10-12 from {e.get("bore_in")} x {e.get("stroke_in")} to {b} x {s}.'
                e["bore_in"], e["stroke_in"] = b, s
    counts[rel] = d
for rel, d in counts.items():
    open(os.path.join(REPO, ENG, rel), "w", encoding="utf-8", newline="\n").write(dump(d))

# --- families.json (one compact entry per line, as committed) ---
raw = head_text("artifacts/engine-build/public/data/families.json")
fam = json.loads(raw)
have = {f["family_slug"] for f in fam}
for slug, entry in new_fams.items():
    if slug not in have: fam.append(entry)
for f in fam:
    for rel, d in counts.items():
        if f["family_slug"] == os.path.basename(rel)[:-5]: f["engine_count"] = len(d["engines"])
out = "[" + ", \n ".join(json.dumps(f, separators=(",", ":"), ensure_ascii=("\\u" in raw)) for f in fam) + "]"
open(os.path.join(REPO, "artifacts/engine-build/public/data/families.json"), "w", encoding="utf-8", newline="\n").write(out + ("\n" if raw.endswith("\n") else ""))

# --- private sources ---
for eid, e in ALL.items():
    open(os.path.join(SRC, eid + ".json"), "w", encoding="utf-8", newline="\n").write(json.dumps(
        {"name": e.get("name", eid), "fields": e.get("fields", {}), "variants": e.get("variants", []),
         "unverified": e.get("unverified", {}), "unverified_variants": e.get("unverified_variants", [])}, ensure_ascii=False, indent=1) + "\n")
open(os.path.join(SRC, "ford-fe-385-geometry-fixes.json"), "w", encoding="utf-8", newline="\n").write(json.dumps(
    {"name": "Ford FE 390/427/428 and 385-series 429/460 bore and stroke", "fields": {g["id"]: g for g in GEOM}}, ensure_ascii=False, indent=1) + "\n")
print("new families:", sorted(new_fams), "| updated:", sorted(counts))
