import urllib.request
import ssl
import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    ('Prime Bank', 'https://www.primebank.com.bd/view-rates'),
    ('Bank Asia', 'https://www.bankasia-bd.com/other/interestrates'),
    ('Mercantile Bank', 'https://www.mblbd.com/interest-rates'),
    ('Southeast Bank', 'https://www.southeastbank.com.bd/documents/deposit_rates/All_Deposit_list_of_SEBPLC.pdf'),
    ('Janata Bank', 'https://www.jb.com.bd/products/rate_of_interest'),
    ('Agrani Bank', 'https://www.agranibank.org/index.php/home/interest_rate/ql')
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for name, u in urls:
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as r:
            ct = r.headers.get('Content-Type', '')
            data = r.read()
            print(f"[{name}] SUCCESS - Size: {len(data)}, Type: {ct}")
            if 'html' in ct:
                s = BeautifulSoup(data.decode('utf-8', errors='ignore'), 'html.parser')
                tbs = s.find_all('table')
                print(f"   -> Found {len(tbs)} tables")
                for i, tb in enumerate(tbs[:2]):
                    rows = tb.find_all('tr')
                    print(f"   -> Table {i+1}: {len(rows)} rows")
                    for row in rows[:5]:
                        cells = [c.get_text(strip=True) for c in row.find_all(['th', 'td'])]
                        print("      ", cells)
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
