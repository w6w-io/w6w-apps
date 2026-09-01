import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/timeslip-create.ts";

Deno.test("timeslip-create: POSTs /timeslips with task/user/project as full resource URLs", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { timeslip: { url: "x" } } }]);
  await action.execute({
    taskId: "2",
    userId: "1",
    projectId: "3",
    datedOn: "2026-08-15",
    hours: 1.5,
    comment: "Client call",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.timeslip.task, "https://api.freeagent.com/v2/tasks/2");
  assertEquals(body.timeslip.user, "https://api.freeagent.com/v2/users/1");
  assertEquals(body.timeslip.project, "https://api.freeagent.com/v2/projects/3");
  assertEquals(body.timeslip.dated_on, "2026-08-15");
  assertEquals(body.timeslip.hours, 1.5);
  assertEquals(body.timeslip.comment, "Client call");
});
