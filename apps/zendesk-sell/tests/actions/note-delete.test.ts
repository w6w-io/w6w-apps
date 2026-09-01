import { assertEquals } from "@std/assert";
import noteDelete from "../../actions/note-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("note-delete: DELETEs /v2/notes/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await noteDelete.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/notes/1");
  assertEquals(calls[0].method, "DELETE");
});
