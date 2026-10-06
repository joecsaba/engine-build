import { useState } from "react";

export interface ShareRow {
  label: string;
  value: string;
}

interface Props {
  /** One line naming the result and its inputs, e.g. 'Ring gap, 4.030" bore, turbo'. */
  title: string;
  /** The result lines a reader would paste as their answer. */
  rows: ShareRow[];
  /** Calculator slug after /calculators/. */
  calcSlug: string;
  /** Query params that reproduce this result through usePrefill. Empty values are dropped. */
  params: Record<string, string | number | null | undefined>;
  /** Short name used in the attribution line. */
  toolName: string;
}

const SITE = "https://engine-build.com";

function presetUrl(slug: string, params: Props["params"]) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${SITE}/calculators/${slug}${qs ? `?${qs}` : ""}`;
}

/**
 * "Copy for forum" — turns a calculator result into something a reader can
 * paste as their answer in a forum thread, with a link back to the calculator
 * pre-filled with their exact inputs.
 *
 * Forums do not allow iframes, so an embeddable widget earns nothing; what
 * every forum (and Reddit) allows is text and a link. The pasted answer reads
 * as help, because the numbers are right there, and the link goes to the
 * preset URL that usePrefill already understands. Every paste is a link from a
 * thread about exactly this topic — the kind of link the site has almost none
 * of.
 *
 * BBCode for vBulletin / XenForo / phpBB; Markdown for Reddit and Discourse.
 */
export function ShareResult({ title, rows, calcSlug, params, toolName }: Props) {
  const [copied, setCopied] = useState<"forum" | "reddit" | "link" | null>(null);
  const url = presetUrl(calcSlug, params);
  const lines = rows.map((r) => (r.label ? `${r.label} ${r.value}` : r.value)).join(", ");

  const bbcode = `[b]${title}:[/b] ${lines}\n[url=${url}]${toolName} — Engine-build.com[/url]`;
  const markdown = `**${title}:** ${lines}  \n[${toolName} — Engine-build.com](${url})`;

  function copy(kind: "forum" | "reddit" | "link", text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const btn = "px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">Share this result:</span>
      <button type="button" className={btn} onClick={() => copy("forum", bbcode)}>
        {copied === "forum" ? "Copied" : "Copy for forum"}
      </button>
      <button type="button" className={btn} onClick={() => copy("reddit", markdown)}>
        {copied === "reddit" ? "Copied" : "Copy for Reddit"}
      </button>
      <button type="button" className={btn} onClick={() => copy("link", url)}>
        {copied === "link" ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
