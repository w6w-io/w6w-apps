import { assertEquals } from "@std/assert";
import voiceSpeechGenerate from "../../actions/voice-speech-generate.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-speech-generate: is synchronous — the response is a ready audio_url, not a job id", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ audio_url: "https://files.heygen.ai/audio/tts1.mp3", duration: 4.5 }) },
  ]);
  const out = await voiceSpeechGenerate.execute({ text: "Hello", voiceId: "v1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/voices/speech");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { text: "Hello", voice_id: "v1" });
  assertEquals(out, { audio_url: "https://files.heygen.ai/audio/tts1.mp3", duration: 4.5 });
});

Deno.test("voice-speech-generate: forwards speed, locale and input type", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ audio_url: "https://x", duration: 1 }) }]);
  await voiceSpeechGenerate.execute(
    { text: "Hola", voiceId: "v1", speed: 1.5, locale: "es-ES", inputType: "ssml" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    text: "Hola",
    voice_id: "v1",
    input_type: "ssml",
    speed: 1.5,
    locale: "es-ES",
  });
});
