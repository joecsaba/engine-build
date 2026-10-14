# -*- coding: utf-8 -*-
# Toyota engine records from engine_specs_toyota.json (batch 5, 2026-10-13).
# One undated base record per engine, built only from fields with 2+ agreeing sources
# (fields with fewer sit under "unverified" in the research and are left out). The
# vehicle-page generator (vehicle_engine_records.mjs) then builds the dated pages.
# Also fixes three existing displacements that disagree with their own bore x stroke.
# Usage: python build_engines_toyota.py <repo> <scratchpad>
import json, os, re, sys, subprocess
REPO, SP = sys.argv[1], sys.argv[2]
ENG = os.path.join(REPO, "artifacts/engine-build/public/data/engines")
FAMS = os.path.join(REPO, "artifacts/engine-build/public/data/families.json")
SRC = os.path.join(REPO, "artifacts/engine-build/data/engine-sources")

def dump(o): return json.dumps(o, separators=(", ", " : ")) + "\n"
def val(f, k):
    v = f.get(k); return v.get("value") if isinstance(v, dict) else v
def material(t):
    t = str(t or "").lower()
    return "aluminum" if "alumin" in t else "cast iron" if "iron" in t else None
def valvetrain(t):
    for v in ("DOHC", "SOHC", "OHV"):
        if v in str(t or ""): return v
    return None

SPEC = {e["id"]: e for e in json.load(open(os.path.join(SP, "engine_specs_toyota.json"), encoding="utf-8"))["engines"]}
# research id -> (family file, family name, [(engine_id, code)])
PLAN = {
  "toyota-3vz-e":  ("toyota_3vz", "3VZ", [("toyota_3vz_e", "3VZ-E")]),
  "toyota-2tr-fe": ("toyota_tr", "TR", [("toyota_2tr_fe", "2TR-FE")]),
  "toyota-3rz-fe": ("toyota_rz", "RZ", [("toyota_3rz_fe", "3RZ-FE")]),
  "toyota-2rz-fe": ("toyota_rz", "RZ", [("toyota_2rz_fe", "2RZ-FE")]),
  "toyota-5m":     ("toyota_m", "M", [("toyota_5m_e", "5M-E"), ("toyota_5m_ge", "5M-GE")]),
  "toyota-7m":     ("toyota_m", "M", [("toyota_7m_ge", "7M-GE"), ("toyota_7m_gte", "7M-GTE")]),
  "toyota-18r-c":  ("toyota_r", "R", [("toyota_18r_c", "18R-C")]),
  "toyota-20r":    ("toyota_r", "R", [("toyota_20r", "20R")]),
  "toyota-2gr-fks": ("toyota_gr_v6", "GR V6", [("toyota_2gr_fks", "2GR-FKS")]),
}
TURBO = {"7M-GTE"}

def record(eid, code, f):
    bore, stroke, cyl = val(f, "bore_in"), val(f, "stroke_in"), val(f, "num_cylinders")
    assert bore and stroke and cyl, eid
    ci = round(bore * bore * stroke * 0.785398 * cyl, 1)
    r = {"engine_id": eid, "year": None, "displacement_ci": ci, "displacement_l": val(f, "displacement_l"),
         "num_cylinders": cyl, "bore_in": bore, "stroke_in": stroke, "rod_length_in": None,
         "compression_ratio": None, "advertised_hp": None, "fuel_type": "gas", "firing_order": None,
         "block_material": material(val(f, "block_material")), "head_material": material(val(f, "head_material")),
         "valvetrain": valvetrain(val(f, "valvetrain")), "nhra_verified": False, "vehicles": None,
         "variants": [{"code": code, "description": None}], "head": None, "clearances": None, "torque_specs": None}
    if code == "5M-GE": r["valvetrain"] = "DOHC"
    if code == "5M-E": r["valvetrain"] = "SOHC"
    if code in TURBO: r["induction"] = "turbocharged"
    return r

files = {}
for rid, (slug, name, engines) in PLAN.items():
    p = os.path.join(ENG, "toyota", slug + ".json")
    if slug not in files:
        files[slug] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else \
            {"family": name, "manufacturer": "Toyota", "configuration": None, "engines": []}
    doc = files[slug]
    for eid, code in engines:
        doc["engines"] = [e for e in doc["engines"] if e.get("engine_id") != eid]  # idempotent
        doc["engines"].append(record(eid, code, SPEC[rid]["fields"]))

# displacement fixes: the stored figure disagrees with bore x stroke and the published cc
FIX = {("toyota_5vz", "toyota_5vz_fe"): 206.1,   # 93.5 x 82 mm x 6 = 3,378 cc
       ("toyota_gr_v6", None): {241.5: 241.4, 210: 210.9},  # 1GR 3,956 cc; 2GR 3,456 cc
       ("toyota_uz_v8", None): {284: 284.6}}     # 2UZ 4,664 cc
for (slug, eid), new in FIX.items():
    p = os.path.join(ENG, "toyota", slug + ".json")
    doc = files.get(slug) or json.load(open(p, encoding="utf-8")); files[slug] = doc
    for e in doc["engines"]:
        old = e.get("displacement_ci")
        to = new if eid and e.get("engine_id") == eid else new.get(old) if isinstance(new, dict) else None
        if to and old != to:
            e["displacement_ci"] = to
            e["data_note"] = f"Displacement corrected 2026-10-13 from {old} to {to} ci (bore x stroke)."

for slug, doc in files.items():
    open(os.path.join(ENG, "toyota", slug + ".json"), "w", encoding="utf-8", newline="\n").write(dump(doc))

raw = open(FAMS, encoding="utf-8").read()
fam = json.loads(raw)
have = {f["family_slug"]: f for f in fam}
for slug, doc in files.items():
    if slug in have: have[slug]["engine_count"] = len(doc["engines"])
    else: fam.append({"family_slug": slug, "manufacturer_slug": "toyota", "manufacturer_name": "Toyota",
                      "family_name": doc["family"], "configuration": None, "engine_count": len(doc["engines"])})
out = "[" + ", \n ".join(json.dumps(f, separators=(",", ":"), ensure_ascii=("\\u" in raw)) for f in fam) + "]"
open(FAMS, "w", encoding="utf-8", newline="\n").write(out + ("\n" if raw.endswith("\n") else ""))

os.makedirs(SRC, exist_ok=True)
for rid, e in SPEC.items():
    open(os.path.join(SRC, rid + ".json"), "w", encoding="utf-8", newline="\n").write(json.dumps(
        {"name": e.get("name", rid), "fields": e.get("fields", {}), "unverified": e.get("unverified", {})},
        ensure_ascii=False, indent=1) + "\n")
print("families:", ", ".join(f"{s} ({len(d['engines'])})" for s, d in files.items()))
