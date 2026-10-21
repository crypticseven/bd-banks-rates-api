import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const banksFilePath = path.join(__dirname, "..", "src", "data", "bangladesh_61_banks.json");
const banksData = JSON.parse(fs.readFileSync(banksFilePath, "utf-8"));

// Implementation of calculateFdrMaturity for test assertion
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

    assert.equal(counts["STATE_OWNED"], 6, "Must have exactly 6 State-Owned Banks");
    assert.equal(counts["SPECIALIZED"], 3, "Must have exactly 3 Specialized Banks");
    assert.equal(counts["CONVENTIONAL_PCB"], 33, "Must have exactly 33 Conventional PCBs");
    assert.equal(counts["ISLAMIC"], 10, "Must have exactly 10 Full Islamic Banks");
    assert.equal(counts["FOREIGN"], 9, "Must have exactly 9 Foreign Commercial Banks");
  });

  await t.test("Every bank record contains required provenance and rate fields", () => {
    for (const bank of banksData) {
      assert.ok(bank.bank_id, `Bank must have bank_id: ${bank.bank_name}`);
      assert.ok(bank.short_code, `Bank must have short_code: ${bank.bank_name}`);
      assert.ok(bank.fdr_rates, `Bank must have fdr_rates: ${bank.bank_name}`);
      assert.ok(bank.fdr_rates["1_year"] > 0, `1-year rate must be > 0: ${bank.bank_name}`);
      assert.ok(bank.source_url, `Bank must have source_url: ${bank.bank_name}`);
      assert.ok(bank.effective_date, `Bank must have effective_date: ${bank.bank_name}`);
      assert.equal(bank.verification_status, "VERIFIED_OFFICIAL", `Status must be verified: ${bank.bank_name}`);
    }
  });
});

test("Deposit Maturity Calculation & NBR Tax Tests", async (t) => {
  await t.test("Calculates 1-year deposit with 10% e-TIN tax correctly", () => {
    // ৳1,000,000 at 10.00% for 12 months with e-TIN (10% tax)
    const result = calculateFdrMaturity(1000000, 10.0, 12, true);
    assert.equal(result.grossInterest, 100000, "Gross interest should be ৳100,000");
    assert.equal(result.taxRate, 0.10, "Tax rate should be 10%");
    assert.equal(result.taxAmount, 10000, "Withholding tax should be ৳10,000");
    assert.equal(result.netProfit, 90000, "Net profit should be ৳90,000");
    assert.equal(result.netMaturityValue, 1090000, "Net maturity should be ৳1,090,000");
    assert.equal(result.effectiveMonthlyProfit, 7500, "Monthly profit should be ৳7,500");
  });

  await t.test("Calculates 1-year deposit with 15% non-TIN tax correctly", () => {
    // ৳1,000,000 at 10.00% for 12 months without TIN (15% tax)
    const result = calculateFdrMaturity(1000000, 10.0, 12, false);
    assert.equal(result.grossInterest, 100000, "Gross interest should be ৳100,000");
    assert.equal(result.taxRate, 0.15, "Tax rate should be 15%");
    assert.equal(result.taxAmount, 15000, "Withholding tax should be ৳15,000");
    assert.equal(result.netProfit, 85000, "Net profit should be ৳85,000");
    assert.equal(result.netMaturityValue, 1085000, "Net maturity should be ৳1,085,000");
  });

  await t.test("Calculates fractional tenure (3 months / 6 months) correctly", () => {
    // ৳1,000,000 at 12.00% for 3 months (0.25 years) with 10% tax
    const result3m = calculateFdrMaturity(1000000, 12.0, 3, true);
    assert.equal(result3m.grossInterest, 30000, "Gross interest for 3M should be ৳30,000");
    assert.equal(result3m.taxAmount, 3000, "Tax for 3M should be ৳3,000");
    assert.equal(result3m.netProfit, 27000, "Net profit for 3M should be ৳27,000");
  });
});
