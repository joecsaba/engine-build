import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Info, AlertTriangle } from "lucide-react";
import { CalculatorContent } from "@/components/calculators/CalculatorContent";
import intakeManifoldMillingContent from "@/data/calculatorContent/intake-manifold-milling.mjs";

// ── Engine data ──────────────────────────────────────────────────────────────

interface EnginePreset {
  label: string;
  group: string;
  headAngle: number;
  intakeFactor: number;   // Surface B per 0.010" deck milling
  blockFactor: number;    // Surface C per 0.010" deck milling (0 = not required)
  ccPer001: number;       // cc removed per 0.001" of head milling (for reference)
  notes?: string;
}

// Per-platform intake/block correction factors below come from Engine Builder Magazine's
// "Intake Manifold Surfacing" reference chart (long-standing industry reference, also reprinted
// in Speed Pro/Federal Mogul technical bulletins). Values are mils of intake/block surface
// removal required per 0.010" of head deck milling to maintain intake port alignment.
const ENGINE_PRESETS: EnginePreset[] = [
  // Chevrolet
  { label: "SBC 265-400 (64cc chamber)",  group: "Chevrolet", headAngle: 10, intakeFactor: 0.0123, blockFactor: 0.0173, ccPer001: 0.58,  notes: "23° valve angle heads" },
  { label: "SBC 265-400 (76cc chamber)",  group: "Chevrolet", headAngle: 10, intakeFactor: 0.0123, blockFactor: 0.0173, ccPer001: 0.68 },
  { label: "BBC 396-454 (107cc closed)",  group: "Chevrolet", headAngle: 10, intakeFactor: 0.007,  blockFactor: 0.0193, ccPer001: 0.65,  notes: "Closed chamber rectangle port" },
  { label: "BBC 396-454 (118cc open)",    group: "Chevrolet", headAngle: 10, intakeFactor: 0.007,  blockFactor: 0.0181, ccPer001: 0.60,  notes: "Open chamber oval port" },

  // Ford
  { label: "Ford SB 221-302 (1965-72)",   group: "Ford", headAngle: 0,  intakeFactor: 0.010,  blockFactor: 0.0143, ccPer001: 0.58 },
  { label: "Ford FE 352-428",             group: "Ford", headAngle: 0,  intakeFactor: 0.010,  blockFactor: 0.0143, ccPer001: 0.45,  notes: "45° included valve angle" },
  { label: "Ford 351 Cleveland",          group: "Ford", headAngle: 0,  intakeFactor: 0.010,  blockFactor: 0.0143, ccPer001: 0.50 },
  { label: "Ford 385 Series (429/460)",   group: "Ford", headAngle: 0,  intakeFactor: 0.010,  blockFactor: 0.0143, ccPer001: 0.60 },
  { label: "Ford Y-Block",               group: "Ford", headAngle: 15, intakeFactor: 0.014,  blockFactor: 0.0143, ccPer001: 0.50 },

  // Chrysler / Mopar
  { label: "Chrysler LA 273-318 (67-81cc)",  group: "Chrysler", headAngle: -3,  intakeFactor: 0.0095, blockFactor: 0.0144, ccPer001: 0.53 },
  { label: "Chrysler LA 340-360 (63-71cc)",  group: "Chrysler", headAngle: -3,  intakeFactor: 0.0095, blockFactor: 0.0144, ccPer001: 0.48 },
  { label: "Chrysler B/RB 66-73cc",          group: "Chrysler", headAngle: 10,  intakeFactor: 0.0123, blockFactor: 0,      ccPer001: 0.62,  notes: "No block-side correction needed" },
  { label: "Chrysler B/RB 79-83cc",          group: "Chrysler", headAngle: 10,  intakeFactor: 0.0123, blockFactor: 0,      ccPer001: 0.42,  notes: "No block-side correction needed" },
  { label: "Chrysler B/RB Max Wedge",        group: "Chrysler", headAngle: 10,  intakeFactor: 0.012,  blockFactor: 0.017,  ccPer001: 0.50 },
  { label: "Chrysler 426 Hemi",              group: "Chrysler", headAngle: -13, intakeFactor: 0.0085, blockFactor: 0,      ccPer001: 0.50,  notes: "Negative face angle" },
  { label: "Chrysler Early Hemi 331-392",    group: "Chrysler", headAngle: 25,  intakeFactor: 0.0207, blockFactor: 0,      ccPer001: 0.50 },

  // Oldsmobile
  { label: "Olds Rocket 303-394 (1949-63)",  group: "Oldsmobile", headAngle: 20, intakeFactor: 0.013,  blockFactor: 0.0169, ccPer001: 0.50 },
  { label: "Olds 330-455 (1964+)",           group: "Oldsmobile", headAngle: 0,  intakeFactor: 0.013,  blockFactor: 0.0169, ccPer001: 0.50 },
  { label: "Olds 350",                       group: "Oldsmobile", headAngle: 0,  intakeFactor: 0.013,  blockFactor: 0.0169, ccPer001: 0.60 },

  // Pontiac
  { label: "Pontiac 1955-67",                group: "Pontiac", headAngle: 0, intakeFactor: 0.0061, blockFactor: 0, ccPer001: 0.61, notes: "No block-side correction needed" },
  { label: "Pontiac 1968-70",                group: "Pontiac", headAngle: 0, intakeFactor: 0.0052, blockFactor: 0, ccPer001: 0.52, notes: "No block-side correction needed" },
  { label: "Pontiac 1971-79",                group: "Pontiac", headAngle: 0, intakeFactor: 0.0047, blockFactor: 0, ccPer001: 0.47, notes: "No block-side correction needed" },

  // Buick
  { label: "Buick 350 (open chamber)",       group: "Buick", headAngle: 0, intakeFactor: 0.010,  blockFactor: 0.0143, ccPer001: 0.30 },

  // Cadillac
  { label: "Cadillac 472/500",               group: "Cadillac", headAngle: 25, intakeFactor: 0.020,  blockFactor: 0, ccPer001: 0.50 },
];

// ── Head angle to multiplier formula ─────────────────────────────────────────

function headAngleToFactor(angle: number): number {
  // Master formula: 0.707 / sin(45 - angle)
  const radians = (45 - angle) * (Math.PI / 180);
  const sinVal = Math.sin(radians);
  if (sinVal <= 0) return 0;
  return 0.707 / sinVal;
}

// ── Threshold logic ──────────────────────────────────────────────────────────

interface ThresholdResult {
  needsCorrection: boolean;
  severity: "none" | "marginal" | "required" | "critical";
  label: string;
  color: string;
  bg: string;
  explanation: string;
}

function getThreshold(totalDeckRemoved: number, intakeFactor: number): ThresholdResult {
  // The actual port shift is what matters
  const portShift = totalDeckRemoved * (intakeFactor / 0.010);

  if (totalDeckRemoved <= 0) {
    return { needsCorrection: false, severity: "none", label: "No milling entered", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", explanation: "" };
  }

  // Under .005" total shift — gasket can absorb it, bolt holes still line up
  if (portShift < 0.005) {
    return {
      needsCorrection: false, severity: "none",
      label: "NO CORRECTION NEEDED",
      color: "text-green-700", bg: "bg-green-50 border-green-200",
      explanation: `Port shift is only ${(portShift * 1000).toFixed(1)} thou — well within gasket tolerance. Bolt holes will line up fine.`,
    };
  }

  // .005"-.010" — gray area, test fit recommended
  if (portShift < 0.010) {
    return {
      needsCorrection: false, severity: "marginal",
      label: "TEST FIT RECOMMENDED",
      color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200",
      explanation: `Port shift is ${(portShift * 1000).toFixed(1)} thou — borderline. Dry-fit the intake with no gaskets and check bolt hole alignment before deciding. A thicker intake gasket (.060"-.120") may absorb this.`,
    };
  }

  // .010"-.020" — correction needed
  if (portShift < 0.020) {
    return {
      needsCorrection: true, severity: "required",
      label: "CORRECTION REQUIRED",
      color: "text-orange-700", bg: "bg-orange-50 border-orange-200",
      explanation: `Port shift is ${(portShift * 1000).toFixed(1)} thou — bolt holes will be noticeably off and ports will be misaligned. Mill the intake face of the heads or the intake manifold rails.`,
    };
  }

  // Over .020" — critical, major machining needed
  return {
    needsCorrection: true, severity: "critical",
    label: "SIGNIFICANT MACHINING NEEDED",
    color: "text-red-700", bg: "bg-red-50 border-red-200",
    explanation: `Port shift is ${(portShift * 1000).toFixed(1)} thou — major misalignment. The intake manifold will likely "high center" on the block before seating on the heads. Both head intake face and manifold bottom may need machining. Verify port alignment after correction.`,
  };
}

// ── Collapsible section ──────────────────────────────────────────────────────

function Section({ title, defaultOpen = false, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#1a1a1a] text-white font-semibold text-left hover:bg-[#222] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

// ── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Cross-section diagram ────────────────────────────────────────────────────

function VEngineDiagram({ highlightA, highlightB, highlightC }: {
  highlightA: boolean; highlightB: boolean; highlightC: boolean;
}) {
  const active = "#E85D04";
  const base = "#ff7f3f";
  const dim = "#444";
  const colorA = highlightA ? active : base;
  const colorB = highlightB ? active : base;
  const colorC = highlightC ? active : base;

  return (
    <svg width="100%" viewBox="0 0 600 400" className="max-w-2xl mx-auto" aria-label="V-engine cross-section showing surfaces A, B, and C">
      <rect width="600" height="400" fill="#1a1a1a" />

      {/* Block with V-shaped lifter valley */}
      <path d="M 80 350 L 80 270 L 170 180 L 220 230 L 380 230 L 430 180 L 520 270 L 520 350 Z"
        fill="#2a2a2a" stroke="#4a4a4a" strokeWidth="1" />

      {/* Heads (parallelograms tilted 45deg) */}
      <path d="M 80 270 L 170 180 L 121 131 L 31 221 Z" fill="#3a3a3a" stroke="#5a5a5a" strokeWidth="1" />
      <path d="M 520 270 L 430 180 L 479 131 L 569 221 Z" fill="#3a3a3a" stroke="#5a5a5a" strokeWidth="1" />

      {/* Intake manifold — raised to the top of the heads */}
      <path d="M 220 230 L 121 131 L 479 131 L 380 230 Z" fill="#444444" stroke="#6a6a6a" strokeWidth="1" />

      {/* Surface A: Head deck / gasket surfaces */}
      <line x1="80" y1="270" x2="170" y2="180" stroke={highlightA ? colorA : dim} strokeWidth={highlightA ? 6 : 5} />
      <line x1="520" y1="270" x2="430" y2="180" stroke={highlightA ? colorA : dim} strokeWidth={highlightA ? 6 : 5} />

      {/* Surface B: Intake manifold faces (angled — full height of head) */}
      <line x1="170" y1="180" x2="121" y2="131" stroke={highlightB ? colorB : dim} strokeWidth={highlightB ? 6 : 5} />
      <line x1="430" y1="180" x2="479" y2="131" stroke={highlightB ? colorB : dim} strokeWidth={highlightB ? 6 : 5} />

      {/* Surface C: Manifold bottom / block rail */}
      <line x1="220" y1="230" x2="380" y2="230" stroke={highlightC ? colorC : dim} strokeWidth={highlightC ? 6 : 5} />

      {/* Leader lines */}
      <line x1="125" y1="358" x2="125" y2="226" stroke="#999" strokeWidth="1" strokeDasharray="5,3" />
      <line x1="475" y1="358" x2="475" y2="226" stroke="#999" strokeWidth="1" strokeDasharray="5,3" />
      <line x1="300" y1="358" x2="300" y2="231" stroke="#999" strokeWidth="1" strokeDasharray="5,3" />
      <line x1="55" y1="68" x2="144" y2="154" stroke="#999" strokeWidth="1" strokeDasharray="5,3" />
      <line x1="545" y1="68" x2="456" y2="154" stroke="#999" strokeWidth="1" strokeDasharray="5,3" />

      {/* Circle labels — A */}
      <circle cx="125" cy="370" r="11" fill="#1a1a1a" stroke={colorA} strokeWidth="2" />
      <text x="125" y="370" textAnchor="middle" dominantBaseline="central" fill={colorA} fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">A</text>
      <circle cx="475" cy="370" r="11" fill="#1a1a1a" stroke={colorA} strokeWidth="2" />
      <text x="475" y="370" textAnchor="middle" dominantBaseline="central" fill={colorA} fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">A</text>

      {/* Circle labels — B */}
      <circle cx="47" cy="60" r="11" fill="#1a1a1a" stroke={colorB} strokeWidth="2" />
      <text x="47" y="60" textAnchor="middle" dominantBaseline="central" fill={colorB} fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">B</text>
      <circle cx="553" cy="60" r="11" fill="#1a1a1a" stroke={colorB} strokeWidth="2" />
      <text x="553" y="60" textAnchor="middle" dominantBaseline="central" fill={colorB} fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">B</text>

      {/* Circle labels — C */}
      <circle cx="300" cy="370" r="11" fill="#1a1a1a" stroke={colorC} strokeWidth="2" />
      <text x="300" y="370" textAnchor="middle" dominantBaseline="central" fill={colorC} fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">C</text>

      {/* Part labels */}
      <text x="86" y="230" textAnchor="middle" dominantBaseline="central" fill="#dddddd" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="bold" letterSpacing="1.5" transform="rotate(-45 86 230)">HEAD</text>
      <text x="514" y="230" textAnchor="middle" dominantBaseline="central" fill="#dddddd" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="bold" letterSpacing="1.5" transform="rotate(45 514 230)">HEAD</text>
      <text x="300" y="305" textAnchor="middle" dominantBaseline="central" fill="#dddddd" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="bold" letterSpacing="2">BLOCK</text>
      <text x="300" y="175" textAnchor="middle" dominantBaseline="central" fill="#dddddd" fontFamily="ui-monospace, monospace" fontSize="10" fontWeight="bold" letterSpacing="1.5">INTAKE MANIFOLD</text>

      {/* Legend */}
      <text x="300" y="392" textAnchor="middle" fill="#bbbbbb" fontFamily="ui-monospace, monospace" fontSize="10">
        A = Head deck (gasket surface)  |  B = Intake face  |  C = Manifold bottom
      </text>
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function IntakeManifoldMillingCalculator() {
  const [selectedEngine, setSelectedEngine] = useState("");
  const [headMill, setHeadMill] = useState("");
  const [blockMill, setBlockMill] = useState("");
  const [correctionTarget, setCorrectionTarget] = useState<"heads" | "manifold">("heads");

  // Custom angle mode
  const [useCustom, setUseCustom] = useState(false);
  const [customAngle, setCustomAngle] = useState("");
  const [customIntakeFactor, setCustomIntakeFactor] = useState("");
  const [customBlockFactor, setCustomBlockFactor] = useState("");

  // Parse inputs
  const headMillVal = parseFloat(headMill) || 0;
  const blockMillVal = parseFloat(blockMill) || 0;
  const totalDeckRemoved = headMillVal + blockMillVal;

  // Get preset or custom values
  const preset = ENGINE_PRESETS.find(p => p.label === selectedEngine);
  const intakeFactor = useCustom
    ? (parseFloat(customIntakeFactor) || 0)
    : (preset?.intakeFactor ?? 0);
  const blockFactor = useCustom
    ? (parseFloat(customBlockFactor) || 0)
    : (preset?.blockFactor ?? 0);
  const headAngle = useCustom
    ? (parseFloat(customAngle) || 0)
    : (preset?.headAngle ?? 0);
  const ccPer001 = preset?.ccPer001 ?? 0;

  // Calculate corrections
  // The factors in the table are "per 0.010" of deck removal"
  const multiplier = intakeFactor / 0.010; // convert to per-thou multiplier
  const blockMultiplier = blockFactor / 0.010;

  const intakeCorrection = totalDeckRemoved * multiplier;
  const blockCorrection = blockFactor > 0 ? totalDeckRemoved * blockMultiplier : 0;

  // Chamber volume reduction from head milling
  const ccReduction = headMillVal * ccPer001 * 1000; // ccPer001 is per 0.001", headMillVal is in inches

  // Threshold assessment
  const threshold = getThreshold(totalDeckRemoved, intakeFactor);

  // Group presets by manufacturer
  const groups = ENGINE_PRESETS.reduce<Record<string, EnginePreset[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const hasInputs = totalDeckRemoved > 0 && (intakeFactor > 0 || useCustom);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SEOHead
        title="Intake Manifold Milling Calculator | Head & Block Surfacing Correction"
        description="Calculate how much to mill the intake manifold or head intake face after surfacing cylinder heads or decking the block. Covers SBC, BBC, Ford, Chrysler, Pontiac, Oldsmobile, Buick, and Cadillac V8 engines."
        canonical="/calculators/intake-manifold-milling"
        keywords="intake manifold milling calculator, head surfacing correction, intake alignment, cylinder head milling, block decking, intake manifold machining, SBC intake milling, BBC intake milling"
      />

      <h1 className="text-3xl font-bold mb-2">Intake Manifold Milling Calculator</h1>
      <p className="text-muted-foreground mb-8">
        When you surface heads or deck a block on a V-engine, the intake manifold ports shift inward.
        This calculator tells you how much to correct — and whether you even need to.
      </p>

      {/* ── Diagram ── */}
      <Card className="mb-8 bg-[#1a1a1a] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">V-Engine Cross Section — Surfaces A, B &amp; C</CardTitle>
          <p className="text-xs text-gray-400 mt-1">
            Surface A is where you mill. Surfaces B and C are what you correct.
            {hasInputs && " Active surfaces are highlighted in orange."}
          </p>
        </CardHeader>
        <CardContent>
          <VEngineDiagram
            highlightA={totalDeckRemoved > 0}
            highlightB={hasInputs && intakeCorrection > 0}
            highlightC={hasInputs && blockCorrection > 0}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* ── Left column: Inputs & Results ── */}
        <div className="flex-1 min-w-0">

          {/* ── Engine Selection ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Engine Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex rounded-lg border overflow-hidden mb-4">
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      !useCustom ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setUseCustom(false)}
                  >
                    <span className="block font-semibold">Select Engine</span>
                    <span className="block text-xs mt-0.5 opacity-75">Pick from database</span>
                  </button>
                  <button
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      useCustom ? "bg-[#1a1a1a] text-white" : "bg-white text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setUseCustom(true)}
                  >
                    <span className="block font-semibold">Custom Angle</span>
                    <span className="block text-xs mt-0.5 opacity-75">Enter head angle manually</span>
                  </button>
                </div>

                {!useCustom ? (
                  <Field label="Engine / Head Type">
                    <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                      <SelectTrigger><SelectValue placeholder="Select your engine..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(groups).map(([group, engines]) => (
                          <div key={group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                            {engines.map(e => (
                              <SelectItem key={e.label} value={e.label}>{e.label}</SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <div className="space-y-3">
                    <Field label="Head Angle (degrees)" hint="Angle of intake face from perpendicular. SBC = 10, 0 = square. Negative for LA Mopar.">
                      <Input type="number" step="1" value={customAngle} onChange={e => setCustomAngle(e.target.value)} placeholder="10" />
                    </Field>
                    <Field label={'Intake Factor (per 0.010" deck removal)'} hint={'Amount to remove from intake face per 0.010" of deck milling'}>
                      <Input type="number" step="0.0001" value={customIntakeFactor} onChange={e => setCustomIntakeFactor(e.target.value)} placeholder="0.0123" />
                    </Field>
                    <Field label={'Block/Manifold Bottom Factor (per 0.010")'} hint="Amount to remove from manifold bottom. Enter 0 if not required.">
                      <Input type="number" step="0.0001" value={customBlockFactor} onChange={e => setCustomBlockFactor(e.target.value)} placeholder="0.0173" />
                    </Field>
                    {customAngle && (
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-muted-foreground">
                        Calculated factor from formula: <strong className="text-foreground">{headAngleToFactor(parseFloat(customAngle) || 0).toFixed(4)}</strong>
                        <span className="ml-1">(0.707 / sin(45&deg; - {customAngle}&deg;))</span>
                      </div>
                    )}
                  </div>
                )}

                {preset && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Head angle:</span>
                      <span className="font-semibold">{preset.headAngle}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intake factor:</span>
                      <span className="font-mono">{preset.intakeFactor}" per 0.010"</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Block/bottom factor:</span>
                      <span className="font-mono">{preset.blockFactor > 0 ? `${preset.blockFactor}" per 0.010"` : "Not required"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CC per 0.001" head mill:</span>
                      <span className="font-mono">{preset.ccPer001} cc</span>
                    </div>
                    {preset.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">{preset.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Milling Inputs ── */}
            <Card>
              <CardHeader>
                <CardTitle>Amount Removed</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Enter the total material removed from the head deck and/or block deck. Leave at 0 if no milling was done on that surface.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Head Deck Milling (inches)" hint="Material removed from the head gasket surface">
                  <Input
                    type="number"
                    step="0.001"
                    value={headMill}
                    onChange={e => setHeadMill(e.target.value)}
                    placeholder="0.030"
                  />
                </Field>
                <Field label="Block Deck Milling (inches)" hint="Material removed from the block deck surface">
                  <Input
                    type="number"
                    step="0.001"
                    value={blockMill}
                    onChange={e => setBlockMill(e.target.value)}
                    placeholder="0.000"
                  />
                </Field>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total deck removed:</span>
                    <span className="font-bold font-mono">{totalDeckRemoved.toFixed(4)}"</span>
                  </div>
                  {ccPer001 > 0 && headMillVal > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Chamber volume reduction (per head):</span>
                      <span className="font-mono">~{ccReduction.toFixed(1)} cc</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Field label="Where to apply correction?" hint="Most builders prefer milling the intake face of the heads — keeps the intake manifold universal.">
                    <Select value={correctionTarget} onValueChange={v => setCorrectionTarget(v as "heads" | "manifold")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heads">Intake face of the heads (recommended)</SelectItem>
                        <SelectItem value="manifold">Intake manifold rails</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Threshold Warning ── */}
          {totalDeckRemoved > 0 && intakeFactor > 0 && (
            <div className={`mb-6 p-5 rounded-xl border-2 ${threshold.bg}`}>
              <div className="flex items-start gap-3">
                {threshold.severity === "none" ? (
                  <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-green-700 text-lg font-bold">&#10003;</span>
                  </div>
                ) : (
                  <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${threshold.color}`} />
                )}
                <div>
                  <p className={`font-bold text-lg ${threshold.color}`}>{threshold.label}</p>
                  <p className={`text-sm mt-1 ${threshold.color.replace("700", "600")}`}>{threshold.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {hasInputs && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Surface B — Intake face */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle className="text-base">
                    Surface B — {correctionTarget === "heads" ? "Head Intake Face" : "Manifold Rails"}
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-1">
                    The intake manifold mating surface on each head (or both sides of the intake manifold)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Amount to remove</p>
                    <p className="text-5xl font-bold text-[#E85D04]">
                      {intakeCorrection.toFixed(4)}"
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      {totalDeckRemoved.toFixed(4)}" deck &times; {multiplier.toFixed(3)} factor
                    </p>
                    {correctionTarget === "manifold" && (
                      <p className="text-xs text-yellow-400 mt-2">
                        Mill this amount from BOTH sides of the intake manifold
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Surface C — Manifold bottom / block side */}
              <Card className="bg-[#1a1a1a] text-white">
                <CardHeader>
                  <CardTitle className="text-base">Surface C — Manifold Bottom / Block Side</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">
                    The bottom of the intake manifold where it contacts the block (lifter valley)
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    {blockFactor > 0 ? (
                      <>
                        <p className="text-gray-400 text-sm">Amount to remove</p>
                        <p className="text-5xl font-bold text-[#E85D04]">
                          {blockCorrection.toFixed(4)}"
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {totalDeckRemoved.toFixed(4)}" deck &times; {blockMultiplier.toFixed(3)} factor
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400 text-sm mb-2">Amount to remove</p>
                        <p className="text-3xl font-bold text-green-400">Not Required</p>
                        <p className="text-sm text-gray-400 mt-2">
                          This engine does not require manifold bottom correction
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Milling Scenarios Table ── */}
          {intakeFactor > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Quick Reference — Common Milling Amounts</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {preset ? `For ${preset.label}` : `For ${headAngle}° head angle`} — how much correction is needed at various deck milling depths
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="text-left p-3">Deck Removed</th>
                        <th className="text-right p-3">Intake Face (B)</th>
                        {blockFactor > 0 && <th className="text-right p-3">Manifold Bottom (C)</th>}
                        <th className="text-left p-3 pl-4">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0.005, 0.010, 0.015, 0.020, 0.030, 0.040, 0.050, 0.060, 0.080, 0.100].map((amt, i) => {
                        const b = amt * multiplier;
                        const c = amt * blockMultiplier;
                        const t = getThreshold(amt, intakeFactor);
                        const isCurrentRow = Math.abs(amt - totalDeckRemoved) < 0.0005;
                        return (
                          <tr
                            key={i}
                            className={`border-b ${
                              isCurrentRow
                                ? "bg-[#E85D04]/10 ring-1 ring-inset ring-[#E85D04]/30 font-semibold"
                                : i % 2 === 0 ? "" : "bg-muted/30"
                            }`}
                          >
                            <td className="p-3 font-mono">{amt.toFixed(3)}"</td>
                            <td className="text-right p-3 font-mono">{b.toFixed(4)}"</td>
                            {blockFactor > 0 && <td className="text-right p-3 font-mono">{c.toFixed(4)}"</td>}
                            <td className={`p-3 pl-4 text-xs font-semibold ${t.color}`}>{t.label}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── All Engines Reference Table ── */}
          <div className="mt-5">
            <Section title="Full Engine Reference Table">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left p-3">Engine</th>
                      <th className="text-right p-3">Head Angle</th>
                      <th className="text-right p-3">Intake Face (B) per 0.010"</th>
                      <th className="text-right p-3">Block Side (C) per 0.010"</th>
                      <th className="text-right p-3">CC per 0.001"</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groups).map(([group, engines]) => (
                      <>
                        <tr key={group} className="bg-gray-100">
                          <td colSpan={5} className="p-2 font-bold text-sm">{group}</td>
                        </tr>
                        {engines.map((e, i) => {
                          const isSelected = e.label === selectedEngine;
                          return (
                            <tr
                              key={e.label}
                              onClick={() => { setSelectedEngine(e.label); setUseCustom(false); }}
                              className={`border-b cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#E85D04]/10 ring-1 ring-inset ring-[#E85D04]/30"
                                  : i % 2 === 0 ? "hover:bg-muted/50" : "bg-muted/20 hover:bg-muted/50"
                              }`}
                            >
                              <td className="p-3">{e.label}</td>
                              <td className="text-right p-3 font-mono">{e.headAngle}°</td>
                              <td className="text-right p-3 font-mono">{e.intakeFactor}"</td>
                              <td className="text-right p-3 font-mono">{e.blockFactor > 0 ? `${e.blockFactor}"` : "N/A"}</td>
                              <td className="text-right p-3 font-mono">{e.ccPer001}</td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

        </div>{/* end left column */}

        {/* ── Right sidebar ── */}
        <aside className="xl:w-80 shrink-0 space-y-6">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E85D04]" />
                Quick Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Do I Need to Correct?</h4>
                <ul className="space-y-1 mt-1">
                  <li><span className="font-medium text-green-600">Under .005" shift:</span> No</li>
                  <li><span className="font-medium text-yellow-600">.005"-.010" shift:</span> Test fit</li>
                  <li><span className="font-medium text-orange-600">.010"-.020" shift:</span> Yes</li>
                  <li><span className="font-medium text-red-600">Over .020" shift:</span> Critical</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Common Head Angles</h4>
                <ul className="space-y-1 mt-1 text-xs">
                  <li className="flex justify-between"><span>SBC:</span><span className="font-mono">10°</span></li>
                  <li className="flex justify-between"><span>BBC:</span><span className="font-mono">10°</span></li>
                  <li className="flex justify-between"><span>Ford SB/FE/385:</span><span className="font-mono">0°</span></li>
                  <li className="flex justify-between"><span>Chrysler LA:</span><span className="font-mono">-3°</span></li>
                  <li className="flex justify-between"><span>Chrysler B/RB:</span><span className="font-mono">10°</span></li>
                  <li className="flex justify-between"><span>Pontiac:</span><span className="font-mono">0°</span></li>
                  <li className="flex justify-between"><span>Olds (early):</span><span className="font-mono">20°</span></li>
                  <li className="flex justify-between"><span>Cadillac:</span><span className="font-mono">25°</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Heads vs. Manifold</h4>
                <p>Mill the intake face of the <strong>heads</strong> whenever possible. This keeps the intake manifold at stock dimensions so it can be reused on other engines. Milling the manifold locks it to that specific build.</p>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-foreground mb-1">Don't Forget</h4>
                <ul className="space-y-1 mt-1 text-xs">
                  <li>Thicker gaskets (.060"-.120") can help with minor misalignment</li>
                  <li>Always dry-fit before final assembly</li>
                  <li>Port milling only corrects height — not side-to-side alignment</li>
                  <li>Check pushrod length after head milling</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </aside>

      </div>{/* end flex row */}

      <CalculatorContent data={intakeManifoldMillingContent} title="Intake Manifold Milling" />
    </div>
  );
}
