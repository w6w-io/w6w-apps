import { assertEquals, assertRejects } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs /invoices with the contact as a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { invoice: { url: "x" } } }]);
  await action.execute({
    contactId: "2",
    invoiceItems: [{ description: "Consulting", item_type: "Hours", price: "100.0" }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.invoice.contact, "https://api.freeagent.com/v2/contacts/2");
  assertEquals(body.invoice.invoice_items, [
    { description: "Consulting", item_type: "Hours", price: "100.0" },
  ]);
});

Deno.test("invoice-create: merges additionalFields and datedOn", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { invoice: { url: "x" } } }]);
  await action.execute({
    contactId: "2",
    datedOn: "2026-08-29",
    invoiceItems: [],
    additionalFields: { reference: "003" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.invoice.dated_on, "2026-08-29");
  assertEquals(body.invoice.reference, "003");
});

Deno.test("invoice-create: rejects a non-array invoiceItems before ever calling fetch", async () => {
  const { ctx } = mockFreeAgentCtx([]);
  await assertRejects(
    async () => await action.execute({ contactId: "2", invoiceItems: { not: "an array" } }, ctx),
    Error,
    "must be a JSON array",
  );
});
