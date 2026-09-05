import { assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("task-delete: posts task_id to /v2/task.delete", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ id: "t1", deleted: true }) }]);
  const out = await taskDelete.execute({ taskId: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/task.delete");
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1" });
  assertEquals(out, { ok: true, request_id: "req_test0000000000", id: "t1", deleted: true });
});

Deno.test("task-delete: is idempotent", () => {
  assertEquals(taskDelete.idempotent, true);
});
