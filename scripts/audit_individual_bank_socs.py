import urllib.request
import urllib.parse
import ssl
import json
import re
import sys
import socket
import hashlib
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
socket.setdefaulttimeout(4)

# SSL context with modern cipher support
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8'
}

# The comprehensive bank domain dictionary for all 61 banks
BANK_DOMAINS = [
    # State-Owned (6)
    ("sonali", "Sonali Bank PLC", "https://www.sonalibank.com.bd", ["/PDF_file/intt_rates.pdf", "/schedule-of-charges.php?v=1", "/interest_rate.php"]),
    ("janata", "Janata Bank PLC", "https://www.jb.com.bd", ["/products/rate_of_interest", "/assets/file/"]),
    ("agrani", "Agrani Bank PLC", "https://www.agranibank.org", ["/index.php/home/interest_rate/ql", "/home/interest_rate"]),
    ("rupali", "Rupali Bank PLC", "https://www.rupalibank.com.bd", ["/deposit-rates", "/schedule-of-charges", "/rates"]),
    ("basic", "BASIC Bank Limited", "https://www.basicbank.com.bd", ["/interest-rates", "/deposit-rates", "/schedule-of-charges"]),
    ("bdbl", "Bangladesh Development Bank PLC", "https://www.bdbl.com.bd", ["/deposit-interest-rate", "/rate-of-interest", "/soc"]),
    
    # Specialized / DFIs (3)
    ("bkb", "Bangladesh Krishi Bank", "https://www.krishibank.org.bd", ["/interest-rates", "/deposit-products", "/schedule-of-charges"]),
    ("rakub", "Rajshahi Krishi Unnayan Bank", "https://www.rakub.org.bd", ["/interest-rate", "/deposit-rates", "/schedule-of-charges"]),
    ("pkb", "Probashi Kolyon Bank", "https://pkb.gov.bd", ["/site/page/rates", "/interest-rate"]),
    
    # Private Commercial Banks - Conventional (33)
    ("ucb", "United Commercial Bank PLC", "https://www.ucb.com.bd", ["/reports/interest-rates/instruction-circular-no1634full-deposit-productsucb-websi.pdf", "/reports/interest-rates/"]),
    ("brac", "BRAC Bank PLC", "https://www.bracbank.com", ["https://brackweb.s3.ap-southeast-1.amazonaws.com/uploads/all/2026/10/BRAC_Bank_Deposit_Interest_Rate_Effective_from_October_15,_20266acf796d088b7.pdf", "/personal/deposits/rates"]),
    ("city", "City Bank PLC", "https://www.thecitybank.com", ["/interest-rate", "/rates", "/deposit-interest-rates", "/schedule-of-charges"]),
    ("ebl", "Eastern Bank PLC", "https://www.ebl.com.bd", ["/assets/rates/Deposit_Rate_sheet-ED_15_September_2026_EBL_WEB_Version_Final.pdf", "/retail/deposit-interest-rates"]),
    ("dbbl", "Dutch-Bangla Bank PLC", "https://www.dutchbanglabank.com", ["/retail/dps.html", "/retail/term-deposit.html", "/fc/Exchange-Rate.pdf"]),
    ("prime", "Prime Bank PLC", "https://www.primebank.com.bd", ["/view-rates", "/rates", "/interest-rates"]),
    ("mtb", "Mutual Trust Bank PLC", "https://www.mutualtrustbank.com", ["/rates/", "/deposit-rates/", "/schedule-of-charges/"]),
    ("dhaka", "Dhaka Bank PLC", "https://dhakabank.com.bd", ["/rates", "/deposit-products", "/interest-rate"]),
    ("pubali", "Pubali Bank PLC", "https://www.pubalibangla.com", ["/interest-rates", "/deposit-rates", "/schedule-of-charges"]),
    ("mercantile", "Mercantile Bank PLC", "https://www.mblbd.com", ["/interest-rates", "/forexrate"]),
    ("southeast", "Southeast Bank PLC", "https://www.southeastbank.com.bd", ["/documents/deposit_rates/All_Deposit_list_of_SEBPLC.pdf", "/documents/rates/Rate_Sheet_19102026.pdf"]),
    ("ncc", "NCC Bank PLC", "https://www.nccbank.com.bd", ["/NccbDepositProducts/interestFirst", "/interest-rates", "/schedule-of-charges"]),
    ("premier", "Premier Bank PLC", "https://thepremierbankplc.com", ["/deposit-rates", "/interest-rates", "/schedule-of-charges"]),
    ("trust", "Trust Bank Limited", "https://www.tblbd.com", ["/rates/", "/loan-rates/", "/exchange-rates/"]),
    ("jamuna", "Jamuna Bank PLC", "https://jamunabankbd.com", ["/interest-rates/", "/rates/"]),
    ("bank_asia", "Bank Asia PLC", "https://www.bankasia-bd.com", ["/other/interestrates", "/other/schedule-of-charges"]),
    ("one_bank", "ONE Bank PLC", "https://www.onebank.com.bd", ["/interest-rates", "/corporate-banking/deposit"]),
    ("ab_bank", "AB Bank PLC", "https://abbl.com", ["/rates", "/interest-rates", "/schedule-of-charges"]),
    ("ific", "IFIC Bank PLC", "https://www.ificbank.com.bd", ["/interest-rates", "/rates", "/schedule-of-charges"]),
    ("uttara", "Uttara Bank PLC", "https://www.uttarabank-bd.com", ["/interest_rate.php", "/rates.php"]),
    ("nbl", "National Bank Limited", "https://www.nblbd.com", ["/interest-rates", "/rates"]),
    ("nrbc", "NRB Commercial Bank PLC", "https://www.nrbcommercialbank.com", ["/interest-rates", "/schedule-of-charges"]),
    ("nrb", "NRB Bank Limited", "https://www.nrbbankbd.com", ["/interest-rates", "/deposit-rates"]),
    ("meghna", "Meghna Bank PLC", "https://www.meghnabank.com.bd", ["/interest-rates", "/rates"]),
    ("midland", "Midland Bank Limited", "https://www.midlandbankbd.net", ["/interest-rates", "/rates"]),
    ("modhumoti", "Modhumoti Bank Limited", "https://www.modhumotibank.net", ["/interest-rates", "/rates"]),
    ("sbac", "South Bangla Agriculture and Commerce Bank", "https://www.sbacbank.com", ["/interest-rates", "/rates"]),
    ("shimanto", "Shimanto Bank Limited", "https://shimantobank.com", ["/rates", "/interest-rates"]),
    ("community", "Community Bank Bangladesh PLC", "https://www.communitybankbd.com", ["/interest-rates", "/rates"]),
    ("bengal", "Bengal Commercial Bank Limited", "https://www.bengalbank.com", ["/interest-rates", "/rates"]),
    ("citizens", "Citizens Bank PLC", "https://citizensbankbd.com", ["/interest-rates", "/rates"]),
    ("padma", "Padma Bank PLC", "https://www.padmabankbd.com", ["/interest-rates", "/rates"]),
    ("bcbl", "Bangladesh Commerce Bank Limited", "https://www.bcblbd.com", ["/interest-rates", "/rates"]),

    # Islamic Banks (10)
    ("ibbl", "Islami Bank Bangladesh PLC", "https://www.islamibankbd.com", ["/rates", "/profit-rates", "/schedule-of-charges"]),
    ("al_arafah", "Al-Arafah Islami Bank PLC", "https://www.al-arafahbank.com", ["/profit-rates", "/rates"]),
    ("sibl", "Social Islami Bank PLC", "https://www.siblbd.com", ["/profit-rates", "/rates"]),
    ("shahjalal", "Shahjalal Islami Bank PLC", "https://www.shahjalalbank.com.bd", ["/profit-rates", "/rates"]),
    ("exim", "Export Import Bank of Bangladesh PLC", "https://www.eximbankbd.com", ["/profit-rates", "/rates"]),
    ("fsibl", "First Security Islami Bank PLC", "https://www.fsiblbd.com", ["/profit-rates", "/rates"]),
    ("global_islami", "Global Islami Bank PLC", "https://www.globalislamibank.com", ["/profit-rates", "/rates"]),
    ("union", "Union Bank PLC", "https://www.unionbank.com.bd", ["/profit-rates", "/rates"]),
    ("standard_islamic", "Standard Bank PLC (Islamic)", "https://www.standardbankbd.com", ["/profit-rates", "/rates"]),
    ("icb_islamic", "ICB Islamic Bank Limited", "https://www.icbislamic-bd.com", ["/profit-rates", "/rates"]),

    # Foreign Commercial Banks (9)
    ("scb", "Standard Chartered Bank Bangladesh", "https://www.sc.com/bd", ["/deposits/rates/", "/rates/"]),
    ("hsbc", "HSBC Bangladesh", "https://www.hsbc.com.bd", ["/rates", "/accounts/interest-rates/"]),
    ("citi", "Citibank N.A. Bangladesh", "https://www.citibank.com/bangladesh", ["/rates", "/schedule-of-charges"]),
    ("ceylon", "Commercial Bank of Ceylon PLC", "https://www.combankbd.com", ["/rates", "/interest-rates"]),
    ("woori", "Woori Bank Bangladesh", "https://wooribank.com/bd", ["/rates", "/interest-rates"]),
    ("alfalah", "Bank Alfalah Limited Bangladesh", "https://www.bankalfalah.com/bd", ["/rates", "/schedule-of-charges"]),
    ("sbi", "State Bank of India Bangladesh", "https://sbibd.com", ["/rates", "/interest-rates"]),
    ("habib", "Habib Bank Limited Bangladesh", "https://www.habibbank.com/bangladesh", ["/rates", "/schedule-of-charges"]),
    ("nbp", "National Bank of Pakistan", "https://nbp.com.bd", ["/rates", "/interest-rates"])
]

def audit_single_bank(bank_id, bank_name, base_url, candidate_paths):
    result = {
        "bank_id": bank_id,
        "bank_name": bank_name,
        "primary_bank_domain": base_url,
        "status": "PENDING",
        "tested_urls": [],
        "working_soc_url": None,
        "content_type": None,
        "document_sha256": None,
        "evidence_snippet": None,
        "discovered_links": []
    }
    
    print(f"\n=======================================================")
    print(f"[{bank_id.upper()}] Auditing: {bank_name} ({base_url})")
    
    # 1. Test Candidate Direct Paths
    for path in candidate_paths:
        full_url = path if path.startswith("http") else urllib.parse.urljoin(base_url, path)
        try:
            req = urllib.request.Request(full_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=6, context=ctx) as resp:
                status_code = resp.status
                ct = resp.headers.get('Content-Type', '')
                data = resp.read()
                result["tested_urls"].append({"url": full_url, "status": status_code, "type": ct, "bytes": len(data)})
                if status_code == 200 and len(data) > 2000:
                    result["working_soc_url"] = full_url
                    result["content_type"] = ct
                    result["status"] = "ACCESSIBLE_DIRECT_LINK"
                    if "pdf" in ct.lower():
                        result["document_sha256"] = hashlib.sha256(data).hexdigest()
                        result["evidence_snippet"] = f"Direct Bank Circular PDF ({len(data)} bytes, SHA-256: {result['document_sha256'][:16]}...)"
                    else:
                        soup = BeautifulSoup(data.decode('utf-8', errors='ignore'), 'html.parser')
                        title = soup.title.string.strip() if soup.title else ""
                        result["evidence_snippet"] = f"HTML Rate Page ({title}, {len(soup.find_all('table'))} tables)"
                    print(f"  [+] DIRECT HIT: {full_url} ({ct}, {len(data)} bytes)")
                    break
        except Exception as e:
            result["tested_urls"].append({"url": full_url, "error": str(e)[:80]})
    
    # 2. If no direct hit, crawl Homepage to discover links
    if not result["working_soc_url"]:
        try:
            print(f"  [-] Direct paths missed. Crawling homepage: {base_url}")
            req = urllib.request.Request(base_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=6, context=ctx) as resp:
                data = resp.read()
                soup = BeautifulSoup(data.decode('utf-8', errors='ignore'), 'html.parser')
                candidates = []
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    text = a.get_text(strip=True).lower()
                    if any(k in text or k in href.lower() for k in ['rate', 'interest', 'deposit', 'fdr', 'soc', 'schedule', 'charge']):
                        resolved = urllib.parse.urljoin(base_url, href)
                        candidates.append((a.get_text(strip=True), resolved))
                
                print(f"  [+] Discovered {len(candidates)} rate/SOC candidates on homepage")
                for link_text, link_url in candidates[:5]:
                    result["discovered_links"].append({"text": link_text, "url": link_url})
                    # Test top candidate
                    if not result["working_soc_url"] and ('pdf' in link_url.lower() or 'rate' in link_url.lower() or 'interest' in link_url.lower()):
                        try:
                            creq = urllib.request.Request(link_url, headers=HEADERS)
                            with urllib.request.urlopen(creq, timeout=5, context=ctx) as cresp:
                                if cresp.status == 200:
                                    cdata = cresp.read()
                                    if len(cdata) > 2000:
                                        result["working_soc_url"] = link_url
                                        result["content_type"] = cresp.headers.get('Content-Type', '')
                                        result["status"] = "DISCOVERED_HOMEPAGE_CRAWL"
                                        result["evidence_snippet"] = f"Crawled link ({link_text}): {len(cdata)} bytes"
                                        print(f"  [+] VERIFIED CRAWLED LINK: {link_url}")
                                        break
                        except Exception:
                            pass
        except Exception as e:
            print(f"  [!] Homepage crawl error: {e}")
            result["status"] = f"CRAWL_ERROR: {str(e)[:60]}"
            
    if not result["working_soc_url"]:
        result["status"] = "REQUIRING_MANUAL_TOKEN_OR_BLOCKED"
        print(f"  [x] Could not find unblocked direct link on base domain.")
        
    return result

def run_all_61():
    audit_results = []
    print(f"Starting rigorous 1-by-1 audit across all {len(BANK_DOMAINS)} banks...")
    for bank_id, name, base_url, paths in BANK_DOMAINS:
        res = audit_single_bank(bank_id, name, base_url, paths)
        audit_results.append(res)
        
    with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bank_sources_audit_ledger.json', 'w', encoding='utf-8') as f:
        json.dump(audit_results, f, indent=2)
    print("\nSaved comprehensive audit ledger to src/data/bank_sources_audit_ledger.json")

if __name__ == '__main__':
    run_all_61()
