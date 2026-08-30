import { assertEquals } from "@std/assert";
import trackingFormDelete from "../../actions/tracking-form-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("tracking-form-delete sends DELETE and returns the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { form_id: 148099 } }]);
  const out = await trackingFormDelete.execute({ formId: 148099 }, ctx);
  assertEquals(out, { form_id: 148099 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/tracking/forms/148099`);
});

Deno.test("tracking-form-delete is declared not idempotent", () => {
  assertEquals(trackingFormDelete.idempotent, false);
});
