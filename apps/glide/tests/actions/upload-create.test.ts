import { assertEquals } from "@std/assert";
import uploadCreate from "../../actions/upload-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upload-create: POSTs contentType/fileName and returns the upload handle", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ uploadID: "upload-123", uploadLocation: "https://storage.example/x" }) },
  ]);
  const out = await uploadCreate.execute({
    appId: "app1",
    contentType: "image/png",
    fileName: "logo.png",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/apps/app1/uploads");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contentType: "image/png", fileName: "logo.png" });
  assertEquals(out, { uploadID: "upload-123", uploadLocation: "https://storage.example/x" });
});
