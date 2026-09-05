import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audio-translate.ts";

const AUDIO_B64 = "aGVsbG8=";

Deno.test("audio-translate: POSTs multipart to /audio/translations with a file", async () => {
  const { ctx, calls } = mockCtx([{ body: { text: "hello" } }]);
  await action.execute!({ file: AUDIO_B64, model: "whisper-large-v3-turbo" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/audio/translations");
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("model"), "whisper-large-v3-turbo");
  assertEquals(form.get("response_format"), "json");
  const file = form.get("file") as File;
  assertEquals(file.name, "audio.mp3");
});

Deno.test("audio-translate: accepts a URL instead of a file", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { url: "https://example.com/clip.mp3", model: "whisper-large-v3-turbo" },
    ctx,
  );
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("url"), "https://example.com/clip.mp3");
  assertEquals(form.get("file"), null);
});

Deno.test("audio-translate: forwards optional prompt/format/temperature", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      file: AUDIO_B64,
      model: "whisper-large-v3-turbo",
      prompt: "context",
      responseFormat: "text",
      temperature: 0.5,
    },
    ctx,
  );
  const form = calls[0].rawBody as FormData;
  assertEquals(form.get("prompt"), "context");
  assertEquals(form.get("response_format"), "text");
  assertEquals(form.get("temperature"), "0.5");
});

Deno.test("audio-translate: rejects when neither file nor url is provided", async () => {
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
