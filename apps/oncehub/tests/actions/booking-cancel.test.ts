import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-cancel.ts";

Deno.test("booking-cancel: POSTs /bookings/{id}/cancel with the body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1" } }]);
  await action.execute(
    { id: "BKNG-1", cancellationReason: "conflict", sendCancellationEmail: false },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG-1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { cancellation_reason: "conflict", send_cancellation_email: false },
  );
});
