import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audio-transcribe.ts";

const AUDIO_B64 = "aGVsbG8=";

Deno.test("audio-transcribe: POSTs multipart to /audio/transcriptions with a file", async () => {
  const { ctx, calls } = mockCtx([{ body: { text: "hi" } }]);
  await action.execute!({ file: AUDIO_B64, model: "whisper-large-v3-turbo" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/audio/transcriptions");
  const form = calls[0].rawBody as FormData;
  assertEquals(form instanceof FormData, true);
  assertEquals(form.get("model"), "whisper-large-v3-turbo");
  assertEquals(form.get("response_format"), "json");
  assertEquals(form.get("url"), null);
  const file = form.get("file") as File;
  assertEquals(file.name, "audio.mp3");
  assertEquals(file.type, "audio/mpeg");
});

// Groq accepts a plain `url` INSTEAD of a multipart file upload — OpenAI's
// own Whisper endpoint has no such option, so this is the Groq-specific path.
Deno.test("audio-transcribe: accepts a URL instead of a file", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { url: "https://example.com/clip.mp3", model: "whisper-large-v3-turbo" },
    ctx,
  );
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("url"), "https://example.com/clip.mp3");
  assertEquals(form.get("file"), null);
});

Deno.test("audio-transcribe: forwards optional language/prompt/format/temperature", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      file: AUDIO_B64,
      model: "whisper-large-v3-turbo",
      language: "en",
      prompt: "context",
      responseFormat: "verbose_json",
      temperature: 0,
      fileName: "clip.wav",
      fileMimeType: "audio/wav",
      timestampGranularities: ["word", "segment"],
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
  assertEquals(form.getAll("timestamp_granularities[]"), ["word", "segment"]);
});

Deno.test("audio-transcribe: rejects when neither file nor url is provided", async () => {
  const { ctx, calls } = mockCtx();
  let threw = false;
  try {
    await action.execute!({ model: "whisper-large-v3-turbo" }, ctx);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("file"));
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
