-- Add mrp and wholesale_min_qty columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS wholesale_min_qty NUMERIC(10, 2) DEFAULT 12;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
