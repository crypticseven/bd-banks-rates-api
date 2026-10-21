import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { z } from "zod";

const banksQuerySchema = z.object({
  category: z
    .enum(["ALL", "STATE_OWNED", "SPECIALIZED", "CONVENTIONAL_PCB", "ISLAMIC", "FOREIGN"])
    .optional(),
  shariah: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const parsed = banksQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "bad_request",
          message: "Invalid query parameters.",
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { category, shariah } = parsed.data;

    let banks = [...getActiveBanksServer()];

    if (category && category !== "ALL") {
      banks = banks.filter((b) => b.category === category);
    }

    if (shariah !== undefined) {
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
      source_url: b.source_url,
      effective_date: b.effective_date,
      verification_status: b.verification_status,
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
