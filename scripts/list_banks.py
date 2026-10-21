import json

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bangladesh_61_banks.json', encoding='utf-8') as f:
    banks = json.load(f)

print(f"Total banks: {len(banks)}")
for i, b in enumerate(banks):
    print(f"{i+1:02d}. ID: {b['bank_id']:<18} | Code: {b['short_code']:<12} | Name: {b['bank_name']}")
