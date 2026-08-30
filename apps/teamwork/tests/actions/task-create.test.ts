import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs /projects/api/v3/tasklists/{id}/tasks.json, wrapped in `task`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: { task: { id: 1 } } }]);
  await action.execute({ tasklistId: 5, name: "Ship it" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.teamwork.com/projects/api/v3/tasklists/5/tasks.json",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { task: { name: "Ship it" } });
});

Deno.test("task-create: turns comma-separated assignee ids into assignees.userIds", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: {} }]);
  await action.execute({ tasklistId: 5, name: "Ship it", assigneeUserIds: "1, 2" }, ctx);
  const body = JSON.parse(calls[0].body!).task;
  assertEquals(body.assignees, { userIds: [1, 2] });
});
