import { useState } from "react";
import { Save, FolderOpen, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalcPresets, type CalcPreset } from "@/hooks/useCalcPresets";
import { useAuth } from "@/context/AuthContext";

interface PresetBarProps<S extends Record<string, unknown>> {
  calcSlug: string;
  /** Current input state to be saved when the user clicks Save. */
  state: S;
  /** Called with a preset's stored state when the user picks it from the list. */
  onLoad: (state: S) => void;
}

// Renders Load / Save controls for a calculator. Drop into the page header
// near the title. Per-calc wiring is just two props: the current state object
// and an onLoad handler that restores it.
export function PresetBar<S extends Record<string, unknown>>({ calcSlug, state, onLoad }: PresetBarProps<S>) {
  const { isSignedIn, isLoaded } = useAuth();
  const { presets, isLoading, save, remove, saveError, isSaving } = useCalcPresets(calcSlug);

  const [saveOpen, setSaveOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="text-xs text-muted-foreground italic">
        <a href="/sign-in" className="text-[#E85D04] hover:underline">Sign in</a> to save presets.
      </div>
    );
  }

  async function handleSave() {
    const name = draftName.trim();
    if (!name) return;
    try {
      await save(name, state);
      setDraftName("");
      setSaveOpen(false);
    } catch {
      // Error surfaces via saveError; dialog stays open so user can adjust the name.
    }
  }

  async function handleDelete(p: CalcPreset) {
    if (!confirm(`Delete preset "${p.name}"?`)) return;
    try { await remove(p.id); } catch { /* ignore */ }
  }

  function handleLoad(p: CalcPreset) {
    onLoad(p.state as S);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Load dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            Load
            {presets.length > 0 && (
              <span className="text-xs text-muted-foreground">({presets.length})</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Saved Presets
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : presets.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              No saved presets yet. Click <span className="font-semibold">Save Preset</span> to create one.
            </div>
          ) : (
            presets.map((p) => (
              <DropdownMenuItem
                key={p.id}
                className="group cursor-pointer flex items-center justify-between gap-2"
                onSelect={() => handleLoad(p)}
              >
                <span className="truncate">{p.name}</span>
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(p);
                  }}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={(o) => { setSaveOpen(o); if (!o) setDraftName(""); }}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save Preset
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save the current inputs so you can reload them later with one click.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset name</Label>
            <Input
              id="preset-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder='e.g. "My 383 stroker"'
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && draftName.trim()) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            {saveError && (
              <p className="text-xs text-red-500">{saveError.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!draftName.trim() || isSaving}
              className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white"
            >
              {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
