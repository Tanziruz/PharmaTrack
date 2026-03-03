-- ============================================================
-- Migration 001: Add quantity_needed to to_be_ordered
-- Run this in the Supabase SQL Editor if you already ran
-- the original schema.sql.
-- ============================================================

-- 1. Add the new column (safe to run multiple times: IF NOT EXISTS)
ALTER TABLE to_be_ordered
  ADD COLUMN IF NOT EXISTS quantity_needed INTEGER NOT NULL DEFAULT 0;

-- 2. Update the trigger function to populate quantity_needed
--    = units sold in the transaction that triggered the flag
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
