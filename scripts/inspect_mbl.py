import urllib.request
import ssl
import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://www.mblbd.com/interest-rates', headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')
soup = BeautifulSoup(html, 'html.parser')
tbs = soup.find_all('table')
print(f"Total tables: {len(tbs)}")
for i, tb in enumerate(tbs):
    rows = tb.find_all('tr')
    print(f"\n--- TABLE {i+1} ({len(rows)} rows) ---")
    for r in rows[:8]:
        cells = [c.get_text(strip=True) for c in r.find_all(['th', 'td'])]
        print("  ", cells)
