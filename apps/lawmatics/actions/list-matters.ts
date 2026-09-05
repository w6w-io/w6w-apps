import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsListEnvelope } from "../lib/client.ts";
import { listParams, listQuery, type ListQueryInput } from "../lib/params.ts";

/**
 * `GET /v1/prospects` — a paginated list of Matters.
 *
 * Lawmatics' resource is literally named "Prospect" on the wire (the
 * collection folder is titled "Matters (Prospects)") — the intake-through-
 * case-management record a firm calls a Matter once retained. Every action
 * here uses "Matter" in its title/description (what a firm calls it) and
 * `/v1/prospects` in the request (what the vendor's API calls it), and says so
 * once here rather than in every action's own doc comment.
 */
const listMatters: ActionDefinition<ListQueryInput> = {
  key: "list-matters",
  type: "read",
  resource: "matter",
  title: "List Matters",
  description:
    'List Matters (Lawmatics calls this resource "Prospect" on the wire), paginated. Filter, ' +
    "sort and select fields via the Param Guide options.",
  params: listParams(),
  output: [
    { key: "data", type: "array", label: "Matters" },
    {
      key: "meta",
      type: "object",
      label: "Pagination — total_pages, limit_per_page, total_entries",
    },
    { key: "links", type: "object", label: "Pagination links — self, next, prev" },
  ],

  async execute(input, ctx) {
    return await new LawmaticsClient(ctx).request<LawmaticsListEnvelope>("/prospects", {
      query: listQuery(input),
    });
  },
};

export default listMatters;
