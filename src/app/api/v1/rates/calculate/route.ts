import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateNetMaturity, findProductById, PaymentFrequency } from "@/lib/ratesCalculator";

export const runtime = "nodejs";

const inputSchema = z
  .object({
    product_id: z.string().optional(),
    productId: z.string().optional(),
    principal: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
    depositAmount: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
    annual_rate: z.coerce.number().finite().min(0).max(100).optional(),
    tenure_months: z.coerce.number().int().min(1).max(600).optional(),
    payment_frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "MATURITY"]).default("MATURITY"),
    has_tin: z.boolean().default(true),
    hasTin: z.boolean().optional(),
    isSeniorCitizen: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const rawBody = await req.json();
    const parsed = inputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "INVALID_CALCULATION_INPUT", errors: parsed.error.format(), request_id: requestId },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const data = parsed.data;
    const targetProductId = data.product_id || data.productId;
    const principal = data.principal || data.depositAmount || 100_000;
    const hasTin = data.hasTin !== undefined ? data.hasTin : data.has_tin;

    // Check if product_id is provided
    if (targetProductId) {
      const match = findProductById(targetProductId);
      if (!match) {
        return NextResponse.json(
          {
            status: "error",
            code: "PRODUCT_NOT_FOUND",
            message: `Product '${targetProductId}' not found in verified registry.`,
            request_id: requestId,
          },
          { status: 404, headers: { "X-Request-ID": requestId } }
        );
      }

      const { product, bank } = match;
      const annualRate = data.annual_rate ?? product.headline_rate;
      const tenureMonths = data.tenure_months ?? (product.best_tenure === "1_year" ? 12 : product.best_tenure === "5_years" ? 60 : 12);
      const paymentFrequency: PaymentFrequency = data.payment_frequency || "MATURITY";

      const result = calculateNetMaturity({
        principal,
        annualRate,
        tenureMonths,
        paymentFrequency,
        hasTin,
        shariahCompliant: bank.is_shariah || false,
        productName: product.product_name,
        bankCode: bank.short_code,
      });

      return NextResponse.json(
        {
          status: "success",
          data_status: "calculated_from_verified_product",
          product_id: product.product_id,
          result,
          request_id: requestId,
        },
        { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }

    // Custom calculation from supplied terms
    if (!data.annual_rate || !data.tenure_months) {
      return NextResponse.json(
        {
          status: "error",
          code: "MISSING_REQUIRED_TERMS",
          message: "Provide either a 'product_id' or explicit 'annual_rate' and 'tenure_months'.",
          request_id: requestId,
        },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const result = calculateNetMaturity({
      principal,
      annualRate: data.annual_rate,
      tenureMonths: data.tenure_months,
      paymentFrequency: data.payment_frequency,
      hasTin,
    });

    return NextResponse.json(
      {
        status: "success",
        data_status: "calculated_from_supplied_terms",
        result,
        request_id: requestId,
      },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        code: "CALCULATION_FAILED",
        message: err.message || "Could not calculate net maturity.",
        request_id: requestId,
      },
      { status: 400, headers: { "X-Request-ID": requestId } }
    );
  }
}
