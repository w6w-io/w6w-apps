import { assertEquals } from "@std/assert";
import toolAddAudio from "../../actions/tool-add-audio.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-add-audio: POST /tools/add_audio, defaults mode to mix", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "add_audio" } }]);
  await toolAddAudio.execute(
    { videoUrl: "https://x/in.mp4", audioUrl: "https://x/song.mp3", loop: false },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/add_audio");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.mode, "mix");
  assertEquals(body.loop, "off");
});

Deno.test("tool-add-audio: requires videoUrl and audioUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolAddAudio.execute({ videoUrl: "https://x/in.mp4", audioUrl: "" }, ctx)
  );
});
