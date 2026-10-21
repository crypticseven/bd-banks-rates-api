import urllib.request
import ssl
import sys
import hashlib
import fitz # PyMuPDF
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def download_and_extract_pdf(name, url):
    print(f"\n==========================================")
    print(f"[{name}] Fetching: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        data = urllib.request.urlopen(req, timeout=12, context=ctx).read()
        sha256 = hashlib.sha256(data).hexdigest()
        print(f"[{name}] Downloaded {len(data)} bytes | SHA-256: {sha256}")
        doc = fitz.open(stream=data, filetype="pdf")
        print(f"[{name}] Pages: {len(doc)}")
        for page_idx in range(min(3, len(doc))):
            text = doc[page_idx].get_text()
            print(f"--- Page {page_idx+1} (first 600 chars) ---")
            print(text[:600])
        return {"name": name, "url": url, "sha256": sha256, "pages": len(doc)}
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
        return None

# Southeast Bank
download_and_extract_pdf("Southeast Bank", "https://www.southeastbank.com.bd/documents/deposit_rates/All_Deposit_list_of_SEBPLC.pdf")

# Sonali Bank
download_and_extract_pdf("Sonali Bank", "https://www.sonalibank.com.bd/PDF_file/intt_rates.pdf")
