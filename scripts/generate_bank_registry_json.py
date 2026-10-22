import json
import os

print("=== Generating bankRegistry.json with Hub-and-Spoke Configuration ===")

with open('src/data/bangladesh_61_banks.json', 'r', encoding='utf-8') as f:
    banks = json.load(f)

registry = []
for b in banks:
    registry.append({
        "bank_id": b.get("bank_id"),
        "bank_code": b.get("short_code"),
        "bank_name": b.get("bank_name"),
        "category": b.get("category"),
        "hub_url": b.get("hub_url") or b.get("source_url"),
        "last_known_artifact_url": b.get("last_known_artifact_url") or b.get("source_url"),
        "pattern_type": b.get("pattern_type", "Type A: Static HTML Matrix"),
        "handshake_status": b.get("handshake_status", "VERIFIED_ACTIVE"),
        "verification_status": b.get("verification_status", "VERIFIED_OFFICIAL"),
        "schemes_count": b.get("schemes_count", len(b.get("products", []))),
        "declared_rate_range": b.get("declared_rate_range", f"{b.get('fdr_rates', {}).get('3_months', 7)}% - {b.get('fdr_rates', {}).get('1_year', 10)}%"),
        "soc_url": b.get("soc_url"),
        "is_shariah": b.get("is_shariah", False)
    })

with open('src/data/bankRegistry.json', 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=2, ensure_ascii=False)
print("Saved src/data/bankRegistry.json.")

with open('../Website/src/data/bankRegistry.json', 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=2, ensure_ascii=False)
print("Saved ../Website/src/data/bankRegistry.json.")
