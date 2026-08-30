import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PATCHes /projects/api/v3/tasks/{id}.json, wrapped in `task`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { task: { id: 9 } } }]);
  await action.execute({ taskId: 9, status: "completed" }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/tasks/9.json");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { task: { status: "completed" } });
});

Deno.test("task-update: only touches fields that were set", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: {} }]);
  await action.execute({ taskId: 9, progress: 50 }, ctx);
  const body = JSON.parse(calls[0].body!).task;
  assertEquals(body.progress, 50);
  assertEquals("name" in body, false);
  assertEquals("assignees" in body, false);
});
