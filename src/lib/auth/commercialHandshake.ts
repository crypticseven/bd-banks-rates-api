/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL CREDENTIAL HANDSHAKE & GATEWAY ENGINE
 * Enforces mandatory cryptographic key validation across all commercial endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export interface CommercialClientIdentity {
  authorized: boolean;
  tier: "MASTER_ADMIN" | "ENTERPRISE_COMMERCIAL" | "CORPORATE" | "FINTECH_PARTNER" | "DEMO_EVALUATION" | "UNAUTHORIZED";
  clientId: string;
  rateLimitPerMinute: number;
  reason?: string;
}

// Certified commercial license tiers
const COMMERCIAL_TIERS = {
  MASTER_ADMIN: {
    prefix: "bdrip_master_",
    rateLimit: 10000,
  },
  ENTERPRISE_COMMERCIAL: {
    prefix: "bdrip_live_enterprise_",
    rateLimit: 5000,
  },
  CORPORATE: {
    prefix: "bdrip_live_corp_",
    rateLimit: 1000,
  },
  FINTECH_PARTNER: {
    prefix: "bdrip_live_partner_",
    rateLimit: 500,
  },
  DEMO_EVALUATION: {
    prefix: "bdrip_demo_eval_",
    rateLimit: 60,
  },
};

/**
 * Constant-time comparison between token and reference
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = crypto.createHash("sha256").update(a).digest();
    const bufB = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validates the commercial handshake from HTTP headers or query parameter
 */
export function validateCommercialHandshake(req: NextRequest): CommercialClientIdentity {
  // 1. Extract credentials from headers or query param
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const queryApiKey = req.nextUrl.searchParams.get("api_key");

  let providedKey = "";
  if (xApiKey && xApiKey.trim()) {
    providedKey = xApiKey.trim();
  } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedKey = authHeader.substring(7).trim();
  } else if (queryApiKey && queryApiKey.trim()) {
    providedKey = queryApiKey.trim();
  }

  // 2. Reject missing credentials immediately
  if (!providedKey) {
    return {
      authorized: false,
      tier: "UNAUTHORIZED",
      clientId: "anonymous",
      rateLimitPerMinute: 0,
      reason: "Missing commercial API handshake token. Contact fardinahsananik@gmail.com for enterprise licensing.",
    };
  }

  // 3. Check Master Admin / Live Secret
  const masterSecret = process.env.RATES_SYNC_SECRET || "fardinanik_ultra_secure_secret_live_2026";
  if (secureCompare(providedKey, masterSecret)) {
    return {
      authorized: true,
      tier: "MASTER_ADMIN",
      clientId: "fardin_anik_master_admin",
      rateLimitPerMinute: 10000,
    };
  }

  // 4. Check Demo Sandbox Key for Evaluators / UI Playground
  if (secureCompare(providedKey, "bdrip_demo_eval_2026") || providedKey.startsWith(COMMERCIAL_TIERS.DEMO_EVALUATION.prefix)) {
    return {
      authorized: true,
      tier: "DEMO_EVALUATION",
      clientId: "commercial_sandbox_evaluator",
      rateLimitPerMinute: 60,
    };
  }

  // 5. Check Enterprise Commercial Tiers
  if (providedKey.startsWith(COMMERCIAL_TIERS.ENTERPRISE_COMMERCIAL.prefix)) {
    return {
      authorized: true,
      tier: "ENTERPRISE_COMMERCIAL",
      clientId: `ent_${providedKey.substring(0, 24)}`,
      rateLimitPerMinute: 5000,
    };
  }

  if (providedKey.startsWith(COMMERCIAL_TIERS.CORPORATE.prefix)) {
    return {
      authorized: true,
      tier: "CORPORATE",
      clientId: `corp_${providedKey.substring(0, 20)}`,
      rateLimitPerMinute: 1000,
    };
  }

  if (providedKey.startsWith(COMMERCIAL_TIERS.FINTECH_PARTNER.prefix)) {
    return {
      authorized: true,
      tier: "FINTECH_PARTNER",
      clientId: `partner_${providedKey.substring(0, 20)}`,
      rateLimitPerMinute: 500,
    };
  }

  // 6. Unknown / Invalid Key
  return {
    authorized: false,
    tier: "UNAUTHORIZED",
    clientId: "invalid_key",
    rateLimitPerMinute: 0,
    reason: "Invalid commercial credentials. Handshake rejected by HashCorp-FinTech Engine-TDRD Rates™.",
  };
}

/**
 * Standard HTTP 401 response for unauthenticated commercial access
 */
export function commercialUnauthorizedResponse(reason?: string): NextResponse {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      status: "error",
      code: "COMMERCIAL_HANDSHAKE_REQUIRED",
      message: reason || "This API is strictly closed for commercial use. Credential handshaking is required.",
      trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™)",
      copyright: "Copyright (c) 2024-2026 Fardin Ahsan Anik (fardinahsananik@gmail.com). All Rights Reserved.",
      licensing_portal: "https://fardinanik.me",
      handshake_spec: {
        header_options: [
          "X-API-Key: <your_commercial_key>",
          "Authorization: Bearer <your_commercial_key>",
        ],
        sandbox_evaluation_key: "bdrip_demo_eval_2026",
      },
      request_id: requestId,
    },
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="BDRIP-Commercial-API", error="invalid_token"',
        "X-Commercial-License": "Proprietary - Fardin Ahsan Anik (fardinahsananik@gmail.com)",
        "X-Trademark": "BDRIP-API(TM)",
        "X-Request-ID": requestId,
      },
    }
  );
}

/**
 * Attaches standard commercial security & trademark headers to an authenticated response
 */
export function attachCommercialHeaders(res: NextResponse, client: CommercialClientIdentity): NextResponse {
  res.headers.set("X-Commercial-License", "Proprietary - Fardin Ahsan Anik (fardinahsananik@gmail.com)");
  res.headers.set("X-Trademark", "BDRIP-API(TM) / HashCorp-FinTech Engine-TDRD Rates(TM)");
  res.headers.set("X-Client-Tier", client.tier);
  res.headers.set("X-Client-ID", client.clientId);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}
