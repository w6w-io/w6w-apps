import { assertEquals } from "@std/assert";
import paymentCancel from "../../actions/payment-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("payment-cancel: DELETEs by payment id", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "pa_eXampl32" }] }]);
  const out = await paymentCancel.execute({ id: "pa_eXampl3" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.6/payments/pa_eXampl3/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.items, [{ id: "pa_eXampl32" }]);
});

Deno.test("payment-cancel: a genuine 204 becomes an empty list, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await paymentCancel.execute({ id: "pa_eXampl3" }, ctx) as Record<string, unknown>;
  assertEquals(out.items, []);
});
