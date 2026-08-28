// Build-time index over the camshaft database in src/data/camDatabase.ts.
//
// The 81 verified grinds were only reachable through the Cam Selector's UI, so
// none of it was indexable. Part numbers are unusually good search targets —
// "COMP Cams XE262H specs", "12-238-2" — because they identify one product
// exactly and the only competition is retailer listings.
//
// Route set:
//   /cams                        index
//   /cams/<manufacturer>         11 manufacturer hubs
//   /cams/<manufacturer>/<part>  81 cam pages
//
// What keeps these off the doorway-page line is that each carries specs a
// retailer listing usually omits (duration at 0.050" for both sides, LSA, the
// published RPM range), plus two things no listing has: the nearest grinds on
// the same platform, and a link into the selector loaded with this cam's
// numbers. The source file's own accuracy policy applies — every entry's
// @0.050" duration, LSA, lift and part number came from a live manufacturer or
// retailer spec page, and unverifiable cams were excluded.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "..", "src", "data", "camDatabase.ts");

export const PLATFORM_LABELS = {
  sbc: "Small Block Chevy",
  bbc: "Big Block Chevy",
  ls: "GM LS",
  sbf: "Small Block Ford",
  ford_385: "Ford 385 (429/460)",
  cleveland: "Ford Cleveland",
  mopar_sb: "Mopar Small Block",
  mopar_bb: "Mopar Big Block",
  pontiac: "Pontiac V8",
};

export const LIFTER_LABELS = {
  hyd_flat: "Hydraulic flat tappet",
  hyd_roller: "Hydraulic roller",
  solid_flat: "Solid flat tappet",
  solid_roller: "Solid roller",
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse the CAM_DATABASE literal out of the TypeScript source.
 *
 * Reading the .ts directly keeps one copy of the data: the Cam Selector and
 * these pages cannot drift, and adding a cam to the selector publishes a page
 * for it automatically.
 */
export function loadCams() {
  const src = readFileSync(SRC, "utf8");
  const start = src.indexOf("export const CAM_DATABASE");
  if (start === -1) return { cams: [], manufacturers: [] };
  const body = src.slice(src.indexOf("[", start), src.lastIndexOf("];") + 1);

  const cams = [];
  const usedUrls = new Set();
  const re = /\{\s*mfr:\s*"([^"]+)",\s*family:\s*"([^"]+)",\s*part:\s*"([^"]+)",\s*platform:\s*"([^"]+)",\s*lifter:\s*"([^"]+)",\s*int050:\s*([\d.]+),\s*exh050:\s*(null|[\d.]+),\s*liftInt:\s*([\d.]+),\s*liftExh:\s*([\d.]+),\s*lsa:\s*([\d.]+),\s*rpmLo:\s*(null|[\d.]+),\s*rpmHi:\s*(null|[\d.]+),\s*use:\s*"([^"]*)"\s*\}/g;

  let m;
  while ((m = re.exec(body)) !== null) {
    const [, mfr, family, part, platform, lifter, int050, exh050, liftInt, liftExh, lsa, rpmLo, rpmHi, use] = m;
    const mfrSlug = slugify(mfr);
    let partSlug = slugify(part);
    let url = `/cams/${mfrSlug}/${partSlug}`;
    if (usedUrls.has(url)) {
      partSlug = slugify(`${part}-${family}`);
      url = `/cams/${mfrSlug}/${partSlug}`;
    }
    usedUrls.add(url);

    cams.push({
      url,
      slug: partSlug,
      mfr,
      mfrSlug,
      mfrUrl: `/cams/${mfrSlug}`,
      family,
      part,
      platform,
      platformLabel: PLATFORM_LABELS[platform] ?? platform,
      lifter,
      lifterLabel: LIFTER_LABELS[lifter] ?? lifter,
      int050: Number(int050),
      exh050: exh050 === "null" ? null : Number(exh050),
      liftInt: Number(liftInt),
      liftExh: Number(liftExh),
      lsa: Number(lsa),
      rpmLo: rpmLo === "null" ? null : Number(rpmLo),
      rpmHi: rpmHi === "null" ? null : Number(rpmHi),
      use,
    });
  }

  // Nearest grinds on the same platform, by duration at 0.050" — the spec the
  // selector matches on and the one builders compare first.
  for (const c of cams) {
    c.similar = cams
      .filter((x) => x.platform === c.platform && x.url !== c.url)
      .sort((a, b) => Math.abs(a.int050 - c.int050) - Math.abs(b.int050 - c.int050))
      .slice(0, 6)
      .map((x) => ({ url: x.url, mfr: x.mfr, family: x.family, part: x.part, int050: x.int050, lsa: x.lsa }));
  }

  const byMfr = new Map();
  for (const c of cams) {
    if (!byMfr.has(c.mfrUrl)) byMfr.set(c.mfrUrl, { url: c.mfrUrl, name: c.mfr, slug: c.mfrSlug, cams: [] });
    byMfr.get(c.mfrUrl).cams.push(c);
  }
  const manufacturers = [...byMfr.values()].sort((a, b) => b.cams.length - a.cams.length);
  for (const m of manufacturers) m.cams.sort((a, b) => a.int050 - b.int050);

  return { cams, manufacturers };
}

/** Write the single JSON the cam pages fetch. 81 cams is small enough for one file. */
export function writeCamRuntime({ cams, manufacturers }) {
  const dir = resolve(__dirname, "..", "public", "data", "cam-pages");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, "index.json"),
    JSON.stringify({
      cams,
      manufacturers: manufacturers.map((m) => ({ url: m.url, name: m.name, slug: m.slug, count: m.cams.length })),
    }),
    "utf8"
  );
}
