import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/customer-get-many.ts";

Deno.test("customer-get-many: GETs /customers with the query filters", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({ email: "jo@acme.test", name: "Jo", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/customers");
  assertEquals(url.searchParams.get("email"), "jo@acme.test");
  assertEquals(url.searchParams.get("name"), "Jo");
  assertEquals(url.searchParams.get("limit"), "10");
});
