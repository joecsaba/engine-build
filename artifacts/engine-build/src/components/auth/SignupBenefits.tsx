import { Star, Bookmark, Cog, ArrowLeftRight, ClipboardList, PinIcon } from "lucide-react";

const BENEFITS = [
  {
    icon: Star,
    title: "Star calculators you use most",
    desc: "Your “My Tools” list shows up on every device you sign in on.",
  },
  {
    icon: Bookmark,
    title: "Save calculator presets",
    desc: "Reload the comp-ratio inputs for your 383 — or any build — in one click.",
  },
  {
    icon: Cog,
    title: "Default engine platform",
    desc: "Compression, P2V, bolt-spec, and ring-gap calcs pre-fill for your build.",
  },
  {
    icon: ArrowLeftRight,
    title: "Default units",
    desc: "Every converter (mm/in, °F/°C, ft-lb/Nm, psi/bar) opens to your preferred direction.",
  },
  {
    icon: ClipboardList,
    title: "Build sheets that follow you",
    desc: "Plan on the laptop, check torque specs on your phone in the shop.",
  },
  {
    icon: PinIcon,
    title: "Pinned quick-tools sidebar",
    desc: "mm/inch converter and your favorites — always one click away on any page.",
  },
] as const;

interface SignupBenefitsProps {
  heading?: string;
  variant?: "panel" | "compact";
}

export function SignupBenefits({
  heading = "What you get with a free account",
  variant = "panel",
}: SignupBenefitsProps) {
  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">{heading}</p>
        <ul className="space-y-2.5">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-[#E85D04] shrink-0 mt-0.5" />
              <div className="text-sm leading-snug">
                <span className="font-medium text-gray-900">{title}</span>
                <span className="text-gray-500"> — {desc}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 pt-1">Free forever. No spam. Takes 30 seconds.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] text-white rounded-xl p-6 lg:p-8 h-full">
      <p className="text-[#E85D04] text-xs font-semibold uppercase tracking-widest mb-2">
        Free account
      </p>
      <h2 className="text-2xl font-bold mb-6">{heading}</h2>
      <ul className="space-y-5">
        {BENEFITS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E85D04]/15 text-[#E85D04] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white leading-tight">{title}</p>
              <p className="text-sm text-gray-400 mt-0.5 leading-snug">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-6 pt-5 border-t border-gray-800">
        Free forever · No spam · Takes 30 seconds
      </p>
    </div>
  );
}
