import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-calendar-schedule.ts";

Deno.test("booking-calendar-schedule: POSTs the booking form merged with custom fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1" } }]);
  await action.execute(
    {
      id: "BKC-1",
      startTime: "2026-08-15T14:00:00.000Z",
      guestTimeZone: "America/New_York",
      name: "Carrie Customer",
      email: "carrie@example.com",
      customFields: { title: "Executive Assistant" },
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/booking-calendars/BKC-1/schedule");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start_time, "2026-08-15T14:00:00.000Z");
  assertEquals(body.guest_time_zone, "America/New_York");
  assertEquals(body.booking_form, {
    name: "Carrie Customer",
    email: "carrie@example.com",
    title: "Executive Assistant",
  });
  assertEquals(body.location, undefined);
});

Deno.test("booking-calendar-schedule: wraps a location override with type + value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      id: "BKC-1",
      startTime: "2026-08-15T14:00:00.000Z",
      guestTimeZone: "UTC",
      name: "A",
      email: "a@b.com",
      locationType: "guest_phone",
      locationValue: "+12025550100",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location, { type: "guest_phone", value: "+12025550100" });
});
