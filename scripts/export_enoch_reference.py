"""Export every engine, vehicle and parts spec in this project to enoch-reference-export/.

Read-only on all sources. Re-runnable: wipes and rebuilds the export folder.
Usage:  python -X utf8 -I scripts/export_enoch_reference.py [--no-originals]

Sources (all inside C:\\Engine Website):
  artifacts/engine-build/public/data/engines/*/*.json   website engine dataset (7,385 records)
  artifacts/engine-build/data/engine-sources/*.json     verified engine records with citations
  artifacts/engine-build/data/vehicles/*/*.json          website vehicle pages (engine by year)
  artifacts/engine-build/public/data/*.json             website reference tables
  artifacts/engine-build/public/data/cam-catalog.json   cam picker catalog (Howards + CAM_DATABASE)
  artifacts/engine-build/public/data/cam-fitment.json   cam part -> engine family
  artifacts/engine-build/src/data/buildFieldDefs.ts     ENGINE_DEFAULTS (deck heights etc.)
  scripts/parts-catalog/out/*.json                      manufacturer parts catalog (47k records)
"""
import csv, glob, json, os, re, shutil, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EB = os.path.join(ROOT, "artifacts", "engine-build")
OUT = os.path.join(ROOT, "enoch-reference-export")
NO_ORIG = "--no-originals" in sys.argv
rel = lambda p: os.path.relpath(p, ROOT).replace("\\", "/")
README = []           # lines appended through the run
DISAGREE = []         # source disagreements


def fmt_in(v):
    """Inch value as plain decimal with at least 3 places (4.000, 3.480, 2.4488)."""
    if v is None or v == "":
        return ""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    s = repr(round(f, 6))
    dec = s.split(".")[1] if "." in s else ""
    return f"{f:.{max(3, len(dec.rstrip('0')))}f}"


def num(v):
    if v is None or v == "":
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def fmt_l(v):
    """Liters with at least one decimal (6.0, 5.7, 1.6)."""
    if v is None or v == "":
        return ""
    f = float(v)
    return f"{f:.1f}" if round(f, 1) == f else repr(round(f, 3))


def slug(s):
    return re.sub(r"[^a-z0-9.]+", "-", str(s).lower().replace("°", "deg")).strip("-")


def write_csv(path, header, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        for r in rows:
            w.writerow(["" if r.get(h) is None else r.get(h) for h in header])
    return len(rows)


def cell(v):
    if v is None:
        return ""
    if isinstance(v, (list, tuple)):
        if all(not isinstance(x, (dict, list)) for x in v):
            return ";".join(num(x) if isinstance(x, (int, float)) else str(x) for x in v)
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return num(v)
    return str(v)


# ───────────────────────────── engine family rules ─────────────────────────────
# A "shop family" groups website records into the families the parts catalog
# uses, so parts can say which engine ids they fit. Rules are conservative:
# explicit website family names first, then make + displacement only where the
# displacement is unique to one engine family for that make. Anything ambiguous
# gets no shop family (and therefore no parts fits).
CHEVY = {"Chevrolet", "GMC"}
FORD = {"Ford", "Mercury", "Lincoln"}
MOPAR = {"Chrysler", "Dodge", "Plymouth", "Ram", "DeSoto"}
AMC = {"American Motors", "AMC", "Jeep"}

FAM_ABBR = {
    "Small-block Chevy": "sbc", "Chevy big block": "bbc", "Chevy W-series 348/409": "w",
    "GM LS": "ls", "GM LT (Gen V)": "lt", "Chevy inline-6": "i6",
    "Small-block Ford (Windsor)": "sbf", "Ford 351C/351M/400": "335", "Ford FE": "fe",
    "Ford 429/460": "385", "Ford Modular": "modular", "Ford Coyote": "coyote",
    "Ford Godzilla 7.3": "godzilla", "Ford 240/300 inline-6": "i6",
    "Mopar LA small block": "la", "Mopar Magnum 5.2/5.9": "magnum", "Mopar B/RB big block": "b-rb",
    "Chrysler 426 Hemi": "hemi426", "Chrysler Gen III Hemi 5.7/6.1": "hemi",
    "Chrysler Gen III Hemi 6.2/6.4": "hemi", "Mopar Slant Six": "slant6",
    "Pontiac V8": "v8", "Oldsmobile V8": "v8", "Buick big block": "bb", "AMC V8": "v8",
    "AMC/Jeep inline-6": "i6", "Cummins 5.9 12V": "5.9-12v", "Cummins 5.9 24V/CR": "5.9-24v",
    "Cummins 6.7": "6.7", "Duramax 6.6": "duramax", "Powerstroke 7.3": "7.3-powerstroke",
    "Powerstroke 6.0": "6.0-powerstroke", "Powerstroke 6.4": "6.4-powerstroke",
    "Powerstroke 6.7": "6.7-powerstroke",
}
SHORT_ABBR = {"sbc": "SBC", "bbc": "BBC", "sbf": "SBF", "ls": "LS", "lt": "LT", "fe": "FE", "la": "LA"}


def shop_families(make, fam, cid, cyl, year, fuel, rod):
    f = fam.lower()
    c = round(cid) if cid else None
    diesel = (fuel or "").lower() == "diesel"
    out = []
    if make == "Cummins" or "cummins" in f:
        if c == 359:
            if "12v" in f or (year and year <= 1998 and "24v" not in f):
                out.append("Cummins 5.9 12V")
            if "24v" in f or (year and year >= 1999 and "12v" not in f):
                out.append("Cummins 5.9 24V/CR")
        if c == 408:
            out.append("Cummins 6.7")
        return out
    if "duramax" in f and c == 403:
        return ["Duramax 6.6"]
    if "power stroke" in f or "powerstroke" in f:
        return {444: ["Powerstroke 7.3"], 365: ["Powerstroke 6.0"], 390: ["Powerstroke 6.4"], 406: ["Powerstroke 6.7"]}.get(c, [])
    if diesel:
        return []
    if make in CHEVY | {"Pontiac", "Cadillac", "Buick", "Oldsmobile"}:
        if f in ("ls",):
            return ["GM LS"]
        if f in ("gen v lt",):
            return ["GM LT (Gen V)"]
    if make in CHEVY:
        if f == "small block chevy" or (re.fullmatch(r"chevrolet \d+ci", f) and c in (262, 265, 267, 283, 302, 305, 307, 327, 350, 400) and cyl == 8):
            return ["Small-block Chevy"]
        if f == "big block chevy" or (re.fullmatch(r"chevrolet \d+ci", f) and c in (396, 402, 427, 454, 502) and cyl == 8):
            return ["Chevy big block"]
        if c in (348, 409) and cyl == 8:
            return ["Chevy W-series 348/409"]
        if cyl == 6 and c in (194, 230, 250, 292) and ("straight-6" in f or re.fullmatch(r"chevrolet \d+ci", f)):
            return ["Chevy inline-6"]
        return []
    if make in FORD:
        if f == "coyote":
            return ["Ford Coyote"]
        if f == "godzilla":
            return ["Ford Godzilla 7.3"]
        if f in ("modular", "intech", "modular intech") or (f == "ford 281ci" and c == 281) or (f == "ford 330ci" and c == 330):
            return ["Ford Modular"]
        if f == "fe" or c in (332, 352, 361, 390, 406, 410, 428) and cyl == 8:
            return ["Ford FE"]
        if f == "385" or c in (429, 460):
            return ["Ford 429/460"]
        if f == "240/300 big six" or (cyl == 6 and c in (240, 300)):
            return ["Ford 240/300 inline-6"]
        if f == "windsor" or (cyl == 8 and c in (221, 260, 289, 302)):
            return ["Small-block Ford (Windsor)"]
        if f in ("cleveland", "335", "335-series", "335 series") or (cyl == 8 and c == 400):
            return ["Ford 351C/351M/400"]
        if cyl == 8 and c == 351:
            # 351W / 351C / 351M share a displacement; only the rod length separates them in this data.
            if rod and abs(rod - 5.956) < 0.01:
                return ["Small-block Ford (Windsor)"]
            if rod and (abs(rod - 5.778) < 0.01 or abs(rod - 6.58) < 0.01):
                return ["Ford 351C/351M/400"]
            return []
        return []
    if make in MOPAR:
        if f in ("gen iii hemi", "hemi") and c in (345, 370):
            return ["Chrysler Gen III Hemi 5.7/6.1"]
        if f in ("gen iii hemi", "hemi") and c in (376, 392) and (not year or year >= 2005):
            return ["Chrysler Gen III Hemi 6.2/6.4"]
        if f in ("426 hemi",) or (f == "hemi" and c == 426):
            return ["Chrysler 426 Hemi"]
        if f == "magnum" and c in (318, 360):
            return ["Mopar Magnum 5.2/5.9"]
        if f == "la" or (cyl == 8 and c in (273, 340)):
            return ["Mopar LA small block"]
        if f in ("b", "rb") or (cyl == 8 and c in (361, 383, 413, 440)):
            return ["Mopar B/RB big block"]
        if f == "slant-6" or (cyl == 6 and c in (170, 198, 225) and re.fullmatch(r"(chrysler|dodge|plymouth) \d+ci", f)):
            return ["Mopar Slant Six"]
        return []
    if make == "Pontiac" and cyl == 8 and (f == "pontiac v8" or c in (287, 316, 347, 370, 389, 421, 428, 455) or (c == 400 and f == "pontiac 400ci")):
        return ["Pontiac V8"]
    if make == "Oldsmobile" and cyl == 8 and f in ("oldsmobile v8", "rocket", "rocket v8", "oldsmobile 455ci"):
        return ["Oldsmobile V8"]
    if make == "Buick" and cyl == 8 and f in ("buick big-block v8", "big block v8", "buick 455ci"):
        return ["Buick big block"]
    if make in AMC and cyl == 8 and f in ("amc v8", "american motors 304ci", "american motors 360ci", "american motors 390ci"):
        return ["AMC V8"]
    if make in AMC and cyl == 6 and f in ("amc i6", "amc straight-6", "4.0 i6", "american motors 258ci"):
        return ["AMC/Jeep inline-6"]
    return []


# Catalog family names that map onto a shop family label above.
CATALOG_FAM = {"Chevy Mark IV big block": "Chevy big block", "Chevy Gen VI big block": "Chevy big block"}

MAKE_ABBR = {"Chevrolet": "chev", "GMC": "gmc", "Ford": "ford", "Mercury": "merc", "Lincoln": "linc",
             "Chrysler": "chrys", "Dodge": "dodge", "Plymouth": "plym", "Ram": "ram", "DeSoto": "desoto",
             "Pontiac": "pont", "Oldsmobile": "olds", "Buick": "buick", "Cadillac": "cad",
             "American Motors": "amc", "Jeep": "jeep", "Cummins": "cummins"}
SHORT_MAKE = {"Chevrolet": "Chevy", "Chrysler": "Mopar", "Dodge": "Mopar", "Plymouth": "Mopar", "Oldsmobile": "Olds",
              "American Motors": "AMC", "Volkswagen": "VW", "Mercedes-Benz": "Mercedes"}


# ───────────────────────────────── engines ─────────────────────────────────
def load_engine_defaults():
    """ENGINE_DEFAULTS in buildFieldDefs.ts: key -> {field: value}."""
    path = os.path.join(EB, "src", "data", "buildFieldDefs.ts")
    txt = open(path, encoding="utf-8").read()
    m = re.search(r"ENGINE_DEFAULTS[^=]*=\s*\{(.*?)\n\};", txt, re.S)
    out = {}
    for km in re.finditer(r"\n\s*([a-z0-9_]+):\s*\{(.*?)\}", m.group(1), re.S):
        out[km.group(1)] = dict(re.findall(r'"([^"]+)":\s*"([^"]*)"', km.group(2)))
    return out, rel(path)


def build_engines():
    recs = []
    for f in sorted(glob.glob(os.path.join(EB, "public", "data", "engines", "*", "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        for e in d.get("engines", []):
            recs.append((d, e, rel(f)))

    groups = collections.OrderedDict()
    for d, e, src in recs:
        key = (d["manufacturer"], d["family"], e.get("displacement_ci"), e.get("num_cylinders"),
               e.get("bore_in"), e.get("stroke_in"))
        groups.setdefault(key, []).append((d, e, src))

    # split a geometry group again when rod lengths disagree
    final = []
    for key, items in groups.items():
        rods = collections.Counter(e.get("rod_length_in") for _, e, _ in items if e.get("rod_length_in"))
        if len(rods) <= 1:
            final.append((key, items, next(iter(rods), None)))
            continue
        common = rods.most_common(1)[0][0]
        for r in rods:
            sub = [x for x in items if x[1].get("rod_length_in") == r or (r == common and not x[1].get("rod_length_in"))]
            final.append((key, sub, r))
        DISAGREE.append(f"Engine {key[0]} {key[1]} {num(key[2])} ci: records list different rod lengths "
                        f"({', '.join(fmt_in(r) for r in rods)}); one engine row per rod length.")

    # A shop family inferred only from "<Make> NNNci" + displacement is trusted on the
    # geometry with the most records for that displacement; odd geometries filed under
    # the same displacement (e.g. modern 2013+ records under "Chevrolet 350ci") are not tagged.
    ci_fam = lambda fam: re.fullmatch(r".* \d+(\.\d+)?ci", fam)
    dom = {}
    for (make, fam, cid, cyl, bore, stroke), items, rod in final:
        if ci_fam(fam):
            k = (make, fam, cid)
            if k not in dom or len(items) > len(dom[k]):
                dom[k] = items
    engines, variants, heads, clears, torque = [], [], [], [], []
    used_ids = collections.Counter()
    for (make, fam, cid, cyl, bore, stroke), items, rod in final:
        d0, e0, src0 = items[0]
        years = sorted({e["year"] for _, e, _ in items if isinstance(e.get("year"), int)})
        fuel = collections.Counter(e.get("fuel_type") for _, e, _ in items if e.get("fuel_type")).most_common(1)
        fuel = fuel[0][0] if fuel else ""
        shop = set()
        for _, e, _ in items:
            shop.update(shop_families(make, fam, cid, cyl, e.get("year"), e.get("fuel_type"), rod))
        shop = sorted(shop)
        if shop and ci_fam(fam) and dom[(make, fam, cid)] is not items:
            DISAGREE.append(f"Engine {make} {fam} ({fmt_in(bore)} x {fmt_in(stroke)}, rod {fmt_in(rod) or '?'}, "
                            f"{len(items)} record(s)): geometry differs from the main {fam} engine, so it is not tagged "
                            f"{'/'.join(shop)} and parts are not matched to it.")
            shop = []
        # id
        mk = MAKE_ABBR.get(make, slug(make))
        if len(shop) == 1 and shop[0] in FAM_ABBR:
            mid = FAM_ABBR[shop[0]]
        else:
            mid = slug(re.sub(rf"^{re.escape(make)}\s+", "", fam, flags=re.I))
            mid = re.sub(r"-?\d+(\.\d+)?ci$", "", mid) or ""
        cid_s = num(round(cid, 1) if cid else "")
        if mk == "cummins" and shop:
            base = f"cummins-{FAM_ABBR[shop[0]]}"
        elif mid.endswith("powerstroke") or mid == "duramax":
            base = f"{mk}-{mid}"
        else:
            base = "-".join(x for x in (mk, mid, cid_s) if x)
        used_ids[base] += 1
        eid = base if used_ids[base] == 1 else f"{base}-{used_ids[base]}"

        layout = e0.get("configuration") or d0.get("configuration") or ""
        cr = sorted({e["compression_ratio"] for _, e, _ in items if e.get("compression_ratio")})
        hp = sorted({e["advertised_hp"] for _, e, _ in items if e.get("advertised_hp")})
        codes = sorted({v["code"] for _, e, _ in items for v in (e.get("variants") or []) if v.get("code")})
        cl = [e["clearances"] for _, e, _ in items if e.get("clearances")]
        mains = sorted({c.get("main_journal") for c in cl if c.get("main_journal")})
        rodj = sorted({c.get("rod_journal") for c in cl if c.get("rod_journal")})
        notes = []
        if fuel: notes.append(f"fuel {fuel}")
        vt = {e.get("valvetrain") for _, e, _ in items if e.get("valvetrain")}
        if vt: notes.append("valvetrain " + "/".join(sorted(vt)))
        ind = {e.get("induction") for _, e, _ in items if e.get("induction")}
        if ind: notes.append("induction " + "/".join(sorted(ind)))
        if cr: notes.append(f"CR {num(cr[0])}" + (f"-{num(cr[-1])}" if len(cr) > 1 else ""))
        if hp: notes.append(f"advertised hp {num(hp[0])}" + (f"-{num(hp[-1])}" if len(hp) > 1 else ""))
        bm = {e.get("block_material") for _, e, _ in items if e.get("block_material")}
        if bm: notes.append("block " + "/".join(sorted(bm)))
        if e0.get("bore_mm"): notes.append(f"bore {num(e0['bore_mm'])} mm, stroke {num(e0.get('stroke_mm'))} mm (original metric)")
        if len(mains) > 1 or len(rodj) > 1:
            notes.append(f"journals listed differently across records: main {', '.join(map(fmt_in, mains))}; rod {', '.join(map(fmt_in, rodj))}")
            DISAGREE.append(f"Engine {eid}: journal sizes differ between records (main {mains}, rod {rodj}); first kept, all listed in notes.")
        if shop: notes.append("shop family " + " / ".join(shop))
        dn = {e.get("data_note") for _, e, _ in items if e.get("data_note")}
        if dn: notes.append("note: " + " | ".join(sorted(dn)))
        notes.append(f"{len(items)} website record(s)")
        srcs = sorted({s for _, _, s in items})
        engines.append(dict(
            id=eid, make=make, family=" / ".join(shop) if shop else fam, engine=f"{make} {fam} {cid_s} ci".replace("  ", " "),
            liters=fmt_l(e0.get("displacement_l")), cid=cid_s, years=(f"{years[0]}-{years[-1]}" if len(years) > 1 else (str(years[0]) if years else "")),
            layout=layout, cylinders=num(cyl), bore=fmt_in(bore), stroke=fmt_in(stroke), rod_length=fmt_in(rod),
            deck_height="", main_journal=fmt_in(mains[0]) if mains else "", rod_journal=fmt_in(rodj[0]) if rodj else "",
            max_overbore="", notes="; ".join(notes), source=";".join(srcs),
            _fam=fam, _shop=shop, _codes=codes, _cid=cid, _cyl=cyl, _bore=bore, _stroke=stroke, _make=make,
            _liters=e0.get("displacement_l"), _years=years))
        for d, e, src in items:
            variants.append(dict(engine_id=eid, website_record_id=e.get("engine_id"), year=num(e.get("year")),
                                 codes=";".join(v["code"] for v in (e.get("variants") or []) if v.get("code")),
                                 advertised_hp=num(e.get("advertised_hp")), compression_ratio=num(e.get("compression_ratio")),
                                 fuel=e.get("fuel_type") or "", induction=e.get("induction") or "", valvetrain=e.get("valvetrain") or "",
                                 block_material=e.get("block_material") or "", head_material=e.get("head_material") or "",
                                 firing_order=cell(e.get("firing_order")), nhra_verified=cell(e.get("nhra_verified")),
                                 vehicles=";".join(f"{v.get('name')}" + (f" {v.get('year_start')}-{v.get('year_end')}" if v.get("year_start") else "") for v in (e.get("vehicles") or [])),
                                 source=src))
            if e.get("head"):
                h = e["head"]
                heads.append(dict(engine_id=eid, website_record_id=e.get("engine_id"), chamber_cc=num(h.get("head_cc")),
                                  intake_valve=fmt_in(h.get("intake_valve_dia")), exhaust_valve=fmt_in(h.get("exhaust_valve_dia")),
                                  valve_stem=fmt_in(h.get("valve_stem_dia")), rocker_ratio=num(h.get("rocker_ratio")),
                                  lifter_type=h.get("lifter_type") or "", cam_intake_lift=fmt_in(h.get("cam_intake_lift")),
                                  cam_exhaust_lift=fmt_in(h.get("cam_exhaust_lift")), spring_type=h.get("spring_type") or "",
                                  head_gasket_thickness=fmt_in(h.get("head_gasket_thickness")), source=src))
            if e.get("clearances"):
                c = e["clearances"]
                row = dict(engine_id=eid, website_record_id=e.get("engine_id"), source=src)
                for k, v in c.items():
                    row[k] = fmt_in(v) if isinstance(v, (int, float)) else cell(v)
                clears.append(row)
            for t in e.get("torque_specs") or []:
                for s in t.get("steps") or [{}]:
                    torque.append(dict(engine_id=eid, website_record_id=e.get("engine_id"), component=t.get("component"),
                                       display_name=t.get("display_name"), lubricant=t.get("lubricant"), bolt_type=t.get("bolt_type"),
                                       reusable=cell(t.get("reusable")), step=num(s.get("step")), ft_lbs=num(s.get("ft_lbs")),
                                       nm=num(s.get("nm")), angle=cell(s.get("angle")), step_notes=s.get("notes") or "", source=src))

    # ENGINE_DEFAULTS deck heights: attach where key geometry matches exactly one engine geometry
    defaults, dsrc = load_engine_defaults()
    drows = []
    for k, vals in defaults.items():
        b, s, cy = vals.get("shortBlock.bore"), vals.get("shortBlock.stroke"), vals.get("shortBlock.cylinders")
        row = dict(key=k, **{f.split(".")[-1]: v for f, v in vals.items()}, source=f"{dsrc} ENGINE_DEFAULTS.{k}")
        if b and s:
            m = [e for e in engines if e["bore"] and abs(float(e["bore"]) - float(b)) < 0.0015 and e["stroke"] and abs(float(e["stroke"]) - float(s)) < 0.0015 and (not cy or e["cylinders"] == cy)]
            row["matched_engine_ids"] = ";".join(e["id"] for e in m)
            dh = vals.get("shortBlock.deckHeight")
            if dh and m:
                for e in m:
                    if e["deck_height"] and e["deck_height"] != fmt_in(dh):
                        DISAGREE.append(f"Engine {e['id']}: ENGINE_DEFAULTS give deck heights {e['deck_height']} and {fmt_in(dh)} for this geometry; first kept.")
                        continue
                    e["deck_height"] = fmt_in(dh)
                    e["source"] += f";{dsrc} ENGINE_DEFAULTS.{k} (deck height)"
        drows.append(row)
    return engines, variants, heads, clears, torque, drows


def engine_sources(engines):
    """data/engine-sources: verified fields with citations; compare with website rows."""
    rows, extra = [], []
    for f in sorted(glob.glob(os.path.join(EB, "data", "engine-sources", "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        sid = os.path.splitext(os.path.basename(f))[0]
        flds = d.get("fields", {})
        for k, v in flds.items():
            if not isinstance(v, dict):
                continue
            for s in v.get("sources") or [{}]:
                rows.append(dict(source_record=sid, name=d.get("name"), field=k, value=cell(v.get("value")),
                                 cited_source=s.get("name"), url=s.get("url"), says=s.get("says"), source=rel(f)))
        val = lambda k: (flds.get(k) or {}).get("value") if isinstance(flds.get(k), dict) else None
        b, st, ci, cy = val("bore_in"), val("stroke_in"), val("displacement_ci"), val("num_cylinders")
        if not (b and st and ci):
            continue
        cands = [e for e in engines if e["_cid"] and abs(e["_cid"] - ci) < 1 and (not cy or e["_cyl"] == cy)]
        same = [e for e in cands if e["_bore"] and abs(e["_bore"] - b) < 0.002 and e["_stroke"] and abs(e["_stroke"] - st) < 0.002]
        if same:
            for e in same:
                e["source"] += f";{rel(f)}"
                e.setdefault("_alias_extra", []).append(d.get("name"))
        elif cands:
            DISAGREE.append(f"{rel(f)} ({d.get('name')}): bore x stroke {fmt_in(b)} x {fmt_in(st)} does not match the website records "
                            f"for {num(ci)} ci ({', '.join(sorted({e['id'] + ' ' + e['bore'] + ' x ' + e['stroke'] for e in cands}))[:300]}); kept as its own row.")
            extra.append(dict(id=f"src-{sid}", make="", family="", engine=d.get("name"), liters=fmt_l(val("displacement_l")), cid=num(ci),
                              years=cell(val("years")), layout=cell(val("configuration")), cylinders=num(cy), bore=fmt_in(b), stroke=fmt_in(st),
                              rod_length="", deck_height="", main_journal="", rod_journal="", max_overbore="",
                              notes="verified engine-source record that disagrees with the website dataset", source=rel(f),
                              _codes=[], _alias_extra=[d.get("name")], _shop=[], _cid=ci, _cyl=cy, _make="", _fam="", _liters=val("displacement_l")))
    return rows, extra


def build_aliases(engines, vehicle_rows):
    pairs = []
    def add(a, eid):
        a = re.sub(r"\s+", " ", str(a)).strip()
        if a and len(a) > 1:
            pairs.append((a, eid))
    for e in engines:
        eid, make, fam, cid, lit = e["id"], e["_make"], e["_fam"], e["cid"], e["_liters"]
        sm = SHORT_MAKE.get(make, make)
        if fam: add(fam, eid)
        if make and cid:
            add(f"{make} {cid}", eid); add(f"{sm} {cid}", eid)
        L = fmt_l(lit) if lit else ""
        if make and L:
            add(f"{make} {L}L", eid); add(f"{sm} {L}", eid)
        if fam and not re.search(r"\d+ci$", fam) and L:
            if L not in fam:
                add(f"{L} {fam}", eid); add(f"{L}L {fam}", eid); add(f"{fam} {L}", eid)
            if "power stroke" in fam.lower():
                add(f"{L} Powerstroke", eid); add(f"{L} Power Stroke", eid); add(f"{L}L Powerstroke", eid)
            if "duramax" in fam.lower():
                add(f"{L} Duramax", eid)
        for sf in e["_shop"]:
            add(sf, eid)
            ab = SHORT_ABBR.get(FAM_ABBR.get(sf, ""))
            if ab and cid:
                add(f"{ab} {cid}", eid)
            if sf.startswith("Cummins"):
                add(sf, eid); add(sf.replace("Cummins ", "") + " Cummins", eid)
        for c in e["_codes"]:
            add(c, eid)
        for n in e.get("_alias_extra", []):
            add(n, eid)
    for v in vehicle_rows:
        if v.get("engine_id") and v.get("code"):
            add(v["code"], v["engine_id"])
    seen, rows = set(), []
    for a, eid in pairs:
        if (a.lower(), eid) in seen:
            continue
        seen.add((a.lower(), eid))
        rows.append(dict(alias=a, engine_id=eid))
    amb = collections.Counter(r["alias"].lower() for r in rows)
    return rows, sum(1 for v in amb.values() if v > 1)


# ───────────────────────────────── vehicles ─────────────────────────────────
def build_vehicles(engines):
    idx = collections.defaultdict(list)
    for e in engines:
        if e["_cid"] and e["_make"]:
            idx[(e["_make"], round(e["_cid"]), e["_cyl"])].append(e)
    rows, srcs = [], []
    for f in sorted(glob.glob(os.path.join(EB, "data", "vehicles", "*", "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        gens = {g.get("key"): g.get("name") for g in d.get("generations") or []}
        for s in d.get("sources") or []:
            srcs.append(dict(make=d.get("make"), model=d.get("model"), cited_source=s.get("name"), url=s.get("url"), source=rel(f)))
        for en in d.get("engines") or []:
            cands = idx.get((d.get("make"), en.get("cid"), en.get("cyl")), [])
            yr = en.get("year")
            if len(cands) > 1 and yr:
                cands = [e for e in cands if not e["_years"] or (e["_years"][0] <= yr <= e["_years"][-1])] or cands
            rows.append(dict(make=d.get("make"), model=d.get("model"), year=num(yr), generation=gens.get(en.get("gen"), en.get("gen")),
                             engine_name=en.get("name"), code=en.get("code") or "", cid=num(en.get("cid")), cylinders=num(en.get("cyl")),
                             description=en.get("desc") or "", hp=num(en.get("hp")), hp_basis=en.get("hpBasis") or "",
                             trims=cell(en.get("trims")), note=en.get("note") or "", nhra=cell(en.get("nhra")),
                             engine_id=cands[0]["id"] if len(cands) == 1 else "",
                             engine_id_candidates=";".join(e["id"] for e in cands) if len(cands) > 1 else "",
                             cited_sources=";".join(s.get("name", "") for s in en.get("sources") or []), source=rel(f)))
    return rows, srcs


# ───────────────────────────────── parts ─────────────────────────────────
def build_parts(engines):
    fam_index = collections.defaultdict(list)
    for e in engines:
        for sf in e["_shop"]:
            fam_index[sf].append(e)

    def fits(r):
        fam = r["fit"].get("fam", "")
        fam = CATALOG_FAM.get(fam, fam)
        pool = fam_index.get(fam, [])
        ci = r["fit"].get("ci")
        if ci:
            ci = [c for c in (ci if isinstance(ci, list) else [ci]) if isinstance(c, (int, float))]
            pool = [e for e in pool if e["_cid"] and any(abs(e["_cid"] - c) < 1 for c in ci)]
        return ";".join(sorted({e["id"] for e in pool}))

    def mm_note(spec):
        return "; ".join(f"{k} {num(v)} mm" for k, v in spec.items() if k.endswith("Mm") and isinstance(v, (int, float)))

    pistons, cams, gaskets, full = [], [], [], collections.defaultdict(list)
    files = sorted(f for f in glob.glob(os.path.join(ROOT, "scripts", "parts-catalog", "out", "*.json")) if not os.path.basename(f).startswith("_"))
    per_file = {}
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        per_file[os.path.basename(f)] = len(d.get("parts", []))
        for r in d.get("parts", []):
            sp = r.get("spec") or {}
            s = r.get("src") or {}
            src = rel(f) + (f" p{s['page']}" if s.get("page") else "") + (f" | {s.get('doc')}" if s.get("doc") else "") + (f" | {s.get('edition')}" if s.get("edition") else "")
            ft = fits(r)
            cat = r["cat"]
            # ring widths published in mm: add inch columns, keep mm in notes
            notes = mm_note(sp)
            if cat == "ring" and sp.get("units") == "mm":
                for k in ("topWidth", "secondWidth", "oilWidth", "thirdWidth"):
                    if isinstance(sp.get(k), (int, float)):
                        notes += ("; " if notes else "") + f"{k} {num(sp[k])} mm"
                        sp = {**sp, k + "In": round(sp[k] / 25.4, 4)}
            fr = dict(part_number=r["p"], brand=r["m"], category=cat, name=r.get("name"), catalog_family=r["fit"].get("fam"),
                      fits=ft, fit_ci=cell(r["fit"].get("ci")), fit_cyl=num(r["fit"].get("cyl")),
                      fit_years=(f"{r['fit'].get('y0')}-{r['fit'].get('y1')}" if r["fit"].get("y1") else num(r["fit"].get("y0"))),
                      fit_notes=r["fit"].get("notes"), emissions=r.get("emissions"), mm_notes=notes, source=src, source_url=s.get("url"))
            for k, v in sp.items():
                fr["spec." + k] = cell(v)
            full[cat].append(fr)
            if cat in ("piston", "pistonKit"):
                rs = sp.get("ringSetPn") or sp.get("ringSet") or sp.get("ringPack")
                pistons.append(dict(part_number=r["p"], brand=r["m"], bore=fmt_in(sp.get("bore")), compression_height=fmt_in(sp.get("ch")),
                                    pin_diameter=fmt_in(sp.get("pin")), dome_cc=num(sp.get("domeCc")), ring_set=cell(rs), fits=ft, source=src))
            elif cat == "cam":
                cams.append(dict(part_number=r["p"], brand=r["m"], duration_050_int=num(sp.get("dur050Int")), duration_050_exh=num(sp.get("dur050Exh")),
                                 lift_int=fmt_in(sp.get("valveLiftInt") or sp.get("lobeLiftInt")), lift_exh=fmt_in(sp.get("valveLiftExh") or sp.get("lobeLiftExh")),
                                 lsa=num(sp.get("lsa")), icl=num(sp.get("icl")), fits=ft, source=src))
            elif cat == "headGasket":
                bore = sp.get("bore")
                if bore is None and isinstance(sp.get("boreMm"), (int, float)):
                    bore = sp["boreMm"] / 25.4
                gaskets.append(dict(part_number=r["p"], brand=r["m"], bore=fmt_in(bore), thickness=fmt_in(sp.get("thickness")),
                                    cc=num(sp.get("volumeCc")), fits=ft, source=src))

    # cam picker catalog (Howards Cams + the site's hand-verified CAM_DATABASE)
    cc = json.load(open(os.path.join(EB, "public", "data", "cam-catalog.json"), encoding="utf-8"))["cams"]
    cfit = {c["p"]: c for c in json.load(open(os.path.join(EB, "public", "data", "cam-fitment.json"), encoding="utf-8"))}
    have = {(c["brand"], c["part_number"]) for c in cams}
    for c in cc:
        if (c["m"], c["p"]) in have:
            continue
        fx = cfit.get(c["p"])
        ft = ""
        if fx:
            ft = fits({"fit": {"fam": fx.get("fam"), "ci": fx.get("ci")}})
        cams.append(dict(part_number=c["p"], brand=c["m"], duration_050_int=num(c.get("i")), duration_050_exh=num(c.get("e")),
                         lift_int=fmt_in(c.get("li")), lift_exh=fmt_in(c.get("le")), lsa=num(c.get("lsa")), icl=num(c.get("icl")),
                         fits=ft, source=f"artifacts/engine-build/public/data/cam-catalog.json ({'scripts/howards_cams.json' if c['m'] == 'Howards Cams' else 'src/data/camDatabase.ts'}); fitment {c.get('fit')}"))
        full["cam-picker"].append(dict(part_number=c["p"], brand=c["m"], series=c.get("f"), fitment_text=c.get("fit"), type=c.get("ty"),
                                      dur050_int=num(c.get("i")), dur050_exh=num(c.get("e")), adv_int=num(c.get("ai")), adv_exh=num(c.get("ae")),
                                      valve_lift_int=fmt_in(c.get("li")), valve_lift_exh=fmt_in(c.get("le")), rocker_ratio_quoted=num(c.get("rr")),
                                      lsa=num(c.get("lsa")), icl=num(c.get("icl")), rpm_low=num(c.get("rl")), rpm_high=num(c.get("rh")),
                                      fits=ft, source="artifacts/engine-build/public/data/cam-catalog.json"))
    return pistons, cams, gaskets, full, per_file


def part_disagreements(full):
    """Same brand + part number listed with different key dimensions in two places."""
    keys = {"piston": ("spec.bore", "spec.ch", "spec.pin", "spec.domeCc"), "headGasket": ("spec.bore", "spec.thickness"),
            "cam": ("spec.dur050Int", "spec.dur050Exh", "spec.lsa")}
    for cat, ks in keys.items():
        seen = collections.defaultdict(set)
        for r in full.get(cat, []):
            seen[(r["brand"], r["part_number"])].add(tuple(r.get(k, "") for k in ks))
        for (b, p), vals in seen.items():
            vals = {v for v in vals if any(v)}
            if len(vals) > 1:
                DISAGREE.append(f"{cat} {b} {p}: listed with different {'/'.join(k.split('.')[1] for k in ks)} values {sorted(vals)}; every row kept.")


# ───────────────────────────── website reference tables ─────────────────────────────
def flatten_json(path):
    d = json.load(open(path, encoding="utf-8"))
    rows = None
    if isinstance(d, list):
        rows = d
    elif isinstance(d, dict):
        lists = [(k, v) for k, v in d.items() if isinstance(v, list) and v and isinstance(v[0], dict)]
        if lists:
            k, rows = max(lists, key=lambda kv: len(kv[1]))
        elif all(isinstance(v, dict) for v in d.values()):
            rows = [{"key": k, **v} for k, v in d.items()]
        else:
            rows = [d]
    out = []
    for r in rows or []:
        if not isinstance(r, dict):
            r = {"value": r}
        flat = {}
        def walk(prefix, v):
            if isinstance(v, dict) and len(v) <= 25 and all(not isinstance(x, (dict, list)) or isinstance(x, list) and all(not isinstance(y, (dict, list)) for y in x) for x in v.values()):
                for kk, vv in v.items():
                    walk(f"{prefix}{kk}.", vv)
            else:
                flat[prefix.rstrip(".")] = cell(v)
        walk("", r)
        out.append(flat)
    return out


REFERENCE_FILES = ["ring_gap_specs", "ring_gap_multipliers", "gas_engine_ring_refs", "bearing_clearance_recommendations",
                   "piston_to_valve_minimums", "valve_spring_pressure_ranges", "bolt_specs", "head_flow_profiles",
                   "diesel_platforms", "diesel_lift_pump_psi_specs", "diesel_egt_zones", "diesel_lambda_zones",
                   "transmissions", "turbo_models", "fuel_injector_catalog", "fuel_injector_bsfc", "carb_cfm_recommendations",
                   "header_sizing_recommendations", "hp_reference_builds", "families", "manufacturers"]



def write_readme(counts, per_file, ambiguous, orig):
    c = lambda k: f"{counts.get(k, 0):,}"
    other = sorted(k for k in counts if k.startswith("other/"))
    L = []
    L += ["# Enoch Motorsports reference export", "",
          "Generated by `scripts/export_enoch_reference.py` in the engine-build.com project (`C:\\Engine Website`).",
          "Every number here was read from a file in that project. Nothing was typed from memory; where a value",
          "is not in the data the cell is blank. The originals were not changed. Re-run the script to rebuild this folder.", "",
          "## What was found", "",
          "| Source in the project | What it holds |", "|---|---|",
          "| `artifacts/engine-build/public/data/engines/` (524 files) | The website's engine dataset: 7,385 records with bore, stroke, rod length, CR, HP, codes, years; head specs on 597, journals and clearances on 372, torque on 649 |",
          "| `artifacts/engine-build/data/engine-sources/` (78 files) | Engine records verified against 3 cited sources, with the citation text |",
          "| `artifacts/engine-build/data/vehicles/` (138 files) | The website's vehicle pages: every factory engine per model and year, with codes, HP and trims |",
          "| `artifacts/engine-build/public/data/*.json` | Website reference tables: ring gaps, bearing clearances, piston-to-valve, valve springs, bolt specs, head flow, diesel platforms, turbos, injectors, carbs, headers, transmissions |",
          "| `artifacts/engine-build/public/data/cam-catalog.json` | The site's cam picker: Howards Cams (scraped from howardscams.com) plus the site's hand-verified cam table |",
          "| `artifacts/engine-build/src/data/buildFieldDefs.ts` | `ENGINE_DEFAULTS`: stock deck height, compression height and valve sizes for 14 builder presets (hand-entered in code, no citation) |",
          f"| `scripts/parts-catalog/out/` ({len(per_file)} files) | The manufacturer parts catalog extracted for the build planner: {sum(per_file.values()):,} records from manufacturer PDFs and manufacturer web stores |",
          "", "## Files in this folder", "",
          "| File | Rows | Built from |", "|---|---|---|",
          f"| `engines.csv` | {c('engines.csv')} | Website engine records, one row per distinct geometry (see below) |",
          f"| `aliases.csv` | {c('aliases.csv')} | Family names, codes and RPOs from the records and vehicle pages, make + displacement, liters, family abbreviations |",
          f"| `pistons.csv` | {c('pistons.csv')} | Parts catalog pistons (MAHLE, JE, Wiseco, Icon/UEM, KB, CP-Carrillo and others) |",
          f"| `cams.csv` | {c('cams.csv')} | Parts catalog cams (COMP, Crower, Isky, Trick Flow, Hamilton and others) plus the cam picker (Howards, site table) |",
          f"| `head_gaskets.csv` | {c('head_gaskets.csv')} | Parts catalog head gaskets (Cometic, Fel-Pro, MAHLE, Trick Flow and others) |"]
    for k in other:
        L.append(f"| `{k}` | {c(k)} | see the notes below |")
    L += [f"| `originals/` | {len(orig):,} files | Copies of every source file used: catalog PDFs, extracted catalog JSON with QA notes, scraped pages and OCR results, website data, code, SQL |",
          "| `_export_summary.json` | | Machine-readable counts, the full disagreement list and the originals map |", "",
          "## How engines.csv was built", "",
          "- The website has 7,385 engine records, many of them the same engine in different model years or HP ratings. Records with the same make, family, displacement, cylinders, bore and stroke are one row. If those records list different rod lengths, each rod length gets its own row. Every original record, with its year, HP, CR and codes, is in `other/engine_variants.csv`, linked by `engine_id`.",
          "- Bore and stroke are exactly as the website data has them. Some come from NHRA blueprint sheets, which print maximums (an SBC 350 shows 4.001 x 3.484), so a few engines appear as two rows a thousandth apart.",
          "- `family` is the engine family used by the parts catalog (Small-block Chevy, GM LS, Ford FE and so on) when the record can be placed in one; otherwise it is the website's family name. A family is assigned from the website family name, or from make + displacement when that displacement belongs to only one family for that make, and then only to the main geometry under that displacement.",
          "- `deck_height` comes only from `ENGINE_DEFAULTS` in the builder code (14 presets), matched to engines with the same bore, stroke and cylinder count. Treat these as unsourced.",
          "- `main_journal` and `rod_journal` come from the clearance block on 372 website records. `max_overbore` is not in any data and is blank everywhere. `layout` is blank where the record does not state it.",
          "- `years` is the range of model years on the grouped records; blank when none were recorded.", "",
          "## Parts tables", "",
          "- `fits` lists engine ids. It is filled when the catalog part's family matches engines in `engines.csv`. If the catalog lists displacements (for example a piston for 350 and 383), only engines of those displacements are listed. Parts for displacements with no stock engine (strokers), and parts sold by dimension rather than engine (rings by bore, springs, retainers, many fasteners), have an empty `fits`.",
          "- Every catalog record, with every spec field the extractor captured, is in `other/parts_<category>.csv` (`spec.*` columns), with the catalog family, years, emissions status and source page. `pistons.csv`, `cams.csv` and `head_gaskets.csv` are the requested subsets.",
          "- Cam lift in `cams.csv` is valve lift as published, at the rocker ratio the maker quotes (`spec.rr`, or `rocker_ratio_quoted` in `parts_cam-picker.csv`). For Isky, `lsa` is Isky's Lobe Center column.",
          "- Units are inches. Where a catalog printed metric values the inch value is used and the mm value is kept in `mm_notes`. Ring widths printed in mm also get inch columns (`spec.topWidthIn` and so on).", "",
          "## Things I am not sure about", "",
          "- **Torque specs are not verified.** `other/engine_torque_specs_UNVERIFIED.csv` is the website torque dataset that is on hold because its torque-to-yield entries are malformed (1,315 of them). It is included because you asked for everything. Do not torque fasteners from it without checking a factory manual.",
          "- **OCR sources.** The KB pistons catalog and most of the MAHLE OE gasket catalog GA-21-17 were scanned images, so those values came from OCR. Each record carries its OCR confidence in the full parts files.",
          "- **Old editions.** KB 2015, Isky 2016 (spring book 2009), Fel-Pro line card 2015, King bearings 2018 Europe edition, Lunati 2013; MAHLE OE gasket listings end at model year 1990. The edition is in every `source` cell.",
          "- **Small-block Ford 351.** Windsor, Cleveland and 351M share 351 ci. The family is assigned only when the record's rod length tells them apart.",
          "- **Big-block Chevy.** The catalog splits Mark IV and Gen VI; here both map to one Chevy big block family, so a Gen VI part may list Mark IV engines as fits.",
          "- **Known misfile.** Eagle crank 440940026135 (409) is filed under big-block Chevy in the catalog.",
          f"- **Ambiguous aliases.** {ambiguous:,} alias strings point at more than one engine id, for example Chevy 350 or an RPO code reused across decades. That is normal for shop names; pick by year or geometry.",
          "- **Vehicle rows.** `other/vehicles_engines_by_year.csv` links a vehicle's engine to an `engine_id` when exactly one engine has that make, displacement and cylinder count in that year; otherwise it lists the candidates.", "",
          "## Not exported", "",
          "- `estimates/*.pdf` are Enoch Motorsports customer estimates, not reference specs.",
          "- `Cam_book_pngs/` is a set of photographed cam book pages that were never OCR'd, so there is no data to export. They are not copied.",
          "- `C:\\Enoch Shop` is the shop app itself; its data was not read for this export.",
          "- `engine-db/init/*.sql` seed files mostly mirror the website JSON tables exported above. They are copied to `originals/engine-db-sql/`; the casting numbers and platform HP limits in them were not converted.",
          "- `buildParts.ts` and `dieselParts.ts` (the old hand-typed planner parts list) are superseded by the catalog. They are copied to `originals/website-code/` but not converted.",
          "- Site analytics CSVs (Search Console, GA4) hold no engine data.", "",
          "## Where two sources disagree", "",
          "All rows are kept. These are the cases:", ""]
    L += [f"- {d}" for d in DISAGREE] or ["- none found"]
    L += ["", "## Parts catalog source files", "", "| File | Records |", "|---|---|"]
    L += [f"| `scripts/parts-catalog/out/{k}` | {v:,} |" for k, v in sorted(per_file.items())]
    open(os.path.join(OUT, "README.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


# ───────────────────────────────── main ─────────────────────────────────
def main():
    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):           # clear contents, not the folder (it may be open in Explorer)
        p = os.path.join(OUT, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    os.makedirs(os.path.join(OUT, "other"))
    counts = {}

    engines, variants, heads, clears, torque, defaults = build_engines()
    es_rows, es_extra = engine_sources(engines)
    engines += es_extra
    vehicles, vsrc = build_vehicles(engines)
    aliases, ambiguous = build_aliases(engines, vehicles)
    EH = "id,make,family,engine,liters,cid,years,layout,cylinders,bore,stroke,rod_length,deck_height,main_journal,rod_journal,max_overbore,notes,source".split(",")
    counts["engines.csv"] = write_csv(os.path.join(OUT, "engines.csv"), EH, engines)
    counts["aliases.csv"] = write_csv(os.path.join(OUT, "aliases.csv"), ["alias", "engine_id"], aliases)

    def dump(name, rows):
        if not rows:
            return
        hdr = list(dict.fromkeys(k for r in rows for k in r if not k.startswith("_")))
        counts["other/" + name] = write_csv(os.path.join(OUT, "other", name), hdr, rows)

    dump("engine_variants.csv", variants)
    dump("engine_head_specs.csv", heads)
    dump("engine_clearances.csv", clears)
    dump("engine_torque_specs_UNVERIFIED.csv", torque)
    dump("engine_source_citations.csv", es_rows)
    dump("builder_engine_defaults.csv", defaults)
    dump("vehicles_engines_by_year.csv", vehicles)
    dump("vehicle_sources.csv", vsrc)

    pistons, cams, gaskets, full, per_file = build_parts(engines)
    part_disagreements(full)
    counts["pistons.csv"] = write_csv(os.path.join(OUT, "pistons.csv"), "part_number,brand,bore,compression_height,pin_diameter,dome_cc,ring_set,fits,source".split(","), pistons)
    counts["cams.csv"] = write_csv(os.path.join(OUT, "cams.csv"), "part_number,brand,duration_050_int,duration_050_exh,lift_int,lift_exh,lsa,icl,fits,source".split(","), cams)
    counts["head_gaskets.csv"] = write_csv(os.path.join(OUT, "head_gaskets.csv"), "part_number,brand,bore,thickness,cc,fits,source".split(","), gaskets)
    for cat, rows in sorted(full.items()):
        dump(f"parts_{slug(cat)}.csv", rows)

    for name in REFERENCE_FILES:
        p = os.path.join(EB, "public", "data", name + ".json")
        if os.path.exists(p):
            rows = flatten_json(p)
            for r in rows:
                r["source"] = rel(p)
            dump(f"reference_{name}.csv", rows)

    # originals
    orig = []
    if not NO_ORIG:
        def cp(src, sub):
            if not os.path.exists(src):
                return
            dst = os.path.join(OUT, "originals", sub, os.path.basename(src))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)
            orig.append(f"originals/{sub}/{os.path.basename(src)}  <-  {rel(src)}")
        for p in sorted(glob.glob(os.path.join(ROOT, "Catalogs", "*.pdf"))):
            cp(p, "catalog-pdfs")
        for p in sorted(glob.glob(os.path.join(ROOT, "scripts", "parts-catalog", "out", "*"))):
            cp(p, "parts-catalog-extracts")
        cp(os.path.join(ROOT, "scripts", "parts-catalog", "dl"), "parts-catalog-downloads")
        cp(os.path.join(ROOT, "scripts", "howards_cams.json"), "website-data")
        for n in ["engines", "cam-catalog.json", "cam-fitment.json"] + [f + ".json" for f in REFERENCE_FILES]:
            cp(os.path.join(EB, "public", "data", n), "website-data")
        cp(os.path.join(EB, "data", "engine-sources"), "website-data")
        cp(os.path.join(EB, "data", "vehicles"), "website-data")
        for n in ["buildFieldDefs.ts", "camDatabase.ts", "buildParts.ts", "dieselParts.ts", "engineSpecs.ts", "platformSpecs.ts", "valvetrainReferenceBuilds.ts", "hpEstimatorData.ts"]:
            cp(os.path.join(EB, "src", "data", n), "website-code")
        for p in sorted(glob.glob(os.path.join(ROOT, "engine-db", "init", "*.sql"))):
            cp(p, "engine-db-sql")

    write_readme(counts, per_file, ambiguous, orig)
    json.dump(dict(counts=counts, per_file=per_file, ambiguous_aliases=ambiguous, disagreements=DISAGREE, originals=orig),
              open(os.path.join(OUT, "_export_summary.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    for k, v in counts.items():
        print(f"{v:>7}  {k}")
    print("ambiguous aliases:", ambiguous, "| disagreements:", len(DISAGREE), "| originals copied:", len(orig))


if __name__ == "__main__":
    main()
