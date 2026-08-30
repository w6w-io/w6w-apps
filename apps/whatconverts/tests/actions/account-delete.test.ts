import { assertEquals } from "@std/assert";
import accountDelete from "../../actions/account-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("account-delete sends DELETE with no body and returns the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 5411295 } }]);
  const out = await accountDelete.execute({ accountId: 5411295 }, ctx);
  assertEquals(out, { account_id: 5411295 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295`);
  assertEquals(calls[0].body, null);
});

Deno.test("account-delete is declared not idempotent", () => {
  assertEquals(accountDelete.idempotent, false);
});
