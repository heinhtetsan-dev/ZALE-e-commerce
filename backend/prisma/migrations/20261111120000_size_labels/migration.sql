-- Clothing sizes are labels ("XS", "M", "32", "One Size"), not EU shoe numbers.
-- Existing numeric sizes are kept as text without a trailing ".0".
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_size_positive";

ALTER TABLE "ProductVariant" ALTER COLUMN "size" TYPE TEXT
  USING (CASE WHEN "size" = trunc("size") THEN trunc("size")::int::text ELSE "size"::text END);
ALTER TABLE "OrderItem" ALTER COLUMN "size" TYPE TEXT
  USING (CASE WHEN "size" = trunc("size") THEN trunc("size")::int::text ELSE "size"::text END);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_size_label" CHECK (length(btrim("size")) BETWEEN 1 AND 20);
