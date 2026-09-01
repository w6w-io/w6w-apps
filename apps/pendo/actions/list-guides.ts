import type { ActionDefinition } from "@w6w/types";
import { csv, PendoClient } from "../lib/client.ts";

/** `GET /api/v1/guide` — list Guides, optionally filtered to specific ids. */
const action: ActionDefinition = {
  key: "list-guides",
  type: "read",
  resource: "guide",
  title: "List Guides",
  description: "Return every Guide definition, or a specific set by id.",
  params: [
    {
      key: "ids",
      label: "Guide IDs",
      type: "string",
      hint: "Comma-separated guide ids to fetch. Leave blank to return every guide.",
    },
  ],
  output: [{ key: "guides", type: "array", label: "Guides" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PendoClient(ctx);
    const guides = await client.api<unknown[]>("/api/v1/guide", { query: { id: csv(p.ids) } });
    return { guides };
  },
};

export default action;
