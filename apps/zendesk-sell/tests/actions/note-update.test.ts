import { assertEquals } from "@std/assert";
import noteUpdate from "../../actions/note-update.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-update: PUTs the content only", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await noteUpdate.execute({ id: 1, content: "Assign to Tom." }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/notes/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { content: "Assign to Tom." });
});
