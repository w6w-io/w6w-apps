import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audio-transcribe.ts";

const AUDIO_B64 = "aGVsbG8=";

Deno.test("audio-transcribe: POSTs multipart to /audio/transcriptions with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { text: "hi" } }]);
  await action.execute!({ file: AUDIO_B64 }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/audio/transcriptions");
  const form = calls[0].rawBody as FormData;
  assertEquals(form instanceof FormData, true);
  assertEquals(form.get("model"), "whisper-1");
  assertEquals(form.get("response_format"), "json");
  const file = form.get("file") as File;
  assertEquals(file.name, "audio.mp3");
  assertEquals(file.type, "audio/mpeg");
});

Deno.test("audio-transcribe: forwards optional language/prompt/format", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      file: AUDIO_B64,
      language: "en",
      prompt: "context",
      responseFormat: "verbose_json",
      temperature: 0,
      fileName: "clip.wav",
      fileMimeType: "audio/wav",
    },
    ctx,
  );
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("language"), "en");
  assertEquals(form.get("prompt"), "context");
  assertEquals(form.get("response_format"), "verbose_json");
  assertEquals(form.get("temperature"), "0");
  assertEquals((form.get("file") as File).name, "clip.wav");
  assertEquals((form.get("file") as File).type, "audio/wav");
});
