-- ── sale_group_id column ─────────────────────────────────────────────────────
-- Groups sales recorded in the same session (multi-item bill) together.
-- Nullable: existing sales (recorded before this migration) will have NULL.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_group_id UUID;
