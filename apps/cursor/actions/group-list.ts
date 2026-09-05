import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";
import { billingCycleParam } from "../lib/params.ts";

interface Input {
  billingCycle?: string;
}

/**
 * `GET /teams/groups` — every billing group, with spend for the requested (or
 * current) billing cycle, plus the reserved `unassignedGroup` every member
 * not assigned to a group falls into. Enterprise only; a member belongs to at
 * most one group at a time.
 */
const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List Billing Groups",
  description:
    "Retrieve all billing groups for your team, with spend data for the given (or current) " +
    "billing cycle. Enterprise only.",
  params: [billingCycleParam],
  output: [
    { key: "groups", type: "array", label: "Billing groups" },
    { key: "unassignedGroup", type: "object", label: "The reserved Unassigned group" },
    { key: "billingCycle", type: "object", label: "The cycle these figures cover" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).get("/teams/groups", { billingCycle: input.billingCycle });
  },
};

export default groupList;
