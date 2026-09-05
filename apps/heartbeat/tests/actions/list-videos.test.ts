import { assertEquals } from "@std/assert";
import listVideos from "../../actions/list-videos.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-videos: GET /videos, wrapped under `videos`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "v1", name: "Intro" }] }]);
  const out = await listVideos.execute({}, ctx) as { videos: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/videos");
  assertEquals(out.videos.length, 1);
});
