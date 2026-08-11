import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: calls GET /v2/actor-tasks/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "t1", actId: "a1" }) }]);
  const out = await taskGet.execute({ taskId: "t1" }, ctx) as { actId: string };

  assertEquals(pathOf(calls[0].url), "/v2/actor-tasks/t1");
  assertEquals(out.actId, "a1");
});

Deno.test("task-get: the tilde-separated form survives escaping", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await taskGet.execute({ taskId: "me~nightly-crawl" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/actor-tasks/me~nightly-crawl");
});
