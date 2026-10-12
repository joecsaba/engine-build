# -*- coding: utf-8 -*-
# NHRA + EPA extracts for one model's research job.
# Usage: python extract_model.py <scratchpad> <job> <make> <nhra_regex> <epa_regex> <years like 1964-1967,1973-1977>
import json, sys, re, collections, csv, io, zipfile, os
sys.stdout.reconfigure(encoding="utf-8")
SP, job, make, nrx, erx, spans = sys.argv[1:7]
ranges = [tuple(map(int, s.split("-"))) for s in spans.split(",")]
inr = lambda y: any(a <= y <= b for a, b in ranges)

d = json.load(open(os.path.join(SP, "scc_rows.json"), encoding="utf-8"))
out = collections.OrderedDict()
for x in sorted(d, key=lambda x: x["year"]):
    if x["make"] == make and inr(x["year"]) and re.search(nrx, x["model"], re.I):
        m = out.setdefault(x["year"], {}).setdefault(x["model"].strip(), {})
        k = f'{x["cid"]} ci / {int(x["hp"]) if x["hp"] else "?"} hp'
        m.setdefault(k, set()).add(x["fam"] or "")
nh = {y: {mo: {k: sorted(v) for k, v in e.items()} for mo, e in ms.items()} for y, ms in out.items()}
json.dump(nh, open(os.path.join(SP, f"nhra_{job}.json"), "w", encoding="utf-8"), indent=1)

z = zipfile.ZipFile(os.path.join(SP, "vehicles.csv.zip"))
ep = collections.defaultdict(set)
emake = {"AMC": "AMC"}.get(make, make)
for r in csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8", errors="replace")):
    if r["make"] == emake and re.search(erx, r["model"], re.I) and inr(int(r["year"])):
        ep[int(r["year"])].add((r["displ"], r["cylinders"], r["tCharger"] or "", r["sCharger"] or "", r["model"], r["eng_dscr"]))
json.dump({y: sorted(map(list, v)) for y, v in sorted(ep.items())}, open(os.path.join(SP, f"epa_{job}.json"), "w", encoding="utf-8"), indent=1)
print(f"{job}: NHRA years {sorted(nh)[:1]}..{sorted(nh)[-1:]} ({len(nh)} yrs, headings {sum(len(v) for v in nh.values())}); EPA {len(ep)} yrs")
