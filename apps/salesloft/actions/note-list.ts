import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  associatedWithType?: "person" | "account";
  associatedWithId?: number;
  perPage?: number;
  page?: number;
}

/** GET /v2/notes — list/filter notes. */
const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List and filter notes.",
  params: [
    {
      key: "associatedWithType",
      label: "Associated with",
      type: "select",
      options: [{ value: "person", label: "Person" }, { value: "account", label: "Account" }],
    },
    {
      key: "associatedWithId",
      label: "Associated record ID",
      type: "number",
      hint: "Requires Associated with to also be set.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "1–100." },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Notes" },
    { key: "metadata", type: "object", label: "Paging metadata" },
  ],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/notes", {
      query: compact({
        associated_with_type: input.associatedWithType,
        associated_with_id: input.associatedWithId,
        per_page: input.perPage,
        page: input.page,
      }),
    });
  },
};

export default noteList;
