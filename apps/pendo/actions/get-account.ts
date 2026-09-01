import type { ActionDefinition } from "@w6w/types";
import { PendoClient } from "../lib/client.ts";

/** `GET /api/v1/account/:accountId` — an account's metadata. */
const action: ActionDefinition = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Look up a single account by id — metadata and auto-collected fields.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "account", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.accountId) throw new Error("`accountId` is required");
    const client = new PendoClient(ctx);
    const account = await client.api(`/api/v1/account/${encodeURIComponent(String(p.accountId))}`);
    return { account };
  },
};

export default action;
