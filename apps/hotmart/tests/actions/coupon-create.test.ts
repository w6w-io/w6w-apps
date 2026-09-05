import { assertEquals, assertRejects } from "@std/assert";
import couponCreate from "../../actions/coupon-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("coupon-create - POSTs the product path with the coupon body, dropping unset fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await couponCreate.execute(
    { productId: 1234567, code: "SAVE10", discount: 0.1 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/products/api/v1/product/1234567/coupon");
  assertEquals(calls[0].body, JSON.stringify({ code: "SAVE10", discount: 0.1 }));
  assertEquals(out, { ok: true });
});

Deno.test("coupon-create - sends dates, affiliate and offer_ids when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await couponCreate.execute({
    productId: 1,
    code: "X",
    discount: 0.2,
    startDate: 10,
    endDate: 20,
    affiliate: 99,
    offerIds: ["o1", "o2"],
  }, ctx);
  assertEquals(
    calls[0].body,
    JSON.stringify({
      code: "X",
      discount: 0.2,
      start_date: 10,
      end_date: 20,
      affiliate: 99,
      offer_ids: ["o1", "o2"],
    }),
  );
});

Deno.test("coupon-create - is declared non-idempotent", () => {
  assertEquals(couponCreate.idempotent, false);
});

Deno.test("coupon-create - surfaces the vendor's internal_error verbatim (e.g. subscription products)", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("internal_error", "It was not possible to save a coupon.") },
  ]);
  await assertRejects(
    () => Promise.resolve(couponCreate.execute({ productId: 1, code: "X", discount: 0.1 }, ctx)),
    Error,
    "internal_error",
  );
});
