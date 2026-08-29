import { assertEquals } from "@std/assert";
import accountMarkFixed from "../../actions/account-mark-fixed.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-mark-fixed: POSTs /accounts/{email}/mark-fixed", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com", status: 1 } }]);
  const out = await accountMarkFixed.execute({ email: "a@b.com" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com/mark-fixed");
  assertEquals(out.status, 1);
});
