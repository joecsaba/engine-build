import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FactoryCarGroup } from "@/lib/engineTypes";
import { factoryCarLabel } from "@/data/vehicleText.mjs";

/**
 * "Factory cars with this engine": the reverse of a vehicle page's engine
 * table, built by scripts/vehicleData.mjs. Shown on engine and family pages.
 */
export function FactoryCars({ groups, title }: { groups?: FactoryCarGroup[]; title: string }) {
  if (!groups?.length) return null;
  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {groups.map((g) => (
            <li key={g.url}>
              <Link href={g.url} className="font-medium text-[#E85D04] hover:underline">
                {g.vehicle}
              </Link>
              <span className="text-muted-foreground">: </span>
              {g.rows.map((r, i) => (
                <span key={`${r.year}-${r.hp}-${r.code}`}>
                  {i > 0 && <span className="text-muted-foreground">; </span>}
                  <a href={r.url} className="hover:text-primary tabular-nums">
                    {factoryCarLabel(r)}
                  </a>
                </span>
              ))}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
