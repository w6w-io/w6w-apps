import { assertEquals } from "@std/assert";
import toolCreateVideoSlideshow from "../../actions/tool-create-video-slideshow.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-create-video-slideshow: POST /tools/create_video_slideshow", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: { uid: "j1", tool: "create_video_slideshow" } },
  ]);
  await toolCreateVideoSlideshow.execute(
    { imageUrls: "https://x/1.jpg\nhttps://x/2.jpg", slideDuration: 4 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/create_video_slideshow");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.image_urls, ["https://x/1.jpg", "https://x/2.jpg"]);
  assertEquals(body.slide_duration, 4);
});

Deno.test("tool-create-video-slideshow: requires at least 2 image URLs", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolCreateVideoSlideshow.execute({ imageUrls: "https://x/1.jpg" }, ctx)
  );
});
