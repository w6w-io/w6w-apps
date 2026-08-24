import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: calls GET /tasks/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 4, name: "Draft complaint" }) }]);
  const out = await taskGet.execute({ id: 4 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/4.json");
  assertEquals(out.name, "Draft complaint");
});
