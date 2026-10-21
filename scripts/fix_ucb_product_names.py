import json
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

dataset_path = os.path.abspath("src/data/bangladesh_61_banks.json")

with open(dataset_path, "r", encoding="utf-8") as f:
    banks = json.load(f)

for b in banks:
    if b["short_code"] == "UCB":
        b["products"] = [
            {
                "product_id": "ucb-retail-fd",
                "product_name": "UCB Retail Fixed Deposit (General Term Deposit)",
                "product_type": "FDR",
                "headline_rate": 11.25,
                "tenure_options": ["3_months", "6_months", "1_year", "3_years", "5_years"],
                "best_tenure": "1_year",
                "minimum_amount": 50000,
                "target_segment": "GENERAL_RETAIL",
                "features": [
                    "Official UCB retail term deposit (BDT 50,000 minimum)",
                    "Peak 1-year rate of 11.25% p.a.",
                    "Loan facility up to 90% of deposit value",
                    "Instant encashment available through UCB ONE app"
                ],
                "instant_encashment": True,
                "shariah_compliant": False
            },
            {
                "product_id": "ucb-earning-plus-fd",
                "product_name": "UCB Earning Plus FD (Periodic Profit FDR)",
                "product_type": "FDR",
                "headline_rate": 11.00,
                "tenure_options": ["6_months", "1_year", "3_years"],
                "best_tenure": "1_year",
                "minimum_amount": 100000,
                "target_segment": "SENIOR_CITIZEN",
                "features": [
                    "Monthly or quarterly profit payout to linked account",
                    "Designed for retired individuals and regular income seekers",
                    "Automatic reinvestment of principal upon maturity"
                ],
                "instant_encashment": True,
                "shariah_compliant": False
            },
            {
                "product_id": "ucb-superflex-dps",
                "product_name": "UCB Super Flex DPS",
                "product_type": "DPS",
                "headline_rate": 11.25,
                "tenure_options": ["3_years", "5_years", "10_years"],
                "best_tenure": "5_years",
                "minimum_amount": 1000,
                "target_segment": "RETAIL_SAVINGS",
                "features": [
                    "Official UCB Super Flex monthly savings scheme",
                    "Installments from BDT 1,000 to BDT 50,000/month",
                    "Compounding monthly yield reaching 11.25% p.a."
                ],
                "instant_encashment": False,
                "shariah_compliant": False
            },
            {
                "product_id": "ucb-womens-dps-plus",
                "product_name": "UCB Women's DPS Plus",
                "product_type": "DPS",
                "headline_rate": 11.50,
                "tenure_options": ["3_years", "5_years"],
                "best_tenure": "5_years",
                "minimum_amount": 1000,
                "target_segment": "WOMEN",
                "features": [
                    "Dedicated female financial inclusion scheme on ucb.com.bd",
                    "Preferential bonus yield of 11.50% p.a.",
                    "Complimentary health insurance & lifestyle discount benefits"
                ],
                "instant_encashment": False,
                "shariah_compliant": False
            },
            {
                "product_id": "ucb-nrb-dps-plus",
                "product_name": "UCB NRB DPS Plus (Expatriate Savings Scheme)",
                "product_type": "SPECIAL_SCHEME",
                "headline_rate": 11.75,
                "tenure_options": ["1_year", "3_years", "5_years"],
                "best_tenure": "1_year",
                "minimum_amount": 5000,
                "target_segment": "NRB_EXPATRIATE",
                "features": [
                    "Tailored for Non-Resident Bangladeshis remitting foreign exchange",
                    "Highest rate at 11.75% p.a. + 2.5% central bank remittance cash incentive",
                    "Dual-currency repatriable facility"
                ],
                "instant_encashment": True,
                "shariah_compliant": False
            },
            {
                "product_id": "ucb-taqwa-mudaraba-term",
                "product_name": "UCB Taqwa Mudaraba Term Deposit",
                "product_type": "FDR",
                "headline_rate": 10.75,
                "tenure_options": ["3_months", "6_months", "1_year", "3_years"],
                "best_tenure": "1_year",
                "minimum_amount": 50000,
                "target_segment": "ISLAMIC_SHARIAH",
                "features": [
                    "Official UCB Taqwa Islamic Banking Window product",
                    "100% Shariah-compliant profit-sharing ratio",
                    "Audited by UCB Shariah Board"
                ],
                "instant_encashment": True,
                "shariah_compliant": True
            }
        ]

with open(dataset_path, "w", encoding="utf-8") as f:
    json.dump(banks, f, indent=2)

print("[✓] Successfully updated UCB products to verbatim official ucb.com.bd names.")
