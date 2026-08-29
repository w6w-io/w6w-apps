import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POSTs /customers with the given fields", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute({ email: "jo@acme.test", name: "Jo Smith" }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/customers");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email, "jo@acme.test");
  assertEquals(body.name, "Jo Smith");
  assertEquals(body.external_id, undefined);
});

Deno.test("customer-create: passes through externalId, language and timezone", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    { externalId: "cust-1", language: "fr", timezone: "Europe/Paris" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_id, "cust-1");
  assertEquals(body.language, "fr");
  assertEquals(body.timezone, "Europe/Paris");
});
