import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  q: string;
  embed?: string[];
}

/**
 * `GET /parties/search` — "the same results as the global search inside
 * Capsule" (a name, postcode, phone number, ...), distinct from the
 * structured field/tag search Capsule's Filters cover (out of scope here).
 */
const partySearch: ActionDefinition<Input> = {
  key: "party-search",
  type: "search",
  resource: "party",
  title: "Search Parties",
  description: "Free-text search over people and organisations — the same results as Capsule's " +
    "own global search bar.",
  params: [
    { key: "q", label: "Query", type: "string", required: true },
    ...pageParams,
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "tags", label: "Tags" },
        { value: "fields", label: "Custom fields" },
        { value: "organisation", label: "Extended organisation details" },
        { value: "missingImportantFields", label: "Missing important fields flag" },
      ],
    },
  ],
  output: [
    { key: "parties", type: "array", label: "Parties" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<{ parties: unknown[] }>(
      "/parties/search",
      { query: { q: input.q, ...pageQuery(input), embed: input.embed?.join(",") } },
    );
    return { parties: data.parties, nextPage };
  },
};

export default partySearch;
