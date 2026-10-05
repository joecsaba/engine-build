// Computed prose for an engine spec page.
//
// Engine pages were 40 words of prose and three tables. That is thin for a
// reader, invisible to the ad script (which places into paragraphs), and part
// of why the pages sit on page two for their own names.
//
// The rule for every sentence: it states a fact computed from THIS engine's
// numbers, or it is not emitted. Bore-to-stroke, the RPM at which this stroke
// reaches the piston-speed ceiling, rod ratio, displacement per cylinder, what
// the compression ratio implies given the fuel, induction and head material on
// file, and where the engine sits in its family. An engine with fewer fields
// gets fewer sentences, never padding — the LS1 has no rod length on file, so
// it gets no rod-ratio sentence.
//
// Shared by scripts/prerender.mjs and src/pages/engines/engine.tsx so what
// Google indexes is what the reader sees.

const fmt = (n, dp = 0) => Number(n).toLocaleString("en-US", { maximumFractionDigits: dp, minimumFractionDigits: dp });

// Same rule the page <title> and meta description use: seoTitle strips the
// geometry suffix that displayName carries and does not repeat the
// manufacturer; the trailing compression ratio goes because the prose states
// it separately.
function nameFor(e) {
  const base = (e.seoTitle ?? `${e.manufacturerName ?? ""} ${e.displayName ?? ""}`)
    .replace(/\s+\d+(?:\.\d+)?:1$/, "").trim();
  // A bare variant code ("R", "J") is not a name a reader recognises; say
  // which family it belongs to.
  const code = String(e.displayName ?? "").trim();
  if (code.length <= 3 && e.familyName) return `${e.manufacturerName ?? ""} ${e.familyName} (${code})`.trim();
  return base || "This engine";
}

// Mean piston speed (ft/min) = 2 × stroke(in) × RPM / 12. 4,000 ft/min is the
// figure most builders treat as the practical ceiling for a production bottom
// end, so the RPM at which a given stroke reaches it is the number that
// actually describes the engine — and it is different for every stroke.
const PISTON_CEILING_FPM = 4000;

function geometry(e) {
  const { bore_in: b, stroke_in: s, rod_ratio: rr, num_cylinders: c, displacement_ci: d } = e;
  const name = nameFor(e);
  const out = [];

  if (b != null && s != null) {
    const ratio = b / s;
    const pct = Math.abs(ratio - 1) * 100;
    if (ratio >= 1.05) {
      out.push(`The ${name} is oversquare — the ${b}" bore exceeds the ${s}" stroke by ${fmt(pct, 1)}% — a layout that favors airflow and RPM over leverage at the crank.`);
    } else if (ratio <= 0.95) {
      out.push(`The ${name} is undersquare — the ${s}" stroke exceeds the ${b}" bore by ${fmt(pct, 1)}% — a layout that trades peak RPM for leverage and torque low in the range.`);
    } else if (pct < 0.05) {
      out.push(`The ${name} is exactly square — ${b}" bore and ${s}" stroke are the same — which splits the difference between a high-revving layout and a torque layout.`);
    } else {
      out.push(`The ${name} is close to square: ${b}" bore against ${s}" stroke, within ${fmt(pct, 1)}%, which splits the difference between a high-revving layout and a torque layout.`);
    }
  }

  if (s != null) {
    const rpmAtCeiling = Math.round((PISTON_CEILING_FPM * 12) / (2 * s) / 50) * 50;
    if (rpmAtCeiling <= 5500) {
      out.push(`With a ${s}" stroke, mean piston speed reaches ${fmt(PISTON_CEILING_FPM)} ft/min at only ${fmt(rpmAtCeiling)} RPM — the practical ceiling for a production bottom end — which is why a stroke this long makes its power low and runs out of safe revs early.`);
    } else if (rpmAtCeiling <= 7000) {
      out.push(`The ${s}" stroke puts mean piston speed at ${fmt(PISTON_CEILING_FPM)} ft/min around ${fmt(rpmAtCeiling)} RPM, which is where a production bottom end is generally considered at its limit.`);
    } else {
      out.push(`The ${s}" stroke does not reach ${fmt(PISTON_CEILING_FPM)} ft/min of mean piston speed until about ${fmt(rpmAtCeiling)} RPM, so piston speed is not what limits this engine's revs — valvetrain and breathing are.`);
    }
  }

  if (rr != null) {
    const note = rr >= 1.75
      ? "long by production standards — less side-load on the cylinder wall and gentler piston acceleration around TDC, the geometry that tolerates high RPM"
      : rr <= 1.55
        ? "short — higher piston acceleration and more side-load, typical of stroker combinations and a reason to watch piston speed closely"
        : "in the range most production engines fall in";
    out.push(`A rod ratio of ${rr} is ${note}.`);
  }

  if (d != null && c != null) {
    const per = d / c;
    out.push(`Each of the ${c} cylinders displaces ${fmt(per, 1)} ci (${fmt(per * 16.387)} cc).`);
  }
  return out.join(" ");
}

function compression(e) {
  const cr = e.compression_ratio;
  if (cr == null) return "";
  const fuel = String(e.fuel_type || "").toLowerCase();
  const ind = String(e.induction || "").toLowerCase();
  const head = String(e.head_material || "").toLowerCase();
  const heads = head.includes("alumin") ? "aluminum heads" : head.includes("iron") ? "iron heads" : null;
  const on = heads ? ` on ${heads}` : "";

  if (fuel.includes("diesel")) {
    return `At ${cr}:1 this is a compression-ignition engine: the ratio is the heat source that lights the fuel, not a knock limit to be managed.`;
  }
  // No fuel type on file and a ratio only a diesel or a direct-injection
  // gasoline engine would carry: say nothing rather than guess.
  if (!fuel && cr >= 14) return "";

  if (/turbo|supercharg|boost/.test(ind)) {
    const what = /supercharg/.test(ind) ? "supercharger" : "turbo";
    return `Static compression of ${cr}:1${on} is ${cr < 9.5 ? "low" : "moderate"} for the displacement, which is deliberate on a boosted engine — the ${what} supplies the rest of the effective ratio, and static compression plus boost together set the fuel requirement.`;
  }
  if (cr >= 11.5) {
    return `${cr}:1${on} is high for a production gasoline engine; running a ratio like that on pump fuel depends on chamber design and fuel delivery rather than the number alone.`;
  }
  if (cr >= 11) {
    return `${cr}:1${on} is high enough that pump premium or better is normally required${heads === "iron heads" ? ", and iron holds heat, so it is the less forgiving side of that line" : ""}.`;
  }
  if (cr >= 9.5) {
    return `${cr}:1${on} is in the range that usually runs on pump premium${heads === "aluminum heads" ? "; aluminum sheds heat faster than iron, which makes the same number a little more forgiving" : heads === "iron heads" ? "; iron holds heat, so treat it as the less forgiving side of that range" : ""}.`;
  }
  return `${cr}:1${on} is low by modern standards and generally happy on regular pump fuel.`;
}

function context(e) {
  const out = [];
  const fs = e.familyStats;
  if (fs && fs.count > 1 && e.displacement_ci != null) {
    if (fs.minCi === fs.maxCi) {
      out.push(`It is one of ${fs.count} engines in the ${e.familyName} family, all of them ${e.displacement_ci} ci — the differences between them are in compression, heads and rating, not displacement.`);
    } else {
      const where = fs.rank === "largest"
        ? `the largest at ${e.displacement_ci} ci`
        : fs.rank === "smallest"
          ? `the smallest at ${e.displacement_ci} ci`
          : `sitting between the ${fs.minCi} ci and ${fs.maxCi} ci members`;
      out.push(`It is one of ${fs.count} engines in the ${e.familyName} family, ${where}.`);
    }
  }
  if (e.variantCount > 1) {
    const hp = e.hpMin != null ? (e.hpMin === e.hpMax ? `rated at ${e.hpMin} hp` : `rated from ${e.hpMin} to ${e.hpMax} hp`) : null;
    const yrs = e.yearMin != null ? (e.yearMin === e.yearMax ? `in ${e.yearMin}` : `across ${e.yearMin}–${e.yearMax}`) : null;
    out.push(`${e.variantCount} factory variants share these dimensions${hp ? `, ${hp}` : ""}${yrs ? ` ${yrs}` : ""}.`);
  }
  const vehicles = (e.vehicles || []).map((v) => (v.name || "").trim()).filter((n) => n && n.toLowerCase() !== "crate engine");
  if (vehicles.length) {
    const named = vehicles.slice(0, 3).join(", ");
    const rest = vehicles.length - 3;
    out.push(`Factory fitments include the ${named}${rest > 0 ? ` and ${rest} other${rest === 1 ? "" : "s"}` : ""}.`);
  }
  return out.join(" ");
}

/** Paragraphs of computed prose for one engine record. Empty paragraphs are dropped. */
export function engineNarrative(e) {
  return [geometry(e), compression(e), context(e)].filter(Boolean);
}

export default engineNarrative;
