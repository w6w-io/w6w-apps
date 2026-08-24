import { assertEquals } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("note-list: calls GET /notes.json", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await noteList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/notes.json");
});

Deno.test("note-list: forwards matter, contact and type filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await noteList.execute({ matterId: 1, contactId: 2, type: "Matter" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.matter_id, "1");
  assertEquals(q.contact_id, "2");
  assertEquals(q.type, "Matter");
});
