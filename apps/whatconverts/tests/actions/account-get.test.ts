import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("account-get fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 5411295 } }]);
  const out = await accountGet.execute({ accountId: 5411295 }, ctx);
  assertEquals(out, { account_id: 5411295 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295`);
  assertEquals(calls[0].method, "GET");
});
