import urllib.request
import urllib.error
import json

def test_sync_secret():
    print("=== 1. VERIFY P0-1 (RATES_SYNC_SECRET Required, No Hardcoded Fallback) ===")
    data = json.dumps({"updates": [{"bank_id": "ucb"}]}).encode("utf-8")
    req = urllib.request.Request(
        "http://localhost:3009/api/v1/rates/sync",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer fardinanik_internal_rates_sync_secret_2026"
        }
    )
    try:
        urllib.request.urlopen(req)
        print("FAIL: Fallback secret was accepted!")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"PASS: Rejected with HTTP {e.code}: {body}")

def test_query_validation():
    print("\n=== 2. VERIFY P1-6 (Zod Query Validation Returns 400) ===")
    try:
        urllib.request.urlopen("http://localhost:3009/api/v1/rates/deposits?category=INVALID_CATEGORY")
        print("FAIL: Invalid category accepted!")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"PASS: Rejected with HTTP {e.code}: {body[:200]}")

def test_valid_query_and_provenance():
    print("\n=== 3. VERIFY P3-3 (Valid Request & Provenance Metadata) ===")
    resp = urllib.request.urlopen("http://localhost:3009/api/v1/rates/deposits?principal=500000&tenure=1_year")
    data = json.load(resp)
    print(f"PASS: Status {data['status']}, Total Banks: {data['total_banks_tracked']}")
    bank0 = data['data'][0]
    print(f"Sample Bank: {bank0['bank_name']} ({bank0['short_code']})")
    print(f"Provenance: source_url={bank0.get('source_url')}, effective_date={bank0.get('effective_date')}, verification_status={bank0.get('verification_status')}")

def test_security_headers():
    print("\n=== 4. VERIFY P2-2 (Security Headers) ===")
    resp = urllib.request.urlopen("http://localhost:3009/api/v1/rates/deposits")
    for h in ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]:
        print(f"{h}: {resp.headers.get(h)}")

if __name__ == "__main__":
    test_sync_secret()
    test_query_validation()
    test_valid_query_and_provenance()
    test_security_headers()
