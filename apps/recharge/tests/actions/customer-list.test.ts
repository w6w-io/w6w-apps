import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: hits GET /customers with compacted query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("customers", [{ id: 1 }], { nextCursor: "n1" }) },
  ]);
  const out = await customerList.execute({ email: "a@b.com", limit: 10 }, ctx) as {
    items: unknown[];
    nextCursor?: string;
  };
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com", limit: "10" });
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.nextCursor, "n1");
});

Deno.test("customer-list: omits unset filters entirely rather than sending empty values", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("customers", []) }]);
  await customerList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("customer-list: is a read action requiring no idempotency flag", () => {
  assertEquals(customerList.type, "read");
});
