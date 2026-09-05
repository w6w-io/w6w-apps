import type { ActionDefinition } from "@w6w/types";
import { hnRequest, type Updates } from "../lib/client.ts";

/**
 * `GET /v0/updates.json` — recently changed item ids and user profile ids
 * (`items` / `profiles`), per the README's "Live Data" section. This is the
 * closest thing the API offers to a changefeed, in place of a webhook or
 * subscription.
 */
const getUpdates: ActionDefinition<Record<string, never>, Updates> = {
  key: "get-updates",
  type: "read",
  resource: "updates",
  title: "Get Updates",
  description: "Fetch ids of recently changed items and user profiles.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Recently changed item ids" },
    { key: "profiles", type: "array", label: "Recently changed usernames" },
  ],

  async execute(_input, ctx) {
    const body = await hnRequest<Updates | null>(ctx, "/updates.json");
    return body ?? { items: [], profiles: [] };
  },
};

export default getUpdates;
