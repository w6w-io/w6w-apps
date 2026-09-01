import { assertEquals } from "@std/assert";
import leadNoteCreate from "../../actions/lead-note-create.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-note-create: metadata — not idempotent, appends", () => {
  assertEquals(leadNoteCreate.type, "perform");
  assertEquals(leadNoteCreate.idempotent, false);
});

Deno.test("lead-note-create: POST /leads/{leadId}/notes with {title, desc}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Created", "note-1") }]);
  const result = asMutation(
    await leadNoteCreate.execute({
      leadId: "l1",
      title: "New note",
      desc: "this note is a reminder",
    }, ctx),
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "New note",
    desc: "this note is a reminder",
  });
  assertEquals(result.id, "note-1");
});

Deno.test("lead-note-create: desc is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Created", "note-1") }]);
  await leadNoteCreate.execute({ leadId: "l1", title: "Just a title" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "Just a title" });
});
