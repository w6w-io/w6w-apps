import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: fetches one account by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "123", company: "Acme" } }]);
  const out = await accountGet.execute({ accountId: "123" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/123");
  assertEquals(out.company, "Acme");
});
