import { assertEquals } from "@std/assert";
import accountUpdate from "../../actions/account-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-update: PATCHes /accounts/{account_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a1", name: "New Name" } } }]);
  const out = await accountUpdate.execute({ account_id: "a1", name: "New Name" }, ctx) as {
    account: { name: string };
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts/a1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
  assertEquals(out.account.name, "New Name");
});

Deno.test("account-update: is declared idempotent — retrying a PATCH converges to the same state", () => {
  assertEquals(accountUpdate.idempotent, true);
});
