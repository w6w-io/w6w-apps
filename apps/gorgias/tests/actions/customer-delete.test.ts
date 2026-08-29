import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/customer-delete.ts";

Deno.test("customer-delete: DELETEs /customers/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ status: 204 }]);
  const out = await action.execute({ customerId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/customers/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
