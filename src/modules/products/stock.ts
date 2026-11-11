import { prisma } from "../../lib/prisma.js";
import { bySize } from "./product.serializer.js";

export interface StockShortage {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  size: string;
  requested: number;
  available: number;
  alternatives: Array<{ variantId: string; size: string; stock: number }>;
}

/**
 * Builds the OUT_OF_STOCK payload: current availability for each failing line
 * plus other sizes of the same product that still have stock.
 */
export async function describeShortages(lines: Array<{ variantId: string; requested: number }>): Promise<StockShortage[]> {
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          variants: { where: { stock: { gt: 0 } }, select: { id: true, size: true, stock: true } },
        },
      },
    },
  });
  return lines.flatMap((line) => {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v) return [];
    return [
      {
        variantId: v.id,
        productId: v.product.id,
        productName: v.product.name,
        productSlug: v.product.slug,
        size: v.size,
        requested: line.requested,
        available: v.stock,
        alternatives: bySize(v.product.variants)
          .filter((alt) => alt.id !== v.id)
          .map((alt) => ({ variantId: alt.id, size: alt.size, stock: alt.stock })),
      },
    ];
  });
}

export const shortageMessage = (s: StockShortage[]) => {
  const parts = s.map((x) =>
    x.available === 0
      ? `${x.productName} in size ${x.size} is sold out`
      : `Only ${x.available} left of ${x.productName} in size ${x.size}`,
  );
  return `${parts.join(". ")}.`;
};
