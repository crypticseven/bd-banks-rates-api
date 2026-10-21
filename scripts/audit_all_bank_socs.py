import urllib.request
import ssl
import json
import time
import sys
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

with open(r'c:\Users\fardi\Documents\Gemini\Business\bd-banks-rates-api\src\data\bangladesh_61_banks.json', 'r', encoding='utf-8') as f:
    banks = json.load(f)

def probe(b):
    code = b['short_code']
    name = b['bank_name']
    url = b.get('soc_url')
    if not url:
        return {'code': code, 'name': name, 'status': 'NO_URL', 'url': ''}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            content_type = resp.headers.get('Content-Type', '')
            # Read first 50KB to check for pdf link or rates
            sample = resp.read(50000).decode('utf-8', errors='ignore')
            has_pdf = '.pdf' in sample.lower()
            return {
                'code': code,
                'name': name,
                'status': resp.status,
                'url': url,
                'content_type': content_type,
                'has_pdf_links': has_pdf
            }
    except Exception as ex:
        return {
            'code': code,
            'name': name,
            'status': 'ERR',
            'url': url,
            'error': str(ex)[:80]
        }

with ThreadPoolExecutor(max_workers=25) as executor:
    results = list(executor.map(probe, banks))

ok = [r for r in results if r.get('status') == 200]
err = [r for r in results if r.get('status') != 200]

print(f"=== CRAWL AUDIT: {len(ok)}/61 BANKS ACCESSIBLE, {len(err)} NEED URL REPAIR ===\n")
print(f"--- ACCESSIBLE OFFICIAL WEBSITES ({len(ok)}) ---")
for r in ok:
    pdf_badge = "[PDF links found]" if r.get('has_pdf_links') else "[HTML only]"
    print(f"  [OK 200] {r['code']:<12} {pdf_badge:<18} | {r['url']}")

print(f"\n--- BROKEN / STALE / UNREACHABLE URLS ({len(err)}) ---")
for r in err:
    print(f"  [FAIL]   {r['code']:<12} | {r.get('error', 'Error'):<45} | {r['url']}")

# Write results to audit JSON
with open(r'c:\Users\fardi\Documents\Gemini\Business\bd-banks-rates-api\soc_audit_results.json', 'w', encoding='utf-8') as f:
    json.dump({'accessible_count': len(ok), 'broken_count': len(err), 'accessible': ok, 'broken': err}, f, indent=2)
