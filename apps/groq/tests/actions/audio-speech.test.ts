import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { base64ToBytes } from "../../lib/client.ts";
import action from "../../actions/audio-speech.ts";

Deno.test("audio-speech: POSTs JSON to /audio/speech and returns base64 audio", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "fake-wav-bytes",
    headers: { "content-type": "audio/wav" },
  }]);
  const result = await action.execute!(
    { model: "playai-tts", input: "Hello there", voice: "Fritz-PlayAI" },
    ctx,
  ) as { base64: string; contentType: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/audio/speech");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "playai-tts");
  assertEquals(body.input, "Hello there");
  assertEquals(body.voice, "Fritz-PlayAI");

  assertEquals(result.contentType, "audio/wav");
  assertEquals(new TextDecoder().decode(base64ToBytes(result.base64)), "fake-wav-bytes");
});

Deno.test("audio-speech: forwards response_format, sample_rate, and speed", async () => {
  const { ctx, calls } = mockCtx([{ body: "x", headers: { "content-type": "audio/wav" } }]);
  await action.execute!(
    {
      model: "playai-tts",
      input: "hi",
      voice: "Fritz-PlayAI",
      responseFormat: "flac",
      sampleRate: 24000,
      speed: 1.5,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.response_format, "flac");
  assertEquals(body.sample_rate, 24000);
  assertEquals(body.speed, 1.5);
});
