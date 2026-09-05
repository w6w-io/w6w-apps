import { assertEquals } from "@std/assert";
import notesDelete from "../../actions/notes-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("notes-delete: DELETEs /notes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await notesDelete.execute({ noteId: 22984 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/notes/22984");
  assertEquals(out, { success: true });
});
