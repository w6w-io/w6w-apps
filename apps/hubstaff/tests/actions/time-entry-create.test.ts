import { assert, assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/time-entry-create.ts";

Deno.test("time-entry-create: POSTs the required trio to /v2/users/{user_id}/time_entries", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true } }]);
  const result = await action.execute!({
    user_id: 651956,
    project_id: 841201,
    start_time: "2026-09-22T09:00:00Z",
    tracked: 3600,
  }, ctx) as { success: boolean };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/users/651956/time_entries");
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: 841201,
    start_time: "2026-09-22T09:00:00Z",
    tracked: 3600,
  });
  assertEquals(result.success, true);
});

Deno.test("time-entry-create: billable=false is sent rather than dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { success: true } }]);
  await action.execute!({
    user_id: 1,
    project_id: 2,
    start_time: "2026-09-22T09:00:00Z",
    tracked: 60,
    billable: false,
    note: "reason",
    task_id: 3,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: 2,
    start_time: "2026-09-22T09:00:00Z",
    tracked: 60,
    billable: false,
    note: "reason",
    task_id: 3,
  });
});

Deno.test("time-entry-create: documents that v2 has no read for time entries", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.resource, "time-entry");
  for (const key of ["user_id", "project_id", "start_time", "tracked"]) {
    assert(action.params!.some((p) => p.key === key && p.required === true), key);
  }
});
