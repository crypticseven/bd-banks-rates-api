import urllib.request
import urllib.parse
import ssl
import sys
import socket
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
socket.setdefaulttimeout(4)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

targets = [
    ("basic", "https://www.basicbanklimited.com"),
    ("rakub", "https://rakub.org.bd"),
    ("pkb", "http://pkb.gov.bd"),
    ("pubali", "https://www.pubalibankbd.com"),
    ("citizens", "https://citizensbankbd.com"),
    ("ceylon", "https://www.combank.net/bangladesh"),
    ("habib", "https://www.hbl.com/bangladesh")
]

for name, base_url in targets:
    try:
        req = urllib.request.Request(base_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=5, context=ctx) as r:
            html = r.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            print(f"\n[{name.upper()}] Links from {base_url}:")
            found = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True).lower()
                if any(k in text or k in href.lower() for k in ['rate', 'interest', 'deposit', 'fdr', 'soc', 'schedule', 'charge']):
                    res_url = urllib.parse.urljoin(base_url, href)
                    found.append((a.get_text(strip=True), res_url))
            for t, u in found[:5]:
                print(f"   -> {t}: {u}")
    except Exception as e:
        print(f"[{name.upper()}] Error: {e}")
