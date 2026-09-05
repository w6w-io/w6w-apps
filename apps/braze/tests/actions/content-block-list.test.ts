import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/content-block-list.ts";

Deno.test("content-block-list: sends modified_after/before, limit and offset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { content_blocks: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    modifiedAfter: "2026-01-01T00:00:00Z",
    limit: 1,
    offset: 0,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/content_blocks/list");
  assertEquals(q.get("modified_after"), "2026-01-01T00:00:00Z");
  assertEquals(q.get("limit"), "1");
  assertEquals(q.get("offset"), "0");
});
