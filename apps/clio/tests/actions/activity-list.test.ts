import { assertEquals } from "@std/assert";
import activityList from "../../actions/activity-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("activity-list: calls GET /activities.json with cursor ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await activityList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/activities.json");
  assertEquals(queryOf(calls[0].url).order, "id(asc)");
});

Deno.test("activity-list: forwards type, matter and date-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await activityList.execute(
    { type: "TimeEntry", matterId: 4, startDate: "2026-08-01", endDate: "2026-08-31" },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.type, "TimeEntry");
  assertEquals(q.matter_id, "4");
  assertEquals(q.start_date, "2026-08-01");
  assertEquals(q.end_date, "2026-08-31");
});
