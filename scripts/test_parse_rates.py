import json
import re

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bb_statutory_rates.json', encoding='utf-8') as f:
    bb_rates = json.load(f)

def parse_rate_cell(val):
    if not val:
        return None
    val = val.strip()
    # Check for range: e.g. "8.50-9.00" or "8.50 - 9.00" or "8.50-9"
    parts = re.split(r'\s*-\s*', val)
    try:
        if len(parts) == 1:
            return float(parts[0])
        elif len(parts) == 2:
            return {"min": float(parts[0]), "max": float(parts[1]), "mid": round((float(parts[0]) + float(parts[1])) / 2, 2)}
    except ValueError:
        return None

print("Sample parsed values:")
for bank, data in list(bb_rates.items())[:10]:
    raw_1y = data.get('fd_1y_2y', '')
    parsed = parse_rate_cell(raw_1y)
    print(f"{bank:<15} raw: '{raw_1y}' -> parsed: {parsed}")
