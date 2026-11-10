import { z } from "zod";

export const MAX_LINE_QUANTITY = 10;

const quantity = z.number().int().min(1).max(MAX_LINE_QUANTITY, `You can buy at most ${MAX_LINE_QUANTITY} of one size`);

export const addItemBody = z.object({
  variantId: z.uuid("Please select a size"),
  quantity: quantity.default(1),
});

export const updateItemBody = z.object({ quantity });

export const itemIdParam = z.object({ itemId: z.uuid() });

export const mergeBody = z.object({
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(99) })).max(50),
});
