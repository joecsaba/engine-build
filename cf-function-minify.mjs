// CloudFront Functions are capped at 10 KB. cf-function-redirect.js keeps its
// comments for whoever edits it next; this writes the copy that is uploaded,
// with whole-line comments and blank lines removed.
//
//   node cf-function-minify.mjs            -> cf-function-redirect.min.js
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("./cf-function-redirect.js", import.meta.url), "utf8");
const out = src
  .split(/\r?\n/)
  .filter((l) => !/^\s*\/\//.test(l) && l.trim() !== "")
  .join("\n") + "\n";
new Function(out); // syntax check
writeFileSync(new URL("./cf-function-redirect.min.js", import.meta.url), out);
console.log(`cf-function-redirect.min.js: ${out.length} bytes (limit 10240)`);
if (out.length > 10240) process.exit(1);
