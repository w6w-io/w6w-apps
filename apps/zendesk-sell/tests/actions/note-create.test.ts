import { assertEquals } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-create: posts to /v2/notes with resource_type/resource_id", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await noteCreate.execute({
    resourceType: "lead",
    resourceId: 1,
    content: "Highly important.",
    isImportant: true,
    tags: "premium",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/notes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.meta, { type: "note" });
  assertEquals(body.data.resource_type, "lead");
  assertEquals(body.data.resource_id, 1);
  assertEquals(body.data.is_important, true);
  assertEquals(body.data.tags, ["premium"]);
});
