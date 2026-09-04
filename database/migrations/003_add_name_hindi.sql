-- Add name_hindi column to products and categories
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_hindi TEXT;

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name_hindi TEXT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
