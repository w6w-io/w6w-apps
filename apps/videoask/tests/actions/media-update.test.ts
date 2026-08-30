import { assertEquals } from "@std/assert";
import mediaUpdate from "../../actions/media-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-update: PATCHes caption_data verbatim as a WebVTT document", async () => {
  const vtt = "WEBVTT\n\nkey-0\n00:00:00.700 --> 00:00:02.000\nHello";
  const { ctx, calls } = mockCtx([{ body: { media_id: "m1", caption_data: vtt } }]);
  await mediaUpdate.execute({ mediaId: "m1", captionData: vtt }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/media/m1");
  assertEquals(JSON.parse(calls[0].body!), { caption_data: vtt });
});
