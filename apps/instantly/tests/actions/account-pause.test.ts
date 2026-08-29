import { assertEquals } from "@std/assert";
import accountPause from "../../actions/account-pause.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-pause: POSTs /accounts/{email}/pause", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com", status: 2 } }]);
  const out = await accountPause.execute({ email: "a@b.com" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com/pause");
  assertEquals(out.status, 2);
});
