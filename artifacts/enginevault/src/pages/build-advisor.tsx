import { SEOHead } from "@/components/SEOHead";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function BuildAdvisor() {
  return (
    <>
      <SEOHead
        title="Build Advisor — HP Estimation & Build Planner"
        description="Interactive engine build advisor. Set a target HP, choose your platform, and tune components with live sliders to see estimated power. Includes HP estimation, build validation, compression ratio calculator, and timeslip HP calculator."
        canonical="/build-advisor"
        keywords="engine build advisor, HP estimator, horsepower calculator, engine build planner, cam duration calculator, head flow CFM, build validation, compression ratio, stroker engine"
      />
      <div className="w-full" style={{ height: "calc(100vh - 64px)" }}>
        <iframe
          src={`${BASE}/build-advisor-calc.html`}
          title="Engine Build Advisor"
          className="w-full h-full border-0"
          style={{ minHeight: "800px" }}
        />
      </div>
    </>
  );
}
