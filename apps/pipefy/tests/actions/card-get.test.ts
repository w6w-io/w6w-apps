import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardGet from "../../actions/card-get.ts";

Deno.test("card-get: fetches a card by numeric id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { card: { id: "1", title: "Deal", done: false } } },
  }]);
  const out = await cardGet.execute({ id: "1" }, ctx) as { title: string };
  assertEquals(out.title, "Deal");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ card(id: 1) {"));
  assert(q.includes("current_phase { id name }"));
  assert(q.includes("assignees { name email }"));
  assert(q.includes("attachments { url path }"));
});

Deno.test("card-get: type/resource metadata", () => {
  assertEquals(cardGet.type, "read");
  assertEquals(cardGet.resource, "card");
});
