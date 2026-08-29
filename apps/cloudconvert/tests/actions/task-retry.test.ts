import { assertEquals } from "@std/assert";
import taskRetry from "../../actions/task-retry.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-retry: POSTs /v2/tasks/{id}/retry and returns the new task", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ id: "t2", status: "waiting" }),
  }]);
  const out = await taskRetry.execute({ taskId: "t1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/t1/retry");
  assertEquals(out.id, "t2");
});

Deno.test("task-retry: is declared non-idempotent — every call creates a new task", () => {
  assertEquals(taskRetry.idempotent, false);
});
