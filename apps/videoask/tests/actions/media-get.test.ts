import { assertEquals } from "@std/assert";
import mediaGet from "../../actions/media-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-get: GETs /media/{mediaId} and returns the transcript entity", async () => {
  const { ctx, calls } = mockCtx([
    { body: { media_id: "m1", transcription: "Hello there, world." } },
  ]);
  const out = await mediaGet.execute({ mediaId: "m1" }, ctx) as { transcription: string };
  assertEquals(pathOf(calls[0].url), "/media/m1");
  assertEquals(out.transcription, "Hello there, world.");
});
