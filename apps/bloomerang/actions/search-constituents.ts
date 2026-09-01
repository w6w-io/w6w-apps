import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, type BloomerangList, PAGE_OUTPUT, pageQuery } from "../lib/client.ts";

interface Input {
  search?: string;
  type?: "Individual" | "Organization" | "Household";
  skip?: number;
  take?: number;
}

/**
 * `GET /constituents/search` — searches constituents AND households by free text.
 *
 * Confirmed against Bloomerang's OpenAPI document: this endpoint accepts
 * `search` (free text), `type` (filters to `Individual` | `Organization` |
 * `Household`), plus the standard `skip`/`take` pagination pair, and returns
 * the usual `{ Total, TotalFiltered, Start, ResultCount, Results }` envelope.
 * `Results` is a discriminated union of constituent and household shapes.
 */
const searchConstituents: ActionDefinition<Input> = {
  key: "search-constituents",
  type: "search",
  resource: "constituent",
  title: "Search Constituents",
  description:
    "Search for constituents and households by free text, optionally filtered to individuals, " +
    "organizations, or households.",
  params: [
    {
      key: "search",
      label: "Search text",
      type: "string",
      hint: "Free-text search, e.g. a name, email or account number.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "Individual", label: "Individual" },
        { value: "Organization", label: "Organization" },
        { value: "Household", label: "Household" },
      ],
      hint: "Leave unset to search across all types.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      hint: "Number of records to skip before starting to collect the result set (`skip`).",
    },
    {
      key: "take",
      label: "Take",
      type: "number",
      hint: "Number of records to return (`take`). Bloomerang defaults to 50 and caps this at 50.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new BloomerangClient(ctx).request<BloomerangList>("/constituents/search", {
      query: { ...pageQuery(input), search: input.search, type: input.type },
    });
  },
};

export default searchConstituents;
