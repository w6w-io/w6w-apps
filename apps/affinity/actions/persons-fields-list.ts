import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";

/** `GET /persons/fields` — the global fields that exist on every person. */
const personsFieldsList: ActionDefinition<Record<string, never>> = {
  key: "persons-fields-list",
  type: "read",
  resource: "field",
  title: "List Global Person Fields",
  description: "Get every global field defined on people (not list-specific ones).",
  params: [],
  output: [{ key: "fields", type: "array", label: "Fields" }],

  execute(_input, ctx) {
    return new AffinityClient(ctx).json("/persons/fields");
  },
};

export default personsFieldsList;
