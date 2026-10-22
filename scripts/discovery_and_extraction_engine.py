#!/usr/bin/env python3
"""
scripts/discovery_and_extraction_engine.py
Hub-and-Spoke Discovery, Heuristic Trap Filter, and PDF/HTML Content Legitimacy Gate.
Part of the Bangladesh Banking Truth Engine (BTE).
"""

from __future__ import annotations

import re
import hashlib
import io
import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
import pdfplumber

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# =====================================================================
# 1. HEURISTIC TRAP & LEGITIMACY REGEX DEFINITIONS
# =====================================================================

TRAP_KEYWORDS = re.compile(
    r"(exchange[-_\s]?rate|forex|currency[-_\s]?detail|dealing[-_\s]?room|"
    r"climate|csr|governance|annual[-_\s]?report|financial[-_\s]?statement|"
    r"nis[-_\s]?annual|unclaimed|basel|credit[-_\s]?rating|lending[-_\s]?rate)",
    re.IGNORECASE
)

POSITIVE_LINK_KEYWORDS = re.compile(
    r"(deposit|fdr|dps|mudaraba|mtdr|profit[-_\s]?rate|interest[-_\s]?rate|"
    r"term[-_\s]?deposit|retail|saving|scheme|provisional)",
    re.IGNORECASE
)

TENOR_TOKENS = re.compile(
    r"\b(1\s*month|3\s*month|6\s*month|12\s*month|1\s*year|2\s*year|3\s*year|"
    r"5\s*year|30\s*day|90\s*day|180\s*day|360\s*day)\b",
    re.IGNORECASE
)

DEPOSIT_PRODUCT_TOKENS = re.compile(
    r"\b(fixed\s*deposit|fdr|term\s*deposit|mtdr|dps|pension|monthly\s*benefit|"
    r"special\s*notice|snd|savings|mudaraba|millionaire|double)\b",
    re.IGNORECASE
)

# Matches realistic BD deposit rates between 4.00% and 14.99%
RATE_VALUE_REGEX = re.compile(r"\b(?:[4-9]|1[0-4])\.\d{2}\s*%?")


# =====================================================================
# 2. CONTENT LEGITIMACY VERIFIER (HTML & PDF)
# =====================================================================

def extract_text_from_response(res: requests.Response, url: str) -> str:
    """Extracts clean readable text from either a PDF binary or HTML response."""
    content_type = res.headers.get("Content-Type", "").lower()
    if "application/pdf" in content_type or url.lower().endswith(".pdf"):
        text_pages = []
        try:
            with pdfplumber.open(io.BytesIO(res.content)) as pdf:
                for page in pdf.pages[:12]:  # Inspect up to 12 pages
                    extracted = page.extract_text() or ""
                    text_pages.append(extracted)
        except Exception as e:
            text_pages.append(f"PDF extraction error: {e}")
        return "\n".join(text_pages)
    else:
        soup = BeautifulSoup(res.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)


def passes_deposit_legitimacy_gate(text: str, url: str) -> dict:
    """
    Applies the 3-Rule Content Legitimacy Filter:
    1. Not a trap URL.
    2. Contains >= 2 distinct tenor tokens.
    3. Contains >= 2 deposit product tokens AND >= 4 realistic percentage numbers.
    """
    if TRAP_KEYWORDS.search(url):
        return {"valid": False, "reason": "TRAP_URL_DETECTED"}

    tenors = set(m.lower() for m in TENOR_TOKENS.findall(text))
    products = set(m.lower() for m in DEPOSIT_PRODUCT_TOKENS.findall(text))
    rates = RATE_VALUE_REGEX.findall(text)

    is_valid = (len(tenors) >= 2) and (len(products) >= 2) and (len(rates) >= 4)
    return {
        "valid": is_valid,
        "tenor_count": len(tenors),
        "product_mentions": len(products),
        "rate_numbers_found": len(rates),
    }


# =====================================================================
# 3. HUB-AND-SPOKE DYNAMIC LINK RESOLVER
# =====================================================================

def score_candidate_link(href: str, anchor_text: str) -> int:
    """Scores a candidate URL found on a bank's hub page."""
    combined = f"{href} {anchor_text}"
    if TRAP_KEYWORDS.search(combined):
        return -100

    score = 0
    if POSITIVE_LINK_KEYWORDS.search(combined):
        score += 35
    if href.lower().endswith(".pdf"):
        score += 25
    # Boost links with current/recent year markers
    if re.search(r"2026", combined):
        score += 30
    elif re.search(r"2025", combined):
        score += 15
    if re.search(r"(deposit|fdr|mudaraba)", combined, re.I):
        score += 20
    if re.search(r"(lending|loan|smart)", combined, re.I):
        score -= 60
    return score


def resolve_live_rate_artifact(bank_code: str, hub_url: str, fallback_urls: list[str] = None) -> dict:
    """
    Given a bank's Hub URL:
    1. Checks if the Hub URL itself contains the full FD/DPS table (HTML Matrix).
    2. Even if HTML has some text, scans all child <a> links for a higher-priority master PDF circular.
    3. Verifies the winning artifact via passes_deposit_legitimacy_gate().
    """
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) BDRIP-Auditor/3.0"}
    urls_to_try = [hub_url] + (fallback_urls or [])

    for target_url in urls_to_try:
        try:
            res = requests.get(target_url, headers=headers, timeout=15, verify=False)
            if res.status_code != 200:
                continue

            # Case A: Target is already a direct PDF
            if "application/pdf" in res.headers.get("Content-Type", "").lower() or target_url.lower().endswith(".pdf"):
                raw_text = extract_text_from_response(res, target_url)
                gate = passes_deposit_legitimacy_gate(raw_text, target_url)
                if gate["valid"]:
                    return {
                        "bank_code": bank_code,
                        "resolved_url": target_url,
                        "artifact_type": "PDF",
                        "sha256": hashlib.sha256(res.content).hexdigest(),
                        "raw_text": raw_text[:5000],
                        "telemetry": gate,
                    }

            # Case B: Target is an HTML Hub Page — harvest child PDF/subpage links first
            soup = BeautifulSoup(res.text, "html.parser")
            candidates = []
            for a in soup.find_all("a", href=True):
                full_url = urljoin(target_url, a["href"].strip())
                anchor_text = a.get_text(" ", strip=True)
                score = score_candidate_link(full_url, anchor_text)
                if score > 20:
                    candidates.append((score, full_url, anchor_text))

            # Sort candidates highest score first
            candidates.sort(key=lambda x: x[0], reverse=True)

            # Probe top 5 child candidates (e.g. dated PDFs inside the hub page)
            for score, child_url, anchor in candidates[:5]:
                try:
                    c_res = requests.get(child_url, headers=headers, timeout=15, verify=False)
                    if c_res.status_code == 200:
                        c_text = extract_text_from_response(c_res, child_url)
                        c_gate = passes_deposit_legitimacy_gate(c_text, child_url)
                        if c_gate["valid"]:
                            return {
                                "bank_code": bank_code,
                                "resolved_url": child_url,
                                "discovered_from_hub": target_url,
                                "artifact_type": "PDF" if child_url.lower().endswith(".pdf") else "HTML",
                                "sha256": hashlib.sha256(c_res.content).hexdigest(),
                                "raw_text": c_text[:5000],
                                "telemetry": c_gate,
                            }
                except Exception:
                    continue

            # Case C: No child PDF beat the hub page; check if the Hub HTML itself holds the rate table
            hub_text = extract_text_from_response(res, target_url)
            hub_gate = passes_deposit_legitimacy_gate(hub_text, target_url)
            if hub_gate["valid"]:
                return {
                    "bank_code": bank_code,
                    "resolved_url": target_url,
                    "artifact_type": "HTML_MATRIX",
                    "sha256": hashlib.sha256(res.content).hexdigest(),
                    "raw_text": hub_text[:5000],
                    "telemetry": hub_gate,
                }

        except Exception:
            continue

    return {
        "bank_code": bank_code,
        "resolved_url": None,
        "status": "RESOLUTION_FAILED_NEEDS_SEARCH_DORK",
    }


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    test_banks = [
        ("EBL", "https://www.ebl.com.bd/interest-rates"),
        ("CITIZENS", "https://www.citizensbankbd.com/rates/deposit-rate"),
        ("SHIMANTO", "https://shimantobank.com/interest-rates/deposit"),
    ]
    print("[*] Testing Hub-and-Spoke Discovery Engine on Representative Banks:")
    for code, hub in test_banks:
        print(f"\n--- Resolving {code} ({hub}) ---")
        res = resolve_live_rate_artifact(code, hub)
        print(f"Status/Resolved: {res.get('resolved_url') or res.get('status')}")
        print(f"Artifact Type: {res.get('artifact_type')}")
        print(f"SHA-256: {res.get('sha256')}")
        if 'telemetry' in res:
            print(f"Telemetry Gate: {res['telemetry']}")
