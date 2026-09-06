import { assertEquals } from "@std/assert";
import uploadComplete from "../../actions/upload-complete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("upload-complete: POSTs to /apps/{appId}/uploads/{uploadId}/complete", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ url: "https://cdn.glideapps.com/x.png" }) }]);
  const out = await uploadComplete.execute({ appId: "app1", uploadId: "upload-123" }, ctx);

  assertEquals(pathOf(calls[0].url), "/apps/app1/uploads/upload-123/complete");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { url: "https://cdn.glideapps.com/x.png" });
});
