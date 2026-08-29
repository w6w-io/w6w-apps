import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a1" } } }]);
  const out = await accountGet.execute({ id: "a1" }, ctx) as { account: { id: string } };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts/a1");
  assertEquals(out.account.id, "a1");
});
