import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: GETs /accounts with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ domain: "acme.com", archived: false, perPage: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/accounts");
  assertEquals(url.searchParams.get("domain"), "acme.com");
  assertEquals(url.searchParams.get("archived"), "false");
  assertEquals(url.searchParams.get("per_page"), "50");
});
