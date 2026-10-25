/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL CREDENTIAL HANDSHAKE & GATEWAY ENGINE
 * Sovereign UAT Mode: Zero-friction authorization for Owner / UAT Testing.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export interface CommercialClientIdentity {
  authorized: boolean;
  tier: "MASTER_ADMIN" | "ENTERPRISE_COMMERCIAL" | "CORPORATE" | "FINTECH_PARTNER" | "DEMO_EVALUATION" | "UNAUTHORIZED";
  clientId: string;
  rateLimitPerMinute: number;
  reason?: string;
  isUatOwner?: boolean;
}

// Certified commercial license tiers
const COMMERCIAL_TIERS = {
  MASTER_ADMIN: {
    prefix: "bdrip_master_",
    rateLimit: 100000,
  },
  ENTERPRISE_COMMERCIAL: {
    prefix: "bdrip_live_enterprise_",
    rateLimit: 50000,
  },
  CORPORATE: {
    prefix: "bdrip_live_corp_",
    rateLimit: 10000,
  },
  FINTECH_PARTNER: {
    prefix: "bdrip_live_partner_",
    rateLimit: 5000,
  },
  DEMO_EVALUATION: {
    prefix: "bdrip_demo_eval_",
    rateLimit: 1000,
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
 * Validates the commercial handshake from HTTP headers or query parameter.
 * SOVEREIGN UAT MODE: Grants immediate, unblocked MASTER_ADMIN access to owner/UAT testing.
 */
export function validateCommercialHandshake(req: NextRequest): CommercialClientIdentity {
  // 1. Extract credentials from headers, query param, or cookies
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const xAdminToken = req.headers.get("x-admin-token");
  const queryApiKey = req.nextUrl.searchParams.get("api_key");
  const adminCookie = req.cookies.get("cng_admin_token")?.value;

  let providedKey = "";
  if (xApiKey && xApiKey.trim()) {
    providedKey = xApiKey.trim();
  } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedKey = authHeader.substring(7).trim();
  } else if (queryApiKey && queryApiKey.trim()) {
    providedKey = queryApiKey.trim();
  } else if (xAdminToken && xAdminToken.trim()) {
    providedKey = xAdminToken.trim();
  } else if (adminCookie && adminCookie.trim()) {
    providedKey = adminCookie.trim();
  }

  // 2. Sovereign Owner Key Check (e.g. cng_fardin_admin_2026 or master secret)
  const masterSecret = process.env.RATES_SYNC_SECRET || "fardinanik_ultra_secure_secret_live_2026";
  const sovereignKey = "cng_fardin_admin_2026";

  if (
    providedKey &&
    (secureCompare(providedKey, sovereignKey) ||
      secureCompare(providedKey, masterSecret) ||
      providedKey.includes("fardin") ||
      providedKey.startsWith(COMMERCIAL_TIERS.MASTER_ADMIN.prefix))
  ) {
    return {
      authorized: true,
      tier: "MASTER_ADMIN",
      clientId: "fardin_anik_sovereign_owner",
      rateLimitPerMinute: 1000000,
      reason: "Sovereign Master Admin authenticated.",
      isUatOwner: true,
    };
  }

  // 3. SOVEREIGN UAT BYPASS: "NO CHECKING, FOR ME ONLY"
  // If running in development, local environment, or host is local / trycloudflare / internal,
  // or if no key was provided in UAT testing mode:
  const host = req.headers.get("host") || "";
  const isLocalOrTunnel =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("trycloudflare.com") ||
    process.env.NODE_ENV !== "production" ||
    process.env.UAT_MODE !== "false";

  if (isLocalOrTunnel) {
    return {
      authorized: true,
      tier: "MASTER_ADMIN",
      clientId: "fardin_anik_sovereign_uat_owner",
      rateLimitPerMinute: 1000000,
      reason: "UAT Sovereign Bypass Active: Zero Checking for Owner.",
      isUatOwner: true,
    };
  }

  // 4. Check Demo Sandbox Key for Evaluators
  if (
    secureCompare(providedKey, "bdrip_demo_eval_2026") ||
    providedKey.startsWith(COMMERCIAL_TIERS.DEMO_EVALUATION.prefix)
  ) {
    return {
      authorized: true,
      tier: "DEMO_EVALUATION",
      clientId: "commercial_sandbox_evaluator",
      rateLimitPerMinute: 5000,
    };
  }

  // 5. Enterprise & Corporate Tiers
  if (providedKey.startsWith(COMMERCIAL_TIERS.ENTERPRISE_COMMERCIAL.prefix)) {
    return {
      authorized: true,
      tier: "ENTERPRISE_COMMERCIAL",
      clientId: `ent_${providedKey.substring(0, 24)}`,
      rateLimitPerMinute: 50000,
    };
  }

  if (providedKey.startsWith(COMMERCIAL_TIERS.CORPORATE.prefix)) {
    return {
      authorized: true,
      tier: "CORPORATE",
      clientId: `corp_${providedKey.substring(0, 20)}`,
      rateLimitPerMinute: 10000,
    };
  }

  // Fallback for missing or invalid keys when outside UAT
  if (!providedKey) {
    return {
      authorized: false,
      tier: "UNAUTHORIZED",
      clientId: "anonymous",
      rateLimitPerMinute: 0,
      reason: "Missing commercial API handshake token. Contact fardinahsananik@gmail.com for enterprise licensing.",
    };
  }

  return {
    authorized: false,
    tier: "UNAUTHORIZED",
    clientId: "invalid_key",
    rateLimitPerMinute: 0,
    reason: "Invalid or expired commercial API key.",
  };
}

/**
 * Standard 401 Unauthorized Response payload for failed handshake
 */
export function commercialUnauthorizedResponse(reason?: string): NextResponse {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      status: "error",
      code: "COMMERCIAL_HANDSHAKE_REQUIRED",
      message: reason || "Valid commercial API key required to access institutional deposit intelligence.",
      trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™)",
      copyright: "Copyright (c) 2024-2026 Fardin Ahsan Anik (fardinahsananik@gmail.com). All Rights Reserved.",
      licensing_portal: "https://fardinanik.me",
      handshake_spec: {
        header_options: ["X-API-Key: <your_commercial_key>", "Authorization: Bearer <your_commercial_key>"],
        sandbox_evaluation_key: "bdrip_demo_eval_2026",
      },
      request_id: requestId,
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="BDRIP-Commercial-API", charset="UTF-8"',
        "X-Request-ID": requestId,
      },
    }
  );
}

/**
 * Attaches certified commercial audit metadata headers to successful response
 */
export function attachCommercialHeaders(res: NextResponse, client: CommercialClientIdentity, requestId?: string): NextResponse {
  const reqId = requestId || crypto.randomUUID();
  res.headers.set("X-Commercial-Engine", "BDRIP-API-v1.0-Institutional");
  res.headers.set("X-Commercial-Tier", client.tier);
  res.headers.set("X-Client-ID", client.clientId);
  res.headers.set("X-Request-ID", reqId);
  res.headers.set("X-Data-Copyright", "Copyright (c) 2024-2026 Fardin Ahsan Anik. All Rights Reserved.");
  if (client.isUatOwner) {
    res.headers.set("X-UAT-Mode", "ACTIVE_NO_CHECKING_FOR_OWNER");
  }
  return res;
}
