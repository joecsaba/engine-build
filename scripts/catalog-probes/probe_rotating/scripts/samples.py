"""Extract small evidence samples from each source into samples/*.csv|json."""
import sys, os, re, csv, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import pdfplumber, pymupdf
from bs4 import BeautifulSoup
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL, SM = os.path.join(BASE, "dl"), os.path.join(BASE, "samples")
os.makedirs(SM, exist_ok=True)
Q = "˝\"”"  # double-prime variants used as inch marks in the PDFs

def save(name, header, rows):
    p = os.path.join(SM, name)
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)
    print(f"{name}: {len(rows)} rows")
    for r in rows[:5]: print("    ", r)

def lines(pdf, pno, clip=None):
    pg = pymupdf.open(os.path.join(DL, pdf))[pno-1]
    return [l.rstrip() for l in (pg.get_text("text", clip=clip) if clip else pg.get_text("text")).splitlines()]

def plines(pdf, pno):
    with pdfplumber.open(os.path.join(DL, pdf)) as p:
        return (p.pages[pno-1].extract_text() or "").splitlines()

# 1 MAHLE PowerPak: fill-down parse of text lines
rows = []; carry = {}; heading = ""
for pno in (6, 12):
    for l in plines("mahle_powerpak_2026.pdf", pno):
        t = l.split()
        if not t: continue
        if re.match(r"^[A-Z][A-Z0-9 .\-/&()º°]+(FLAT TOP|DOME|DISH)", l): heading = l.strip(); continue
        if not re.match(r"^930\d{6}\*{0,2}$", t[-1]): continue
        pn = t[-1]
        if len(t) >= 16:
            cid, bore, stroke, rod, ch, pin, dome, wt, cr1, cr2, cr3, alloy, ring, cmin, cmax = t[:15]
            carry = dict(stroke=stroke, rod=rod, ch=ch, pin=pin, dome=dome, alloy=alloy, ring=ring, cmin=cmin, cmax=cmax)
        elif len(t) >= 7:
            cid, bore, wt, cr1, cr2, cr3 = t[:6]
            if len(t) >= 11: carry.update(dict(alloy=t[6], ring=t[7], cmin=t[8], cmax=t[9]))
            if not carry: continue
        else:
            continue
        rows.append([pno, heading, cid, bore, carry["stroke"], carry["rod"], carry["ch"], carry["pin"], carry["dome"], wt, cr1, cr2, cr3, carry["alloy"], carry["ring"], carry["cmin"], carry["cmax"], pn])
save("mahle_powerpak_sample.csv", ["page","section","cid","bore","stroke","rod","comp_ht","pin","dome_cc","weight_g","cr_a","cr_b","cr_c","alloy","ring_pack_in","clr_min","clr_max","part_no"], rows)

# 2 ARP: word x-positions -> columns (page 48 rod bolts)
with pdfplumber.open(os.path.join(DL, "arp_catalog.pdf")) as p:
    pg = p.pages[47]
    words = pg.extract_words(keep_blank_chars=False, x_tolerance=1.5)
    pnw = [w for w in words if re.fullmatch(r"\d{3}-\d{4}", w["text"])]
    xs = sorted(set(round(w["x0"]) for w in pnw)); cols = []
    for x in xs:
        if not cols or x - cols[-1][-1] > 12: cols.append([x])
        else: cols[-1].append(x)
    centers = [sum(c)/len(c) for c in cols]
    colnames = ["HiPerf8740_complete","HiPerf8740_2pc","HPWave8740_complete","HPWave8740_2pc","ProWaveARP2000_complete","ProWaveARP2000_2pc","ProSeriesARP2000_complete","ProSeriesARP2000_2pc"][:len(centers)]
    byline = {}
    for w in words: byline.setdefault(round(w["top"]/3), []).append(w)
    rows = []; section = ""
    for k in sorted(byline):
        ws = sorted(byline[k], key=lambda w: w["x0"])
        text = " ".join(w["text"] for w in ws)
        if re.match(r"^[A-Z][A-Z ,/&0-9-]{6,}$", text) and not re.search(r"\d{3}-\d{4}", text): section = text; continue
        pns = [w for w in ws if re.fullmatch(r"\d{3}-\d{4}", w["text"])]
        if not pns: continue
        app = " ".join(w["text"] for w in ws if w["x1"] < min(centers) - 30 and not re.fullmatch(r"[A-Z]{1,2}", w["text"]))
        style = next((w["text"] for w in ws if re.fullmatch(r"[A-Z]{1,2}", w["text"]) and w["x0"] < min(centers) - 5), "")
        cells = [""] * len(centers)
        for w in pns:
            i = min(range(len(centers)), key=lambda i: abs(centers[i] - w["x0"])); cells[i] = w["text"]
        rows.append([48, section, app, style] + cells)
save("arp_rod_bolts_p48_sample.csv", ["page","section","application","head_style"] + colnames, rows)

# 3 Eagle LS assemblies page 28
rows = []
for l in plines("eagle_2024_catalog.pdf", 28):
    m = re.match(r'^(\d\.\d{3})[' + Q + r']?\s+(\d\.\d{3})[' + Q + r']?\s+(.+?)\s+(\d{1,2}\.\d)\s+(\d{1,2}\.\d)\s+(.*)$', l)
    if not m: continue
    rest = m.group(6).split(); disp = rest[:10]; pns = [x for x in rest[10:] if re.fullmatch(r"B?\d{5}\*?", x)]
    rows.append([28, "CHEVROLET 4.8L/5.3L/5.7L LS1 ASSEMBLIES", m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), " ".join(disp), " ".join(pns)])
save("eagle_ls_assemblies_p28_sample.csv", ["page","section","stroke","rod","piston_desc","cr_61cc","cr_66cc","displacement_by_bore(3.780..4.000)","kit_part_numbers(unbal/bal x reluctor)"], rows)

# 3b Eagle website item page -> key/value
s = BeautifulSoup(open(os.path.join(DL, "eagle3_0.html"), "rb").read(), "lxml")
txt = s.get_text("\n", strip=True)
kv = dict(re.findall(r"^([a-z][a-z /]+): (.+)$", txt, re.M))
pn = re.search(r"Part# (\S+)", txt)
json.dump({"url": "https://eaglerod.com/item/5523247-4340-crank-chevy-bb-int-bal-4250-strok", "part_no": pn.group(1) if pn else None, "title": s.title.string.strip() if s.title else None, "highlights": kv}, open(os.path.join(SM, "eagle_item_page_sample.json"), "w"), indent=1)
print("eagle_item_page_sample.json:", kv)

# 4 UEM numerical listing (pdfplumber table) + Icon detail lines
rows = []
with pdfplumber.open(os.path.join(DL, "uem_listing_section.pdf")) as p:
    for t in p.pages[1].extract_tables():
        for r in t[1:]:
            if r and r[0] and re.match(r"^(IC|KB|FHR)\d+", r[0]): rows.append([2] + [c or "" for c in r])
save("uem_icon_numerical_listing_p2_sample.csv", ["page","part_no","mfg","disp","rod","description","ring_pack","catalog_pg"], rows)
rows = []
clip = pymupdf.Rect(0, 0, 540, 792)
for l in lines("uem_icon_catalog.pdf", 11, clip=clip) + lines("uem_icon_catalog.pdf", 18, clip=clip):
    m = re.match(r'^\s*(IC\d+[A-Z]*)\s*/\s*(\w+)\s+(\d\.\d{3})\s+(\d\.\d{3})\s+(\.\d{3,4})\s*x\s*(\d\.\d{3})"?\s+(.+?)\s+(\d{1,2}\.\d(?:\s+\d{1,2}\.\d)*)\s+(\d{3}/\d{2,3})\s+(\.\d{3})"?\s+(.*)$', l)
    if m: rows.append(list(m.groups()))
save("uem_icon_detail_lines_sample.csv", ["part_no","pin_type","rod","comp_ht","pin_dia","pin_len","dish_dome","cr_values","gram_wt_piston/pin","top_land","valve_relief"], rows)

# 5 Cometic page 37 dotted-leader rows
rows = []; eng = ""; sub = ""
for l in plines("cometic_ab23.pdf", 37):
    s_ = l.strip()
    if re.match(r"^\d\.\dL .*(Hemi|V8)", s_) or re.match(r"^[A-Z][A-Za-z0-9 .,/&-]+ V8 \d{4}", s_): eng = s_; continue
    if re.match(r"^(MLX|MLS|SEG|StreetPro|Top End|Bottom End).*", s_) and "....." not in s_: sub = s_; continue
    m = re.match(r'^(\d\.\d{3})[' + Q + r']?\s*\.{3,}\s*(0?\.\d{3})[' + Q + r']?\s*\.{3,}\s*(\d+)\s*\.{3,}\s*(C\d{4,5}-\d{3})\s*\.{3,}\s*\$([\d.,]+)', s_)
    if m: rows.append([37, eng, sub] + list(m.groups()))
save("cometic_ab23_p37_sample.csv", ["page","engine","gasket_type","bore_in","thickness_in","pkg_qty","part_no","list_price"], rows)

# 6 Fel-Pro LS line card
rows = []
for pno in (1, 2):
    for l in plines("felpro_ls_linecard.pdf", pno):
        m = re.match(r'^(\d{4}[A-Z]?(?:-\d{3})?\*?)\s+(\d\.\d{3})[' + Q + r']\s+(\.\d{3})[' + Q + r']\s+([\d.]+cc)\s+(.*)$', l.strip())
        if m: rows.append([pno] + list(m.groups()))
save("felpro_ls_linecard_sample.csv", ["page","part_no","bore_in","thickness_in","volume_cc","description"], rows)

# 7 Callies product page tables
rows = []
for fn, url in (("callies2_1.html", "compstar-small-block-chevy"), ("callies2_2.html", "ls-ultra-ud-forged")):
    s = BeautifulSoup(open(os.path.join(DL, fn), "rb").read(), "lxml")
    seen = set()
    for t in s.find_all("table"):
        first = t.find("tr")
        if not first: continue
        hdr = [c.get_text(" ", strip=True) for c in first.find_all(["th", "td"])]
        if "Part #" not in " ".join(hdr): continue
        for r in t.find_all("tr")[1:]:
            cells = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
            if any(cells) and tuple(cells) not in seen:
                seen.add(tuple(cells)); rows.append([url] + hdr[:5] + cells[:5])
save("callies_product_tables_sample.csv", ["product_page","h1","h2","h3","h4","h5","c1","c2","c3","c4","c5"], rows)

# 8 Scat Store API item
d = json.load(open(os.path.join(DL, "scat3_2.txt"), encoding="utf-8"))
out = [{"id": it["id"], "sku": it["sku"], "name": it["name"], "permalink": it["permalink"], "price_cents": it["prices"]["price"],
        "categories": [c["name"] for c in it["categories"]], "attributes": {a["name"]: [t["name"] for t in a["terms"]] for a in it["attributes"]}} for it in d]
json.dump(out, open(os.path.join(SM, "scat_store_api_sample.json"), "w"), indent=1); print("scat_store_api_sample.json:", len(out), "items")

# 9 King-catalog product page spec table
s = BeautifulSoup(open(os.path.join(DL, "kingcat2_1.html"), "rb").read(), "lxml")
rows = []
for t in s.find_all("table"):
    for r in t.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in r.find_all(["th", "td"])]
        if cells: rows.append(["CR4287XPC"] + cells[:5])
save("king_catalog_product_table_sample.csv", ["sku","c1","c2","c3","c4","c5"], rows)

# 10 Melling SBC oil pump relief spring table
rows = []
with pdfplumber.open(os.path.join(DL, "melling_sbc_brochure.pdf")) as p:
    for t in p.pages[3].extract_tables():
        if len(t) > 1 and t[1] and t[1][0] and "Part" in t[1][0]:
            for r in t[2:]: rows.append([4] + [c or "" for c in r])
save("melling_sbc_p4_sample.csv", ["page","part_no","material","psi","color","contains","fitment"], rows)
