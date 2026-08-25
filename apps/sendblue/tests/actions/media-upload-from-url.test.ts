import { assertEquals } from "@std/assert";
import mediaUploadFromUrl from "../../actions/media-upload-from-url.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-upload-from-url: POSTs to /api/upload-media-object", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", mediaObjectId: "abc" } }]);
  const out = await mediaUploadFromUrl.execute(
    { mediaUrl: "https://example.com/a.jpg" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/upload-media-object");
  assertEquals(jsonBodyOf(calls[0]), { media_url: "https://example.com/a.jpg" });
  assertEquals(out.mediaObjectId, "abc");
});
