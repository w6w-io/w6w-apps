import { assertEquals } from "@std/assert";
import toolTrimVideo from "../../actions/tool-trim-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-trim-video: POST /tools/trim_video", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "trim_video" } }]);
  await toolTrimVideo.execute({ videoUrl: "https://x/in.mp4", start: 1, end: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/trim_video");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    start: 1,
    end: 5,
  });
});

Deno.test("tool-trim-video: requires start and end", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolTrimVideo.execute({ videoUrl: "https://x/in.mp4" } as never, ctx));
});
