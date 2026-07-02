import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/copy-folder.ts";

Deno.test("copy-folder: POSTs /files/copy_v2 with from_path/to_path", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { id: "id:cp" } } }]);
  await action.execute!({ fromPath: "/a", toPath: "/b", autorename: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/copy_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.from_path, "/a");
  assertEquals(payload.to_path, "/b");
  assertEquals(payload.autorename, true);
});
