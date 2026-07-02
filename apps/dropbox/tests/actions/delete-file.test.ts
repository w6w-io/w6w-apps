import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-file.ts";

Deno.test("delete-file: POSTs /files/delete_v2 with the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { id: "id:x" } } }]);
  await action.execute!({ path: "/gone.txt" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/delete_v2");
  assertEquals(calls[0].method, "POST");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.path, "/gone.txt");
});
