import { assertEquals } from "@std/assert";
import mediaStatusGet from "../../actions/media-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-status-get: fetches the media's processing status", async () => {
  const { ctx, calls } = mockCtx([{
    body: { media_id: "id", file_name: "photo.jpg", status: "ready" },
  }]);
  const out = await mediaStatusGet.execute(
    { socialSetId: 4, mediaId: "id" },
    ctx,
  ) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/media/id");
  assertEquals(out.status, "ready");
});
