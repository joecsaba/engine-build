"""Polite fetch helper: per-host delay, descriptive UA, robots.txt check, logging."""
import json, os, sys, time, urllib.robotparser as rp
from urllib.parse import urlparse
import requests

UA = "engine-build.com catalog research (contact: joecsaba@gmail.com)"
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.join(BASE, "dl")
OUT = os.path.join(BASE, "out")
LOG = os.path.join(OUT, "fetch_log.jsonl")
DELAY = 6.0
_last = {}
_robots = {}
S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"})

def _wait(host):
    t = _last.get(host)
    delay = DELAY
    rb = _robots.get(host)
    if rb is not None:
        try:
            cd = rb[0].crawl_delay(UA) or rb[0].crawl_delay("*")
            if cd: delay = max(delay, float(cd))
        except Exception: pass
    if t is not None:
        d = delay - (time.time() - t)
        if d > 0:
            time.sleep(d)
    _last[host] = time.time()

def _log(rec):
    os.makedirs(OUT, exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")

def robots(url):
    """Fetch robots.txt for the host once; return (parser, raw_text, status)."""
    u = urlparse(url)
    host = u.netloc
    if host in _robots:
        return _robots[host]
    rurl = f"{u.scheme}://{host}/robots.txt"
    _wait(host)
    try:
        r = S.get(rurl, timeout=30, allow_redirects=True)
        txt, st = r.text, r.status_code
    except Exception as e:
        txt, st = "", f"ERR {e}"
    p = rp.RobotFileParser()
    if st == 200:
        p.parse(txt.splitlines())
    else:
        p.parse([])  # treat as allow-all but record
    _robots[host] = (p, txt, st)
    _log({"url": rurl, "status": st, "bytes": len(txt)})
    return _robots[host]

def allowed(url):
    p, txt, st = robots(url)
    return p.can_fetch(UA, url) and p.can_fetch("*", url)

def get(url, save_as=None, stream=False, timeout=60, extra_headers=None):
    """GET with robots check and host delay. Returns response or None if disallowed."""
    if not allowed(url):
        _log({"url": url, "status": "ROBOTS_DISALLOW"})
        print(f"[robots] disallowed: {url}", file=sys.stderr)
        return None
    host = urlparse(url).netloc
    _wait(host)
    h = dict(extra_headers or {})
    try:
        r = S.get(url, timeout=timeout, stream=stream, headers=h, allow_redirects=True)
    except Exception as e:
        _log({"url": url, "status": f"ERR {e}"})
        print(f"[err] {url}: {e}", file=sys.stderr)
        return None
    rec = {"url": url, "final": r.url, "status": r.status_code,
           "ctype": r.headers.get("content-type"), "clen": r.headers.get("content-length"),
           "server": r.headers.get("server"), "cf": r.headers.get("cf-ray") is not None}
    if save_as:
        os.makedirs(DL, exist_ok=True)
        path = os.path.join(DL, save_as)
        n = 0
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 16):
                f.write(chunk); n += len(chunk)
        rec["saved"] = path; rec["saved_bytes"] = n
    _log(rec)
    print(f"[get] {r.status_code} {r.headers.get('content-type','')[:40]} {url}", file=sys.stderr)
    return r

def classify(r):
    """Rough classification of an HTML response: ok / challenge / blocked / js-only."""
    if r is None: return "no-response"
    t = r.text[:200000].lower() if "text" in (r.headers.get("content-type") or "") else ""
    if r.status_code == 403: return "403"
    if r.status_code == 429: return "429"
    if r.status_code >= 400: return str(r.status_code)
    if "cf-chl" in t or "just a moment" in t or "challenge-platform" in t or "_incapsula_" in t or "px-captcha" in t or "akamai" in t and "bot" in t:
        return "challenge"
    body = t.split("<body", 1)[-1] if "<body" in t else t
    import re
    stripped = re.sub(r"<script.*?</script>", "", body, flags=re.S)
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    words = len(stripped.split())
    if words < 60 and "<script" in body: return "js-only?"
    return "200-html"
