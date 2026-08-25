import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-request-reschedule.ts";

Deno.test("booking-request-reschedule: POSTs /bookings/{id}/request-reschedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1" } }]);
  await action.execute({ id: "BKNG-1", rescheduleReason: "host unavailable" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG-1/request-reschedule");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { reschedule_reason: "host unavailable" });
});
