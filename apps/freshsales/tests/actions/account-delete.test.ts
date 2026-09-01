import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/account-delete.ts";

Deno.test("account-delete: DELETEs /sales_accounts/:id and reads the bare `true` body", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: "true" }]);
  const out = await action.execute({ accountId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
