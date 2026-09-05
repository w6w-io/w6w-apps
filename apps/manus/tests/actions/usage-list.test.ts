import { assertEquals } from "@std/assert";
import usageList from "../../actions/usage-list.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("usage-list: maps has_more/next_cursor onto { items, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      data: [{ task_id: "t1", credits: -10, created_at: 1, type: "cost" }],
      has_more: true,
      next_cursor: "c2",
    }),
  }]);
  const out = await usageList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/usage.list");
  assertEquals(out.items.length, 1);
  assertEquals(out.nextCursor, "c2");
});

Deno.test("usage-list: sends cursor/limit query params", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await usageList.execute({ cursor: "c1", limit: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { cursor: "c1", limit: "10" });
});
