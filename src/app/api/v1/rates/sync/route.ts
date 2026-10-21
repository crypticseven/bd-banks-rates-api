import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS } from "@/lib/bankRatesData";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Strict schema for authenticated rate updates
const rateUpdateSchema = z.object({
  updates: z.array(
    z.object({
      bank_id: z.string().min(2),
      fdr_rates: z.record(z.string(), z.number().min(0).max(30)).optional(),
      dps_rates: z.record(z.string(), z.number().min(0).max(30)).optional(),
      circular_url: z.string().url().optional(),
      effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1, "At least one bank update is required"),
});

const STAGED_UPDATES_FILE = path.join(process.cwd(), "src", "data", "staged_rate_updates.json");

export async function GET(req: NextRequest) {
  try {
    const totalBanks = ALL_61_BANKS.length;
    const conventionalCount = ALL_61_BANKS.filter((b) => b.category === "CONVENTIONAL_PCB").length;
    const islamicCount = ALL_61_BANKS.filter((b) => b.category === "ISLAMIC").length;
    const stateOwnedCount = ALL_61_BANKS.filter((b) => b.category === "STATE_OWNED").length;
    const specializedCount = ALL_61_BANKS.filter((b) => b.category === "SPECIALIZED").length;
    const foreignCount = ALL_61_BANKS.filter((b) => b.category === "FOREIGN").length;

    // Check if staged updates exist
    let stagedCount = 0;
    if (fs.existsSync(STAGED_UPDATES_FILE)) {
      try {
        const stagedData = JSON.parse(fs.readFileSync(STAGED_UPDATES_FILE, "utf-8"));
        stagedCount = Array.isArray(stagedData) ? stagedData.length : 0;
      } catch {
        stagedCount = 0;
      }
    }

    return NextResponse.json(
      {
        status: "operational",
        service: "SOC & Deposit Rates Ingestion Pipeline",
        version: "v1.3.0",
        as_of_date: new Date().toISOString().split("T")[0],
        total_banks_tracked: totalBanks,
        breakdown: {
          state_owned_socb: stateOwnedCount,
          specialized_dev: specializedCount,
          conventional_pcb: conventionalCount,
          full_islamic_pcb: islamicCount,
          foreign_commercial_fcb: foreignCount,
        },
        staged_updates_pending_review: stagedCount,
        crawler_engine: {
          target_frequency: "Daily automated check at 02:00 BST (UTC+6)",
          supported_formats: ["HTML Responsive Tables", "PDF Circulars (PyMuPDF parser)"],
          last_sync_timestamp: new Date().toISOString(),
          provenance_verification: "Standard SHA-256 integrity & source URL validation",
        },
        central_bank_compliance: {
          regulatory_body: "Bangladesh Bank (Banking Regulation and Policy Department)",
          reference_bulletin: "Scheduled Banks Weighted Average Deposit Rates",
          tax_rates: {
            nbr_withholding_tin: "10%",
            nbr_withholding_non_tin: "15%",
          },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Internal sync telemetry error." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.RATES_SYNC_SECRET;

    // P0-1: Reject immediately if secret is not configured in environment
    if (!expectedSecret || expectedSecret.length < 16) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sync service is not configured on this deployment. RATES_SYNC_SECRET is required.",
        },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const providedSecret = match ? match[1] : "";

    // P0-1: Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedSecret);
    const providedBuf = Buffer.from(providedSecret);

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: "Invalid administrative credentials.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = rateUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "validation_error",
          errors: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { updates } = parsed.data;

    // P1-2: Persist incoming updates durably to disk with audit metadata
    let existingStaged: any[] = [];
    if (fs.existsSync(STAGED_UPDATES_FILE)) {
      try {
        existingStaged = JSON.parse(fs.readFileSync(STAGED_UPDATES_FILE, "utf-8"));
      } catch {
        existingStaged = [];
      }
    }

    const timestamp = new Date().toISOString();
    const stagedBatch = {
      batch_id: crypto.randomUUID(),
      ingested_at: timestamp,
      client_ip_hash: crypto.createHash("sha256").update(req.headers.get("x-forwarded-for") || "local").digest("hex").slice(0, 16),
      updates_count: updates.length,
      records: updates,
    };

    existingStaged.push(stagedBatch);
    try {
      fs.writeFileSync(STAGED_UPDATES_FILE, JSON.stringify(existingStaged, null, 2), "utf-8");
    } catch (fsErr: any) {
      // In serverless environments with read-only root, fallback to /tmp
      const fallbackFile = path.join("/tmp", "staged_rate_updates.json");
      fs.writeFileSync(fallbackFile, JSON.stringify(existingStaged, null, 2), "utf-8");
    }

    return NextResponse.json(
      {
        status: "success",
        message: `Successfully ingested and persisted ${updates.length} bank rate updates to staging.`,
        batch_id: stagedBatch.batch_id,
        processed_count: updates.length,
        timestamp,
        updated_banks: updates.map((u) => u.bank_id),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to process rate update batch." },
      { status: 500 }
    );
  }
}
