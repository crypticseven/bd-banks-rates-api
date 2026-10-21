import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS } from "@/lib/bankRatesData";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();

    const bank = ALL_61_BANKS.find(
      (b) => b.short_code.toUpperCase() === cleanCode || b.bank_id.toUpperCase() === cleanCode
    );

    if (!bank) {
      return NextResponse.json(
        {
          status: "not_found",
          message: `Bank with short code or ID '${code}' not found in 61 scheduled banks.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        as_of_date: new Date().toISOString().split("T")[0],
        bank,
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
