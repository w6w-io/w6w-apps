import { assert, assertEquals } from "@std/assert";
import mediaUploadCreate from "../../actions/media-upload-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-upload-create: posts the file name and returns media_id + upload_url", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      media_id: "550e8400-e29b-41d4-a716-446655440000",
      upload_url: "https://s3.amazonaws.com/bucket/x",
    },
  }]);
  const out = await mediaUploadCreate.execute(
    { socialSetId: 4, fileName: "photo.jpg" },
    ctx,
  ) as { media_id: string; upload_url: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/media/upload");
  assertEquals(JSON.parse(calls[0].body!), { file_name: "photo.jpg" });
  assertEquals(out.media_id, "550e8400-e29b-41d4-a716-446655440000");
  assertEquals(out.upload_url, "https://s3.amazonaws.com/bucket/x");
});

Deno.test("media-upload-create: does not itself attempt any second request to upload_url", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { media_id: "id", upload_url: "https://s3.amazonaws.com/bucket/x" },
  }]);
  await mediaUploadCreate.execute({ socialSetId: 4, fileName: "photo.jpg" }, ctx);
  assertEquals(calls.length, 1, "the action must make exactly one request, not a PUT as well");
});

Deno.test("media-upload-create: the file name pattern rejects a disallowed extension", () => {
  const fileNameParam = mediaUploadCreate.params?.find((p) => p.key === "fileName");
  const re = new RegExp(fileNameParam!.validation!.pattern!);
  assert(re.test("photo.jpg"));
  assert(!re.test("script.exe"));
});
