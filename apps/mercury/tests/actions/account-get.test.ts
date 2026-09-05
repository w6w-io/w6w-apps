import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /account/{accountId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "acc_1", kind: "checking" } }]);
  const out = await accountGet.execute({ accountId: "acc_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/account/acc_1");
  assertEquals((out.account as { id: string }).id, "acc_1");
});

Deno.test("account-get: URL-encodes the account ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountGet.execute({ accountId: "a/b c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/account/a%2Fb%20c");
});
