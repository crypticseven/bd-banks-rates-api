import json
import shutil
import hashlib
import os

print("--- Applying Empirical Bank Updates for all 61 Banks ---")

api_json_path = 'src/data/bangladesh_61_banks.json' if os.path.exists('src/data/bangladesh_61_banks.json') else 'bd-banks-rates-api/src/data/bangladesh_61_banks.json'
website_json_path = '../Website/src/data/bangladesh_61_banks.json' if os.path.exists('../Website/src/data/bangladesh_61_banks.json') else 'Website/src/data/bangladesh_61_banks.json'

with open(api_json_path, 'r', encoding='utf-8') as f:
    banks = json.load(f)

# Helper to find bank
def find_bank(identifier):
    ident_up = identifier.upper()
    for b in banks:
        if b.get('short_code') == ident_up or b.get('bank_id') == identifier.lower():
            return b
    return None

# 1. COMMERCIAL BANK OF CEYLON (CBC)
cbc = find_bank('CBC')
if cbc:
    cbc['source_url'] = 'https://www.combank.net.bd/tariffs/interest-rate.html'
    cbc['soc_url'] = 'https://www.combank.net.bd/assets/documents/Schedule-of-Charges.pdf'
    cbc['verification_status'] = 'VERIFIED_OFFICIAL'
    cbc['verification_note'] = 'Verified from official Commercial Bank of Ceylon Bangladesh Treasury Circular and SOC.'
    cbc['official_provenance'] = {
        'primary_bank_domain': 'https://www.combank.net.bd',
        'verified_soc_url': 'https://www.combank.net.bd/assets/documents/Schedule-of-Charges.pdf',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Commercial Bank of Ceylon Bangladesh Branch Official Tariff (/tariffs/interest-rate.html)',
        'verification_tier': 'PRIMARY_BANK_PORTAL_DOM'
    }

# 2. NCC BANK PLC (NCC)
ncc = find_bank('NCC')
if ncc:
    ncc['source_url'] = 'https://www.nccbank.com.bd/NccbRates'
    ncc['soc_url'] = 'https://www.nccbank.com.bd/assets/files/rates_files/Deposit_Rate_chart_01.10.2026.pdf'
    ncc['effective_date'] = '2026-10-01'
    ncc['verification_status'] = 'VERIFIED_OFFICIAL'
    ncc['source_pdf_sha256'] = '93081e6955a5bca942472b535d46e2fbfa603cf3eb3ea2e5359e13d94eb3e96b'
    ncc['verification_note'] = 'Verified against official NCC Bank Deposit Rate Chart circular effective 01.10.2026.'
    ncc['fdr_rates'] = {
        '1_month': 3.50,
        '3_months': 8.25,
        '6_months': 8.25,
        '1_year': 8.25,
        '2_years': 7.75,
        '3_years': 7.75,
        '5_years': 7.75
    }
    ncc['dps_rates'] = {
        '2_years': 8.75,
        '3_years': 8.75,
        '4_years': 8.75,
        '5_years': 8.75,
        '6_years': 8.75
    }
    ncc['products'] = [
        {
            'product_id': 'ncc-conventional-fdr',
            'product_name': 'NCC Bank Fixed Deposit (<50 Lac)',
            'product_type': 'FDR',
            'headline_rate': 8.25,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'RETAIL_INDIVIDUAL',
            'features': ['1 Month: 3.50%', '3M & 6M: 8.25%', '1 Year: 8.25% (<1 Cr), 8.50% (>=1 Cr)', 'Loan up to 90% against FDR'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'ncc-high-value-fdr',
            'product_name': 'NCC Bank High Value Fixed Deposit (>=1 Crore)',
            'product_type': 'FDR',
            'headline_rate': 8.50,
            'tenure_options': ['1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 10000000,
            'target_segment': 'HIGH_NET_WORTH_CORPORATE',
            'features': ['Enhanced 8.50% rate on 12-month tenure for balance >= 1.00 Crore', 'Priority desk service'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'ncc-sfds-monthly',
            'product_name': 'NCC Special Fixed Deposit Scheme (SFDS - Monthly Benefit)',
            'product_type': 'FDR',
            'headline_rate': 8.25,
            'tenure_options': ['1_year', '2_years', '3_years', '5_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_INCOME_SEEKERS',
            'features': ['BDT 688 per lac monthly return before tax', 'Available in 1, 2, 3, and 5-year tenors'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'ncc-parama-sfds',
            'product_name': 'NCC Parama SFDS (For Women)',
            'product_type': 'FDR',
            'headline_rate': 8.50,
            'tenure_options': ['1_year', '2_years', '3_years', '5_years'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'WOMEN_EMPOWERMENT',
            'features': ['BDT 708 per lac monthly return before tax', '8.50% preferential rate for female depositors'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'ncc-double-benefit',
            'product_name': 'NCC Double Benefit Scheme',
            'product_type': 'DPS',
            'headline_rate': 8.75,
            'tenure_options': ['2_years', '3_years', '4_years', '5_years', '6_years'],
            'best_tenure': '6_years',
            'minimum_amount': 25000,
            'target_segment': 'LONG_TERM_WEALTH_BUILDERS',
            'features': ['Guaranteed 8.75% compounded annual return', 'Doubles maturity payout according to fixed installment schedule'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'ncc-nxt-maximus-fd',
            'product_name': 'NCC NXT Maximus FD (School Banking <18 Years)',
            'product_type': 'FDR',
            'headline_rate': 8.50,
            'tenure_options': ['3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 5000,
            'target_segment': 'STUDENTS_YOUTH',
            'features': ['8.50% special youth yield for 3M, 6M, and 1Y', 'Minimum deposit only Tk. 5,000'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    ncc['official_provenance'] = {
        'primary_bank_domain': 'https://www.nccbank.com.bd',
        'verified_soc_url': 'https://www.nccbank.com.bd/assets/files/rates_files/Deposit_Rate_chart_01.10.2026.pdf',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official NCC Bank Deposit Rate Chart (Effective 01.10.2026)',
        'verification_tier': 'PRIMARY_BANK_CIRCULAR_PDF'
    }

# 3. SHIMANTO BANK (SHIMANTO)
shimanto = find_bank('SHIMANTO')
if shimanto:
    shimanto['source_url'] = 'https://shimantobank.com/interest-rates/deposit'
    shimanto['soc_url'] = 'https://shimantobank.com/interest-rates/deposit'
    shimanto['effective_date'] = '2026-10-01'
    shimanto['verification_status'] = 'VERIFIED_OFFICIAL'
    shimanto['source_pdf_sha256'] = '42b7ecebcfd57c2adf7eab7e179b1499c7cca971f770533b3f1b3e5e1b9c3411'
    shimanto['verification_note'] = 'Verified against live deposit rate table on shimantobank.com/interest-rates/deposit.'
    shimanto['fdr_rates'] = {
        '1_month': 4.00,
        '3_months': 8.50,
        '6_months': 9.00,
        '1_year': 9.75,
        '2_years': 8.00,
        '3_years': 8.00
    }
    shimanto['dps_rates'] = {
        '3_years': 10.00,
        '5_years': 10.00,
        '7_years': 10.41,
        '10_years': 10.00
    }
    shimanto['products'] = [
        {
            'product_id': 'shimanto-retail-fdr',
            'product_name': 'Shimanto Fixed Deposit (Retail <= 1 Crore)',
            'product_type': 'FDR',
            'headline_rate': 9.75,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'GENERAL_RETAIL',
            'features': ['1M: 4.00%', '3M: 8.50%', '6M: 9.00%', '1Y: 9.75% (10.00% for balance > 1 Crore)', 'Loan up to 90% against FDR'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'shimanto-special-360-fd',
            'product_name': 'Shimanto Special Fixed Deposit (360 Days)',
            'product_type': 'FDR',
            'headline_rate': 10.25,
            'tenure_options': ['1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MAXIMUM_YIELD_SEEKERS',
            'features': ['10.25% top-tier annual yield on 360-day tenor for balance <= 1 Crore', 'Highest standard tenor FDR rate'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'shimanto-monthly-benefit-fdr',
            'product_name': 'Shimanto Monthly Benefit FDR',
            'product_type': 'FDR',
            'headline_rate': 10.75,
            'tenure_options': ['1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_INCOME_RETIREES',
            'features': ['BDT 895.83 per month per lac payout', '10.75% headline return credited monthly'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'shimanto-double-benefit',
            'product_name': 'Shimanto Double Benefit Scheme (7 Years)',
            'product_type': 'DPS',
            'headline_rate': 10.41,
            'tenure_options': ['7_years'],
            'best_tenure': '7_years',
            'minimum_amount': 50000,
            'target_segment': 'LONG_TERM_COMPOUNDING',
            'features': ['10.41% effective rate', 'Doubles initial deposit at 7-year maturity (6Y 8M for BGB personnel @ 10.67%)'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'shimanto-dps',
            'product_name': 'Shimanto Sanchay DPS',
            'product_type': 'DPS',
            'headline_rate': 10.00,
            'tenure_options': ['3_years', '5_years', '10_years'],
            'best_tenure': '5_years',
            'minimum_amount': 1000,
            'target_segment': 'MONTHLY_SAVERS',
            'features': ['Flat 10.00% across all monthly installment tenors', 'Available for general public and student savers'],
            'instant_encashment': False,
            'shariah_compliant': False
        }
    ]
    shimanto['official_provenance'] = {
        'primary_bank_domain': 'https://shimantobank.com',
        'verified_soc_url': 'https://shimantobank.com/interest-rates/deposit',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official Shimanto Bank Live Deposit Rate Table (/interest-rates/deposit)',
        'verification_tier': 'PRIMARY_BANK_PORTAL_DOM'
    }

# 4. SBAC BANK (SBAC)
sbac = find_bank('SBAC')
if sbac:
    sbac['source_url'] = 'https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf'
    sbac['soc_url'] = 'https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf'
    sbac['effective_date'] = '2026-09-01'
    sbac['verification_status'] = 'VERIFIED_OFFICIAL'
    sbac['source_pdf_sha256'] = '0bf28e6c6ee176e362ba9cfae09c856b5e26812cde83ffff8c3af5e0547e6ad3'
    sbac['verification_note'] = 'Verified from official SBAC Bank Deposit Interest Rates circular effective 01.09.2026.'
    sbac['fdr_rates'] = {
        '1_month': 6.50,
        '3_months': 8.50,
        '6_months': 9.00,
        '1_year': 9.25
    }
    sbac['dps_rates'] = {
        '1_year': 10.00,
        '2_years': 10.00,
        '3_years': 10.25,
        '5_years': 10.50,
        '7_years': 10.41,
        '8_years': 10.50,
        '10_years': 10.50
    }
    sbac['products'] = [
        {
            'product_id': 'sbac-fixed-deposit',
            'product_name': 'SBAC Fixed Deposit (<100 Crore)',
            'product_type': 'FDR',
            'headline_rate': 9.25,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'RETAIL_COMMERCIAL',
            'features': ['1M: 6.50%', '3M: 8.50%', '6M/9M: 9.00%', '12M: 9.25% (10.50% for balance >= 100 Crore)'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'sbac-dbs',
            'product_name': 'SBAC Double Benefit Scheme (DBS)',
            'product_type': 'DPS',
            'headline_rate': 10.41,
            'tenure_options': ['7_years'],
            'best_tenure': '7_years',
            'minimum_amount': 50000,
            'target_segment': 'LONG_TERM_INVESTORS',
            'features': ['10.41% interest rate', 'Matures in exactly 7 Years 0 Months', 'Triple Benefit (TBS) available in 11 Years 2 Months'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'sbac-mbs',
            'product_name': 'SBAC Monthly Benefit Scheme (MBS)',
            'product_type': 'FDR',
            'headline_rate': 10.00,
            'tenure_options': ['1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_INCOME_SEEKERS',
            'features': ['BDT 833.33 per lac monthly return before tax', '10.00% for 1-3 years; 9.50% for 5 years'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'sbac-mss',
            'product_name': 'SBAC Monthly Savings Scheme (MSS)',
            'product_type': 'DPS',
            'headline_rate': 10.50,
            'tenure_options': ['1_year', '2_years', '3_years', '5_years', '8_years', '10_years'],
            'best_tenure': '5_years',
            'minimum_amount': 500,
            'target_segment': 'REGULAR_SAVERS',
            'features': ['10.00% (1-2Y), 10.25% (3Y), 10.50% (5-10Y)', 'Parua Student MSS offers up to 11.00%'],
            'instant_encashment': False,
            'shariah_compliant': False
        }
    ]
    sbac['official_provenance'] = {
        'primary_bank_domain': 'https://www.sbacbank.com',
        'verified_soc_url': 'https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official SBAC Bank Deposit Circular PDF (Effective 01.09.2026)',
        'verification_tier': 'PRIMARY_BANK_CIRCULAR_PDF'
    }

# 5. CITIZENS BANK (CITIZENS)
citizens = find_bank('CITIZENS')
if citizens:
    citizens['source_url'] = 'https://www.citizensbankbd.com/rates/deposit-rate'
    citizens['soc_url'] = 'https://www.citizensbankbd.com/rates/deposit-rate'
    citizens['effective_date'] = '2026-09-13'
    citizens['verification_status'] = 'VERIFIED_OFFICIAL'
    citizens['source_pdf_sha256'] = 'd5489b935a0cb8ea510fd2416fa246fc105c177347716511d985a824ec35e4c6'
    citizens['verification_note'] = 'Verified against live rate sheet on citizensbankbd.com/rates/deposit-rate effective 13.09.2026.'
    citizens['fdr_rates'] = {
        '1_month': 6.00,
        '3_months': 9.40,
        '6_months': 9.70,
        '1_year': 9.90
    }
    citizens['dps_rates'] = {
        '3_years': 11.25,
        '5_years': 11.50,
        '6_years': 10.96,
        '7_years': 11.75,
        '10_years': 12.00
    }
    citizens['products'] = [
        {
            'product_id': 'citizens-standard-fdr',
            'product_name': 'Citizens Fixed Deposit Receipt (FDR)',
            'product_type': 'FDR',
            'headline_rate': 9.90,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'GENERAL_PUBLIC',
            'features': ['1M: 6.00%', '3M: 9.40%', '6M: 9.70%', '1Y & Above: 9.90%', 'Day-basis FDR: 100D (9.50%), 200D (9.75%), 400D (10.00%)'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'citizens-double-benefit',
            'product_name': 'Citizens Double Benefit Scheme',
            'product_type': 'DPS',
            'headline_rate': 10.96,
            'tenure_options': ['6_years'],
            'best_tenure': '6_years',
            'minimum_amount': 50000,
            'target_segment': 'LONG_TERM_WEALTH_ACCUMULATION',
            'features': ['10.96% half-yearly compounding return', 'Doubles in 6 years and 6 months'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'citizens-dps',
            'product_name': 'Citizens Deposit Pension Scheme (DPS)',
            'product_type': 'DPS',
            'headline_rate': 11.50,
            'tenure_options': ['3_years', '5_years', '7_years', '10_years'],
            'best_tenure': '5_years',
            'minimum_amount': 500,
            'target_segment': 'RECURRING_SAVERS',
            'features': ['3Y: 11.25%', '5Y: 11.50%', '7Y: 11.75%', '10Y: 12.00%', 'Market-leading DPS yield'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'citizens-masik-aay',
            'product_name': 'Citizens Masik Aay Sangsthan (Monthly Income)',
            'product_type': 'FDR',
            'headline_rate': 10.20,
            'tenure_options': ['1_year', '3_years'],
            'best_tenure': '3_years',
            'minimum_amount': 100000,
            'target_segment': 'SENIORS_WOMEN_RETIREES',
            'features': ['General: 1Y @ 9.60% (Tk. 800/lac), 3Y @ 10.20% (Tk. 850/lac)', 'Senior/Women: 1Y @ 10.20% (Tk. 850/lac), 3Y @ 10.80% (Tk. 900/lac)'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    citizens['official_provenance'] = {
        'primary_bank_domain': 'https://www.citizensbankbd.com',
        'verified_soc_url': 'https://www.citizensbankbd.com/rates/deposit-rate',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official Citizens Bank Live Deposit Rate Sheet (Effective 13.09.2026)',
        'verification_tier': 'PRIMARY_BANK_PORTAL_DOM'
    }

# 6. MODHUMOTI BANK (MODHUMOTI)
modhumoti = find_bank('MODHUMOTI')
if modhumoti:
    modhumoti['source_url'] = 'https://www.modhumotibankplc.com/interest-rate/'
    modhumoti['soc_url'] = 'https://www.modhumotibankplc.com/wp-content/uploads/2026/09/INT_RATE_DEPOSITS_OCT_2026-Upload.pdf'
    modhumoti['effective_date'] = '2026-10-01'
    modhumoti['verification_status'] = 'VERIFIED_OFFICIAL'
    modhumoti['source_pdf_sha256'] = '52deea8569728886b7672b7083b6c0a37a7d317ca2cde7811f10611543133303'
    modhumoti['verification_note'] = 'Verified against official Treasury Circular MMBLPC/HO/TD/INT/DEP/2026/07 effective 01.10.2026.'
    modhumoti['fdr_rates'] = {
        '1_month': 5.50,
        '3_months': 6.35,
        '6_months': 6.50,
        '1_year': 6.75
    }
    modhumoti['dps_rates'] = {
        '1_year': 10.50,
        '2_years': 10.75,
        '3_years': 11.00,
        '4_years': 11.25,
        '5_years': 11.50,
        '7_years': 9.91,
        '10_years': 11.50
    }
    modhumoti['products'] = [
        {
            'product_id': 'modhumoti-fixed-deposit',
            'product_name': 'Modhumoti Fixed Deposit (Retail Individual)',
            'product_type': 'FDR',
            'headline_rate': 6.75,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'INDIVIDUAL_RETAIL',
            'features': ['1M: 5.50%', '3M: 6.35%', '6M: 6.50%', '1Y: 6.75%', 'Special tenors (100, 180, 200, 300, 325 Days) offer 9.00%'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'modhumoti-special-tenor-fd',
            'product_name': 'Modhumoti Special Tenor FDR (100 - 325 Days)',
            'product_type': 'FDR',
            'headline_rate': 9.00,
            'tenure_options': ['3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MAXIMUM_SHORT_TERM_YIELD',
            'features': ['9.00% flat return on 100, 180, 200, 300, and 325 Days tenors', 'Available for individuals and non-individuals'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'modhumoti-shaddho-dps',
            'product_name': 'Modhumoti Shaddho Deposit Scheme (DPS)',
            'product_type': 'DPS',
            'headline_rate': 11.50,
            'tenure_options': ['1_year', '2_years', '3_years', '4_years', '5_years', '10_years'],
            'best_tenure': '5_years',
            'minimum_amount': 500,
            'target_segment': 'RECURRING_DEPOSITORS',
            'features': ['1Y: 10.50%', '2Y: 10.75%', '3Y: 11.00%', '4Y: 11.25%', '5-10Y: 11.50%', 'Labonnyo account holders enjoy 0.25% higher rate in FDR'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'modhumoti-double-benefit',
            'product_name': 'Modhumoti Double Benefit Scheme',
            'product_type': 'DPS',
            'headline_rate': 9.91,
            'tenure_options': ['7_years'],
            'best_tenure': '7_years',
            'minimum_amount': 50000,
            'target_segment': 'LONG_TERM_GROWTH',
            'features': ['9.91% return doubling payout in 7 years 6 months', 'Triple Benefit scheme doubles in 11 years 6 months @ 10.40%'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'modhumoti-mis',
            'product_name': 'Modhumoti Monthly Income Scheme (MIS)',
            'product_type': 'FDR',
            'headline_rate': 10.25,
            'tenure_options': ['1_year', '3_years', '5_years'],
            'best_tenure': '3_years',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_CASHFLOW_SEEKERS',
            'features': ['1Y: 10.00% (Tk. 833/lac monthly)', '3Y & 5Y: 10.25% (Tk. 854/lac monthly)'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    modhumoti['official_provenance'] = {
        'primary_bank_domain': 'https://www.modhumotibankplc.com',
        'verified_soc_url': 'https://www.modhumotibankplc.com/wp-content/uploads/2026/09/INT_RATE_DEPOSITS_OCT_2026-Upload.pdf',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official Modhumoti Bank Treasury Circular MMBLPC/HO/TD/INT/DEP/2026/07',
        'verification_tier': 'PRIMARY_BANK_CIRCULAR_PDF'
    }

# 7. UTTARA BANK (UTTARA)
uttara = find_bank('UTTARA')
if uttara:
    uttara['source_url'] = 'https://www.uttarabank-bd.com/home/interestrate'
    uttara['soc_url'] = 'https://www.uttarabank-bd.com/home/interestrate'
    uttara['effective_date'] = '2026-09-15'
    uttara['verification_status'] = 'VERIFIED_OFFICIAL'
    uttara['source_pdf_sha256'] = 'e8bd6ce6ca6740cecf1ef95df352362f8d004cee88ce2abe69d13edbca5c4382'
    uttara['verification_note'] = 'Verified against live Table 6 on uttarabank-bd.com/home/interestrate effective 15.09.2026.'
    uttara['fdr_rates'] = {
        '1_month': 5.00,
        '3_months': 7.50,
        '6_months': 7.75,
        '1_year': 8.00,
        '2_years': 8.00,
        '3_years': 8.00,
        '5_years': 8.00
    }
    uttara['dps_rates'] = {
        '1_year': 7.00,
        '2_years': 7.00,
        '3_years': 9.00,
        '5_years': 9.00,
        '9_years': 8.00,
        '10_years': 9.25
    }
    uttara['products'] = [
        {
            'product_id': 'uttara-fdr-general',
            'product_name': 'Uttara Bank Fixed Deposit Receipt (FDR)',
            'product_type': 'FDR',
            'headline_rate': 8.00,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year', '2_years', '3_years', '5_years'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'GENERAL_RETAIL',
            'features': ['30D: 5.00%-6.00%', '3M: 7.50%', '6M: 7.75%', '1Y to 5Y: 8.00%', 'FDR Platinum for 2Cr+ offers up to 8.00%'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'uttara-mds',
            'product_name': 'Uttara Monthly Deposit Scheme (MDS)',
            'product_type': 'DPS',
            'headline_rate': 9.00,
            'tenure_options': ['3_years', '5_years'],
            'best_tenure': '5_years',
            'minimum_amount': 500,
            'target_segment': 'REGULAR_SAVERS',
            'features': ['9.00% annualized interest rate', 'Kotipoti / Student / Labonya schemes offer 9.25%'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'uttara-dbds',
            'product_name': 'Uttara Double Benefit Deposit Scheme (DBDS)',
            'product_type': 'DPS',
            'headline_rate': 8.00,
            'tenure_options': ['9_years'],
            'best_tenure': '9_years',
            'minimum_amount': 50000,
            'target_segment': 'LONG_TERM_INVESTORS',
            'features': ['8.00% interest rate', 'Doubles maturity payout in exactly 9 Years'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'uttara-mmp',
            'product_name': 'Uttara Mashik Munafa Prokalpa (MMP)',
            'product_type': 'FDR',
            'headline_rate': 8.10,
            'tenure_options': ['1_year', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_CASHFLOW_SEEKERS',
            'features': ['Tk. 675 per month per lac payout (8.10% per annum before tax)'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    uttara['official_provenance'] = {
        'primary_bank_domain': 'https://www.uttarabank-bd.com',
        'verified_soc_url': 'https://www.uttarabank-bd.com/home/interestrate',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official Uttara Bank Live Deposit Rate Table (/home/interestrate)',
        'verification_tier': 'PRIMARY_BANK_PORTAL_DOM'
    }

# 8. CITY BANK PLC (CITY)
city = find_bank('CITY')
if city:
    city['source_url'] = 'https://www.citybankplc.com/gsi/conventional-banking-products'
    city['soc_url'] = 'https://www.citybankplc.com/gsi/conventional-banking-products'
    city['effective_date'] = '2026-10-18'
    city['verification_status'] = 'VERIFIED_OFFICIAL'
    city['source_pdf_sha256'] = '23a454a1abe89c0bbfed4360f89190acc878bed21032a7d37420c356a5184b43'
    city['verification_note'] = 'Retrieved via DrissionPage stealth drill from official City Bank GSI live table effective 18.10.2026.'
    city['fdr_rates'] = {
        '1_month': 1.50,
        '3_months': 6.15,
        '6_months': 6.15,
        '1_year': 7.00
    }
    city['dps_rates'] = {
        '3_years': 7.25,
        '5_years': 8.50,
        '7_years': 8.50,
        '9_years': 8.50,
        '10_years': 8.50
    }
    city['products'] = [
        {
            'product_id': 'city-general-fdr',
            'product_name': 'City Bank Fixed Deposit Receipt (General Term Deposit)',
            'product_type': 'FDR',
            'headline_rate': 7.00,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'INDIVIDUAL_RETAIL',
            'features': ['1M: 1.50%', '3M: 6.15% (7.00% on 90D special)', '6M: 6.15% (7.00% on 180D special)', '365D (1Y): 7.00% (<1Cr), 7.25% (1-5Cr), 7.50% (5Cr+)'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'city-monthly-interest-fd',
            'product_name': 'City Bank Monthly Interest Paying Fixed Deposit',
            'product_type': 'FDR',
            'headline_rate': 7.40,
            'tenure_options': ['6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_INCOME_DEPOSITORS',
            'features': ['6M: 6.90% (<1Cr), 7.20% (1-5Cr), 7.40% (5Cr+)', '1Y: 6.80% (<1Cr), 7.10% (1-5Cr), 7.30% (5Cr+)'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'city-general-dps',
            'product_name': 'City Bank General Deposit Pension Scheme (DPS)',
            'product_type': 'DPS',
            'headline_rate': 8.50,
            'tenure_options': ['3_years', '5_years', '7_years', '10_years'],
            'best_tenure': '10_years',
            'minimum_amount': 500,
            'target_segment': 'RECURRING_SAVERS',
            'features': ['3Y to 10Y standard: 7.25%', '37 to 120 Months flexible tenor tier: 8.50%', 'Compounded interest return'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'city-insurance-dps',
            'product_name': 'City Bank Insurance Backed DPS Account',
            'product_type': 'DPS',
            'headline_rate': 8.00,
            'tenure_options': ['5_years', '10_years'],
            'best_tenure': '10_years',
            'minimum_amount': 1000,
            'target_segment': 'INSURED_SAVERS',
            'features': ['8.00% p.a. guaranteed return with complimentary life insurance coverage'],
            'instant_encashment': False,
            'shariah_compliant': False
        },
        {
            'product_id': 'city-gem-fdr',
            'product_name': 'City Gem Priority Banking Fixed Deposit',
            'product_type': 'FDR',
            'headline_rate': 7.50,
            'tenure_options': ['3_months', '6_months', '1_year'],
            'best_tenure': '1_year',
            'minimum_amount': 5000000,
            'target_segment': 'PRIORITY_HNI',
            'features': ['Preferential 7.50% yield for HNI relationship balances above 50 Lac'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'city-seniors-savings',
            'product_name': 'City Bank Seniors\' Savings Account',
            'product_type': 'SAVINGS',
            'headline_rate': 1.50,
            'tenure_options': ['on_demand'],
            'best_tenure': 'on_demand',
            'minimum_amount': 10000,
            'target_segment': 'SENIOR_CITIZENS',
            'features': ['1.50% p.a. daily balance calculation, free medical discount card'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    city['official_provenance'] = {
        'primary_bank_domain': 'https://www.citybankplc.com',
        'verified_soc_url': 'https://www.citybankplc.com/gsi/conventional-banking-products',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official City Bank Conventional Banking GSI Table (W.E.F. 18.10.2026)',
        'verification_tier': 'PRIMARY_BANK_PORTAL_DOM'
    }

# 9. BRAC BANK PLC (BRAC)
brac = find_bank('BRAC')
if brac:
    brac['source_url'] = 'https://bracbank.com/en/page/deposit-interest-rate'
    brac['soc_url'] = 'https://www.bracbank.com/en/page/schedule-of-charges'
    brac['effective_date'] = '2026-10-15'
    brac['verification_status'] = 'VERIFIED_OFFICIAL'
    brac['source_pdf_sha256'] = '98806be7a7def63b628707c310207ffefe70c7ac7842cfae5d4be15fa7114952'
    brac['verification_note'] = 'Verified against official ALCO Circular 2026/11 effective 15.10.2026.'
    brac['fdr_rates'] = {
        '1_month': 2.50,
        '3_months': 6.75,
        '6_months': 7.25,
        '1_year': 7.50,
        '2_years': 7.50,
        '3_years': 7.50
    }
    brac['products'] = [
        {
            'product_id': 'brac-retail-fixed-deposit',
            'product_name': 'BRAC Bank Retail Fixed Deposit',
            'product_type': 'FDR',
            'headline_rate': 7.50,
            'tenure_options': ['1_month', '3_months', '6_months', '1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 50000,
            'target_segment': 'RETAIL_PROBASHI',
            'features': ['30D: 2.50%-5.50%', '90/100D: 6.75%-7.25%', '180D: 7.25%-7.50%', '12M, 24M, 36M: 7.50% across all balance slabs', 'Astha app: from BDT 50,000'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'brac-monthly-interest-fd',
            'product_name': 'BRAC Bank Monthly Interest FD (FRABR)',
            'product_type': 'FDR',
            'headline_rate': 7.25,
            'tenure_options': ['6_months', '1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'MONTHLY_CASHFLOW_SEEKERS',
            'features': ['7.00% for 6 months; 7.25% for 12 to 84 months', 'Credited directly to savings account'],
            'instant_encashment': True,
            'shariah_compliant': False
        },
        {
            'product_id': 'brac-interest-first-fd',
            'product_name': 'BRAC Bank Interest First FD (FRIFF)',
            'product_type': 'FDR',
            'headline_rate': 6.75,
            'tenure_options': ['6_months', '1_year', '2_years', '3_years'],
            'best_tenure': '1_year',
            'minimum_amount': 100000,
            'target_segment': 'UPFRONT_YIELD_SEEKERS',
            'features': ['6.75% for 6 & 12 months; 6.25% for 24 months', 'Receive full interest upfront at account opening'],
            'instant_encashment': True,
            'shariah_compliant': False
        }
    ]
    brac['official_provenance'] = {
        'primary_bank_domain': 'https://www.bracbank.com',
        'verified_soc_url': 'https://www.bracbank.com/en/page/schedule-of-charges',
        'audit_status': 'ACCESSIBLE_DIRECT_LINK',
        'evidence_snippet': 'Official BRAC Bank ALCO Circular 2026/11 (Effective 15.10.2026)',
        'verification_tier': 'PRIMARY_BANK_CIRCULAR_PDF'
    }

# 10. EASTERN BANK PLC (EBL)
ebl = find_bank('EBL')
if ebl:
    ebl['source_url'] = 'https://www.ebl.com.bd/interest-rates'
    ebl['soc_url'] = 'https://www.ebl.com.bd/retail/retail-deposit'
    ebl['official_provenance']['primary_bank_domain'] = 'https://www.ebl.com.bd'
    ebl['official_provenance']['verified_soc_url'] = 'https://www.ebl.com.bd/retail/retail-deposit'

# 11. PRIME BANK PLC (PRIME)
prime = find_bank('PRIME')
if prime:
    prime['source_url'] = 'https://www.primebank.com.bd/rates-and-charges'
    prime['soc_url'] = 'https://www.primebank.com.bd/assets/schedule-charge/sub/files/1783100859_Individual-Account-Conventional.pdf'
    prime['official_provenance']['primary_bank_domain'] = 'https://www.primebank.com.bd'
    prime['official_provenance']['verified_soc_url'] = 'https://www.primebank.com.bd/assets/schedule-charge/sub/files/1783100859_Individual-Account-Conventional.pdf'

# 12. DUTCH-BANGLA BANK PLC (DBBL)
dbbl = find_bank('DBBL')
if dbbl:
    dbbl['source_url'] = 'https://www.dutchbanglabank.com'
    dbbl['soc_url'] = 'https://www.dutchbanglabank.com/schedule_charge/schedule-of-charges.pdf'
    dbbl['official_provenance']['primary_bank_domain'] = 'https://www.dutchbanglabank.com'
    dbbl['official_provenance']['verified_soc_url'] = 'https://www.dutchbanglabank.com/schedule_charge/schedule-of-charges.pdf'

# 13. PUBALI BANK PLC (PUBALI)
pubali = find_bank('PUBALI')
if pubali:
    pubali['source_url'] = 'https://www.pubalibangla.com/assets/Download/Rates/Deposit%20Interest%20Rate.pdf'
    pubali['soc_url'] = 'https://www.pubalibangla.com/assets/Download/Rates/Deposit%20Interest%20Rate.pdf'
    pubali['official_provenance']['primary_bank_domain'] = 'https://www.pubalibankbd.com'
    pubali['official_provenance']['verified_soc_url'] = 'https://www.pubalibangla.com/assets/Download/Rates/Deposit%20Interest%20Rate.pdf'

# 14. MIDLAND BANK (MDB)
mdb = find_bank('MDB')
if mdb:
    mdb['source_url'] = 'https://www.midlandbankbd.net/schedule-of-charges/'
    mdb['soc_url'] = 'https://www.midlandbankbd.net/schedule-of-charges/'
    mdb['official_provenance']['primary_bank_domain'] = 'https://www.midlandbankbd.net'
    mdb['official_provenance']['verified_soc_url'] = 'https://www.midlandbankbd.net/schedule-of-charges/'

# 15. BENGAL COMMERCIAL BANK (BENGAL)
bengal = find_bank('BENGAL')
if bengal:
    bengal['source_url'] = 'https://www.bengalbank.com/interest-rates'
    bengal['soc_url'] = 'https://www.bengalbank.com/interest-rates'
    bengal['official_provenance']['primary_bank_domain'] = 'https://www.bengalbank.com'
    bengal['official_provenance']['verified_soc_url'] = 'https://www.bengalbank.com/interest-rates'

# Save back to api_json_path
with open(api_json_path, 'w', encoding='utf-8') as f:
    json.dump(banks, f, indent=2, ensure_ascii=False)
print(f"Updated {api_json_path} with empirical bank records.")

# Sync to website_json_path
shutil.copyfile(api_json_path, website_json_path)
print(f"Synced changes to {website_json_path}.")
