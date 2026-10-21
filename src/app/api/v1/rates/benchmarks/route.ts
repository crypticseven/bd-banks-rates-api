import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  if (process.env.ALLOW_UNVERIFIED_DATA !== "true") {
    return NextResponse.json(
      {
        status: "error",
        code: "DATASET_NOT_VERIFIED",
        message: "Benchmark data is blocked until its dated authoritative source is verified.",
        request_id: requestId,
      },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
    );
  }

  return NextResponse.json(
    {
      status: "unverified",
      data_status: "unverified_static_snapshot",
      as_of_date: null,
      source_url: "https://www.bb.org.bd/monetaryactivity/mps/mps_q2fy27.pdf",
      regulatory_authority: "Bangladesh Bank (Central Bank of Bangladesh)",
      monetary_policy_benchmarks: {
        policy_repo_rate: 9.50,
        standing_lending_facility_slf: 11.00,
        standing_deposit_facility_sdf: 7.50,
        interbank_call_money_rate_avg: 9.85,
      },
      statutory_reserve_requirements: {
        cash_reserve_ratio_crr: "4.00%",
        statutory_liquidity_ratio_slr_conventional: "13.00%",
        statutory_liquidity_ratio_slr_islamic: "5.50%",
      },
      withholding_tax_regime: {
        statutory_body: "National Board of Revenue (NBR)",
        individual_with_tin: "10.00%",
        individual_without_tin: "15.00%",
        company_deposits: "20.00%",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400",
        "X-Request-ID": requestId,
      },
    }
  );
}
