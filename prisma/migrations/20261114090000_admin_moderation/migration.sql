-- Admins can disable customer accounts and refund orders.
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMPTZ(3);
ALTER TABLE "Order" ADD COLUMN "refundedAt" TIMESTAMPTZ(3);
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
