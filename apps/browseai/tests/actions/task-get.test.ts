import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf, resultEnvelope } from "../_helpers.ts";

Deno.test("task-get: GETs /robots/{robotId}/tasks/{taskId} and unwraps result", async () => {
  const task = { id: "t1", status: "successful", robotId: "r1", createdAt: 1 };
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(task) }]);
  const out = await taskGet.execute({ robotId: "r1", taskId: "t1" }, ctx) as typeof task;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/tasks/t1");
  assertEquals(out.status, "successful");
});

Deno.test("task-get: surfaces capturedTexts/capturedLists/capturedScreenshots verbatim", async () => {
  const task = {
    id: "t1",
    capturedTexts: { title: "Hello" },
    capturedLists: { rows: [{ a: 1 }] },
    capturedScreenshots: {},
  };
  const { ctx } = mockCtx([{ status: 200, body: resultEnvelope(task) }]);
  const out = await taskGet.execute({ robotId: "r1", taskId: "t1" }, ctx);
  assertEquals(out.capturedTexts, { title: "Hello" });
  assertEquals(out.capturedLists, { rows: [{ a: 1 }] });
});
