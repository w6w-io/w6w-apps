import { assertEquals } from "@std/assert";
import fileUploadFromUrl from "../../actions/file-upload-from-url.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-upload-from-url: posts to /v1/file/upload/url", async () => {
  const { ctx, calls } = mockCtx([{
    body: { url: "https://pdf-temp-files.s3.amazonaws.com/x/a.pdf" },
  }]);
  const out = await fileUploadFromUrl.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/file/upload/url");
  assertEquals(JSON.parse(calls[0].body!).url, "https://example.com/a.pdf");
  assertEquals(out.url, "https://pdf-temp-files.s3.amazonaws.com/x/a.pdf");
});
