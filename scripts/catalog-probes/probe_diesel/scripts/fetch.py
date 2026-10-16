"""Polite fetcher: robots.txt first, 6s delay per host, saves raw bodies under dl/<host>/.
Usage: python -I fetch.py <outdir> <url> [<url> ...]
Prints: status, content-type, length, robots verdict, and a short HTML/JSON summary.
"""
import sys, os, time, json, re, hashlib
from urllib.parse import urlparse
import urllib.robotparser as rp
import requests
from bs4 import BeautifulSoup

UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
HEADERS = {"User-Agent": UA, "Accept": "text/html,application/json;q=0.9,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.8"}
outdir = sys.argv[1]
urls = sys.argv[2:]
last_hit = {}
robots_cache = {}
log = []

def host_of(u): return urlparse(u).netloc.lower()

def get_robots(u):
    h = host_of(u)
    if h in robots_cache: return robots_cache[h]
    rurl = f"{urlparse(u).scheme}://{h}/robots.txt"
    r = rp.RobotFileParser()
    txt = ""
    status = None
    try:
        resp = requests.get(rurl, headers=HEADERS, timeout=25, allow_redirects=True)
        status = resp.status_code
        txt = resp.text if resp.status_code == 200 else ""
        r.parse(txt.splitlines())
    except Exception as e:
        txt = f"ERR {e}"
        r.parse([])
    d = os.path.join(outdir, h); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "robots.txt"), "w", encoding="utf-8", errors="replace").write(f"# status {status}\n{txt}")
    # crude summary
    dis = [l.strip() for l in txt.splitlines() if l.lower().startswith("disallow")]
    agents = [l.strip() for l in txt.splitlines() if l.lower().startswith("user-agent")]
    cd = [l.strip() for l in txt.splitlines() if l.lower().startswith("crawl-delay")]
    summary = {"status": status, "n_agents": len(agents), "n_disallow": len(dis), "crawl_delay": cd[:2], "disallow_sample": dis[:12]}
    robots_cache[h] = (r, summary)
    last_hit[h] = time.time()
    return robots_cache[h]

for u in urls:
    h = host_of(u)
    r, rsum = get_robots(u)
    allowed = r.can_fetch(UA, u) and r.can_fetch("*", u)
    entry = {"url": u, "robots": rsum, "allowed": allowed}
    if not allowed:
        entry["status"] = "SKIPPED(robots)"
        log.append(entry); print(json.dumps(entry)[:600]); continue
    wait = 6 - (time.time() - last_hit.get(h, 0))
    if wait > 0: time.sleep(wait)
    try:
        resp = requests.get(u, headers=HEADERS, timeout=40, allow_redirects=True)
        last_hit[h] = time.time()
        ct = resp.headers.get("content-type", "")
        body = resp.content
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", urlparse(u).path + ("_" + urlparse(u).query if urlparse(u).query else ""))[:120] or "index"
        ext = ".pdf" if "pdf" in ct else (".json" if "json" in ct else ".html")
        d = os.path.join(outdir, h); os.makedirs(d, exist_ok=True)
        fn = os.path.join(d, name + ext)
        open(fn, "wb").write(body)
        entry.update({"status": resp.status_code, "final_url": resp.url, "ct": ct, "len": len(body), "file": fn, "server": resp.headers.get("server",""), "cf": resp.headers.get("cf-ray","")!="" })
        if "html" in ct:
            soup = BeautifulSoup(body, "html.parser")
            entry["title"] = (soup.title.string.strip() if soup.title and soup.title.string else "")[:120]
            entry["n_tables"] = len(soup.find_all("table"))
            entry["jsonld"] = len(soup.find_all("script", type="application/ld+json"))
            txt = body.decode("utf-8", "replace")
            entry["shopify"] = ("cdn.shopify.com" in txt) or ("Shopify.theme" in txt)
            entry["bigcommerce"] = "bigcommerce" in txt.lower()
            entry["woocommerce"] = "woocommerce" in txt.lower()
            entry["magento"] = "magento" in txt.lower() or "mage/" in txt.lower()
            entry["challenge"] = any(k in txt for k in ["cf-challenge", "Just a moment", "captcha", "Access Denied", "Attention Required", "_Incapsula_", "px-captcha", "Please verify you are a human"])
            entry["n_links"] = len(soup.find_all("a"))
            entry["n_pdf_links"] = len([a for a in soup.find_all("a", href=True) if ".pdf" in a["href"].lower()])
        elif "json" in ct:
            try:
                j = resp.json()
                entry["json_keys"] = list(j.keys())[:10] if isinstance(j, dict) else f"list[{len(j)}]"
                if isinstance(j, dict) and "products" in j:
                    entry["n_products"] = len(j["products"])
                    if j["products"]:
                        p = j["products"][0]
                        entry["sample_product"] = {k: (str(p.get(k))[:100]) for k in ["title","vendor","product_type","handle"]}
            except Exception as e:
                entry["json_err"] = str(e)
    except Exception as e:
        entry["status"] = f"ERR {e}"
    log.append(entry)
    print(json.dumps(entry)[:900])

open(os.path.join(outdir, "fetch_log.jsonl"), "a", encoding="utf-8").write("\n".join(json.dumps(e) for e in log) + "\n")
