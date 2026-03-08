-- Migration: Add is_offer to orders and discount_percentage to order_items
-- Run this once against DB2 (the secondary PostgreSQL database)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT FALSE;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT NULL;
