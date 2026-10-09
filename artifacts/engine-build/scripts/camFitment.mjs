// Which engine each Howards cam fits, in a form the Engine Builder can match.
//
// Howards publishes fitment as free text — "262-400", "396-502 (Mark IV)",
// "221-302 / 351W", "273, 340, 360". There are only ~70 distinct strings, so
// they are mapped by hand to engine families below rather than parsed loosely.
// A family is a manufacturer group, the displacements it covers, and its
// cylinder count; the builder matches a build against that.
//
// Displacements are explicit lists, not ranges, wherever a range would collide
// with another family: Chevy's "262-400" would otherwise swallow the 396 big
// block, and an LS 427 is not a Mark IV 427. Where the engine text contradicts
// Howards' own make field ("Chevrolet | 273, 340, 360, 318" is a Mopar small
// block), the engine text wins.
//
// Reads scripts/howards_cams.json (owned by the Howards scraper — read only).
// Writes public/data/cam-fitment.json, joined to cam-catalog.json by part
// number in the browser. Generated at build time; gitignored.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOWARDS = resolve(__dirname, "..", "..", "..", "scripts", "howards_cams.json");
const OUT = resolve(__dirname, "..", "public", "data", "cam-fitment.json");

// Manufacturer groups, matched against the build's manufacturer slug prefix.
const G = {
  chevy: ["chevrolet", "chevr", "chevy", "gmc", "sbc"],
  ford: ["ford", "mercury", "lincoln"],
  mopar: ["chrysler", "chrys", "dodge", "plymouth", "plymo", "mopar", "jeep", "ram"],
  pontiac: ["pontiac", "ponti"],
  olds: ["oldsmobile", "oldsm"],
  buick: ["buick"],
  buickOlds: ["buick", "oldsmobile", "oldsm"],
  cadillac: ["cadillac", "cadil"],
  amc: ["amc", "american-motors", "american_motors", "jeep"],
  holden: ["holden"],
};

const SBC = [262, 265, 267, 283, 302, 305, 307, 327, 350, 383, 400];
const BBC = [396, 402, 427, 454, 496, 502];
const LS = [293, 325, 346, 364, 376, 402, 427];
const SBF = [221, 255, 260, 289, 302, 351];

// [regex on "Make | Engine", family]. First match wins: specific before general.
const RULES = [
  [/LS|Gen III|Gen IV/i, { fam: "GM LS", g: "chevy", ci: LS, cyl: 8, ls: true }],
  [/348\s*\/\s*409/, { fam: "Chevy W-series 348/409", g: "chevy", ci: [348, 409], cyl: 8 }],
  [/454-502|Gen 6/i, { fam: "Chevy Gen VI big block", g: "chevy", ci: [454, 496, 502], cyl: 8 }],
  [/396-502/, { fam: "Chevy Mark IV big block", g: "chevy", ci: BBC, cyl: 8 }],
  [/305\/350/, { fam: "Small-block Chevy 305/350", g: "chevy", ci: [305, 350], cyl: 8 }],
  [/Chev\w*\s*\|\s*26[25]-400/, { fam: "Small-block Chevy", g: "chevy", ci: SBC, cyl: 8 }],
  [/194, 230, 250/, { fam: "Chevy inline-6", g: "chevy", ci: [194, 230, 250], cyl: 6 }],
  [/Chev\w*\s*\|\s*292$/, { fam: "Chevy 292 inline-6", g: "chevy", ci: [292], cyl: 6 }],
  [/351C|351M/, { fam: "Ford 351C/351M/400", g: "ford", ci: [351, 400], cyl: 8 }],
  [/221-302|351W|5\.0L|302 H\.O\./, { fam: "Small-block Ford (Windsor)", g: "ford", ci: SBF, cyl: 8 }],
  [/429-460/, { fam: "Ford 429/460", g: "ford", ci: [429, 460], cyl: 8 }],
  [/352-428/, { fam: "Ford FE", g: "ford", ci: [352, 360, 390, 406, 410, 427, 428], cyl: 8 }],
  [/Y-Block|292-312|239-255/, { fam: "Ford Y-block", g: "ford", ci: [239, 256, 272, 292, 312], cyl: 8 }],
  [/4\.6L/, { fam: "Ford Modular", g: "ford", ci: [281, 330], cyl: 8 }],
  [/240-300/, { fam: "Ford 240/300 inline-6", g: "ford", ci: [240, 300], cyl: 6 }],
  [/140-250/, { fam: "Ford 140-250", g: "ford", ci: [140, 144, 170, 200, 250], cyl: null }],
  [/426 Hemi/, { fam: "Chrysler 426 Hemi", g: "mopar", ci: [426], cyl: 8 }],
  [/392 Hemi/, { fam: "Chrysler 392 Hemi", g: "mopar", ci: [392], cyl: 8 }],
  [/5\.7L - 6\.1L Hemi/, { fam: "Chrysler Gen III Hemi 5.7/6.1", g: "mopar", ci: [345, 370], cyl: 8 }],
  [/Magnum/, { fam: "Mopar Magnum 5.2/5.9", g: "mopar", ci: [318, 360], cyl: 8 }],
  [/273, 340, 360/, { fam: "Mopar LA small block", g: "mopar", ci: [273, 318, 340, 360], cyl: 8 }],
  [/383-440/, { fam: "Mopar B/RB big block", g: "mopar", ci: [383, 400, 413, 426, 440], cyl: 8 }], // Howards lists "383-440"; 361 would collide with the LA 360
  [/170-225/, { fam: "Mopar Slant Six", g: "mopar", ci: [170, 198, 225], cyl: 6 }],
  [/331, 354 Hemi/, { fam: "Chrysler early Hemi 331/354", g: "mopar", ci: [331, 354], cyl: 8 }],
  [/V10/, { fam: "Dodge V10", g: "mopar", ci: [488, 505, 510], cyl: 10 }],
  [/Chrysler\s*\|\s*273-360/, { fam: "Mopar LA small block", g: "mopar", ci: [273, 318, 340, 360], cyl: 8 }],
  [/Chev\w*\s*\|\s*305-350/, { fam: "Small-block Chevy 305/350", g: "chevy", ci: [305, 350], cyl: 8 }],
  [/2\.8L \/ 3\.1L \/ 3\.4L/, { fam: "GM 60-degree V6", g: "chevy", ci: [173, 191, 204, 207], cyl: 6 }],
  [/Chev\w*\s*\|\s*200-229/, { fam: "Chevy 90-degree V6 200/229", g: "chevy", ci: [200, 229], cyl: 6 }],
  [/216, 235, 261/, { fam: "Chevy Stovebolt inline-6", g: "chevy", ci: [216, 235, 261], cyl: 6 }],
  [/Buick\s*\|\s*181-252/, { fam: "Buick V6 181-252", g: "buick", ci: [181, 196, 198, 231, 252], cyl: 6 }],
  [/Ford\s*\|\s*144-250/, { fam: "Ford inline-6 144-250", g: "ford", ci: [144, 170, 200, 250], cyl: 6 }],
  [/272, 292, 312/, { fam: "Ford Y-block", g: "ford", ci: [239, 256, 272, 292, 312], cyl: 8 }],
  [/Oldsmobile\s*\|\s*(300|307|330)-4\d\d/, { fam: "Oldsmobile V8", g: "olds", ci: [260, 307, 330, 350, 400, 403, 425, 455], cyl: 8 }],
  [/Holden\s*\|\s*304 PFI/, { fam: "Holden V8 304/308", g: "holden", ci: [304, 308], cyl: 8 }],
  [/Pontiac/, { fam: "Pontiac V8", g: "pontiac", ci: [265, 287, 301, 326, 350, 389, 400, 421, 428, 455], cyl: 8 }],
  [/Oldsmobile\s*\|\s*260-455/, { fam: "Oldsmobile V8", g: "olds", ci: [260, 307, 330, 350, 400, 403, 425, 455], cyl: 8 }],
  [/215, 300, 340/, { fam: "Buick/Olds 215-340", g: "buickOlds", ci: [215, 300, 340], cyl: 8 }],
  [/Buick\s*\|\s*400, 430, 455/, { fam: "Buick big block", g: "buick", ci: [400, 430, 455], cyl: 8 }],
  [/Buick\s*\|\s*350/, { fam: "Buick 350", g: "buick", ci: [350], cyl: 8 }],
  [/Cadillac/, { fam: "Cadillac 368-500", g: "cadillac", ci: [368, 425, 472, 500], cyl: 8 }],
  [/290-401/, { fam: "AMC V8", g: "amc", ci: [290, 304, 343, 360, 390, 401], cyl: 8 }],
  [/199-258|4\.0L/, { fam: "AMC/Jeep inline-6", g: "amc", ci: [199, 232, 242, 258], cyl: 6 }],
  [/304-345/, { fam: "Holden V8 304/308", g: "holden", ci: [304, 308, 345], cyl: 8 }],
  [/252-308/, { fam: "Holden V8 253/308", g: "holden", ci: [253, 308], cyl: 8 }],
];

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildCamFitment(extraDirs = []) {
  if (!existsSync(HOWARDS)) return { mapped: 0, unmapped: 0 };
  const howards = JSON.parse(readFileSync(HOWARDS, "utf8"));
  const out = [];
  const unmapped = new Map();
  for (const h of howards) {
    const text = `${h.make ?? ""} | ${h.engine ?? ""}`;
    const rule = RULES.find(([re]) => re.test(text));
    if (!rule) {
      unmapped.set(text, (unmapped.get(text) ?? 0) + 1);
      continue;
    }
    const f = rule[1];
    out.push({
      p: norm(h.part),            // join key with cam-catalog.json
      fam: f.fam,
      g: G[f.g],                  // manufacturer slug prefixes
      ci: f.ci,
      cyl: f.cyl,
      ls: f.ls ?? false,
      y0: h.yearFrom ?? null,
      y1: h.yearTo ?? null,
      fit: `${h.make ?? ""} ${h.engine ?? ""}${h.years ? `, ${h.years}` : ""}`.trim(),
    });
  }
  for (const file of [OUT, ...extraDirs.map((d) => resolve(d, "cam-fitment.json"))]) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(out));
  }
  return { mapped: out.length, unmapped: [...unmapped.values()].reduce((a, b) => a + b, 0), unmappedTexts: [...unmapped.keys()] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(buildCamFitment());
}
