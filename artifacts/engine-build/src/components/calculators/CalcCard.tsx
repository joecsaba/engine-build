import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { FavoriteStar, slugFromHref } from "./FavoriteStar";
import { PinButton } from "@/components/sidebar/PinButton";

export interface Calc {
  title: string;
  href: string;
  desc: string;
  tags: string[];
  icon: LucideIcon;
}

interface CalcCardProps {
  calc: Calc;
  showFavorite?: boolean;
}

// Shared card used across all category pages and the "My Tools" section on
// the calculators index. Same visual as the previous inline versions; adds
// a favorite-star toggle in the top-right corner.
export function CalcCard({ calc, showFavorite = true }: CalcCardProps) {
  const slug = slugFromHref(calc.href);
  return (
    <Link href={calc.href}>
      <div className="group relative block p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer h-full">
        {showFavorite && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5">
            <PinButton slug={slug} />
            <FavoriteStar slug={slug} />
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E85D04]/10 flex items-center justify-center text-[#E85D04] shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
            <calc.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{calc.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{calc.desc}</p>
            <div className="flex flex-wrap gap-1">
              {calc.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
