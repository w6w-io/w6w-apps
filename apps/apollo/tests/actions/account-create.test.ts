import { assertEquals } from "@std/assert";
import accountCreate from "../../actions/account-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-create: POSTs a JSON body to /accounts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { account: { id: "a1", name: "Acme" } } }]);
  const out = await accountCreate.execute({ name: "Acme", domain: "acme.com" }, ctx) as {
    account: { id: string };
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme", domain: "acme.com" });
  assertEquals(out.account.id, "a1");
});

Deno.test("account-create: omits unset optional fields from the body entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a1" } } }]);
  await accountCreate.execute({ name: "Acme" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});
