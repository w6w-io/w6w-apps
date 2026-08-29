import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/leads-list-list.ts";

Deno.test("leads-list-list: GETs /leads_lists (underscore, not /leads-lists)", async () => {
  const body = envelope({ leads_lists: [] }, { total: 0 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ limit: 10, offset: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads_lists");
  const q = queryOf(calls[0].url);
  assertEquals(q.limit, "10");
  assertEquals(q.offset, "5");
  assertEquals(result, body);
});
