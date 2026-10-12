# -*- coding: utf-8 -*-
# verify_*.json (research output) + a curation spec -> data/vehicles/<make>/<model>.json.
# Usage: python to_vehicle.py <scratchpad> <out_dir> <spec.json>
#
# spec keys:
#   make, model, makeSlug, slug, draft, title, description, intro[], generations[{key,name,years,intro[]}]
#   files[]                     verify files to merge
#   notes{key: text}            public note per entry, key "year|cid|hp"
#   include[key]                disputed entries the curator resolved (engine offered per 3+ sources;
#                               the rating shown is the factory figure) — put on the page
#   nhra_lists[key]             NHRA lists this engine that year at a different rating: counts for existence
#   exclude{key: reason}        never on the page (e.g. dealer conversions)
#   add_sources{key: [{name,url}]}
#   codes{key: code}, trims{key: [..]}   overrides
#   source_names{raw: public}   rename sources for display
#   metric_from                 first model year to show liters (default 1976)
import json, sys, os, re
sys.stdout.reconfigure(encoding="utf-8")
SP, OUTDIR, SPEC = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(SPEC, encoding="utf-8"))

ENGINE_KIND = {  # (make, cid) -> (cylinders, layout word)
  "chevrolet": {122: (4, "inline-four"), 151: (4, "inline-four"), 153: (4, "inline-four"),
                173: (6, "V6"), 191: (6, "V6"), 207: (6, "V6"), 217: (6, "V6"), 229: (6, "V6"), 231: (6, "V6"),
                194: (6, "inline-six"), 216: (6, "inline-six"), 230: (6, "inline-six"), 235: (6, "inline-six"),
                250: (6, "inline-six"), 261: (6, "inline-six"), 292: (6, "inline-six")},
  "pontiac": {151: (4, "inline-four"), 215: (6, "inline-six"), 230: (6, "OHC inline-six"), 250: (6, "inline-six"),
              173: (6, "V6"), 231: (6, "V6"), 191: (6, "V6"), 207: (6, "V6"), 346: (8, "V8"), 364: (8, "V8")},
  "ford": {144: (6, "inline-six"), 170: (6, "inline-six"), 200: (6, "inline-six"), 250: (6, "inline-six"),
           240: (6, "inline-six"), 300: (6, "inline-six"), 223: (6, "inline-six"), 232: (6, "V6"),
           171: (6, "V6"), 227: (6, "V6"), 238: (6, "V6"), 245: (6, "V6"),
           140: (4, "inline-four"), 122: (4, "inline-four"), 138: (4, "inline-four")},
  "dodge": {170: (6, "slant six"), 198: (6, "slant six"), 225: (6, "slant six"),
            167: (6, "V6"), 215: (6, "V6"), 220: (6, "V6"), 183: (6, "inline-six"),
            97: (4, "inline-four"), 105: (4, "inline-four"), 135: (4, "inline-four")},
  "plymouth": {170: (6, "slant six"), 198: (6, "slant six"), 225: (6, "slant six")},
}
# Marketed liters where cid x 0.016387 rounds the other way (Ford called the 302 a 5.0).
LITERS = {302: 5.0}

def key(year, e): return f'{year}|{e["cid"]}|{e.get("hp")}'

def src_family(name):
    n = (name or "").lower()
    if n.startswith("wikipedia"): return "wikipedia"
    if n.startswith("nhra"): return "nhra"
    # Everything the manufacturer published (info kits, brochures, spec sheets,
    # press releases and their reprints) is one source, not several.
    if re.match(r"(dodgegarage|dodge garage|ford heritage|mopar (press|media)|gm heritage|gm |general motors|chevrolet|chevy (press|brochure|release)|pontiac (brochure|factory|press|spec)|\d{4} (chevrolet|pontiac|ford|dodge|plymouth|chrysler|mustang|charger)\b.*(brochure|catalog|spec|data)|ford (motor|press|brochure|media|performance)|dodge (press|brochure|media)|plymouth (brochure|press)|chrysler (press|brochure|corporation)|stellantis|factory)", n):
        return "maker"
    return n.split(" - ")[0].split(" (")[0].strip()

# Research annotations that don't belong in a public citation.
NOTE_MARKERS = re.compile(r"reprint|snippet|scanned|ocr|mirrors|contains errors|\.json|per-year|as reported|source -|search|403|visual check|counted", re.I)
NHRA_URL = "https://www.nhraracer.com/stockcarclassification"

def public_source(s):
    name = s.get("name") or ""
    name = re.sub(r"\s*\(([^()]*)\)", lambda m: "" if NOTE_MARKERS.search(m.group(1)) else m.group(0), name).strip()
    url = s.get("url") or ""
    if name.lower().startswith("nhra"):
        return {"name": "NHRA Stock Car Classification Guides", "url": NHRA_URL}
    if not url.startswith("http"): return None
    return {"name": name, "url": url}

def plain_trim(t):
    t = re.sub(r"std\.?", "standard", t)
    t = re.sub(r"opt\.?", "optional", t)
    t = re.sub(r"exc\.", "except", t)
    return t[0].upper() + t[1:] if t and t[0].islower() else t

def _plain_trim_fixed(t):
    t = re.sub(r"\bstd\b\.?", "standard", t)
    t = re.sub(r"\bopt\b\.?", "optional", t)
    t = re.sub(r"\bexc\.", "except", t)
    return t[0].upper() + t[1:] if t and t[0].islower() else t

plain_trim = _plain_trim_fixed

def clean_code(rpo):
    if not rpo: return None
    c = rpo.strip()
    if c.lower().startswith("copo") or "per nhra" in c.lower() or c.startswith("("): return None
    c = re.sub(r"\(L98\)", "", c)            # "B2L (L98)" -> keep L98 below
    if rpo.startswith("B2L"): return "L98"
    c = re.sub(r"\s*\([^)]*\)", "", c).strip()
    c = re.sub(r"\s+California.*$", "", c).strip()
    return c or None

def induction_word(e):
    t = json.dumps([e.get("name"), e.get("common_name"), e.get("rpo")]).lower()
    if "supercharg" in t or re.search(r"\bsc\b", t): return " supercharged"
    if "turbo i4" in t or "turbo " in t and "turbo-" not in t and "turbo-thrift" not in t: return " turbo"
    return ""

engines, excluded, srcidx = [], [], {}
rename = spec.get("source_names", {})
metric_from = spec.get("metric_from", 1976)
for fn in spec["files"]:
    d = json.load(open(os.path.join(SP, fn), encoding="utf-8"))
    for s in d.get("source_index") or []:
        pub = public_source({"name": rename.get(s.get("name"), s.get("name")), "url": s.get("url")})
        if pub: srcidx.setdefault(pub["url"], {**pub, "type": s.get("type")})
    for y, es in d["years"].items():
        year = int(re.sub(r"\D", "", y)[:4])
        for e in es:
            k = key(year, e)
            raw = list(e.get("sources") or []) + spec.get("add_sources", {}).get(k, [])
            srcs, seen = [], set()
            for s in raw:
                if not s.get("name"): continue
                pub = public_source({"name": rename.get(s["name"], s["name"]), "url": s.get("url")})
                if not pub: continue
                srcidx.setdefault(pub["url"], {**pub, "type": None})
                # NHRA is shown once per row from the nhra flag, not as a list item
                if pub["url"] != NHRA_URL and pub["url"] not in {x["url"] for x in srcs}: srcs.append(pub)
            fams = {src_family(s["name"]) for s in raw if s.get("name")}
            nhra = bool(e.get("nhra")) or k in spec.get("nhra_lists", [])
            if nhra: fams.add("nhra")
            n = len(fams)
            st = e.get("status")
            race = st == "race_only"
            electric = st == "electric" or e.get("motor") == "electric"
            mk = spec["makeSlug"]
            # a file can carry sister models' engines (Tempest/LeMans in the GTO file)
            tf = spec.get("require_trim", {}).get(fn)
            if tf and not re.search(tf, " ".join(e.get("trims") or []), re.I):
                continue
            if electric:
                cyl, layout, name = None, None, "Electric, dual motor"
            else:
                cyl, layout = ENGINE_KIND.get(mk, {}).get(e["cid"], (8, "V8"))
                liters = LITERS.get(e["cid"], round(e["cid"] * 0.016387, 1))
                name = (f"{liters}L / {e['cid']} {layout}" if year >= metric_from else f"{e['cid']} {layout}") + induction_word(e)
            rec = {
                "year": year,
                "gen": e.get("gen") or next((g["key"] for g in spec["generations"] if g["years"][0] <= year <= g["years"][1]), None),
                "cid": e["cid"], "cyl": cyl, "name": name,
                "code": spec.get("codes", {}).get(k, clean_code(e.get("rpo"))),
                "hp": e.get("hp"),
                # US makers quoted SAE net from 1972 on; research files sometimes
                # labeled later ratings "gross", so the year decides, not the label.
                "hpBasis": "net" if year >= 1972 else (e.get("hp_basis") or "gross"),
                "trims": [plain_trim(t) for t in spec.get("trims", {}).get(k, e.get("trims") or [])],
                "note": spec.get("notes", {}).get(k),
                "nhra": nhra, "sources": srcs, "sourceCount": n,
            }
            if race:
                rec["race"] = True
                rpo = e.get("rpo") or ""
                # an NHRA family code ("C-354-05") is not a name a reader knows
                label = (e.get("common_name") or name) if (not rpo or re.search(r"NHRA|\b[A-Z]{1,3}-\d{3}-\d", rpo)) else rpo
                rec["name"] = label.replace("(", "").replace(")", "").replace("M-FR500-CJ, ", "Cobra Jet ")
                rec["code"] = None
            if k in spec.get("names", {}): rec["name"] = spec["names"][k]
            if electric:
                rec["electric"] = True
                rec["code"] = None
            # Same displacement, different engine (2011+ Coyote 302 vs the
            # Windsor 302): the spec names the family page to link.
            for fo in spec.get("family_overrides", []):
                if fo["years"][0] <= year <= fo["years"][1] and e["cid"] in fo["cid"]:
                    rec["linkFamily"] = fo["url"]
            # Corporate engines: say which division built it (Firebird used
            # Chevrolet, Buick and Oldsmobile engines from 1977).
            bb = (e.get("built_by") or "").strip()
            if spec.get("built_by_notes") and bb and not re.search(spec.get("own_division", "^$"), bb, re.I):
                m = re.match(r"(Chevrolet|Buick|Oldsmobile|Pontiac)\b", bb)
                div = m.group(1) if m else None
                if div:
                    extra = f"Built by {div}."
                    rec["note"] = f'{rec["note"]} {extra}' if rec["note"] else extra
            # Sources agree the engine was offered but publish different ratings:
            # show the spread rather than pick one.
            if k in spec.get("ranges", {}):
                lo, hi = spec["ranges"][k]
                rec["hpRange"] = [lo, hi]
                rec["note"] = rec["note"] or "Published ratings for this engine differ between sources."
            if y.startswith("1964") and mk == "ford": rec["yearLabel"] = "1964½"
            ok_status = st in ("confirmed", "two_sources_not_nhra", "three_sources_not_nhra", "electric") or k in spec.get("include", []) or k in spec.get("ranges", {})
            ok = k not in spec.get("exclude", {}) and ((ok_status and n >= 3) or (race and n >= 2))
            if ok:
                engines.append(rec)
            else:
                rec["status"] = st
                rec["reason"] = spec.get("exclude", {}).get(k) or (f"{n} independent sources" if n < 3 else st)
                rec["researchNote"] = e.get("note")
                excluded.append(rec)

doc = {k: spec[k] for k in ("make", "model", "title", "description", "intro", "generations") if k in spec}
if spec.get("draft"): doc["draft"] = True
doc["engines"] = engines
doc["sources"] = sorted(srcidx.values(), key=lambda s: (s.get("type") or "", s.get("name") or ""))
doc["excluded"] = excluded
doc["method"] = ("Every engine and year listed here was confirmed by at least three independent sources: "
                 "the NHRA Stock Car Classification Guides, factory material such as GM Heritage Center "
                 "information kits and sales brochures, EPA records and established references. Several "
                 "Wikipedia articles count as one source. Where sources give different ratings, the factory "
                 "figure is shown and the difference is noted. Factory race-only packages need two sources.")
os.makedirs(os.path.join(OUTDIR, spec["makeSlug"]), exist_ok=True)
p = os.path.join(OUTDIR, spec["makeSlug"], spec["slug"] + ".json")
with open(p, "w", encoding="utf-8", newline="\n") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1); f.write("\n")
print(p, len(engines), "on page,", len(excluded), "excluded")
for x in excluded: print("   OFF", x["year"], x["cid"], x["hp"], "-", x["reason"])
