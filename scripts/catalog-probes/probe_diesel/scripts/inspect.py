import sys,json,re
from bs4 import BeautifulSoup
SPEC=re.compile(r"inducer|exducer|compression|\blift\b|duration|gph|psi|% over|percent|rod length|\bbore\b|a/r|lsa|horsepower|\bhp\b|rwhp|c\.?r\.|stroke|thread|torque|material|part ?(#|no|number)|sku",re.I)
for p in sys.argv[1:]:
    raw=open(p,"rb").read()
    print("\n#####",p,len(raw))
    if p.endswith(".json"):
        try:
            j=json.loads(raw.decode("utf-8","replace"))
        except Exception as e:
            print("json err",e); print(raw[:500]); continue
        s=json.dumps(j)[:1800]; print(s); continue
    if p.endswith(".xml") or raw[:5]==b"<?xml":
        t=raw.decode("utf-8","replace"); print(t[:1500]); print("loc count",t.count("<loc>")); continue
    s=BeautifulSoup(raw,"html.parser")
    print("TITLE:",s.title.get_text(strip=True) if s.title else None)
    for sc in s.find_all("script",type="application/ld+json"):
        try:
            j=json.loads(sc.string or "")
        except Exception: continue
        js=json.dumps(j)
        if "Product" in js or "Offer" in js: print("JSONLD:",js[:900])
    for i,t in enumerate(s.find_all("table")[:6]):
        rows=[[c.get_text(" ",strip=True)[:45] for c in tr.find_all(["td","th"])] for tr in t.find_all("tr")]
        rows=[r for r in rows if any(r)]
        if rows:
            print(f"TABLE{i} rows={len(rows)}")
            for r in rows[:10]: print("   ",r)
    txt=s.get_text("\n",strip=True)
    hits=[l for l in txt.split("\n") if SPEC.search(l) and 8<len(l)<220]
    seen=set(); out=[]
    for h in hits:
        if h not in seen: seen.add(h); out.append(h)
    print("SPEC-LINES:",len(out))
    for h in out[:28]: print("   -",h)
    pdfs=sorted({a["href"] for a in s.find_all("a",href=True) if ".pdf" in a["href"].lower()})
    if pdfs: print("PDF LINKS:",pdfs[:10])
