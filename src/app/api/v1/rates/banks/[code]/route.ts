import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, DATASET_PROVENANCE } from "@/lib/bankRatesData";

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
          code: "BANK_NOT_FOUND",
          message: `Bank with short code or ID '${code}' not found in 61 scheduled banks.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: "unverified",
        data_status: "unverified_static_snapshot",
        as_of_date: DATASET_PROVENANCE.effective_date,
        provenance: DATASET_PROVENANCE,
        bank: { ...bank, provenance: DATASET_PROVENANCE },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", code: "BANK_READ_FAILED", message: "Failed to fetch bank details." },
      { status: 500 }
    );
  }
}
