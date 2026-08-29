import { assertEquals } from "@std/assert";
import toolSubtitleVideo from "../../actions/tool-subtitle-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-subtitle-video: POST /tools/subtitle_video, bold/italic map to on/off strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "subtitle_video" } }]);
  await toolSubtitleVideo.execute(
    { videoUrl: "https://x/in.mp4", language: "en", bold: true, alignment: "2" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/subtitle_video");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.video_url, "https://x/in.mp4");
  assertEquals(body.language, "en");
  assertEquals(body.bold, "on");
  assertEquals(body.alignment, "2");
  assertEquals("italic" in body, false);
});

Deno.test("tool-subtitle-video: requires videoUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolSubtitleVideo.execute({ videoUrl: "" }, ctx));
});
