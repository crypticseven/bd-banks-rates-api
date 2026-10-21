import json

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bangladesh_61_banks.json', encoding='utf-8') as f:
    banks = json.load(f)

print(f"Total banks: {len(banks)}")
sample = banks[0]
print("Sample bank keys:", list(sample.keys()))
print("Sample bank rates keys:", list(sample.get('rates', {}).keys()))
if 'deposit_products' in sample:
    print("Deposit products count in sample:", len(sample['deposit_products']))
    if sample['deposit_products']:
        print("First product:", sample['deposit_products'][0])

print("\n--- All 61 Bank IDs & Names ---")
for i, b in enumerate(banks):
    print(f"{i+1:02d}. ID: {b.get('id', ''):<20} | Name: {b.get('name', ''):<35} | FDR 1yr: {b.get('rates', {}).get('fdr_1yr')}")
