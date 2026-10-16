import sys,json
for l in open(sys.argv[1],encoding="utf-8"):
    l=l.strip()
    if not l: continue
    e=json.loads(l)
    print(str(e.get('status'))[:40], e['url'][:85], '| ct:',(e.get('ct') or '')[:25], '| len',e.get('len'), '| title:',(e.get('title') or '')[:55], '| tbl',e.get('n_tables'),'ld',e.get('jsonld'),'shop',e.get('shopify'),'woo',e.get('woocommerce'),'mag',e.get('magento'),'bc',e.get('bigcommerce'),'chal',e.get('challenge'),'pdf',e.get('n_pdf_links'),'| json',e.get('json_keys'),e.get('n_products'),'| srv',e.get('server'),'cf',e.get('cf'))
