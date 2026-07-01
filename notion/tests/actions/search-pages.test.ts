import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-pages.ts";

Deno.test("search-pages: POSTs /search filtered to object=page with query", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: [], next_cursor: null, has_more: false } }]);
  await action.execute({ query: "meeting" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/search");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.filter, { property: "object", value: "page" });
  assertEquals(sent.query, "meeting");
  assertEquals(sent.page_size, 100);
});
