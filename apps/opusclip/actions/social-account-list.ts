import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/social-accounts?q=mine` — the connected social destinations
 * available for posting.
 *
 * The vendor's own social-posting workflow names this step 1: call it first
 * to learn which `postAccountId` / `subAccountId` pairs to pass to the
 * posting actions.
 */
const socialAccountList: ActionDefinition<Record<string, never>> = {
  key: "social-account-list",
  type: "read",
  resource: "social-account",
  title: "List Social Accounts",
  description: "List the connected social destinations available for posting.",
  params: [],
  output: [{ key: "items", type: "array", label: "Connected social accounts" }],

  async execute(_input, ctx) {
    const items = await new OpusClipClient(ctx).data<unknown[]>("/api/social-accounts", {
      query: { q: "mine" },
    });
    return { items: items ?? [] };
  },
};

export default socialAccountList;
