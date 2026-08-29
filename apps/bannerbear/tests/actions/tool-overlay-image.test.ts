import { assertEquals } from "@std/assert";
import toolOverlayImage from "../../actions/tool-overlay-image.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-overlay-image: POST /tools/overlay_image", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "overlay_image" } }]);
  await toolOverlayImage.execute(
    { videoUrl: "https://x/in.mp4", imageUrl: "https://x/logo.png", opacity: 0.8 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/overlay_image");
  assertEquals(JSON.parse(calls[0].body!), {
    video_url: "https://x/in.mp4",
    image_url: "https://x/logo.png",
    opacity: 0.8,
  });
});

Deno.test("tool-overlay-image: requires videoUrl and imageUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolOverlayImage.execute({ videoUrl: "https://x/in.mp4", imageUrl: "" }, ctx)
  );
});
