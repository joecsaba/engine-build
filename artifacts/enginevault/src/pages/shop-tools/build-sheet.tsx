import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

function Field({ label, value, onChange, span }: { label: string; value: string; onChange: (v: string) => void; span?: boolean }) {
  return (
    <div className={`space-y-1 ${span ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export default function BuildSheet() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const setField = (key: string, val: string) => setFields(prev => ({ ...prev, [key]: val }));
  const f = (key: string) => fields[key] ?? "";

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Engine Build Record Sheet</h1>
          <p className="text-muted-foreground mt-1">Complete documentation for professional engine builds. Fill in and print for your shop records.</p>
        </div>
        <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-white">
          <Printer className="w-4 h-4 mr-2" />Print / Save PDF
        </Button>
      </div>

      <div className="border-2 border-[#1a1a1a] rounded-lg overflow-hidden print:border-black">
        <div className="bg-[#1a1a1a] text-white px-6 py-4 print:bg-black">
          <h2 className="text-2xl font-bold">EngineVault Engine Build Record</h2>
          <p className="text-gray-400 text-sm">enginevault.com · For shop use — verify all specs against your factory service manual</p>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">General Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" value={f("date")} onChange={v => setField("date", v)} />
              <Field label="Builder Name" value={f("builder")} onChange={v => setField("builder", v)} />
              <Field label="Customer Name" value={f("customer")} onChange={v => setField("customer", v)} />
              <Field label="Vehicle / Application" value={f("vehicle")} onChange={v => setField("vehicle", v)} />
              <Field label="Engine Platform" value={f("platform")} onChange={v => setField("platform", v)} />
              <Field label="Block Casting #" value={f("blockCasting")} onChange={v => setField("blockCasting", v)} />
              <Field label="Block Date Code" value={f("blockDate")} onChange={v => setField("blockDate", v)} />
              <Field label="Head Casting # (Left)" value={f("headCastingL")} onChange={v => setField("headCastingL", v)} />
              <Field label="Head Casting # (Right)" value={f("headCastingR")} onChange={v => setField("headCastingR", v)} />
              <Field label="Build Number / Work Order" value={f("workOrder")} onChange={v => setField("workOrder", v)} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Block Measurements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bore Size" value={f("boreSize")} onChange={v => setField("boreSize", v)} />
              <Field label="Stroke" value={f("stroke")} onChange={v => setField("stroke", v)} />
              <Field label="Displacement (ci)" value={f("displacement")} onChange={v => setField("displacement", v)} />
              <Field label="Deck Height Measured" value={f("deckHeight")} onChange={v => setField("deckHeight", v)} />
              <Field label="Piston-to-Deck Clearance" value={f("pistonToDeck")} onChange={v => setField("pistonToDeck", v)} />
            </div>

            <h4 className="font-semibold mt-4 mb-2 text-sm">Piston-to-Wall Clearance (inches)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cyl {i + 1}</Label>
                  <Input value={f(`ptw${i + 1}`)} onChange={e => setField(`ptw${i + 1}`, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Main Bearing Clearances</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Main {i + 1}</Label>
                  <Input value={f(`main${i + 1}`)} onChange={e => setField(`main${i + 1}`, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Rod Bearing Clearances</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rod {i + 1}</Label>
                  <Input value={f(`rod${i + 1}`)} onChange={e => setField(`rod${i + 1}`, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Components</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Piston Brand / Part #" value={f("pistonPart")} onChange={v => setField("pistonPart", v)} />
              <Field label="Ring Brand / Part #" value={f("ringPart")} onChange={v => setField("ringPart", v)} />
              <Field label="Connecting Rod Brand / Part #" value={f("rodPart")} onChange={v => setField("rodPart", v)} />
              <Field label="Crankshaft" value={f("crankPart")} onChange={v => setField("crankPart", v)} />
              <Field label="Main Bearing Brand / Size" value={f("mainBearing")} onChange={v => setField("mainBearing", v)} />
              <Field label="Rod Bearing Brand / Size" value={f("rodBearing")} onChange={v => setField("rodBearing", v)} />
              <Field label="Cam Bearing Brand" value={f("camBearing")} onChange={v => setField("camBearing", v)} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Top End</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Head Gasket Brand / Part # / Thickness" value={f("headGasket")} onChange={v => setField("headGasket", v)} />
              <Field label="Static Compression Ratio" value={f("staticCR")} onChange={v => setField("staticCR", v)} />
              <Field label="Intake Manifold" value={f("intake")} onChange={v => setField("intake", v)} />
              <Field label="Carburetor / Injectors" value={f("fuel")} onChange={v => setField("fuel", v)} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Camshaft Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cam Brand / Part #" value={f("camPart")} onChange={v => setField("camPart", v)} />
              <Field label="Cam Type (Hydraulic/Solid/Flat/Roller)" value={f("camType")} onChange={v => setField("camType", v)} />
              <Field label='Duration at 0.050" (Intake / Exhaust)' value={f("camDuration")} onChange={v => setField("camDuration", v)} />
              <Field label="Lift (Intake / Exhaust)" value={f("camLift")} onChange={v => setField("camLift", v)} />
              <Field label="LSA" value={f("camLSA")} onChange={v => setField("camLSA", v)} />
              <Field label="Intake Centerline Installed" value={f("camICL")} onChange={v => setField("camICL", v)} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Valve Springs (Installed Height per Cylinder)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cyl {i + 1}</Label>
                  <Input value={f(`vs${i + 1}`)} onChange={e => setField(`vs${i + 1}`, e.target.value)} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 border-b pb-2">Notes</h3>
            <textarea
              value={f("notes")}
              onChange={e => setField("notes", e.target.value)}
              className="w-full h-32 p-3 border rounded-lg text-sm resize-none bg-background"
              placeholder="Special clearances, deviations from spec, observations..."
            />
          </section>

          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>EngineVault Engine Build Record | enginevault.com | Always verify all specifications against your factory service manual. This document is for reference only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
