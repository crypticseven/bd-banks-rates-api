#!/usr/bin/env python3
"""
================================================================================
SOC & DEPOSIT RATES - PRODUCTION PUBLISHER ENGINE
================================================================================
Author: Fardin Ahsan Anik (fardinanik.com / UCB IT Lead)
Purpose: Ingests crawl audit output (crawl_audit_latest.json), filters verified
         tenure rates, formats payload matching rateUpdateSchema, and performs
         an authenticated HTTP handshake with the production or staging API.
================================================================================
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def publish_rates(audit_path, api_url, secret):
    if not os.path.exists(audit_path):
        print(f"[!] Error: Audit file not found at {audit_path}")
        sys.exit(1)

    with open(audit_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    updates = []
    for r in records:
        if r.get("parsed_tenure_yields") or r.get("pdf_circulars_found"):
            upd = {
                "bank_id": r["bank_code"],
                "effective_date": r.get("fetched_at", "").split("T")[0],
                "notes": f"Verified crawl from {r.get('url', 'official SOC')}",
            }
            if r.get("parsed_tenure_yields"):
                upd["fdr_rates"] = r["parsed_tenure_yields"]
            if r.get("pdf_circulars_found"):
                upd["circular_url"] = r["pdf_circulars_found"][0]
            updates.append(upd)

    if not updates:
        print("[!] No verifiable rates found in audit report.")
        return False

    print(f"[*] Preparing authenticated batch of {len(updates)} bank updates...")
    payload = json.dumps({"updates": updates}).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {secret}",
            "User-Agent": "Rates-Publisher/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[✓] Published successfully to {api_url} (HTTP {resp.getcode()}):")
            print(json.dumps(data, indent=2))
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print(f"[!] HTTP Error {e.code}: {body}")
        return False
    except Exception as e:
        print(f"[!] Exception publishing rates: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Publish rates from crawl audit to API")
    parser.add_argument("--audit-file", default="crawl_audit_latest.json", help="Path to audit JSON")
    parser.add_argument("--api-url", default="http://localhost:3009/api/v1/rates/sync", help="Target API sync endpoint")
    parser.add_argument("--secret", help="Bearer secret token (or reads RATES_SYNC_SECRET)")
    args = parser.parse_args()

    secret = args.secret or os.environ.get("RATES_SYNC_SECRET")
    if not secret:
        print("[!] Error: --secret or RATES_SYNC_SECRET env var is required.")
        sys.exit(1)

    success = publish_rates(args.audit_file, args.api_url, secret)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
