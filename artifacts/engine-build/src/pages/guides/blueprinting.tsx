import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/blueprinting.mjs";

export default function BlueprintingGuide() {
  return (
    <GuideContent
      data={content}
      level="Advanced"
      title="Blueprinting an Engine"
      description="What it really means, what gets blueprinted, and whether it's worth the cost."
    />
  );
}
