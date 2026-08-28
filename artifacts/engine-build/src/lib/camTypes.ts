// Shape of the cam data emitted by scripts/camData.mjs into
// public/data/cam-pages/index.json. Mirrors CamSpec in src/data/camDatabase.ts
// plus the routing and comparison fields added at build time.

export interface CamSimilar {
  url: string;
  mfr: string;
  family: string;
  part: string;
  int050: number;
  lsa: number;
}

export interface CamRecord {
  url: string;
  slug: string;
  mfr: string;
  mfrSlug: string;
  mfrUrl: string;
  family: string;
  part: string;
  platform: string;
  platformLabel: string;
  lifter: string;
  lifterLabel: string;
  int050: number;
  /** null where the manufacturer doesn't publish it (e.g. BTR "24X"). */
  exh050: number | null;
  liftInt: number;
  liftExh: number;
  lsa: number;
  rpmLo: number | null;
  rpmHi: number | null;
  use: string;
  similar: CamSimilar[];
}

export interface CamDoc {
  cams: CamRecord[];
  manufacturers: { url: string; name: string; slug: string; count: number }[];
}
