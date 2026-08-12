import { GuideContent } from "@/components/guides/GuideContent";
import content from "@/data/guideContent/break-in.mjs";

export default function BreakInGuide() {
  return (
    <GuideContent
      data={content}
      level="Beginner"
      title="Engine Break-In Procedure"
      description="Flat-tappet AND roller cam break-in. The ZDDP controversy explained."
    />
  );
}
