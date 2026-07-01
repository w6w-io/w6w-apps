import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-segments.ts";

Deno.test("get-segments: GETs /segments/ and passes filter through", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ filter: 'equals(name,"VIP")' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/segments/");
  assertEquals(url.searchParams.get("filter"), 'equals(name,"VIP")');
});
