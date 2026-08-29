import { assertEquals } from "@std/assert";
import taskWait from "../../actions/task-wait.ts";
import { envelope, hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-wait: GETs /v2/tasks/{id} on the SYNC host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "t1", status: "finished" }),
  }]);
  const out = await taskWait.execute({ taskId: "t1" }, ctx) as { status: string };
  assertEquals(hostOf(calls[0].url), "sync.api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/t1");
  assertEquals(out.status, "finished");
});
