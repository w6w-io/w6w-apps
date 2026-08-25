import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-list.ts";

Deno.test("booking-list: GETs /bookings and maps all camelCase filters to dotted query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({
    status: "scheduled",
    owner: "USR-1",
    host: "USR-2",
    contact: "CTC-1",
    bookingCalendar: "BKC-1",
    creationTimeGt: "2026-01-01",
    creationTimeLt: "2026-02-01",
    startingTimeGt: "2026-01-01",
    startingTimeLt: "2026-02-01",
    lastUpdatedTimeGt: "2026-01-01",
    lastUpdatedTimeLt: "2026-02-01",
    expand: "owner,contact",
    before: "BKNG-A",
    after: "BKNG-B",
    limit: 25,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings");
  assertEquals(url.searchParams.get("status"), "scheduled");
  assertEquals(url.searchParams.get("booking_calendar"), "BKC-1");
  assertEquals(url.searchParams.get("host"), "USR-2");
  assertEquals(url.searchParams.get("creation_time.gt"), "2026-01-01");
  assertEquals(url.searchParams.get("creation_time.lt"), "2026-02-01");
  assertEquals(url.searchParams.get("starting_time.gt"), "2026-01-01");
  assertEquals(url.searchParams.get("starting_time.lt"), "2026-02-01");
  assertEquals(url.searchParams.get("last_updated_time.gt"), "2026-01-01");
  assertEquals(url.searchParams.get("last_updated_time.lt"), "2026-02-01");
  assertEquals(url.searchParams.get("expand"), "owner,contact");
  assertEquals(url.searchParams.get("before"), "BKNG-A");
  assertEquals(url.searchParams.get("after"), "BKNG-B");
  assertEquals(url.searchParams.get("limit"), "25");
});

Deno.test("booking-list: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("status"), false);
  assertEquals(url.searchParams.has("booking_calendar"), false);
});
