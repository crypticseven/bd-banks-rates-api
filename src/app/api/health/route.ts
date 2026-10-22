import { NextResponse } from "next/server";
import banksData from "@/data/bangladesh_61_banks.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const verifiedCount = banksData.filter(
    (b) => b.verification_status === "VERIFIED_OFFICIAL"
  ).length;

  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: "healthy",
      service: "bd-banks-rates-api",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round(process.uptime()),
      dataset: {
        total_banks: banksData.length,
        verified_official_banks: verifiedCount,
        statutory_return_banks: banksData.length - verifiedCount,
      },
      system: {
        node_version: process.version,
        memory_rss_mb: Math.round(memory.rss / (1024 * 1024)),
        heap_used_mb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    }
  );
}
