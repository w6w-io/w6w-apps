import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PUTs /tasks/{id} — e.g. marking a task completed", async () => {
  const { ctx, calls } = mockCtx([{ body: { task: { id: 530, status: "COMPLETED" } } }]);
  const out = await action.execute({ taskId: 530, status: "COMPLETED" }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/tasks/530");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { task: { status: "COMPLETED" } });
  assertEquals(out, { task: { id: 530, status: "COMPLETED" } });
});
