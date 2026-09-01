import { assertEquals, assertRejects } from "@std/assert";
import invoiceCreate from "../../actions/invoice-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-create: posts to /invoices, parsing a JSON-string lineItems param", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_1", status: "draft" } }]);
  await invoiceCreate.execute(
    {
      type: "invoice",
      customerId: "cust_1",
      lineItems: JSON.stringify([{ name: "Widget", amount: 9900, quantity: 2 }]),
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/invoices");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "invoice",
    customer_id: "cust_1",
    line_items: [{ name: "Widget", amount: 9900, quantity: 2 }],
  });
});

Deno.test("invoice-create: also accepts lineItems already parsed (an array, not a string)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_2" } }]);
  await invoiceCreate.execute(
    { type: "link", lineItems: [{ name: "Widget", amount: 100 }] },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!).line_items, [{ name: "Widget", amount: 100 }]);
});

Deno.test("invoice-create: builds an inline customer object only from name/email/contact, never both with customerId conflated", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_3" } }]);
  await invoiceCreate.execute(
    { type: "invoice", customerName: "Aisha", customerEmail: "a@example.com" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customer, { name: "Aisha", email: "a@example.com" });
  assertEquals("customer_id" in body, false);
});

Deno.test("invoice-create: an unparseable lineItems string throws rather than silently sending garbage", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(invoiceCreate.execute({ type: "invoice", lineItems: "{not json" }, ctx)),
    Error,
    "not valid JSON",
  );
});
