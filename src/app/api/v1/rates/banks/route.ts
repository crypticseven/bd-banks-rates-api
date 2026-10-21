import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS } from "@/lib/bankRatesData";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const shariah = searchParams.get("shariah");

    let banks = [...ALL_61_BANKS];

    if (category && category !== "ALL") {
      banks = banks.filter((b) => b.category === category);
    }

    if (shariah !== null && shariah !== undefined) {
      const isShariah = shariah === "true";
      banks = banks.filter((b) => b.is_shariah === isShariah);
    }

    const directory = banks.map((b) => ({
      bank_id: b.bank_id,
      bank_name: b.bank_name,
      short_code: b.short_code,
      category: b.category,
      is_shariah: b.is_shariah,
      has_islamic_window: b.has_islamic_window,
      instant_encashment: b.instant_encashment,
      headquarters: b.headquarters,
      soc_url: b.soc_url,
    }));

    return NextResponse.json(
      {
        status: "success",
        total: directory.length,
        data: directory,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to list banks." },
      { status: 500 }
    );
  }
}
