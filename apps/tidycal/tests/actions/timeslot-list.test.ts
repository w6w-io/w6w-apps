import { assertEquals } from "@std/assert";
import timeslotList from "../../actions/timeslot-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeslot-list: calls GET /api/booking-types/{id}/timeslots with both bounds", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{
      starts_at: "2026-03-20T10:00:00Z",
      ends_at: "2026-03-20T10:30:00Z",
      available_bookings: 1,
    }]),
  }]);
  const out = await timeslotList.execute(
    { bookingType: 3, starts_at: "2026-03-20T00:00:00Z", ends_at: "2026-03-27T00:00:00Z" },
    ctx,
  ) as { data: Array<{ available_bookings: number }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/booking-types/3/timeslots");
  assertEquals(queryOf(calls[0].url), {
    starts_at: "2026-03-20T00:00:00Z",
    ends_at: "2026-03-27T00:00:00Z",
  });
  assertEquals(out.data[0].available_bookings, 1);
});

/**
 * Both bounds are the only parameters in the whole document declared
 * `"in": "query"`, `required: true` — the window is not optional.
 */
Deno.test("timeslot-list: both window bounds are declared required params", () => {
  const required = (timeslotList.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["bookingType", "ends_at", "starts_at"]);
});
