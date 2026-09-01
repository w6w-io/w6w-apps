import { assertEquals } from "@std/assert";
import noteGet from "../../actions/note-get.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-get: fetches /v2/notes/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, content: "hi" }) }]);
  const out = await noteGet.execute({ id: 1 }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/notes/1");
  assertEquals(out.content, "hi");
});
