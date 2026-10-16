import csv, json, re, os, glob
import pdfplumber, pymupdf
from bs4 import BeautifulSoup
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.join(B, "dl"); S = os.path.join(B, "samples"); os.makedirs(S, exist_ok=True)
def w(name, rows, header=None):
    p = os.path.join(S, name)
    with open(p, "w", newline="", encoding="utf-8") as f:
        c = csv.writer(f)
        if header: c.writerow(header)
        for r in rows: c.writerow([(x or "").replace("\n", " ").strip() if isinstance(x, str) else x for x in r])
    print(f"wrote {name}: {len(rows)} rows")
def lines_tables(pdf, page):
    with pdfplumber.open(pdf) as p:
        return p.pages[page-1].extract_tables({"vertical_strategy": "lines", "horizontal_strategy": "lines"})
def text(pdf, page):
    return pymupdf.open(pdf)[page-1].get_text()
def html_tables(fn):
    s = BeautifulSoup(open(fn, encoding="utf-8", errors="replace").read(), "html.parser")
    out = []
    for t in s.find_all("table"):
        out.append([[c.get_text(" ", strip=True) for c in r.find_all(["td", "th"])] for r in t.find_all("tr")])
    return out

S3 = os.path.join(DL, "edelbrock-files-v1.s3-us-west-1.amazonaws.com")
COMP = glob.glob(S3 + "/*COMP-Catalog.pdf")[0]; LOBE = glob.glob(S3 + "/*Lobe*.pdf")[0]; EDEL = glob.glob(S3 + "/*Edelbrock-Catalog.pdf")[0]

# 1 COMP lobe catalog p13-14 (lines strategy, clean)
rows = []
for pg in (13, 14):
    for t in lines_tables(LOBE, pg):
        for r in t:
            if r and re.match(r"^\d{4}[A-Z]?$", (r[1] or "").strip() if len(r) > 1 else ""):
                rows.append([pg] + r)
w("comp_lobe_catalog_p13-14.csv", rows, ["pdf_page", "cam_type", "lobe_no", "rated_dur", "dur_050", "dur_200", "lobe_lift", "tdc_lift_106", "tdc_lift_110", "valve_lift_1.5", "valve_lift_1.6", "valve_lift_1.7"])

# 2 COMP catalog SBC application page p118: parse text stream (part# then grind, adv in/ex, .050 in/ex, lift in/ex, LSA)
t = text(COMP, 118).splitlines()
rows = []
pn = re.compile(r"^\d{2}-\d{3}-\d{1,2}$")
for i, l in enumerate(t):
    if pn.match(l.strip()) and i + 8 < len(t):
        seq = [x.strip() for x in t[i:i+9]]
        rows.append(seq)
w("comp_catalog_sbc_p118_rows.csv", rows, ["cam_part", "grind", "adv_in", "adv_ex", "dur050_in", "dur050_ex", "lift_in", "lift_ex", "lsa"])
# also the raw text for reference
open(os.path.join(S, "comp_catalog_sbc_p118_rawtext.txt"), "w", encoding="utf-8").write("\n".join(t))

# 3 COMP springs master chart p300 (lines strategy)
ts = lines_tables(COMP, 300)
w("comp_springs_master_chart_p300.csv", ts[0] if ts else [])

# 4 Edelbrock heads p94 (LS) and p97 (BBC) lines tables
rows = []
for pg in (94, 97):
    for tb in lines_tables(EDEL, pg):
        if tb and len(tb[0]) >= 12:
            for r in tb: rows.append([pg] + r)
w("edelbrock_heads_p94_p97.csv", rows)
# Edelbrock intakes p30 text rows
rows = [l for l in text(EDEL, 30).splitlines() if re.search(r"Sq\. Bore|Spread|Idle-\d{4}|\d{4}-\d{4}", l)]
w("edelbrock_intakes_p30_textrows.csv", [[r] for r in rows], ["raw_row"])
# Edelbrock flow data HTML tables
tbs = html_tables(glob.glob(DL + "/www.edelbrock.com/*flow-data*.html")[0])
rows = []
for k, tb in enumerate(tbs):
    for r in tb: rows.append([k] + r)
w("edelbrock_flow_data_html_tables.csv", rows)

# 5 Isky catalog p71 (Mega-cams) text rows + p91 SBC
rows = []
for pg in (71, 91):
    for l in text(glob.glob(DL + "/www.iskycams.com/a8369e*IskyCatalog.pdf")[0], pg).splitlines():
        if re.search(r"\b\d{6}\b", l) and re.search(r"\.\d{3}", l): rows.append([pg, l])
w("isky_catalog_p71_p91_textrows.csv", rows, ["pdf_page", "raw_row"])
ts = lines_tables(glob.glob(DL + "/www.iskycams.com/*Spring-Spec*.pdf")[0], 3)
w("isky_spring_spec_book_p3.csv", ts[0] if ts else [])

# 6 Crower Chevrolet cams p1,p3 lines tables + spring booklet p3
rows = []
CR = glob.glob(DL + "/crower.com/*Chevrolet_120824*.pdf")[0]
for pg in (1, 3):
    for tb in lines_tables(CR, pg):
        for r in tb:
            if r and re.match(r"^0\d{4}", (r[0] or "")): rows.append([pg] + r)
w("crower_chevrolet_cams_p1_p3.csv", rows, ["pdf_page", "part_no", "cid", "grind", "lsa", "adv_dur_in_ex", "dur050_in_ex", "lift_in_ex"])
ts = lines_tables(glob.glob(DL + "/crower.com/*Spring_Booklet*.pdf")[0], 3)
w("crower_spring_booklet_p3.csv", ts[0] if ts else [])
# Crower category listing
s = BeautifulSoup(open(glob.glob(DL + "/crower.com/42e043_*.html")[0], encoding="utf-8", errors="replace").read(), "html.parser")
items = []
for it in s.select(".product-item"):
    a = it.select_one("a.product-item-link"); sku = it.select_one(".sku, [class*=sku]")
    items.append({"name": a.get_text(strip=True) if a else None, "url": a.get("href") if a else None, "text": it.get_text(" ", strip=True)[:400]})
json.dump(items, open(os.path.join(S, "crower_sbc_hft_compupro_listing.json"), "w"), indent=1); print("wrote crower listing", len(items))

# 7 Brodix head page HTML tables + catalog p6 text rows
tbs = html_tables(glob.glob(DL + "/brodix.com/45a247_*.html")[0])
rows = []
for k, tb in enumerate(tbs):
    for r in tb: rows.append([k] + r)
w("brodix_br3_head_page_tables.csv", rows)
BR = glob.glob(DL + "/brodix.com/*Catalogweb.pdf")[0]
rows = [[l] for l in text(BR, 6).splitlines() if re.search(r"\b1\d{6}\b", l) or re.search(r"(INTAKE|EXHAUST)\s+\d", l)]
w("brodix_catalog_p6_br7_textrows.csv", rows, ["raw_row"])

# 8 Trend p7 table
ts = lines_tables(glob.glob(DL + "/trendperform.com/*catalog-pdf.pdf")[0], 7)
w("trend_stocking_pushrods_p7.csv", ts[0] if ts else [])

# 9 BTR product attribute tables
out = {}
for fn in glob.glob(DL + "/briantooleyracing.com/*.html"):
    tbs = html_tables(fn); s = BeautifulSoup(open(fn, encoding="utf-8", errors="replace").read(), "html.parser")
    d = s.select_one(".product.attribute.description")
    out[os.path.basename(fn)] = {"title": s.title.get_text(strip=True) if s.title else None, "attributes": tbs[0] if tbs else None, "description_head": d.get_text(" ", strip=True)[:500] if d else None}
json.dump(out, open(os.path.join(S, "btr_product_pages.json"), "w"), indent=1); print("wrote btr json", len(out))

# 10 Shopify JSON (trimmed)
for host in ("scorpionracingproducts.com", "harlandsharp.com"):
    fn = glob.glob(DL + f"/{host}/*_products.json")[0]
    j = json.load(open(fn, encoding="utf-8"))
    slim = [{"title": p["title"], "handle": p["handle"], "product_type": p.get("product_type"), "tags": p.get("tags"),
             "variants": [{"sku": v.get("sku"), "title": v.get("title"), "price": v.get("price")} for v in p.get("variants", [])],
             "body_text": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", p.get("body_html") or ""))[:700]} for p in j["products"]]
    json.dump(slim, open(os.path.join(S, f"{host.split('.')[0]}_products_json_sample.json"), "w"), indent=1); print("wrote", host, len(slim))

# 11 Dart 2019 (third-party copy) p25 text rows
DT = glob.glob(DL + "/www.toolsid.com/*.pdf")[0]
rows = [[25, l] for l in text(DT, 25).splitlines() if re.search(r"\b1\d{7}\b", l) or "CHAMBERS" in l]
rows += [[27, l] for l in text(DT, 27).splitlines() if re.search(r"\b1\d{7}\b", l) or "CHAMBERS" in l]
w("dart2019_thirdparty_p25_p27_textrows.csv", rows, ["pdf_page", "raw_row"])
