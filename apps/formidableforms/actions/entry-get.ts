import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  entryId: string | number;
}

/** `GET /frm/v3/entries/{id}` — one entry. Permission: "View Entries from Admin Area". */
const entryGet: ActionDefinition<Input> = {
  key: "entry-get",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Fetch one entry by ID, including its field values.",
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request(`/entries/${encodeURIComponent(String(input.entryId))}`);
  },
};

export default entryGet;
