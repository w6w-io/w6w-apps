import { assertEquals } from "@std/assert";
import jobActivityCreate from "../../actions/jobactivity-create.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("jobactivity-create: POSTs to /jobactivity.json with 0/1 for the boolean flag", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "a1" } }]);
  const out = await jobActivityCreate.execute({
    jobUuid: "j1",
    staffUuid: "s1",
    startDate: "2026-09-01 09:00:00",
    endDate: "2026-09-01 11:00:00",
    activityWasScheduled: true,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api_1.0/jobactivity.json");
  assertEquals(bodyOf(calls[0]), {
    job_uuid: "j1",
    staff_uuid: "s1",
    start_date: "2026-09-01 09:00:00",
    end_date: "2026-09-01 11:00:00",
    activity_was_scheduled: "1",
  });
  assertEquals(out, { uuid: "a1" });
});

Deno.test("jobactivity-create: none of its fields are marked required by the schema", () => {
  for (const p of jobActivityCreate.params ?? []) {
    assertEquals(p.required ?? false, false, `${p.key}: unexpectedly required`);
  }
});
