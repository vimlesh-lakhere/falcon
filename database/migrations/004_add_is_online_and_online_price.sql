-- Migration: Add is_online and online_price to products table
-- Allows shop owners to manage which products appear on their public online storefront

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS online_price NUMERIC(10, 2) DEFAULT NULL;

-- Update existing products to have is_online = true by default
UPDATE products
SET is_online = true
WHERE is_online IS NULL;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
