import { assert, assertEquals } from "@std/assert";
import videoGet from "../../actions/video-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-get: reads one video", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "1138023", status: "processed", playback_url: "https://x/y.m3u8", format: "m3u8" },
  }]);
  const video = await videoGet.execute({ videoId: "1138023" }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v2/videos/1138023");
  assertEquals(video.status, "processed");
});

Deno.test("video-get: labels playback_url as conditional on processing", () => {
  const output = (videoGet.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "playback_url")!;
  assert(/processed/.test(output.label), output.label);
});
