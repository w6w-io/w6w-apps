import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: joins multiple ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "1" }, { id: "2" }]) },
  ]);
  const out = await taskGet.execute({ taskIds: ["1", "2"] }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/1,2");
  assertEquals(out.items.length, 2);
});

Deno.test("task-get: accepts a single comma-separated string too", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "1" }]) }]);
  await taskGet.execute({ taskIds: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/1");
});
