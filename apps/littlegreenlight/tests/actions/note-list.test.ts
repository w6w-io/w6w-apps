import { assertEquals } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-list: hits /api/v1/constituents/{id}/notes.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, text: "Called donor" }]) }]);
  const out = await noteList.execute({ constituent_id: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/7/notes.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});
