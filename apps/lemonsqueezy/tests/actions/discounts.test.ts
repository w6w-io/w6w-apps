import { assertEquals } from "@std/assert";
import discountList from "../../actions/discount-list.ts";
import discountGet from "../../actions/discount-get.ts";
import discountCreate from "../../actions/discount-create.ts";
import discountDelete from "../../actions/discount-delete.ts";
import { envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("discount-list: filter[store_id] survives", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await discountList.execute({ storeId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter[store_id]"), "1");
});

Deno.test("discount-get: GET /v1/discounts/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "discounts" }) }]);
  await discountGet.execute({ discountId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/discounts/1");
});

Deno.test("discount-create: POST with store relationship, no variants relationship by default", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "discounts" }) }]);
  await discountCreate.execute(
    { storeId: "1", name: "10% Off", code: "10PERCENT", amount: 10, amountType: "percent" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.attributes.code, "10PERCENT");
  assertEquals(body.data.relationships.store, { data: { type: "stores", id: "1" } });
  assertEquals(body.data.relationships.variants, undefined);
});

Deno.test("discount-create: limited-to-products builds a variants relationship from the id list", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", type: "discounts" }) }]);
  await discountCreate.execute(
    {
      storeId: "1",
      name: "10% Off",
      code: "10PERCENT",
      amount: 10,
      amountType: "percent",
      isLimitedToProducts: true,
      variantIds: "1,2",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.relationships.variants, {
    data: [{ type: "variants", id: "1" }, { type: "variants", id: "2" }],
  });
});

Deno.test("discount-delete: DELETE, reports deleted: true on the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await discountDelete.execute({ discountId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true });
});
