import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: lists tasks and forwards status/title filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [{ task_id: 1 }] } }]);
  const out = await taskList.execute(
    { projectId: "p1", filterTitle: "Voicemail", filterStatuses: ["created", "queued"], limit: 50 },
    ctx,
  ) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/tasks");
  assertEquals(queryOf(calls[0].url), {
    filter_title: "Voicemail",
    filter_statuses: "created,queued",
    limit: "50",
  });
  assertEquals(out.items, [{ task_id: 1 }]);
});
