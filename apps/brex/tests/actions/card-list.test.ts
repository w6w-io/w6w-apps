import { assertEquals } from "@std/assert";
import cardList from "../../actions/card-list.ts";
import { CARD, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("card-list: GETs the collection, optionally for one user", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CARD]) }]);
  await cardList.execute({ userId: "cu8oi6a6vbc9", limit: 50, cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/cards");
  assertEquals(queryOf(calls[0].url), {
    user_id: "cu8oi6a6vbc9",
    limit: "50",
    cursor: "c1",
  });
});

Deno.test("card-list: with no filter the account's cards are listed, with no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CARD]) }]);
  const result = await cardList.execute({}, ctx) as { items: Array<Record<string, unknown>> };

  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result.items[0].last_four, "4242");
});

/**
 * Brex's own note on this endpoint: "Only cards with limit_type = CARD have
 * spend_controls." A corporate card inherits the user's limit, so the absence is
 * the API's shape and is passed through as it arrived.
 */
Deno.test("card-list: a card without spend controls passes through unchanged", async () => {
  const corporate = { id: "card_2", limit_type: "USER", last_four: "1111", owner: {} };
  const { ctx } = mockCtx([{ body: page([corporate]) }]);
  const result = await cardList.execute({}, ctx) as { items: Array<Record<string, unknown>> };

  assertEquals(result.items[0].spend_controls, undefined);
  assertEquals(result.items[0].limit_type, "USER");
});

Deno.test("card-list: it is a search", () => {
  assertEquals(cardList.type, "search");
  assertEquals(cardList.resource, "card");
});
