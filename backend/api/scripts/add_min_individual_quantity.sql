-- Migración: Añadir min_individual_quantity a product_offer_status
-- Ejecutra esto una vez contra DB2 (PostgreSQL)

ALTER TABLE product_offer_status 
  ADD COLUMN IF NOT EXISTS min_individual_quantity INTEGER DEFAULT 0;
