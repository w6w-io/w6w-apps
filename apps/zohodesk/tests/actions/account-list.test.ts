import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: GETs /accounts", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ sortBy: "accountName" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/accounts");
  assertEquals(url.searchParams.get("sortBy"), "accountName");
  assertEquals(out.data, [{ id: "1" }]);
});
