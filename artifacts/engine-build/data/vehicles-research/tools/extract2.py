# -*- coding: utf-8 -*-
# NHRA + EPA extracts for batch-4 jobs, where NHRA and EPA file a model under different
# makes (a 2011+ Ram is "Ram" to the EPA and "Dodge" to NHRA).
# Usage: python extract2.py <scratchpad>   (jobs are listed below)
import json, sys, re, collections, csv, io, zipfile, os
sys.stdout.reconfigure(encoding="utf-8")
SP = sys.argv[1]
ONLY = sys.argv[2:]

# job: (nhra make regex, nhra model regex or None, epa make regex, epa model regex, years)
JOBS = {
  "jeep-cj-1945-1986": (None, None, r"^(Jeep|AMC)$", r"^CJ|Scrambler", "1945-1986"),
  "jeep-wrangler-1987-2006": (None, None, r"^Jeep$", r"Wrangler", "1987-2006"),
  "jeep-wrangler-2007-2026": (None, None, r"^Jeep$", r"Wrangler", "2007-2026"),
  "jeep-cherokee": (None, None, r"^Jeep$", r"^Cherokee(?!/Wagoneer)", "1974-1983,1984-2001,2014-2023"),
  "jeep-grand-cherokee-1993-2010": (r"^Dodge$", r"^JEEP$", r"^Jeep$", r"Grand Cherokee", "1993-2010"),
  "jeep-grand-cherokee-2011-2026": (r"^Dodge$", r"^JEEP$", r"^Jeep$", r"Grand Cherokee", "2011-2026"),
  "jeep-wagoneer-1963-1991": (None, None, r"^Jeep$", r"Wagoneer", "1963-1991"),
  "jeep-gladiator": (None, None, r"^Jeep$", r"Gladiator", "1963-1971,2020-2026"),
  "chevrolet-ck-1960-1972": (r"^Chevrolet$", r"PICKUP|C1500|Truck", r"^Chevrolet$", r"^[CK](10|15)|^[CK]1500", "1960-1972"),
  "chevrolet-ck-1973-1987": (r"^Chevrolet$", r"PICKUP|C1500|Truck", r"^Chevrolet$", r"^[CKR]10 Pickup|^R10", "1973-1987"),
  "chevrolet-ck-1988-1998": (r"^Chevrolet$", r"PICKUP|C1500|Truck", r"^Chevrolet$", r"^[CK]1500 Pickup", "1988-1998"),
  "chevrolet-silverado-1999-2013": (r"^Chevrolet$", r"PICKUP|C1500|Truck|SILVERADO", r"^Chevrolet$", r"^Silverado(?!.*(2500|3500|EV|Cab Chassis))", "1999-2013"),
  "chevrolet-silverado-2014-2026": (r"^Chevrolet$", r"PICKUP|C1500|Truck|SILVERADO", r"^Chevrolet$", r"^Silverado(?!.*(2500|3500|Cab Chassis))", "2014-2026"),
  "ford-f100-1953-1983": (r"^Ford$", r"F-1|F1", r"^Ford$", r"^F100", "1953-1983"),
  "ford-f150-1975-1996": (r"^Ford$", r"F-150|F150|LIGHTNING", r"^Ford$", r"F150|Lightning", "1975-1996"),
  "ford-f150-1997-2014": (r"^Ford$", r"F-150|F150|LIGHTNING", r"^Ford$", r"F150|Lightning", "1997-2014"),
  "ford-f150-2015-2026": (r"^Ford$", r"F-150|F150|LIGHTNING", r"^Ford$", r"F-?150", "2015-2026"),
  "dodge-dseries-1961-1993": (r"^Dodge$", r"^D1|^RAM$", r"^Dodge$", r"^[DW]100|^[DW]150", "1961-1993"),
  "dodge-ram-1500-1994-2008": (r"^Dodge$", r"^RAM$|D1500", r"^Dodge$", r"^Ram 1500", "1994-2008"),
  "ram-1500-2009-2026": (r"^Dodge$", r"^RAM$|D1500", r"^(Dodge|Ram)$", r"^(Ram )?1500", "2009-2026"),
  # wave 2 (2026-10-13)
  "chevrolet-s10-1982-2004": (r"^Chevrolet$", r"S-10", r"^Chevrolet$", r"^S10 Pickup|^T10 \(S10\) Pickup", "1982-2004"),
  "chevrolet-blazer-k5-1969-1994": (r"^Chevrolet$", r"BLAZER", r"^Chevrolet$", r"^(K5|K10|K1500|C10|V10)?.*Blazer(?!.*S10)", "1969-1994"),
  "ford-ranger-1983-2012": (r"^Ford$", r"^RANGER$", r"^Ford$", r"^Ranger Pickup", "1983-2012"),
  "ford-ranger-2019-2026": (r"^Ford$", r"^RANGER$", r"^Ford$", r"^Ranger", "2019-2026"),
  "ford-bronco-1966-1996": (r"^Ford$", r"BRONCO", r"^Ford$", r"^Bronco(?! II)", "1966-1996"),
  "ford-bronco-2021-2026": (None, None, r"^Ford$", r"^Bronco(?! Sport)", "2021-2026"),
  "dodge-dakota-1987-2011": (r"^Dodge$", r"^DAKOTA$", r"^(Dodge|Ram)$", r"Dakota", "1987-2011"),
  "jeep-jseries-1972-1988": (None, None, r"^(Jeep|AMC)$", r"^J10|^J20|Pickup(?!.*Comanche)", "1972-1988"),
  "jeep-comanche-1986-1992": (None, None, r"^Jeep$", r"Comanche", "1986-1992"),
}

def spans(s):
    r = [tuple(map(int, x.split("-"))) for x in s.split(",")]
    return lambda y: any(a <= y <= b for a, b in r)

rows = json.load(open(os.path.join(SP, "scc_rows.json"), encoding="utf-8"))
z = zipfile.ZipFile(os.path.join(SP, "vehicles.csv.zip"))
epa_rows = list(csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8", errors="replace")))

for job, (nmk, nmo, emk, emo, yrs) in JOBS.items():
    if ONLY and job not in ONLY: continue
    inr = spans(yrs)
    out = collections.OrderedDict()
    if nmk:
        for x in sorted(rows, key=lambda x: x["year"]):
            if re.search(nmk, x["make"]) and inr(x["year"]) and re.search(nmo, x["model"].strip(), re.I):
                m = out.setdefault(x["year"], {}).setdefault(x["model"].strip(), {})
                k = f'{x["cid"]} ci / {int(x["hp"]) if x["hp"] else "?"} hp'
                m.setdefault(k, set()).add(x["fam"] or "")
    nh = {y: {mo: {k: sorted(v) for k, v in e.items()} for mo, e in ms.items()} for y, ms in out.items()}
    json.dump(nh, open(os.path.join(SP, f"nhra_{job}.json"), "w", encoding="utf-8"), indent=1)
    ep = collections.defaultdict(set)
    for r in epa_rows:
        if re.search(emk, r["make"]) and re.search(emo, r["model"]) and inr(int(r["year"])):
            ep[int(r["year"])].add((r["displ"], r["cylinders"], r["tCharger"] or "", r["sCharger"] or "", r["model"], r["eng_dscr"], r["atvType"] or ""))
    json.dump({y: sorted(map(list, v)) for y, v in sorted(ep.items())}, open(os.path.join(SP, f"epa_{job}.json"), "w", encoding="utf-8"), indent=1)
    print(f"{job}: NHRA {len(nh)} yrs ({sum(len(v) for v in nh.values())} headings); EPA {len(ep)} yrs, {sum(len(v) for v in ep.values())} rows")
