import { assertEquals } from "@std/assert";
import action from "../../actions/list-tags.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-tags: GETs the list-scoped tag collection", async () => {
  // Tags belong to a list, not to the account — there is no `/tags` endpoint.
  const { ctx, calls } = mockCtx([{ body: { data: [{ tag: "vip" }] } }]);
  const out = await action.execute!({ listId: "l1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1/tags");
  assertEquals(out, { data: [{ tag: "vip" }] });
});

Deno.test("list-tags: forwards limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ listId: "l1", limit: 10, startingAfter: "cur" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("limit"), "10");
  assertEquals(p.get("starting_after"), "cur");
});
