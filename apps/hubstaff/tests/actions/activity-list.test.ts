import { assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

Deno.test("activity-list: GETs the organization's activity blocks", async () => {
  const body = listEnvelope("activities", [{
    id: 1,
    tracked: 600,
    time_slot: "2026-09-22T09:00:00Z",
  }], 2);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 13 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/activities");
  assertEquals(result.activities[0].tracked, 600);
  assertEquals(result.pagination, { next_page_start_id: 2 });
});

Deno.test("activity-list: the time window, filters and time_zone all serialize", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("activities", []) }]);
  await action.execute!({
    organization_id: 13,
    time_slot_start: "2026-09-21T00:00:00Z",
    time_slot_stop: "2026-09-22T00:00:00Z",
    user_ids: "1,2",
    project_ids: "3",
    task_ids: "4",
    time_zone: "Europe/London",
    include: "users,projects,tasks",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    "time_slot[start]": "2026-09-21T00:00:00Z",
    "time_slot[stop]": "2026-09-22T00:00:00Z",
    user_ids: "1,2",
    project_ids: "3",
    task_ids: "4",
    time_zone: "Europe/London",
    include: "users,projects,tasks",
  });
});

/** The stop bound is exclusive — the hint has to say so or the window double-counts. */
Deno.test("activity-list: documents the exclusive stop bound", () => {
  const stop = action.params!.find((p) => p.key === "time_slot_stop")!;
  assertEquals(stop.hint!.includes("exclusive"), true);
});
