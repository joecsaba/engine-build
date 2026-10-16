"""Usage: pdfdump.py <pdf> <page> [start] [count]. Dumps pymupdf text lines (reading order) of a page."""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import pymupdf
path, page = sys.argv[1], int(sys.argv[2])
start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
count = int(sys.argv[4]) if len(sys.argv) > 4 else 80
doc = pymupdf.open(path)
pg = doc[page-1]
lines = pg.get_text("text", sort=True).splitlines()
print(f"page {page}: {len(lines)} lines, rotation={pg.rotation}, size={pg.rect}")
for i, l in enumerate(lines[start:start+count], start):
    print(f"{i:4d} {l}")
