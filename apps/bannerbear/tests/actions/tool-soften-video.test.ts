import { assertEquals } from "@std/assert";
import toolSoftenVideo from "../../actions/tool-soften-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-soften-video: POST /tools/soften_video, defaults strength to medium", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "soften_video" } }]);
  await toolSoftenVideo.execute({ videoUrl: "https://x/in.mp4" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/soften_video");
  assertEquals(JSON.parse(calls[0].body!), { video_url: "https://x/in.mp4", strength: "medium" });
});

Deno.test("tool-soften-video: requires videoUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolSoftenVideo.execute({ videoUrl: "" }, ctx));
});
