import type { ActionDefinition } from "@w6w/types";
import { PendoClient } from "../lib/client.ts";

/** `GET /api/v1/visitor/:visitorId` — a visitor's metadata, including auto-collected fields. */
const action: ActionDefinition = {
  key: "get-visitor",
  type: "read",
  resource: "visitor",
  title: "Get Visitor",
  description: "Look up a single visitor by id — metadata, account membership, first/last seen.",
  params: [
    {
      key: "visitorId",
      label: "Visitor ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "visitor", type: "object", label: "Visitor" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.visitorId) throw new Error("`visitorId` is required");
    const client = new PendoClient(ctx);
    const visitor = await client.api(`/api/v1/visitor/${encodeURIComponent(String(p.visitorId))}`);
    return { visitor };
  },
};

export default action;
