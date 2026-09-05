import { assertEquals } from "@std/assert";
import cardGet from "../../actions/card-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-get: GETs /cards/{cardId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "card_1", status: "active" } }]);
  const out = await cardGet.execute({ cardId: "card_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/cards/card_1");
  assertEquals((out.card as { status: string }).status, "active");
});
