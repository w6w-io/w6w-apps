import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-designs.ts";

Deno.test("list-designs: GETs /rest/v1/designs", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-designs: forwards query params using Canva's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({
    query: "holiday",
    continuation: "tok123",
    ownership: "owned",
    sortBy: "title_ascending",
    limit: 10,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("query"), "holiday");
  assertEquals(params.get("continuation"), "tok123");
  assertEquals(params.get("ownership"), "owned");
  assertEquals(params.get("sort_by"), "title_ascending");
  assertEquals(params.get("limit"), "10");
});
