# 🏦 Bangladesh 61 Banks Deposit Rate & SOC Aggregator API

> High-performance public REST API & automated PyMuPDF crawler aggregating Fixed Deposit (FDR) yields, DPS rates, and Schedule of Charges (SOC) across all 61 Scheduled Commercial Banks in Bangladesh.

[![API Status](https://img.shields.io/badge/Status-Operational-emerald?style=flat-square)](https://github.com/crypticseven/bd-banks-rates-api)
[![Banks Tracked](https://img.shields.io/badge/Banks%20Tracked-61%20Scheduled%20Banks-blue?style=flat-square)](https://github.com/crypticseven/bd-banks-rates-api)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.2-black?style=flat-square&logo=next.js)](https://nextjs.org)

---

## 📌 Overview

In Bangladesh, deposit interest rates and Schedule of Charges (SOC) are published inconsistently across 61 individual bank websites, often buried in scanned monthly circular PDFs. 

This repository provides:
1. **Public REST API**: Ultra-fast, edge-cached JSON endpoints with zero authentication required.
2. **Net Yield Calculator**: Automatic statutory NBR withholding tax deduction (10% with e-TIN, 15% without).
3. **PyMuPDF Crawler Daemon**: Automated Python script extracting rate tables and circular notices.
4. **Interactive Explorer**: Responsive web UI to compare and simulate deposit returns.

---

## 🏛 Coverage: All 61 Scheduled Commercial Banks

| Category | Count | Institutions Tracked |
| :--- | :---: | :--- |
| **State-Owned Commercial Banks (SOCB)** | **6** | Sonali, Janata, Agrani, Rupali, BASIC, BDBL |
| **Specialized Development Banks** | **3** | Bangladesh Krishi Bank (BKB), RAKUB, Probashi Kallyan Bank |
| **Conventional Private Commercial Banks (PCB)** | **33** | UCB, City Bank, BRAC, Eastern Bank, Pubali, DBBL, MTB, Prime, Southeast, Premier, Mercantile, Jamuna, ONE Bank, Dhaka Bank, NCC, Trust, Midland, Meghna, Modhumoti, NRB, NRBC, SBAC, Shimanto, Community, Bengal, Citizens, AB, IFIC, Uttara, National, Padma/Exim, BCBL, Standard |
| **Full Islamic Shariah Banks** | **10** | Islami Bank Bangladesh, Al-Arafah, Social Islami, First Security, Shahjalal, EXIM, ICB Islamic, Union, Global Islami, Standard |
| **Foreign Commercial Banks (FCB)** | **9** | Standard Chartered, HSBC, Citibank N.A., Commercial Bank of Ceylon, State Bank of India, Habib Bank, National Bank of Pakistan, Bank Alfalah, Woori Bank |
| **Total** | **61** | **100% of Scheduled Banks in Bangladesh** |

---

## 🚀 API Endpoints

### 1. `GET /api/v1/rates/deposits`
Query the repository's static deposit-rate snapshot with net-return estimates. Records are explicitly marked unverified until matched to dated official bank rate sheets.

**Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `principal` | `number` | — | Simulated principal in BDT (e.g. `500000`) |
| `tenure` | `string` | `1_year` | `3_months`, `6_months`, `1_year`, `3_years`, `5_years` |
| `category` | `string` | `ALL` | `STATE_OWNED`, `SPECIALIZED`, `CONVENTIONAL_PCB`, `ISLAMIC`, `FOREIGN` |
| `shariah` | `boolean` | — | Filter only Islamic profit-sharing deposits (`true`/`false`) |
| `has_tin` | `boolean` | `true` | Apply 10% tax if true, 15% if false |
| `q` | `string` | — | Search query for bank name or short code |

**Example Request:**
```bash
curl -X GET "https://api.fardinanik.me/api/v1/rates/deposits?principal=1000000&tenure=1_year&has_tin=true"
```

**Example Response:**
```json
{
  "status": "success",
  "as_of_date": "2026-10-21",
  "total_banks_tracked": 61,
  "total_matched": 61,
  "top_yield_bank": {
    "bank_name": "National Bank Limited",
    "short_code": "NBL",
    "rate": 11.50,
    "tenure": "1_year"
  },
  "data": [
    {
      "bank_name": "National Bank Limited",
      "short_code": "NBL",
      "category": "CONVENTIONAL_PCB",
      "current_rate": 0,
      "data_status": "unverified_static_snapshot",
      "maturity_calculation": {
        "principal": 1000000,
        "grossInterest": 115000,
        "taxRate": 0.10,
        "taxAmount": 11500,
        "netProfit": 103500,
        "netMaturityValue": 1103500,
        "effectiveMonthlyProfit": 8625
      },
      "soc_url": "https://www.nblbd.com/interest_rate"
    }
  ]
}
```

### 2. `GET /api/v1/rates/banks`
List all 61 banks with categories, headquarters, and official Schedule of Charges links.

### 3. `GET /api/v1/rates/banks/{code}`
Retrieve rates and profile for a specific bank (e.g. `/api/v1/rates/banks/UCB` or `/api/v1/rates/banks/BRAC`).

### 4. `GET /api/v1/rates/benchmarks`
Current Bangladesh Bank monetary policy rates:
- Policy Repo Rate: `8.50%`
- Standing Lending Facility (SLF): `10.00%`
- Standing Deposit Facility (SDF): `7.00%`
- NBR Withholding Tax: `10%` (TIN) / `15%` (Non-TIN)

---

## 🛠 Local Development

```bash
# Clone the repository
git clone https://github.com/crypticseven/bd-banks-rates-api.git
cd bd-banks-rates-api

# Install Node.js dependencies
npm install

# Run Next.js server locally
npm run dev

# Run Python PyMuPDF SOC Crawler Audit
pip install -r requirements.txt
python scripts/soc_crawler.py --audit
```

---

## 📄 License
MIT License. Maintained by [Fardin Ahsan Anik](https://fardinanik.me). Data sourced from official bank circulars and Bangladesh Bank public benchmarks.
