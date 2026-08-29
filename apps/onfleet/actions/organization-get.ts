import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /organization` — this credential's own organization details. */
const action: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get organization",
  description: "Fetch this connection's own organization: name, timezone, country, delegatees.",
  requiresAuth: true,
  params: [],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "delegatees", type: "array", label: "Organization IDs this org can assign tasks to" },
  ],

  async execute(_input, ctx) {
    return await new OnfleetClient(ctx).request("/organization");
  },
};

export default action;
