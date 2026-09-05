import { assertEquals } from "@std/assert";
import cardCancel from "../../actions/card-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-cancel: POSTs /cards/{cardId}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "card_1", status: "cancelled" } }]);
  const out = await cardCancel.execute({ cardId: "card_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/cards/card_1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals((out.card as { status: string }).status, "cancelled");
});
