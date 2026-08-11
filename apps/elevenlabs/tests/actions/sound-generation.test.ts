import { assertEquals } from "@std/assert";
import soundGeneration from "../../actions/sound-generation.ts";
import { bytesToBase64 } from "../../lib/client.ts";
import { audioResponse, jsonBodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const MP3 = new Uint8Array([0xff, 0xfb, 0x01]);

Deno.test("sound-generation: posts the prompt and returns base64 audio", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  const out = await soundGeneration.execute({ text: "A door creaking." }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/sound-generation");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBodyOf(calls[0]), { text: "A door creaking." });
  assertEquals(out.audio_base64, bytesToBase64(MP3));
  assertEquals(out.byte_length, 3);
});

Deno.test("sound-generation: duration, influence, loop and model reach the body", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await soundGeneration.execute({
    text: "Rain.",
    durationSeconds: 4.5,
    promptInfluence: 0,
    loop: true,
    modelId: "eleven_text_to_sound_v2",
    outputFormat: "mp3_22050_32",
  }, ctx);
  assertEquals(jsonBodyOf(calls[0]), {
    text: "Rain.",
    duration_seconds: 4.5,
    // Zero is a legitimate influence and must survive.
    prompt_influence: 0,
    loop: true,
    model_id: "eleven_text_to_sound_v2",
  });
  assertEquals(queryOf(calls[0].url), { output_format: "mp3_22050_32" });
});

Deno.test("sound-generation: loop is omitted rather than sent as false", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await soundGeneration.execute({ text: "Rain.", loop: false }, ctx);
  assertEquals("loop" in jsonBodyOf(calls[0]), false);
});

/** This endpoint's own output_format enum has no WAV members. */
Deno.test("sound-generation: the format list offers no WAV, matching the endpoint's enum", () => {
  const format = (soundGeneration.params ?? []).find((p) => p.key === "outputFormat");
  const values = (format?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.some((v) => v.startsWith("wav_")), false);
  assertEquals(values.includes("mp3_44100_128"), true);
});

Deno.test("sound-generation: the duration bounds match the documented 0.5–30 seconds", () => {
  const duration = (soundGeneration.params ?? []).find((p) => p.key === "durationSeconds");
  assertEquals(duration?.validation?.min, 0.5);
  assertEquals(duration?.validation?.max, 30);
});

Deno.test("sound-generation: is a non-idempotent perform — every call bills credits", () => {
  assertEquals(soundGeneration.type, "perform");
  assertEquals(soundGeneration.idempotent, false);
});
