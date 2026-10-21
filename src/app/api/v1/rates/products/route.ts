import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { z } from "zod";

const productsQuerySchema = z.object({
  bank: z.string().trim().max(20).optional(),
  type: z.enum(["FDR", "DPS", "SPECIAL_SCHEME"]).optional(),
  segment: z
    .enum([
      "GENERAL_RETAIL",
      "WOMEN",
      "SENIOR_CITIZEN",
      "NRB_EXPATRIATE",
      "RETAIL_SAVINGS",
      "ISLAMIC_SHARIAH",
      "HNI_PREMIUM",
      "LONG_TERM",
    ])
    .optional(),
  min_rate: z.coerce.number().min(0).max(30).optional(),
  instant_encashment: z.enum(["true", "false"]).optional(),
  shariah: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const parsed = productsQuerySchema.safeParse(queryObj);
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

    const { bank, type, segment, min_rate, instant_encashment, shariah, q } = parsed.data;

    // Flatten all products across banks with parent bank context
    let flattenedProducts: any[] = [];
    for (const b of getActiveBanksServer()) {
      if (bank && b.short_code.toUpperCase() !== bank.toUpperCase() && b.bank_id.toUpperCase() !== bank.toUpperCase()) {
        continue;
      }

      for (const p of b.products || []) {
        flattenedProducts.push({
          ...p,
          bank_name: b.bank_name,
          short_code: b.short_code,
          category: b.category,
          bank_rating_score: b.rating_score,
          bank_credit_rating: b.credit_rating,
          bank_stability_tier: b.stability_tier,
          soc_url: b.soc_url,
        });
      }
    }

    // Apply product filters
    if (type) {
      flattenedProducts = flattenedProducts.filter((p) => p.product_type === type);
    }

    if (segment) {
      flattenedProducts = flattenedProducts.filter((p) => p.target_segment === segment);
    }

    if (min_rate !== undefined) {
      flattenedProducts = flattenedProducts.filter((p) => p.headline_rate >= min_rate);
    }

    if (instant_encashment !== undefined) {
      const boolVal = instant_encashment === "true";
      flattenedProducts = flattenedProducts.filter((p) => p.instant_encashment === boolVal);
    }

    if (shariah !== undefined) {
      const boolVal = shariah === "true";
      flattenedProducts = flattenedProducts.filter((p) => p.shariah_compliant === boolVal);
    }

    if (q && q.trim().length > 0) {
      const search = q.toLowerCase().trim();
      flattenedProducts = flattenedProducts.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search) ||
          p.bank_name.toLowerCase().includes(search) ||
          p.short_code.toLowerCase().includes(search) ||
          p.features.some((f: string) => f.toLowerCase().includes(search))
      );
    }

    // Sort by headline rate descending
    flattenedProducts.sort((a, b) => b.headline_rate - a.headline_rate);

    return NextResponse.json(
      {
        status: "success",
        total_products: flattenedProducts.length,
        top_product: flattenedProducts[0] || null,
        data: flattenedProducts,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to query products." },
      { status: 500 }
    );
  }
}
