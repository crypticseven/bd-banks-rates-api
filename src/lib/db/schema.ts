import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const circularStatus = pgEnum("circular_status", [
  "VERIFIED",
  "QUARANTINED",
  "SUPERSEDED",
]);

export const productStatus = pgEnum("product_status", [
  "ACTIVE",
  "DISCONTINUED",
]);

export const ledgerEventType = pgEnum("ledger_event_type", [
  "PRODUCT_INAUGURATED",
  "RATE_REVISED",
  "RATE_UNCHANGED",
  "PRODUCT_DISCONTINUED",
]);

export const banks = pgTable("banks", {
  bankCode: varchar("bank_code", { length: 10 }).primaryKey(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  creditRating: varchar("credit_rating", { length: 10 }),
  stabilityTier: varchar("stability_tier", { length: 30 }),
  nplRatio: numeric("npl_ratio", { precision: 5, scale: 2 }),
  officialSocUrl: text("official_soc_url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treasuryCirculars = pgTable("treasury_circulars", {
  id: uuid("id").primaryKey().defaultRandom(),
  bankCode: varchar("bank_code", { length: 10 })
    .notNull()
    .references(() => banks.bankCode),
  circularNumber: varchar("circular_number", { length: 100 }),
  documentUrl: text("document_url").notNull(),
  sha256Hash: varchar("sha256_hash", { length: 64 }).notNull().unique(),
  effectiveDate: date("effective_date").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 }).notNull(),
  status: circularStatus("status").notNull().default("QUARANTINED"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const depositProducts = pgTable("deposit_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  bankCode: varchar("bank_code", { length: 10 })
    .notNull()
    .references(() => banks.bankCode),
  circularId: uuid("circular_id")
    .notNull()
    .references(() => treasuryCirculars.id),
  productSlug: varchar("product_slug", { length: 100 }).notNull(),
  productPrefix: varchar("product_prefix", { length: 20 }),
  officialProductName: varchar("official_product_name", { length: 200 }).notNull(),
  productType: varchar("product_type", { length: 30 }).notNull(),
  targetSegment: varchar("target_segment", { length: 50 }).notNull(),
  tenureMonths: integer("tenure_months"),
  tenureDisplay: varchar("tenure_display", { length: 50 }).notNull(),
  headlineRate: numeric("headline_rate", { precision: 5, scale: 2 }),
  compoundingFrequency: varchar("compounding_frequency", { length: 20 })
    .notNull()
    .default("MATURITY"),
  minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
  instantEncashment: boolean("instant_encashment").notNull().default(false),
  shariahCompliant: boolean("shariah_compliant").notNull().default(false),
  status: productStatus("status").notNull().default("ACTIVE"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateChangeLedger = pgTable("rate_change_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => depositProducts.id),
  circularId: uuid("circular_id")
    .notNull()
    .references(() => treasuryCirculars.id),
  eventType: ledgerEventType("event_type").notNull(),
  oldRate: numeric("old_rate", { precision: 5, scale: 2 }),
  newRate: numeric("new_rate", { precision: 5, scale: 2 }),
  deltaBps: integer("delta_bps").notNull().default(0),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
