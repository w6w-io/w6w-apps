import { assertEquals, assertRejects } from "@std/assert";
import salesRefund from "../../actions/sales-refund.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-refund - PUTs to the transaction's refund path and returns ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await salesRefund.execute({ transaction: "HP17715690036014" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/HP17715690036014/refund");
  assertEquals(out, { ok: true });
});

Deno.test("sales-refund - URL-encodes a transaction id containing path-unsafe characters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await salesRefund.execute({ transaction: "HP/1?2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/HP%2F1%3F2/refund");
});

Deno.test("sales-refund - is declared non-idempotent", () => {
  assertEquals(salesRefund.idempotent, false);
});

Deno.test("sales-refund - surfaces the vendor's purchase_not_found code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("purchase_not_found", "Purchase not found"),
  }]);
  await assertRejects(
    () => Promise.resolve(salesRefund.execute({ transaction: "nope" }, ctx)),
    Error,
    "purchase_not_found",
  );
});
