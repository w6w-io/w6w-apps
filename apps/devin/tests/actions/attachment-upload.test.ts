import { assert, assertEquals, assertRejects } from "@std/assert";
import attachmentUpload from "../../actions/attachment-upload.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("attachment-upload: POSTs multipart/form-data to /attachments", async () => {
  const { ctx, calls } = mockCtx([{
    body: { attachment_id: "att-1", name: "a.txt", url: "https://api.devin.ai/attachment/att-1" },
  }]);
  const file = new Blob(["hello"], { type: "text/plain" });
  const out = await attachmentUpload.execute({ file }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/attachments`);
  // multipart bodies are not JSON — this app never hand-builds that boundary itself.
  assert(calls[0].body?.includes("FormData"), calls[0].body ?? "");
  assertEquals(out.attachment_id, "att-1");
  assertEquals(out.url, "https://api.devin.ai/attachment/att-1");
});

Deno.test("attachment-upload: surfaces a Devin error on a failed upload", async () => {
  const { ctx } = mockCtx([{ status: 422, body: "file too large" }]);
  const file = new Blob(["x"]);
  await assertRejects(() => Promise.resolve(attachmentUpload.execute({ file }, ctx)));
});
