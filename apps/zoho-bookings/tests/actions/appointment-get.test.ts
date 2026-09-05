import { assertEquals } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/appointment-get.ts";

Deno.test("appointment-get: GETs /getappointment with the booking id", async () => {
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
  const out = await action.execute({ bookingId: "#AN-00014" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/getappointment");
  assertEquals(url.searchParams.get("booking_id"), "#AN-00014");
  assertEquals(out, { booking_id: "#AN-00014", status: "upcoming" });
});
