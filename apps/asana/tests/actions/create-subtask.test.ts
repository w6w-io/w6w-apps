import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-subtask.ts";

Deno.test("create-subtask: POSTs to /tasks/{taskId}/subtasks with name and extras wrapped in { data }", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { gid: "sub-1" } } }]);
  await action.execute({
    taskId: "task-9",
    name: "child",
    notes: "hi",
    liked: true,
    workspace: "ws-1",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/task-9/subtasks");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { data: { name: "child", notes: "hi", liked: true, workspace: "ws-1" } });
});

Deno.test("create-subtask: omits taskId from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ taskId: "task-9", name: "n" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("taskId" in sent.data));
});
