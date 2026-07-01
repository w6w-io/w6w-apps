import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-companies.ts";

Deno.test("search-companies: POSTs /crm/v3/objects/companies/search with query", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ query: "acme" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/companies/search");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "acme");
});
