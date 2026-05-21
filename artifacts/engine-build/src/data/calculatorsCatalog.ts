import type { Calc } from "@/components/calculators/CalcCard";
import { shortBlock } from "@/pages/calculators/category-short-block";
import { camValvetrain } from "@/pages/calculators/category-cam-valvetrain";
import { powerFuel } from "@/pages/calculators/category-power-fuel";
import { drivetrainShop } from "@/pages/calculators/category-drivetrain-shop";
import { diesel } from "@/pages/calculators/category-diesel";
import { slugFromHref } from "@/components/calculators/FavoriteStar";

export type CalcCategory =
  | "short-block"
  | "cam-valvetrain"
  | "power-fuel"
  | "drivetrain-shop"
  | "diesel";

export interface CatalogEntry extends Calc {
  slug: string;
  category: CalcCategory;
  categoryLabel: string;
}

function tag(entries: Calc[], category: CalcCategory, label: string): CatalogEntry[] {
  return entries.map((c) => ({ ...c, slug: slugFromHref(c.href), category, categoryLabel: label }));
}

// Master list — every calculator on the site, with slug + category metadata.
// Source of truth for the "My Tools" section, future sidebar, recents, etc.
export const CALCULATORS_CATALOG: CatalogEntry[] = [
  ...tag(shortBlock, "short-block", "Short Block"),
  ...tag(camValvetrain, "cam-valvetrain", "Cam & Valvetrain"),
  ...tag(powerFuel, "power-fuel", "Power & Fuel"),
  ...tag(drivetrainShop, "drivetrain-shop", "Drivetrain & Shop"),
  ...tag(diesel, "diesel", "Diesel"),
];

export function findCalcBySlug(slug: string): CatalogEntry | undefined {
  return CALCULATORS_CATALOG.find((c) => c.slug === slug);
}
