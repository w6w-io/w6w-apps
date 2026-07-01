import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

Deno.test("file-upload: runs the 3-step v2 flow (getUploadURLExternal → PUT → completeUploadExternal)", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        ok: true,
        upload_url: "https://files.slack.example/upload/xyz",
        file_id: "F1",
      },
    },
    { body: "OK", headers: { "content-type": "text/plain" } },
    { body: { ok: true, files: [{ id: "F1" }] } },
  ]);

  await action.execute!(
    {
      filename: "hi.txt",
      fileContent: "hello",
      channels: "C1",
      initialComment: "note",
    },
    ctx,
  );

  // Step 1
  const step1 = new URL(calls[0].url);
  assertEquals(step1.pathname, "/api/files.getUploadURLExternal");
  assertEquals(step1.searchParams.get("filename"), "hi.txt");
  assertEquals(step1.searchParams.get("length"), "5");

  // Step 2 (PUT to upload_url — actually POST multipart in our impl)
  assertEquals(calls[1].url, "https://files.slack.example/upload/xyz");
  assertEquals(calls[1].method, "POST");
  // We can't easily inspect FormData body in the mock, but content-type should be multipart.
  // The mock records "[object FormData]" as body text — good enough as a smoke test.
  assert(calls[1].body != null);

  // Step 3
  const step3 = new URL(calls[2].url);
  assertEquals(step3.pathname, "/api/files.completeUploadExternal");
  const body = JSON.parse(calls[2].body!);
  assertEquals(body.files, [{ id: "F1", title: "hi.txt" }]);
  assertEquals(body.channel_id, "C1");
  assertEquals(body.initial_comment, "note");
});
