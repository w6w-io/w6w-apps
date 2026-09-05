import { assertEquals } from "@std/assert";
import cardFreeze from "../../actions/card-freeze.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-freeze: POSTs /cards/{cardId}/freeze with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "card_1", status: "frozen" } }]);
  const out = await cardFreeze.execute({ cardId: "card_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/cards/card_1/freeze");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals((out.card as { status: string }).status, "frozen");
});

Deno.test("card-freeze: declares idempotent true", () => {
  assertEquals(cardFreeze.idempotent, true);
});
