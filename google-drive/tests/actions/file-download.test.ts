import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-download.ts";

Deno.test("file-download: fetches metadata then media, returns base64 body", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "report.pdf", mimeType: "application/pdf" } },
    {
      body: "abc",
      headers: { "content-type": "application/pdf" },
    },
  ]);
  const result = await action.execute!({ fileId: "file-1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/files/file-1");
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "name,mimeType");

  const mediaUrl = new URL(calls[1].url);
  assertEquals(mediaUrl.pathname, "/drive/v3/files/file-1");
  assertEquals(mediaUrl.searchParams.get("alt"), "media");

  assertEquals(result.name, "report.pdf");
  assertEquals(result.mimeType, "application/pdf");
  assertEquals(result.size, 3);
  assertEquals(result.data, btoa("abc"));
});
