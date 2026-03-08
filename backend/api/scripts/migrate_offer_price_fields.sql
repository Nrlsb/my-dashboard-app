-- Migration: Add discount_percentage and offer_price to product_offer_status
-- Run this once against DB2 (the secondary PostgreSQL database)

ALTER TABLE product_offer_status
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS offer_price NUMERIC(12, 2) DEFAULT NULL;
