import urllib.request
import ssl
import sys
import socket
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
socket.setdefaulttimeout(3)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

test_targets = [
    ("shahjalal", ["https://www.sjibl.com", "https://www.sjibl.com/profit_rate.html", "https://www.sjibl.com/schedule_charges.html"]),
    ("pubali", ["https://www.pubalibangla.com", "https://pubalibankbd.com", "https://www.pubalibankbd.com"]),
    ("modhumoti", ["https://www.modhumotibank.net", "https://modhumotibankltd.com", "https://www.modhumotibank.net/schedule-of-charges/"]),
    ("al_arafah", ["https://www.al-arafahbank.com", "https://www.aibl.com.bd", "https://aibl.com.bd/rate-of-profit"]),
    ("basic", ["https://basicbank.com.bd", "http://www.basicbank.com.bd", "https://www.basicbanklimited.com"]),
    ("rakub", ["https://rakub.org.bd", "https://www.rakub.org.bd/interest-rate"]),
    ("pkb", ["http://pkb.gov.bd", "https://pkb.gov.bd"]),
    ("bkb", ["http://www.krishibank.org.bd", "https://krishibank.org.bd"]),
    ("bengal", ["https://www.bengalbank.com", "https://bengalbank.com/rates-charges"]),
    ("citizens", ["https://citizensbankbd.com", "https://www.citizensbankbd.com/deposit"]),
    ("nbl", ["https://www.nblbd.com/rates", "https://nblbd.com"]),
    ("ceylon", ["https://www.combank.net/bangladesh", "https://www.combankbd.com"]),
    ("sbi", ["https://sbibd.com", "https://bd.statebank/interest-rates"]),
    ("habib", ["https://www.hbl.com/bangladesh", "https://hbl.com"]),
    ("nbp", ["https://www.nbp.com.pk/Bangladesh/", "https://nbp.com.pk"])
]

for name, urls in test_targets:
    print(f"\nChecking alternative domains for {name}...")
    for u in urls:
        try:
            req = urllib.request.Request(u, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=5, context=ctx) as r:
                print(f"  [+] SUCCESS {u} -> Status {r.status}, Size {len(r.read())}")
                break
        except Exception as e:
            print(f"  [-] FAILED {u}: {e}")
