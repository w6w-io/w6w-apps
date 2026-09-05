import { assertEquals, assertRejects } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/appointment-reschedule.ts";

Deno.test("appointment-reschedule: POSTs the provided fields as form-data", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: { booking_id: "#AN-00014", status: "upcoming" },
        },
      },
    },
  ]);
  await action.execute(
    { bookingId: "#AN-00014", staffId: "2", startTime: "2030-05-28 13:00:00" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/rescheduleappointment");
  assertEquals(calls[0].form, {
    booking_id: "#AN-00014",
    staff_id: "2",
    start_time: "2030-05-28 13:00:00",
  });
});

Deno.test("appointment-reschedule: throws before requesting when none of staffId/groupId/startTime is set", async () => {
  const { ctx, calls } = mockBookingsCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ bookingId: "#AN-00014" }, ctx)),
    Error,
    "staffId",
  );
  assertEquals(calls.length, 0);
});
