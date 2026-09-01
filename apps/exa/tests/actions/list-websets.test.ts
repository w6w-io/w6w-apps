import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-websets.ts";

Deno.test("list-websets: GETs /v0/websets with search/limit/cursor as query params", async () => {
  const body = { data: [{ id: "ws_1" }], hasMore: false, nextCursor: null };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ search: "climate", limit: 10, cursor: "c1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("search"), "climate");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("cursor"), "c1");
  assertEquals(result, body);
});

Deno.test("list-websets: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasMore: false, nextCursor: null } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("search"), false);
  assertEquals(url.searchParams.has("cursor"), false);
});
