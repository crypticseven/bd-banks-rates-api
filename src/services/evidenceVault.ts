/**
 * Component 2: Immutable Raw Evidence Vault
 * Cryptographically registers raw files/DOM snapshots before parsing.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface RawEvidenceArtifact {
  sourceId: string;
  bankCode: string;
  sourceUrl: string;
  sourceType: "HTML_DOM" | "PDF_CIRCULAR" | "BB_REGULATORY_BULLETIN";
  authority: "BANK_OFFICIAL" | "BANGLADESH_BANK" | "NBR";
  httpStatus: number;
  etag?: string;
  lastModified?: string;
  sha256Hash: string;
  artifactStoragePath: string;
  retrievedAt: string;
  accessStatus: "RETRIEVED" | "ACCESS_BLOCKED" | "STALE_FALLBACK" | "FAILED" | "RETRIEVED_VIA_STEALTH_DRILL";
}

const VAULT_ROOT = path.resolve(process.cwd(), "data", "vault");
const INDEX_FILE = path.resolve(process.cwd(), "data", "evidence_vault_index.json");

function ensureVaultDir(): void {
  if (!fs.existsSync(VAULT_ROOT)) {
    fs.mkdirSync(VAULT_ROOT, { recursive: true });
  }
}

function loadIndex(): RawEvidenceArtifact[] {
  ensureVaultDir();
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, "utf-8");
    return JSON.parse(raw) as RawEvidenceArtifact[];
  } catch {
    return [];
  }
}

function saveIndex(items: RawEvidenceArtifact[]): void {
  ensureVaultDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export function depositArtifact(
  bankCode: string,
  rawContent: Buffer | string,
  meta: {
    sourceUrl: string;
    sourceType: "HTML_DOM" | "PDF_CIRCULAR" | "BB_REGULATORY_BULLETIN";
    authority: "BANK_OFFICIAL" | "BANGLADESH_BANK" | "NBR";
    httpStatus: number;
    accessStatus?: "RETRIEVED" | "ACCESS_BLOCKED" | "STALE_FALLBACK" | "FAILED" | "RETRIEVED_VIA_STEALTH_DRILL";
    etag?: string;
    lastModified?: string;
  }
): RawEvidenceArtifact {
  ensureVaultDir();

  const buffer = typeof rawContent === "string" ? Buffer.from(rawContent, "utf-8") : rawContent;
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = meta.sourceType === "PDF_CIRCULAR" ? "pdf" : "html";

  const bankVaultDir = path.join(VAULT_ROOT, bankCode.toUpperCase());
  if (!fs.existsSync(bankVaultDir)) {
    fs.mkdirSync(bankVaultDir, { recursive: true });
  }

  const filename = `${new Date().toISOString().slice(0, 10)}_${sha256.slice(0, 16)}.${ext}`;
  const storagePath = path.join(bankVaultDir, filename);

  // Write content if not already exists (idempotent write)
  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, buffer);
  }

  const artifact: RawEvidenceArtifact = {
    sourceId: crypto.randomUUID(),
    bankCode: bankCode.toUpperCase(),
    sourceUrl: meta.sourceUrl,
    sourceType: meta.sourceType,
    authority: meta.authority,
    httpStatus: meta.httpStatus,
    etag: meta.etag,
    lastModified: meta.lastModified,
    sha256Hash: sha256,
    artifactStoragePath: storagePath,
    retrievedAt: new Date().toISOString(),
    accessStatus: meta.accessStatus || "RETRIEVED",
  };

  const index = loadIndex();
  // Upsert by sha256
  const existingIdx = index.findIndex((a) => a.sha256Hash === sha256 && a.bankCode === artifact.bankCode);
  if (existingIdx >= 0) {
    index[existingIdx] = artifact;
  } else {
    index.push(artifact);
  }
  saveIndex(index);

  return artifact;
}

export function getArtifactByHash(sha256: string): RawEvidenceArtifact | undefined {
  const index = loadIndex();
  return index.find((a) => a.sha256Hash === sha256);
}

export function getArtifactsForBank(bankCode: string): RawEvidenceArtifact[] {
  const index = loadIndex();
  return index.filter((a) => a.bankCode === bankCode.toUpperCase());
}
