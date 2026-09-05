import { assertEquals } from "@std/assert";
import createNote from "../../actions/create-note.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-note: POSTs /v1/notes attached to a Matter", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: item("1", "note", { name: "New Note", body: "An important thing to remember" }),
  }]);
  const out = await createNote.execute({
    name: "New Note",
    body: "An important thing to remember",
    notableType: "Prospect",
    notableId: "74",
  }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "New Note",
    body: "An important thing to remember",
    notable_type: "Prospect",
    notable_id: "74",
  });
  assertEquals(out.id, "1");
});

Deno.test("create-note: composes with a Contact just as well as a Matter", async () => {
  const { ctx, calls } = mockCtx([{ body: item("2", "note", {}) }]);
  await createNote.execute({
    name: "Called",
    body: "Left a voicemail",
    notableType: "Contact",
    notableId: "136",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.notable_type, "Contact");
  assertEquals(body.notable_id, "136");
});

Deno.test("create-note: is marked non-idempotent", () => {
  assertEquals(createNote.idempotent, false);
});
