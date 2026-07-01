import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-companies.ts";

Deno.test("list-companies: GETs /crm/v3/objects/companies", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ limit: 50 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/companies");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "50");
});
