import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and request-shape builders for the Exa actions.
 *
 * Every field/enum here is copied from Exa's own OpenAPI 3.1 document —
 * fetched 2026-09-01 from `https://exa.ai/docs/exa-spec.json` (the machine-
 * readable spec backing the Mintlify docs; it is not linked from the docs nav
 * and is not at the guessable `/openapi.json` / `/reference/openapi.json`
 * paths, which both 404) — not inferred from a blog post or a sibling app.
 */

/**
 * `type` on `/search` and `/findSimilar`. **`neural`/`keyword` are gone** —
 * older blog posts and SDK examples reference those two mode names, but the
 * current spec's enum is this list, with `auto` as the default. Passing a
 * stale mode name is accepted by the JSON schema (it's just a string) but
 * silently ignored by the service.
 */
export const searchTypeOptions = [
  { value: "auto", label: "Auto (balanced quality/speed, recommended default)" },
  { value: "fast", label: "Fast (high quality, reduced latency)" },
  { value: "instant", label: "Instant (minimum latency, e.g. chat/autocomplete)" },
  { value: "deep-lite", label: "Deep (lite) — lightweight synthesized research, ~4s latency" },
  { value: "deep", label: "Deep — comprehensive multi-step research with synthesis" },
  { value: "deep-reasoning", label: "Deep reasoning — deep plus stronger reasoning" },
];

/**
 * `category` on `/search` and `/findSimilar`. The spec accepts any string as a
 * hint, but these six are the vendor's own documented, quality-tuned values —
 * `company` and `people` additionally drop support for `startPublishedDate` /
 * `endPublishedDate` / `excludeDomains` (a 400 if sent), which is called out
 * on the param itself rather than silently swallowed.
 */
export const categoryOptions = [
  { value: "", label: "None" },
  { value: "company", label: "Company" },
  { value: "publication", label: "Publication (research papers, preprints, journals)" },
  { value: "news", label: "News" },
  { value: "personal site", label: "Personal site" },
  { value: "financial report", label: "Financial report" },
  { value: "people", label: "People" },
];

/** Shared by `search` and `find-similar`: how many results, from where, when. */
export function resultFilterParams(): Param[] {
  return [
    {
      key: "numResults",
      label: "Number of results",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Max 100 in the public tier. Contact hello@exa.ai for higher limits.",
    },
    {
      key: "includeDomains",
      label: "Include domains",
      type: "string",
      repeat: true,
      hint: "Hostname (`example.com`), hostname + path (`example.com/docs`), or wildcard " +
        "subdomain (`*.example.com`). Use this instead of a `site:` operator in the query.",
    },
    {
      key: "excludeDomains",
      label: "Exclude domains",
      type: "string",
      repeat: true,
      hint: "Same forms as Include domains. Not supported with category `company` or `people`.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: categoryOptions,
      hint: "Other strings are accepted too and used as a hint; these six are Exa's own tuned " +
        "values.",
    },
    {
      key: "startPublishedDate",
      label: "Published after",
      type: "datetime",
      hint: "ISO 8601. Not supported with category `company` or `people`.",
    },
    {
      key: "endPublishedDate",
      label: "Published before",
      type: "datetime",
      hint: "ISO 8601. Not supported with category `company` or `people`.",
    },
    {
      key: "userLocation",
      label: "User location",
      type: "string",
      placeholder: "US",
      hint: "Two-letter ISO country code.",
    },
  ];
}

export interface ResultFilterInput {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  category?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  userLocation?: string;
}

export function resultFilterBody(input: ResultFilterInput): Record<string, unknown> {
  return {
    numResults: input.numResults,
    includeDomains: input.includeDomains?.length ? input.includeDomains : undefined,
    excludeDomains: input.excludeDomains?.length ? input.excludeDomains : undefined,
    category: input.category || undefined,
    startPublishedDate: input.startPublishedDate,
    endPublishedDate: input.endPublishedDate,
    userLocation: input.userLocation,
  };
}

/**
 * The `contents` option block shared by `/search`, `/findSimilar` and
 * `/contents` — what to extract for each result once it's found.
 *
 * `livecrawl` (the parameter most Exa tutorials mention for freshness
 * control) is **deprecated** in the current spec — "use `maxAgeHours`
 * instead... does not guarantee freshly fetched parser output". Only
 * `maxAgeHours` is exposed here; `0` is the documented way to force a fresh
 * fetch.
 */
export function contentsParams(): Param[] {
  return [
    {
      key: "text",
      label: "Include full text",
      type: "boolean",
      default: false,
      hint: "Full extracted page text for each result.",
    },
    {
      key: "highlights",
      label: "Include highlights",
      type: "boolean",
      default: false,
      hint: "Text snippets an LLM identifies as most relevant on each page.",
    },
    {
      key: "summary",
      label: "Include summary",
      type: "boolean",
      default: false,
      hint: "An LLM-generated summary of each page.",
    },
    {
      key: "maxAgeHours",
      label: "Max cache age (hours)",
      type: "number",
      validation: { integer: true, min: -1, max: 720 },
      hint: "0 always re-crawls (required for text-rendering options to apply to newly crawled " +
        "pages); -1 always uses cache; omit for fallback crawling. Replaces the deprecated " +
        "`livecrawl`.",
    },
    {
      key: "subpages",
      label: "Subpages to crawl",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
      hint: "Additional linked pages to crawl per result, e.g. to follow pagination.",
    },
  ];
}

export interface ContentsInput {
  text?: boolean;
  highlights?: boolean;
  summary?: boolean;
  maxAgeHours?: number;
  subpages?: number;
}

/** Returns `undefined` when nothing was asked for, so callers can omit `contents` entirely. */
export function buildContentsOptions(input: ContentsInput): Record<string, unknown> | undefined {
  const hasAny = input.text || input.highlights || input.summary ||
    input.maxAgeHours !== undefined || input.subpages !== undefined;
  if (!hasAny) return undefined;
  return {
    text: input.text || undefined,
    highlights: input.highlights || undefined,
    summary: input.summary || undefined,
    maxAgeHours: input.maxAgeHours,
    subpages: input.subpages,
  };
}
