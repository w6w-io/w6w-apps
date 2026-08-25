import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/account-create.ts";

Deno.test("account-create: POSTs /accounts", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  const out = await action.execute({ fields: { accountName: "Zylker Inc." } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/accounts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { accountName: "Zylker Inc." });
  assertEquals(out, { id: "1" });
});

Deno.test("account-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
