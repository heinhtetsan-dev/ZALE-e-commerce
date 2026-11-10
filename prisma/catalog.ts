/**
 * Demo catalog of real shoe models and colorways (educational use).
 * Prices are typical US retail prices. Images come from Wikimedia Commons
 * (see catalog-images.ts) and carry the attribution their licenses require.
 */
export type Gender = "MEN" | "WOMEN" | "UNISEX";

export interface CatalogProduct {
  brand: string;
  model: string;
  colorway: string;
  /** Base color used by the color filter. */
  color: string;
  gender: Gender;
  category: string;
  price: number;
  images: number[];
  /** Model key: products sharing it are colorways of each other. */
  group: string;
}

export const brands = ["Nike", "Jordan", "Adidas", "New Balance", "Converse", "Vans", "Asics", "Puma", "Dr. Martens", "Timberland", "UGG", "Birkenstock"];
export const categories = ["Lifestyle", "Running", "Basketball", "Skate", "Boots", "Sandals"];

export const descriptions: Record<string, string> = {
  "air-force-1":
    "Introduced in 1982 as Nike's first basketball shoe with Air cushioning, the Air Force 1 moved from the hardwood to the street and never left. Full-grain leather upper, perforated toe box for breathability, encapsulated Air unit in the heel and the classic pivot-circle rubber outsole.",
  "air-max-90":
    "Originally released in 1990 as the Air Max III, the Air Max 90 is known for its visible heel Air unit, waffle outsole and layered upper of leather, synthetics and mesh. Bold color blocking and a padded collar make it an everyday classic.",
  "air-max-270":
    "The Air Max 270 has Nike's tallest heel Air unit at its debut (32 mm), giving a soft, bouncy ride. A stretchy knit and mesh upper with a sock-like fit and a lightweight foam midsole keep it comfortable from morning to night.",
  cortez:
    "Designed by Bill Bowerman and released in 1972, the Cortez was one of Nike's first running shoes. Its herringbone outsole, foam midsole wedge and leather upper with the oversized Swoosh give it an instantly recognisable retro profile.",
  blazer:
    "First made for basketball in 1977, the Blazer Mid '77 Vintage keeps the original look: leather upper, exposed foam on the tongue, a vintage-tinted midsole and a vulcanised rubber sole with excellent board feel.",
  pegasus:
    "The Pegasus is Nike's long-running daily trainer. Responsive foam with a forefoot Zoom Air unit, a breathable engineered mesh upper and a durable rubber outsole make it a dependable shoe for easy runs, tempo days and everything in between.",
  dunk:
    "Born on college basketball courts in 1985 with team-inspired color blocking, the Dunk Low is now a skate and street staple. Leather overlays, a padded low-cut collar and a grippy cupsole with a pivot point.",
  "air-max-1":
    "The 1987 Air Max 1 was the first Nike shoe to show its Air unit through a window in the midsole, an idea inspired by the Centre Pompidou in Paris. Mesh, suede and leather upper with a cushioned, stable ride.",
  "air-max-plus":
    "Recognisable by its wavy TPU 'fingers' inspired by palm trees, the Air Max Plus (Tuned Air) pairs targeted Air units with a supportive midfoot shank for a cushioned, stable feel.",
  "air-jordan-1":
    "The shoe that started the Jordan line in 1985. The Air Jordan 1 Retro High OG features a premium leather upper, padded high-top collar, Nike Air cushioning in the heel and the Wings logo on the ankle.",
  "air-jordan-2":
    "Made in Italy for its 1986 debut, the Air Jordan 2 swapped the Swoosh for a clean leather upper with faux-lizard overlays. A full-length Air sole and padded collar give it a luxurious, comfortable feel.",
  samba:
    "Created in 1950 for training on icy pitches, the Samba became an icon of terrace culture and streetwear. Soft leather upper, suede T-toe overlay, the three serrated stripes and a grippy gum rubber outsole.",
  superstar:
    "The shell-toe Superstar was a basketball shoe in 1969 before Run-DMC made it a hip-hop symbol. Leather upper, rubber shell toe for protection and a herringbone-pattern cupsole.",
  "stan-smith":
    "Named after the American tennis champion, the Stan Smith is a minimalist leather court shoe with perforated 3-Stripes, a colored heel tab and a comfortable cupsole. Clean enough to go with anything.",
  gazelle:
    "A training and indoor football shoe from 1966, the Gazelle has a soft suede upper, contrast serrated 3-Stripes and a slim profile that suits everyday outfits.",
  ultraboost:
    "Ultraboost combines responsive Boost cushioning that returns energy with every stride, a supportive Primeknit upper and a flexible Continental rubber outsole for grip in wet and dry conditions.",
  "nb-574":
    "The 574 was built in 1988 as a reliable running shoe for every surface. Suede and mesh upper, ENCAP midsole for cushioning with durable support and a classic, versatile shape.",
  "nb-550":
    "Revived from New Balance's 1989 basketball archives, the 550 is a leather low-top with a perforated toe, padded collar and retro cupsole outsole.",
  "nb-990":
    "The 990 is New Balance's flagship 'Made in USA' running shoe. Pigskin suede and mesh upper, ENCAP midsole technology and a premium, cushioned ride that is built to last.",
  "chuck-taylor":
    "The canvas basketball shoe that became a cultural icon. Chuck Taylor All Star High Tops have a durable canvas upper, OrthoLite insole for comfort, the ankle patch and a vulcanised rubber sole.",
  "chuck-70":
    "Chuck 70 recreates the 1970s All Star with heavier-grade canvas, extra cushioning, a higher glossy egret midsole, vintage stitching and a premium heel patch.",
  "vans-authentic":
    "The original Vans shoe from 1966. A low-profile canvas lace-up with metal eyelets, a padded collar and the signature waffle rubber outsole for board grip.",
  "gel-kayano":
    "The Gel-Kayano is ASICS' stability running shoe. GEL technology cushions impact, while a supportive structure keeps the foot aligned on long runs.",
  "gel-1130":
    "Inspired by a 2008 running model, the Gel-1130 brings Y2K style back with layered mesh and synthetic overlays, GEL cushioning in the heel and a supportive TRUSSTIC system.",
  "gel-nyc":
    "The Gel-NYC fuses elements of the Gel-Nimbus 3, Gel-MC Plus V and Gel-Cumulus 16 into one retro runner, with GEL cushioning and a multi-layered mesh and leather upper.",
  "gel-cumulus":
    "A neutral everyday trainer with soft FLYTEFOAM cushioning, rearfoot GEL for impact absorption and an engineered mesh upper that adapts to the foot.",
  "dm-1460":
    "Dr. Martens' original 8-eye boot was first made on 1 April 1960. Smooth leather upper, yellow welt stitching, grooved sides, a heel loop and the bouncing AirWair sole that resists oil and fat.",
  "timberland-6-inch":
    "The Timberland Premium 6-Inch boot, introduced in 1973, is built from waterproof nubuck leather with seam-sealed construction, a padded collar, PrimaLoft insulation and a rugged lug outsole.",
  "ugg-classic":
    "The Classic Short II is made from twin-face sheepskin with a natural wool lining that keeps feet warm while wicking moisture. A treated upper resists water and stains, and the light, flexible Treadlite sole adds cushioning.",
  "birkenstock-arizona":
    "The two-strap Arizona sandal has Birkenstock's contoured cork-latex footbed with a deep heel cup and arch support that molds to your foot over time. Birko-Flor upper with adjustable pin buckles.",
  "puma-suede":
    "Launched in 1968, the PUMA Suede has been worn by athletes, b-boys and skaters for decades. A soft suede upper, the Formstrip on the side and a sturdy rubber cupsole.",
};

export const catalog: CatalogProduct[] = [
  { brand: "Nike", model: "Air Force 1 '07", colorway: "White/White", color: "White", gender: "UNISEX", category: "Lifestyle", price: 11500, images: [0, 2], group: "air-force-1" },
  { brand: "Nike", model: "Air Force 1 '07 LV8", colorway: "Flax/Wheat-Gum Light Brown", color: "Brown", gender: "MEN", category: "Lifestyle", price: 13000, images: [1], group: "air-force-1" },
  { brand: "Nike", model: "Air Max 90", colorway: "White/Black-Cool Grey-Infrared", color: "White", gender: "MEN", category: "Lifestyle", price: 14000, images: [3], group: "air-max-90" },
  { brand: "Nike", model: "Air Max 90", colorway: "White/Obsidian", color: "White", gender: "WOMEN", category: "Lifestyle", price: 13500, images: [4], group: "air-max-90" },
  { brand: "Nike", model: "Air Max 270", colorway: "Black/Dusty Cactus-White", color: "Black", gender: "WOMEN", category: "Lifestyle", price: 16000, images: [5], group: "air-max-270" },
  { brand: "Nike", model: "Air Max 270", colorway: "Summit White/Lilac-Sail", color: "White", gender: "WOMEN", category: "Lifestyle", price: 16000, images: [6], group: "air-max-270" },
  { brand: "Nike", model: "Cortez", colorway: "White/Black", color: "White", gender: "WOMEN", category: "Lifestyle", price: 9000, images: [7], group: "cortez" },
  { brand: "Nike", model: "Blazer Mid '77 Vintage", colorway: "White/Midnight Navy-Sail", color: "White", gender: "WOMEN", category: "Skate", price: 10500, images: [8], group: "blazer" },
  { brand: "Nike", model: "Air Zoom Pegasus 38", colorway: "Platinum Tint/Black-Pink Blast", color: "Grey", gender: "MEN", category: "Running", price: 12000, images: [9], group: "pegasus" },
  { brand: "Nike", model: "Dunk Low Retro", colorway: "White/Black (Panda)", color: "Black", gender: "UNISEX", category: "Skate", price: 11500, images: [10], group: "dunk" },
  { brand: "Nike", model: "Dunk Low Retro", colorway: "White/Varsity Green", color: "Green", gender: "MEN", category: "Skate", price: 11500, images: [11], group: "dunk" },
  { brand: "Nike", model: "Air Max 1", colorway: "White/University Red-Neutral Grey", color: "Red", gender: "MEN", category: "Lifestyle", price: 15000, images: [12], group: "air-max-1" },
  { brand: "Nike", model: "Air Max Plus", colorway: "Black/Black-Black", color: "Black", gender: "MEN", category: "Running", price: 18500, images: [13], group: "air-max-plus" },
  { brand: "Jordan", model: "Air Jordan 1 Retro High OG", colorway: "Black/Varsity Red-White (Bred)", color: "Red", gender: "MEN", category: "Basketball", price: 18000, images: [14], group: "air-jordan-1" },
  { brand: "Jordan", model: "Air Jordan 2 Retro", colorway: "White/Varsity Red-Black (Chicago)", color: "White", gender: "MEN", category: "Basketball", price: 20000, images: [15], group: "air-jordan-2" },
  { brand: "Adidas", model: "Samba OG", colorway: "Cloud White/Core Black/Gum", color: "White", gender: "UNISEX", category: "Lifestyle", price: 10000, images: [16], group: "samba" },
  { brand: "Adidas", model: "Samba Classic", colorway: "Core Black/Cloud White", color: "Black", gender: "MEN", category: "Lifestyle", price: 9000, images: [17], group: "samba" },
  { brand: "Adidas", model: "Superstar", colorway: "Cloud White/Core Black", color: "White", gender: "UNISEX", category: "Lifestyle", price: 10000, images: [18], group: "superstar" },
  { brand: "Adidas", model: "Stan Smith", colorway: "Cloud White/Green", color: "White", gender: "UNISEX", category: "Lifestyle", price: 10000, images: [19], group: "stan-smith" },
  { brand: "Adidas", model: "Gazelle", colorway: "Mesa/Cloud White/Gum", color: "Yellow", gender: "UNISEX", category: "Lifestyle", price: 10000, images: [20], group: "gazelle" },
  { brand: "Adidas", model: "Gazelle", colorway: "Semi Pink Spark/Cloud White", color: "Pink", gender: "WOMEN", category: "Lifestyle", price: 10000, images: [21], group: "gazelle" },
  { brand: "Adidas", model: "Ultraboost 4.0 DNA", colorway: "Core Black/Core Black", color: "Black", gender: "MEN", category: "Running", price: 19000, images: [22], group: "ultraboost" },
  { brand: "New Balance", model: "574 Core", colorway: "Incense/Sandstone", color: "Beige", gender: "UNISEX", category: "Lifestyle", price: 9000, images: [23], group: "nb-574" },
  { brand: "New Balance", model: "550", colorway: "White/Burgundy", color: "White", gender: "UNISEX", category: "Basketball", price: 11000, images: [24], group: "nb-550" },
  { brand: "New Balance", model: "990v3 Made in USA", colorway: "Grey/Pink", color: "Grey", gender: "WOMEN", category: "Running", price: 18500, images: [25], group: "nb-990" },
  { brand: "Converse", model: "Chuck Taylor All Star High Top", colorway: "Navy", color: "Blue", gender: "UNISEX", category: "Lifestyle", price: 6500, images: [26], group: "chuck-taylor" },
  { brand: "Converse", model: "Chuck 70 High Top", colorway: "Black/Egret/Black", color: "Black", gender: "UNISEX", category: "Lifestyle", price: 9000, images: [27], group: "chuck-70" },
  { brand: "Vans", model: "Authentic", colorway: "Black/True White", color: "Black", gender: "UNISEX", category: "Skate", price: 6000, images: [29, 30], group: "vans-authentic" },
  { brand: "Asics", model: "Gel-Kayano 26", colorway: "Laser Pink/Sour Yuzu", color: "Pink", gender: "WOMEN", category: "Running", price: 16000, images: [31], group: "gel-kayano" },
  { brand: "Asics", model: "Gel-1130", colorway: "White/Pure Gold", color: "White", gender: "UNISEX", category: "Lifestyle", price: 11000, images: [32], group: "gel-1130" },
  { brand: "Asics", model: "Gel-NYC", colorway: "White/Steel Grey", color: "Grey", gender: "MEN", category: "Lifestyle", price: 14000, images: [33], group: "gel-nyc" },
  { brand: "Asics", model: "Gel-Cumulus 22", colorway: "Black/Directoire Blue", color: "Blue", gender: "MEN", category: "Running", price: 12000, images: [34], group: "gel-cumulus" },
  { brand: "Dr. Martens", model: "1460 Smooth Leather Lace Up Boots", colorway: "Cherry Red", color: "Red", gender: "UNISEX", category: "Boots", price: 17000, images: [35], group: "dm-1460" },
  { brand: "Dr. Martens", model: "1460 Crazy Horse Leather Boots", colorway: "Dark Brown", color: "Brown", gender: "MEN", category: "Boots", price: 18000, images: [36], group: "dm-1460" },
  { brand: "Timberland", model: "Premium 6-Inch Waterproof Boot", colorway: "Wheat Nubuck", color: "Brown", gender: "MEN", category: "Boots", price: 20000, images: [37], group: "timberland-6-inch" },
  { brand: "Timberland", model: "Premium 6-Inch Waterproof Boot", colorway: "Light Grey Nubuck", color: "Grey", gender: "WOMEN", category: "Boots", price: 19000, images: [38], group: "timberland-6-inch" },
  { brand: "UGG", model: "Classic Short II", colorway: "Sand", color: "Beige", gender: "WOMEN", category: "Boots", price: 17000, images: [39], group: "ugg-classic" },
  { brand: "Birkenstock", model: "Arizona Birko-Flor", colorway: "Black", color: "Black", gender: "UNISEX", category: "Sandals", price: 11000, images: [40], group: "birkenstock-arizona" },
  { brand: "Puma", model: "Suede Classic XXI", colorway: "Burgundy/White", color: "Red", gender: "UNISEX", category: "Lifestyle", price: 7500, images: [42], group: "puma-suede" },
  { brand: "Puma", model: "Suede Classic XXI", colorway: "Black/White", color: "Black", gender: "UNISEX", category: "Lifestyle", price: 7500, images: [43], group: "puma-suede" },
];

/** EU size runs per audience. */
export const sizeRuns: Record<Gender, number[]> = {
  MEN: [39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 46, 47],
  WOMEN: [35.5, 36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41],
  UNISEX: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
};
