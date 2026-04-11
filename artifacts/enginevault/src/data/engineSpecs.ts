export type ClearanceSpec = {
  min: number;
  max: number;
  unit: string;
  label: string;
};

export type EngineSpecs = {
  name: string;
  bore: string;
  stroke: string;
  displacement: string;
  firingOrder: string;
  cylinders: number;
  specs: Record<string, ClearanceSpec>;
  torque: Record<string, string>;
};

export type BuildEngineSlug = "ls1" | "sbc350" | "coyote50";

export const ENGINE_OPTIONS: { slug: BuildEngineSlug; label: string }[] = [
  { slug: "ls1", label: "GM LS1 (5.7L Gen III)" },
  { slug: "sbc350", label: "GM SBC 350 (Gen I)" },
  { slug: "coyote50", label: "Ford Coyote 5.0 (Gen II)" },
];
