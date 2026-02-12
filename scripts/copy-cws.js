#!/usr/bin/env node
/**
 * Copies src/data/cws to public/cws for runtime fetch.
 * Run before build (or as part of build).
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "src", "data", "cws");
const dest = join(root, "public", "cws");

if (!existsSync(src)) {
  console.warn("copy-cws: src/data/cws not found, skipping");
  process.exit(0);
}

mkdirSync(join(root, "public"), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("copy-cws: copied src/data/cws → public/cws");
