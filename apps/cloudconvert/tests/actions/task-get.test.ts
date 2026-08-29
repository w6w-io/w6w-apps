import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { envelope, hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-get: GETs /v2/tasks/{id} on the async host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "t1", status: "finished" }),
  }]);
  const out = await taskGet.execute({ taskId: "t1" }, ctx) as { id: string };
  assertEquals(hostOf(calls[0].url), "api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/tasks/t1");
  assertEquals(out.id, "t1");
});

Deno.test("task-get: passes multiple include values comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await taskGet.execute({ taskId: "t1", include: ["payload", "job"] }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "payload,job" });
});
