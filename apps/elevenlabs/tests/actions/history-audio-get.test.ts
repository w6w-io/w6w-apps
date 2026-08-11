import { assertEquals } from "@std/assert";
import historyAudioGet from "../../actions/history-audio-get.ts";
import { bytesToBase64 } from "../../lib/client.ts";
import { audioResponse, mockCtx, pathOf } from "../_helpers.ts";

const MP3 = new Uint8Array([0xff, 0xfb, 0x40, 0x11]);

Deno.test("history-audio-get: base64-encodes the stored audio", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  const out = await historyAudioGet.execute({ historyItemId: "h1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/history/h1/audio");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "audio/*");
  assertEquals(out.audio_base64, bytesToBase64(MP3));
  assertEquals(out.byte_length, 4);
});

/** A history item comes back in whatever format it was generated in. */
Deno.test("history-audio-get: reports the served content type rather than assuming mp3", async () => {
  const { ctx } = mockCtx([audioResponse(MP3, "audio/wav")]);
  const out = await historyAudioGet.execute({ historyItemId: "h1" }, ctx);
  assertEquals(out.content_type, "audio/wav");
});

/**
 * This is a `read`, not a `perform`: the audio already exists and fetching it
 * costs no characters. That distinction is what lets a workflow re-fetch audio
 * instead of paying to synthesise the same text twice.
 */
Deno.test("history-audio-get: is a read, because re-downloading bills nothing", () => {
  assertEquals(historyAudioGet.type, "read");
  assertEquals(historyAudioGet.idempotent, undefined);
});
