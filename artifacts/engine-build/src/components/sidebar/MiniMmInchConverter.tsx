import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUnitDirection } from "@/hooks/useUnitDirection";

const MM_PER_INCH = 25.4;

function toFraction64(decimalInches: number): string {
  if (decimalInches <= 0) return "—";
  const totalParts = Math.round(decimalInches * 64);
  if (totalParts === 0) return '0"';
  const whole = Math.floor(totalParts / 64);
  let num = totalParts % 64;
  if (num === 0) return whole + '"';
  let d = 64;
  while (num % 2 === 0 && d % 2 === 0) { num /= 2; d /= 2; }
  if (whole > 0) return `${whole}-${num}/${d}"`;
  return `${num}/${d}"`;
}

export function MiniMmInchConverter() {
  const [direction, setDirection] = useUnitDirection<"mm-to-in" | "in-to-mm">({
    imperial: "mm-to-in",
    metric: "in-to-mm",
  });
  const [value, setValue] = useState("");

  const parsed = parseFloat(value);
  const hasInput = value.trim() !== "" && !isNaN(parsed);
  const result = hasInput
    ? (direction === "mm-to-in" ? parsed / MM_PER_INCH : parsed * MM_PER_INCH)
    : 0;

  const inputLabel = direction === "mm-to-in" ? "MM" : "Inches";
  const outputLabel = direction === "mm-to-in" ? "Inches" : "MM";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
          {inputLabel} → {outputLabel}
        </span>
        <button
          type="button"
          aria-label="Swap conversion direction"
          onClick={() => setDirection(direction === "mm-to-in" ? "in-to-mm" : "mm-to-in")}
          className="p-1 rounded hover:bg-muted text-gray-500 hover:text-[#E85D04] transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <Input
        type="text"
        inputMode="decimal"
        placeholder={direction === "mm-to-in" ? "0.00" : "0.0000"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-mono text-base h-9"
      />
      <div className="bg-[#1a1a1a] rounded-md p-2.5 text-white">
        {hasInput ? (
          <div className="space-y-0.5">
            <p className="text-xl font-bold font-mono text-[#E85D04] tracking-wide leading-tight">
              {result.toFixed(direction === "mm-to-in" ? 4 : 3)}
              <span className="text-xs text-gray-400 ml-1.5 font-sans">{direction === "mm-to-in" ? "in" : "mm"}</span>
            </p>
            {direction === "mm-to-in" && result > 0 && (
              <p className="text-[11px] text-amber-400 font-mono">≈ {toFraction64(result)}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-xs">Enter a value</p>
        )}
      </div>
      <Link href="/calculators/mm-inch-converter" className="block text-[11px] text-[#E85D04] hover:underline">
        Open full converter →
      </Link>
    </div>
  );
}
