"""Usage: pdffind.py <pdf> <regex> [max]. Lists pages whose text matches regex, with match count and first line."""
import sys
import sys, re, pymupdf
sys.stdout.reconfigure(encoding="utf-8", errors="replace"); sys.stderr.reconfigure(encoding="utf-8", errors="replace")
path, pat = sys.argv[1], sys.argv[2]
mx = int(sys.argv[3]) if len(sys.argv) > 3 else 40
doc = pymupdf.open(path)
rx = re.compile(pat, re.I)
hits = []
for i, pg in enumerate(doc):
    t = pg.get_text("text")
    m = rx.findall(t)
    if m:
        first = next((l.strip() for l in t.splitlines() if l.strip()), "")
        hits.append((i+1, len(m), first[:70]))
print(f"{len(hits)} pages match /{pat}/ in {doc.page_count}")
for h in hits[:mx]: print("  p%-4d n=%-4d %s" % h)
