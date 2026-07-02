import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file-metadata.ts";

Deno.test("get-file-metadata: POSTs /files/get_metadata with defaults", async () => {
  const meta = { ".tag": "file", id: "id:1", name: "hello.txt" };
  const { ctx, calls } = mockCtx([{ body: meta }]);
  const result = await action.execute!({ path: "/hello.txt" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/get_metadata");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.path, "/hello.txt");
  assertEquals(payload.include_media_info, false);
  assertEquals(payload.include_deleted, false);
  assertEquals(payload.include_has_explicit_shared_members, false);
  assertEquals(result, meta);
});
