import { assertEquals } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("note-create: POSTs to /note.json", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "n1" } }]);
  const out = await noteCreate.execute({
    relatedObject: "job",
    relatedObjectUuid: "j1",
    note: "Called client to confirm access.",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api_1.0/note.json");
  assertEquals(bodyOf(calls[0]), {
    related_object: "job",
    related_object_uuid: "j1",
    note: "Called client to confirm access.",
  });
  assertEquals(out, { uuid: "n1" });
});
