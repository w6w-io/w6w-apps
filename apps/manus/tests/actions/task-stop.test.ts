import { assertEquals } from "@std/assert";
import taskStop from "../../actions/task-stop.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("task-stop: posts task_id to /v2/task.stop", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({}) }]);
  await taskStop.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/task.stop");
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1" });
});

Deno.test("task-stop: is idempotent and declares no output fields", () => {
  assertEquals(taskStop.idempotent, true);
  assertEquals(taskStop.output, []);
});
