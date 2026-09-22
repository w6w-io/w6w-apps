import type { ActionDefinition } from "@w6w/types";
import { type BrexCard, BrexClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/cards` — the account's cards, optionally narrowed to one user.
 *
 * Brex's own note: "Only cards with limit_type = CARD have spend_controls."
 * Corporate cards carry `limit_type = USER` and inherit the user's limit, so
 * `spend_controls` is legitimately absent on most of what this returns — that is
 * the API's shape, not a projection this app applies.
 *
 * `user_id` is the only filter the endpoint documents; the other three
 * parameters are pagination.
 */
interface Input {
  userId?: string;
  limit?: number;
  cursor?: string;
}

const cardList: ActionDefinition<Input> = {
  key: "card-list",
  type: "search",
  resource: "card",
  title: "List Cards",
  description:
    "List Brex cards, optionally for one user. Only cards with limit_type = CARD carry " +
    "spend_controls.",
  params: [
    {
      key: "userId",
      label: "User",
      type: "string",
      hint: "Brex's `user_id` filter. Leave empty to list every card in the account.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Cards" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Cards in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexCard>("/cards", {
      query: { user_id: input.userId, cursor: input.cursor, limit: input.limit },
    });
  },
};

export default cardList;
