import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  dts: false,
  sourcemap: true,
  outDir: "dist",
  external: ["pg", "pg-boss"],
  noExternal: [/^@barter\//]
});
