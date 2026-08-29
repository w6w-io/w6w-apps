import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs /tasks with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!(
    { subject: "Follow up", personId: 8, taskType: "call", dueDate: "2026-09-01" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Follow up");
  assertEquals(body.person_id, 8);
  assertEquals(body.task_type, "call");
  assertEquals(body.due_date, "2026-09-01");
  assertEquals(result, { data: { id: 1 } });
});
