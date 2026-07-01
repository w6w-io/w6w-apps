import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

Deno.test("file-get: GETs /files/{id} with default fields=*", async () => {
  const body = { id: "f-1", name: "Report" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ fileId: "f-1" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files/f-1");
  assertEquals(url.searchParams.get("fields"), "*");
  assertEquals(url.searchParams.get("supportsAllDrives"), "true");
  assertEquals(result, body);
});
