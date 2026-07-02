import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-file.ts";

Deno.test("move-file: POSTs /files/move_v2 with from_path and to_path", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { id: "id:moved" } } }]);
  await action.execute!(
    { fromPath: "/a.txt", toPath: "/b.txt", autorename: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/move_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.from_path, "/a.txt");
  assertEquals(payload.to_path, "/b.txt");
  assertEquals(payload.autorename, true);
});
