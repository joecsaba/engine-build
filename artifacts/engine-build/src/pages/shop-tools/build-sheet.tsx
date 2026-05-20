import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EngineSpecs } from "@/data/engineSpecs";
import { ENGINE_OPTIONS } from "@/data/engineSpecs";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PlanTier = "free" | "builder" | "shop" | "enterprise";
type BuildMode = "diy" | "pro";
type ActualValues = Record<string, string | Record<number, string>>;

interface Collaborator {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface CustomSpec {
  min: number;
  max: number;
  unit: string;
  label: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GUEST_USER: Collaborator = { id: "guest", name: "You (Guest)", color: "#E85D04", initials: "ME" };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getStatus(value: string | Record<number, string> | undefined, spec: { min: number; max: number }, customSpec?: { min: number; max: number }): string {
  if (!value || value === "") return "empty";
  const v = parseFloat(value as string);
  if (isNaN(v)) return "empty";
  const s = customSpec || spec;
  if (v < s.min) return "low";
  if (v > s.max) return "high";
  const range = s.max - s.min;
  const margin = range * 0.15;
  if (v < s.min + margin || v > s.max - margin) return "warn";
  return "ok";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    empty: { bg: "#F3F4F6", color: "#9CA3AF", label: "—" },
    ok:    { bg: "#DCFCE7", color: "#166534", label: "OK" },
    warn:  { bg: "#FEF9C3", color: "#854D0E", label: "CHECK" },
    low:   { bg: "#FEE2E2", color: "#991B1B", label: "LOW" },
    high:  { bg: "#FEE2E2", color: "#991B1B", label: "HIGH" },
  };
  const s = styles[status] || styles.empty;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
      fontFamily: "monospace", display: "inline-block", minWidth: 46, textAlign: "center"
    }}>{s.label}</span>
  );
}

function CollabAvatar({ user, size = 22 }: { user: Collaborator; size?: number }) {
  return (
    <span title={user.name} style={{
      width: size, height: size, borderRadius: "50%",
      background: user.color + "22", border: `1.5px solid ${user.color}`,
      color: user.color, fontSize: size * 0.38, fontWeight: 700,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "monospace", flexShrink: 0
    }}>{user.initials}</span>
  );
}

// ─── CLEARANCE ROW ───────────────────────────────────────────────────────────

interface ClearanceRowProps {
  label: string;
  specKey: string;
  specData: { min: number; max: number; unit: string };
  actualValue: string | Record<number, string> | undefined;
  onChange: (key: string, val: string | Record<number, string>) => void;
  enteredBy: string | undefined;
  onSetUser: (key: string) => void;
  currentUser: Collaborator;
  customSpec?: CustomSpec;
  onCustomSpecChange: (key: string) => void;
  isEnterprise: boolean;
  perCyl?: boolean;
  cylCount?: number;
}

function ClearanceRow({
  label, specKey, specData, actualValue, onChange, enteredBy,
  onSetUser, currentUser, customSpec, onCustomSpecChange, isEnterprise, perCyl, cylCount
}: ClearanceRowProps) {
  const effectiveSpec = customSpec || specData;
  const collaborators = [GUEST_USER];
  const entered = collaborators.find(c => c.id === enteredBy);

  if (perCyl) {
    const vals = (actualValue as Record<number, string>) || {};
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, flex: 1 }}>{label}</span>
          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "monospace" }}>
            Spec: {effectiveSpec.min.toFixed(4)}–{effectiveSpec.max.toFixed(4)} {effectiveSpec.unit}
          </span>
          {isEnterprise && (
            <button onClick={() => onCustomSpecChange(specKey)} style={{
              fontSize: 10, padding: "1px 6px", border: "1px dashed #D1D5DB",
              borderRadius: 4, background: customSpec ? "#FEF3C7" : "transparent",
              color: customSpec ? "#92400E" : "#9CA3AF", cursor: "pointer"
            }}>{customSpec ? "custom" : "override"}</button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cylCount || 8, 4)}, 1fr)`, gap: 4 }}>
          {Array.from({ length: cylCount || 8 }, (_, i) => {
            const v = vals[i] || "";
            const st = getStatus(v, specData, customSpec);
            return (
              <div key={i} style={{ position: "relative" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2, textAlign: "center" }}>Cyl {i+1}</div>
                <input
                  value={v}
                  onChange={e => onChange(specKey, { ...vals, [i]: e.target.value })}
                  onClick={() => onSetUser(specKey)}
                  placeholder="0.0000"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "5px 6px", border: `1.5px solid ${
                      st === "ok" ? "#86EFAC" : st === "warn" ? "#FCD34D" :
                      (st === "low" || st === "high") ? "#FCA5A5" : "#E5E7EB"
                    }`,
                    borderRadius: 5, fontSize: 12, fontFamily: "monospace", textAlign: "center",
                    background: st === "ok" ? "#F0FDF4" : st === "warn" ? "#FEFCE8" :
                                (st === "low" || st === "high") ? "#FFF1F2" : "#FAFAFA",
                    outline: "none"
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const status = getStatus(actualValue as string, specData, customSpec);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 160px 90px 90px 26px",
      gap: 8, alignItems: "center", padding: "8px 0",
      borderBottom: "0.5px solid #F3F4F6"
    }}>
      <div style={{ fontSize: 13, color: "#374151" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace", textAlign: "right" }}>
        {effectiveSpec.min.toFixed(4)}–{effectiveSpec.max.toFixed(4)} {effectiveSpec.unit}
        {customSpec && <span style={{ color: "#D97706", fontSize: 10, marginLeft: 4 }}>★</span>}
        {isEnterprise && !customSpec && (
          <button onClick={() => onCustomSpecChange(specKey)} style={{
            marginLeft: 4, fontSize: 9, padding: "0 4px", border: "1px dashed #D1D5DB",
            borderRadius: 3, background: "transparent", color: "#9CA3AF", cursor: "pointer"
          }}>edit</button>
        )}
      </div>
      <input
        value={(actualValue as string) || ""}
        onChange={e => onChange(specKey, e.target.value)}
        onClick={() => onSetUser(specKey)}
        placeholder="0.0000"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "6px 8px", border: `1.5px solid ${
            status === "ok" ? "#86EFAC" : status === "warn" ? "#FCD34D" :
            (status === "low" || status === "high") ? "#FCA5A5" : "#E5E7EB"
          }`,
          borderRadius: 6, fontSize: 13, fontFamily: "monospace", textAlign: "center",
          background: status === "ok" ? "#F0FDF4" : status === "warn" ? "#FEFCE8" :
                      (status === "low" || status === "high") ? "#FFF1F2" : "#FAFAFA",
          outline: "none"
        }}
      />
      <StatusBadge status={status} />
      <div style={{ width: 26 }}>
        {entered ? <CollabAvatar user={entered} /> : null}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function BuildSheetApp() {
  const queryClient = useQueryClient();

  const [mode, setMode]               = useState<BuildMode>("pro");
  const [plan, setPlan]               = useState<PlanTier>("shop");
  const [engineKey, setEngineKey]     = useState("ls1");
  const [activeTab, setActiveTab]     = useState("clearances");
  const [currentUser]                 = useState<Collaborator>(GUEST_USER);
  const [actuals, setActuals]         = useState<ActualValues>({});
  const [enteredBy, setEnteredBy]     = useState<Record<string, string>>({});
  const [customSpecs, setCustomSpecs] = useState<Record<string, CustomSpec>>({});
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [tempSpec, setTempSpec]       = useState({ min: "", max: "" });
  const [partsList, setPartsList]     = useState<Record<string, string>>({
    pistons: "", rings: "", bearings: "", gaskets: "", camshaft: "", timingSet: "", oilPump: ""
  });
  const [camData, setCamData]         = useState<Record<string, string>>({
    brand: "", partNum: "", durInt: "", durExh: "", liftInt: "", liftExh: "", lsa: "", icl: ""
  });
  const [notes, setNotes]             = useState("");
  const [buildName, setBuildName]     = useState("New Engine Build");
  const [buildId, setBuildId]         = useState<number | null>(null);
  const [loadBuildIdInput, setLoadBuildIdInput] = useState("");

  const isEnterprise  = plan === "enterprise";
  const isShopOrUp    = plan === "shop" || plan === "enterprise";
  const isBuilderOrUp = plan === "builder" || isShopOrUp;

  // ── Fetch engine specs from API ─────────────────────────────────────────────
  const { data: engine, isLoading: engineLoading } = useQuery<EngineSpecs>({
    queryKey: ["/api/engines", engineKey],
    queryFn: async () => {
      const res = await fetch(`/api/engines/${engineKey}`);
      if (!res.ok) throw new Error("Failed to load engine specs");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // ── Save build mutation ─────────────────────────────────────────────────────
  const saveBuildMutation = useMutation({
    mutationFn: async () => {
      const stateJson = JSON.stringify({ mode, plan, actuals, enteredBy, partsList, camData, notes, customSpecs });
      if (buildId) {
        // Update existing build
        const res = await fetch(`/api/builds/${buildId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: buildName, planTier: plan, stateJson }),
        });
        if (!res.ok) throw new Error("Failed to update build");
        return res.json();
      } else {
        // Create new build
        const res = await fetch("/api/builds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: buildName, engineSlug: engineKey, planTier: plan, stateJson, userId: currentUser.id }),
        });
        if (!res.ok) throw new Error("Failed to save build");
        return res.json();
      }
    },
    onSuccess: (data) => {
      setBuildId(data.id);
      alert(`Build saved! Your build ID is: ${data.id}\nUse this ID to reload your build.`);
    },
  });

  // ── Load build mutation ─────────────────────────────────────────────────────
  const loadBuildMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/builds/${id}`);
      if (!res.ok) throw new Error("Build not found");
      return res.json();
    },
    onSuccess: (data) => {
      setBuildId(data.id);
      setBuildName(data.name);
      setEngineKey(data.engineSlug);
      try {
        const state = JSON.parse(data.stateJson);
        if (state.mode) setMode(state.mode);
        if (state.plan) setPlan(state.plan);
        if (state.partsList) setPartsList(state.partsList);
        if (state.camData) setCamData(state.camData);
        if (state.notes) setNotes(state.notes);
        if (state.customSpecs) setCustomSpecs(state.customSpecs);
        // Merge field_entries from DB on top of stateJson actuals
        // Field entries represent the most recently persisted values per key
        const baseActuals: Record<string, string | Record<number, string>> = state.actuals || {};
        const baseEnteredBy: Record<string, string> = state.enteredBy || {};
        if (data.fields && Array.isArray(data.fields)) {
          for (const f of data.fields) {
            try {
              baseActuals[f.fieldKey] = JSON.parse(f.value);
            } catch (_) {
              baseActuals[f.fieldKey] = f.value;
            }
            if (f.userId) baseEnteredBy[f.fieldKey] = f.userId;
          }
        }
        setActuals(baseActuals);
        setEnteredBy(baseEnteredBy);
      } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ["/api/engines", data.engineSlug] });
    },
  });

  // ── Field write mutation ────────────────────────────────────────────────────
  const fieldMutation = useMutation({
    mutationFn: async ({ fieldKey, value }: { fieldKey: string; value: string }) => {
      if (!buildId) return;
      const res = await fetch(`/api/builds/${buildId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, value, userId: currentUser.id }),
      });
      if (!res.ok) throw new Error("Failed to save field");
      return res.json();
    },
  });

  const handleActual = useCallback((key: string, val: string | Record<number, string>) => {
    setActuals(p => ({ ...p, [key]: val }));
    setEnteredBy(p => ({ ...p, [key]: currentUser.id }));
    if (isShopOrUp && buildId) {
      fieldMutation.mutate({ fieldKey: key, value: typeof val === "string" ? val : JSON.stringify(val) });
    }
  }, [currentUser, isShopOrUp, buildId]);

  const handleSetUser = useCallback((key: string) => {
    setEnteredBy(p => ({ ...p, [key]: currentUser.id }));
  }, [currentUser]);

  const handleCustomSpec = (key: string) => {
    if (!isEnterprise || !engine) return;
    const existing = customSpecs[key] || engine.specs[key];
    setTempSpec({ min: existing.min.toString(), max: existing.max.toString() });
    setEditingSpec(key);
  };

  const saveCustomSpec = () => {
    if (!editingSpec || !engine) return;
    setCustomSpecs(p => ({
      ...p,
      [editingSpec]: {
        ...engine.specs[editingSpec],
        min: parseFloat(tempSpec.min),
        max: parseFloat(tempSpec.max)
      }
    }));
    setEditingSpec(null);
  };

  const specKeys = engine ? Object.keys(engine.specs) : [];
  const filledCount = specKeys.filter(k => {
    const v = actuals[k];
    if (!v) return false;
    if (typeof v === "object") return Object.values(v).some(x => x);
    return v !== "";
  }).length;
  const progress = specKeys.length > 0 ? Math.round((filledCount / specKeys.length) * 100) : 0;

  const TABS_PRO = [
    { id: "clearances", label: "Clearances" },
    { id: "perCyl",     label: "Per Cylinder" },
    { id: "cam",        label: "Camshaft" },
    { id: "parts",      label: "Parts List" },
    { id: "torque",     label: "Torque Specs" },
    { id: "notes",      label: "Notes" },
  ];
  const TABS_DIY = [
    { id: "clearances", label: "Key Clearances" },
    { id: "parts",      label: "Parts List" },
    { id: "notes",      label: "Notes" },
  ];
  const tabs = mode === "diy" ? TABS_DIY : TABS_PRO;

  const colorsForPlan: Record<PlanTier, { bg: string; text: string; label: string }> = {
    free:       { bg: "#F3F4F6", text: "#6B7280", label: "Free" },
    builder:    { bg: "#DBEAFE", text: "#1D4ED8", label: "Builder" },
    shop:       { bg: "#FEF3C7", text: "#92400E", label: "Pro Shop" },
    enterprise: { bg: "#EDE9FE", text: "#5B21B6", label: "Enterprise" },
  };
  const planColor = colorsForPlan[plan];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", maxWidth: 900, margin: "0 auto", padding: "1rem 0" }}>

      {/* ── Top Controls (Demo Only) ── */}
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#9CA3AF", marginRight: 4 }}>Demo controls →</span>
        {(["diy", "pro"] as BuildMode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setActiveTab("clearances"); }} style={{
            padding: "5px 14px", borderRadius: 6, border: "0.5px solid",
            borderColor: mode === m ? "#E85D04" : "#D1D5DB",
            background: mode === m ? "#FFF7ED" : "transparent",
            color: mode === m ? "#C2410C" : "#6B7280",
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>{m === "diy" ? "DIY Sheet" : "Pro Sheet"}</button>
        ))}
        <div style={{ width: 1, height: 20, background: "#E5E7EB", margin: "0 4px" }} />
        {(["free","builder","shop","enterprise"] as PlanTier[]).map(p => (
          <button key={p} onClick={() => setPlan(p)} style={{
            padding: "5px 12px", borderRadius: 6, border: "0.5px solid",
            borderColor: plan === p ? colorsForPlan[p].text : "#D1D5DB",
            background: plan === p ? colorsForPlan[p].bg : "transparent",
            color: plan === p ? colorsForPlan[p].text : "#9CA3AF",
            fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize"
          }}>{colorsForPlan[p].label}</button>
        ))}
        <div style={{ width: 1, height: 20, background: "#E5E7EB", margin: "0 4px" }} />
        {/* Load build input */}
        <input
          value={loadBuildIdInput}
          onChange={e => setLoadBuildIdInput(e.target.value)}
          placeholder="Build ID"
          style={{ width: 80, padding: "5px 8px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12 }}
        />
        <button onClick={() => {
          const id = parseInt(loadBuildIdInput, 10);
          if (!isNaN(id)) loadBuildMutation.mutate(id);
        }} style={{
          padding: "5px 12px", borderRadius: 6, border: "1px solid #D1D5DB",
          background: "transparent", color: "#6B7280", fontSize: 12, cursor: "pointer"
        }}>Load Build</button>
      </div>

      {/* ── Card ── */}
      <div style={{ background: "#fff", border: "0.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ background: "#1C1C1E", padding: "16px 20px", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <input
                  value={buildName}
                  onChange={e => setBuildName(e.target.value)}
                  style={{
                    background: "transparent", border: "none", color: "#fff",
                    fontSize: 18, fontWeight: 700, outline: "none",
                    borderBottom: "1px solid #3F3F46", paddingBottom: 2, flex: 1
                  }}
                />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".08em", padding: "3px 8px",
                  borderRadius: 4, background: planColor.bg, color: planColor.text
                }}>{planColor.label}</span>
              </div>
              <div style={{ fontSize: 12, color: "#71717A" }}>
                {mode === "diy" ? "DIY Rebuild Sheet" : "Professional Build Sheet"} · Engine-build.com
              </div>
            </div>

            {/* Engine Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "#71717A", letterSpacing: ".06em", fontWeight: 600 }}>ENGINE PLATFORM</label>
              <select
                value={engineKey}
                onChange={e => {
                  setEngineKey(e.target.value);
                  setActuals({});
                  setEnteredBy({});
                  setCustomSpecs({});
                }}
                style={{
                  background: "#27272A", border: "1px solid #3F3F46", color: "#E4E4E7",
                  borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer", outline: "none"
                }}
              >
                {ENGINE_OPTIONS.map(({ slug, label }) => (
                  <option key={slug} value={slug}>{label}</option>
                ))}
              </select>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <div style={{ fontSize: 10, color: "#71717A", letterSpacing: ".06em", fontWeight: 600 }}>COMPLETION</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: progress === 100 ? "#4ADE80" : "#F97316", fontFamily: "monospace" }}>{progress}%</div>
              <div style={{ width: 100, height: 4, background: "#3F3F46", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#4ADE80" : "#F97316", transition: "width .3s" }} />
              </div>
            </div>
          </div>

          {/* Engine quick-info bar */}
          {engine && (
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {([
                ["Bore", engine.bore], ["Stroke", engine.stroke],
                ["Displacement", engine.displacement], ["Firing Order", engine.firingOrder]
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 9, color: "#52525B", letterSpacing: ".06em", fontWeight: 600, marginBottom: 1 }}>{k}</div>
                  <div style={{ fontSize: 12, color: "#A1A1AA", fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
              {engineLoading && <div style={{ fontSize: 12, color: "#52525B" }}>Loading specs…</div>}
            </div>
          )}
        </div>

        {/* ── Collaborative User Bar ── */}
        {isShopOrUp && (
          <div className="no-print" style={{
            background: "#FAFAFA", borderBottom: "0.5px solid #F3F4F6",
            padding: "8px 20px", display: "flex", alignItems: "center", gap: 10
          }}>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>ACTIVE USER:</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 8px", borderRadius: 20, border: "1.5px solid",
                borderColor: currentUser.color,
                background: currentUser.color + "15",
                cursor: "default"
              }}>
                <CollabAvatar user={currentUser} size={18} />
                <span style={{ fontSize: 11, color: currentUser.color, fontWeight: 600 }}>{currentUser.name}</span>
              </button>
              {isEnterprise && (
                <button style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 20,
                  border: "1px dashed #D1D5DB", background: "transparent",
                  color: "#9CA3AF", cursor: "pointer"
                }}>+ Add User</button>
              )}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>
              {buildId ? `Build #${buildId} · Fields auto-saved` : "Save build to enable per-field persistence"}
            </div>
          </div>
        )}

        {/* ── Tab Bar ── */}
        <div className="no-print" style={{ display: "flex", borderBottom: "0.5px solid #F3F4F6", overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "11px 18px", border: "none", background: "transparent",
              borderBottom: `2px solid ${activeTab === t.id ? "#E85D04" : "transparent"}`,
              color: activeTab === t.id ? "#E85D04" : "#6B7280",
              fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
            }}>{t.label}</button>
          ))}
          {isBuilderOrUp && (
            <div style={{ marginLeft: "auto", padding: "8px 20px", display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => window.print()} style={{
                padding: "5px 14px", borderRadius: 6, border: "1px solid #E5E7EB",
                background: "#fff", color: "#374151", fontSize: 12, cursor: "pointer", fontWeight: 500
              }}>Export PDF</button>
              {isShopOrUp && (
                <button
                  onClick={() => saveBuildMutation.mutate()}
                  disabled={saveBuildMutation.isPending}
                  style={{
                    padding: "5px 14px", borderRadius: 6, border: "none",
                    background: "#E85D04", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600,
                    opacity: saveBuildMutation.isPending ? 0.7 : 1
                  }}>{saveBuildMutation.isPending ? "Saving…" : "Save Build"}</button>
              )}
            </div>
          )}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ padding: "20px" }}>

          {engineLoading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 14 }}>
              Loading engine specs…
            </div>
          )}

          {/* CLEARANCES TAB */}
          {!engineLoading && engine && activeTab === "clearances" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 90px 90px 26px",
                gap: 8, padding: "4px 0 8px", borderBottom: "1px solid #E5E7EB", marginBottom: 4 }}>
                {["Measurement", "Factory Spec", "Actual", "Status", ""].map(h => (
                  <div key={h} style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: ".05em" }}>{h}</div>
                ))}
              </div>

              {Object.keys(engine.specs)
                .filter(k => !["ringGapTop","ringGapSecond","ringGapOil"].includes(k) || mode === "pro")
                .map(key => (
                <ClearanceRow
                  key={key}
                  specKey={key}
                  label={engine.specs[key].label}
                  specData={engine.specs[key]}
                  actualValue={actuals[key]}
                  onChange={handleActual}
                  enteredBy={enteredBy[key]}
                  onSetUser={handleSetUser}
                  currentUser={currentUser}
                  customSpec={customSpecs[key]}
                  onCustomSpecChange={handleCustomSpec}
                  isEnterprise={isEnterprise}
                />
              ))}

              <div style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
                Color code: <span style={{ color: "#166534", fontWeight: 600 }}>green = within spec</span> ·{" "}
                <span style={{ color: "#854D0E", fontWeight: 600 }}>yellow = near limit</span> ·{" "}
                <span style={{ color: "#991B1B", fontWeight: 600 }}>red = out of spec</span>
              </div>
            </div>
          )}

          {/* PER CYLINDER TAB (Pro only) */}
          {!engineLoading && engine && activeTab === "perCyl" && mode === "pro" && (
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
                Record individual cylinder measurements. Each field auto-color-codes against the factory spec range.
              </p>
              {["ringGapTop","ringGapSecond","ringGapOil","pistonToWall"].map(key => (
                <ClearanceRow
                  key={key}
                  specKey={key}
                  label={engine.specs[key].label}
                  specData={engine.specs[key]}
                  actualValue={actuals[key] || {}}
                  onChange={handleActual}
                  enteredBy={enteredBy[key]}
                  onSetUser={handleSetUser}
                  currentUser={currentUser}
                  customSpec={customSpecs[key]}
                  onCustomSpecChange={handleCustomSpec}
                  isEnterprise={isEnterprise}
                  perCyl={true}
                  cylCount={engine.cylinders}
                />
              ))}
              <div style={{
                background: "#F8FAFC", border: "0.5px solid #E5E7EB", borderRadius: 8,
                padding: "12px 16px", marginTop: 16
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Deck Height per Cylinder
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {Array.from({ length: engine.cylinders }, (_, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 3, textAlign: "center" }}>Cyl {i+1}</div>
                      <input
                        placeholder='0.0000"'
                        onChange={e => handleActual(`deckHeight_${i}`, e.target.value)}
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "6px", border: "1.5px solid #E5E7EB",
                          borderRadius: 6, fontSize: 12, fontFamily: "monospace", textAlign: "center",
                          background: "#FAFAFA", outline: "none"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CAMSHAFT TAB */}
          {!engineLoading && engine && activeTab === "cam" && mode === "pro" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {([
                  ["Cam Brand", "brand", "e.g. COMP Cams"],
                  ["Part Number", "partNum", "e.g. 54-444-11"],
                  ["Int Duration @ .050\"", "durInt", "e.g. 224"],
                  ["Exh Duration @ .050\"", "durExh", "e.g. 230"],
                  ["Int Lift (at valve)", "liftInt", "e.g. 0.559\""],
                  ["Exh Lift (at valve)", "liftExh", "e.g. 0.570\""],
                  ["Lobe Separation Angle", "lsa", "e.g. 112°"],
                  ["Installed Centerline", "icl", "e.g. 108°"],
                ] as [string, string, string][]).map(([label, key, placeholder]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      value={camData[key] || ""}
                      onChange={e => setCamData(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "7px 10px",
                        border: "1.5px solid #E5E7EB", borderRadius: 6, fontSize: 13,
                        fontFamily: ["durInt","durExh","liftInt","liftExh","lsa","icl"].includes(key) ? "monospace" : "inherit",
                        background: "#FAFAFA", outline: "none"
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ background: "#F8FAFC", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Degreeing Results</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  {[
                    "Int Open (@ .050\")", "Int Close (@ .050\")", "Exh Open (@ .050\")", "Exh Close (@ .050\")"
                  ].map(label => (
                    <div key={label}>
                      <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, display: "block", marginBottom: 3 }}>{label}</label>
                      <input placeholder="e.g. 14° BTDC" style={{
                        width: "100%", boxSizing: "border-box", padding: "6px 8px",
                        border: "1.5px solid #E5E7EB", borderRadius: 6, fontSize: 12,
                        fontFamily: "monospace", background: "#FAFAFA", outline: "none"
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PARTS LIST TAB */}
          {!engineLoading && activeTab === "parts" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([
                  ["Pistons (Brand / Part #)", "pistons"],
                  ["Ring Set (Brand / Part #)", "rings"],
                  ["Bearings (Brand / Part #)", "bearings"],
                  ["Gasket Set (Brand / Part #)", "gaskets"],
                  ...(mode === "pro" ? [
                    ["Camshaft (Brand / Part #)", "camshaft"],
                    ["Timing Set (Brand / Part #)", "timingSet"],
                    ["Oil Pump (Brand / Part #)", "oilPump"],
                  ] : []),
                ] as [string, string][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      value={partsList[key] || ""}
                      onChange={e => setPartsList(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Brand / Part number"
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "7px 10px",
                        border: "1.5px solid #E5E7EB", borderRadius: 6, fontSize: 13,
                        background: "#FAFAFA", outline: "none"
                      }}
                    />
                  </div>
                ))}
              </div>

              {mode === "pro" && (
                <div style={{ marginTop: 16, background: "#F8FAFC", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>Assembly Lubricants</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {["Camshaft Lube", "Bearing Assembly Lube", "Ring / Bore Lube", "Thread Sealant", "RTV Gasket Maker", "Break-in Oil"].map(label => (
                      <div key={label}>
                        <label style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, display: "block", marginBottom: 3 }}>{label}</label>
                        <input placeholder="Brand / Product name" style={{
                          width: "100%", boxSizing: "border-box", padding: "5px 8px",
                          border: "1.5px solid #E5E7EB", borderRadius: 6, fontSize: 12,
                          background: "#FAFAFA", outline: "none"
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TORQUE SPECS TAB */}
          {!engineLoading && engine && activeTab === "torque" && mode === "pro" && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 12, color: "#6B7280" }}>
                Factory torque specs auto-populated for {engine.name}. Add your actual values in the right column.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px", gap: 8,
                padding: "4px 0 8px", borderBottom: "1px solid #E5E7EB", marginBottom: 4 }}>
                {["Fastener", "Factory Specification", "Your Actual"].map(h => (
                  <div key={h} style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, letterSpacing: ".05em" }}>{h}</div>
                ))}
              </div>
              {Object.entries(engine.torque).map(([key, spec]) => {
                const label: Record<string, string> = {
                  headBolts: "Head Bolts",
                  mainCaps: "Main Cap Bolts",
                  rodBolts: "Rod Bolts",
                  oilPan: "Oil Pan Bolts",
                  intakeManifold: "Intake Manifold"
                };
                return (
                  <div key={key} style={{
                    display: "grid", gridTemplateColumns: "160px 1fr 120px", gap: 8,
                    alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid #F9FAFB"
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label[key] || key}</div>
                    <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace", lineHeight: 1.5 }}>{spec}</div>
                    <input placeholder="ft-lb" style={{
                      width: "100%", boxSizing: "border-box", padding: "5px 8px",
                      border: "1.5px solid #E5E7EB", borderRadius: 6, fontSize: 12,
                      fontFamily: "monospace", background: "#FAFAFA", outline: "none"
                    }} />
                  </div>
                );
              })}

              {isEnterprise && (
                <div style={{
                  marginTop: 16, background: "#FFF7ED", border: "1px solid #FED7AA",
                  borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400E"
                }}>
                  <strong>Enterprise:</strong> You can add custom fasteners and torque values specific to your shop's standard procedures (e.g., ARP main stud kits, custom head bolts).
                  <button style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 4, border: "1px solid #F97316",
                    background: "#fff", color: "#EA580C", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                    + Add Custom Fastener
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <div>
              <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 6 }}>BUILD NOTES</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Record anything that doesn't fit in a field: unusual wear patterns, machining decisions, break-in observations, customer notes..."
                rows={6}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "10px 12px",
                  border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                  background: "#FAFAFA", outline: "none", resize: "vertical", fontFamily: "inherit"
                }}
              />
              {mode === "pro" && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 6 }}>BREAK-IN PROCEDURE USED</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      "Flat-tappet: 2000–2500 RPM for 20 min straight (ZDDP oil required)",
                      "Roller cam: Varied RPM 1000–3000, 30 min with heat cycles",
                      "Custom procedure (add to notes above)"
                    ].map(opt => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                        <input type="radio" name="breakin" style={{ accentColor: "#E85D04" }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {isShopOrUp && (
                <div style={{ marginTop: 16, background: "#F8FAFC", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Warranty Terms
                    {isEnterprise && <span style={{ marginLeft: 8, fontSize: 10, color: "#7C3AED", fontWeight: 600 }}>★ Customizable (Enterprise)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7 }}>
                    {isEnterprise
                      ? <textarea placeholder="Enter your shop's warranty terms here. These will appear on every customer-facing PDF export." rows={3}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px", border: "1.5px dashed #C4B5FD",
                            borderRadius: 6, fontSize: 12, background: "#FAFAFA", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                      : "Standard: 12 months / 12,000 miles on parts and labor. Excludes misuse, overheating, improper installation, or racing use. All warranties void if break-in procedure not followed."}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: "0.5px solid #F3F4F6", padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 10, background: "#FAFAFA"
        }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            All specs should be verified against your factory service manual before assembly.
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>{filledCount}/{specKeys.length} measurements entered</span>
          </div>
        </div>
      </div>

      {/* ── Enterprise Custom Spec Modal ── */}
      {editingSpec && isEnterprise && engine && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 24, width: 340,
            border: "0.5px solid #E5E7EB"
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1C1E", marginBottom: 4 }}>Override Shop Spec</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
              {engine.specs[editingSpec]?.label}<br />
              Factory: {engine.specs[editingSpec]?.min.toFixed(4)}–{engine.specs[editingSpec]?.max.toFixed(4)} {engine.specs[editingSpec]?.unit}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {([["Your Min", "min"], ["Your Max", "max"]] as [string, string][]).map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    value={tempSpec[key as "min" | "max"]}
                    onChange={e => setTempSpec(p => ({ ...p, [key]: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "7px 10px",
                      border: "1.5px solid #E5E7EB", borderRadius: 6, fontFamily: "monospace", fontSize: 13, outline: "none"
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 16 }}>
              This override saves to your shop profile and applies to all {engine.name} builds.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditingSpec(null)} style={{
                flex: 1, padding: "8px", border: "1px solid #E5E7EB", borderRadius: 6,
                background: "#fff", color: "#6B7280", fontSize: 13, cursor: "pointer"
              }}>Cancel</button>
              <button onClick={saveCustomSpec} style={{
                flex: 1, padding: "8px", border: "none", borderRadius: 6,
                background: "#E85D04", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
              }}>Save Shop Spec ★</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
