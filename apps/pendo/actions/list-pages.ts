import type { ActionDefinition } from "@w6w/types";
import { csv, PendoClient } from "../lib/client.ts";

/** `GET /api/v1/page` — list Pages, optionally filtered to specific ids. */
const action: ActionDefinition = {
  key: "list-pages",
  type: "read",
  resource: "page",
  title: "List Pages",
  description: "Return every Page definition, or a specific set by id.",
  params: [
    {
      key: "ids",
      label: "Page IDs",
      type: "string",
      hint: "Comma-separated page ids to fetch. Leave blank to return every page.",
    },
  ],
  output: [{ key: "pages", type: "array", label: "Pages" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PendoClient(ctx);
    const pages = await client.api<unknown[]>("/api/v1/page", { query: { id: csv(p.ids) } });
    return { pages };
  },
};

export default action;
