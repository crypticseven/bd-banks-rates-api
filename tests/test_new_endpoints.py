import urllib.request
import json

def test():
    print("=== 1. TEST UCB BRANDED PRODUCTS API ===")
    resp = urllib.request.urlopen("http://localhost:3009/api/v1/rates/products?bank=UCB")
    data = json.load(resp)
    print(f"Total UCB products: {data['total_products']}")
    for p in data["data"]:
        print(f"  - [{p['product_type']}] {p['product_name']} -> {p['headline_rate']}% (Min: BDT {p['minimum_amount']:,})")

    print("\n=== 2. TEST RATINGS & MARKET INTELLIGENCE API ===")
    resp2 = urllib.request.urlopen("http://localhost:3009/api/v1/rates/ratings")
    data2 = json.load(resp2)
    sweetspot = data2["market_intelligence"]["safest_highest_yield_sweetspot"]
    print(f"Sweetspot: {sweetspot['bank_name']} ({sweetspot['short_code']}) -> {sweetspot['rate_1_year']}% (Rating: {sweetspot['rating_score']}/5.0 {sweetspot['credit_rating']})")
    print(f"Verdict: {sweetspot['verdict']}")

    alert = data2["market_intelligence"]["nominal_highest_yield_alert"]
    print(f"Watchlist Alert: {alert['bank_name']} ({alert['short_code']}) -> {alert['rate_1_year']}% (Rating: {alert['rating_score']}/5.0)")
    print(f"Warning: {alert['warning']}")

    print("\n=== 3. TEST RISK-ADJUSTED DEPOSITS SORTING ===")
    resp3 = urllib.request.urlopen("http://localhost:3009/api/v1/rates/deposits?sort_by=risk_adjusted")
    data3 = json.load(resp3)
    print("Top 3 Risk-Adjusted Banks:")
    for i, b in enumerate(data3["data"][:3]):
        print(f"  {i+1}. {b['bank_name']} ({b['short_code']}) -> Rate: {b['fdr_rates']['1_year']}%, Rating: {b['rating_score']}/5.0 ({b['credit_rating']}), Score: {b['risk_adjusted_yield_score']}")

if __name__ == "__main__":
    test()
