import json

with open('src/data/bangladesh_61_banks.json', 'r', encoding='utf-8') as f:
    banks = json.load(f)

print(f"Total banks: {len(banks)}")
print("=" * 110)
print(f"{'Code':<8} | {'Bank Name':<28} | {'NPL Category':<18} | {'CAR':<12} | {'Rating':<8} | {'Score':<5} | {'Stability Tier':<18}")
print("=" * 110)

for b in banks:
    code = b.get("short_code", "")
    name = b.get("bank_name", "")[:28]
    npl = b.get("npl_category", "")
    car = b.get("capital_adequacy_ratio_car", "")
    rating = b.get("credit_rating", "")
    score = str(b.get("rating_score", ""))
    tier = b.get("stability_tier", "")
    print(f"{code:<8} | {name:<28} | {npl:<18} | {car:<12} | {rating:<8} | {score:<5} | {tier:<18}")
