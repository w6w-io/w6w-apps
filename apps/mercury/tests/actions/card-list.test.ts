import { assertEquals } from "@std/assert";
import cardList from "../../actions/card-list.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("card-list: GETs /cards", async () => {
  const { ctx, calls } = mockCtx([{ body: { cards: [{ id: "card_1" }], page: {} } }]);
  const out = await cardList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/cards");
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("card-list: repeats status/type/kind as multi-value query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { cards: [], page: {} } }]);
  await cardList.execute({ status: ["active", "frozen"], type: ["virtual"], kind: ["debit"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "status"), ["active", "frozen"]);
  assertEquals(queryAllOf(calls[0].url, "type"), ["virtual"]);
  assertEquals(queryAllOf(calls[0].url, "kind"), ["debit"]);
});
