import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false, // DTS handled by tsc separately
  sourcemap: true,
  clean: false, // tsc writes to dist too — don't wipe its output
  splitting: false,
});
