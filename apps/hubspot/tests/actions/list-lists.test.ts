import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-lists.ts";

Deno.test("list-lists: GETs /contacts/v1/lists with count + offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }]);
  await action.execute!({ count: 50, offset: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/v1/lists");
  assertEquals(url.searchParams.get("count"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});
