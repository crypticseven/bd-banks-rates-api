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
    rate: z.coerce.number().finite().min(0).max(100).optional(),
    tenure_months: z.coerce.number().int().min(1).max(600).optional(),
    tenure: z.string().optional(),
    payment_frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "MATURITY"]).default("MATURITY"),
    has_tin: z.coerce.boolean().default(true),
    hasTin: z.coerce.boolean().optional(),
    isSeniorCitizen: z.coerce.boolean().optional(),
  });

function parseTenureMonths(tenureStr?: string, defaultMonths: number = 12): number {
  if (!tenureStr) return defaultMonths;
  const map: Record<string, number> = {
    "1_month": 1,
    "3_months": 3,
    "6_months": 6,
    "1_year": 12,
    "2_years": 24,
    "3_years": 36,
    "5_years": 60,
  };
  return map[tenureStr] || parseInt(tenureStr, 10) || defaultMonths;
}

function processCalculation(data: z.infer<typeof inputSchema>, requestId: string) {
  const targetProductId = data.product_id || data.productId;
  const principal = data.principal || data.depositAmount || 100_000;
  const hasTin = data.hasTin !== undefined ? data.hasTin : data.has_tin;
  const annualRate = data.annual_rate ?? data.rate;
  const tenureMonths = data.tenure_months ?? parseTenureMonths(data.tenure, 12);
  const paymentFrequency: PaymentFrequency = data.payment_frequency || "MATURITY";

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
    const rate = annualRate ?? product.headline_rate;
    const months = tenureMonths ?? (product.best_tenure === "1_year" ? 12 : product.best_tenure === "5_years" ? 60 : 12);

    const result = calculateNetMaturity({
      principal,
      annualRate: rate,
      tenureMonths: months,
      paymentFrequency,
      hasTin,
      shariahCompliant: bank.is_shariah || false,
      productName: product.product_name,
      bankCode: bank.short_code,
    });

    const calculation = {
      principal: result.principal,
      gross_interest_amount: result.gross_interest,
      nbr_tax_deducted: result.withholding_tax,
      statutory_excise_duty: result.excise_duty,
      net_maturity_amount: result.net_payable_maturity_amount,
      net_interest_amount: result.net_profit,
      effective_net_yield_pct: Number(((result.net_profit / result.principal) * (12 / (result.tenure_months || 12)) * 100).toFixed(2)),
    };

    return NextResponse.json(
      {
        status: "success",
        data_status: "calculated_from_verified_product",
        product_id: product.product_id,
        result,
        calculation,
        request_id: requestId,
      },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  if (annualRate === undefined || !tenureMonths) {
    return NextResponse.json(
      {
        status: "error",
        code: "MISSING_REQUIRED_TERMS",
        message: "Provide either a 'product_id' or explicit 'annual_rate' / 'rate' and 'tenure_months'.",
        request_id: requestId,
      },
      { status: 400, headers: { "X-Request-ID": requestId } }
    );
  }

  const result = calculateNetMaturity({
    principal,
    annualRate,
    tenureMonths,
    paymentFrequency,
    hasTin,
  });

  const calculation = {
    principal: result.principal,
    gross_interest_amount: result.gross_interest,
    nbr_tax_deducted: result.withholding_tax,
    statutory_excise_duty: result.excise_duty,
    net_maturity_amount: result.net_payable_maturity_amount,
    net_interest_amount: result.net_profit,
    effective_net_yield_pct: Number(((result.net_profit / result.principal) * (12 / (result.tenure_months || 12)) * 100).toFixed(2)),
  };

  return NextResponse.json(
    {
      status: "success",
      data_status: "calculated_from_supplied_terms",
      result,
      calculation,
      request_id: requestId,
    },
    { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
  );
}

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const rawObj: Record<string, any> = {};
    for (const [key, val] of searchParams.entries()) {
      rawObj[key] = val;
    }

    const parsed = inputSchema.safeParse(rawObj);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "INVALID_CALCULATION_INPUT", errors: parsed.error.format(), request_id: requestId },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    return processCalculation(parsed.data, requestId);
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", code: "CALCULATION_FAILED", message: err.message || "Calculation failed", request_id: requestId },
      { status: 400, headers: { "X-Request-ID": requestId } }
    );
  }
}

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

    return processCalculation(parsed.data, requestId);
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
