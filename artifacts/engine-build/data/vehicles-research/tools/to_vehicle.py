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

I4, I6, V6, SLANT = (4, "inline-four"), (6, "inline-six"), (6, "V6"), (6, "slant six")
# GM shared engines across divisions; sizes not listed default to V8 (or what the
# entry itself says). 262 is resolved per entry: Chevy 262 V8 (1975) vs 4.3 V6.
GM_SHARED = {85: I4, 97: I4, 98: I4, 111: I4, 140: I4, 122: I4, 133: I4, 138: I4, 146: I4, 151: I4, 152: I4, 153: I4,
             173: V6, 181: V6, 191: V6, 196: V6, 198: V6, 200: V6, 204: V6, 207: V6, 213: V6, 217: V6,
             220: V6, 225: V6, 229: V6, 231: V6, 237: V6, 252: V6,
             194: I6, 216: I6, 235: I6, 250: I6, 261: I6, 292: I6}
ENGINE_KIND = {  # (make, cid) -> (cylinders, layout word)
  "chevrolet": {**GM_SHARED, 230: I6},
  "pontiac": {**GM_SHARED, 195: I4, 215: I6, 230: (6, "OHC inline-six"), 250: I6},
  "oldsmobile": {**GM_SHARED},
  "buick": {**GM_SHARED},
  "ford": {144: I6, 170: I6, 200: I6, 223: I6, 240: I6, 250: I6, 300: I6,
           171: V6, 182: V6, 213: V6, 227: V6, 232: V6, 237: V6, 238: V6, 245: V6,
           122: I4, 138: I4, 140: I4},
  "mercury": {121: I4, 144: I6, 170: I6, 200: I6, 250: I6, 140: I4, 122: I4, 232: V6, 153: V6, 155: V6, 171: V6},
  "dodge": {170: SLANT, 198: SLANT, 225: SLANT, 230: I6, 218: I6, 183: I6,
            167: V6, 214: V6, 215: V6, 220: V6, 239: V6,
            83: I4, 97: I4, 98: I4, 105: I4, 122: I4, 135: I4, 144: I4, 156: I4},
  "plymouth": {170: SLANT, 198: SLANT, 225: SLANT, 218: I6, 230: I6, 97: I4, 98: I4, 105: I4, 135: I4, 156: I4},
  "amc": {195: I6, 196: I6, 199: I6, 232: I6, 258: I6, 121: I4, 151: I4},
}
# Marketed liters where cid x 0.016387 rounds the other way (Ford called the 302 a 5.0).
LITERS = {302: 5.0, 204: 3.4}

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
    t = re.sub(r"\bstd\b\.?", "standard", t)
    t = re.sub(r"\bopt\b\.?", "optional", t)
    t = re.sub(r"\bexc\.", "except", t)
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

# A real code is short (L78, LS6, Z28, LT-1, RPO 574, Q-code); anything longer is a
# description ("426 Street Hemi, dual 4-bbl") and goes on its own line under the name.
JUNK = re.compile(r"none in factory literature|per nhra|unknown", re.I)
def split_code(raw):
    c = clean_code(raw)
    if not c or JUNK.search(c): return None, None
    m = re.match(r"^(RPO\s*\d+(?:\s*/\s*\d+)?)\b[\s,]*(.*)$", c)
    if m: return m.group(1), (m.group(2) or None)
    m = re.match(r"^engine code ([A-Z0-9])$", c, re.I)
    if m: return f"{m.group(1).upper()}-code", None
    if re.match(r"^(standard|std)\b", c, re.I): return None, None
    one = r"(?:[A-Z][A-Z0-9]{1,3}(?:-1)?|[A-Z0-9]-code(?: Hi-Po)?|XX)"
    if re.fullmatch(rf"{one}(?:\s*[/+]\s*{one})*", c): return c, None
    return None, c

def is_diesel(e):
    t = json.dumps([e.get("name"), e.get("common_name"), e.get("rpo")]).lower()
    return "diesel" in t or bool(re.search(r"\blf9\b|\blq7\b|\blq6\b", t))

def induction_word(e):
    t = json.dumps([e.get("name"), e.get("common_name"), e.get("rpo")]).lower()
    if is_diesel(e): return " diesel"
    if "supercharg" in t or re.search(r"\bsc\b", t): return " supercharged"
    # "Turbo Hydra-Matic", "Turbo-Fire", "Turbo-Jet", "Turbo-Thrust" are not turbochargers
    if re.search(r"turbocharg|twin[- ]turbo|\bturbo\b(?![- ]?(hydra|fire|jet|thrust|thrift|glide|rocket))", t): return " turbo"
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
            # some research files give fractional cubic inches (Chevette 1.6 = 97.6)
            if isinstance(e.get("cid"), float):
                e = {**e, "cid": round(e["cid"])}
                k = key(year, e)
            # verified displacement corrections (the Mustang's 3.9 Essex is 237 ci, not 238)
            if k in spec.get("cid_fix", {}):
                e = {**e, "cid": spec["cid_fix"][k]}
            # model-wide corrections: the research rounded metric sizes differently (LT6 5.5 L = 333 ci)
            if str(e.get("cid")) in spec.get("cid_remap", {}):
                e = {**e, "cid": spec["cid_remap"][str(e["cid"])]}
            raw = list(e.get("sources") or []) + spec.get("add_sources", {}).get(k, [])
            # add_sources_trim: a source that covers only one model of a shared row (CJ-6, not CJ-5)
            raw += [x["source"] for x in spec.get("add_sources_trim", {}).get(k, [])
                    if re.search(x["trim"], " ".join(e.get("trims") or []), re.I)]
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
            # a file can carry two models (Vega + Chevette, Javelin + AMX)
            if spec.get("require_model") and e.get("model") != spec["require_model"]:
                continue
            if electric:
                cyl, layout, name = None, None, "Electric, dual motor"
            elif e.get("cid") is None:
                # never-built or undocumented rows carry no size; they stay in "excluded"
                cyl, layout, name = None, None, e.get("name") or "Unknown"
            else:
                cyl, layout = ENGINE_KIND.get(mk, {}).get(e["cid"], (None, None))
                if cyl is None:
                    # not in the table: read the layout from the entry itself, else V8
                    t = json.dumps([e.get("name"), e.get("common_name"), e.get("rpo"), e.get("cyl"), e.get("cylinders")])
                    if re.search(r"\bI-?4\b|inline[- ]?four|four[- ]cyl|\b4[- ]cyl|Tigershark|MultiAir|EcoBoost 2|Ecotec|Quad ?4|Iron Duke", t, re.I): cyl, layout = 4, "inline-four"
                    elif re.search(r"\bI-?6\b|inline[- ]?six|straight[- ]six|Hurricane", t, re.I): cyl, layout = 6, "inline-six"
                    elif re.search(r"\bV-?6\b|Pentastar|Cyclone|Duratec 3|3800|60-degree|90-degree V6", t, re.I): cyl, layout = 6, "V6"
                    elif re.search(r"\bV-?10\b", t, re.I): cyl, layout = 10, "V10"
                    else: cyl, layout = 8, "V8"
                # sizes shared by two layouts (Chevy 262: the 1975 V8 and the 4.3 V6):
                # trust what the entry itself says
                txt = json.dumps([e.get("name"), e.get("common_name"), e.get("rpo")])
                if e["cid"] == 262 and re.search(r"4\.3|V6|LB4|LU2|LB1", txt): cyl, layout = 6, "V6"
                # the entry says V8 where the table has a six of the same size
                # (Buick aluminum 215 V8 vs the 1964-65 Pontiac 215 six)
                if layout != "V8" and re.search(r"\bV-?8\b|aluminum V8", txt, re.I) and not re.search(r"\bsix\b|\bI-?6\b|inline", txt, re.I): cyl, layout = 8, "V8"
                liters = LITERS.get(e["cid"], round(e["cid"] * 0.016387, 1))
                name = (f"{liters}L / {e['cid']} {layout}" if year >= metric_from else f"{e['cid']} {layout}") + induction_word(e)
            rec = {
                "year": year,
                "gen": e.get("gen") or next((g["key"] for g in spec["generations"] if g["years"][0] <= year <= g["years"][1]), None),
                "cid": e["cid"], "cyl": cyl, "name": name,
                "code": spec.get("codes", {}).get(k, split_code(e.get("rpo"))[0]),
                "desc": None if k in spec.get("codes", {}) else split_code(e.get("rpo"))[1],
                "hp": e.get("hp"),
                # US makers quoted SAE net from 1972 on; research files sometimes
                # labeled later ratings "gross", so the year decides, not the label.
                "hpBasis": "net" if year >= 1972 else (e.get("hp_basis") or "gross"),
                "trims": [plain_trim(t) for t in spec.get("trims", {}).get(k, e.get("trims") or [])],
                "note": spec.get("notes", {}).get(k) or next((v for c, v in spec.get("code_notes", {}).items() if c == split_code(e.get("rpo"))[0]), None)
                        or next((v for rx, v in spec.get("trim_notes", {}).items() if re.search(rx, " ".join(e.get("trims") or []), re.I)), None),
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
            if is_diesel(e): rec["diesel"] = True
            if e.get("hp_disputed") and not rec["note"]:
                rec["note"] = "Published ratings for this engine vary."
            if electric:
                rec["electric"] = True
                rec["code"] = None
            # Same displacement, different engine (2011+ Coyote 302 vs the
            # Windsor 302): the spec names the family page to link.
            # no spec page for this engine yet, and the same-size page is a different engine
            if any(fo_y[0] <= year <= fo_y[1] and e["cid"] == c for c, fo_y in [(x["cid"], x["years"]) for x in spec.get("no_link", [])]):
                rec["noLink"] = True
            for fo in spec.get("family_overrides", []):
                # optional "diesel": true/false keeps a gas and a diesel of the same size apart
                if fo["years"][0] <= year <= fo["years"][1] and e["cid"] in fo["cid"] and \
                        ("diesel" not in fo or bool(is_diesel(e)) == fo["diesel"]):
                    rec["linkFamily"] = fo["url"]
            # Corporate engines: say which division built it (Firebird used
            # Chevrolet, Buick and Oldsmobile engines from 1977).
            bb = (e.get("built_by") or e.get("builder") or e.get("division") or "").strip()
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
                rec["note"] = rec["note"] or "Published ratings for this engine vary."
            if y.startswith("1964") and mk == "ford": rec["yearLabel"] = "1964½"
            ok_status = st in ("confirmed", "two_sources_not_nhra", "three_sources_not_nhra", "nhra_plus_one", "electric") or k in spec.get("include", []) or k in spec.get("ranges", {})
            ok = k not in spec.get("exclude", {}) and ((ok_status and n >= 3) or (race and n >= 2))
            if ok:
                engines.append(rec)
            else:
                rec["status"] = st
                rec["reason"] = spec.get("exclude", {}).get(k) or (f"{n} independent sources" if n < 3 else st)
                rec["researchNote"] = e.get("note")
                excluded.append(rec)

# trim_rewrite: [[regex, replacement], ...] tidies research trim text ("CJ-5: option 1972-78" -> "CJ-5").
# merge_trims: one page row per engine and year; rows that differ only by which
# model carried them (CJ-5, CJ-7 and CJ-8 all with the 258) become one row.
for rx, rep in spec.get("trim_rewrite", []):
    for r in engines + excluded:
        r["trims"] = [re.sub(rx, rep, t) for t in r["trims"]]
for r in engines + excluded:  # a rewrite to "" drops the trim; keep the first of any duplicates
    r["trims"] = [t for i, t in enumerate(r["trims"]) if t and t not in r["trims"][:i]]
if spec.get("merge_trims"):
    merged = {}
    for r in engines:
        mk_ = (r["year"], r["cid"], r["hp"], r.get("code"), r.get("desc"), r.get("diesel"), r.get("race"))
        if mk_ not in merged:
            merged[mk_] = r
            continue
        m = merged[mk_]
        m["trims"] = m["trims"] + [t for t in r["trims"] if t not in m["trims"]]
        urls = {x.get("url") for x in m["sources"]}
        m["sources"] += [x for x in r["sources"] if x.get("url") not in urls]
        m["sourceCount"] = max(m["sourceCount"], r["sourceCount"])
        m["note"] = m["note"] or r["note"]
    engines = list(merged.values())

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
