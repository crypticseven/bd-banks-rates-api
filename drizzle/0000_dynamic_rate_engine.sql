CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "circular_status" AS ENUM ('VERIFIED', 'QUARANTINED', 'SUPERSEDED');
CREATE TYPE "product_status" AS ENUM ('ACTIVE', 'DISCONTINUED');
CREATE TYPE "ledger_event_type" AS ENUM ('PRODUCT_INAUGURATED', 'RATE_REVISED', 'RATE_UNCHANGED', 'PRODUCT_DISCONTINUED');

CREATE TABLE "banks" (
  "bank_code" varchar(10) PRIMARY KEY,
  "bank_name" varchar(100) NOT NULL,
  "category" varchar(30) NOT NULL,
  "credit_rating" varchar(10),
  "stability_tier" varchar(30),
  "npl_ratio" numeric(5, 2),
  "official_soc_url" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "treasury_circulars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bank_code" varchar(10) NOT NULL REFERENCES "banks"("bank_code"),
  "circular_number" varchar(100),
  "document_url" text NOT NULL,
  "sha256_hash" varchar(64) NOT NULL UNIQUE,
  "effective_date" date NOT NULL,
  "fetched_at" timestamptz NOT NULL,
  "confidence_score" numeric(4, 3) NOT NULL,
  "status" "circular_status" NOT NULL DEFAULT 'QUARANTINED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "deposit_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bank_code" varchar(10) NOT NULL REFERENCES "banks"("bank_code"),
  "circular_id" uuid NOT NULL REFERENCES "treasury_circulars"("id"),
  "product_slug" varchar(100) NOT NULL,
  "product_prefix" varchar(20),
  "official_product_name" varchar(200) NOT NULL,
  "product_type" varchar(30) NOT NULL,
  "target_segment" varchar(50) NOT NULL,
  "tenure_months" integer,
  "tenure_display" varchar(50) NOT NULL,
  "headline_rate" numeric(5, 2),
  "compounding_frequency" varchar(20) NOT NULL DEFAULT 'MATURITY',
  "min_amount" numeric(14, 2),
  "max_amount" numeric(14, 2),
  "instant_encashment" boolean NOT NULL DEFAULT false,
  "shariah_compliant" boolean NOT NULL DEFAULT false,
  "status" "product_status" NOT NULL DEFAULT 'ACTIVE',
  "last_verified_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "deposit_products_bank_product_tenure_uq"
    UNIQUE ("bank_code", "product_slug", "tenure_months")
);

CREATE TABLE "rate_change_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "deposit_products"("id"),
  "circular_id" uuid NOT NULL REFERENCES "treasury_circulars"("id"),
  "event_type" "ledger_event_type" NOT NULL,
  "old_rate" numeric(5, 2),
  "new_rate" numeric(5, 2),
  "delta_bps" integer NOT NULL DEFAULT 0,
  "changed_at" timestamptz NOT NULL DEFAULT now()
);
