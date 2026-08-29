import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: PUTs /customers/{id} with only the fields set", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute({ customerId: 1, name: "Jo Smith" }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/customers/1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Jo Smith");
  assertEquals(body.email, undefined);
});
