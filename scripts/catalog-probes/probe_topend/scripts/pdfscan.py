"""Usage: python -I scripts/pdfscan.py PDF [regex] [maxhits]
Prints page count, text/scanned ratio, and the first pages matching regex with char counts."""
import sys, re, pymupdf
fn = sys.argv[1]; pat = re.compile(sys.argv[2] if len(sys.argv) > 2 else r"Duration", re.I)
maxhits = int(sys.argv[3]) if len(sys.argv) > 3 else 15
d = pymupdf.open(fn)
n = d.page_count; txt = 0; hits = []
for i in range(n):
    t = d[i].get_text()
    if len(t.strip()) > 150: txt += 1
    if pat.search(t): hits.append((i + 1, len(t), len(pat.findall(t))))
print(f"{fn}: pages={n} textpages={txt} imagespages={n-txt} producer={d.metadata.get('producer')}")
print(f"pages matching /{pat.pattern}/: {len(hits)}")
for p, l, k in hits[:maxhits]:
    print(f"  p{p} chars={l} matches={k}")
