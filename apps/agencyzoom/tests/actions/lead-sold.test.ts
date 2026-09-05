import { assert, assertEquals, assertRejects } from "@std/assert";
import leadSold from "../../actions/lead-sold.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const PRODUCTS = [{ locationId: "A0A0070", isSold: true, carrierId: 91, premium: 34500 }];

Deno.test("lead-sold: POSTs soldProducts (parsed) + keepOpen to /leads/{leadId}/sold", async () => {
  const { ctx, calls } = mockCtx([{ body: { customerId: 100, opportunities: [] } }]);
  const result = await leadSold.execute({ leadId: 9, soldProducts: PRODUCTS }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/9/sold");
  assertEquals(JSON.parse(calls[0].body!), { soldProducts: PRODUCTS, keepOpen: false });
  assertEquals(result, { customerId: 100, opportunities: [] });
});

Deno.test("lead-sold: accepts soldProducts as a JSON string (what a raw text field submits)", async () => {
  const { ctx, calls } = mockCtx([{ body: { customerId: 100 } }]);
  await leadSold.execute({ leadId: 9, soldProducts: JSON.stringify(PRODUCTS) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).soldProducts, PRODUCTS);
});

Deno.test("lead-sold: keepOpen defaults to false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await leadSold.execute({ leadId: 9, soldProducts: PRODUCTS }, ctx);
  assertEquals(JSON.parse(calls[0].body!).keepOpen, false);
});

Deno.test("lead-sold: malformed soldProducts JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await leadSold.execute({ leadId: 9, soldProducts: "{not json" }, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("lead-sold: is declared non-idempotent", () => {
  assert(leadSold.idempotent === false);
});
