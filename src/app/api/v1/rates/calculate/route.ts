import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateNetMaturity } from "@/lib/ratesCalculator";

export const runtime = "nodejs";

const inputSchema = z.object({
  principal: z.coerce.number().finite().positive().max(1_000_000_000),
  annual_rate: z.coerce.number().finite().min(0).max(100),
  tenure_months: z.coerce.number().int().min(1).max(600),
  payment_frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "MATURITY"]),
  has_tin: z.boolean().default(true),
}).strict();

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const parsed = inputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "INVALID_CALCULATION_INPUT", errors: parsed.error.format(), request_id: requestId },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const result = calculateNetMaturity({
      principal: parsed.data.principal,
      annualRate: parsed.data.annual_rate,
      tenureMonths: parsed.data.tenure_months,
      paymentFrequency: parsed.data.payment_frequency,
      hasTin: parsed.data.has_tin,
    });
    return NextResponse.json(
      { status: "success", data_status: "calculated_from_supplied_terms", result, request_id: requestId },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  } catch {
    return NextResponse.json(
      { status: "error", code: "CALCULATION_FAILED", message: "Could not calculate net maturity.", request_id: requestId },
      { status: 400, headers: { "X-Request-ID": requestId } }
    );
  }
}
