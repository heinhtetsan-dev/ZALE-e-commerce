/**
 * Demo fashion catalog for educational use. Every item has a professional
 * product-only photo (no people, no faces). Branded items are real products
 * whose photos show that brand; everything else uses the shop's own label
 * "ZALE Essentials" so no brand is claimed that the photo doesn't show.
 * Prices are typical retail prices in USD cents. Photos: see catalog-images.ts.
 * Shoes have no section of their own: they sit under Men / Women like any
 * other category.
 */
export type Gender = "MEN" | "WOMEN" | "UNISEX";

export type SizeRun =
  | "menTops"
  | "womenTops"
  | "unisexTops"
  | "menWaist"
  | "womenWaist"
  | "letters"
  | "menShoes"
  | "womenShoes"
  | "unisexShoes"
  | "oneSize";

export const sizeRuns: Record<SizeRun, string[]> = {
  menTops: ["S", "M", "L", "XL", "XXL"],
  womenTops: ["XS", "S", "M", "L", "XL"],
  unisexTops: ["XS", "S", "M", "L", "XL", "XXL"],
  menWaist: ["28", "30", "31", "32", "33", "34", "36", "38"],
  womenWaist: ["24", "25", "26", "27", "28", "29", "30", "31", "32"],
  letters: ["S", "M", "L", "XL"],
  // EU shoe sizes.
  menShoes: ["40", "41", "42", "43", "44", "45", "46"],
  womenShoes: ["36", "37", "38", "39", "40", "41"],
  unisexShoes: ["37", "38", "39", "40", "41", "42", "43", "44", "45"],
  oneSize: ["One Size"],
};

export const HOUSE_BRAND = "ZALE Essentials";
const Z = HOUSE_BRAND;

export const brands = [HOUSE_BRAND, "Nike", "Puma", "Ray-Ban"];

export const categories = [
  "Tops & T-Shirts",
  "Shirts",
  "Knitwear",
  "Hoodies & Sweatshirts",
  "Jackets & Coats",
  "Dresses",
  "Jeans",
  "Shoes",
  "Accessories",
];

export interface CatalogProduct {
  brand: string;
  model: string;
  /** Color name as sold, e.g. "Light Wash". */
  colorway: string;
  /** Base color used by the color filter. */
  color: string;
  gender: Gender;
  category: string;
  price: number;
  sizes: SizeRun;
  /** Keys into catalogImages. */
  images: string[];
  /** Products sharing a group are colors of the same item. */
  group: string;
  description: string;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** House-label items are named without the label ("Wool Swing Coat"); branded items keep it. */
export const productName = (c: CatalogProduct) => (c.brand === HOUSE_BRAND ? c.model : `${c.brand} ${c.model}`);

export const productSlug = (c: CatalogProduct) =>
  slugify(`${productName(c)} ${c.colorway} ${c.gender === "UNISEX" ? "" : c.gender === "MEN" ? "mens" : "womens"}`);

export const catalog: CatalogProduct[] = [
  // ---------------------------------------------------------------- women
  {
    brand: Z, model: "Chunky Knit Sweater", colorway: "Ivory", color: "White", gender: "WOMEN", category: "Knitwear", price: 8900, sizes: "womenTops", images: ["knit-ivory"], group: "chunky-knit",
    description: "A cosy oversized sweater in a chunky rib knit with dropped shoulders and a relaxed crew neck. Wool-blend yarn that keeps its shape wash after wash.",
  },
  {
    brand: Z, model: "Hand-Knit Crew Sweater", colorway: "Rust", color: "Orange", gender: "WOMEN", category: "Knitwear", price: 9900, sizes: "womenTops", images: ["knit-rust"], group: "hand-knit-crew",
    description: "A warm rust crew-neck knitted by hand in a soft wool blend, with ribbed cuffs and hem. Easy over a shirt collar or on its own with jeans.",
  },
  {
    brand: Z, model: "Long Sleeve Cotton Top", colorway: "White", color: "White", gender: "WOMEN", category: "Tops & T-Shirts", price: 3500, sizes: "womenTops", images: ["longsleeve-white"], group: "longsleeve-top",
    description: "A clean long-sleeve top in soft, mid-weight cotton jersey with a close crew neck. The layering piece that goes under everything.",
  },
  {
    brand: Z, model: "Sleeveless Shell Top", colorway: "Black", color: "Black", gender: "WOMEN", category: "Tops & T-Shirts", price: 3900, sizes: "womenTops", images: ["shell-top-black"], group: "shell-top",
    description: "A simple sleeveless top with a high round neck, cut from smooth crepe that drapes well. Tuck it into tailoring or wear it loose over jeans.",
  },
  {
    brand: Z, model: "Lace Midi Dress", colorway: "Ivory", color: "White", gender: "WOMEN", category: "Dresses", price: 12900, sizes: "womenTops", images: ["lace-dress"], group: "lace-midi",
    description: "A romantic midi dress in delicate floral lace over a soft lining, with a fitted bodice and a gently flared skirt.",
  },
  {
    brand: Z, model: "Embroidered Sleeveless Dress", colorway: "Floral", color: "Multicolor", gender: "WOMEN", category: "Dresses", price: 7900, sizes: "womenTops", images: ["embroidered-dress"], group: "embroidered-dress",
    description: "A breezy sleeveless dress with embroidered flowers across the bodice and a swingy skirt. Lightweight cotton for warm days.",
  },
  {
    brand: Z, model: "Strappy Sundress", colorway: "Mint Green", color: "Green", gender: "WOMEN", category: "Dresses", price: 6900, sizes: "womenTops", images: ["sundress-mint"], group: "strappy-sundress",
    description: "A light summer dress with thin adjustable straps, a smocked back and a relaxed skirt that falls just below the knee.",
  },
  {
    brand: Z, model: "Tailored Blazer", colorway: "White", color: "White", gender: "WOMEN", category: "Jackets & Coats", price: 14900, sizes: "womenTops", images: ["blazer-white"], group: "tailored-blazer-w",
    description: "A sharp single-breasted blazer with notch lapels, flap pockets and lightly padded shoulders. Fully lined and cut slightly longer to sit over trousers or dresses.",
  },
  {
    brand: Z, model: "Wool Swing Coat", colorway: "Mustard", color: "Yellow", gender: "WOMEN", category: "Jackets & Coats", price: 18900, sizes: "womenTops", images: ["coat-mustard"], group: "swing-coat",
    description: "A statement coat in warm mustard wool blend with an A-line swing shape, wide collar and deep pockets. Brightens every winter outfit.",
  },
  {
    brand: Z, model: "High-Rise Mom Jeans", colorway: "Light Wash", color: "Blue", gender: "WOMEN", category: "Jeans", price: 6900, sizes: "womenWaist", images: ["mom-jeans", "denim-set"], group: "mom-jeans",
    description: "Vintage-inspired mom jeans with a high waist, relaxed hip and tapered ankle. Rigid cotton denim in a soft light wash with a five-pocket finish.",
  },
  {
    brand: Z, model: "Strappy Heeled Sandals", colorway: "Gold", color: "Gold", gender: "WOMEN", category: "Shoes", price: 9900, sizes: "womenShoes", images: ["sandal-gold"], group: "heeled-sandals",
    description: "Delicate metallic sandals with fine crossover straps, an adjustable ankle strap and a slim 8 cm heel. Made for evenings out.",
  },
  {
    brand: Z, model: "Strappy Heeled Sandals", colorway: "Black", color: "Black", gender: "WOMEN", category: "Shoes", price: 9900, sizes: "womenShoes", images: ["sandal-black"], group: "heeled-sandals",
    description: "Delicate black sandals with fine crossover straps, an adjustable ankle strap and a slim 8 cm heel. The pair that goes with every dress.",
  },
  {
    brand: Z, model: "Pointed Leather Pumps", colorway: "Nude", color: "Beige", gender: "WOMEN", category: "Shoes", price: 11900, sizes: "womenShoes", images: ["heels-nude"], group: "pointed-pumps",
    description: "Classic pointed-toe pumps in smooth leather with a cushioned insole and a mid-height stiletto heel. A neutral shade that lengthens the leg.",
  },
  {
    brand: "Nike", model: "Air Force 1 '07", colorway: "Pastel", color: "Multicolor", gender: "WOMEN", category: "Shoes", price: 11500, sizes: "womenShoes", images: ["af1-pastel"], group: "nike-af1",
    description: "The 1982 basketball icon in soft pastel leather panels, with Nike Air cushioning in the sole and the classic perforated toe.",
  },
  {
    brand: Z, model: "Rain Boots", colorway: "Yellow", color: "Yellow", gender: "WOMEN", category: "Shoes", price: 5900, sizes: "womenShoes", images: ["rain-boots"], group: "rain-boots",
    description: "Waterproof natural-rubber wellies in a cheerful yellow, with a grippy sole and a comfortable lined footbed. Puddles welcome.",
  },
  {
    brand: Z, model: "Leather Satchel", colorway: "Grey", color: "Grey", gender: "WOMEN", category: "Accessories", price: 14900, sizes: "oneSize", images: ["satchel-grey"], group: "leather-satchel",
    description: "A structured satchel in pebbled leather with a top handle, a detachable shoulder strap and a zip pocket inside. Fits a tablet and the day's essentials.",
  },
  {
    brand: Z, model: "Structured Top-Handle Bag", colorway: "Yellow", color: "Yellow", gender: "WOMEN", category: "Accessories", price: 11900, sizes: "oneSize", images: ["bag-yellow"], group: "top-handle-bag",
    description: "A compact top-handle bag in bright yellow leather with a flap closure and gold-tone hardware. Adds colour to a neutral outfit.",
  },
  {
    brand: Z, model: "Leather Tote", colorway: "White", color: "White", gender: "WOMEN", category: "Accessories", price: 13900, sizes: "oneSize", images: ["tote-white"], group: "leather-tote",
    description: "A roomy tote in soft white leather with sturdy shoulder handles and an inner zip pocket. Big enough for a laptop.",
  },
  {
    brand: Z, model: "Woven Straw Tote", colorway: "Natural", color: "Beige", gender: "WOMEN", category: "Accessories", price: 6900, sizes: "oneSize", images: ["tote-woven"], group: "straw-tote",
    description: "A hand-woven straw tote with leather handles. Light, roomy and made for market mornings and beach days.",
  },

  // ------------------------------------------------------------------ men
  {
    brand: Z, model: "Slim Jeans", colorway: "Mid Blue", color: "Blue", gender: "MEN", category: "Jeans", price: 7900, sizes: "menWaist", images: ["jeans-mid"], group: "slim-jeans",
    description: "Slim through the seat and thigh with a slightly tapered leg. Cotton denim with a touch of stretch in an easy mid-blue wash.",
  },
  {
    brand: Z, model: "Slim Jeans", colorway: "Dark Indigo", color: "Blue", gender: "MEN", category: "Jeans", price: 7900, sizes: "menWaist", images: ["jeans-dark"], group: "slim-jeans",
    description: "Our slim jean in a deep indigo rinse that dresses up as easily as down. Cotton denim with a touch of stretch.",
  },
  {
    brand: Z, model: "Slim Jeans", colorway: "Black", color: "Black", gender: "MEN", category: "Jeans", price: 7900, sizes: "menWaist", images: ["jeans-black"], group: "slim-jeans",
    description: "Our slim jean in solid black denim that holds its colour. Slim through the thigh with a slightly tapered leg.",
  },
  {
    brand: Z, model: "Denim Trucker Jacket", colorway: "Dark Wash", color: "Blue", gender: "MEN", category: "Jackets & Coats", price: 9900, sizes: "menTops", images: ["trucker-dark"], group: "trucker-jacket",
    description: "A classic trucker jacket in heavyweight dark denim, with button-flap chest pockets and adjustable waist tabs. Gets better with every wear.",
  },
  {
    brand: Z, model: "Leather Biker Jacket", colorway: "Black", color: "Black", gender: "MEN", category: "Jackets & Coats", price: 29900, sizes: "menTops", images: ["biker-black", "biker-black-back"], group: "biker-jacket",
    description: "An asymmetric-zip biker jacket in supple black lambskin, with a quilted lining, zip cuffs and a belted waist. A lifetime piece.",
  },
  {
    brand: Z, model: "Leather Jacket", colorway: "Cognac", color: "Brown", gender: "MEN", category: "Jackets & Coats", price: 27900, sizes: "menTops", images: ["leather-cognac"], group: "leather-jacket",
    description: "A clean-lined leather jacket in rich cognac with a shirt collar, zip front and side pockets. Develops a beautiful patina over time.",
  },
  {
    brand: Z, model: "Wool Blazer", colorway: "Black", color: "Black", gender: "MEN", category: "Jackets & Coats", price: 17900, sizes: "menTops", images: ["blazer-black"], group: "wool-blazer",
    description: "A single-breasted two-button blazer in fine wool, half lined with a soft shoulder. Wears with a suit trouser or dark jeans.",
  },
  {
    brand: Z, model: "Check Blazer", colorway: "Grey Check", color: "Grey", gender: "MEN", category: "Jackets & Coats", price: 16900, sizes: "menTops", images: ["blazer-check"], group: "check-blazer",
    description: "A relaxed blazer in a soft wool-blend check with patch pockets and a natural shoulder. Smart without trying too hard.",
  },
  {
    brand: Z, model: "Zip-Through Hoodie", colorway: "Charcoal", color: "Grey", gender: "MEN", category: "Hoodies & Sweatshirts", price: 6500, sizes: "menTops", images: ["hoodie-charcoal"], group: "zip-hoodie",
    description: "A heavyweight brushed-back fleece hoodie with a full zip, lined hood and kangaroo pockets. The everyday layer.",
  },
  {
    brand: Z, model: "Short Sleeve Cotton Shirt", colorway: "White", color: "White", gender: "MEN", category: "Shirts", price: 4900, sizes: "menTops", images: ["shirt-white"], group: "short-sleeve-shirt",
    description: "A crisp short-sleeve shirt in breathable cotton poplin with a point collar and a straight hem made to wear untucked.",
  },
  {
    brand: Z, model: "Double Monk Strap Shoes", colorway: "Brown", color: "Brown", gender: "MEN", category: "Shoes", price: 15900, sizes: "menShoes", images: ["monk-strap"], group: "monk-strap",
    description: "Polished calf leather double monks with burnished toes, twin buckle straps and a Goodyear-welted leather sole.",
  },
  {
    brand: Z, model: "Brogue Oxford Shoes", colorway: "Brown", color: "Brown", gender: "MEN", category: "Shoes", price: 14900, sizes: "menShoes", images: ["brogues"], group: "brogue-oxford",
    description: "Full-brogue oxfords in hand-finished brown leather with a wingtip toe and closed lacing. Smart enough for a suit, relaxed enough for chinos.",
  },
  {
    brand: Z, model: "Leather Derby Shoes", colorway: "Tan", color: "Brown", gender: "MEN", category: "Shoes", price: 13900, sizes: "menShoes", images: ["derby-tan"], group: "derby-shoes",
    description: "Open-laced derbies in smooth tan leather with a rounded toe and a light rubber-studded sole for everyday comfort.",
  },
  {
    brand: Z, model: "Chelsea Boots", colorway: "Black", color: "Black", gender: "MEN", category: "Shoes", price: 16900, sizes: "menShoes", images: ["chelsea-black"], group: "chelsea-boots",
    description: "Sleek pull-on Chelsea boots in black leather with elastic side gussets, a pull tab and a durable rubber sole.",
  },
  {
    brand: Z, model: "Lace-Up Brogue Boots", colorway: "Tan", color: "Brown", gender: "MEN", category: "Shoes", price: 17900, sizes: "menShoes", images: ["brogue-boots"], group: "brogue-boots",
    description: "Ankle boots with brogue detailing in rich tan leather, speed-hook lacing and a chunky commando sole for wet streets.",
  },
  {
    brand: Z, model: "Penny Loafers", colorway: "Burgundy", color: "Red", gender: "MEN", category: "Shoes", price: 13900, sizes: "menShoes", images: ["penny-loafers"], group: "penny-loafers",
    description: "Classic penny loafers in deep burgundy leather with a hand-sewn moc toe and a leather sole. Slip on with or without socks.",
  },
  {
    brand: "Nike", model: "Air Max", colorway: "White/Orange", color: "White", gender: "MEN", category: "Shoes", price: 14000, sizes: "menShoes", images: ["nike-air-max"], group: "nike-air-max",
    description: "Nike's visible-Air running icon with a breathable mesh upper, leather overlays and a cushioned heel unit for all-day comfort.",
  },
  {
    brand: "Nike", model: "Free Run Flyknit", colorway: "University Red", color: "Red", gender: "MEN", category: "Shoes", price: 12000, sizes: "menShoes", images: ["nike-free-red"], group: "nike-free",
    description: "A sock-like Flyknit upper on Nike's flexible Free sole, which moves with your foot for a barefoot-like ride.",
  },
  {
    brand: Z, model: "Leather Belt", colorway: "Cognac", color: "Brown", gender: "MEN", category: "Accessories", price: 4500, sizes: "letters", images: ["belt-cognac"], group: "leather-belt",
    description: "A 3.5 cm belt cut from full-grain vegetable-tanned leather with a brushed metal buckle. Ages beautifully.",
  },

  // --------------------------------------------------------------- unisex
  {
    brand: Z, model: "Classic Crew Tee", colorway: "White", color: "White", gender: "UNISEX", category: "Tops & T-Shirts", price: 2900, sizes: "unisexTops", images: ["tee-white", "tee-white-hanger"], group: "crew-tee",
    description: "The perfect white tee: mid-weight combed cotton, a neat ribbed crew neck and a straight fit that holds its shape.",
  },
  {
    brand: Z, model: "Cable Knit Sweater", colorway: "Forest Green", color: "Green", gender: "UNISEX", category: "Knitwear", price: 9500, sizes: "unisexTops", images: ["cable-knit-green"], group: "cable-knit",
    description: "A heritage cable-knit jumper in deep forest green lambswool with a ribbed crew neck. Warm, soft and made to last.",
  },
  {
    brand: "Puma", model: "Leather Court Sneaker", colorway: "White", color: "White", gender: "UNISEX", category: "Shoes", price: 9900, sizes: "unisexShoes", images: ["puma-white"], group: "puma-court",
    description: "A clean low-top court sneaker in smooth white leather with a perforated toe, padded collar and rubber cupsole.",
  },
  {
    brand: Z, model: "Everyday Backpack", colorway: "Navy", color: "Blue", gender: "UNISEX", category: "Accessories", price: 6900, sizes: "oneSize", images: ["backpack-navy"], group: "everyday-backpack",
    description: "A water-resistant canvas backpack with a padded laptop sleeve, a front zip pocket and comfortable padded straps.",
  },
  {
    brand: Z, model: "Leather Backpack", colorway: "Brown", color: "Brown", gender: "UNISEX", category: "Accessories", price: 15900, sizes: "oneSize", images: ["backpack-leather"], group: "leather-backpack",
    description: "A rucksack in thick brown leather with buckled straps, a drawstring top and brass hardware. Softens and darkens with use.",
  },
  {
    brand: "Ray-Ban", model: "Original Wayfarer Classic", colorway: "Black", color: "Black", gender: "UNISEX", category: "Accessories", price: 16300, sizes: "oneSize", images: ["wayfarer"], group: "rayban-wayfarer",
    description: "The 1952 shape that became a design classic: black acetate frame with green G-15 lenses and full UV protection.",
  },
  {
    brand: Z, model: "Aviator Sunglasses", colorway: "Gold", color: "Gold", gender: "UNISEX", category: "Accessories", price: 5900, sizes: "oneSize", images: ["aviator-gold"], group: "aviator",
    description: "Teardrop aviators with a lightweight gold-tone metal frame, adjustable nose pads and UV400 lenses.",
  },
  {
    brand: Z, model: "Round Sunglasses", colorway: "Black", color: "Black", gender: "UNISEX", category: "Accessories", price: 4900, sizes: "oneSize", images: ["sunglasses-round"], group: "round-sunglasses",
    description: "Retro round sunglasses with a slim black frame and dark tinted UV400 lenses.",
  },
];
