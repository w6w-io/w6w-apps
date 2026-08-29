import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POSTs /customers with the compacted fields", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await action.execute({ name: "Jane Doe", email: "jane@example.com" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Jane Doe",
    emails: [{ email: "jane@example.com", type: "home" }],
  });
  assertEquals(out, { id: "1" });
});

Deno.test("customer-create: wraps a phone into the phones array", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute({ phone: "+12065551234" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    phones: [{ phone: "+12065551234", type: "home" }],
  });
});

Deno.test("customer-create: omits unset fields entirely", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("customer-create: is not idempotent — Kustomer mints a new id per call", () => {
  assertEquals(action.idempotent, false);
});
