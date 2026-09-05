import { assertEquals } from "@std/assert";
import orderList from "../../actions/order-list.ts";
import orderGet from "../../actions/order-get.ts";
import orderInvoice from "../../actions/order-invoice.ts";
import orderRefund from "../../actions/order-refund.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("order-list: store_id, user_email and order_number filters all survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await orderList.execute({ storeId: "1", userEmail: "a@b.com", orderNumber: 42 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "1");
  assertEquals(url.searchParams.get("filter[user_email]"), "a@b.com");
  assertEquals(url.searchParams.get("filter[order_number]"), "42");
});

Deno.test("order-get: GET /v1/orders/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "orders" }) }]);
  await orderGet.execute({ orderId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/orders/1");
});

/**
 * The one endpoint whose documented example sends billing fields as QUERY
 * parameters on a POST rather than a JSON:API body — pinned here so a future
 * "fix" that moves them into the body doesn't silently break the call.
 */
Deno.test("order-invoice: POST with billing fields as query params, no JSON body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { meta: { urls: { download_invoice: "https://example.com/invoice.pdf" } } } },
  ]);
  await orderInvoice.execute(
    {
      orderId: "1",
      name: "John Doe",
      address: "123 Main St",
      city: "Anytown",
      zipCode: "12345",
      country: "US",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/orders/1/generate-invoice");
  assertEquals(url.searchParams.get("name"), "John Doe");
  assertEquals(url.searchParams.get("address"), "123 Main St");
  assertEquals(url.searchParams.get("zip_code"), "12345");
});

Deno.test("order-refund: full refund omits amount from the JSON:API body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "orders" }) }]);
  await orderRefund.execute({ orderId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/orders/1/refund");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { type: "orders", id: "1", attributes: {} });
});

Deno.test("order-refund: a partial refund sends the amount in cents", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "orders" }) }]);
  await orderRefund.execute({ orderId: "1", amount: 500 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes, { amount: 500 });
});
