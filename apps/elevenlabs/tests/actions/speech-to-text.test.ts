import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import speechToText from "../../actions/speech-to-text.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const RESULT = { language_code: "en", language_probability: 0.99, text: "Hello.", words: [] };

/**
 * The two findings this action exists to encode: the body is multipart (not
 * JSON) and the media is addressed by URL (not uploaded).
 */
Deno.test("speech-to-text: sends a multipart body, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: RESULT }]);
  await speechToText.execute(
    { sourceUrl: "https://example.com/a.mp3", modelId: "scribe_v1" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/speech-to-text");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null, "a JSON body would be rejected by this endpoint");
  assertEquals(calls[0].form, { model_id: "scribe_v1", source_url: "https://example.com/a.mp3" });
  // The multipart encoder owns the boundary — a hand-set content-type breaks it.
  assertEquals(calls[0].headers["content-type"], undefined);
});

/**
 * `source_url` and not `cloud_storage_url`: the document marks the latter
 * deprecated in favour of the former, and sending both would be a conflict.
 */
Deno.test("speech-to-text: uses source_url, not the deprecated cloud_storage_url", async () => {
  const { ctx, calls } = mockCtx([{ body: RESULT }]);
  await speechToText.execute({ sourceUrl: "https://example.com/a.mp3", modelId: "scribe_v2" }, ctx);
  assertEquals("cloud_storage_url" in calls[0].form!, false);
  assertEquals("file" in calls[0].form!, false);
});

Deno.test("speech-to-text: every optional field is stringified into the form", async () => {
  const { ctx, calls } = mockCtx([{ body: RESULT }]);
  await speechToText.execute({
    sourceUrl: "https://example.com/a.mp3",
    modelId: "scribe_v1",
    languageCode: "de",
    numSpeakers: 3,
    diarize: true,
    timestampsGranularity: "character",
    temperature: 0,
    seed: 0,
  }, ctx);
  assertEquals(calls[0].form, {
    model_id: "scribe_v1",
    source_url: "https://example.com/a.mp3",
    language_code: "de",
    num_speakers: "3",
    diarize: "true",
    timestamps_granularity: "character",
    // Zero is meaningful for both and must survive as a string.
    temperature: "0",
    seed: "0",
  });
});

/** `tag_audio_events` defaults to true server-side, so only the opt-out travels. */
Deno.test("speech-to-text: audio-event tagging is only sent when turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: RESULT }, { body: RESULT }]);
  await speechToText.execute(
    { sourceUrl: "https://example.com/a.mp3", modelId: "scribe_v1", tagAudioEvents: true },
    ctx,
  );
  assertEquals("tag_audio_events" in calls[0].form!, false);
  await speechToText.execute(
    { sourceUrl: "https://example.com/a.mp3", modelId: "scribe_v1", tagAudioEvents: false },
    ctx,
  );
  assertEquals(calls[1].form!.tag_audio_events, "false");
});

/** `webhook` is deliberately not exposed — it answers 202 with no transcript. */
Deno.test("speech-to-text: the webhook mode is not reachable from the form", () => {
  const keys = (speechToText.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("webhook"), false);
  assertEquals(keys.includes("webhookId"), false);
});

Deno.test("speech-to-text: the model is required, because the API has no default", () => {
  const model = (speechToText.params ?? []).find((p) => p.key === "modelId");
  assertEquals(model?.required, true);
  assertEquals(model?.default, "scribe_v1");
});

Deno.test("speech-to-text: a validation error surfaces the offending parameter", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("validation_error", "invalid_parameters", "Bad model.", { param: "model_id" }),
  }]);
  const err = await assertRejects(
    async () => {
      await speechToText.execute({ sourceUrl: "https://example.com/a.mp3", modelId: "nope" }, ctx);
    },
    Error,
  );
  assertStringIncludes(err.message, "parameter: model_id");
});

Deno.test("speech-to-text: is a non-idempotent perform — every call bills the transcription", () => {
  assertEquals(speechToText.type, "perform");
  assertEquals(speechToText.idempotent, false);
});
