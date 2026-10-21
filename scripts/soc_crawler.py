#!/usr/bin/env python3
"""
================================================================================
BANGLADESH 61 SCHEDULED BANKS - SOC & DEPOSIT RATE CRAWLER ENGINE (v2.0)
================================================================================
Author: Fardin Ahsan Anik (fardinanik.com / UCB IT Lead)
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

def probe_bank_soc(bank, timeout=12, insecure_tls=False):
    """
    Probes an individual bank's official SOC URL with strict TLS verification by default.
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
        "tls_verified": not insecure_tls,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "error": None,
    }

    if not url or not url.startswith("http"):
        result["error"] = "No valid URL configured"
        return result

    start_time = time.time()

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        
        # P0-2: Standard TLS verification by default
        ctx = ssl.create_default_context()
        if insecure_tls:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

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

def run_audit(banks, max_workers=10, insecure_tls=False):
    total = len(banks)
    print(f"\n[*] Initiating SOC Crawler audit for all {total} Bangladesh Scheduled Banks...")
    print(f"[*] TLS Verification: {'ENABLED (Strict)' if not insecure_tls else 'DISABLED (Insecure)'}")
    print(f"[*] Concurrency worker pool: {max_workers} threads\n" + "-" * 80)

    results = []
    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(probe_bank_soc, bank, 14, insecure_tls): bank for bank in banks}
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

def main():
    parser = argparse.ArgumentParser(description="Bangladesh 61 Scheduled Banks SOC Crawler (v2.0)")
    parser.add_argument("--audit", action="store_true", help="Run network probe across all 61 banks")
    parser.add_argument("--bank", type=str, help="Target specific bank short code (e.g. UCB, BRAC, SCB)")
    parser.add_argument("--workers", type=int, default=10, help="Concurrent HTTP worker threads")
    parser.add_argument("--output", type=str, help="Export crawl result JSON to path")
    parser.add_argument("--insecure-tls", action="store_true", help="Allow unverified TLS certificates (not recommended for production)")
    args = parser.parse_args()

    banks = load_banks()

    if args.bank:
        target = next((b for b in banks if b["short_code"].upper() == args.bank.upper()), None)
        if not target:
            print(f"[!] Bank short code '{args.bank}' not found in dataset of 61 banks.")
            sys.exit(1)
        print(f"[*] Probing bank: {target['bank_name']} ({target['short_code']})...")
        res = probe_bank_soc(target, timeout=20, insecure_tls=args.insecure_tls)
        print(json.dumps(res, indent=2))
        return

    if args.audit or not sys.argv[1:]:
        results = run_audit(banks, max_workers=args.workers, insecure_tls=args.insecure_tls)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as out_f:
                json.dump(results, out_f, indent=2)
            print(f"[✓] Saved crawl results to {args.output}")

if __name__ == "__main__":
    main()
