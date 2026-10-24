import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™)",
      version: "1.0.0",
      description:
        "Authoritative real-time deposit rates, Schedule of Charges (SOC), and regulatory risk audits across all 61 Scheduled Commercial Banks licensed under Bangladesh Bank (Bank Company Act 1991). Implements Penny-Perfect NBR Tax & Bangladesh Bank Statutory Excise Duty calculations with cryptographic SHA-256 evidence anchoring.",
      termsOfService: "https://fardinanik.com/terms",
      contact: {
        name: "Fardin Ahsan Anik (Chief Architect & Sole Proprietor)",
        email: "fardinahsananik@gmail.com",
        url: "https://fardinanik.com",
      },
      license: {
        name: "Proprietary Commercial Closed Source (All Rights Reserved © 2024–2026)",
        url: "https://fardinanik.com/license",
      },
    },
    servers: [
      {
        url: "/",
        description: "Active Environment (Relative Path)",
      },
      {
        url: "https://api.fardinanik.com",
        description: "Production Gateway",
      },
    ],
    security: [
      {
        ApiKeyAuth: [],
      },
      {
        BearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Credential handshake token (e.g. bdrip_demo_eval_2026 or commercial key)",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bearer authentication token",
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            timestamp: { type: "string", format: "date-time" },
            trademark: { type: "string" },
            licensing: { type: "string" },
            as_of_date: { type: "string" },
            request_id: { type: "string" },
          },
          required: ["status", "timestamp"],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            code: { type: "string", example: "UNAUTHORIZED_ACCESS" },
            message: { type: "string", example: "Valid API key is required." },
            timestamp: { type: "string", format: "date-time" },
            request_id: { type: "string" },
          },
          required: ["status", "code", "message"],
        },
        MaturityBreakdown: {
          type: "object",
          properties: {
            scheme_code: { type: "string", example: "UCB_FDR_RETAIL_GEN_1Y" },
            scheme_name: { type: "string", example: "Retail UCB Earning Plus (Monthly Payout FD) - 12 Months" },
            declared_rate_pct: { type: "number", example: 10.5 },
            gross_interest_bdt: { type: "number", example: 52500 },
            nbr_tds_deduction_bdt: { type: "number", example: 5250 },
            bb_excise_duty_bdt: { type: "number", example: 500 },
            net_interest_bdt: { type: "number", example: 46750 },
            net_maturity_payout_bdt: { type: "number", example: 546750 },
            effective_net_yield_pct: { type: "number", example: 9.35 },
          },
          required: [
            "scheme_code",
            "declared_rate_pct",
            "gross_interest_bdt",
            "nbr_tds_deduction_bdt",
            "bb_excise_duty_bdt",
            "net_interest_bdt",
            "net_maturity_payout_bdt",
            "effective_net_yield_pct",
          ],
        },
      },
    },
    paths: {
      "/api/health": {
        get: {
          summary: "Liveness and Uptime Health Probe",
          description: "Returns health status, uptime, node version, memory metrics, and 61-bank dataset verification status.",
          security: [],
          responses: {
            "200": {
              description: "System is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "healthy" },
                      service: { type: "string", example: "bd-banks-rates-api" },
                      version: { type: "string", example: "1.0.0" },
                      uptime_seconds: { type: "number" },
                      dataset: {
                        type: "object",
                        properties: {
                          total_banks: { type: "integer", example: 61 },
                          verified_official_banks: { type: "integer", example: 61 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/rates/deposits": {
        get: {
          summary: "Granular Deposit Rates & Penny-Perfect Maturity Matrix",
          description:
            "Core high-performance query endpoint. Returns real-time deposit rates, CAMELS risk ratings, and penny-perfect NBR TDS & statutory excise duty calculations for all 61 scheduled banks.",
          parameters: [
            {
              name: "principal",
              in: "query",
              description: "Principal deposit amount in BDT (e.g. 500000)",
              schema: { type: "number", default: 500000 },
            },
            {
              name: "tenure",
              in: "query",
              description: "Deposit duration (3_months, 6_months, 1_year, 2_years, 3_years, 5_years)",
              schema: { type: "string", enum: ["3_months", "6_months", "1_year", "2_years", "3_years", "5_years"], default: "1_year" },
            },
            {
              name: "has_tin",
              in: "query",
              description: "Whether depositor has verified e-TIN (10% TDS) or no TIN (15% TDS)",
              schema: { type: "boolean", default: true },
            },
            {
              name: "category",
              in: "query",
              description: "Regulatory category filter",
              schema: { type: "string", enum: ["ALL", "SOCB", "PCB", "FOREIGN", "SPECIALIZED"], default: "ALL" },
            },
            {
              name: "sort_by",
              in: "query",
              description: "Ranking algorithm",
              schema: { type: "string", enum: ["risk_adjusted", "rate_desc", "rate_asc", "rating", "npl_asc"], default: "risk_adjusted" },
            },
            {
              name: "shariah",
              in: "query",
              description: "Filter strictly for Islamic Shariah-compliant banks and windows",
              schema: { type: "boolean" },
            },
            {
              name: "q",
              in: "query",
              description: "Search query for bank name, short code, or product name",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Successful query execution",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/StandardSuccessResponse" },
                      {
                        type: "object",
                        properties: {
                          query_context: {
                            type: "object",
                            properties: {
                              principal_bdt: { type: "number" },
                              tenure: { type: "string" },
                              category: { type: "string" },
                              has_tin: { type: "boolean" },
                              tds_rate_applied: { type: "string" },
                              statutory_excise_duty_bdt: { type: "number" },
                              sort_by: { type: "string" },
                            },
                          },
                          top_ranked_bank: {
                            type: "object",
                            properties: {
                              bank_id: { type: "string" },
                              bank_code: { type: "string" },
                              bank_name: { type: "string" },
                              credit_rating: { type: "string" },
                              confidence_score: { type: "number" },
                              verified_source: { type: "string" },
                              evidence_sha256: { type: "string" },
                              best_matching_scheme: { $ref: "#/components/schemas/MaturityBreakdown" },
                            },
                          },
                          products: {
                            type: "array",
                            items: { type: "object" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Invalid query parameters",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "401": {
              description: "Missing or invalid API key credential handshake",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
            "429": {
              description: "Rate limit exceeded (Token bucket replenishment pending)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
            },
          },
        },
      },
      "/api/v1/rates/banks": {
        get: {
          summary: "Full 61-Bank Directory & Health Indices",
          description: "Returns the complete regulatory roster of all 61 Scheduled Commercial Banks with publication patterns, NPL ratios, CAR, and CAMELS ratings.",
          responses: {
            "200": { description: "Directory returned successfully" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/v1/rates/banks/{code}": {
        get: {
          summary: "Single Bank Deep Profile & Rate Catalog",
          description: "Returns granular bank details, all active FDR & DPS schemes, primary circular URLs, and SHA-256 evidence.",
          parameters: [
            {
              name: "code",
              in: "path",
              required: true,
              description: "Bank short code (e.g. UCB, CBL, CBC, MTB, PUBALI)",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Bank profile returned successfully" },
            "404": { description: "Bank not found" },
          },
        },
      },
      "/api/v1/rates/benchmarks": {
        get: {
          summary: "Bangladesh Bank Monetary & Policy Benchmarks",
          description: "Returns central bank policy rate (repo), reverse repo, standing lending facility (SLF), call money rate, and SMART reference benchmark.",
          responses: {
            "200": { description: "Benchmarks returned successfully" },
          },
        },
      },
      "/api/v1/rates/calculate": {
        get: {
          summary: "Dedicated Penny-Perfect Maturity Calculator Endpoint",
          description: "Computes compound or simple interest, NBR TDS deduction, and BB Excise Duty for arbitrary rates, amounts, and tenures.",
          parameters: [
            { name: "principal", in: "query", required: true, schema: { type: "number" } },
            { name: "rate", in: "query", required: true, schema: { type: "number" } },
            { name: "tenure_months", in: "query", required: true, schema: { type: "integer" } },
            { name: "has_tin", in: "query", schema: { type: "boolean", default: true } },
          ],
          responses: {
            "200": { description: "Calculation successful" },
            "400": { description: "Invalid parameters" },
          },
        },
      },
      "/api/v1/rates/sync": {
        post: {
          summary: "Protected Autonomous Ingestion & Rate Update Sync",
          description: "Administrative ingestion endpoint protected by timing-safe RATES_SYNC_SECRET handshake. Validates and merges newly discovered bank rate circulars.",
          security: [{ ApiKeyAuth: [] }],
          responses: {
            "200": { description: "Rates synced successfully" },
            "401": { description: "Unauthorized handshake token" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
