import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-calendar-one-time-link-create.ts";

Deno.test("booking-calendar-one-time-link-create: POSTs /booking-calendars/{id}/one-time-links", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "QUHVEKLPD93M", url: "https://oncehub.com/.QUHVEKLPD93M" },
  }]);
  await action.execute(
    {
      id: "BKC-1",
      hideUrlParams: true,
      bookingForm: { name: "Carrie Customer", email: "carrie@example.com" },
      utmParams: { source: "facebook" },
      bookingSettings: { duration_minutes: 30 },
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/booking-calendars/BKC-1/one-time-links");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    hide_url_params: true,
    booking_form: { name: "Carrie Customer", email: "carrie@example.com" },
    utm_params: { source: "facebook" },
    booking_settings: { duration_minutes: 30 },
  });
});
