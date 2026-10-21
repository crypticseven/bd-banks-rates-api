import urllib.request
import ssl
import json
import re
import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
req = urllib.request.Request(
    'https://www.bb.org.bd/en/index.php/financialactivity/interestdeposit',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
)

html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')
soup = BeautifulSoup(html, 'html.parser')
table = soup.find('table')
rows = table.find_all('tr')

print(f"Total rows in BB statutory table: {len(rows)}")

bb_bank_data = {}
current_category = "SCB"

category_map = {
    'SCBs': 'State-Owned Commercial Bank',
    'DFIs': 'Development Finance Institution',
    'PCBs': 'Private Commercial Bank',
    'FBs': 'Foreign Commercial Bank'
}

for r in rows:
    cells = [c.get_text(strip=True) for c in r.find_all(['th', 'td'])]
    if not cells:
        continue
    first_cell = cells[0].strip()
    if first_cell in category_map:
        current_category = category_map[first_cell]
        print(f"\n--- Category: {current_category} ---")
        continue
    if first_cell in ['Name of the Banks', '< 1.00 crore', 'September, 2026', 'August, 2026', 'October, 2026']:
        continue
    
    # This is a bank row!
    # Expected cells:
    # 0: Bank Name
    # 1: Savings Deposit
    # 2-6: SND (<1cr, 1-25cr, 25-50cr, 50-100cr, 100cr+)
    # 7: 3m but < 6m
    # 8: 6m but < 1y
    # 9: 1y but < 2y
    # 10: 2y but < 3y
    # 11: 3y and above
    bank_name = first_cell
    savings = cells[1] if len(cells) > 1 else ""
    snd_1 = cells[2] if len(cells) > 2 else ""
    snd_high = cells[6] if len(cells) > 6 else ""
    fd_3m_6m = cells[7] if len(cells) > 7 else ""
    fd_6m_1y = cells[8] if len(cells) > 8 else ""
    fd_1y_2y = cells[9] if len(cells) > 9 else ""
    fd_2y_3y = cells[10] if len(cells) > 10 else ""
    fd_3y_plus = cells[11] if len(cells) > 11 else ""
    
    bb_bank_data[bank_name] = {
        "category": current_category,
        "savings_rate": savings,
        "snd_rate_range": f"{snd_1} - {snd_high}" if snd_high else snd_1,
        "fd_3m_6m": fd_3m_6m,
        "fd_6m_1y": fd_6m_1y,
        "fd_1y_2y": fd_1y_2y,
        "fd_2y_3y": fd_2y_3y,
        "fd_3y_plus": fd_3y_plus,
        "raw_cells": cells
    }
    print(f"Bank: {bank_name:<16} | SB: {savings:<9} | 3-6M: {fd_3m_6m:<11} | 6M-1Y: {fd_6m_1y:<11} | 1Y-2Y: {fd_1y_2y:<11}")

print(f"\nTotal parsed banks from BB: {len(bb_bank_data)}")
with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bb_statutory_rates.json', 'w', encoding='utf-8') as f:
    json.dump(bb_bank_data, f, indent=2)
print("Saved to src/data/bb_statutory_rates.json")
