import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite, re
from bs4 import BeautifulSoup
r = polite.get("https://melling.com/parts-lookup-make-model-year-engine-vin-code-part-number/")
print("lookup page status", r.status_code if r else None)
if r is not None:
    open(os.path.join(polite.DL, "melling_lookup.html"), "wb").write(r.content)
    s = BeautifulSoup(r.text, "lxml")
    for f in s.find_all("form"):
        print("FORM", f.get("action"), f.get("method"), [(i.get("name"), i.get("type") or i.name) for i in f.find_all(["input","select"]) if i.get("name")][:10])
    for fr in s.find_all("iframe"): print("IFRAME", fr.get("src"))
    txt = r.text
    for m in sorted(set(re.findall(r"""https?://[^"'\s<>]*(?:catalog|lookup|ecat|showmetheparts|api|aces|partsearch|search)[^"'\s<>]*""", txt, re.I)))[:25]:
        print("URL", m[:160])
for url, name in [("https://melling.com/wp-content/uploads/2025/05/SBC-Brochure-2024_Final_TOC.pdf", "melling_sbc_brochure.pdf"),
                  ("https://melling.com/wp-content/uploads/2025/12/LS-LT-Brochure-March-2026_Rev-7_Website-EDIT.pdf", "melling_ls_lt_brochure.pdf")]:
    r = polite.get(url, save_as=name, stream=True, timeout=300)
    print(name, r.status_code if r else None, r.headers.get("content-type") if r else None)
