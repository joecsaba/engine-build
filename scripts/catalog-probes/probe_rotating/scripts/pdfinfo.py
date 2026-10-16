"""Usage: pdfinfo.py <pdf> [pages...] -- prints page count, text-vs-scan check, and table extraction samples."""
import sys
import sys, os, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace"); sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import pdfplumber, pymupdf

path = sys.argv[1]
pages = [int(p) for p in sys.argv[2:]]
size = os.path.getsize(path)
doc = pymupdf.open(path)
n = doc.page_count
print(f"FILE {path}\nSIZE {size/1e6:.1f} MB  PAGES {n}")
# text vs scanned: sample up to 12 pages spread through the doc
samp = sorted(set([0, 1, 2] + [int(n*i/10) for i in range(1, 10)] + [n-1]))
samp = [p for p in samp if 0 <= p < n]
text_pages = 0; img_pages = 0
for p in samp:
    pg = doc[p]
    t = pg.get_text("text")
    imgs = pg.get_images()
    if len(t.strip()) > 100: text_pages += 1
    if imgs and len(t.strip()) < 100: img_pages += 1
print(f"SAMPLE {len(samp)} pages: {text_pages} have text layer, {img_pages} image-only")
if pages:
    with pdfplumber.open(path) as pdf:
        for p in pages:
            if p-1 >= n: continue
            pg = pdf.pages[p-1]
            print(f"\n===== page {p} (pdfplumber) =====")
            tabs = pg.extract_tables()
            print(f"tables found: {len(tabs)}")
            for ti, t in enumerate(tabs[:2]):
                print(f"-- table {ti}: {len(t)} rows x {len(t[0]) if t else 0} cols")
                for row in t[:8]:
                    print("   ", row)
            txt = pg.extract_text() or ""
            lines = txt.splitlines()
            print(f"-- text lines: {len(lines)}; first 25:")
            for l in lines[:25]: print("   ", l)
            print(f"===== page {p} (pymupdf words->lines, first 12) =====")
            t2 = doc[p-1].get_text("text").splitlines()
            for l in t2[:12]: print("   ", l)
