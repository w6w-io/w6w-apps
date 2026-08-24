import { assertEquals } from "@std/assert";
import queue from "../../health/queue.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("queue: reports ok when tasksQueueStatus is OK", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { statusCode: 200, messageCode: "success", tasksQueueStatus: "OK" },
  }]);
  const out = await queue.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/status");
  assertEquals(out.state, "ok");
});

Deno.test("queue: reports degraded, not down, when under maintenance", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { statusCode: 200, messageCode: "success", tasksQueueStatus: "UNDER_MAINTENANCE" },
  }]);
  const out = await queue.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("queue: an auth failure reports unknown rather than re-litigating credential state", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { statusCode: 401, messageCode: "unauthorized" },
  }]);
  const out = await queue.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("queue: is signed and connection-scoped, since /v2/status requires a credential", () => {
  assertEquals(queue.credential, "signed");
  assertEquals(queue.scope, "connection");
  assertEquals(queue.kind, "dependency");
});
