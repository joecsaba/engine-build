import { Link } from "wouter";
import { useBuildContext } from "@/context/BuildContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Wrench } from "lucide-react";

/**
 * Shows a banner at the top of a calculator when there's an active build.
 * Lets the user know data is flowing to/from their build and provides
 * a link back to the build sheet.
 *
 * Also provides a "Save to Build" button that can be used to explicitly
 * save specific values.
 */

type SaveField = {
  label: string;
  key: string;
  value: string;
  suffix?: string;
};

export function BuildBanner({ savedFields }: { savedFields?: SaveField[] }) {
  const { activeBuild, setField, isSyncing } = useBuildContext();

  if (!activeBuild) return null;

  const fieldsWithValues = savedFields?.filter((f) => f.value && f.value !== "0" && f.value !== "NaN") ?? [];

  return (
    <div className="mb-6 rounded-lg border border-[#E85D04]/20 bg-[#E85D04]/5 overflow-hidden">
      {/* Build context bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-4 h-4 text-[#E85D04] shrink-0" />
          <span className="text-sm font-medium text-[#E85D04] truncate">
            Building: {activeBuild.name}
          </span>
        </div>
        <Link href={`/build-sheets/build/${activeBuild.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E85D04]/30 text-[#E85D04] hover:bg-[#E85D04] hover:text-white shrink-0 h-7 text-xs"
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back to Build
          </Button>
        </Link>
      </div>

      {/* Saved values */}
      {fieldsWithValues.length > 0 && (
        <div className="px-4 py-2.5 bg-white border-t border-[#E85D04]/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saved to your build</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {fieldsWithValues.map((f) => (
              <div key={f.key} className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-500">{f.label}:</span>
                <span className="font-mono font-bold text-gray-900">{f.value}{f.suffix ?? ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
