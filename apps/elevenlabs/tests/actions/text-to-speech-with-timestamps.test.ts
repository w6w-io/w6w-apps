import { assertEquals } from "@std/assert";
import tts from "../../actions/text-to-speech-with-timestamps.ts";
import { jsonBodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const RESPONSE = {
  audio_base64: "//uQRAAA",
  alignment: { characters: ["H", "i"], character_start_times_seconds: [0, 0.1] },
  normalized_alignment: { characters: ["H", "i"], character_start_times_seconds: [0, 0.1] },
};

/**
 * The one TTS endpoint that answers JSON — the audio arrives already
 * base64-encoded by the vendor, so nothing here decodes or re-encodes it.
 */
Deno.test("tts-with-timestamps: returns the vendor's JSON verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await tts.execute({ voiceId: "v1", text: "Hi" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/text-to-speech/v1/with-timestamps");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(out, RESPONSE);
});

Deno.test("tts-with-timestamps: shares the TTS body builder", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await tts.execute({
    voiceId: "v1",
    text: "Hi",
    modelId: "eleven_multilingual_v2",
    nextText: "After.",
    voiceSettings: { stability: 0.3 },
    outputFormat: "mp3_22050_32",
  }, ctx);
  assertEquals(jsonBodyOf(calls[0]), {
    text: "Hi",
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.3 },
    next_text: "After.",
  });
  assertEquals(queryOf(calls[0].url), { output_format: "mp3_22050_32" });
});

Deno.test("tts-with-timestamps: declares both alignment fields as output", () => {
  const keys = (tts.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys, ["audio_base64", "alignment", "normalized_alignment"]);
});

Deno.test("tts-with-timestamps: is a non-idempotent perform — every call bills characters", () => {
  assertEquals(tts.type, "perform");
  assertEquals(tts.idempotent, false);
});
