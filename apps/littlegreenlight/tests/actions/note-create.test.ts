import { assertEquals } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-create: POSTs to /api/v1/constituents/{id}/notes.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, text: "Called donor" } }]);
  await noteCreate.execute(
    { constituent_id: 7, text: "Called donor", original_date: "2026-01-01" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/7/notes.json");
  assertEquals(calls[0].method, "POST");
});

Deno.test("note-create: sends only the required + set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await noteCreate.execute(
    { constituent_id: 7, text: "Called donor", original_date: "2026-01-01" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { text: "Called donor", original_date: "2026-01-01" });
});

Deno.test("note-create: an optional note_type_name is included when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await noteCreate.execute(
    {
      constituent_id: 7,
      text: "Called donor",
      original_date: "2026-01-01",
      note_type_name: "Phone Call",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.note_type_name, "Phone Call");
});
