import { assertEquals } from "@std/assert";
import addressList from "../../actions/address-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("address-list: hits GET /addresses with the customer filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("addresses", [{ id: 1 }]) }]);
  const out = await addressList.execute({ customerId: "42" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/addresses");
  assertEquals(queryOf(calls[0].url), { customer_id: "42" });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("address-list: is_active is passed through when explicitly set", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("addresses", []) }]);
  await addressList.execute({ isActive: true }, ctx);
  assertEquals(queryOf(calls[0].url), { is_active: "true" });
});
