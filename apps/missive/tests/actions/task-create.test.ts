import { assertEquals } from "@std/assert";
import action from "../../actions/task-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: standalone task with team", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: { id: "t1" } } }]);
  const out = await action.execute(
    { title: "Review PR", organization: "org-1", team: "team-1", dueAt: 100 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tasks.title, "Review PR");
  assertEquals(body.tasks.team, "team-1");
  assertEquals(out, { id: "t1" });
});

Deno.test("task-create: standalone task requires team or assignees", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ title: "x", organization: "org-1" }, ctx));
});

Deno.test("task-create: subtask requires conversation or references", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ title: "x", subtask: true }, ctx));
});

Deno.test("task-create: requires title", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ title: "", team: "t1" }, ctx));
});
