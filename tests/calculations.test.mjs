import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const banksFilePath = path.join(__dirname, "..", "src", "data", "bangladesh_61_banks.json");
const banksData = JSON.parse(fs.readFileSync(banksFilePath, "utf-8"));

function calculateFdrMaturity(principal, annualRate, tenureMonths, hasTin = true) {
  const years = tenureMonths / 12;
  const grossInterest = Math.round(principal * (annualRate / 100) * years);
  const taxRate = hasTin ? 0.10 : 0.15;
  const taxAmount = Math.round(grossInterest * taxRate);
  const netProfit = grossInterest - taxAmount;
  const netMaturityValue = principal + netProfit;
  const effectiveMonthlyProfit = Math.round(netProfit / tenureMonths);

  return {
    principal,
    grossInterest,
    taxRate,
    taxAmount,
    netProfit,
    netMaturityValue,
    effectiveMonthlyProfit,
  };
}

test("Bangladesh 61 Banks Dataset Invariants", async (t) => {
  await t.test("Dataset contains exactly 61 scheduled commercial banks", () => {
    assert.equal(banksData.length, 61, "Total banks count must equal 61");
  });

  await t.test("Regulatory category breakdown matches Bangladesh Bank charter", () => {
    const counts = banksData.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    }, {});

    assert.equal(counts["STATE_OWNED"], 6);
    assert.equal(counts["SPECIALIZED"], 3);
    assert.equal(counts["CONVENTIONAL_PCB"], 33);
    assert.equal(counts["ISLAMIC"], 10);
    assert.equal(counts["FOREIGN"], 9);
  });

  await t.test("Every bank record contains stability rating and branded products", () => {
    for (const bank of banksData) {
      assert.ok(bank.rating_score >= 1.0 && bank.rating_score <= 5.0, `Rating out of bounds: ${bank.bank_name}`);
      assert.ok(bank.credit_rating, `Missing credit rating: ${bank.bank_name}`);
      assert.ok(bank.stability_tier, `Missing stability tier: ${bank.bank_name}`);
      assert.ok(bank.products && bank.products.length > 0, `Missing branded products: ${bank.bank_name}`);
      assert.ok(bank.risk_adjusted_yield_score > 0, `Missing risk-adjusted score: ${bank.bank_name}`);
    }
  });

  await t.test("UCB has verified 11.25% - 11.75% products and audited 16.27% NPL turnaround rating", () => {
    const ucb = banksData.find((b) => b.short_code === "UCB");
    assert.ok(ucb, "UCB must exist in dataset");
    assert.equal(ucb.npl_ratio_pct, 16.27, "UCB NPL ratio must be 16.27%");
    assert.equal(ucb.rating_score, 3.5, "UCB audited turnaround score must be 3.5/5.0");
    assert.equal(ucb.credit_rating, "A", "UCB credit rating must be A");
    assert.equal(ucb.stability_tier, "TIER_3_MODERATE");

    // Check UCB products
    const earnFirstFdr = ucb.products.find((p) => p.product_id === "ucb-earn-first-fdr");
    assert.ok(earnFirstFdr, "UCB Earn First FDR must exist");
    assert.equal(earnFirstFdr.headline_rate, 11.25, "UCB Earn First FDR rate must be 11.25%");

    const aymaWomen = ucb.products.find((p) => p.product_id === "ucb-ayma-women-fdr");
    assert.ok(aymaWomen, "UCB AYMA Women FDR must exist");
    assert.equal(aymaWomen.headline_rate, 11.50, "UCB AYMA Women FDR rate must be 11.50%");

    const superflexDps = ucb.products.find((p) => p.product_id === "ucb-superflex-dps");
    assert.ok(superflexDps, "UCB Superflex DPS must exist");
    assert.equal(superflexDps.headline_rate, 11.25, "UCB Superflex DPS rate must be 11.25%");

    const probashi = ucb.products.find((p) => p.product_id === "ucb-probashi-nrb");
    assert.ok(probashi, "UCB Probashi scheme must exist");
    assert.equal(probashi.headline_rate, 11.75, "UCB Probashi scheme rate must be 11.75%");
  });
});

test("Deposit Maturity Calculation & NBR Tax Tests", async (t) => {
  await t.test("Calculates 1-year deposit with 10% e-TIN tax correctly", () => {
    const result = calculateFdrMaturity(1000000, 10.0, 12, true);
    assert.equal(result.grossInterest, 100000);
    assert.equal(result.taxRate, 0.10);
    assert.equal(result.taxAmount, 10000);
    assert.equal(result.netProfit, 90000);
    assert.equal(result.netMaturityValue, 1090000);
  });

  await t.test("Calculates 1-year deposit with 15% non-TIN tax correctly", () => {
    const result = calculateFdrMaturity(1000000, 10.0, 12, false);
    assert.equal(result.grossInterest, 100000);
    assert.equal(result.taxRate, 0.15);
    assert.equal(result.taxAmount, 15000);
    assert.equal(result.netProfit, 85000);
    assert.equal(result.netMaturityValue, 1085000);
  });
});
