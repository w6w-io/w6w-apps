import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-folder.ts";

Deno.test("delete-folder: POSTs /files/delete_v2 with the folder path", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { id: "id:f" } } }]);
  await action.execute!({ path: "/invoices/2026" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2/files/delete_v2");
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.path, "/invoices/2026");
});
