import { assertEquals } from "@std/assert";
import subAccountPageGroupList from "../../actions/sub-account-page-group-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sub-account-page-group-list: calls GET /sub_accounts/{id}/page_groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { page_groups: [] } }]);
  await subAccountPageGroupList.execute({ subAccountId: "1552433" }, ctx);
  assertEquals(pathOf(calls[0].url), "/sub_accounts/1552433/page_groups");
});
