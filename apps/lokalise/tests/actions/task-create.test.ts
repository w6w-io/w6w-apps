import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: sends the required title and languages, omitting unset fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { task_id: 492, title: "Voicemail", status: "created" },
  }]);
  await taskCreate.execute(
    { projectId: "p1", title: "Voicemail", languages: '[{"language_iso":"fi","users":[421]}]' },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Voicemail",
    languages: [{ language_iso: "fi", users: [421] }],
  });
});

Deno.test("task-create: forwards optional keys, due date and auto-close flags", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute(
    {
      projectId: "p1",
      title: "Voicemail",
      languages: "[]",
      keys: "[11212,11241]",
      dueDate: "2024-12-31 12:00:00",
      autoCloseTask: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.keys, [11212, 11241]);
  assertEquals(body.due_date, "2024-12-31 12:00:00");
  assertEquals(body.auto_close_task, true);
});

Deno.test("task-create: is not idempotent", () => {
  assertEquals(taskCreate.idempotent, false);
});
