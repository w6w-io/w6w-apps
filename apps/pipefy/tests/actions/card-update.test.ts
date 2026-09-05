import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardUpdate from "../../actions/card-update.ts";

Deno.test("card-update: renames a card", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updateCard: { card: { id: "1", title: "New title" } } } },
  }]);
  const out = await cardUpdate.execute({ id: "1", title: "New title" }, ctx) as { title: string };
  assertEquals(out.title, "New title");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { updateCard(input: { id: 1, title:"));
});

Deno.test("card-update: type/resource/idempotency metadata", () => {
  assertEquals(cardUpdate.type, "perform");
  assertEquals(cardUpdate.resource, "card");
  assertEquals(cardUpdate.idempotent, true);
});
