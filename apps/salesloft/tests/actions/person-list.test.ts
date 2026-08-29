import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-list.ts";

Deno.test("person-list: GETs /people with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], metadata: { paging: { per_page: 25 } } } }]);
  await action.execute!({ accountId: 3, perPage: 10, page: 2, sortDirection: "ASC" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/people");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("account_id"), "3");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("sort_direction"), "ASC");
});

Deno.test("person-list: returns the paged envelope untouched", async () => {
  const body = { data: [{ id: 1 }], metadata: { paging: { per_page: 25, current_page: 1 } } };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(result, body);
});
