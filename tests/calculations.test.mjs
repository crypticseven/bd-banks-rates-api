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
      if (bank.short_code === "HSBC") {
        assert.equal(bank.products.length, 0, "HSBC retail banking is wound down, must have 0 retail products");
      } else {
        assert.ok(bank.products && bank.products.length > 0, `Missing branded products: ${bank.bank_name}`);
      }
      assert.ok(bank.risk_adjusted_yield_score >= 0, `Missing risk-adjusted score: ${bank.bank_name}`);
    }
  });

  await t.test("HSBC Bangladesh correctly verified with zero retail deposit products due to CIB wholesale focus", () => {
    const hsbc = banksData.find((b) => b.short_code === "HSBC");
    assert.ok(hsbc, "HSBC must exist in 61-bank scheduled roster");
    assert.equal(hsbc.products.length, 0, "HSBC must have exactly 0 retail products");
    assert.equal(hsbc.schemes_count, 0, "HSBC must have 0 retail schemes");
    assert.equal(hsbc.fdr_rates["1_year"], 0.0, "HSBC retail FDR rate must be 0");
    assert.match(hsbc.verification_note, /Retail Banking/i);
  });

  await t.test("UCB has verified circular 1634 rates (8.00% - 9.25%) and audited 16.27% NPL turnaround rating", () => {
    const ucb = banksData.find((b) => b.short_code === "UCB");
    assert.ok(ucb, "UCB must exist in dataset");
    assert.equal(ucb.npl_ratio_pct, 16.27, "UCB NPL ratio must be 16.27%");
    assert.equal(ucb.rating_score, 3.5, "UCB audited turnaround score must be 3.5/5.0");
    assert.equal(ucb.credit_rating, "A", "UCB credit rating must be A");
    assert.equal(ucb.stability_tier, "TIER_3_MODERATE");
    assert.equal(ucb.verification_status, "VERIFIED_OFFICIAL");
    assert.equal(ucb.source_pdf_sha256, "72e706f0c768296219e4ef0cff1b0d4d4f3131388fba457895689ad91e0d1ae9");

    // Check UCB products from verified Circular 1634
    const earningPlus = ucb.products.find((p) => p.product_id === "ucb-earning-plus-fd");
    assert.ok(earningPlus, "Retail UCB Earning Plus must exist");
    assert.equal(earningPlus.headline_rate, 9.25, "UCB Earning Plus top rate must be 9.25% p.a. (Circular 1634 Page 10)");

    const retailFdr = ucb.products.find((p) => p.product_id === "ucb-retail-fd");
    assert.ok(retailFdr, "UCB Retail Fixed Deposit must exist");
    assert.equal(retailFdr.headline_rate, 8.50, "UCB Retail Fixed Deposit peak rate must be 8.50% (180 days, Page 7)");

    const nrbDps = ucb.products.find((p) => p.product_id === "ucb-nrb-dps-plus");
    assert.ok(nrbDps, "UCB NRB DPS Plus must exist");
    assert.equal(nrbDps.headline_rate, 8.50, "UCB NRB DPS Plus rate must be 8.50% (Circular 1634 Page 7)");

    const youngstersDps = ucb.products.find((p) => p.product_id === "ucb-youngsters-dps");
    assert.ok(youngstersDps, "UCB Youngsters DPS must exist");
    assert.equal(youngstersDps.headline_rate, 8.50, "UCB Youngsters DPS rate must be 8.50% (Circular 1634 Page 8)");
  });

  await t.test("City Bank PLC has verified 18-October-2026 GSI rates and branded products", () => {
    const city = banksData.find((b) => b.short_code === "CITY");
    assert.ok(city, "City Bank must exist in dataset");
    assert.equal(city.bank_name, "City Bank PLC");
    assert.equal(city.category, "CONVENTIONAL_PCB");
    assert.equal(city.fdr_rates["1_year"], 7.00, "City Bank 1Y FDR rate must be 7.00% (W.E.F 18-Oct-2026)");
    assert.equal(city.dps_rates["5_years"], 8.50, "City Bank 5Y DPS rate must be 8.50% (W.E.F 18-Oct-2026)");
    assert.equal(city.source_url, "https://www.citybankplc.com/gsi/conventional-banking-products");
    assert.equal(city.verification_status, "VERIFIED_OFFICIAL");
    assert.equal(city.products.length, 6, "City Bank must have 6 official branded products");

    const genFdr = city.products.find((p) => p.product_id === "city-general-fdr");
    assert.ok(genFdr, "City General Fixed Deposit must exist");
    assert.equal(genFdr.headline_rate, 7.00);

    const genDps = city.products.find((p) => p.product_id === "city-general-dps");
    assert.ok(genDps, "City General DPS must exist");
    assert.equal(genDps.headline_rate, 8.50);

    const mipfd = city.products.find((p) => p.product_id === "city-monthly-interest-fd");
    assert.ok(mipfd, "City Monthly Interest Paying FD must exist");
    assert.equal(mipfd.headline_rate, 7.40);

    const insuranceDps = city.products.find((p) => p.product_id === "city-insurance-dps");
    assert.ok(insuranceDps, "City Insurance Backed DPS must exist");
    assert.equal(insuranceDps.headline_rate, 8.00);
  });

  await t.test("Commercial Bank of Ceylon PLC has verified tariff rates and branded products", () => {
    const cbc = banksData.find((b) => b.short_code === "CBC");
    assert.ok(cbc, "CBC must exist in dataset");
    assert.equal(cbc.bank_name, "Commercial Bank of Ceylon PLC");
    assert.equal(cbc.category, "FOREIGN");
    assert.equal(cbc.fdr_rates["1_month"], 4.50, "CBC 1M FDR rate must be 4.50%");
    assert.equal(cbc.fdr_rates["1_year"], 5.50, "CBC 1Y FDR rate must be 5.50%");
    assert.equal(cbc.fdr_rates["2_years"], 7.50, "CBC 2Y FDR rate must be 7.50% (7.24% AER)");
    assert.equal(cbc.fdr_rates["5_years"], 7.50, "CBC High-5 FD rate must be 7.50%");
    assert.equal(cbc.source_url, "https://www.combank.net.bd/tariffs/interest-rate.html");
    assert.equal(cbc.verification_status, "VERIFIED_OFFICIAL");
    assert.equal(cbc.products.length, 5, "CBC must have 5 official branded products");

    const regFdr = cbc.products.find((p) => p.product_id === "ceylon-regular-fdr");
    assert.ok(regFdr, "CBC Regular FDR must exist");
    assert.equal(regFdr.headline_rate, 7.50);

    const fd366 = cbc.products.find((p) => p.product_id === "ceylon-366-days-fd");
    assert.ok(fd366, "CBC 366 Days FD must exist");
    assert.equal(fd366.headline_rate, 7.50);

    const high5 = cbc.products.find((p) => p.product_id === "ceylon-high5-fd");
    assert.ok(high5, "CBC High-5 FD must exist");
    assert.equal(high5.headline_rate, 7.50);

    const savings = cbc.products.find((p) => p.product_id === "ceylon-monthly-savings");
    assert.ok(savings, "CBC Monthly Savings must exist");
    assert.equal(savings.headline_rate, 4.50);
  });

  await t.test("NCC Bank PLC has verified rates from official October 2026 circular", () => {
    const ncc = banksData.find((b) => b.short_code === "NCC");
    assert.ok(ncc, "NCC Bank must exist in dataset");
    assert.equal(ncc.source_url, "https://www.nccbank.com.bd/NccbRates");
    assert.equal(ncc.fdr_rates["1_year"], 8.25);
    assert.equal(ncc.dps_rates["6_years"], 8.75);
    assert.equal(ncc.verification_status, "VERIFIED_OFFICIAL");
    assert.ok(ncc.products.length >= 5, "NCC must have at least 5 branded products");

    const highValue = ncc.products.find((p) => p.product_id === "ncc-high-value-fdr");
    assert.ok(highValue, "NCC High Value FDR must exist");
    assert.equal(highValue.headline_rate, 8.50);

    const sfds = ncc.products.find((p) => p.product_id === "ncc-sfds-monthly");
    assert.ok(sfds, "NCC SFDS Monthly must exist");
    assert.equal(sfds.headline_rate, 8.25);
  });

  await t.test("Shimanto Bank Limited has verified live rates from interest-rates/deposit", () => {
    const shimanto = banksData.find((b) => b.short_code === "SHIMANTO");
    assert.ok(shimanto, "Shimanto Bank must exist");
    assert.equal(shimanto.source_url, "https://shimantobank.com/interest-rates/deposit");
    assert.equal(shimanto.fdr_rates["1_year"], 9.75);
    assert.equal(shimanto.dps_rates["3_years"], 10.00);
    assert.equal(shimanto.verification_status, "VERIFIED_OFFICIAL");

    const special360 = shimanto.products.find((p) => p.product_id === "shimanto-special-360-fd");
    assert.ok(special360, "Shimanto Special 360-day FD must exist");
    assert.equal(special360.headline_rate, 10.25);

    const monthlyFdr = shimanto.products.find((p) => p.product_id === "shimanto-monthly-benefit-fdr");
    assert.ok(monthlyFdr, "Shimanto Monthly Benefit FDR must exist");
    assert.equal(monthlyFdr.headline_rate, 10.75);
  });

  await t.test("SBAC Bank has verified circular rates and multi-tier products", () => {
    const sbac = banksData.find((b) => b.short_code === "SBAC");
    assert.ok(sbac, "SBAC Bank must exist");
    assert.equal(sbac.source_url, "https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf");
    assert.equal(sbac.fdr_rates["1_year"], 9.25);
    assert.equal(sbac.dps_rates["5_years"], 10.50);
    assert.equal(sbac.verification_status, "VERIFIED_OFFICIAL");

    const dbs = sbac.products.find((p) => p.product_id === "sbac-dbs");
    assert.ok(dbs, "SBAC DBS must exist");
    assert.equal(dbs.headline_rate, 10.41);
  });

  await t.test("Citizens Bank PLC has verified live rate sheet and DPS products", () => {
    const citizens = banksData.find((b) => b.short_code === "CITIZENS");
    assert.ok(citizens, "Citizens Bank must exist");
    assert.equal(citizens.source_url, "https://www.citizensbankbd.com/rates/deposit-rate");
    assert.equal(citizens.fdr_rates["1_year"], 9.90);
    assert.equal(citizens.dps_rates["5_years"], 11.50);
    assert.equal(citizens.dps_rates["10_years"], 12.00);
    assert.equal(citizens.verification_status, "VERIFIED_OFFICIAL");

    const dbs = citizens.products.find((p) => p.product_id === "citizens-double-benefit");
    assert.ok(dbs, "Citizens DBS must exist");
    assert.equal(dbs.headline_rate, 10.96);
  });

  await t.test("Modhumoti Bank PLC has verified circular MMBLPC/HO/TD/INT/DEP/2026/07", () => {
    const modhumoti = banksData.find((b) => b.short_code === "MODHUMOTI");
    assert.ok(modhumoti, "Modhumoti Bank must exist");
    assert.equal(modhumoti.source_url, "https://www.modhumotibankplc.com/interest-rate/");
    assert.equal(modhumoti.fdr_rates["1_year"], 6.75);
    assert.equal(modhumoti.dps_rates["5_years"], 11.50);
    assert.equal(modhumoti.verification_status, "VERIFIED_OFFICIAL");

    const specialTenor = modhumoti.products.find((p) => p.product_id === "modhumoti-special-tenor-fd");
    assert.ok(specialTenor, "Modhumoti Special Tenor FDR must exist");
    assert.equal(specialTenor.headline_rate, 9.00);
  });

  await t.test("Uttara Bank PLC has verified Table 6 rates from home/interestrate", () => {
    const uttara = banksData.find((b) => b.short_code === "UTTARA");
    assert.ok(uttara, "Uttara Bank must exist");
    assert.equal(uttara.source_url, "https://www.uttarabank-bd.com/home/interestrate");
    assert.equal(uttara.fdr_rates["1_year"], 8.00);
    assert.equal(uttara.dps_rates["5_years"], 9.00);
    assert.equal(uttara.verification_status, "VERIFIED_OFFICIAL");

    const dbds = uttara.products.find((p) => p.product_id === "uttara-dbds");
    assert.ok(dbds, "Uttara DBDS must exist");
    assert.equal(dbds.headline_rate, 8.00);
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

test("Statutory Bangladesh Bank Excise Duty & Net Yield Rigor", async (t) => {
  const { calculateExciseDuty, calculateNetMaturity } = await import("../src/lib/ratesCalculator.ts");

  await t.test("Excise duty adheres strictly to statutory brackets", () => {
    assert.equal(calculateExciseDuty(80000, 1), 0, "Balance <= 100k has 0 duty");
    assert.equal(calculateExciseDuty(250000, 1), 150, "Balance 100k-500k has 150 duty");
    assert.equal(calculateExciseDuty(800000, 1), 500, "Balance 500k-1M has 500 duty");
    assert.equal(calculateExciseDuty(5000000, 1), 3000, "Balance 1M-10M has 3,000 duty");
    assert.equal(calculateExciseDuty(20000000, 1), 15000, "Balance 10M-50M has 15,000 duty");
    assert.equal(calculateExciseDuty(80000000, 1), 50000, "Balance > 50M has 50,000 duty");

    // Multi-year adjustments (deducted annually per calendar year)
    assert.equal(calculateExciseDuty(5000000, 3), 9000, "3-year tenure multiplies annual excise duty by 3");
  });

  await t.test("Product calculation calculates penny-perfect net yield with TDS and Excise", () => {
    // ৳1,000,000 at 10% for 1 year with TIN
    const res = calculateNetMaturity({
      principal: 1000000,
      annualRate: 10.0,
      tenureMonths: 12,
      paymentFrequency: "MATURITY",
      hasTin: true,
      productName: "Test FDR",
      bankCode: "TEST",
    });

    assert.equal(res.gross_interest, 100000);
    assert.equal(res.withholding_tax_tds_pct, 10);
    assert.equal(res.withholding_tax, 10000);
    // Peak balance = 1,000,000 + 100,000 = 1,100,000 -> bracket 1M-10M -> 3,000 excise duty
    assert.equal(res.statutory_excise_duty_amount, 3000);
    assert.equal(res.net_profit, 87000);
    assert.equal(res.net_payable_maturity_amount, 1087000);
  });
});

test("Deterministic Mathematical Confidence Gating", async (t) => {
  const { evaluateRateConfidence } = await import("../src/services/confidenceScorer.ts");

  await t.test("High-authority primary treasury circular achieves >= 0.95 approval", () => {
    const evalResult = evaluateRateConfidence({
      sourceAuthority: "TREASURY_CIRCULAR",
      completeness: {
        hasProductName: true,
        hasProductType: true,
        hasExplicitTenure: true,
        hasExplicitRate: true,
      },
      structuralAlignment: "EXPLICIT_TABLE_ROW_OR_CARD",
      rateValue: 8.50,
      crossSourceAgreement: "MATCHES_OR_WITHIN_CORRIDOR",
      publishedWithinCurrentQuarter: true,
    });

    assert.equal(evalResult.score, 1.0);
    assert.equal(evalResult.isApproved, true);
    assert.equal(evalResult.quarantineReason, undefined);
  });

  await t.test("Aggregator or incomplete source is quarantined (< 0.95)", () => {
    const evalResult = evaluateRateConfidence({
      sourceAuthority: "AGGREGATOR",
      completeness: {
        hasProductName: true,
        hasProductType: true,
        hasExplicitTenure: true,
        hasExplicitRate: true,
      },
      structuralAlignment: "EXPLICIT_TABLE_ROW_OR_CARD",
      rateValue: 8.50,
      crossSourceAgreement: "MATCHES_OR_WITHIN_CORRIDOR",
      publishedWithinCurrentQuarter: true,
    });

    assert.ok(evalResult.score < 0.95);
    assert.equal(evalResult.isApproved, false);
    assert.ok(evalResult.quarantineReason.includes("HELD_IN_STAGING_QUARANTINE"));
  });
});

test("Section 6 & 9 Penny-Perfect Maturity & Hub-and-Spoke Invariants", async (t) => {
  const { calculatePennyPerfectMaturity, computeExciseDuty } = await import("../src/services/maturityCalculator.ts");

  await t.test("Matches exact Section 9 UCB contract sample calculation", () => {
    const result = calculatePennyPerfectMaturity({
      principal: 500000,
      annualRatePct: 10.50,
      tenureMonths: 12,
      hasTin: true,
      compounding: "MATURITY",
    });

    assert.equal(result.principal, 500000);
    assert.equal(result.grossInterest, 52500.00, "Gross interest must be 52,500.00 BDT");
    assert.equal(result.tdsRatePct, 10, "TDS rate with TIN must be 10%");
    assert.equal(result.tdsAmount, 5250.00, "TDS amount must be 5,250.00 BDT");
    assert.equal(result.exciseDuty, 500.00, "Statutory excise duty on peak balance 552,500 must be 500.00 BDT");
    assert.equal(result.netInterest, 46750.00, "Net interest must be 46,750.00 BDT");
    assert.equal(result.netMaturityPayout, 546750.00, "Net maturity payout must be 546,750.00 BDT");
    assert.equal(result.effectiveYieldPct, 9.35, "Effective net yield must be 9.35%");
  });

  await t.test("Hub-and-Spoke bankRegistry.json contains all 61 banks mapped with pattern types", async () => {
    const fs = await import("fs");
    const registry = JSON.parse(fs.readFileSync("src/data/bankRegistry.json", "utf-8"));
    assert.equal(registry.length, 61, "bankRegistry.json must contain exactly 61 banks");

    for (const bank of registry) {
      assert.ok(bank.bank_code, `Bank missing bank_code: ${bank.bank_name}`);
      assert.ok(bank.hub_url, `Bank missing hub_url: ${bank.bank_code}`);
      assert.ok(bank.pattern_type, `Bank missing pattern_type: ${bank.bank_code}`);
    }

    const ucbReg = registry.find((b) => b.bank_code === "UCB");
    assert.ok(ucbReg, "UCB must exist in registry");
    assert.equal(ucbReg.schemes_count, 18, "UCB schemes count must be 18");
  });
});
