import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: GETs /accounts/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 7, name: "Acme" } } }]);
  const result = await action.execute!({ id: 7 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/accounts/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { data: { id: 7, name: "Acme" } });
});
