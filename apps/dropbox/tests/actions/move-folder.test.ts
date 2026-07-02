import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-folder.ts";

Deno.test("move-folder: POSTs /files/move_v2 with from_path/to_path", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { id: "id:mv" } } }]);
  await action.execute!({ fromPath: "/a", toPath: "/b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/move_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.from_path, "/a");
  assertEquals(payload.to_path, "/b");
});
