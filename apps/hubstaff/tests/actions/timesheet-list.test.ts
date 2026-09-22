import { assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/timesheet-list.ts";

Deno.test("timesheet-list: GETs the organization's timesheets", async () => {
  const body = listEnvelope("timesheets", [{ id: 1, status: "submitted", tracked: 14400 }], 6);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 13 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/timesheets");
  assertEquals(result.timesheets[0].tracked, 14400);
  assertEquals(result.pagination, { next_page_start_id: 6 });
});

/**
 * `date[start]`/`date[stop]` bound the period and `approved[start]` selects by
 * approval instant — three bracket keys, independent axes, all sent verbatim.
 */
Deno.test("timesheet-list: the three bracketed date filters go on the wire literally", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("timesheets", []) }]);
  await action.execute!({
    organization_id: 13,
    status: "approved",
    date_start: "2026-09-14",
    date_stop: "2026-09-20",
    approved_start: "2026-09-21T00:00:00Z",
    include: "users",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    status: "approved",
    "date[start]": "2026-09-14",
    "date[stop]": "2026-09-20",
    "approved[start]": "2026-09-21T00:00:00Z",
    include: "users",
  });
});
