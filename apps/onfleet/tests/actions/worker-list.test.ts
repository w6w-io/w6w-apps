import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-list.ts";

Deno.test("worker-list: comma-separated filters are joined into query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "w1" }] }]);
  const result = await action.execute!({ teams: "t1, t2", states: "1,2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("teams"), "t1,t2");
  assertEquals(url.searchParams.get("states"), "1,2");
  assertEquals((result as { workers: unknown[] }).workers.length, 1);
});

Deno.test("worker-list: no filters means no query params, and result defaults to empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result, { workers: [] });
});
