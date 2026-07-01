import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-lists.ts";

Deno.test("get-lists: GETs /lists/ with filter passthrough", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ filter: 'equals(name,"VIPs")' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/lists/");
  assertEquals(url.searchParams.get("filter"), 'equals(name,"VIPs")');
});
