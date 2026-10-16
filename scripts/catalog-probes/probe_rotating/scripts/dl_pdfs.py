import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite
pdfs = [
 ("https://www.us.mahle.com/media/usa/motorsports/2026-mms-ap-guide-digital.pdf", "mahle_powerpak_2026.pdf"),
 ("https://cdn.arp-bolts.com/ARPCatalog.pdf", "arp_catalog.pdf"),
 ("https://www.manleyperformance.com/wp-content/uploads/2026/05/Updated-2022-AutoCatalog-all-pages-for-website.pdf-4-20-2026.pdf", "manley_catalog.pdf"),
 ("https://nason.com.au/wp-content/uploads/2024/03/Eagle-2024-Catalog.pdf", "eagle_2024_catalog.pdf"),
 ("https://uempistons.com/themes/UEM/images/Icon_catalog.pdf", "uem_icon_catalog.pdf"),
 ("https://www.cometic.com/files/catalogs/AB23.pdf", "cometic_ab23.pdf"),
 ("https://www.felpro.com/content/dam/marketing/North-America/felpro/pdfs/LS-Line-Card.pdf", "felpro_ls_linecard.pdf"),
]
for url, name in pdfs:
    p, txt, st = polite.robots(url)
    print(f"\n### robots {url.split('/')[2]} status={st} len={len(txt)}")
    for line in txt.splitlines()[:60]:
        if line.strip() and not line.startswith("#"):
            print("   ", line.strip()[:120])
    r = polite.get(url, save_as=name, stream=True, timeout=300)
    if r is not None:
        print(f"   -> {r.status_code} {r.headers.get('content-type')} saved={name}")
