import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /persons` — every person visible to this account, for assignment lookups. */
const personList: ActionDefinition<Record<string, never>, unknown[]> = {
  key: "person-list",
  type: "search",
  resource: "person",
  title: "List Persons",
  description: "List every person visible to this account — useful for looking up an " +
    "assignee's person ID before creating or updating a task.",
  params: [],
  output: [{ key: "", type: "array", label: "Persons" }],

  execute(_input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>("/persons");
  },
};

export default personList;
