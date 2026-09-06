import { assertEquals, assertThrows } from "@std/assert";
import action from "../../actions/sales-invoice-create.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const asInput = (v: unknown) => v as any;

Deno.test("sales-invoice-create: POSTs /sales_invoices.json with details_attributes from lineItems", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: { id: "i1", state: "draft" } }]);
  await action.execute({
    contactId: "c1",
    reference: "30052",
    lineItems: [{ description: "Rocking Chair", price: 129.95 }],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    sales_invoice: {
      contact_id: "c1",
      reference: "30052",
      details_attributes: [{ description: "Rocking Chair", price: 129.95 }],
    },
  });
});

Deno.test("sales-invoice-create: lineItems accepts a JSON string too", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: {} }]);
  await action.execute({
    contactId: "c1",
    lineItems: '[{"description":"Widget","price":"10.00"}]',
  }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).sales_invoice.details_attributes,
    [{ description: "Widget", price: "10.00" }],
  );
});

Deno.test("sales-invoice-create: rejects a non-array lineItems before making a request", () => {
  const { ctx, calls } = mockMoneybirdCtx();
  assertThrows(
    () => action.execute(asInput({ contactId: "c1", lineItems: { not: "an array" } }), ctx),
    Error,
    "must be a JSON array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sales-invoice-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
