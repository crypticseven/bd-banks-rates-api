/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL 61 SCHEDULED BANKS DIRECTORY ENDPOINT
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { validateCommercialHandshake, commercialUnauthorizedResponse, attachCommercialHeaders } from "@/lib/auth/commercialHandshake";
import { enforceRateLimit, detectMaliciousPayload, rateLimitExceededResponse, securityBlockResponse } from "@/lib/security/antiHackingGuard";
import { z } from "zod";
import crypto from "crypto";

const banksQuerySchema = z.object({
  category: z
    .enum(["ALL", "STATE_OWNED", "SPECIALIZED", "CONVENTIONAL_PCB", "ISLAMIC", "FOREIGN"])
    .optional(),
  shariah: z.enum(["true", "false"]).optional(),
});

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

  try {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const parsed = banksQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "bad_request",
          message: "Invalid query parameters.",
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { category, shariah } = parsed.data;

    let banks = [...getActiveBanksServer()];

    if (category && category !== "ALL") {
      banks = banks.filter((b) => b.category === category);
    }

    if (shariah !== undefined) {
      const isShariah = shariah === "true";
      banks = banks.filter((b) => b.is_shariah === isShariah);
    }

    const directory = banks.map((b) => ({
      bank_id: b.bank_id,
      bank_name: b.bank_name,
      short_code: b.short_code,
      category: b.category,
      is_shariah: b.is_shariah,
      has_islamic_window: b.has_islamic_window,
      instant_encashment: b.instant_encashment,
      headquarters: b.headquarters,
      soc_url: b.soc_url,
      source_url: b.source_url,
      effective_date: b.effective_date,
      verification_status: b.verification_status,
      rating_score: b.rating_score,
      credit_rating: b.credit_rating,
      stability_tier: b.stability_tier,
    }));

    const requestId = crypto.randomUUID();

    const response = NextResponse.json(
      {
        status: "success",
        trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)",
        licensing: "Proprietary Commercial License - Fardin Ahsan Anik <fardinahsananik@gmail.com>",
        as_of_date: new Date().toISOString().split("T")[0],
        request_id: requestId,
        client_context: {
          client_id: client.clientId,
          tier: client.tier,
          rate_limit_remaining: rateLimit.remaining,
        },
        total: directory.length,
        data: directory,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400",
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );

    return attachCommercialHeaders(response, client);
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to list banks." },
      { status: 500 }
    );
  }
}
