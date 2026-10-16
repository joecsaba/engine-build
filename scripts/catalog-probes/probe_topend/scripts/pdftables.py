"""Usage: python -I scripts/pdftables.py PDF page [page ...]   (1-based)
Runs pdfplumber extract_tables (lines + text strategies) and prints first rows; also prints first 40 text lines."""
import sys, pdfplumber
fn = sys.argv[1]; pages = [int(x) for x in sys.argv[2:]]
with pdfplumber.open(fn) as pdf:
    for p in pages:
        pg = pdf.pages[p - 1]
        print(f"\n######## page {p}  size={pg.width:.0f}x{pg.height:.0f} chars={len(pg.chars)} images={len(pg.images)} lines={len(pg.lines)} rects={len(pg.rects)}")
        for strat in ("lines", "text"):
            try:
                ts = pg.extract_tables({"vertical_strategy": strat, "horizontal_strategy": strat})
            except Exception as e:
                print(f"  [{strat}] error {e}"); continue
            print(f"  [{strat}] tables={len(ts)} sizes={[ (len(t), max(len(r) for r in t) if t else 0) for t in ts][:8]}")
            for t in ts[:3]:
                for r in t[:6]:
                    print("    ", [ (c or '').replace('\n',' ')[:22] for c in r])
                print("     ...")
        txt = pg.extract_text(layout=False) or ""
        lines = txt.splitlines()
        print(f"  text lines={len(lines)}; first 30:")
        for l in lines[:30]: print("   |", l[:160])
