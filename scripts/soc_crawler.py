#!/usr/bin/env python3
"""
================================================================================
BANGLADESH 61 SCHEDULED BANKS - SOC & DEPOSIT RATE CRAWLER ENGINE
================================================================================
Author: Fardin Ahsan Anik (fardinanik.com / UCB IT Lead)
Purpose: Crawls official Schedule of Charges (SOC) and Deposit Rate notices across
         all 61 scheduled commercial banks in Bangladesh, parses HTML/PDF rate
         schedules, detects circular changes via HTTP ETag/Last-Modified, and
         generates an empirical audit report.
================================================================================
"""

import sys
import os
import json
import re
import argparse
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error
import ssl
import hashlib
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
    import pymupdf as fitz
except ImportError as e:
    raise SystemExit(
        "Crawler dependencies are required. Run: pip install -r requirements.txt"
    ) from e

# Path to the primary dataset
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH = os.path.join(PROJECT_ROOT, "src", "data", "bangladesh_61_banks.json")

# Standard headers to prevent blocking by bank WAFs
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

# Regex patterns for rate discovery
RATE_PATTERN = re.compile(r"(\d{1,2}(?:\.\d{1,2})?)\s*%", re.IGNORECASE)
TENURE_PATTERNS = {
    "3_months": re.compile(r"(?:3\s*(?:month|mo|m)|90\s*days|three\s*month)", re.IGNORECASE),
    "6_months": re.compile(r"(?:6\s*(?:month|mo|m)|180\s*days|six\s*month)", re.IGNORECASE),
    "1_year": re.compile(r"(?:1\s*(?:year|yr|y)|12\s*months|one\s*year|360\s*days|365\s*days)", re.IGNORECASE),
    "3_years": re.compile(r"(?:3\s*(?:years|yrs|y)|36\s*months|three\s*year)", re.IGNORECASE),
    "5_years": re.compile(r"(?:5\s*(?:years|yrs|y)|60\s*months|five\s*year)", re.IGNORECASE),
    "dps": re.compile(r"(?:dps|deposit\s*pension|recurring|monthly\s*scheme)", re.IGNORECASE),
}

def load_banks():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Banks dataset not found at {DATASET_PATH}")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def probe_bank_soc(bank, timeout=12):
    """
    Probes an individual bank's official SOC URL.
    Returns HTTP metadata, content type, discovered PDF links, and raw text samples.
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
        "latency_ms": None,
        "error": None,
        "content_sha256": None,
        "fetched_at": None,
    }

    if not url or not url.startswith("http"):
        result["error"] = "No valid URL configured"
        return result

    start_time = time.time()

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        ctx = ssl.create_default_context()

        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            latency = int((time.time() - start_time) * 1000)
            result["latency_ms"] = latency
            result["status_code"] = response.getcode()
            content_type = response.headers.get("Content-Type", "")
            result["content_type"] = content_type
            result["last_modified"] = response.headers.get("Last-Modified")
            result["etag"] = response.headers.get("ETag")

            # Read first 1MB of content
            content = response.read(1024 * 1024)
            result["fetched_at"] = datetime.utcnow().isoformat(timespec="seconds") + "Z"
            result["content_sha256"] = hashlib.sha256(content).hexdigest()

            if "application/pdf" in content_type:
                # Direct PDF handling
                result["pdf_circulars_found"].append(url)
                try:
                    doc = fitz.open(stream=content, filetype="pdf")
                    extracted_text = ""
                    for page_num in range(min(len(doc), 3)):
                        extracted_text += doc[page_num].get_text()
                    matches = RATE_PATTERN.findall(extracted_text)
                    if matches:
                        result["detected_rate_sample"] = [f"{m}%" for m in matches[:6]]
                except Exception as pdf_err:
                    result["error"] = f"PDF parse error: {str(pdf_err)}"
            else:
                # HTML response
                try:
                    html_text = content.decode("utf-8", errors="ignore")
                    soup = BeautifulSoup(html_text, "html.parser")

                    # Look for links to PDF circulars
                    for a in soup.find_all("a", href=True):
                        href = a["href"].strip()
                        link_text = a.get_text().strip().lower()
                        if href.endswith(".pdf") or "pdf" in href.lower():
                            if any(w in link_text or w in href.lower() for w in ["rate", "interest", "soc", "charge", "deposit", "fdr"]):
                                full_link = urljoin(url, href)
                                if full_link not in result["pdf_circulars_found"]:
                                    result["pdf_circulars_found"].append(full_link)

                    # Look for rate tables or percentages in text
                    matches = RATE_PATTERN.findall(soup.get_text())
                    if matches:
                        # Filter realistic deposit rates (between 4% and 15%)
                        clean_rates = [f"{m}%" for m in matches if 4.0 <= float(m) <= 15.0]
                        result["detected_rate_sample"] = clean_rates[:6]

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
    """
    Concurrent audit of all 61 banks.
    """
    total = len(banks)
    print(f"\n[*] Initiating SOC Crawler audit for all {total} Bangladesh Scheduled Banks...")
    print(f"[*] Concurrency worker pool: {max_workers} threads\n" + "-" * 75)

    results = []
    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(probe_bank_soc, bank): bank for bank in banks}
        for future in as_completed(futures):
            res = future.result()
            results.append(res)
            status_symbol = "[✓]" if res["status_code"] == 200 else "[!]"
            status_text = f"HTTP {res['status_code']}" if res['status_code'] else "FAILED"
            rate_info = f"Rates: {', '.join(res['detected_rate_sample'][:3])}" if res['detected_rate_sample'] else "No rates extracted"
            print(f"{status_symbol} [{res['bank_code']:<8}] {res['bank_name'][:28]:<28} | {status_text:<10} | {rate_info}")
            if res["status_code"] == 200:
                success_count += 1

    print("-" * 75)
    print(f"[*] Audit complete: {success_count}/{total} banks responded with HTTP 200 OK.")
    return results

def main():
    parser = argparse.ArgumentParser(description="Bangladesh 61 Scheduled Banks SOC Crawler")
    parser.add_argument("--audit", action="store_true", help="Run network probe across all 61 banks")
    parser.add_argument("--bank", type=str, help="Target specific bank short code (e.g. UCB, BRAC, SCB)")
    parser.add_argument("--workers", type=int, default=10, help="Concurrent HTTP worker threads")
    parser.add_argument("--output", type=str, help="Export crawl result JSON to path")
    args = parser.parse_args()

    banks = load_banks()

    if args.bank:
        target = next((b for b in banks if b["short_code"].upper() == args.bank.upper()), None)
        if not target:
            print(f"[!] Bank short code '{args.bank}' not found in dataset of 61 banks.")
            sys.exit(1)
        print(f"[*] Deep probing single bank: {target['bank_name']} ({target['short_code']})...")
        res = probe_bank_soc(target, timeout=20)
        print(json.dumps(res, indent=2))
        return

    if args.audit or not sys.argv[1:]:
        results = run_audit(banks, max_workers=args.workers)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as out_f:
                json.dump(results, out_f, indent=2)
            print(f"[✓] Saved crawl results to {args.output}")

if __name__ == "__main__":
    main()
