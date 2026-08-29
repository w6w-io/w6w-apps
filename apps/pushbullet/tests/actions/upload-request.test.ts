import { assertEquals } from "@std/assert";
import uploadRequest from "../../actions/upload-request.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upload-request: POSTs to /v2/upload-request and maps the response", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        file_name: "cat.jpg",
        file_type: "image/jpeg",
        file_url: "https://dl.pushbulletusercontent.com/x/cat.jpg",
        upload_url: "https://upload.pushbullet.com/upload-legacy/abc",
      },
    },
  ]);
  const out = await uploadRequest.execute({ fileName: "cat.jpg", fileType: "image/jpeg" }, ctx) as {
    uploadUrl: string;
    fileUrl: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/upload-request");
  assertEquals(JSON.parse(calls[0].body!), { file_name: "cat.jpg", file_type: "image/jpeg" });
  assertEquals(out.uploadUrl, "https://upload.pushbullet.com/upload-legacy/abc");
  assertEquals(out.fileUrl, "https://dl.pushbulletusercontent.com/x/cat.jpg");
});

Deno.test("upload-request: this action only requests the URL — it never uploads bytes itself", async () => {
  const src = await Deno.readTextFile(new URL("../../actions/upload-request.ts", import.meta.url));
  // No second host is ever called from this action — a dynamic upload host is
  // deliberately left to the workflow's own HTTP step.
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "");
  assertEquals(/ctx\.fetch/.test(codeOnly), false, "action calls ctx.fetch directly");
});

Deno.test("upload-request: is declared non-idempotent", () => {
  assertEquals(uploadRequest.idempotent, false);
});
