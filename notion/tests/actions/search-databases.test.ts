import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-databases.ts";

Deno.test("search-databases: forwards query, sort and cursor to /search", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: [], next_cursor: null, has_more: false } }]);
  await action.execute({
    query: "roadmap",
    sort: { direction: "descending", timestamp: "last_edited_time" },
    pageSize: 25,
    startCursor: "cur-1",
  }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.query, "roadmap");
  assertEquals(sent.sort, { direction: "descending", timestamp: "last_edited_time" });
  assertEquals(sent.page_size, 25);
  assertEquals(sent.start_cursor, "cur-1");
  assertEquals(sent.filter, { property: "object", value: "database" });
});
