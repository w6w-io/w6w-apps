import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-delete.ts";

Deno.test("account-delete: DELETEs /accounts/:id and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ id: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/accounts/3");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
