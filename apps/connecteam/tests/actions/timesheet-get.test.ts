import { assertEquals } from "@std/assert";
import timesheetGet from "../../actions/timesheet-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timesheet-get: GETs the timesheet with the required date range and optional filters", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ startDate: "2026-01-01", endDate: "2026-01-31", users: [] }) },
  ]);
  const out = await timesheetGet.execute(
    { timeClockId: 5, startDate: "2026-01-01", endDate: "2026-01-31", isApproved: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/5/timesheet");
  assertEquals(queryOf(calls[0].url), {
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    isApproved: "true",
  });
  assertEquals(out, { startDate: "2026-01-01", endDate: "2026-01-31", users: [] });
});
