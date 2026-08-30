import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PUTs /v1/tasks/{taskId} with title/description", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "2" } },
  }]);
  await taskUpdate.execute({ taskId: "TK1", title: "New title", description: "New desc" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { title: "New title", description: "New desc" });
});

Deno.test("task-update: is an idempotent perform action", () => {
  assertEquals(taskUpdate.type, "perform");
  assertEquals(taskUpdate.idempotent, true);
});
