import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/canvas-list.ts";

Deno.test("canvas-list: sends page and sort_direction", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { canvases: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({ page: 1, sortDirection: "desc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/canvas/list");
  assertEquals(q.get("page"), "1");
  assertEquals(q.get("sort_direction"), "desc");
});
