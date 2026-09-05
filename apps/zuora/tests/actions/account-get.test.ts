import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: retrieves an account by key", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1", name: "Acme" })], { display });
  const result = await action.execute!({ accountKey: "A00000001" }, ctx) as {
    account: { name: string };
  };
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/accounts/A00000001");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.account.name, "Acme");
});

Deno.test("account-get: URL-encodes the account key", async () => {
  const { ctx, calls } = mockCtx([one({ id: "acc1" })], { display });
  await action.execute!({ accountKey: "A/00 001" }, ctx);
  assertEquals(calls[0].url, "https://rest.zuora.com/v1/accounts/A%2F00%20001");
});
