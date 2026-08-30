import { assertEquals } from "@std/assert";
import accountPageList from "../../actions/account-page-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-page-list: calls GET /accounts/{id}/pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await accountPageList.execute({ accountId: "1456243" }, ctx);
  assertEquals(pathOf(calls[0].url), "/accounts/1456243/pages");
});
