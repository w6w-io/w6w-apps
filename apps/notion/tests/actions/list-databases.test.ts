import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-databases.ts";

Deno.test("list-databases: POSTs /search filtered to object=database with defaults", async () => {
  const body = { object: "list", results: [], next_cursor: null, has_more: false };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/search");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.filter, { property: "object", value: "database" });
  assertEquals(sent.page_size, 100);
});
