/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * ANTI-HACKING, RATE-LIMITING & ABUSE MITIGATION SHIELD
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitBucket {
  tokens: number;
  lastRefillTimestamp: number;
}

// In-memory sliding window cache
const clientBuckets = new Map<string, RateLimitBucket>();

// Cleanup stale buckets every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of clientBuckets.entries()) {
      if (now - bucket.lastRefillTimestamp > 300000) {
        clientBuckets.delete(key);
      }
    }
  }, 300000);
}

/**
 * Checks in-memory sliding token bucket rate limit
 * Sovereign UAT Bypass: zero limits for owner.
 */
export function enforceRateLimit(
  clientId: string,
  maxPerMinute: number
): { allowed: boolean; remaining: number; resetSeconds: number } {
  if (
    clientId.includes("sovereign") ||
    clientId.includes("master_admin") ||
    maxPerMinute >= 100000
  ) {
    return {
      allowed: true,
      remaining: 1000000,
      resetSeconds: 0,
    };
  }

  const now = Date.now();
  const bucket = clientBuckets.get(clientId) || {
    tokens: maxPerMinute,
    lastRefillTimestamp: now,
  };

  const elapsedSeconds = Math.max(0, (now - bucket.lastRefillTimestamp) / 1000);
  const refillAmount = elapsedSeconds * (maxPerMinute / 60);
  bucket.tokens = Math.min(maxPerMinute, bucket.tokens + refillAmount);
  bucket.lastRefillTimestamp = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    clientBuckets.set(clientId, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetSeconds: Math.ceil(60 - (elapsedSeconds % 60)),
    };
  }

  clientBuckets.set(clientId, bucket);
  return {
    allowed: false,
    remaining: 0,
    resetSeconds: Math.ceil(60 - (elapsedSeconds % 60)),
  };
}

/**
 * Checks for dangerous injection patterns in request URL and query
 */
export function detectMaliciousPayload(req: NextRequest): { safe: boolean; reason?: string } {
  const host = req.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("trycloudflare.com")) {
    return { safe: true };
  }

  let decodedUrl = req.url.toLowerCase();
  try {
    decodedUrl = decodeURIComponent(req.url.replace(/\+/g, " ")).toLowerCase();
  } catch {
    return { safe: false, reason: "Malformed URI encoding detected" };
  }

  // 1. SQL Injection Signatures
  const sqliPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3d)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3b)|(;))/i,
    /\w*((\%27)|(\'))(\s)*((\%6f)|o|(\%4f))((\%72)|r|(\%52))/i,
    /(union([\s\+]+)all([\s\+]+)select)/i,
    /(union([\s\+]+)select)/i,
    /(information_schema)/i,
    /(select([\s\+]+)\*([\s\+]+)from)/i,
    /(drop([\s\+]+)table)/i,
  ];

  // 2. Cross-Site Scripting (XSS) Signatures
  const xssPatterns = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload(\s*)=/i,
    /onerror(\s*)=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /document\.cookie/i,
    /document\.location/i,
  ];

  // 3. Path Traversal & Remote Code Execution
  const traversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /\/etc\/passwd/i,
    /\/proc\/self/i,
    /\/windows\/win\.ini/i,
    /cmd\.exe/i,
    /\/bin\/sh/i,
    /\/bin\/bash/i,
  ];

  for (const pattern of sqliPatterns) {
    if (pattern.test(decodedUrl)) {
      return { safe: false, reason: "SQL injection signature detected in request URL" };
    }
  }

  for (const pattern of xssPatterns) {
    if (pattern.test(decodedUrl)) {
      return { safe: false, reason: "Cross-site scripting (XSS) payload signature detected" };
    }
  }

  for (const pattern of traversalPatterns) {
    if (pattern.test(decodedUrl)) {
      return { safe: false, reason: "Directory traversal / execution sequence intercepted" };
    }
  }

  return { safe: true };
}

export function rateLimitExceededResponse(resetSeconds: number): NextResponse {
  return NextResponse.json(
    {
      status: "rate_limited",
      code: "API_RATE_LIMIT_EXCEEDED",
      message: `Commercial rate limit exceeded for this tier. Cooldown expires in ${resetSeconds} seconds. Contact fardinahsananik@gmail.com for enterprise tier upgrade.`,
      reset_seconds: resetSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": resetSeconds.toString(),
      },
    }
  );
}

export function securityBlockResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      status: "forbidden",
      code: "SECURITY_INTEGRITY_VIOLATION",
      message: `Request blocked by BDRIP-API Anti-Hacking Guard. Reason: ${reason}`,
    },
    { status: 403 }
  );
}
