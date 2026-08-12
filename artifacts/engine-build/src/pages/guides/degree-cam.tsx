import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/degree-cam.mjs";

export default function DegreeCamGuide() {
  return (
    <GuideContent
      data={content}
      level="Intermediate"
      title="How to Degree a Camshaft"
      description="Finding true TDC, using the degree wheel, and verifying cam timing."
    />
  );
}
