import { Star } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

interface FavoriteStarProps {
  slug: string;
  className?: string;
}

// Star toggle button. Stops event propagation so clicking the star inside a
// Link card doesn't navigate. Filled = favorited, outline = not.
export function FavoriteStar({ slug, className }: FavoriteStarProps) {
  const { isFavorite, toggleFavorite } = usePreferences();
  const favorited = isFavorite(slug);

  return (
    <button
      type="button"
      aria-label={favorited ? `Remove ${slug} from favorites` : `Add ${slug} to favorites`}
      aria-pressed={favorited}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(slug);
      }}
      className={
        "p-1.5 rounded-md transition-colors " +
        (favorited
          ? "text-[#E85D04] hover:bg-[#E85D04]/10"
          : "text-gray-300 hover:text-[#E85D04] hover:bg-[#E85D04]/10") +
        (className ? " " + className : "")
      }
    >
      <Star className="w-5 h-5" fill={favorited ? "currentColor" : "none"} strokeWidth={favorited ? 0 : 2} />
    </button>
  );
}

// Helper: derive a calculator slug from its href.
// "/calculators/decimal-fraction-inch" → "decimal-fraction-inch"
export function slugFromHref(href: string): string {
  const trimmed = href.replace(/\/+$/, "");
  return trimmed.split("/").pop() ?? "";
}
