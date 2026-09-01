import type { ActionDefinition } from "@w6w/types";
import { csv, PendoClient } from "../lib/client.ts";

/** `GET /api/v1/feature` — list Features, optionally filtered to specific ids. */
const action: ActionDefinition = {
  key: "list-features",
  type: "read",
  resource: "feature",
  title: "List Features",
  description: "Return every Feature definition, or a specific set by id.",
  params: [
    {
      key: "ids",
      label: "Feature IDs",
      type: "string",
      hint: "Comma-separated feature ids to fetch. Leave blank to return every feature.",
    },
  ],
  output: [{ key: "features", type: "array", label: "Features" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PendoClient(ctx);
    const features = await client.api<unknown[]>("/api/v1/feature", { query: { id: csv(p.ids) } });
    return { features };
  },
};

export default action;
