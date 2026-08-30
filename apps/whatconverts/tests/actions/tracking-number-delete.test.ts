import { assertEquals } from "@std/assert";
import trackingNumberDelete from "../../actions/tracking-number-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("tracking-number-delete sends DELETE and returns the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { phone_number_id: 148099 } }]);
  const out = await trackingNumberDelete.execute({ phoneNumberId: 148099 }, ctx);
  assertEquals(out, { phone_number_id: 148099 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/tracking/numbers/148099`);
});

Deno.test("tracking-number-delete is declared not idempotent", () => {
  assertEquals(trackingNumberDelete.idempotent, false);
});
