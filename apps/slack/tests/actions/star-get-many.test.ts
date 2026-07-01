import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/star-get-many.ts";

Deno.test("star-get-many: GETs /stars.list with limit default", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, items: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/stars.list");
  assertEquals(url.searchParams.get("limit"), "100");
});
