import { assertEquals } from "@std/assert";
import transcriptRedactedAudioGet from "../../actions/transcript-redacted-audio-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-redacted-audio-get: GETs /v2/transcript/{id}/redacted-audio", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "redacted_audio_ready", redacted_audio_url: "https://s3.example/x.wav" },
  }]);
  const out = await transcriptRedactedAudioGet.execute({ transcriptId: "t1" }, ctx) as {
    status: string;
    redacted_audio_url: string;
  };
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1/redacted-audio");
  assertEquals(out.status, "redacted_audio_ready");
  assertEquals(out.redacted_audio_url, "https://s3.example/x.wav");
});

Deno.test("transcript-redacted-audio-get: is a read action", () => {
  assertEquals(transcriptRedactedAudioGet.type, "read");
});
