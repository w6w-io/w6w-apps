import { assertEquals } from "@std/assert";
import leadNoteUpdate from "../../actions/lead-note-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-note-update: metadata — idempotent", () => {
  assertEquals(leadNoteUpdate.type, "perform");
  assertEquals(leadNoteUpdate.idempotent, true);
});

Deno.test("lead-note-update: PUT /leads/{leadId}/notes with noteId + fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "note-1") }]);
  const result = asMutation(
    await leadNoteUpdate.execute({
      leadId: "l1",
      noteId: "note-1",
      title: "Meeting",
    }, ctx),
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/notes");
  assertEquals(JSON.parse(calls[0].body!), { noteId: "note-1", title: "Meeting" });
  assertEquals(result.info, "Updated");
});
