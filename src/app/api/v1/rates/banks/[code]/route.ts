/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL BANK BY CODE ENDPOINT
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { validateCommercialHandshake, commercialUnauthorizedResponse, attachCommercialHeaders } from "@/lib/auth/commercialHandshake";
import { enforceRateLimit, detectMaliciousPayload, rateLimitExceededResponse, securityBlockResponse } from "@/lib/security/antiHackingGuard";
import { z } from "zod";
import crypto from "crypto";

const codeParamSchema = z
  .string()
  .trim()
  .min(2, "Bank code must be at least 2 characters")
  .max(30, "Bank code must not exceed 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Bank code must contain only alphanumeric characters, dashes, or underscores");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
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

  try {
    const rawParams = await params;
    const parsed = codeParamSchema.safeParse(rawParams.code);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "bad_request",
          message: "Invalid bank identifier format.",
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const cleanCode = parsed.data.toUpperCase();

    const bank = getActiveBanksServer().find(
      (b) => b.short_code.toUpperCase() === cleanCode || b.bank_id.toUpperCase() === cleanCode
    );

    if (!bank) {
      return NextResponse.json(
        {
          status: "not_found",
          message: `Bank with short code or ID '${cleanCode}' not found in 61 scheduled banks.`,
        },
        { status: 404 }
      );
    }

    const requestId = crypto.randomUUID();

    const response = NextResponse.json(
      {
        status: "success",
        trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)",
        licensing: "Proprietary Commercial License - Fardin Ahsan Anik <fardinahsananik@gmail.com>",
        as_of_date: new Date().toISOString().split("T")[0],
        request_id: requestId,
        client_context: {
          client_id: client.clientId,
          tier: client.tier,
          rate_limit_remaining: rateLimit.remaining,
        },
        bank,
        data: bank,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600",
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );

    return attachCommercialHeaders(response, client);
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to fetch bank details." },
      { status: 500 }
    );
  }
}
