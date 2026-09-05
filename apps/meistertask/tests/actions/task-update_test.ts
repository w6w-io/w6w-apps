import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PUT /tasks/:id, e.g. moving between sections", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 15, section_id: 2 } }]);
  const out = await taskUpdate.execute({ id: 15, sectionId: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/15");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { section_id: 2 });
  assertEquals(out, { id: 15, section_id: 2 });
});
