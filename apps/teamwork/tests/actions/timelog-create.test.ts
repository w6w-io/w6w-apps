import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/timelog-create.ts";

Deno.test("timelog-create: POSTs /projects/api/v3/tasks/{id}/time.json, wrapped in `timelog`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: { id: "1", STATUS: "OK" } }]);
  await action.execute({ taskId: 9, date: "2026-08-30", hours: 2 }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/tasks/9/time.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    timelog: { date: "2026-08-30", hours: 2, minutes: 0 },
  });
});
