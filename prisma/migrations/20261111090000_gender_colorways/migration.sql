-- Men's / women's / unisex catalog, real colorway names, colorway groups and image attribution.
CREATE TYPE "Gender" AS ENUM ('MEN', 'WOMEN', 'UNISEX');

ALTER TABLE "Product"
  ADD COLUMN "colorway" TEXT,
  ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'UNISEX',
  ADD COLUMN "styleGroup" TEXT,
  ADD COLUMN "imageCredit" TEXT,
  ADD COLUMN "imageSourceUrl" TEXT;

CREATE INDEX "Product_gender_idx" ON "Product"("gender");
CREATE INDEX "Product_styleGroup_idx" ON "Product"("styleGroup");
