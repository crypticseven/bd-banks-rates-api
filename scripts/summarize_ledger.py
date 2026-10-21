import json

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bank_sources_audit_ledger.json', encoding='utf-8') as f:
    ledger = json.load(f)

print(f"Total banks audited: {len(ledger)}")
accessible = [b for b in ledger if b.get('working_soc_url')]
missing = [b for b in ledger if not b.get('working_soc_url')]

print(f"\n--- SUCCESSFUL DIRECT BANK SOC LINKS ({len(accessible)}/61) ---")
for b in accessible:
    print(f"  [+] {b['bank_id']:<16} | Status: {b['status']:<24} | URL: {b['working_soc_url']}")

print(f"\n--- BANKS REQUIRING TARGETED DOMAIN FIXES ({len(missing)}/61) ---")
for b in missing:
    print(f"  [-] {b['bank_id']:<16} | Domain: {b['primary_bank_domain']:<30} | Error: {b['status']}")
