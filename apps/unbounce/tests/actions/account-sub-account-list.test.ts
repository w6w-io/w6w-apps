import { assertEquals } from "@std/assert";
import accountSubAccountList from "../../actions/account-sub-account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-sub-account-list: calls GET /accounts/{id}/sub_accounts with full list params", async () => {
  const { ctx, calls } = mockCtx([{ body: { sub_accounts: [] } }]);
  await accountSubAccountList.execute(
    { accountId: "1456243", sortOrder: "desc", offset: 10, limit: 5, count: true },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/accounts/1456243/sub_accounts");
  assertEquals(queryOf(calls[0].url), {
    sort_order: "desc",
    offset: "10",
    limit: "5",
    count: "true",
  });
});
