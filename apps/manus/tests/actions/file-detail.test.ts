import { assertEquals } from "@std/assert";
import fileDetail from "../../actions/file-detail.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("file-detail: gets /v2/file.detail with file_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ file: { id: "f1", status: "uploaded", created_at: 1, bytes: 100 } }),
  }]);
  const out = await fileDetail.execute({ fileId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/file.detail");
  assertEquals(queryOf(calls[0].url), { file_id: "f1" });
  assertEquals(out.status, "uploaded");
});
