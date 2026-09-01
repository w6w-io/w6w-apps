import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-accounts.ts";

Deno.test("list-accounts: GETs /v2/accounts, not the account-scoped path", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { accounts: [{ id: "1234567" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { accounts: [{ id: "1234567" }] });
});

Deno.test("list-accounts: defaults to an empty array", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { accounts: [] });
});
