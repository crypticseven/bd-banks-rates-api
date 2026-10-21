import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { z } from "zod";

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

    return NextResponse.json(
      {
        status: "success",
        as_of_date: new Date().toISOString().split("T")[0],
        bank,
        data: bank,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to fetch bank details." },
      { status: 500 }
    );
  }
}
