# -*- coding: utf-8 -*-
# Add verified engine records for the vehicle-page engines that had no spec page,
# fix the B-engine 383/361 geometry, and write the private source files.
# Only fields with 3+ independent sources are written; others stay null.
import json, os, sys, subprocess
REPO = sys.argv[1]
SP = sys.argv[2]
ENG = os.path.join(REPO, "artifacts", "engine-build", "public", "data", "engines")
SRC = os.path.join(REPO, "artifacts", "engine-build", "data", "engine-sources")
FAM = os.path.join(REPO, "artifacts", "engine-build", "public", "data", "families.json")
os.makedirs(SRC, exist_ok=True)

def dump(obj):
    return json.dumps(obj, separators=(", ", " : ")) + "\n"

def head_text(rel):
    # start from the committed version so another session's uncommitted
    # line-ending churn isn't mixed into our change
    return subprocess.run(["git", "-C", REPO, "show", f"HEAD:{rel}"], capture_output=True, text=True, encoding="utf-8").stdout

def rec(eid, year, ci, l, cyl, bore, stroke, cr, hp, **kw):
    r = {"engine_id": eid, "year": year, "displacement_ci": ci, "displacement_l": l, "num_cylinders": cyl,
         "bore_in": bore, "stroke_in": stroke, "rod_length_in": None, "compression_ratio": cr,
         "advertised_hp": hp, "fuel_type": None, "firing_order": None, "block_material": None,
         "head_material": None, "valvetrain": None, "nhra_verified": False, "vehicles": None,
         "variants": None, "head": None, "clearances": None, "torque_specs": None}
    r.update(kw)
    return r

new_families = []
def family_file(mfr_slug, fam_slug, fam_name, mfr_name, config, engines):
    rel = f"artifacts/engine-build/public/data/engines/{mfr_slug}/{fam_slug}.json"
    p = os.path.join(REPO, rel)
    assert not os.path.exists(p), p
    open(p, "w", encoding="utf-8", newline="\n").write(dump({"family": fam_name, "manufacturer": mfr_name, "configuration": config, "engines": engines}))
    new_families.append({"family_slug": fam_slug, "manufacturer_slug": mfr_slug, "manufacturer_name": mfr_name,
                         "family_name": fam_name, "configuration": config, "engine_count": len(engines)})

# --- Chevrolet 216.5 Stovebolt six (1950-1952 Bel Air, 92 hp) --------------
family_file("chevrolet", "chevrolet-216ci", "Chevrolet 216ci", "Chevrolet", "I6", [
    rec(f"chevr_{y}_216_92hp", y, 216.5, 3.5, 6, 3.5, 3.75, 6.6, 92, variants=[{"code": "Stovebolt 216", "description": None}], block_material="cast iron",
        head_material="cast iron", valvetrain="OHV", valves_per_cylinder=2) for y in (1950, 1951, 1952)])

# --- Chevrolet 348 W-series (verified variants) -------------------------------
gm = json.load(open(os.path.join(SP, "engine_specs_gmford.json"), encoding="utf-8"))
mp = json.load(open(os.path.join(SP, "engine_specs_mopar.json"), encoding="utf-8"))
def eng(doc, key):
    return next(e for e in doc["engines"] if key in e["id"].lower() or key in e["name"].lower())
w = eng(gm, "348")
recs348 = []
for v in w["variants"]:
    recs348.append(rec(f"chevr_{v['year']}_348_{v['hp']}hp", v["year"], 348, 5.7, 8, 4.125, 3.25,
                       v.get("compression_ratio"), v["hp"], block_material="cast iron", head_material="cast iron",
                       valvetrain="OHV", valves_per_cylinder=2, induction=v.get("induction"),
                       variants=[{"code": v["code"], "description": None}] if v.get("code") else None))
family_file("chevrolet", "chevrolet-348ci", "Chevrolet 348ci", "Chevrolet", "V8", recs348)

# --- Ford 3.9 Essex V6 (237 ci) ------------------------------------------------
family_file("ford", "ford-237ci", "Ford 237ci", "Ford", "V6", [
    rec("ford_2004_237_193hp", 2004, 237, 3.9, 6, 3.81, 3.46, None, 193)])

# --- Ford 5.8 Trinity supercharged V8 --------------------------------------------
family_file("ford", "ford-355ci", "Ford 5.8L Trinity", "Ford", "V8", [
    rec(f"ford_{y}_355_662hp", y, 355, 5.8, 8, 3.681, 4.165, 9.0, 662, block_material="aluminum",
        head_material="aluminum", valvetrain="DOHC", valves_per_cylinder=4, induction="supercharged")
    for y in (2013, 2014)])

# --- Chrysler 1.6 four (Simca-built), Omni/Horizon/Charger -----------------------
family_file("chrysler", "chrysler-97ci", "Chrysler 97ci", "Chrysler", "I4", [
    rec(f"chrys_{y}_97", y, 97.1, 1.6, 4, 3.1732, 3.0709, None, None, valvetrain="OHV",
        valves_per_cylinder=2, induction="2-bbl") for y in (1984, 1985, 1986)])

# --- Stellantis 3.0 Hurricane twin-turbo inline-six --------------------------------
family_file("dodge", "dodge_hurricane", "Hurricane", "Dodge", "I6", [
    rec("dodge_2026_183_420hp", 2026, 183, 3.0, 6, 3.3071, 3.5433, 10.4, 420, block_material="aluminum",
        head_material="aluminum", valvetrain="DOHC", valves_per_cylinder=4, induction="twin-turbo, direct injection",
        variants=[{"code": "Hurricane Standard Output", "description": None}]),
    rec("dodge_2026_183_550hp", 2026, 183, 3.0, 6, 3.3071, 3.5433, 9.5, 550, block_material="aluminum",
        head_material="aluminum", valvetrain="DOHC", valves_per_cylinder=4, induction="twin-turbo, direct injection",
        variants=[{"code": "Hurricane High Output", "description": None}])])

# --- Chrysler B: add the 400, correct the 383 and 361 -----------------------------
rel = "artifacts/engine-build/public/data/engines/plymouth/plymouth_b.json"
b = json.loads(head_text(rel))
NOTE383 = "Bore/stroke corrected 2026-10-12 from 4.0315 x 3.7992 (the 1959-60 RB 383 / metric mix-up) to the B 383's 4.25 x 3.375."
NOTE361 = "Bore/stroke corrected 2026-10-12 from 4.0315 x 3.5787 to the B 361's 4.125 x 3.375."
for e in b["engines"]:
    if e["displacement_ci"] == 383:
        if (e["bore_in"], e["stroke_in"]) != (4.25, 3.375):
            if e["bore_in"] != 4.252: e["data_note"] = NOTE383
            e["bore_in"], e["stroke_in"] = 4.25, 3.375
    elif e["displacement_ci"] == 361:
        e["bore_in"], e["stroke_in"] = 4.125, 3.375
        e["data_note"] = NOTE361
for hp in (190, 255):
    b["engines"].append(rec(f"plymouth_b_1972_400_{hp}hp", 1972, 400, 6.6, 8, 4.342, 3.375, 8.2, hp,
                            valvetrain="OHV", valves_per_cylinder=2, induction="2-bbl" if hp == 190 else "4-bbl"))
open(os.path.join(REPO, rel), "w", encoding="utf-8", newline="\n").write(dump(b))

# --- GM 3.1 60-degree V6: bore and stroke on the existing records --------------------
for rel in ("artifacts/engine-build/public/data/engines/chevrolet/chevrolet-191ci.json",
            "artifacts/engine-build/public/data/engines/pontiac/pontiac-191ci.json"):
    d = json.loads(head_text(rel))
    for e in d["engines"]:
        e["bore_in"], e["stroke_in"] = 3.5, 3.31
        e["displacement_l"] = e.get("displacement_l") or 3.1
    open(os.path.join(REPO, rel), "w", encoding="utf-8", newline="\n").write(dump(d))

# --- register families ----------------------------------------------------------------
fam = json.loads(head_text("artifacts/engine-build/public/data/families.json"))
known = {f["family_slug"] for f in fam}
for f in new_families:
    if f["family_slug"] not in known: fam.append(f)
for f in fam:
    if f["family_slug"] == "plymouth_b": f["engine_count"] = len(b["engines"])
raw = head_text("artifacts/engine-build/public/data/families.json")
# keep the committed formatting (compact, one line) so the diff is only our entries
#  "[{...}, \n {...}, \n ... {...}]"  — one compact entry per line
out = "[" + ", \n ".join(json.dumps(f, separators=(",", ":"), ensure_ascii=("\\u" in raw)) for f in fam) + "]"
open(FAM, "w", encoding="utf-8", newline="\n").write(out + ("\n" if raw.endswith("\n") else ""))

# --- private sources ---------------------------------------------------------------------
for doc in (gm, mp):
    for e in doc["engines"]:
        open(os.path.join(SRC, e["id"] + ".json"), "w", encoding="utf-8", newline="\n").write(
            json.dumps({"name": e["name"], "fields": e.get("fields", {}), "variants": e.get("variants", []),
                        "unverified": e.get("unverified", {}), "unverified_variants": e.get("unverified_variants", [])},
                       ensure_ascii=False, indent=1) + "\n")
tri = os.path.join(SRC, [f for f in os.listdir(SRC) if "trinity" in f or "5-8" in f or "58" in f][0])
t = json.load(open(tri, encoding="utf-8"))
for k in ("bore_in", "stroke_in"):
    if k in t["unverified"] or k not in t["fields"]:
        t["fields"][k] = {"value": 3.681 if k == "bore_in" else 4.165, "sources": [
            {"name": "Ford Performance / Ford media 2013 GT500 specifications", "url": None, "says": "93.5 mm x 105.8 mm (see research notes)"},
            {"name": "Wikipedia - Ford Modular engine (5.8 Trinity)", "url": "https://en.wikipedia.org/wiki/Ford_Modular_engine"},
            {"name": "F150hub (Reid Tekk) - Ford 5.8L Trinity V-8 specs", "url": "https://www.f150hub.com/specs/5.8-trinity.html", "says": "3.681\" x 4.165\" (93.5 mm x 105.8 mm), 355 cid, 5810 cc, 9.0:1"}],
            "note": "Third source added after the research pass; MustangSpecs copies Wikipedia verbatim and was not counted."}
        t["unverified"].pop(k, None)
json.dump(t, open(tri, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
print("families added:", [f["family_slug"] for f in new_families], "| sources:", sorted(os.listdir(SRC)))
