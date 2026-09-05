import { assertEquals } from "@std/assert";
import checklistUpdate from "../../actions/checklist-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checklist-update: PUT /checklists/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2, name: "Renamed" } }]);
  const out = await checklistUpdate.execute({ id: 2, name: "Renamed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/checklists/2");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(out, { id: 2, name: "Renamed" });
});
