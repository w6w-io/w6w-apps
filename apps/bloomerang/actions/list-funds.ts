import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, type BloomerangList, PAGE_OUTPUT, pageQuery } from "../lib/client.ts";

interface Input {
  search?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
}

/**
 * `GET /funds` — list funds, the objects a donation's designation points at.
 *
 * Params confirmed against the OpenAPI document: `search` matches any part of
 * a fund's name, `isActive` filters to active/inactive funds. (`id` and
 * `isDefault` filters also exist but are not exposed here — this action is
 * meant for discovery-by-name ahead of Create Donation, which is the common
 * case.) Standard `skip`/`take` pagination applies.
 */
const listFunds: ActionDefinition<Input> = {
  key: "list-funds",
  type: "search",
  resource: "fund",
  title: "List Funds",
  description:
    "List funds, to resolve the fund id a donation's designation needs. Optionally filter by " +
    "name or active status.",
  params: [
    {
      key: "search",
      label: "Search text",
      type: "string",
      hint: "Matches any part of the fund name.",
    },
    { key: "isActive", label: "Active only", type: "boolean" },
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
    return new BloomerangClient(ctx).request<BloomerangList>("/funds", {
      query: { ...pageQuery(input), search: input.search, isActive: input.isActive },
    });
  },
};

export default listFunds;
