import sys, os, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polite
r = polite.get("https://melling.mypartfinder.com/static/js/main.41f71d68.js", save_as="mellingpf_main.js")
print("status", r.status_code if r else None, "bytes", len(r.content) if r else None)
if r is not None:
    t = r.text
    urls = sorted(set(re.findall(r'https?://[^"\'\s\]{8,120}', t)))
    print("absolute URLs:", [u for u in urls if "mypartfinder" in u or "api" in u.lower() or "amazonaws" in u or "azure" in u][:25])
    paths = sorted(set(re.findall(r'["\'](/(?:api|v1|v2|graphql|rest|search|lookup|parts?|vehicles?|years?|makes?|models?|engines?)[^"\'\s]{0,80})["\']', t)))
    print("api paths:", paths[:40])
    for kw in ["baseURL", "REACT_APP", "apiUrl", "API_URL", "endpoint"]:
        for m in re.finditer(kw, t):
            print(kw, "->", t[m.start():m.start()+160].replace("\n", " ")); break
