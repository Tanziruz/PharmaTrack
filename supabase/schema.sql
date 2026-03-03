-- ============================================================
-- PharmaTrack — Supabase Schema
-- Run this in the Supabase SQL Editor (once, in order)
-- ============================================================

-- ── 1. Enum ─────────────────────────────────────────────────
CREATE TYPE reorder_reason AS ENUM (
  'low_stock',
  'out_of_stock',
  'expiring_soon',
  'manual'
);

-- ── 2. stocks ───────────────────────────────────────────────
-- One row per medicine-batch; tracks live inventory.
CREATE TABLE stocks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name      TEXT NOT NULL,
  batch_number       TEXT NOT NULL UNIQUE,
  mrp                NUMERIC(10,2) NOT NULL,
  expiry_date        DATE NOT NULL,
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  reorder_level      INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. purchases ────────────────────────────────────────────
-- Immutable log of incoming stock batches.
CREATE TABLE purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name   TEXT NOT NULL,
  batch_number    TEXT NOT NULL,
  mrp             NUMERIC(10,2) NOT NULL,
  expiry_date     DATE NOT NULL,
  quantity_bought INTEGER NOT NULL CHECK (quantity_bought > 0),
  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. sales ────────────────────────────────────────────────
-- Immutable log of outgoing sales.
CREATE TABLE sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name  TEXT NOT NULL,
  batch_number   TEXT NOT NULL,
  mrp            NUMERIC(10,2) NOT NULL,
  selling_price  NUMERIC(10,2) NOT NULL,
  expiry_date    DATE NOT NULL,
  quantity_sold  INTEGER NOT NULL CHECK (quantity_sold > 0),
  sale_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. to_be_ordered ────────────────────────────────────────
-- Auto-populated by triggers + manually addable.
CREATE TABLE to_be_ordered (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_name   TEXT NOT NULL,
  batch_number    TEXT,
  reason          reorder_reason NOT NULL DEFAULT 'manual',
  notes           TEXT,
  quantity_needed INTEGER NOT NULL DEFAULT 0,  -- units to reorder (= units sold that triggered this)
  is_ordered      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. Helper: auto-update updated_at ───────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. Trigger: purchases → upsert stocks ───────────────────
-- When a purchase is recorded, increase or create the stock row.
CREATE OR REPLACE FUNCTION fn_purchase_upsert_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO stocks (medicine_name, batch_number, mrp, expiry_date, quantity_available)
  VALUES (NEW.medicine_name, NEW.batch_number, NEW.mrp, NEW.expiry_date, NEW.quantity_bought)
  ON CONFLICT (batch_number) DO UPDATE
    SET quantity_available = stocks.quantity_available + NEW.quantity_bought,
        mrp                = NEW.mrp,
        expiry_date        = NEW.expiry_date,
        updated_at         = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_purchase_upsert_stock
  AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION fn_purchase_upsert_stock();

-- ── 8. Trigger: sales → decrement stocks ────────────────────
CREATE OR REPLACE FUNCTION fn_sale_decrement_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE stocks
  SET quantity_available = GREATEST(0, quantity_available - NEW.quantity_sold),
      updated_at         = now()
  WHERE batch_number = NEW.batch_number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_decrement_stock
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION fn_sale_decrement_stock();

-- ── 9. Trigger: stocks change → auto-populate to_be_ordered ─
CREATE OR REPLACE FUNCTION fn_stock_check_reorder()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_qty_needed INTEGER;
BEGIN
  -- Units sold in this transaction (UPDATE) or units short of reorder level (INSERT)
  IF TG_OP = 'UPDATE' THEN
    v_qty_needed := GREATEST(OLD.quantity_available - NEW.quantity_available, 0);
  ELSE
    v_qty_needed := GREATEST(NEW.reorder_level - NEW.quantity_available, 0);
  END IF;

  -- Out of stock
  IF NEW.quantity_available = 0 THEN
    INSERT INTO to_be_ordered (medicine_name, batch_number, reason, quantity_needed)
    VALUES (NEW.medicine_name, NEW.batch_number, 'out_of_stock', v_qty_needed)
    ON CONFLICT DO NOTHING;

  -- Low stock (but not zero)
  ELSIF NEW.quantity_available < NEW.reorder_level AND NEW.quantity_available > 0 THEN
    INSERT INTO to_be_ordered (medicine_name, batch_number, reason, quantity_needed)
    VALUES (NEW.medicine_name, NEW.batch_number, 'low_stock', v_qty_needed)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Expiring within 60 days
  IF NEW.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN
    INSERT INTO to_be_ordered (medicine_name, batch_number, reason, quantity_needed)
    VALUES (NEW.medicine_name, NEW.batch_number, 'expiring_soon', v_qty_needed)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_check_reorder
  AFTER INSERT OR UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION fn_stock_check_reorder();

-- ── 10. Enable Row Level Security (open policies for single-user) ──
ALTER TABLE stocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_be_ordered ENABLE ROW LEVEL SECURITY;

-- Allow all for the anon/publishable key (single-user app, no auth)
CREATE POLICY "allow_all" ON stocks        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON purchases     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON sales         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON to_be_ordered FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 11. Realtime: enable for all tables ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE stocks;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE to_be_ordered;
