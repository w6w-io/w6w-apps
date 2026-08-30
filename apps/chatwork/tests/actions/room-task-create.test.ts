import { assertEquals } from "@std/assert";
import roomTaskCreate from "../../actions/room-task-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-task-create: posts body, to_ids and the deadline fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { task_ids: [1, 3, 6] } }]);
  const out = await roomTaskCreate.execute({
    roomId: "5",
    body: "Buy milk",
    toIds: "1,3,6",
    limit: 1385996399,
    limitType: "time",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(formOf(calls[0]), {
    body: "Buy milk",
    to_ids: "1,3,6",
    limit: "1385996399",
    limit_type: "time",
  });
  assertEquals(out, { task_ids: [1, 3, 6] });
});

Deno.test("room-task-create: one task ID comes back per assignee — response is plural", () => {
  const output = roomTaskCreate.output;
  const field = Array.isArray(output) ? output.find((o) => o.key === "task_ids") : undefined;
  assertEquals(field?.type, "array");
});

Deno.test("room-task-create: is not idempotent — retrying creates duplicate tasks", () => {
  assertEquals(roomTaskCreate.idempotent, false);
});
