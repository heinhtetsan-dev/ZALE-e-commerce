/**
 * Demo fashion catalog for educational use. Branded items are real products
 * whose photos show that brand; generic items use the shop's own label
 * "Stride Essentials" so no brand is claimed that the photo doesn't show.
 * Prices are typical retail prices in USD cents. Photos come from Wikimedia
 * Commons (see catalog-images.ts) with the attribution their licenses require.
 */
export type Gender = "MEN" | "WOMEN" | "UNISEX";

export type SizeRun = "menTops" | "womenTops" | "unisexTops" | "menWaist" | "womenWaist" | "letters" | "capFit" | "oneSize";

export const sizeRuns: Record<SizeRun, string[]> = {
  menTops: ["S", "M", "L", "XL", "XXL"],
  womenTops: ["XS", "S", "M", "L", "XL"],
  unisexTops: ["XS", "S", "M", "L", "XL", "XXL"],
  menWaist: ["28", "30", "31", "32", "33", "34", "36", "38"],
  womenWaist: ["24", "25", "26", "27", "28", "29", "30", "31", "32"],
  letters: ["S", "M", "L", "XL"],
  capFit: ["S/M", "M/L", "L/XL"],
  oneSize: ["One Size"],
};

export const brands = [
  "Stride Essentials",
  "Levi's",
  "Polo Ralph Lauren",
  "Lacoste",
  "Fred Perry",
  "Barbour",
  "Carhartt",
  "Schott NYC",
  "Adidas",
  "The North Face",
  "Nike",
  "7 For All Mankind",
  "New Era",
  "Ray-Ban",
  "Randers Handsker",
  "HiMountain",
];

export const categories = [
  "T-Shirts & Polos",
  "Shirts & Blouses",
  "Hoodies & Sweatshirts",
  "Knitwear",
  "Jackets & Coats",
  "Jeans",
  "Trousers",
  "Dresses",
  "Skirts",
  "Activewear",
  "Accessories",
];

export interface CatalogProduct {
  brand: string;
  model: string;
  /** Color name as sold, e.g. "Medium Stonewash". */
  colorway: string;
  /** Base color used by the color filter. */
  color: string;
  gender: Gender;
  category: string;
  price: number;
  sizes: SizeRun;
  /** Keys into commonsImages (contact-sheet numbers). */
  images: number[];
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

export const productSlug = (c: CatalogProduct) =>
  slugify(`${c.brand} ${c.model} ${c.colorway} ${c.gender === "UNISEX" ? "" : c.gender === "MEN" ? "mens" : "womens"}`);

const E = "Stride Essentials";

export const catalog: CatalogProduct[] = [
  // ------------------------------------------------------------------ men
  {
    brand: "Levi's", model: "501 Original Fit Jeans", colorway: "Medium Stonewash", color: "Blue", gender: "MEN", category: "Jeans", price: 7950, sizes: "menWaist", images: [1], group: "levis-501",
    description: "The original button-fly jean, made by Levi's since the 1870s. Straight leg, regular fit through the seat and thigh, 100% cotton denim and the Red Tab on the back pocket.",
  },
  {
    brand: "Levi's", model: "501 Original Fit Jeans", colorway: "Light Indigo Destructed", color: "Blue", gender: "MEN", category: "Jeans", price: 8950, sizes: "menWaist", images: [0], group: "levis-501",
    description: "The classic 501 in a light, broken-in wash with rips and repairs at the knees for a lived-in look. Button fly, straight leg and rigid cotton denim that softens with every wear.",
  },
  {
    brand: "Levi's", model: "Trucker Jacket", colorway: "Medium Stonewash", color: "Blue", gender: "MEN", category: "Jackets & Coats", price: 9800, sizes: "menTops", images: [2, 3], group: "levis-trucker",
    description: "The denim jacket Levi's introduced in 1967: pointed chest-pocket flaps, V-seams down the front and adjustable waist tabs. Layers over a tee in summer and under a coat in winter.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Stadium Print Short-Sleeve Shirt", colorway: "Multi Print", color: "Multicolor", gender: "MEN", category: "Shirts & Blouses", price: 14800, sizes: "menTops", images: [4], group: "rl-stadium",
    description: "Inspired by Ralph Lauren's 1992 Stadium collection, this relaxed camp-collar shirt is covered in a bold sporting print. Lightweight cotton with a straight hem made to be worn untucked.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Classic Fit Madras Shirt", colorway: "Blue Madras Plaid", color: "Blue", gender: "MEN", category: "Shirts & Blouses", price: 12500, sizes: "menTops", images: [5], group: "rl-madras",
    description: "A summer staple woven from breathable madras cotton in a multicolored plaid, with a button-down collar and the embroidered Pony on the chest.",
  },
  {
    brand: "Lacoste", model: "Original L.12.12 Polo", colorway: "Light Blue", color: "Blue", gender: "MEN", category: "T-Shirts & Polos", price: 11000, sizes: "menTops", images: [7], group: "lacoste-l1212",
    description: "René Lacoste's 1933 design that created the polo shirt as we know it. Breathable cotton petit piqué, ribbed collar, two-button placket and the green crocodile on the chest.",
  },
  {
    brand: "Lacoste", model: "Striped Cotton Polo", colorway: "Yellow/Blue Stripe", color: "Yellow", gender: "MEN", category: "T-Shirts & Polos", price: 12000, sizes: "menTops", images: [8], group: "lacoste-stripe",
    description: "A cheerful striped take on the classic Lacoste polo in soft cotton jersey, with a ribbed collar and the crocodile badge.",
  },
  {
    brand: "Fred Perry", model: "M12 Twin Tipped Polo", colorway: "White/Navy/Red", color: "White", gender: "MEN", category: "T-Shirts & Polos", price: 9500, sizes: "menTops", images: [11], group: "fred-perry-m12",
    description: "The polo Fred Perry launched in 1952, still made in England. Cotton piqué with twin-tipped collar and cuffs and the embroidered Laurel Wreath.",
  },
  {
    brand: "Fred Perry", model: "M12 Twin Tipped Polo", colorway: "Black", color: "Black", gender: "MEN", category: "T-Shirts & Polos", price: 9500, sizes: "menTops", images: [10], group: "fred-perry-m12",
    description: "The iconic M12 in black with contrast tipping on the collar and cuffs. Durable cotton piqué and a regular fit that keeps its shape.",
  },
  {
    brand: "Barbour", model: "Endurance Wax Jacket", colorway: "Olive", color: "Green", gender: "MEN", category: "Jackets & Coats", price: 34900, sizes: "menTops", images: [14, 12], group: "barbour-wax",
    description: "Barbour has made waxed cotton jackets in South Shields since 1894. Water-resistant waxed cotton outer, corduroy-trimmed collar, studded storm fly and roomy bellows pockets. Can be re-waxed to last for decades.",
  },
  {
    brand: "Carhartt", model: "Duck Detroit Jacket", colorway: "Gravel", color: "Grey", gender: "MEN", category: "Jackets & Coats", price: 18000, sizes: "menTops", images: [15], group: "carhartt-detroit",
    description: "A workwear classic from 1954: heavyweight cotton duck, corduroy collar, blanket-lined body and adjustable waist tabs. Built to take hard wear and look better with age.",
  },
  {
    brand: "Carhartt", model: "Duck Active Hooded Jacket", colorway: "Carhartt Brown", color: "Brown", gender: "MEN", category: "Jackets & Coats", price: 12000, sizes: "menTops", images: [16], group: "carhartt-active",
    description: "Firm-hand cotton duck with a quilted lining and attached hood. Triple-stitched seams, rib-knit cuffs and the square Carhartt label.",
  },
  {
    brand: "Schott NYC", model: "613 One Star Perfecto Leather Jacket", colorway: "Black", color: "Black", gender: "MEN", category: "Jackets & Coats", price: 105000, sizes: "menTops", images: [17, 18], group: "schott-613",
    description: "Schott made the first Perfecto motorcycle jacket in 1928, and the 613 'One Star' became the 1950s icon. Heavy steerhide leather, asymmetric zip, belted waist and star studs on the epaulettes.",
  },
  {
    brand: E, model: "MA-1 Bomber Jacket", colorway: "Petrol Blue", color: "Blue", gender: "MEN", category: "Jackets & Coats", price: 8900, sizes: "menTops", images: [19], group: "ma1",
    description: "Modelled on the 1950s flight jacket: smooth nylon shell, light padding, rib-knit collar, cuffs and hem, and a utility pocket on the sleeve.",
  },
  {
    brand: E, model: "Slim Fit Chinos", colorway: "Stone", color: "Beige", gender: "MEN", category: "Trousers", price: 5900, sizes: "menWaist", images: [21, 22], group: "chinos",
    description: "Everyday cotton twill chinos with a little stretch, a slim tapered leg and slant pockets. Smart enough for the office, easy enough for the weekend.",
  },
  {
    brand: E, model: "Cargo Trousers", colorway: "Olive", color: "Green", gender: "MEN", category: "Trousers", price: 6900, sizes: "menWaist", images: [39], group: "cargo",
    description: "Relaxed-fit cotton ripstop trousers with bellows cargo pockets and a straight leg, inspired by military field trousers.",
  },
  {
    brand: E, model: "Brushed Flannel Shirt", colorway: "Teal/Rust Check", color: "Blue", gender: "MEN", category: "Shirts & Blouses", price: 4900, sizes: "menTops", images: [23, 24], group: "flannel",
    description: "Soft brushed cotton flannel in a bold check, with two chest pockets and a regular fit for layering over a tee.",
  },
  {
    brand: E, model: "Aloha Camp Shirt", colorway: "Blue Palm Print", color: "Blue", gender: "MEN", category: "Shirts & Blouses", price: 4500, sizes: "menTops", images: [36], group: "aloha",
    description: "A breezy Hawaiian-style shirt with a camp collar and an all-over palm print. Lightweight viscose that drapes well in hot weather.",
  },
  {
    brand: E, model: "Aloha Camp Shirt", colorway: "White Palm Print", color: "White", gender: "MEN", category: "Shirts & Blouses", price: 4500, sizes: "menTops", images: [37], group: "aloha",
    description: "Our camp-collar Aloha shirt on a white ground with grey palms: holiday-ready and easy to style with chinos or shorts.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Southwestern Print Down Jacket", colorway: "Navy Multi", color: "Blue", gender: "MEN", category: "Jackets & Coats", price: 49800, sizes: "menTops", images: [29], group: "rl-down",
    description: "A warm down-filled jacket with a striking Southwestern-inspired pattern, ribbed trims and a full-zip front.",
  },
  {
    brand: "Adidas", model: "Helionic Down Jacket", colorway: "Black", color: "Black", gender: "MEN", category: "Jackets & Coats", price: 18000, sizes: "menTops", images: [30], group: "adidas-helionic",
    description: "A lightweight, packable puffer with responsibly sourced down insulation, a water-repellent shell and the 3-Stripes on the shoulders.",
  },
  {
    brand: "The North Face", model: "Mountain Light Triclimate Jacket", colorway: "TNF Black", color: "Black", gender: "MEN", category: "Jackets & Coats", price: 37000, sizes: "menTops", images: [31], group: "tnf-triclimate",
    description: "A 3-in-1 system: a waterproof, breathable GORE-TEX shell and a zip-in insulated jacket that can each be worn on their own. Built for changeable mountain weather.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Color-Block Windbreaker", colorway: "Green/Red/Navy", color: "Green", gender: "MEN", category: "Jackets & Coats", price: 19800, sizes: "menTops", images: [34], group: "rl-windbreaker",
    description: "A retro sporting windbreaker in bold color blocks with a stowaway hood, half-zip pullover style and an elastic hem.",
  },
  {
    brand: E, model: "Track Jacket", colorway: "Black/Gold", color: "Black", gender: "MEN", category: "Activewear", price: 6500, sizes: "menTops", images: [41], group: "track-jacket",
    description: "A smooth tricot track top with a contrast chest panel, stand-up collar and full zip, for training days and off-duty looks.",
  },
  {
    brand: "Randers Handsker", model: "Lined Leather Gloves", colorway: "Black", color: "Black", gender: "MEN", category: "Accessories", price: 9500, sizes: "letters", images: [103], group: "randers-gloves",
    description: "Made by Randers Handsker, a Danish glovemaker founded in 1811. Soft lamb leather with a warm lining and a close, natural fit.",
  },
  {
    brand: E, model: "Bi-Fold Leather Wallet", colorway: "Dark Navy", color: "Blue", gender: "MEN", category: "Accessories", price: 3900, sizes: "oneSize", images: [100], group: "wallet",
    description: "A slim bi-fold in full-grain leather with six card slots and a full-length note compartment.",
  },

  // ---------------------------------------------------------------- women
  {
    brand: E, model: "Breton Stripe Top", colorway: "Ecru/Navy Stripe", color: "Blue", gender: "WOMEN", category: "T-Shirts & Polos", price: 4500, sizes: "womenTops", images: [57, 55], group: "breton",
    description: "The French sailor stripe, adopted by the French Navy in 1858 and by Parisian style ever since. Heavyweight cotton jersey with a boat neck and long sleeves.",
  },
  {
    brand: E, model: "Pintuck Cotton Blouse", colorway: "Ivory", color: "White", gender: "WOMEN", category: "Shirts & Blouses", price: 5900, sizes: "womenTops", images: [71], group: "blouse",
    description: "A romantic vintage-inspired blouse in fine cotton with delicate pintuck detailing across the front and a soft collar.",
  },
  {
    brand: E, model: "Cashmere Crew Neck Sweater", colorway: "Grey Melange", color: "Grey", gender: "WOMEN", category: "Knitwear", price: 14900, sizes: "womenTops", images: [58], group: "cashmere",
    description: "Pure, soft cashmere in a relaxed crew-neck shape with ribbed trims. Light enough to layer and warm enough to wear on its own.",
  },
  {
    brand: E, model: "Button-Front Cardigan", colorway: "Scarlet", color: "Red", gender: "WOMEN", category: "Knitwear", price: 6900, sizes: "womenTops", images: [59], group: "cardigan",
    description: "A fine-knit V-neck cardigan in a vivid red with a full button front. Throw it over a dress or wear it buttoned as a top.",
  },
  {
    brand: E, model: "Pleated Little Black Dress", colorway: "Black", color: "Black", gender: "WOMEN", category: "Dresses", price: 12900, sizes: "womenTops", images: [50], group: "lbd",
    description: "A timeless sleeveless dress in fine wool with a fitted bodice and a softly pleated skirt that moves as you walk.",
  },
  {
    brand: E, model: "Flowing Maxi Dress", colorway: "Electric Blue", color: "Blue", gender: "WOMEN", category: "Dresses", price: 8900, sizes: "womenTops", images: [51], group: "maxi",
    description: "A floor-length jersey dress in a saturated electric blue, with a scoop neck and a fluid skirt. Pairs well with tan accessories.",
  },
  {
    brand: E, model: "Ribbed Knit Midi Dress", colorway: "Burgundy", color: "Red", gender: "WOMEN", category: "Dresses", price: 7900, sizes: "womenTops", images: [76], group: "knit-dress",
    description: "A body-skimming midi dress in stretchy rib knit with long sleeves and a high neck. Cosy for autumn with tights and boots.",
  },
  {
    brand: E, model: "Knitted Maxi Dress", colorway: "Mustard", color: "Yellow", gender: "WOMEN", category: "Dresses", price: 8900, sizes: "womenTops", images: [77], group: "knit-maxi",
    description: "A long, soft-knit dress in warm mustard with a crew neck and a gently fitted silhouette.",
  },
  {
    brand: E, model: "Pleated Mini Skirt", colorway: "Black", color: "Black", gender: "WOMEN", category: "Skirts", price: 4900, sizes: "womenTops", images: [63], group: "pleated-skirt",
    description: "A swingy mini skirt with crisp knife pleats and a comfortable waistband. Wear it with opaque tights and a chunky knit.",
  },
  {
    brand: "7 For All Mankind", model: "Denim Pencil Skirt", colorway: "Dark Indigo", color: "Blue", gender: "WOMEN", category: "Skirts", price: 16800, sizes: "womenWaist", images: [64], group: "7fam-skirt",
    description: "A knee-length pencil skirt in premium dark denim from the Los Angeles denim label, with five-pocket styling and a back vent.",
  },
  {
    brand: E, model: "High-Rise Mom Jeans", colorway: "Light Wash", color: "Blue", gender: "WOMEN", category: "Jeans", price: 6900, sizes: "womenWaist", images: [73], group: "mom-jeans",
    description: "A '90s favourite: high waist, relaxed hips and a tapered leg in rigid cotton denim with a light vintage wash.",
  },
  {
    brand: "Nike", model: "Swoosh Medium-Support Sports Bra", colorway: "Black/White", color: "Black", gender: "WOMEN", category: "Activewear", price: 3500, sizes: "womenTops", images: [66], group: "nike-swoosh-bra",
    description: "A racerback sports bra with medium support for gym and studio workouts. Sweat-wicking Dri-FIT fabric and removable pads.",
  },
  {
    brand: E, model: "Classic Belted Trench Coat", colorway: "Stone", color: "Beige", gender: "WOMEN", category: "Jackets & Coats", price: 15900, sizes: "womenTops", images: [68], group: "trench",
    description: "The trench coat born in the First World War: water-repellent cotton gabardine, double-breasted front, storm flap, epaulettes and a tie belt.",
  },
  {
    brand: E, model: "Houndstooth Wool Coat", colorway: "Black/White", color: "Black", gender: "WOMEN", category: "Jackets & Coats", price: 19900, sizes: "womenTops", images: [78], group: "houndstooth",
    description: "A longline coat in a classic houndstooth wool blend with notch lapels and a single-breasted front.",
  },
  {
    brand: E, model: "Leather Saddle Bag", colorway: "Tan", color: "Brown", gender: "WOMEN", category: "Accessories", price: 12900, sizes: "oneSize", images: [80], group: "saddle-bag",
    description: "A structured crossbody bag in vegetable-tanned leather with a front flap, buckle fastening and an adjustable strap.",
  },
  {
    brand: E, model: "Printed Silk Scarf", colorway: "Paisley Multi", color: "Multicolor", gender: "WOMEN", category: "Accessories", price: 5900, sizes: "oneSize", images: [102], group: "silk-scarf",
    description: "A generously sized silk scarf with a rich paisley print. Wear it at the neck, in your hair or tied to a bag.",
  },

  // --------------------------------------------------------------- unisex
  {
    brand: E, model: "Heavyweight Graphic Hoodie", colorway: "Black", color: "Black", gender: "UNISEX", category: "Hoodies & Sweatshirts", price: 5500, sizes: "unisexTops", images: [26], group: "hoodie",
    description: "A substantial brushed-back fleece hoodie with a tonal chest graphic, lined hood, kangaroo pocket and ribbed cuffs. Relaxed fit.",
  },
  {
    brand: E, model: "Packable Windbreaker", colorway: "Stone", color: "Beige", gender: "UNISEX", category: "Jackets & Coats", price: 6900, sizes: "unisexTops", images: [35], group: "windbreaker",
    description: "A featherweight wind- and shower-resistant jacket with a roll-away hood that packs into its own pocket.",
  },
  {
    brand: "New Era", model: "Atlanta Braves 59FIFTY Cap", colorway: "Black/Red", color: "Black", gender: "UNISEX", category: "Accessories", price: 4200, sizes: "capFit", images: [83], group: "new-era-braves",
    description: "New Era's structured six-panel cap, worn on the field since 1954, with a flat visor and the Braves logo embroidered in 3D.",
  },
  {
    brand: "Ray-Ban", model: "New Wayfarer Sunglasses", colorway: "Black/Blue Gradient", color: "Black", gender: "UNISEX", category: "Accessories", price: 17300, sizes: "oneSize", images: [86], group: "rayban-new-wayfarer",
    description: "A slightly smaller, softer take on the 1952 Wayfarer. Acetate frame with gradient lenses that give full UV protection.",
  },
  {
    brand: E, model: "Metal Aviator Sunglasses", colorway: "Gold/Red", color: "Yellow", gender: "UNISEX", category: "Accessories", price: 4900, sizes: "oneSize", images: [88], group: "aviators",
    description: "A classic teardrop aviator with a thin gold metal frame and tinted lenses with UV400 protection.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Striped Cuff Beanie", colorway: "Navy/Cream", color: "Blue", gender: "UNISEX", category: "Accessories", price: 4950, sizes: "oneSize", images: [90], group: "rl-beanie",
    description: "A ribbed knit beanie with a turned-up cuff, a contrast stripe and the Polo branding.",
  },
  {
    brand: E, model: "Crochet Beanie", colorway: "Cobalt", color: "Blue", gender: "UNISEX", category: "Accessories", price: 2500, sizes: "oneSize", images: [89], group: "crochet-beanie",
    description: "A handmade-look crochet beanie in bright cobalt blue with a slouchy fit.",
  },
  {
    brand: "Barbour", model: "Waxed Cotton Bucket Hat", colorway: "Black", color: "Black", gender: "UNISEX", category: "Accessories", price: 4900, sizes: "letters", images: [96], group: "barbour-bucket",
    description: "Barbour's weatherproof waxed cotton made into a bucket hat with a tartan lining. Keeps the rain off in style.",
  },
  {
    brand: "Polo Ralph Lauren", model: "Reversible Bucket Hat", colorway: "Red/Navy", color: "Red", gender: "UNISEX", category: "Accessories", price: 6800, sizes: "letters", images: [97], group: "rl-bucket",
    description: "A cotton twill bucket hat that reverses from red to navy, finished with an embroidered Pony.",
  },
  {
    brand: E, model: "Paisley Bucket Hat", colorway: "Brown Paisley", color: "Brown", gender: "UNISEX", category: "Accessories", price: 2900, sizes: "oneSize", images: [95], group: "paisley-bucket",
    description: "A soft cotton bucket hat with an all-over retro paisley print.",
  },
  {
    brand: E, model: "Leather Belt", colorway: "Brown", color: "Brown", gender: "UNISEX", category: "Accessories", price: 3900, sizes: "letters", images: [93], group: "belt",
    description: "A 35 mm full-grain leather belt with a brushed-steel roller buckle. Made to be worn with jeans and chinos.",
  },
  {
    brand: E, model: "Canvas Tote Bag", colorway: "Navy/Natural", color: "Blue", gender: "UNISEX", category: "Accessories", price: 2900, sizes: "oneSize", images: [94], group: "tote",
    description: "A sturdy two-tone cotton canvas tote with long handles and room for a laptop, groceries or a beach towel.",
  },
  {
    brand: E, model: "Check Wool Scarf", colorway: "Camel/Black/Red Check", color: "Beige", gender: "UNISEX", category: "Accessories", price: 4500, sizes: "oneSize", images: [81], group: "check-scarf",
    description: "A soft brushed-wool scarf in a heritage check with fringed ends.",
  },
  {
    brand: "HiMountain", model: "Hiker 50L Backpack", colorway: "Blue/Black", color: "Blue", gender: "UNISEX", category: "Accessories", price: 8900, sizes: "oneSize", images: [99], group: "himountain-hiker",
    description: "A 50-litre trekking pack from the Polish outdoor brand, with an adjustable back system, hip belt, side pockets and a rain cover.",
  },
];
