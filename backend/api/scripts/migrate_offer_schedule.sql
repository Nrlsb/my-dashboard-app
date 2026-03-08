-- Migration: Add scheduling columns to product_offer_status
-- Run this on DB2 (pool2)

ALTER TABLE product_offer_status
  ADD COLUMN IF NOT EXISTS offer_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_end_date TIMESTAMPTZ;

-- Optional: index for fast scheduled offer queries
CREATE INDEX IF NOT EXISTS idx_offer_status_dates
  ON product_offer_status (is_on_offer, offer_start_date, offer_end_date);
