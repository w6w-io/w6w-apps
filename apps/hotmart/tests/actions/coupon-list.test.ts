import { assertEquals, assertRejects } from "@std/assert";
import couponList from "../../actions/coupon-list.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("coupon-list - GETs the product path with the code/page_token filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: 1, coupon_code: "X" }]),
  }]);
  const out = await couponList.execute(
    { productId: 1234567, code: "SAVE10", pageToken: "tok" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/products/api/v1/coupon/product/1234567");
  assertEquals(queryOf(calls[0].url), { code: "SAVE10", page_token: "tok" });
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("coupon-list - surfaces unauthorized_client", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("unauthorized_client", "no permission"),
  }]);
  await assertRejects(
    () => Promise.resolve(couponList.execute({ productId: 1 }, ctx)),
    Error,
    "unauthorized_client",
  );
});
