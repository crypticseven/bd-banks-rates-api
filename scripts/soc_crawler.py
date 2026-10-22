#!/usr/bin/env python3
"""
================================================================================
BANGLADESH 61 SCHEDULED BANKS - SOC & DEPOSIT RATE CRAWLER ENGINE (v2.0)
================================================================================
Author: Fardin Ahsan Anik (fardinanik.me / UCB IT Lead)
Purpose: Crawls official Schedule of Charges (SOC) and Deposit Rate notices across
         all 61 scheduled commercial banks in Bangladesh, parses HTML/PDF rate
         schedules, detects circular changes, extracts tenure yields, and
         generates an empirical audit report with provenance metadata.
================================================================================
"""

import sys
import os
import json
import re
import argparse
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error
from urllib.parse import urljoin
import ssl

# P1-4: Strict dependency verification - fail fast if missing
try:
    from bs4 import BeautifulSoup
    import pymupdf as fitz
except ImportError as exc:
    raise SystemExit(
        "Crawler dependencies are required. Run: pip install -r requirements.txt"
    ) from exc

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH = os.path.join(PROJECT_ROOT, "src", "data", "bangladesh_61_banks.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Connection": "keep-alive",
}

RATE_PATTERN = re.compile(r"(\d{1,2}(?:\.\d{1,2})?)\s*%", re.IGNORECASE)

# P2-4: Wire TENURE_PATTERNS into rate extraction logic
TENURE_PATTERNS = {
    "3_months": re.compile(r"(?:3\s*(?:month|mo|m)|90\s*days|three\s*month)", re.IGNORECASE),
    "6_months": re.compile(r"(?:6\s*(?:month|mo|m)|180\s*days|six\s*month)", re.IGNORECASE),
    "1_year": re.compile(r"(?:1\s*(?:year|yr|y)|12\s*months|one\s*year|360\s*days|365\s*days)", re.IGNORECASE),
    "3_years": re.compile(r"(?:3\s*(?:years|yrs|y)|36\s*months|three\s*year)", re.IGNORECASE),
    "5_years": re.compile(r"(?:5\s*(?:years|yrs|y)|60\s*months|five\s*year)", re.IGNORECASE),
}

def load_banks():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Banks dataset not found at {DATASET_PATH}")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def extract_rates_by_tenure(text):
    """
    Scans extracted text for deposit tenures and associated percentage yields.
    """
    discovered_rates = {}
    lines = text.splitlines()

    for i, line in enumerate(lines):
        for tenure, pattern in TENURE_PATTERNS.items():
            if pattern.search(line):
                # Look for rates in current line and adjacent 2 lines
                context = " ".join(lines[max(0, i - 1):min(len(lines), i + 3)])
                matches = RATE_PATTERN.findall(context)
                valid_rates = [float(m) for m in matches if 4.0 <= float(m) <= 15.0]
                if valid_rates and tenure not in discovered_rates:
                    discovered_rates[tenure] = max(valid_rates)

    return discovered_rates

def probe_bank_soc(bank, timeout=12):
    """
    Probes an individual bank's official SOC URL with strict TLS verification.
    """
    url = bank.get("soc_url") or bank.get("official_soc_url", "")
    code = bank.get("short_code", "")
    name = bank.get("bank_name", "")

    result = {
        "bank_code": code,
        "bank_name": name,
        "url": url,
        "status_code": None,
        "content_type": None,
        "last_modified": None,
        "etag": None,
        "pdf_circulars_found": [],
        "detected_rate_sample": [],
        "parsed_tenure_yields": {},
        "latency_ms": None,
        "tls_verified": True,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "error": None,
    }

    if not url or not url.startswith("http"):
        result["error"] = "No valid URL configured"
        return result

    start_time = time.time()

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        
        # P0-2: Mandatory Strict TLS verification - Zero disabled TLS/hostname checks permitted
        ctx = ssl.create_default_context()

        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            latency = int((time.time() - start_time) * 1000)
            result["latency_ms"] = latency
            result["status_code"] = response.getcode()
            content_type = response.headers.get("Content-Type", "")
            result["content_type"] = content_type
            result["last_modified"] = response.headers.get("Last-Modified")
            result["etag"] = response.headers.get("ETag")

            # Read first 1.5MB of content
            content = response.read(1536 * 1024)

            if "application/pdf" in content_type:
                # Direct PDF circular handling
                result["pdf_circulars_found"].append(url)
                try:
                    doc = fitz.open(stream=content, filetype="pdf")
                    extracted_text = ""
                    for page_num in range(min(len(doc), 6)):
                        extracted_text += doc[page_num].get_text() + "\n"
                    
                    matches = RATE_PATTERN.findall(extracted_text)
                    valid_matches = [f"{m}%" for m in matches if 4.0 <= float(m) <= 15.0]
                    result["detected_rate_sample"] = valid_matches[:6]
                    result["parsed_tenure_yields"] = extract_rates_by_tenure(extracted_text)
                except Exception as pdf_err:
                    result["error"] = f"PDF parse error: {str(pdf_err)}"
            else:
                # HTML response
                try:
                    html_text = content.decode("utf-8", errors="ignore")
                    soup = BeautifulSoup(html_text, "html.parser")

                    # P1-3: Correct urljoin import for link resolution
                    for a in soup.find_all("a", href=True):
                        href = a["href"].strip()
                        link_text = a.get_text().strip().lower()
                        if href.endswith(".pdf") or "pdf" in href.lower():
                            if any(w in link_text or w in href.lower() for w in ["rate", "interest", "soc", "charge", "deposit", "fdr", "schedule"]):
                                full_link = urljoin(url, href)
                                if full_link not in result["pdf_circulars_found"]:
                                    result["pdf_circulars_found"].append(full_link)

                    # Extract text and discover rates
                    page_text = soup.get_text()
                    matches = RATE_PATTERN.findall(page_text)
                    clean_rates = [f"{m}%" for m in matches if 4.0 <= float(m) <= 15.0]
                    result["detected_rate_sample"] = clean_rates[:6]
                    result["parsed_tenure_yields"] = extract_rates_by_tenure(page_text)

                except Exception as html_err:
                    result["error"] = f"HTML parse error: {str(html_err)}"

    except urllib.error.HTTPError as e:
        result["status_code"] = e.code
        result["error"] = f"HTTP Error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        result["error"] = f"URL Error: {e.reason}"
    except Exception as e:
        result["error"] = f"General probe exception: {str(e)}"

    return result

def run_audit(banks, max_workers=10):
    total = len(banks)
    print(f"\n[*] Initiating SOC Crawler audit for all {total} Bangladesh Scheduled Banks...")
    print("[*] TLS Verification: MANDATORY STRICT (Zero disabled TLS/hostname checks)")
    print(f"[*] Concurrency worker pool: {max_workers} threads\n" + "-" * 80)

    results = []
    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(probe_bank_soc, bank, 14): bank for bank in banks}
        for future in as_completed(futures):
            res = future.result()
            results.append(res)
            status_symbol = "[✓]" if res["status_code"] == 200 else "[!]"
            status_text = f"HTTP {res['status_code']}" if res['status_code'] else "FAILED"
            rate_info = f"Rates: {', '.join(res['detected_rate_sample'][:3])}" if res['detected_rate_sample'] else "No rates extracted"
            print(f"{status_symbol} [{res['bank_code']:<8}] {res['bank_name'][:26]:<26} | {status_text:<10} | {rate_info}")
            if res["status_code"] == 200:
                success_count += 1

    print("-" * 80)
    print(f"[*] Audit complete: {success_count}/{total} banks responded with HTTP 200 OK.")
    return results

def apply_results_locally(results, banks):
    """
    Applies crawler findings (discovered rates, PDF circular links) directly
    to the repository's active dataset on disk.
    """
    updated_count = 0
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    bank_map = {b["short_code"]: b for b in banks}

    for res in results:
        code = res["bank_code"]
        if code in bank_map:
            bank = bank_map[code]
            modified = False

            if res.get("parsed_tenure_yields"):
                for tenure, yield_rate in res["parsed_tenure_yields"].items():
                    if bank["fdr_rates"].get(tenure) != yield_rate:
                        bank["fdr_rates"][tenure] = yield_rate
                        modified = True

            if res.get("pdf_circulars_found"):
                top_pdf = res["pdf_circulars_found"][0]
                if bank.get("source_url") != top_pdf:
                    bank["source_url"] = top_pdf
                    modified = True

            if modified or res.get("status_code") == 200:
                bank["fetched_at"] = res.get("fetched_at") or datetime.now(timezone.utc).isoformat()
                bank["verification_status"] = "VERIFIED_OFFICIAL"
                # Recalculate risk-adjusted score
                r1y = bank["fdr_rates"].get("1_year", 0)
                score = round(r1y * ((bank.get("rating_score", 3.0) / 5.0) ** 0.65), 2)
                bank["risk_adjusted_yield_score"] = score
                updated_count += 1

    with open(DATASET_PATH, "w", encoding="utf-8") as f:
        json.dump(banks, f, indent=2)

    print(f"[✓] Applied crawl updates locally to {updated_count} banks in {DATASET_PATH}")
    return updated_count

def sync_results_to_api(results, api_url, secret):
    """
    Synchronizes discovered rate updates to the live HTTP API endpoint with Bearer auth.
    """
    updates = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for res in results:
        if res.get("parsed_tenure_yields") or res.get("pdf_circulars_found"):
            upd = {
                "bank_id": res["bank_code"],
                "effective_date": today,
                "notes": f"Automated SOC crawler update from {res['url']}",
            }
            if res.get("parsed_tenure_yields"):
                upd["fdr_rates"] = res["parsed_tenure_yields"]
            if res.get("pdf_circulars_found"):
                upd["circular_url"] = res["pdf_circulars_found"][0]
            updates.append(upd)

    if not updates:
        print("[!] No verifiable rate updates discovered to push to API.")
        return False

    payload = json.dumps({"updates": updates}).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret}",
            "User-Agent": "SOC-Crawler-Sync/2.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[✓] Successfully pushed {len(updates)} rate updates to API: {api_url}")
            print(f"    Response: {json.dumps(data, indent=2)}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[!] API Sync HTTP Error {e.code}: {body}")
        return False
    except Exception as e:
        print(f"[!] API Sync Exception: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Bangladesh 61 Scheduled Banks SOC Crawler (v2.0)")
    parser.add_argument("--audit", action="store_true", help="Run network probe across all 61 banks")
    parser.add_argument("--bank", type=str, help="Target specific bank short code (e.g. UCB, BRAC, SCB)")
    parser.add_argument("--workers", type=int, default=10, help="Concurrent HTTP worker threads")
    parser.add_argument("--output", type=str, help="Export crawl result JSON to path")
    parser.add_argument("--apply-local", action="store_true", help="Persist discovered rates directly to src/data/bangladesh_61_banks.json")
    parser.add_argument("--sync-api", type=str, help="Post discovered updates to API endpoint (e.g. https://api.fardinanik.me/api/v1/rates/sync)")
    parser.add_argument("--sync-secret", type=str, help="Bearer token for API sync (defaults to RATES_SYNC_SECRET env var)")
    args = parser.parse_args()

    banks = load_banks()

    if args.bank:
        target = next((b for b in banks if b["short_code"].upper() == args.bank.upper()), None)
        if not target:
            print(f"[!] Bank short code '{args.bank}' not found in dataset of 61 banks.")
            sys.exit(1)
        print(f"[*] Probing bank: {target['bank_name']} ({target['short_code']})...")
        res = probe_bank_soc(target, timeout=20)
        print(json.dumps(res, indent=2))
        if args.apply_local:
            apply_results_locally([res], banks)
        if args.sync_api:
            secret = args.sync_secret or os.environ.get("RATES_SYNC_SECRET")
            if not secret:
                print("[!] Error: --sync-secret or RATES_SYNC_SECRET environment variable is required to sync to API.")
            else:
                sync_results_to_api([res], args.sync_api, secret)
        return

    if args.audit or not sys.argv[1:]:
        results = run_audit(banks, max_workers=args.workers)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as out_f:
                json.dump(results, out_f, indent=2)
            print(f"[✓] Saved crawl results to {args.output}")

        if args.apply_local:
            apply_results_locally(results, banks)

        if args.sync_api:
            secret = args.sync_secret or os.environ.get("RATES_SYNC_SECRET")
            if not secret:
                print("[!] Error: --sync-secret or RATES_SYNC_SECRET environment variable is required to sync to API.")
            else:
                sync_results_to_api(results, args.sync_api, secret)

if __name__ == "__main__":
    main()
