import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { depositProducts, treasuryCirculars } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const database = getDatabase();
    const { searchParams } = new URL(req.url);
    const bankCode = searchParams.get("bank_code")?.trim().toUpperCase();
    const conditions = [
      eq(depositProducts.status, "ACTIVE"),
      eq(treasuryCirculars.status, "VERIFIED"),
    ];
    if (bankCode) conditions.push(eq(depositProducts.bankCode, bankCode));

    const products = await database
      .select({
        id: depositProducts.id,
        bank_code: depositProducts.bankCode,
        official_product_name: depositProducts.officialProductName,
        product_prefix: depositProducts.productPrefix,
        product_type: depositProducts.productType,
        tenure_months: depositProducts.tenureMonths,
        tenure_display: depositProducts.tenureDisplay,
        headline_rate: depositProducts.headlineRate,
        compounding_frequency: depositProducts.compoundingFrequency,
        status: depositProducts.status,
        source_pdf_sha256: treasuryCirculars.sha256Hash,
        effective_date: treasuryCirculars.effectiveDate,
        fetched_timestamp_utc: treasuryCirculars.fetchedAt,
      })
      .from(depositProducts)
      .innerJoin(treasuryCirculars, eq(depositProducts.circularId, treasuryCirculars.id))
      .where(and(...conditions));

    return NextResponse.json(
      {
        status: "success",
        data_status: "verified_database_records",
        total: products.length,
        data: products,
        request_id: requestId,
      },
      { headers: { "Cache-Control": "public, s-maxage=900", "X-Request-ID": requestId } }
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "DATABASE_URL is not configured."
        ? "Dynamic product storage is not configured."
        : "Failed to read verified products.";
    const code = message.includes("not configured")
      ? "DATABASE_NOT_CONFIGURED"
      : "PRODUCT_READ_FAILED";
    return NextResponse.json(
      { status: "error", code, message, request_id: requestId },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }
}
