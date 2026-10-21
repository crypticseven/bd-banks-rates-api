import json
import re

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bangladesh_61_banks.json', encoding='utf-8') as f:
    banks = json.load(f)

with open('c:/Users/fardi/Documents/Gemini/Business/bd-banks-rates-api/src/data/bb_statutory_rates.json', encoding='utf-8') as f:
    bb_rates = json.load(f)

print(f"Total banks in DB: {len(banks)}")
print(f"Total banks in BB statutory schedule: {len(bb_rates)}")

# Mapping rules from BB names to bank_ids
bb_to_bank_id = {
    'AGRANI': 'agrani',
    'BASIC': 'basic',
    'BDBL': 'bdbl',
    'JANATA': 'janata',
    'RUPALI': 'rupali',
    'SONALI': 'sonali',
    'BKB': 'bkb',
    'PKB': 'pkb',
    'RAKUB': 'rakub',
    'AB-BANK': 'ab_bank',
    'AL-ARAFAH': 'al_arafah',
    'BANK ASIA': 'bank_asia',
    'BCBL': 'bcbl',
    'Bengal': 'bengal_commercial',
    'BRAC': 'brac',
    'CBBL': 'community',
    'Citizens': 'citizens',
    'DHAKA': 'dhaka',
    'DUTCH-BANGLA': 'dbbl',
    'EBL': 'ebl',
    'EXIM': 'exim',
    'FIRST SECU': 'fsibl',
    'GIBL': 'global_islami',
    'ICB': 'icb_islamic',
    'IFIC': 'ific',
    'ISLAMI': 'ibbl',
    'JAMUNA': 'jamuna',
    'MDBL': 'midland',
    'MERCANTILE': 'mercantile',
    'MGBL': 'modhumoti',
    'MMBL': 'meghna',
    'MUTUAL TRUST': 'mtb',
    'NBL': 'nbl',
    'NCCBL': 'ncc',
    'NRBBL': 'nrb',
    'NRBCBL': 'nrbc',
    'ONE BANK': 'one',
    'Padma': 'padma',
    'PREMIER': 'premier',
    'PRIME': 'prime',
    'PUBALI': 'pubali',
    'SBACBL': 'sbac',
    'SHAHJALAL': 'shahjalal',
    'SHIMANTO': 'shimanto',
    'SIBL': 'sibl',
    'SOUTHEAST': 'southeast',
    'STANDARD': 'standard',
    'THE CITY': 'city',
    'TRUST BANK': 'trust',
    'UCBL': 'ucb',
    'UNBL': 'union',
    'UTTARA': 'uttara',
    'AL FALAH': 'bank_alfalah',
    'CITI N.A.': 'citi',
    'COMMERCIAL B.': 'commercial_bank_ceylon',
    'HABIB': 'habib',
    'HSBC': 'hsbc',
    'NBP': 'nbp',
    'SBI': 'sbi',
    'STAN.CHART': 'scb',
    'WOORI': 'woori'
}

existing_bank_ids = {b['bank_id']: b for b in banks}

matched = 0
unmatched_bb = []
unmatched_existing = []

for bb_name, bank_id in bb_to_bank_id.items():
    if bank_id in existing_bank_ids:
        matched += 1
    else:
        unmatched_bb.append((bb_name, bank_id))

for b_id in existing_bank_ids:
    if b_id not in bb_to_bank_id.values():
        unmatched_existing.append(b_id)

print(f"Matched: {matched}/61")
if unmatched_bb:
    print("Unmatched BB mappings:", unmatched_bb)
if unmatched_existing:
    print("Unmatched existing bank IDs:", unmatched_existing)
