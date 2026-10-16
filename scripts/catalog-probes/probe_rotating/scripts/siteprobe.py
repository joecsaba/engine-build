"""Usage: siteprobe.py <tag> <url> [<url> ...]. Robots summary + GET + page analysis for each URL, saved under dl/<tag>_N.html"""
import sys
import sys, os, re, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace"); sys.stderr.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

tag = sys.argv[1]
urls = sys.argv[2:]
seen_hosts = set()
for i, url in enumerate(urls):
    host = urlparse(url).netloc
    if host not in seen_hosts:
        seen_hosts.add(host)
        p, txt, st = polite.robots(url)
        print(f"\n######## robots.txt {host} status={st} bytes={len(txt)}")
        keep = [l.strip() for l in txt.splitlines() if l.strip() and not l.startswith("#")]
        for l in keep[:50]: print("   ", l[:140])
        if len(keep) > 50: print(f"    ... ({len(keep)-50} more lines)")
    print(f"\n==== GET {url}")
    r = polite.get(url, timeout=60)
    if r is None:
        print("   (no response / disallowed)"); continue
    ct = r.headers.get("content-type", "")
    print(f"   status={r.status_code} final={r.url} ctype={ct} server={r.headers.get('server')} cf-ray={bool(r.headers.get('cf-ray'))} class={polite.classify(r)}")
    fn = os.path.join(polite.DL, f"{tag}_{i}.{'xml' if 'xml' in ct else 'html' if 'html' in ct else 'txt'}")
    open(fn, "wb").write(r.content)
    if "html" not in ct:
        print("   first 600 chars:", r.text[:600].replace("\n", " "))
        continue
    soup = BeautifulSoup(r.text, "lxml")
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    print(f"   title={title[:100]!r}")
    # JSON-LD
    ld = soup.find_all("script", type="application/ld+json")
    for s in ld[:4]:
        t = (s.string or "")[:400].replace("\n", " ")
        print(f"   JSON-LD: {t}")
    # tables
    tables = soup.find_all("table")
    print(f"   tables={len(tables)}")
    for t in tables[:2]:
        rows = t.find_all("tr")[:4]
        for row in rows:
            print("     TR:", [c.get_text(' ', strip=True)[:30] for c in row.find_all(['th','td'])][:8])
    # forms
    for f in soup.find_all("form")[:5]:
        inputs = [(i.get('name'), i.get('type') or i.name) for i in f.find_all(['input','select']) if i.get('name')]
        print(f"   FORM action={f.get('action')} method={f.get('method')} inputs={inputs[:8]}")
    # scripts and xhr-ish URLs
    srcs = [s.get("src") for s in soup.find_all("script", src=True)]
    print(f"   script srcs ({len(srcs)}):", [s[:80] for s in srcs[:10]])
    inline = "\n".join(s.string or "" for s in soup.find_all("script") if not s.get("src"))
    api_hits = sorted(set(re.findall(r"""["'](/?(?:[\w\-./]*(?:api|ajax|graphql|json|wp-json|search|lookup|catalog)[\w\-./?=&%]*))["']""", inline, re.I)))[:20]
    print(f"   inline api-ish strings ({len(api_hits)}):", api_hits)
    gens = soup.find("meta", attrs={"name": "generator"})
    print("   generator:", gens.get("content") if gens else None, "| wp-content" if "wp-content" in r.text else "", "| shopify" if "cdn.shopify" in r.text else "", "| magento" if "Magento" in r.text or "mage/" in r.text else "", "| bigcommerce" if "bigcommerce" in r.text else "", "| webflow" if "webflow" in r.text.lower() else "", "| sitecore" if "sitecore" in r.text.lower() else "")
    links = [urljoin(r.url, a.get("href")) for a in soup.find_all("a", href=True)]
    same = [l for l in links if urlparse(l).netloc == urlparse(r.url).netloc]
    print(f"   links total={len(links)} same-host={len(same)}")
    interesting = [l for l in same if re.search(r"catalog|product|part|download|pdf|search|engine|application|sku", l, re.I)]
    uniq = []
    for l in interesting:
        if l not in uniq: uniq.append(l)
    print(f"   interesting links ({len(uniq)}):")
    for l in uniq[:35]: print("     ", l[:140])
    pdfs = sorted(set(l for l in links if l.lower().endswith(".pdf")))
    print(f"   pdf links ({len(pdfs)}):")
    for l in pdfs[:20]: print("     ", l[:140])
    body = soup.get_text(" ", strip=True)
    print(f"   visible words={len(body.split())} | sample: {body[:300]!r}")
