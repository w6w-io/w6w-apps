import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-export-file.ts";

Deno.test("get-export-file: GETs .../file and base64-encodes the raw response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "%PDF-1.4 fake",
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await action.execute({ reportId: "r1", exportId: "exp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/reports/r1/exports/exp1/file");
  assertEquals(out.contentType, "application/pdf");
  assertEquals(atob(out.content), "%PDF-1.4 fake");
});

Deno.test("get-export-file: workspace-scoped path when Workspace ID is set", async () => {
  const { ctx, calls } = mockCtx([{ body: "x", headers: { "content-type": "text/plain" } }]);
  await action.execute({ groupId: "w1", reportId: "r1", exportId: "exp1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/myorg/groups/w1/reports/r1/exports/exp1/file",
  );
});

Deno.test("get-export-file: never decodes the response as JSON — a binary body would throw if it tried", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "\x00\x01binary\xffcontent",
    headers: { "content-type": "application/octet-stream" },
  }]);
  const out = await action.execute({ reportId: "r1", exportId: "exp1" }, ctx);
  assertEquals(typeof out.content, "string");
});
