import { assertEquals } from "@std/assert";
import licenseKeyList from "../../actions/license-key-list.ts";
import licenseKeyGet from "../../actions/license-key-get.ts";
import licenseKeyUpdate from "../../actions/license-key-update.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("license-key-list: store/order/order-item/product/status filters all survive", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await licenseKeyList.execute(
    { storeId: "1", orderId: "2", orderItemId: "3", productId: "4", status: "active" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "1");
  assertEquals(url.searchParams.get("filter[order_id]"), "2");
  assertEquals(url.searchParams.get("filter[order_item_id]"), "3");
  assertEquals(url.searchParams.get("filter[product_id]"), "4");
  assertEquals(url.searchParams.get("filter[status]"), "active");
});

Deno.test("license-key-get: GET /v1/license-keys/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "license-keys" }) }]);
  await licenseKeyGet.execute({ licenseKeyId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/license-keys/1");
});

Deno.test("license-key-update: a numeric activation limit is sent as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "license-keys" }) }]);
  await licenseKeyUpdate.execute({ licenseKeyId: "1", activationLimit: 5 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.activation_limit, 5);
});

/** `unlimitedActivations` must send a real `null`, overriding any numeric limit. */
Deno.test("license-key-update: unlimitedActivations forces activation_limit: null", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "license-keys" }) }]);
  await licenseKeyUpdate.execute(
    { licenseKeyId: "1", activationLimit: 5, unlimitedActivations: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.activation_limit, null);
});

Deno.test("license-key-update: disabled: false survives compaction", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "license-keys" }) }]);
  await licenseKeyUpdate.execute({ licenseKeyId: "1", disabled: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.disabled, false);
});
