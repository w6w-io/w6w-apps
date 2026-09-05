import type { ActionDefinition } from "@w6w/types";
import { MarketoClient } from "../lib/client.ts";

/**
 * `GET /rest/v1/leads/describe.json` — verified against `leads.md`
 * ("Describe"). Marketo's own primary source of truth for which fields
 * (standard and custom) exist on the lead object in this instance, their
 * data type, length, and read-only status — meant to be called before
 * building a `lead-sync` field map rather than guessing field API names.
 * Takes no parameters and is safe to invoke with `{}`.
 */
const action: ActionDefinition = {
  key: "leads-describe",
  type: "read",
  resource: "lead",
  title: "Describe lead fields",
  description: "List every field available on the lead object, including custom fields.",
  output: [{ key: "result", type: "array", label: "Fields" }],

  async execute(_input, ctx) {
    ctx.log("info", "describing Marketo lead fields");
    const res = await new MarketoClient(ctx).request("/leads/describe.json");
    return res.result ?? [];
  },
};

export default action;
