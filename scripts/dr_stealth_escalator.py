#!/usr/bin/env python3
"""
scripts/dr_stealth_escalator.py - Tier-2 Emergency Stealth Escalator
Invoked ONCE by scheduler when a bank portal has been ACCESS_BLOCKED for >= 48 hours.
Uses DrissionPage native DevTools socket / Patchright fallback to clear Turnstile,
harvest raw snapshot, compute SHA-256 digest, and deposit into the Raw Evidence Vault.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def execute_emergency_harvest(bank_code: str, target_url: str, output_vault_dir: str = "data/vault") -> dict:
    bank_code = bank_code.upper()
    print(f"\n[!] EMERGENCY 48-HOUR ESCALATION ACTIVATED: {bank_code} -> {target_url}")
    print(f"[*] Mode: Tier-2 Stealth Drill (Native DevTools Protocol / Zero WebDriver)")

    vault_path = Path(output_vault_dir) / bank_code
    vault_path.mkdir(parents=True, exist_ok=True)

    raw_html = ""
    engine_used = "DrissionPage"

    # Attempt 1: DrissionPage native DevTools socket
    try:
        from DrissionPage import ChromiumPage, ChromiumOptions

        co = ChromiumOptions()
        co.set_argument("--no-first-run")
        co.set_argument("--force-color-profile=srgb")
        co.set_argument("--password-store=basic")
        co.set_argument("--no-default-browser-check")
        co.set_argument("--disable-background-mode")
        co.set_user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        )
        co.headless(True)

        page = ChromiumPage(co)
        try:
            print(f"[+] Connecting via DrissionPage socket to {target_url}...")
            page.get(target_url)
            time.sleep(2.5)

            # Detect and clear Turnstile iframe if present
            try:
                turnstile_frame = page.get_frame("@src^=https://challenges.cloudflare.com")
                if turnstile_frame:
                    print("[+] Turnstile challenge detected in Shadow-DOM; negotiating click...")
                    checkbox = turnstile_frame.ele("tag:input@type=checkbox", timeout=4) or turnstile_frame.ele(
                        ".ctp-checkbox-label", timeout=4
                    )
                    if checkbox:
                        time.sleep(0.3)
                        checkbox.click()
                        time.sleep(3.0)
            except Exception as e:
                print(f"[*] Note during Turnstile frame check: {e}")

            # Expand collapsible accordions
            try:
                accordions = page.eles(
                    '.accordion-title, .panel-heading, [data-toggle="collapse"], button[aria-expanded="false"]'
                )
                print(f"[+] Found {len(accordions)} interactive panels; auto-expanding...")
                for acc in accordions[:15]:
                    try:
                        acc.click()
                        time.sleep(0.12)
                    except Exception:
                        pass
            except Exception:
                pass

            raw_html = page.html
        finally:
            page.quit()

    except Exception as dp_err:
        print(f"[*] DrissionPage socket fallback triggered: {dp_err}")
        print("[*] Escalating to Patchright Stealth Engine...")
        engine_used = "Patchright"

        from patchright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--window-size=1920,1080"],
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            )
            context.add_init_script(
                """
                delete Object.getPrototypeOf(navigator).webdriver;
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.outerWidth = 1920;
                window.outerHeight = 1080;
                """
            )
            page = context.new_page()
            page.goto(target_url, timeout=30000)

            # Wait for challenge clearance
            for _ in range(12):
                t = page.title()
                if "One moment" not in t and "Loading" not in t and len(t) > 3:
                    break
                time.sleep(1.0)

            time.sleep(2.0)
            raw_html = page.content()
            browser.close()

    if not raw_html:
        raise RuntimeError(f"Emergency harvest produced empty content for {bank_code}")

    sha256 = hashlib.sha256(raw_html.encode("utf-8")).hexdigest()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    artifact_filename = f"{today_str}_{sha256[:16]}.html"
    artifact_path = vault_path / artifact_filename

    with open(artifact_path, "w", encoding="utf-8") as f:
        f.write(raw_html)

    # Register into evidence vault index
    index_file = Path("data/evidence_vault_index.json")
    index = []
    if index_file.exists():
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                index = json.load(f)
        except Exception:
            index = []

    artifact_record = {
        "sourceId": str(hashlib.md5(f"{bank_code}_{sha256}".encode()).hexdigest()),
        "bankCode": bank_code,
        "sourceUrl": target_url,
        "sourceType": "HTML_DOM",
        "authority": "BANK_OFFICIAL",
        "httpStatus": 200,
        "sha256Hash": sha256,
        "artifactStoragePath": str(artifact_path),
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "accessStatus": "RETRIEVED_VIA_STEALTH_DRILL",
        "engine": engine_used,
    }

    # Upsert by sha256
    existing_idx = next((i for i, r in enumerate(index) if r.get("sha256Hash") == sha256), -1)
    if existing_idx >= 0:
        index[existing_idx] = artifact_record
    else:
        index.append(artifact_record)

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"[✓] Successfully deposited raw evidence artifact: {artifact_path}")
    print(f"[✓] SHA-256 Digest: {sha256}")
    print(f"[✓] Engine: {engine_used} | Status: RETRIEVED_VIA_STEALTH_DRILL\n")

    return artifact_record


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tier-2 Emergency Stealth Escalator (48-Hour Protocol)")
    parser.add_argument("bank_code", help="Bank Code (e.g. CITY, UCB, BRAC)")
    parser.add_argument("target_url", help="Target URL to harvest")
    parser.add_argument("--output-vault", default="data/vault", help="Vault directory")
    args = parser.parse_args()

    result = execute_emergency_harvest(args.bank_code, args.target_url, args.output_vault)
    print(json.dumps(result, indent=2))
