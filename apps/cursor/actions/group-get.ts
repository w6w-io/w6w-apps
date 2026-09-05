import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { billingCycleParam, groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  billingCycle?: string;
}

/**
 * `GET /teams/groups/:id` — one billing group, with its current and former
 * members and their spend for the requested (or current) billing cycle.
 * Enterprise only.
 */
const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Billing Group",
  description:
    "Retrieve a single billing group with its members and spend data for the given (or " +
    "current) billing cycle.",
  params: [groupIdParam, billingCycleParam],
  output: [
    { key: "group", type: "object", label: "The billing group" },
    { key: "billingCycle", type: "object", label: "The cycle these figures cover" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).get(`/teams/groups/${encodeId(input.groupId)}`, {
      billingCycle: input.billingCycle,
    });
  },
};

export default groupGet;
