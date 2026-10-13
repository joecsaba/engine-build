# -*- coding: utf-8 -*-
# Apply the 2026-10-13 geometry audit (user decision: hide wrong figures until verified).
#   - a correction with 3+ independent sources is applied
#   - where only the stated displacement is wrong, it is recomputed from the record's own bore x stroke
#   - every other provably wrong bore/stroke is hidden (set to null) until verified
#   - the GMC-filed "Buick V8" family (all records wrong, engines GMC never used) and the
#     made-up Northstar "LK8" record are removed
# Works from HEAD content of each touched file, so it can be re-run as sources arrive.
import json, os, re, sys, glob, subprocess, math
from urllib.parse import urlparse
REPO, SP = sys.argv[1], sys.argv[2]
ENG_REL = "artifacts/engine-build/public/data/engines"
ENG = os.path.join(REPO, ENG_REL)

def head(rel):
    r = subprocess.run(["git", "-C", REPO, "show", f"HEAD:{ENG_REL}/{rel}"], capture_output=True, text=True, encoding="utf-8")
    return json.loads(r.stdout) if r.returncode == 0 else json.load(open(os.path.join(ENG, rel), encoding="utf-8"))

MAKER = re.compile(r"^(GM|General Motors)\b|\(GM\)|GM:|Buick AMA|AMA spec|Sales Album|sales manual|brochure|factory|"
                   r"chevrolet\.com|cadillac|media\.gm|Chrysler (Corp|historical)|Mopar|Ford (Motor|media)|press release", re.I)
def publisher(s):
    name, url = s.get("name") or "", s.get("url") or ""
    t = f"{name} {url}"
    if "wikipedia" in t.lower(): return "wikipedia"
    if re.search(r"\bNHRA\b", t): return "nhra"
    if MAKER.search(name) or re.search(r"(gm|chevrolet|cadillac|buick|pontiac|chevy)\.com/(?!.*(blog|forum))", url) and "gmauthority" not in url:
        return "maker"
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return host or name.lower()

def key(name):  # "Pontiac 400", "Chevrolet 396 big-block" -> ("pontiac", "400")
    m = re.match(r"\s*([A-Za-z]+)\D*?(\d{3}(?:\.\d)?)", name or "")
    return (m.group(1).lower(), m.group(2)) if m else (name.lower(), "")

fixes = []
for fn in ("geometry_fixes_buick.json", "geometry_fixes_gm.json", "geometry_fixes_other.json"):
    for e in json.load(open(os.path.join(SP, fn), encoding="utf-8")):
        e["_file"] = fn; fixes.append(e)
extra = {}
for fn in sorted(glob.glob(os.path.join(SP, "geo_gm_helper*.json")) + glob.glob(os.path.join(SP, "geo_gm_sources_*.json"))):
    d = json.load(open(fn, encoding="utf-8"))
    for k, v in d.items():
        if k.startswith("_") or not isinstance(v, list): continue
        extra.setdefault(k, []).extend(x for x in v if isinstance(x, dict) and x.get("url"))
for f in fixes:
    srcs = list(f.get("sources") or [])
    fk = key(f["engine"])
    for k, v in extra.items():
        if k == f["engine"] or (key(k) == fk and fk[1]):
            # the two Olds 400s share a key; keep year-specific sources apart
            if "400" in fk and ("1965" in k) != ("1965" in f["engine"]) and ("1968" in k) != ("1968" in f["engine"]): continue
            srcs += v
    f["_sources"] = srcs
    f["_n"] = len({publisher(s) for s in srcs})

page = json.load(open(os.path.join(SP, "page_records.json"), encoding="utf-8"))
log, actions = [], {}   # engine_id -> action
for f in fixes:
    fw = (f.get("field_wrong") or "").lower()
    # the Buick file lists every Buick-family record; only its "wrong_urls" need action
    urls = set(f.get("wrong_urls") or []) if f["_file"] == "geometry_fixes_buick.json" else set(f.get("applies_to_urls") or [])
    if "LGX" in f["engine"]:  # the same record is also filed under Buick
        urls |= {"/engines/buick/gm-high-feature-v6/36-v6-lgx", "/engines/buick/high-feature-v6/lgx"}
    ids = [i for u in urls for i in page.get(u, {}).get("ids", [])]
    if not ids: continue
    # nothing wrong (genuinely square, rounding)
    if re.search(r"\bok\b|ok_square|square|^none|^rounding", fw):
        continue
    # only the cylinder count is wrong: correct it when verified, otherwise leave the record alone
    if fw.strip() == "cylinders":
        if f["_n"] < 3 or not f.get("num_cylinders"): continue
        act = ("fix", f)
    elif fw.strip() == "displacement":
        act = ("recompute", None)
    elif "different engine" in fw or "bogus" in (f.get("note") or "").lower():
        act = ("hide", None)
    elif f["_n"] >= 3 and f.get("bore_in") and f.get("stroke_in"):
        act = ("fix", f)
    else:
        act = ("hide", None)
    for i in ids:
        actions[i] = act
    log.append({"engine": f["engine"], "sources": f["_n"], "action": act[0], "urls": sorted(urls)})

changed = {}
for path in glob.glob(os.path.join(ENG, "*", "*.json")):
    rel = os.path.relpath(path, ENG).replace("\\", "/")
    if rel == "gmc/gmc_buick_v8.json": continue
    d = None
    for e in json.load(open(path, encoding="utf-8"))["engines"]:
        if e.get("engine_id") in actions: d = head(rel); break
    if d is None: continue
    for e in d["engines"]:
        a = actions.get(e.get("engine_id"))
        if not a: continue
        kind, f = a
        b0, s0 = e.get("bore_in"), e.get("stroke_in")
        if kind == "fix":
            e["bore_in"], e["stroke_in"] = f["bore_in"], f["stroke_in"]
            if f.get("num_cylinders"): e["num_cylinders"] = f["num_cylinders"]
            if f.get("displacement_ci"): e["displacement_ci"] = f["displacement_ci"]
            e["data_note"] = f"Bore/stroke corrected 2026-10-13 from {b0} x {s0} to {f['bore_in']} x {f['stroke_in']}."
        elif kind == "recompute" and b0 and s0 and e.get("num_cylinders"):
            ci = round(math.pi / 4 * b0 * b0 * s0 * e["num_cylinders"], 1)
            e["data_note"] = f"Displacement corrected 2026-10-13 from {e.get('displacement_ci')} to {ci} ci (bore x stroke x cylinders)."
            e["displacement_ci"] = ci
        elif kind == "hide":
            e["bore_in"], e["stroke_in"] = None, None
            e["data_note"] = "Bore and stroke withheld 2026-10-13: the published figures were inconsistent and are being re-verified."
    if rel == "cadillac/cadillac_northstar.json":
        d["engines"] = [e for e in d["engines"] if "lk8" not in json.dumps(e).lower()]
    changed[rel] = d

if any("lk8" in json.dumps(e).lower() for e in head("cadillac/cadillac_northstar.json")["engines"]) and "cadillac/cadillac_northstar.json" not in changed:
    d = head("cadillac/cadillac_northstar.json")
    d["engines"] = [e for e in d["engines"] if "lk8" not in json.dumps(e).lower()]
    changed["cadillac/cadillac_northstar.json"] = d

for rel, d in changed.items():
    open(os.path.join(ENG, rel), "w", encoding="utf-8", newline="\n").write(json.dumps(d, separators=(", ", " : ")) + "\n")

# drop the GMC-filed Buick V8 family
gp = os.path.join(ENG, "gmc", "gmc_buick_v8.json")
if os.path.exists(gp): os.remove(gp)

fp = os.path.join(REPO, "artifacts/engine-build/public/data/families.json")
raw = open(fp, encoding="utf-8").read()
fam = [f for f in json.loads(raw) if f["family_slug"] != "gmc_buick_v8"]
for f in fam:
    rel = f'{f["manufacturer_slug"]}/{f["family_slug"]}.json'
    if rel in changed: f["engine_count"] = len(changed[rel]["engines"])
out = "[" + ", \n ".join(json.dumps(f, separators=(",", ":"), ensure_ascii=("\\u" in raw)) for f in fam) + "]"
open(fp, "w", encoding="utf-8", newline="\n").write(out + ("\n" if raw.endswith("\n") else ""))

json.dump({"date": "2026-10-13", "fixes": [{k: v for k, v in f.items() if not k.startswith("_") or k in ("_sources", "_n")} for f in fixes], "log": log},
          open(os.path.join(REPO, "artifacts/engine-build/data/engine-sources/geometry-audit-2026-10-13.json"), "w", encoding="utf-8", newline="\n"),
          ensure_ascii=False, indent=1)
from collections import Counter
print("actions:", Counter(a[0] for a in actions.values()), "| files:", len(changed))
for l in log: print(f'  {l["action"]:9} {l["sources"]}  {l["engine"]}')
