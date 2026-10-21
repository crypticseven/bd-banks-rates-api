import urllib.request
import ssl
import re
import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

urls = [
    'https://www.bb.org.bd/en/index.php/financialsystem/bankbafisa',
    'https://www.bb.org.bd/en/index.php/financialactivity/soc',
    'https://www.bb.org.bd/en/index.php/financialactivity/interestrate'
]

for url in urls:
    print(f"\n=== FETCHING: {url} ===")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables, Page Title: {soup.title.string if soup.title else 'No Title'}")
            
            # Print table headers or rows
            for idx, tbl in enumerate(tables[:3]):
                print(f"\n--- Table {idx+1} ---")
                rows = tbl.find_all('tr')
                for r in rows[:15]:
                    cols = [td.get_text(strip=True) for td in r.find_all(['td', 'th'])]
                    links = [a['href'] for a in r.find_all('a', href=True)]
                    if cols:
                        print(" | ".join(cols[:5]), f" (Links: {links[:2]})" if links else "")
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
