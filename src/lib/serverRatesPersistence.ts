import banksData from "@/data/bangladesh_61_banks.json";
import { BankRateRecord } from "@/lib/bankRatesData";
import fs from "fs";
import path from "path";

// Active in-memory cache of the 61 banks for server runtime
let activeBanksServer: BankRateRecord[] = JSON.parse(JSON.stringify(banksData)) as BankRateRecord[];

const TMP_OVERLAY_FILE = path.join("/tmp", "bangladesh_61_banks_overlay.json");

// Attempt to load serverless overlay if available
try {
  if (typeof process !== "undefined" && fs.existsSync(TMP_OVERLAY_FILE)) {
    const raw = fs.readFileSync(TMP_OVERLAY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 61) {
      activeBanksServer = parsed;
    }
  }
} catch {
  // Graceful fallback to static baseline
}

export function getActiveBanksServer(): BankRateRecord[] {
  return activeBanksServer;
}

export function applyRateUpdates(updates: Array<{
  bank_id: string;
  fdr_rates?: Record<string, number>;
  dps_rates?: Record<string, number>;
  circular_url?: string;
  effective_date?: string;
  notes?: string;
}>): { updatedCount: number; updatedBanks: string[] } {
  let count = 0;
  const updatedBankCodes: string[] = [];

  for (const upd of updates) {
    const target = activeBanksServer.find(
      (b) =>
        b.bank_id.toLowerCase() === upd.bank_id.toLowerCase() ||
        b.short_code.toLowerCase() === upd.bank_id.toLowerCase()
    );

    if (target) {
      if (upd.fdr_rates) {
        target.fdr_rates = { ...target.fdr_rates, ...upd.fdr_rates } as any;
      }
      if (upd.dps_rates) {
        target.dps_rates = { ...target.dps_rates, ...upd.dps_rates } as any;
      }
      if (upd.circular_url) {
        target.source_url = upd.circular_url;
      }
      if (upd.effective_date) {
        target.effective_date = upd.effective_date;
      }
      target.fetched_at = new Date().toISOString();
      target.verification_status = "VERIFIED_OFFICIAL";

      // Recalculate risk-adjusted yield score
      const rate1y = target.fdr_rates["1_year"] || 0;
      target.risk_adjusted_yield_score = Number(
        (rate1y * Math.pow(target.rating_score / 5.0, 0.65)).toFixed(2)
      );

      count++;
      updatedBankCodes.push(target.short_code);
    }
  }

  // Persist to disk if writable (local dev or VPS)
  try {
    const diskPath = path.join(process.cwd(), "src", "data", "bangladesh_61_banks.json");
    if (fs.existsSync(diskPath)) {
      fs.writeFileSync(diskPath, JSON.stringify(activeBanksServer, null, 2), "utf-8");
    }
  } catch {
    // Read-only filesystem fallback
  }

  // Also persist to serverless /tmp overlay
  try {
    fs.writeFileSync(TMP_OVERLAY_FILE, JSON.stringify(activeBanksServer, null, 2), "utf-8");
  } catch {
    // Ignored in non-serverless or permission-restricted environments
  }

  return { updatedCount: count, updatedBanks: updatedBankCodes };
}
