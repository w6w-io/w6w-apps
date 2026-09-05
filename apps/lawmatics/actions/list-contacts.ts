import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsListEnvelope } from "../lib/client.ts";
import { listParams, listQuery, type ListQueryInput } from "../lib/params.ts";

/**
 * `GET /v1/contacts` — a paginated list of Contacts (people not currently a
 * Matter/Prospect). Pagination metadata rides in `meta`/`links`, not a param.
 */
const listContacts: ActionDefinition<ListQueryInput> = {
  key: "list-contacts",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List Contacts, paginated. Filter, sort and select fields via the Param Guide options.",
  params: listParams(),
  output: [
    { key: "data", type: "array", label: "Contacts" },
    {
      key: "meta",
      type: "object",
      label: "Pagination — total_pages, limit_per_page, total_entries",
    },
    { key: "links", type: "object", label: "Pagination links — self, next, prev" },
  ],

  async execute(input, ctx) {
    return await new LawmaticsClient(ctx).request<LawmaticsListEnvelope>("/contacts", {
      query: listQuery(input),
    });
  },
};

export default listContacts;
