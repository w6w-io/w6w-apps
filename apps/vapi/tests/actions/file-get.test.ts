import { assertEquals } from "@std/assert";
import fileGet from "../../actions/file-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-get: calls GET /file/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1", name: "notes.txt" } }]);
  const out = await fileGet.execute({ id: "f1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/file/f1");
  assertEquals(out, { id: "f1", name: "notes.txt" });
});
