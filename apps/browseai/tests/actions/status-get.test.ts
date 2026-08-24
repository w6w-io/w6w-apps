import { assertEquals } from "@std/assert";
import statusGet from "../../actions/status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("status-get: GETs /status and returns tasksQueueStatus", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { statusCode: 200, messageCode: "success", tasksQueueStatus: "OK" },
  }]);
  const out = await statusGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/status");
  assertEquals(out, { tasksQueueStatus: "OK" });
});

Deno.test("status-get: reports UNDER_MAINTENANCE verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { statusCode: 200, messageCode: "success", tasksQueueStatus: "UNDER_MAINTENANCE" },
  }]);
  const out = await statusGet.execute({}, ctx);
  assertEquals(out, { tasksQueueStatus: "UNDER_MAINTENANCE" });
});

Deno.test("status-get: requires auth like every other endpoint (no requiresAuth: false)", () => {
  assertEquals(statusGet.requiresAuth, undefined);
});
