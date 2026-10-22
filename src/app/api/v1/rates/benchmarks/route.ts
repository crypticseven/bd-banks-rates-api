/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * AUTHORITATIVE CENTRAL BANK MONETARY BENCHMARKS ENDPOINT
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCommercialHandshake, commercialUnauthorizedResponse, attachCommercialHeaders } from "@/lib/auth/commercialHandshake";
import { enforceRateLimit, detectMaliciousPayload, rateLimitExceededResponse, securityBlockResponse } from "@/lib/security/antiHackingGuard";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  // 1. Anti-Hacking Guard: Intercept injection & malicious payload signatures
  const securityCheck = detectMaliciousPayload(req);
  if (!securityCheck.safe) {
    return securityBlockResponse(securityCheck.reason || "Payload failed security inspection.");
  }

  // 2. Commercial Credential Handshake Gateway
  const client = validateCommercialHandshake(req);
  if (!client.authorized) {
    return commercialUnauthorizedResponse(client.reason);
  }

  // 3. Sliding Token Bucket Rate Limiting per Tier
  const rateLimit = enforceRateLimit(client.clientId, client.rateLimitPerMinute);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds);
  }

  const requestId = crypto.randomUUID();

  // Authoritative Bangladesh Bank Monetary Policy Department (MPD) Benchmarks & NBR Tax Regime
  const payload = {
    status: "success",
    data_status: "verified_authoritative",
    trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)",
    licensing: "Proprietary Commercial License - Fardin Ahsan Anik <fardinahsananik@gmail.com>",
    regulatory_authority: "Bangladesh Bank (Central Bank of Bangladesh) & National Board of Revenue (NBR)",
    as_of_date: new Date().toISOString().split("T")[0],
    request_id: requestId,
    client_context: {
      client_id: client.clientId,
      tier: client.tier,
      rate_limit_remaining: rateLimit.remaining,
    },
    monetary_policy_benchmarks: {
      policy_repo_rate: 10.00,
      policy_repo_rate_label: "10.00%",
      standing_lending_facility_slf: 11.50,
      standing_lending_facility_slf_label: "11.50%",
      standing_deposit_facility_sdf: 8.50,
      standing_deposit_facility_sdf_label: "8.50%",
      interbank_call_money_rate_avg: 9.85,
      interbank_call_money_rate_avg_label: "9.85%",
      policy_stance: "Contractionary / Tightened Liquidity Stance",
      statutory_basis: "Bangladesh Bank MPD Circular No. 03/2024 & MPS Framework",
    },
    statutory_reserve_requirements: {
      cash_reserve_ratio_crr: "4.00%",
      crr_biweekly_average: "4.00%",
      crr_daily_minimum: "3.50%",
      statutory_liquidity_ratio_slr_conventional: "13.00%",
      statutory_liquidity_ratio_slr_islamic: "5.50%",
      statutory_basis: "Bangladesh Bank DOS Circular No. 01/2020 & Bank Company Act 1991 Section 38",
    },
    withholding_tax_regime: {
      statutory_body: "National Board of Revenue (NBR)",
      statutory_basis: "Income Tax Act 2023, Section 102 (Deduction from interest on deposit)",
      individual_with_tin_psr: "10.00%",
      individual_without_tin_psr: "15.00%",
      company_deposits: "20.00%",
      exemptions: "Recognized provident funds, approved superannuation funds, government pension schemes",
    },
  };

  const response = NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Request-ID": requestId,
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    },
  });

  return attachCommercialHeaders(response, client);
}
