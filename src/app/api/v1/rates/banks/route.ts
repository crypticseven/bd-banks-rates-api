import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, DATASET_PROVENANCE } from "@/lib/bankRatesData";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = z.object({
      category: z.enum(["ALL", "STATE_OWNED", "SPECIALIZED", "CONVENTIONAL_PCB", "ISLAMIC", "FOREIGN"]).default("ALL"),
      shariah: z.enum(["true", "false"]).optional(),
    }).safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ status: "error", code: "INVALID_QUERY", errors: parsed.error.format() }, { status: 400 });
    }
    const { category, shariah } = parsed.data;

    let banks = [...ALL_61_BANKS];

    if (category !== "ALL") {
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
        status: "unverified",
        data_status: "unverified_static_snapshot",
        provenance: DATASET_PROVENANCE,
        total: directory.length,
        data: directory,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", code: "BANK_DIRECTORY_READ_FAILED", message: "Failed to list banks." },
      { status: 500 }
    );
  }
}
