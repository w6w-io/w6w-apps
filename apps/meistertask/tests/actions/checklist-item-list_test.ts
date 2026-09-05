import { assertEquals } from "@std/assert";
import checklistItemList from "../../actions/checklist-item-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-item-list: GET /checklists/:checklist_id/checklist_items", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 27, name: "First item" }] }]);
  const out = await checklistItemList.execute({ checklistId: 9 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklists/9/checklist_items");
  assertEquals(out, [{ id: 27, name: "First item" }]);
});
