import sys, re, json
from bs4 import BeautifulSoup
fn=sys.argv[1]
raw=open(fn,encoding="utf-8",errors="replace").read()
s=BeautifulSoup(raw,"html.parser")
print("## TITLE:", (s.title.get_text(strip=True) if s.title else "-"))
ts=s.find_all("table"); print("## tables:",len(ts))
for t in ts[:5]:
    rows=t.find_all("tr")
    print(f"  table rows={len(rows)}")
    for r in rows[:12]:
        print("   ",[c.get_text(" ",strip=True)[:40] for c in r.find_all(["td","th"])])
ld=s.find_all("script",type="application/ld+json")
print("## json-ld blocks:",len(ld))
for x in ld[:3]: print("   ",x.get_text()[:600].replace("\n"," "))
# spec-like dl / li
for dl in s.find_all("dl")[:3]:
    print("## dl:",[(dt.get_text(' ',strip=True)[:30], dd.get_text(' ',strip=True)[:40]) for dt,dd in zip(dl.find_all('dt'),dl.find_all('dd'))][:12])
# XHR / API hints
hints=set(re.findall(r"""["'](/(?:rest|graphql|api|ajax|wp-json|products\.json|collections)[^"' ]{0,80})""",raw))
print("## api-ish paths:",sorted(hints)[:20])
print("## platform hints:", [k for k in ["Magento","Shopify","WooCommerce","BigCommerce","Wix","Squarespace","webshopmanager","Volusion","nopCommerce","wsm"] if k.lower() in raw.lower()])
txt=s.get_text("\n",strip=True)
for k in sys.argv[2:]:
    i=txt.find(k)
    print(f"## ctx[{k}]:", txt[max(0,i-100):i+500].replace("\n"," | ") if i>=0 else "none")
