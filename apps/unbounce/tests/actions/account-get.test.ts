import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: calls GET /accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1456243", name: "Acme", state: "active" } }]);
  const out = await accountGet.execute({ accountId: "1456243" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/accounts/1456243");
  assertEquals(out.name, "Acme");
});

Deno.test("account-get: escapes the account id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountGet.execute({ accountId: "weird id/slash" }, ctx);
  assertEquals(pathOf(calls[0].url), "/accounts/weird%20id%2Fslash");
});
