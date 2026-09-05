import { assertEquals } from "@std/assert";
import checklistDelete from "../../actions/checklist-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-delete: DELETE /checklists/:id returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await checklistDelete.execute({ id: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklists/2");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
