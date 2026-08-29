import { assertEquals } from "@std/assert";
import accountUpdate from "../../actions/account-update.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("account-update posts the new name to the account's own path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 5411295 } }]);
  const out = await accountUpdate.execute({ accountId: 5411295, accountName: "New Name" }, ctx);
  assertEquals(out, { account_id: 5411295 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295`);
  assertEquals(JSON.parse(calls[0].body!), { account_name: "New Name" });
});
