import type { ActionDefinition } from "@w6w/types";
import { JobNimbusClient } from "../lib/client.ts";
import { LIST_PARAMS, listQuery } from "../lib/params.ts";

type Input = Record<string, unknown>;

/** `GET /contacts` — `{"count", "results"}`. */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List JobNimbus contacts, newest first by default. Supports JobNimbus's own " +
    "Elasticsearch-syntax filter, offset pagination and sort.",
  params: LIST_PARAMS,
  output: [
    { key: "count", type: "number", label: "Total matching records" },
    { key: "results", type: "array", label: "Contacts" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).list("/contacts", listQuery(input));
  },
};

export default contactList;
