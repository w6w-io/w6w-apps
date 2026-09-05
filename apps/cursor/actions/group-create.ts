import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `POST /teams/groups` — create a billing group. `type` is always `BILLING`
 * — the doc states it as the only currently-supported value and the default,
 * so it is not exposed as a param. Rate limited to 20 requests/minute per
 * team.
 */
const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Billing Group",
  description: "Create a new billing group.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Name of the group." },
  ],
  output: [
    { key: "group", type: "object", label: "The created billing group" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).post("/teams/groups", { name: input.name });
  },
};

export default groupCreate;
