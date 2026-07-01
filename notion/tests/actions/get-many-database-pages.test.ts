import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-database-pages.ts";

Deno.test("get-many-database-pages: POSTs /databases/{id}/query with filter, sorts and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: [], next_cursor: null, has_more: false } }]);
  await action.execute({
    databaseId: "db-1",
    filter: { property: "Status", select: { equals: "Done" } },
    sorts: [{ property: "Name", direction: "ascending" }],
    pageSize: 50,
    startCursor: "cur-xyz",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/databases/db-1/query");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.filter, { property: "Status", select: { equals: "Done" } });
  assertEquals(sent.sorts, [{ property: "Name", direction: "ascending" }]);
  assertEquals(sent.page_size, 50);
  assertEquals(sent.start_cursor, "cur-xyz");
});
