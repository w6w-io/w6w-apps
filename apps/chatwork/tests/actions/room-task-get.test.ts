import { assertEquals } from "@std/assert";
import roomTaskGet from "../../actions/room-task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-task-get: calls GET /rooms/{room_id}/tasks/{task_id}", async () => {
  const task = { task_id: 3, body: "Buy milk", status: "open", limit_type: "none" };
  const { ctx, calls } = mockCtx([{ body: task }]);
  const out = await roomTaskGet.execute({ roomId: "5", taskId: 3 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/tasks/3");
  assertEquals(out, task);
});
