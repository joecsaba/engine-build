import { Pin, PinOff } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

interface PinButtonProps {
  slug: string;
  className?: string;
}

// Toggle a calculator's presence in the floating Quick Tools sidebar.
// Stops event propagation so clicking inside a Link card doesn't navigate.
// Visually distinct from FavoriteStar — pin = "show in sidebar", star = "show in My Tools".
export function PinButton({ slug, className }: PinButtonProps) {
  const { isPinned, togglePinned } = usePreferences();
  const pinned = isPinned(slug);
  const Icon = pinned ? PinOff : Pin;

  return (
    <button
      type="button"
      aria-label={pinned ? `Unpin ${slug} from sidebar` : `Pin ${slug} to sidebar`}
      aria-pressed={pinned}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinned(slug);
      }}
      className={
        "p-1.5 rounded-md transition-colors " +
        (pinned
          ? "text-[#E85D04] hover:bg-[#E85D04]/10"
          : "text-gray-300 hover:text-[#E85D04] hover:bg-[#E85D04]/10") +
        (className ? " " + className : "")
      }
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
