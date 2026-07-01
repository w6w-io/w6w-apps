import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-tickets.ts";

Deno.test("search-tickets: POSTs /crm/v3/objects/tickets/search", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ query: "urgent" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets/search");
});
