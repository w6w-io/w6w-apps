import { assertEquals } from "@std/assert";
import checklistCreate from "../../actions/checklist-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-create: POST /tasks/:task_id/checklists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 26, name: "My Checklist" } }]);
  const out = await checklistCreate.execute({ taskId: 15, name: "My Checklist" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/15/checklists");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "My Checklist" });
  assertEquals(out, { id: 26, name: "My Checklist" });
});
