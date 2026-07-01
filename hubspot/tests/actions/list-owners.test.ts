import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-owners.ts";

Deno.test("list-owners: GETs /crm/v3/owners with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ email: "sam@x", limit: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/owners");
  assertEquals(url.searchParams.get("email"), "sam@x");
  assertEquals(url.searchParams.get("limit"), "5");
});
