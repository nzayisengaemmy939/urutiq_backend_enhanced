-- Update all existing products to have type 'PRODUCT'
UPDATE Product SET type = 'PRODUCT';

-- Verify the changes
SELECT name, sku, type FROM Product LIMIT 10;
