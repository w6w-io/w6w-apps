import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import subscriptionGet from "../../actions/subscription-get.ts";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("subscription-list: every documented filter survives", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await subscriptionList.execute(
    {
      storeId: "1",
      orderId: "2",
      orderItemId: "3",
      productId: "4",
      variantId: "5",
      userEmail: "a@b.com",
      status: "active",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "1");
  assertEquals(url.searchParams.get("filter[order_id]"), "2");
  assertEquals(url.searchParams.get("filter[order_item_id]"), "3");
  assertEquals(url.searchParams.get("filter[product_id]"), "4");
  assertEquals(url.searchParams.get("filter[variant_id]"), "5");
  assertEquals(url.searchParams.get("filter[user_email]"), "a@b.com");
  assertEquals(url.searchParams.get("filter[status]"), "active");
});

Deno.test("subscription-get: GET /v1/subscriptions/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionGet.execute({ subscriptionId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/subscriptions/1");
});

Deno.test("subscription-update: PATCH with a variant switch", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionUpdate.execute({ subscriptionId: "1", variantId: "9" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.variant_id, "9");
});

Deno.test("subscription-update: pauseMode builds a pause object with resumes_at", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionUpdate.execute(
    { subscriptionId: "1", pauseMode: "free", pauseResumesAt: "2027-01-01T00:00:00Z" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.pause, { mode: "free", resumes_at: "2027-01-01T00:00:00Z" });
});

/** Unpause must send a real `null`, not omit the field. */
Deno.test("subscription-update: unpause sends pause: null", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionUpdate.execute({ subscriptionId: "1", unpause: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.pause, null);
});

/** `cancelled: false` (resuming before ends_at) must survive compaction. */
Deno.test("subscription-update: cancelled: false is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionUpdate.execute({ subscriptionId: "1", cancelled: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.cancelled, false);
});

/** `billingAnchor: 0` (reset to today) must survive compaction too. */
Deno.test("subscription-update: billingAnchor 0 is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionUpdate.execute({ subscriptionId: "1", billingAnchor: 0 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.billing_anchor, 0);
});

/** Cancel is DELETE, not a status-flip PATCH. */
Deno.test("subscription-cancel: DELETE /v1/subscriptions/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "subscriptions" }) }]);
  await subscriptionCancel.execute({ subscriptionId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/subscriptions/1");
});
