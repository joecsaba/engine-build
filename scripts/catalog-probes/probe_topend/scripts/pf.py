"""Polite fetcher. Usage: python -I scripts/pf.py URL [URL ...]
- fetches robots.txt per host once (cached in dl/_robots/), prints relevant lines, checks allow
- enforces >= 6 s between requests to the same host (state in dl/_state.json), 1 request at a time
- saves body to dl/<host>/<slug>, prints status, final url, content-type, size, challenge hints
"""
import sys, os, re, json, time, hashlib, urllib.parse, urllib.robotparser
import requests

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.join(BASE, "dl")
STATE = os.path.join(DL, "_state.json")
UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
DELAY = 6.0
HEADERS = {"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
           "Accept-Language": "en-US,en;q=0.9"}

def _sf(host):
    os.makedirs(os.path.join(DL, "_state"), exist_ok=True)
    return os.path.join(DL, "_state", re.sub(r"[^A-Za-z0-9.-]", "_", host) + ".json")

def load_state(host="_"):
    try:
        return json.load(open(_sf(host)))
    except Exception:
        return {}

def save_state(s, host="_"):
    json.dump(s, open(_sf(host), "w"))

def wait_host(host):
    s = load_state(host)
    last = s.get("last", 0)
    cd = s.get("cd", 0)
    delay = max(DELAY, float(cd or 0))
    gap = time.time() - last
    if gap < delay:
        time.sleep(delay - gap)
    s["last"] = time.time()
    save_state(s, host)

def slug(url):
    p = urllib.parse.urlparse(url)
    path = p.path.strip("/") or "index"
    path = re.sub(r"[^A-Za-z0-9._-]+", "_", path)[:80]
    h = hashlib.md5(url.encode()).hexdigest()[:6]
    if "." not in os.path.basename(path):
        path += ".html"
    return f"{h}_{path}"

def robots(host, scheme="https"):
    os.makedirs(os.path.join(DL, "_robots"), exist_ok=True)
    fn = os.path.join(DL, "_robots", host + ".txt")
    url = f"{scheme}://{host}/robots.txt"
    if not os.path.exists(fn):
        wait_host(host)
        try:
            r = requests.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            txt = r.text if r.status_code == 200 else f"# HTTP {r.status_code}\n"
            print(f"[robots] {url} -> {r.status_code} ({len(r.content)} bytes)")
        except Exception as e:
            txt = f"# ERROR {e}\n"
            print(f"[robots] {url} -> ERROR {e}")
        open(fn, "w", encoding="utf-8", errors="replace").write(txt)
    txt = open(fn, encoding="utf-8", errors="replace").read()
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(txt.splitlines())
    # crawl-delay for * 
    m = re.search(r"(?im)^crawl-delay:\s*(\d+)", txt)
    if m:
        s = load_state(host); s["cd"] = int(m.group(1)); save_state(s, host)
    return rp, txt

def summarize_robots(txt):
    lines = [l.strip() for l in txt.splitlines() if l.strip() and not l.startswith("#")]
    keep = [l for l in lines if re.match(r"(?i)(user-agent|disallow|allow|crawl-delay|sitemap)", l)]
    print(f"  robots lines: {len(lines)} total; showing up to 40 relevant")
    for l in keep[:40]:
        print("   ", l)
    if len(keep) > 40:
        print(f"    ... (+{len(keep)-40} more)")

CHALLENGE = ["Just a moment", "cf-browser-verification", "challenge-platform", "_Incapsula_",
             "Access Denied", "PerimeterX", "px-captcha", "Attention Required", "DataDome",
             "Checking your browser", "Pardon Our Interruption", "bot detection", "Request unsuccessful",
             "akamai", "Please enable JavaScript", "__cf_chl", "captcha"]

def fetch(url):
    p = urllib.parse.urlparse(url)
    host = p.netloc
    rp, txt = robots(host, p.scheme)
    allowed = rp.can_fetch(UA, url) and rp.can_fetch("*", url)
    print(f"\n=== {url}")
    print(f"  robots allows: {allowed}")
    if not allowed:
        print("  SKIPPED (robots disallow)")
        return
    wait_host(host)
    try:
        r = requests.get(url, headers=HEADERS, timeout=60, allow_redirects=True, stream=True)
        ct = r.headers.get("content-type", "")
        chunks = []; n = 0
        for c in r.iter_content(1 << 16):
            chunks.append(c); n += len(c)
            if n > 120 * 1024 * 1024: break
        body = b"".join(chunks)
    except Exception as e:
        print(f"  ERROR {e}")
        return
    os.makedirs(os.path.join(DL, host), exist_ok=True)
    fn = os.path.join(DL, host, slug(url))
    if "pdf" in ct or body[:5] == b"%PDF-":
        if not fn.endswith(".pdf"): fn = fn.rsplit(".", 1)[0] + ".pdf"
    open(fn, "wb").write(body)
    print(f"  status: {r.status_code}  final: {r.url}")
    print(f"  content-type: {ct}  size: {len(body)}  server: {r.headers.get('server','')}  cf-ray: {r.headers.get('cf-ray','-')}")
    print(f"  saved: {os.path.relpath(fn, BASE)}")
    if b"<html" in body[:2000].lower() or "html" in ct:
        t = body[:200000].decode("utf-8", "replace")
        hits = [c for c in CHALLENGE if c.lower() in t.lower()]
        title = re.search(r"(?is)<title[^>]*>(.*?)</title>", t)
        print(f"  title: {title.group(1).strip()[:120] if title else '-'}")
        if hits: print(f"  challenge hints: {hits}")
        print(f"  html text length approx: {len(re.sub(r'<[^>]+>', ' ', t))}")

if __name__ == "__main__":
    for u in sys.argv[1:]:
        fetch(u)
