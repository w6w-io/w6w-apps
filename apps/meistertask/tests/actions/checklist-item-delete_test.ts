import { assertEquals } from "@std/assert";
import checklistItemDelete from "../../actions/checklist-item-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-item-delete: DELETE /checklist_items/:id returns 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await checklistItemDelete.execute({ id: 12 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklist_items/12");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});
