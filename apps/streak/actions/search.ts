import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";

/**
 * `GET /search?query=<term>` — search boxes, contacts and organizations by
 * free text.
 *
 * The vendor's own OpenAPI document marks `query` as an `in: "path"`
 * parameter on a path literally spelled `/search?query={query}` — a
 * ReadMe.io documentation quirk, not a real path template. The actual
 * request is `GET /search` with `query` as an ordinary query-string
 * parameter, exactly as the vendor's example shows and as this action sends
 * it.
 *
 * The response nests one level deeper than every other list in this app:
 * `{"results": {"boxes": [...], "contacts": [...], "orgs": [...]}, "page":
 * 0, "query": "..."}` — three arrays inside one object, not a flat list.
 */
interface Input {
  query: string;
  pipelineKey?: string;
  stageKey?: string;
}

interface SearchResponse {
  results?: { boxes?: unknown[]; contacts?: unknown[]; orgs?: unknown[] };
  page?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Search boxes, contacts and organizations by free text.",
  params: [
    { key: "query", label: "Search Term", type: "string", required: true },
    {
      key: "pipelineKey",
      label: "Pipeline Key",
      type: "string",
      advanced: true,
      hint: "Limit box results to this pipeline. Contact/organization results are unaffected.",
    },
    {
      key: "stageKey",
      label: "Stage Key",
      type: "string",
      advanced: true,
      hint: "Limit box results to this stage. Contact/organization results are unaffected.",
    },
  ],
  output: [
    { key: "boxes", type: "array", label: "Matching boxes" },
    { key: "contacts", type: "array", label: "Matching contacts" },
    { key: "organizations", type: "array", label: "Matching organizations" },
  ],

  async execute(input, ctx) {
    const body = await new StreakClient(ctx).get<SearchResponse>("/search", {
      query: input.query,
      pipelineKey: input.pipelineKey,
      stageKey: input.stageKey,
    });
    return {
      boxes: body?.results?.boxes ?? [],
      contacts: body?.results?.contacts ?? [],
      organizations: body?.results?.orgs ?? [],
    };
  },
};

export default search;
