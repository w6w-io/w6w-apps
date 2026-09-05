import { assertEquals } from "@std/assert";
import fileUpload from "../../actions/file-upload.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("file-upload: posts filename to /v2/file.upload and returns the presigned URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      file: { id: "f1", filename: "report.pdf", status: "pending", created_at: 1 },
      upload_url: "https://s3.example.com/presigned",
      upload_expires_at: 1000,
    }),
  }]);
  const out = await fileUpload.execute({ filename: "report.pdf" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/file.upload");
  assertEquals(JSON.parse(calls[0].body!), { filename: "report.pdf" });
  assertEquals(out.upload_url, "https://s3.example.com/presigned");
  assertEquals(out.file.id, "f1");
});

Deno.test("file-upload: is not idempotent — every call creates a new file record", () => {
  assertEquals(fileUpload.idempotent, false);
});
