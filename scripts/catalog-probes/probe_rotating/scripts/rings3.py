import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite
r = polite.get("https://cdn.prod.website-files.com/65d64154830620fc6bbc3cc0/6668bcd76f9a35ede1e30f2e_TS_2022_CAT_WEB.pdf", save_as="totalseal_2022_catalog.pdf", stream=True, timeout=300)
print("totalseal catalog", r.status_code if r else None, r.headers.get("content-type") if r else None)
r = polite.get("https://store.totalseal.com/products.json?limit=3")
print("shopify products.json", r.status_code if r else None, (r.headers.get("content-type") if r else None))
if r is not None and r.status_code == 200:
    open(os.path.join(polite.DL, "totalseal_products.json"), "wb").write(r.content)
    print(r.text[:1200])
for u in ["https://www.hastingsmanufacturing.com/", "https://hastingspistonrings.com/"]:
    r = polite.get(u)
    print(u, r.status_code if r else None, r.url if r else None, (r.text[:200].replace("\n"," ") if r is not None else ""))
