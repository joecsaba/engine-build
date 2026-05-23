import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { usePreferences } from "@/hooks/usePreferences";

interface HelpCardProps {
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a Card that is pure educational/help content — text-only explanations
 * with no live calculator outputs. Hidden client-side when Expert Mode is on.
 * Identical to <Card> in default state, so swapping <Card> → <HelpCard> at any
 * call site only adds the auto-hide behavior.
 *
 * Use this for "Why X matters", "How it works", "Reference" cards.
 * DO NOT use it for cards that show live results, comparisons, or interactive
 * data — those should remain a plain <Card>.
 */
export function HelpCard({ className, children }: HelpCardProps) {
  const { expertMode } = usePreferences();
  if (expertMode) return null;
  return <Card className={className}>{children}</Card>;
}

interface HelpSidebarProps {
  className?: string;
  children: ReactNode;
}

/**
 * Wraps the whole right-rail <aside> when its only contents are HelpCards.
 * Returns null in Expert Mode so the parent flex layout collapses the column
 * and the left calculator content expands to full width.
 *
 * Use this instead of <aside> when the entire sidebar is educational content.
 * For sidebars that also contain a live output card, keep <aside> as-is and
 * just wrap the help-only Cards with <HelpCard>.
 */
export function HelpSidebar({ className, children }: HelpSidebarProps) {
  const { expertMode } = usePreferences();
  if (expertMode) return null;
  return <aside className={className}>{children}</aside>;
}
