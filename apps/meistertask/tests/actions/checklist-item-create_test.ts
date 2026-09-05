import { assertEquals } from "@std/assert";
import checklistItemCreate from "../../actions/checklist-item-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test(
  "checklist-item-create: POST /checklists/:checklist_id/checklist_items " +
    "(the conventional path, not the vendor's misfiled spec)",
  async () => {
    const { ctx, calls } = mockCtx([{ status: 200, body: { id: 28, name: "My Checklist Item" } }]);
    const out = await checklistItemCreate.execute(
      { checklistId: 6, name: "My Checklist Item" },
      ctx,
    );
    assertEquals(pathOf(calls[0].url), "/api/checklists/6/checklist_items");
    assertEquals(calls[0].method, "POST");
    assertEquals(JSON.parse(calls[0].body!), { name: "My Checklist Item" });
    assertEquals(out, { id: 28, name: "My Checklist Item" });
  },
);
