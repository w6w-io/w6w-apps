import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/copy-file.ts";

Deno.test("copy-file: POSTs /files/copy_v2 with from_path and to_path", async () => {
  const body = { metadata: { id: "id:copied" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { fromPath: "/src/a.txt", toPath: "/dst/a.txt" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/copy_v2");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.from_path, "/src/a.txt");
  assertEquals(payload.to_path, "/dst/a.txt");
  assertEquals(payload.autorename, false);
  assertEquals(result, body);
});
