ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sale_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_sales_sale_group_id
  ON sales (sale_group_id);
