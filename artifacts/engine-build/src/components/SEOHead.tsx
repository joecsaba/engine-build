import { useEffect } from "react";

const SITE = "https://engine-build.com";
const SITE_NAME = "Engine-build.com";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  noindex?: boolean;
}

function setMeta(property: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * The prerendered head is authoritative for the page it was rendered for.
 *
 * Every page ships from the prerenderer with a <title>, description and
 * canonical taken from the manifest — the values that were reviewed and
 * length-checked. This component used to overwrite them on mount with the
 * literals in each page component, and because Googlebot and Bingbot render
 * JavaScript, what search engines indexed was the component's copy, not the
 * manifest's. An audit on 2026-10-05 found 45 of 50 calculators showing Google
 * a different title or description than the one in the manifest, including
 * doubled site suffixes.
 *
 * The prerenderer now stamps each page with the path it rendered. If this
 * component mounts on that same path, it leaves the head alone. On client-side
 * navigation the path no longer matches and the component's values apply, as
 * they must — there is no prerendered head for the new page.
 */
function prerenderedFor(pathname: string): boolean {
  const el = document.querySelector('meta[name="prerender-path"]') as HTMLMetaElement | null;
  if (!el) return false;
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return norm(el.content) === norm(pathname);
}

export function SEOHead({ title, description, canonical, keywords, noindex }: SEOHeadProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = canonical ? `${SITE}${canonical}` : SITE;

  useEffect(() => {
    if (prerenderedFor(window.location.pathname)) return;
    document.title = fullTitle;
    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setLink("canonical", url);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:url", url, true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
  }, [fullTitle, description, url, keywords, noindex]);

  return null;
}
