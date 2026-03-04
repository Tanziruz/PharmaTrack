-- ============================================================
-- Migration 002: Drop DB triggers that duplicate server-action logic
-- 
-- The Next.js server actions now handle all stock updates and
-- to_be_ordered population directly. Keeping the DB triggers
-- alongside the server-action code causes double-writes
-- (e.g. purchasing 12 units shows 24 in stock).
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- Drop purchase → stock upsert trigger
DROP TRIGGER IF EXISTS trg_purchase_upsert_stock ON purchases;
DROP FUNCTION IF EXISTS fn_purchase_upsert_stock();

-- Drop sale → stock decrement trigger
DROP TRIGGER IF EXISTS trg_sale_decrement_stock ON sales;
DROP FUNCTION IF EXISTS fn_sale_decrement_stock();

-- Drop stock change → to_be_ordered trigger
DROP TRIGGER IF EXISTS trg_stock_check_reorder ON stocks;
DROP FUNCTION IF EXISTS fn_stock_check_reorder();

-- Keep: trg_stocks_updated_at / set_updated_at (harmless timestamp helper)
