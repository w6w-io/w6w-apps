import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-retrieve.ts";

Deno.test("files-retrieve: GETs /files/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "file-1", filename: "x.jsonl" } }]);
  const result = await action.execute!({ fileId: "file-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files/file-1");
  assertEquals(result, { id: "file-1", filename: "x.jsonl" });
});
