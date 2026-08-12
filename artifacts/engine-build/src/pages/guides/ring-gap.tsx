import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/ring-gap.mjs";

export default function RingGapGuide() {
  return (
    <GuideContent
      data={content}
      level="Beginner"
      title="How to Set Piston Ring End Gap"
      description="Proper ring filing technique, stagger positions, and oil ring installation."
    />
  );
}
