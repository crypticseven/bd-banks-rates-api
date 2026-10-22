# Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
## Official Commercial Integration, Security & Licensing Manual

**Proprietary Intellectual Property & Trademark**  
**Sole Proprietor & Chief Architect:** Fardin Ahsan Anik  
**Direct Commercial Licensing Contact:** `fardinahsananik@gmail.com`  
**License:** Proprietary Commercial Closed Source (All Rights Reserved © 2024–2026)  
**Legal Agreement Reference:** [`LICENSE`](../LICENSE)

---

## 1. Executive Overview & Commercial Transition

The **Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)** provides real-time, authoritative deposit rates, Schedule of Charges (SOC), and regulatory risk audits across all **61 Scheduled Commercial Banks** licensed under Bangladesh Bank (Bank Company Act 1991).

### The Closed Commercial Architecture
As of October 2026, **open public access has been deprecated and permanently retired**. All production, corporate, and partner requests require cryptographic **Credential Handshaking**. Any request without certified credentials is systematically intercepted with `HTTP 401 Unauthorized` and an audited telemetry response.

---

## 2. Authentication & Credential Handshaking Protocol

Every client request must provide an authorized API key through either of the following standard handshake mechanisms:

### Handshake Methods
1. **Primary Header (Recommended):**
   ```http
   X-API-Key: <your_commercial_key>
   ```
2. **Bearer Authorization Header:**
   ```http
   Authorization: Bearer <your_commercial_key>
   ```
3. **URL Query Parameter (Browser & Sandbox Only):**
   ```http
   GET /api/v1/rates/deposits?api_key=<your_commercial_key>
   ```

### Client Tiers & SLA Quota Matrix

| Tier Name | Key Pattern / Token Prefix | Rate Limit | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **MASTER_ADMIN** | `RATES_SYNC_SECRET` / `bdrip_master_*` | 10,000 req/min | Platform operations, automated sync, emergency bypass |
| **ENTERPRISE_COMMERCIAL**| `bdrip_live_enterprise_*` | 5,000 req/min | Core banking engines, treasury desks, multi-branch ERP |
| **CORPORATE** | `bdrip_live_corp_*` | 1,000 req/min | Commercial loan platforms, accounting software |
| **FINTECH_PARTNER** | `bdrip_live_partner_*` | 500 req/min | Personal finance apps, deposit aggregators, neobanks |
| **DEMO_EVALUATION** | `bdrip_demo_eval_2026` | 60 req/min | Interactive sandbox, developer onboarding & UAT |

---

## 3. Anti-Hacking Guard & Cybersecurity Shield

The platform implements an institutional-grade security perimeter:

1. **Sliding-Window Token Bucket Rate Limiting:**
   - In-memory rate limiting engine (`enforceRateLimit`) calculates per-second token replenishment per client ID.
   - Automatically returns `HTTP 429 Too Many Requests` with `Retry-After` headers when quotas are exceeded.
   - Automated garbage collection every 5 minutes prevents memory exhaustion attacks.

2. **Malicious Injection & Exploit Interception (`detectMaliciousPayload`):**
   - **Path Traversal Protection:** Blocks `../`, `..\`, and `%2e%2e` attempts.
   - **SQL Injection (SQLi) Protection:** Blocks `union select`, `exec(`, `drop table`, and trailing `--` injection syntax.
   - **Cross-Site Scripting (XSS):** Blocks `<script>` tags and `javascript:` pseudo-protocols.
   - Malicious requests are instantly dropped with `HTTP 400 Bad Request` and labeled `SECURITY_INTERCEPTION`.

3. **Timing-Attack Resilience (Double SHA-256 Constant-Time Verification):**
   - Credential validation uses Node.js `crypto.timingSafeEqual` over cryptographic hashes.
   - Eliminates side-channel timing attacks that exploit string comparison latency deltas.

4. **Strict Runtime Schema Gating (Zod):**
   - Every query parameter is validated against strict TypeScript Zod schemas before hitting business logic.
   - Unrecognized enumerations or type coercion attacks are rejected before processing.

5. **Institutional Security Response Headers:**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-Commercial-License: Proprietary - Fardin Ahsan Anik (fardinahsananik@gmail.com)`
   - `X-Trademark: BDRIP-API™ / Anik FinTech Engine™`
   - `X-Client-Tier: <TIER>`
   - `X-Request-ID: <UUID>`

---

## 4. Complete Endpoints Reference

### Base URLs
- **Production API Gateway:** `https://api.fardinanik.com`
- **Local Development / Docker:** `http://localhost:3009`

---

### Endpoint 1: Central Bank Monetary Policy & Tax Benchmarks
**Route:** `GET /api/v1/rates/benchmarks`  
**Description:** Retrieves authoritative Bangladesh Bank (BB) policy corridor rates, reserve requirements, and National Board of Revenue (NBR) withholding tax schedules.

#### Sample Request:
```bash
curl -X GET "https://api.fardinanik.com/api/v1/rates/benchmarks" \
  -H "X-API-Key: bdrip_demo_eval_2026"
```

#### Sample Response (`200 OK`):
```json
{
  "status": "success",
  "data_status": "verified_authoritative",
  "trademark": "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)",
  "licensing": "Proprietary Commercial License - Fardin Ahsan Anik <fardinahsananik@gmail.com>",
  "regulatory_authority": "Bangladesh Bank (Central Bank of Bangladesh) & National Board of Revenue (NBR)",
  "as_of_date": "2026-10-22",
  "monetary_policy_benchmarks": {
    "policy_repo_rate": 10.00,
    "policy_repo_rate_label": "10.00%",
    "standing_lending_facility_slf": 11.50,
    "standing_deposit_facility_sdf": 8.50,
    "interbank_call_money_rate_avg": 9.85,
    "statutory_basis": "Bangladesh Bank MPD Circular No. 03/2024 & MPS Framework"
  },
  "statutory_reserve_requirements": {
    "cash_reserve_ratio_crr": "4.00%",
    "statutory_liquidity_ratio_slr_conventional": "13.00%",
    "statutory_liquidity_ratio_slr_islamic": "5.50%"
  },
  "withholding_tax_regime": {
    "statutory_body": "National Board of Revenue (NBR)",
    "statutory_basis": "Income Tax Act 2023, Section 102",
    "individual_with_tin_psr": "10.00%",
    "individual_without_tin_psr": "15.00%",
    "company_deposits": "20.00%"
  }
}
```

---

### Endpoint 2: Fixed Deposit Rates & Net Returns Engine
**Route:** `GET /api/v1/rates/deposits`  
**Parameters:**
- `principal` (number, optional, max 100,000,000,000)
- `tenure` (`3_months` | `6_months` | `1_year` | `3_years` | `5_years`, default `1_year`)
- `category` (`ALL` | `STATE_OWNED` | `SPECIALIZED` | `CONVENTIONAL_PCB` | `ISLAMIC` | `FOREIGN`)
- `has_tin` (`true` | `false`, default `true`)
- `sort_by` (`yield` | `risk_adjusted` | `rating`, default `yield`)
- `shariah` (`true` | `false`, optional)
- `q` (string, search by bank name or code)

#### Sample Request:
```bash
curl -X GET "https://api.fardinanik.com/api/v1/rates/deposits?tenure=1_year&principal=1000000&has_tin=true&sort_by=risk_adjusted" \
  -H "X-API-Key: bdrip_demo_eval_2026"
```

---

### Endpoint 3: Scheduled Banks Institutional Directory
**Route:** `GET /api/v1/rates/banks` & `GET /api/v1/rates/banks/[code]`  
**Description:** Full institutional profiles for all 61 banks, including verified SOC URLs, Islamic windows, headquarters, and credit ratings.

#### Sample Request:
```bash
curl -X GET "https://api.fardinanik.com/api/v1/rates/banks/UCB" \
  -H "X-API-Key: bdrip_demo_eval_2026"
```

---

### Endpoint 4: Branded Deposit Products Catalog
**Route:** `GET /api/v1/rates/products`  
**Parameters:**
- `type` (`FDR` | `DPS` | `SPECIAL_SCHEME`)
- `segment` (`GENERAL_RETAIL` | `WOMEN` | `SENIOR_CITIZEN` | `NRB_EXPATRIATE` | `ISLAMIC_SHARIAH` | `HNI_PREMIUM` | `LONG_TERM`)
- `min_rate` (number)

---

### Endpoint 5: CAMELS Stability & Ratings Intelligence
**Route:** `GET /api/v1/rates/ratings`  
**Parameters:**
- `tier` (`TIER_1_PRIME` | `TIER_2_STRONG` | `TIER_3_MODERATE` | `TIER_4_WATCHLIST` | `TIER_5_DISTRESSED`)
- `min_score` (1 to 5)
- `sovereign_only` (`true` | `false`)

---

## 5. Integration Code Samples

### TypeScript / Node.js
```typescript
import axios from "axios";

const API_KEY = process.env.BDRIP_COMMERCIAL_API_KEY || "bdrip_demo_eval_2026";
const BASE_URL = "https://api.fardinanik.com";

async function fetchRates() {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/rates/deposits`, {
      params: {
        principal: 500000,
        tenure: "1_year",
        has_tin: "true",
        sort_by: "risk_adjusted",
      },
      headers: {
        "X-API-Key": API_KEY,
        Accept: "application/json",
      },
    });

    console.log("Status:", response.data.status);
    console.log("Total Banks Tracked:", response.data.total_banks_tracked);
    console.log("Top Safe Bank:", response.data.data[0].bank_name);
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error("Commercial handshake rejected. Valid license key required.");
    } else {
      console.error("API error:", error.message);
    }
  }
}

fetchRates();
```

### Python (3.9+)
```python
import os
import requests

API_KEY = os.getenv("BDRIP_COMMERCIAL_API_KEY", "bdrip_demo_eval_2026")
BASE_URL = "https://api.fardinanik.com"

headers = {
    "X-API-Key": API_KEY,
    "Accept": "application/json"
}

params = {
    "principal": 1000000,
    "tenure": "1_year",
    "has_tin": "true",
    "sort_by": "yield"
}

response = requests.get(f"{BASE_URL}/api/v1/rates/deposits", headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    print(f"Verified rates received for {data['total_matched']} banks.")
elif response.status_code == 401:
    print("Authentication failed: Commercial key missing or unauthorized.")
elif response.status_code == 429:
    print(f"Rate limit exceeded. Retry after {response.headers.get('Retry-After')} seconds.")
else:
    print(f"Error {response.status_code}: {response.text}")
```

---

## 6. Error & Status Code Dictionary

| HTTP Status | Error Code | Description | Corrective Action |
| :--- | :--- | :--- | :--- |
| `401 Unauthorized` | `COMMERCIAL_HANDSHAKE_REQUIRED` | Missing or invalid commercial API key | Provide valid `X-API-Key` or contact `fardinahsananik@gmail.com` |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Request frequency exceeds tier quota | Implement exponential backoff or upgrade client tier |
| `400 Bad Request` | `SECURITY_INTERCEPTION` | Suspicious SQLi/XSS/path traversal pattern detected | Sanitize input query parameters |
| `400 Bad Request` | `bad_request` | Schema validation failure (Zod) | Review parameter values against OpenAPI spec |
| `404 Not Found` | `not_found` | Bank code not recognized | Verify bank code (e.g. `UCB`, `EBL`, `PUBALI`) |
| `500 Internal Error`| `error` | Unexpected runtime exception | Telemetry logged; contact support |

---

## 7. Commercial Licensing Inquiries

For enterprise SLA agreements, high-volume dedicated endpoints, custom CBS integrations, or corporate subscriptions:

- **Proprietor & Engine Architect:** Fardin Ahsan Anik
- **Email:** `fardinahsananik@gmail.com`
- **Licensing Portal:** `https://fardinanik.com`
- **GitHub:** `https://github.com/crypticseven/bd-banks-rates-api`
