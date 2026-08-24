import { assertEquals } from "@std/assert";
import videoGet from "../../actions/video-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-get: fetches by id and returns the video unwrapped", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "v1",
        status: "completed",
        video_url: "https://files.heygen.ai/v1.mp4",
      }),
    },
  ]);
  const out = await videoGet.execute({ videoId: "v1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out, { id: "v1", status: "completed", video_url: "https://files.heygen.ai/v1.mp4" });
});

Deno.test("video-get: URL-encodes the video id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v/1", status: "pending" }) }]);
  await videoGet.execute({ videoId: "v/1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/videos/v%2F1");
});
