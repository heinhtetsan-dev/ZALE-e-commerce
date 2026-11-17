import { Router, type Response } from "express";
import { facetsQuery, productListQuery, slugParam } from "./product.schemas.js";
import { getFacets, getProductBySlug, listProducts } from "./product.service.js";

export const productRouter = Router();

// Public catalog responses are cacheable by browsers and CDNs for a short time.
const cachePublic = (res: Response, seconds: number) =>
  res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);

productRouter.get("/", async (req, res) => {
  const query = productListQuery.parse(req.query);
  cachePublic(res, 30);
  res.json(await listProducts(query));
});

productRouter.get("/facets", async (req, res) => {
  cachePublic(res, 120);
  res.json(await getFacets(facetsQuery.parse(req.query).gender));
});

productRouter.get("/:slug", async (req, res) => {
  const { slug } = slugParam.parse(req.params);
  // Stock changes frequently: let caches revalidate every time.
  res.set("Cache-Control", "no-cache");
  res.json(await getProductBySlug(slug));
});
