// Product photography from Unsplash (free to use under the Unsplash License).
// Every photo was reviewed: product-only shots, no faces, no third-party logos
// on house-label items. Served from Unsplash's image CDN, cropped to 3:4.
export interface CatalogImage {
  url: string;
  credit: string;
  source: string;
}

const unsplash = (id: string): CatalogImage => ({
  url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&h=1333&q=80`,
  credit: "Unsplash",
  source: "https://unsplash.com/license",
});

/** Site-relative images are served by the storefront itself (frontend/public). */
const local = (path: string, credit: string): CatalogImage => ({ url: path, credit, source: "" });

export const catalogImages: Record<string, CatalogImage> = {
  "knit-ivory": unsplash("photo-1621198059871-0d5f9b449233"),
  "knit-rust": unsplash("photo-1773747203295-dc002c421c33"),
  "longsleeve-white": unsplash("photo-1620799140408-edc6dcb6d633"),
  "linen-dress-ivory": unsplash("photo-1789110520302-3df8ce0410f0"),
  "shirt-dress-terracotta": unsplash("photo-1789110853872-f416085557fa"),
  "shirt-dress-terracotta-back": unsplash("photo-1789110853833-bc1a883da2d6"),
  "sundress-mint": unsplash("photo-1789110519607-6176d668fb72"),
  "ribbed-top-lilac": unsplash("photo-1789111161316-1cf7e753b4ad"),
  "blazer-white": unsplash("photo-1784822041387-98638a7c08c3"),
  "coat-mustard": unsplash("photo-1565532070333-43edd7d75c90"),
  "denim-set": unsplash("photo-1708523842501-1619478cea1f"),
  "sandal-gold": unsplash("photo-1789110519321-f598dd52c7fd"),
  "sandal-black": unsplash("photo-1789110519274-5613cdc02fb2"),
  "heels-nude": unsplash("photo-1621996659490-3275b4d0d951"),
  "af1-pastel": unsplash("photo-1595950653106-6c9ebd614d3a"),
  "rain-boots": unsplash("photo-1711922323948-d486b4e9490d"),
  "satchel-grey": unsplash("photo-1605733513597-a8f8341084e6"),
  "bag-yellow": unsplash("photo-1640901555383-7335ec5a6476"),
  "tote-woven": unsplash("photo-1524679813234-66a389fe1a42"),
  "tote-white": unsplash("photo-1615206928955-ce0ffbb7ca5a"),
  "jeans-mid": unsplash("photo-1714143136372-ddaf8b606da7"),
  "jeans-dark": unsplash("photo-1714143164072-7646ef5cb24d"),
  "jeans-black": unsplash("photo-1718252540511-e958742e4165"),
  "trucker-dark": unsplash("photo-1611312449408-fcece27cdbb7"),
  "biker-black": unsplash("photo-1727515546577-f7d82a47b51d"),
  "biker-black-back": unsplash("photo-1727518154538-59e7dc479f8f"),
  "leather-cognac": unsplash("photo-1623854156816-4c4fc355ffc7"),
  "blazer-black": unsplash("photo-1592343516109-362f7bd871aa"),
  "blazer-check": unsplash("photo-1598915850252-fb07ad1e6768"),
  "hoodie-charcoal": unsplash("photo-1655141559697-f927ed68170c"),
  "shirt-white": unsplash("photo-1621773881532-fe65715b5137"),
  "monk-strap": unsplash("photo-1533867617858-e7b97e060509"),
  "brogues": unsplash("photo-1777987601431-8d27d2039cc4"),
  "derby-tan": unsplash("photo-1449505278894-297fdb3edbc1"),
  "chelsea-black": unsplash("photo-1534233812932-59b8fa1b780c"),
  "brogue-boots": unsplash("photo-1534233650908-b471f2350922"),
  "penny-loafers": unsplash("photo-1675947258177-aa8120ddefa3"),
  "nike-air-max": unsplash("photo-1600185365483-26d7a4cc7519"),
  "nike-free-red": unsplash("photo-1542291026-7eec264c27ff"),
  "belt-cognac": unsplash("photo-1624222247344-550fb60583dc"),
  "tee-white": unsplash("photo-1620799139507-2a76f79a2f4d"),
  "tee-white-hanger": unsplash("photo-1581655353564-df123a1eb820"),
  "cable-knit-green": unsplash("photo-1670603917227-3fd6882dbf97"),
  "puma-white": unsplash("photo-1608229751021-ed4bd8677753"),
  "backpack-navy": unsplash("photo-1553062407-98eeb64c6a62"),
  "backpack-leather": unsplash("photo-1622560480605-d83c853bc5c3"),
  "wayfarer": unsplash("photo-1572635196237-14b3f281503f"),
  "aviator-gold": unsplash("photo-1589642380614-4a8c2147b857"),
  "sunglasses-round": unsplash("photo-1584036553516-bf83210aa16c"),
  "mom-jeans": local("/catalog/mom-jeans-light-wash.jpg", "ZALE studio"),
};
