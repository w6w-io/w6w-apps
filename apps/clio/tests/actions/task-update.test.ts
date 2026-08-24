import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PATCHes /tasks/{id}.json with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 4, status: "complete" }) }]);
  await taskUpdate.execute({ id: 4, status: "complete" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/4.json");
  assertEquals(JSON.parse(calls[0].body!), { data: { status: "complete" } });
});
