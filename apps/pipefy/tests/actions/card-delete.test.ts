import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardDelete from "../../actions/card-delete.ts";

Deno.test("card-delete: deletes and returns success", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deleteCard: { success: true } } } }]);
  const out = await cardDelete.execute({ id: "1" }, ctx) as { success: boolean };
  assertEquals(out.success, true);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(q, "mutation { deleteCard(input: { id: 1 }) { success } }");
});

Deno.test("card-delete: throws when success is false", async () => {
  const { ctx } = mockCtx([{ body: { data: { deleteCard: { success: false } } } }]);
  let threw = false;
  try {
    await cardDelete.execute({ id: "1" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("card-delete: type/resource/idempotency metadata", () => {
  assertEquals(cardDelete.type, "perform");
  assertEquals(cardDelete.resource, "card");
  assertEquals(cardDelete.idempotent, true);
});
