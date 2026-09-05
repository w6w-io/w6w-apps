import { assertEquals } from "@std/assert";
import cardUnfreeze from "../../actions/card-unfreeze.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-unfreeze: POSTs /cards/{cardId}/unfreeze", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "card_1", status: "active" } }]);
  const out = await cardUnfreeze.execute({ cardId: "card_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/cards/card_1/unfreeze");
  assertEquals(calls[0].method, "POST");
  assertEquals((out.card as { status: string }).status, "active");
});
