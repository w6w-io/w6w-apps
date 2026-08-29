import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `GET /labels` — every list ("label") in your team's Apollo account.
 *
 * Unlike almost every other list endpoint in this API, the response is a **bare JSON
 * array** — no `{"labels": [...]}` envelope, no `pagination` object. `modality` can also
 * be `emailer_campaigns` (a sequence folder), not just `contacts`/`accounts` — those show
 * up here too even though `list-create` can only make the first two kinds.
 */
const listList: ActionDefinition<Record<string, never>> = {
  key: "list-list",
  type: "search",
  resource: "list",
  title: "List Lists",
  description: 'Every list ("label") in your team\'s account — contacts, accounts, and sequence ' +
    "folders alike.",
  params: [],
  output: [{ key: "lists", type: "array", label: "The lists" }],

  async execute(_input, ctx) {
    const lists = await new ApolloClient(ctx).get<unknown[]>("/labels");
    return { lists: Array.isArray(lists) ? lists : [] };
  },
};

export default listList;
