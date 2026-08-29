import { assertEquals } from "@std/assert";
import toolResizeVideo from "../../actions/tool-resize-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-resize-video: POST /tools/resize_video", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "resize_video" } }]);
  await toolResizeVideo.execute(
    { videoUrl: "https://x/in.mp4", width: 1080, height: 1920, fit: "cover" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/resize_video");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    width: 1080,
    height: 1920,
    fit: "cover",
  });
});

Deno.test("tool-resize-video: requires width and height", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolResizeVideo.execute({ videoUrl: "https://x/in.mp4" } as never, ctx)
  );
});
