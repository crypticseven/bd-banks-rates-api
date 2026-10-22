/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
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
 */
export function enforceRateLimit(
  clientId: string,
  maxPerMinute: number
): { allowed: boolean; remaining: number; resetSeconds: number } {
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
  let decodedUrl = req.url.toLowerCase();
  try {
    decodedUrl = decodeURIComponent(req.url.replace(/\+/g, " ")).toLowerCase();
  } catch {
    return { safe: false, reason: "Malformed URI encoding detected" };
  }
  
  // 1. Path traversal attacks
  if (decodedUrl.includes("../") || decodedUrl.includes("..\\") || decodedUrl.includes("/..")) {
    return { safe: false, reason: "Path traversal pattern detected" };
  }

  // 2. Dangerous SQL injection or script injection tokens
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /union\s+select/i,
    /exec\s*\(/i,
    /drop\s+table/i,
    /--/i,
    /'\s*or\s+'1'='1'/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(decodedUrl)) {
      return { safe: false, reason: "Malicious injection signature intercepted" };
    }
  }

  return { safe: true };
}

/**
 * Emits HTTP 429 Too Many Requests response
 */
export function rateLimitExceededResponse(resetSeconds: number): NextResponse {
  return NextResponse.json(
    {
      status: "error",
      code: "RATE_LIMIT_EXCEEDED",
      message: `Commercial API quota exceeded. Automatic backoff required. Retry in ${resetSeconds} seconds.`,
      retry_after_seconds: resetSeconds,
      trademark: "Anik FinTech Engine™ / BDRIP™",
      licensing_portal: "https://fardinanik.com",
    },
    {
      status: 429,
      headers: {
        "Retry-After": resetSeconds.toString(),
        "X-RateLimit-Reset": resetSeconds.toString(),
        "X-RateLimit-Remaining": "0",
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Emits HTTP 400 Bad Request for malicious or malformed requests
 */
export function securityBlockResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      status: "error",
      code: "SECURITY_INTERCEPTION",
      message: `Request blocked by Anik FinTech Engine™ Anti-Hacking Guard: ${reason}`,
      timestamp: new Date().toISOString(),
    },
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
