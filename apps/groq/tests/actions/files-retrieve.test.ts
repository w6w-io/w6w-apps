import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-retrieve.ts";

Deno.test("files-retrieve: GETs /openai/v1/files/{id}", async () => {
  const body = { id: "file-1", object: "file", purpose: "batch" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ fileId: "file-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/files/file-1");
  assertEquals(result, body);
});
