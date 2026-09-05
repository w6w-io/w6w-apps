import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";

/** `GET /organizations/fields` — the global fields that exist on every organization. */
const organizationsFieldsList: ActionDefinition<Record<string, never>> = {
  key: "organizations-fields-list",
  type: "read",
  resource: "field",
  title: "List Global Organization Fields",
  description: "Get every global field defined on organizations (not list-specific ones).",
  params: [],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  execute(_input, ctx) {
    return new AffinityClient(ctx).json("/organizations/fields");
  },
};

export default organizationsFieldsList;
