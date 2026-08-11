import type { ActionDefinition } from "@w6w/types";
import { unwrap, WufooClient } from "../lib/client.ts";

/**
 * `GET /reports.json` — the account's reports.
 *
 * A Wufoo report is a saved view over a form's entries, and it carries its own
 * `Hash` — which is what List Report Entries takes. Reports are the vendor's own
 * answer to "the same filtered slice, every time", so reading one is usually
 * cheaper than reproducing its filters in a workflow.
 */
const reportList: ActionDefinition<Record<string, never>> = {
  key: "report-list",
  type: "search",
  resource: "report",
  title: "List Reports",
  description: "List the account's saved reports, with the hash each one is read by.",
  params: [],
  output: [{ key: "[]", type: "array", label: "Reports — `Hash` identifies each one" }],

  async execute(_input, ctx) {
    const body = await new WufooClient(ctx).request("/reports.json");
    return unwrap(body, "Reports");
  },
};

export default reportList;
