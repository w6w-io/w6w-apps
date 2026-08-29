import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customers/{id} and unwraps data", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1", type: "customer" } } }]);
  const out = await action.execute({ id: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "1", type: "customer" });
});

Deno.test("customer-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute({ id: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers/a%2Fb");
});
