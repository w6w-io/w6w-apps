import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  query: string;
  title?: string;
  count?: number;
  entity?: string;
  externalId?: string;
  metadata?: Record<string, string>;
  enrichments?: unknown[];
}

interface Webset {
  id?: string;
  object?: string;
  status?: string;
  title?: string;
  externalId?: string;
  dashboardUrl?: string;
  [key: string]: unknown;
}

/**
 * POST /v0/websets — start a Webset: an asynchronous, ongoing entity search
 * (companies, people, publications, ...) that keeps finding and enriching
 * matching items rather than returning one page of results. Mirrors Exa's
 * newer "Websets" API — the successor surface to the older "Research" task
 * endpoints referenced in some older docs/tutorials, which no longer exist
 * (`/reference/research/create-a-task` 404s; there is no `research` tag in
 * the current OpenAPI spec at all).
 *
 * This action models the common case: a natural-language `query` plus an
 * optional entity hint and result count. `criteria`/`scope`/`exclude`/`import`
 * (fine-grained search control) and `enrichments`' full per-field shape are
 * real but deep, nested, optional request fields the vendor's own dashboard
 * mostly auto-derives from the query — `enrichments` is exposed as a raw JSON
 * passthrough for callers who need it; the rest are left out rather than
 * flattened into a wall of rarely-used params.
 */
const createWebset: ActionDefinition<Input, Webset> = {
  key: "create-webset",
  type: "perform",
  resource: "webset",
  title: "Create Webset",
  description: "Start a Webset: an ongoing search for entities matching a natural-language query.",
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Query",
      type: "text",
      required: true,
      hint:
        "What to look for, and any constraints. URLs in the query are crawled as extra context.",
      placeholder: "Marketing agencies based in the US that focus on consumer products.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Leave empty to have Exa generate one.",
    },
    {
      key: "count",
      label: "Target result count",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1 },
      hint: "How many items the Webset will attempt to find. The actual count may be lower.",
    },
    {
      key: "entity",
      label: "Entity type",
      type: "select",
      options: [
        { value: "", label: "Auto-detect from query" },
        { value: "company", label: "Company" },
        { value: "person", label: "Person" },
        { value: "article", label: "Article" },
        { value: "research paper", label: "Research paper" },
      ],
      hint: "Only needed for fine control — Exa detects this from the query by default.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own identifier for referencing this Webset later.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Key-value pairs (string values) to associate with this Webset.",
    },
    {
      key: "enrichments",
      label: "Enrichments",
      type: "json",
      hint: "Advanced: array of enrichment definitions to extract extra data (e.g. contact " +
        "details, funding, headcount) from every item found. See Exa's Websets API docs for the " +
        "`CreateEnrichmentParameters` shape.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webset ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "dashboardUrl", type: "string", label: "Dashboard URL" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Webset>("/v0/websets", {
      method: "POST",
      body: {
        title: input.title || undefined,
        search: {
          query: input.query,
          count: input.count,
          entity: input.entity ? { type: input.entity } : undefined,
        },
        externalId: input.externalId || undefined,
        metadata: input.metadata || undefined,
        enrichments: input.enrichments || undefined,
      },
    });
  },
};

export default createWebset;
