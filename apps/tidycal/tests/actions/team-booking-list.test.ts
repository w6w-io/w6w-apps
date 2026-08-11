import { assertEquals } from "@std/assert";
import teamBookingList from "../../actions/team-booking-list.ts";
import bookingList from "../../actions/booking-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-booking-list: calls GET /api/teams/{id}/bookings with every filter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await teamBookingList.execute(
    {
      team: 4,
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      email: "john@example.com",
      host_id: 12,
      cancelled: false,
      page: 2,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/teams/4/bookings");
  assertEquals(queryOf(calls[0].url), {
    start_date: "2026-01-01",
    end_date: "2026-02-01",
    email: "john@example.com",
    host_id: "12",
    cancelled: "false",
    page: "2",
  });
});

/**
 * The rename, asserted rather than described. TidyCal filters the personal
 * booking list on `starts_at`/`ends_at` and the team booking list on
 * `start_date`/`end_date`; Laravel ignores a query parameter it was not asked
 * about, so mixing them returns an unfiltered list instead of an error — the
 * failure mode a test is the only defence against.
 */
Deno.test("team-booking-list: the two booking lists use different date parameter names", () => {
  const personal = (bookingList.params ?? []).map((p) => p.key);
  const team = (teamBookingList.params ?? []).map((p) => p.key);

  assertEquals(personal.includes("starts_at"), true);
  assertEquals(personal.includes("start_date"), false, "the team spelling leaked into /bookings");
  assertEquals(team.includes("start_date"), true);
  assertEquals(
    team.includes("starts_at"),
    false,
    "the personal spelling leaked into team bookings",
  );
});
