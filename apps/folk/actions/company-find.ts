import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  query: string;
}

/**
 * `GET /network/{networkId}/group/{groupId}/company/find/{query}` — same
 * path-segment search as `person-find`; see that action's notes.
 */
const companyFind: ActionDefinition<Input> = {
  key: "company-find",
  type: "read",
  resource: "company",
  title: "Find Company",
  description: "Find a company in a group by a free-text query (folk does not document exactly " +
    "which fields it matches against).",
  params: [
    groupIdParam,
    { key: "query", label: "Query", type: "string", required: true },
  ],
  output: [{ key: "company", type: "object", label: "The matching company" }],

  async execute(input, ctx) {
    const company = await new FolkClient(ctx).request(
      networkPath(
        `/group/${encodeURIComponent(input.groupId)}/company/find/${
          encodeURIComponent(input.query)
        }`,
      ),
    );
    return { company };
  },
};

export default companyFind;
