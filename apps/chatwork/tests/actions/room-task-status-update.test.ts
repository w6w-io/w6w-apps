import { assertEquals } from "@std/assert";
import roomTaskStatusUpdate from "../../actions/room-task-status-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-task-status-update: PUTs the status and returns the (string-typed) task_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { task_id: "3" } }]);
  const out = await roomTaskStatusUpdate.execute({ roomId: "5", taskId: 3, body: "done" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/tasks/3/status");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { body: "done" });
  assertEquals(out, { task_id: "3" });
});

Deno.test("room-task-status-update: declares its task_id output as a string, matching the vendor quirk", () => {
  const output = roomTaskStatusUpdate.output;
  const field = Array.isArray(output) ? output.find((o) => o.key === "task_id") : undefined;
  assertEquals(field?.type, "string");
});
