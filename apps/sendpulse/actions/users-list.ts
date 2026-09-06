import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

/**
 * `GET /crm/v1/users` — the account's confirmed team members, used to resolve
 * a human name to the `responsibleId` every deal and contact create call
 * needs. SendPulse's own description: "active users — team members who have
 * confirmed their account through an email invitation"; a pending invitation
 * is not listed.
 */
const action: ActionDefinition = {
  key: "users-list",
  type: "search",
  resource: "team",
  title: "List team members",
  description: "List the account's active (invitation-confirmed) team members.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Team members" },
  ],

  async execute(_input, ctx) {
    return await new SendPulseClient(ctx).crm("/users");
  },
};

export default action;
