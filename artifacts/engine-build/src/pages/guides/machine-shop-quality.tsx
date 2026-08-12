import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/machine-shop-quality.mjs";

export default function MachineShopQualityGuide() {
  return (
    <GuideContent
      data={content}
      level="Intermediate"
      title="How to Evaluate Machine Shop Work"
      description="What to inspect, red flags to catch, and questions to ask before paying."
    />
  );
}
