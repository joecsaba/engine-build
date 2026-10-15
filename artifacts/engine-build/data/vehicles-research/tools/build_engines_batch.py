# -*- coding: utf-8 -*-
# Engine records from an engine_specs_<job>.json research file (engine to-do work, 2026-10-15).
# Same approach as build_engines_toyota.py: one undated base record per engine, built only
# from verified fields (first pass, or second pass: two agreeing sources). The vehicle-page
# generator (vehicle_engine_records.mjs) then builds the dated pages from the vehicle rows.
#
# A stroke that only one source states may be DERIVED when the maker's own bore and
# displacement are verified: stroke = displacement / (bore^2 x pi/4 x cylinders). The record
# says so in data_note.
#
# Usage: python build_engines_batch.py <repo> <scratchpad> <job>
import json, math, os, sys
REPO, SP, JOB = sys.argv[1], sys.argv[2], sys.argv[3]
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
    for v in ("DOHC", "SOHC", "OHV", "flathead", "L-head"):
        if v.lower() in str(t or "").lower(): return "flathead" if v in ("flathead", "L-head") else v
    return None
def first_number(t):
    import re
    m = re.search(r"\d+(\.\d+)?", str(t or "")); return float(m.group()) if m else None

# job -> {research id: (manufacturer folder, family slug, family name, manufacturer name, [(engine_id, code)],
#                        derive_stroke_from_cc or None, fuel)}
PLANS = {
  "toyotanissan": {
    "toyota-f":      ("toyota", "toyota_f_series", "F-series", "Toyota", [("toyota_f", "F")], None, "gas"),
    "toyota-2f":     ("toyota", "toyota_f_series", "F-series", "Toyota", [("toyota_2f", "2F")], 4230, "gas"),
    "toyota-3f-e":   ("toyota", "toyota_f_series", "F-series", "Toyota", [("toyota_3f_e", "3F-E")], 3956, "gas"),
    "toyota-1fz-fe": ("toyota", "toyota_f_series", "F-series", "Toyota", [("toyota_1fz_fe", "1FZ-FE")], None, "gas"),
    "nissan-l24":    ("nissan", "nissan_l_series", "L-series", "Nissan", [("nissan_l24", "L24")], None, "gas"),
    "nissan-l26":    ("nissan", "nissan_l_series", "L-series", "Nissan", [("nissan_l26", "L26")], None, "gas"),
    "nissan-l28e":   ("nissan", "nissan_l_series", "L-series", "Nissan", [("nissan_l28e", "L28E")], None, "gas"),
    "nissan-l28et":  ("nissan", "nissan_l_series", "L-series", "Nissan", [("nissan_l28et", "L28ET")], None, "gas"),
  },
  "fordtruck": {
    "ford-240-six":      ("ford", "ford_big_six", "240/300 Big Six", "Ford", [("ford_240_six", "240 Six")], None, "gas"),
    "ford-300-six":      ("ford", "ford_big_six", "240/300 Big Six", "Ford", [("ford_300_six", "300 Six")], None, "gas"),
    "ford-360-fe-truck": ("ford", "ford_fe", "FE", "Ford", [("ford_360_fe_truck", "360 FE")], None, "gas"),
    "ford-4-2-essex-v6": ("ford", "ford_essex", "Essex V6", "Ford", [("ford_4_2_essex", "Essex 4.2")], None, "gas"),
    "ford-6-2-boss":     ("ford", "ford_boss_v8", "6.2 Boss V8", "Ford", [("ford_6_2_boss", "6.2 Boss")], None, "gas"),
    "ford-3-3-ti-vct":   ("ford", "ford_cyclone", "Cyclone V6", "Ford", [("ford_3_3_ti_vct", "3.3 Ti-VCT")], None, "gas"),
  },
  "gmheavy": {
    "gm-6-2-diesel": ("chevrolet", "chevrolet_gm_diesel_v8", "6.2/6.5 Diesel V8", "Chevrolet", [("gm_6_2_diesel", "6.2 diesel")], None, "diesel"),
    "gm-6-5-diesel": ("chevrolet", "chevrolet_gm_diesel_v8", "6.2/6.5 Diesel V8", "Chevrolet", [("gm_6_5_diesel", "6.5 diesel")], None, "diesel"),
    "gm-8-1-vortec": ("chevrolet", "chevrolet_vortec_8100", "Vortec 8100", "Chevrolet", [("gm_8_1_vortec", "L18")], None, "gas"),
  },
}
TURBO_CODES = {"L28ET"}

spec = {e["id"]: e for e in json.load(open(os.path.join(SP, f"engine_specs_{JOB}.json"), encoding="utf-8"))["engines"]}
files = {}
for rid, (folder, slug, fam_name, mfr, engines, derive_cc, fuel) in PLANS[JOB].items():
    e = spec[rid]; f = e.get("fields", {})
    bore, stroke, cyl = val(f, "bore_in"), val(f, "stroke_in"), val(f, "num_cylinders")
    note = None
    if stroke is None and derive_cc and bore and cyl:
        stroke_mm = derive_cc * 1000 / ((bore * 25.4) ** 2 * math.pi / 4 * cyl)
        stroke = round(stroke_mm / 25.4, 4)
        note = (f"Stroke derived from the maker's verified bore and {derive_cc} cc displacement "
                f"({stroke_mm:.1f} mm); one published source states it directly.")
    if not (bore and stroke and cyl):
        print("skip (no verified geometry):", rid); continue
    ci = round(bore * bore * stroke * math.pi / 4 * cyl, 1)
    # a rounded published bore (the 6.2 diesel's 3.98 in) puts the product a cube off the
    # maker's figure; the verified published displacement wins when it is that close
    pub_ci = val(f, "displacement_ci")
    if isinstance(pub_ci, (int, float)) and abs(pub_ci - ci) <= 1.5: ci = float(pub_ci)
    p = os.path.join(ENG, folder, slug + ".json")
    if slug not in files:
        files[slug] = (folder, json.load(open(p, encoding="utf-8")) if os.path.exists(p) else
                       {"family": fam_name, "manufacturer": mfr, "configuration": None, "engines": []})
    doc = files[slug][1]
    # a ratio that changed over the run ("8.3:1 (1975-1980); 8.8:1 (1981-1983)") stays off the base record
    crt = str(val(f, "compression_ratio") or "")
    cr = first_number(crt) if crt and ";" not in crt and "(" not in crt else None  # "(1987-1996 EFI)": not the whole run
    for eid, code in engines:
        doc["engines"] = [x for x in doc["engines"] if x.get("engine_id") != eid]
        r = {"engine_id": eid, "year": None, "displacement_ci": ci, "displacement_l": val(f, "displacement_l"),
             "num_cylinders": cyl, "bore_in": bore, "stroke_in": stroke, "rod_length_in": None,
             "compression_ratio": cr, "advertised_hp": None, "fuel_type": fuel, "firing_order": val(f, "firing_order"),
             "block_material": material(val(f, "block_material")), "head_material": material(val(f, "head_material")),
             "valvetrain": valvetrain(val(f, "valvetrain")), "nhra_verified": False, "vehicles": None,
             "variants": [{"code": code, "description": None}], "head": None, "clearances": None, "torque_specs": None}
        if code in TURBO_CODES: r["induction"] = "turbocharged"
        if note: r["data_note"] = note
        doc["engines"].append(r)
        print(f"{eid}: {bore} x {stroke} in, {ci} ci, cr {cr}")

for slug, (folder, doc) in files.items():
    os.makedirs(os.path.join(ENG, folder), exist_ok=True)
    open(os.path.join(ENG, folder, slug + ".json"), "w", encoding="utf-8", newline="\n").write(dump(doc))

raw = open(FAMS, encoding="utf-8").read(); fam = json.loads(raw)
have = {x["family_slug"]: x for x in fam}
for slug, (folder, doc) in files.items():
    if slug in have: have[slug]["engine_count"] = len(doc["engines"])
    else: fam.append({"family_slug": slug, "manufacturer_slug": folder, "manufacturer_name": doc["manufacturer"],
                      "family_name": doc["family"], "configuration": None, "engine_count": len(doc["engines"])})
esc = chr(92) + "u"
out = "[" + ", \n ".join(json.dumps(x, separators=(",", ":"), ensure_ascii=(esc in raw)) for x in fam) + "]"
open(FAMS, "w", encoding="utf-8", newline="\n").write(out + ("\n" if raw.endswith("\n") else ""))

os.makedirs(SRC, exist_ok=True)
for rid in PLANS[JOB]:
    e = spec[rid]
    open(os.path.join(SRC, rid + ".json"), "w", encoding="utf-8", newline="\n").write(json.dumps(
        {"name": e.get("name", rid), "fields": e.get("fields", {}), "variants": e.get("variants", []),
         "unverified": e.get("unverified", {})}, ensure_ascii=False, indent=1) + "\n")
print("families:", ", ".join(f"{s} ({len(d['engines'])})" for s, (_, d) in files.items()))
