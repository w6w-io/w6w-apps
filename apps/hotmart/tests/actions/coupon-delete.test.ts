import { assertEquals, assertRejects } from "@std/assert";
import couponDelete from "../../actions/coupon-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("coupon-delete - DELETEs the coupon id path and returns ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await couponDelete.execute({ couponId: 123456 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/products/api/v1/coupon/123456");
  assertEquals(out, { ok: true });
});

Deno.test("coupon-delete - is declared non-idempotent", () => {
  assertEquals(couponDelete.idempotent, false);
});

Deno.test("coupon-delete - surfaces internal_error", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("internal_error", "It was not possible to delete a coupon.") },
  ]);
  await assertRejects(
    () => Promise.resolve(couponDelete.execute({ couponId: 1 }, ctx)),
    Error,
    "internal_error",
  );
});
