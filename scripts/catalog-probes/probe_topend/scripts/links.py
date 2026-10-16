import sys, re, html
from bs4 import BeautifulSoup
fn, pat = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else r"\.pdf|catalog|flow|download|spec"
soup = BeautifulSoup(open(fn, encoding="utf-8", errors="replace").read(), "html.parser")
seen = set()
for a in soup.find_all(["a", "iframe", "embed", "object", "source"]):
    href = a.get("href") or a.get("src") or a.get("data")
    if not href: continue
    href = html.unescape(href)
    if re.search(pat, href, re.I) and href not in seen:
        seen.add(href)
        print(f"{href}  |  {a.get_text(' ', strip=True)[:70]}")
print(f"-- {len(seen)} matches")
