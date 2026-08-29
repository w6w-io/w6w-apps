import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `GET /organizations/:id` — fetch the public details of a connected
 * ("delegatee") organization, used when assigning tasks across a Connection.
 */
const action: ActionDefinition = {
  key: "organization-get-delegatee",
  type: "read",
  resource: "organization",
  title: "Get connected organization",
  description: "Fetch the details of an organization connected to this one.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: "One of this organization's own `delegatees`, from `organization-get`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const { organizationId } = input as { organizationId: string };
    if (!organizationId) throw new Error("`organizationId` is required");
    return await new OnfleetClient(ctx).request(
      `/organizations/${encodeURIComponent(organizationId)}`,
    );
  },
};

export default action;
