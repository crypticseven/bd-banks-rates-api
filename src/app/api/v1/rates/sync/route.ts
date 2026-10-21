import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ALL_61_BANKS } from "@/lib/bankRatesData";

export const runtime = "nodejs";

const rateUpdateSchema = z.object({
  updates: z.array(
    z.object({
      bank_id: z.string().min(1),
      fdr_rates: z.record(
        z.enum(["3_months", "6_months", "1_year", "3_years", "5_years"]),
        z.number().finite().min(0).max(100)
      ).optional(),
      dps_rates: z.record(
        z.enum(["3_years", "5_years", "10_years"]),
        z.number().finite().min(0).max(100)
      ).optional(),
      circular_url: z.string().url().optional(),
      effective_date: z.string().date().optional(),
    }).strict()
  ).min(1).max(61),
}).strict();

export async function GET() {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      status: "degraded",
      code: "INGESTION_NOT_CONNECTED",
      service: "SOC & Deposit Rates Ingestion Pipeline",
      version: "v1.3.0",
      as_of_date: null,
      data_status: "unverified_static_snapshot",
      total_banks_tracked: ALL_61_BANKS.length,
      crawler_engine: {
        target_frequency: "Daily automated check at 02:00 BST (UTC+6)",
        supported_formats: ["HTML Responsive Tables", "PDF Circulars (PyMuPDF parser)"],
        last_sync_timestamp: null,
        persistence: "not_configured",
      },
      central_bank_compliance: {
        regulatory_body: "Bangladesh Bank (Banking Regulation and Policy Department)",
        reference_bulletin: "Scheduled Banks Weighted Average Deposit Rates",
        tax_rates: {
          nbr_withholding_tin: "10%",
          nbr_withholding_non_tin: "15%",
        },
      },
    },
    { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
  );
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const expectedSecret = process.env.RATES_SYNC_SECRET;
    const bearerToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");

    if (!expectedSecret) {
      return NextResponse.json(
        { status: "error", code: "SYNC_NOT_CONFIGURED", message: "Sync service is not configured.", request_id: requestId },
        { status: 503, headers: { "X-Request-ID": requestId } }
      );
    }

    const provided = Buffer.from(bearerToken);
    const expected = Buffer.from(expectedSecret);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return NextResponse.json(
        { status: "error", code: "INVALID_SYNC_CREDENTIALS", message: "Authentication required.", request_id: requestId },
        { status: 401, headers: { "X-Request-ID": requestId } }
      );
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 256 * 1024) {
      return NextResponse.json(
        { status: "error", code: "PAYLOAD_TOO_LARGE", message: "Payload exceeds 256 KiB.", request_id: requestId },
        { status: 413, headers: { "X-Request-ID": requestId } }
      );
    }

    const parsed = rateUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "INVALID_SYNC_PAYLOAD", errors: parsed.error.format(), request_id: requestId },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        code: "PERSISTENCE_NOT_CONFIGURED",
        message: "Updates were not accepted because no durable persistence backend is configured.",
        request_id: requestId,
      },
      { status: 503, headers: { "X-Request-ID": requestId } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", code: "SYNC_REQUEST_FAILED", message: "Failed to process rate update batch.", request_id: requestId },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
