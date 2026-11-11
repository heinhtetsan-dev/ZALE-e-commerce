import { describe, expect, it } from "vitest";
import { compareSizes, normalizeSize } from "../src/lib/sizes.js";

describe("size labels", () => {
  it("orders letter sizes by fit, then waist sizes numerically, then One Size", () => {
    const sizes = ["One Size", "34", "XL", "S", "28", "M/L", "XXL", "XS", "M", "L", "30", "S/M"];
    expect(sizes.sort(compareSizes)).toEqual(["XS", "S", "S/M", "M", "M/L", "L", "XL", "XXL", "28", "30", "34", "One Size"]);
  });

  it("normalizes case and spacing", () => {
    expect(normalizeSize(" m ")).toBe("M");
    expect(normalizeSize("xxl")).toBe("XXL");
    expect(normalizeSize("s/m")).toBe("S/M");
    expect(normalizeSize("one   SIZE")).toBe("One Size");
    expect(normalizeSize("32")).toBe("32");
  });
});
