-- Add type column to Product table if it doesn't exist
ALTER TABLE Product ADD COLUMN type TEXT DEFAULT 'PRODUCT';

-- Update all existing products to have type 'PRODUCT'
UPDATE Product SET type = 'PRODUCT' WHERE type IS NULL OR type = '';

-- Verify the changes
SELECT name, sku, type FROM Product LIMIT 10;
