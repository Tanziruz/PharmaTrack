-- ── parties table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── supplier_name columns ─────────────────────────────────────────────────────
ALTER TABLE purchases     ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE stocks        ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE to_be_ordered ADD COLUMN IF NOT EXISTS supplier_name TEXT;
