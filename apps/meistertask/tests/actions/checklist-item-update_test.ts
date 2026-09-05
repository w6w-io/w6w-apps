import { assertEquals } from "@std/assert";
import checklistItemUpdate from "../../actions/checklist-item-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-item-update: PUT /checklist_items/:id, status 5 = completed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 12, status: 5 } }]);
  const out = await checklistItemUpdate.execute({ id: 12, status: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklist_items/12");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: 5 });
  assertEquals(out, { id: 12, status: 5 });
});
