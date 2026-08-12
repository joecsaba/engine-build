import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/bearing-clearance.mjs";

export default function BearingClearanceGuide() {
  return (
    <GuideContent
      data={content}
      level="Beginner"
      title="How to Check Bearing Clearance"
      description="The definitive guide to using Plastigage for main and rod bearings."
    />
  );
}
