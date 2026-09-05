import { assertEquals } from "@std/assert";
import leadNoteCreate from "../../actions/lead-note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-note-create: POSTs {note} to /leads/{leadId}/notes", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await leadNoteCreate.execute({ leadId: 7, note: "Called, left voicemail" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/7/notes");
  assertEquals(JSON.parse(calls[0].body!), { note: "Called, left voicemail" });
});
