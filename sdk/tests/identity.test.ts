import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pkgPath = resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  name: string;
  bin: Record<string, string>;
  files: string[];
};

describe("package identity", () => {
  it("uses the renamed package name", () => {
    expect(pkg.name).toBe("pumble-keys-sdk");
  });

  it("exposes only the renamed bin entries", () => {
    expect(Object.keys(pkg.bin).sort()).toEqual(["pumble-keys", "pumble-keys-mcp"]);
  });

  it("bin files exist at the declared paths", () => {
    for (const [key, relativePath] of Object.entries(pkg.bin)) {
      const absolute = resolve(__dirname, "..", relativePath);
      expect(existsSync(absolute), `bin "${key}" -> ${relativePath}`).toBe(true);
    }
  });

  it("files manifest lists every declared bin path", () => {
    for (const relativePath of Object.values(pkg.bin)) {
      const withoutLeadingDot = relativePath.replace(/^\.\//, "");
      expect(pkg.files).toContain(withoutLeadingDot);
    }
  });
});
