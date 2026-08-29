import { assertEquals } from "@std/assert";
import accountPatch from "../../actions/account-patch.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-patch: PATCHes /accounts/{email} without IMAP/SMTP fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" } }]);
  await accountPatch.execute({ email: "a@b.com", daily_limit: 30 }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.daily_limit, 30);
  assertEquals("imap_password" in body, false);
});

Deno.test("account-patch: is declared idempotent", () => {
  assertEquals(accountPatch.idempotent, true);
});
