import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import textToSpeech from "../../actions/text-to-speech.ts";
import { bytesToBase64 } from "../../lib/client.ts";
import { audioResponse, errorBody, jsonBodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const MP3 = new Uint8Array([0xff, 0xfb, 0x90, 0x44, 0x00]);

Deno.test("text-to-speech: posts the text to the voice's path and returns base64 audio", async () => {
  const { ctx, calls, logs } = mockCtx([audioResponse(MP3)]);
  const out = await textToSpeech.execute({ voiceId: "21m00Tcm4TlvDq8ikWAM", text: "Hi." }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM");
  assertEquals(jsonBodyOf(calls[0]), { text: "Hi." });
  assertEquals(out.audio_base64, bytesToBase64(MP3));
  assertEquals(out.content_type, "audio/mpeg");
  assertEquals(out.byte_length, 5);
  assertEquals(logs[0].level, "info");
});

/** The served content type is returned verbatim: output_format can select WAV. */
Deno.test("text-to-speech: reports the content type the vendor actually served", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3, "audio/wav")]);
  const out = await textToSpeech.execute(
    { voiceId: "v1", text: "Hi.", outputFormat: "wav_44100" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { output_format: "wav_44100" });
  assertEquals(out.content_type, "audio/wav");
});

Deno.test("text-to-speech: optional body fields are omitted rather than sent as null", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await textToSpeech.execute({ voiceId: "v1", text: "Hi.", modelId: undefined }, ctx);
  assertEquals(Object.keys(jsonBodyOf(calls[0])), ["text"]);
});

Deno.test("text-to-speech: model, language, seed and normalization reach the body", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await textToSpeech.execute({
    voiceId: "v1",
    text: "Hi.",
    modelId: "eleven_multilingual_v2",
    languageCode: "en",
    seed: 0,
    applyTextNormalization: "off",
  }, ctx);
  assertEquals(jsonBodyOf(calls[0]), {
    text: "Hi.",
    model_id: "eleven_multilingual_v2",
    language_code: "en",
    // Zero is a legitimate seed and must survive.
    seed: 0,
    apply_text_normalization: "off",
  });
});

Deno.test("text-to-speech: a voice-settings override is accepted as a typed JSON string", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await textToSpeech.execute(
    { voiceId: "v1", text: "Hi.", voiceSettings: '{"stability":0.4}' },
    ctx,
  );
  assertEquals(jsonBodyOf(calls[0]).voice_settings, { stability: 0.4 });
});

Deno.test("text-to-speech: malformed voice settings fail before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await textToSpeech.execute({ voiceId: "v1", text: "Hi.", voiceSettings: "{oops" }, ctx);
    },
    Error,
    "Voice settings override is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

/** Continuity ids are a comma-separated string in the form and an array on the wire. */
Deno.test("text-to-speech: request-id continuity lists are split into arrays", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3)]);
  await textToSpeech.execute({
    voiceId: "v1",
    text: "Hi.",
    previousRequestIds: "a, b ,,c",
    nextRequestIds: "",
    previousText: "Before.",
  }, ctx);
  const body = jsonBodyOf(calls[0]);
  assertEquals(body.previous_request_ids, ["a", "b", "c"]);
  assertEquals("next_request_ids" in body, false);
  assertEquals(body.previous_text, "Before.");
});

/**
 * `enable_logging` defaults to true server-side, so only an explicit opt-out is
 * worth sending — and sending it wrongly would silently switch the account into
 * zero-retention mode.
 */
Deno.test("text-to-speech: enable_logging is only sent when explicitly turned off", async () => {
  const { ctx, calls } = mockCtx([audioResponse(MP3), audioResponse(MP3)]);
  await textToSpeech.execute({ voiceId: "v1", text: "Hi.", enableLogging: true }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  await textToSpeech.execute({ voiceId: "v1", text: "Hi.", enableLogging: false }, ctx);
  assertEquals(queryOf(calls[1].url), { enable_logging: "false" });
});

Deno.test("text-to-speech: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("not_found", "voice_not_found", "Voice does not exist.") },
  ]);
  const err = await assertRejects(
    async () => {
      await textToSpeech.execute({ voiceId: "nope", text: "Hi." }, ctx);
    },
    Error,
  );
  assertStringIncludes(err.message, "voice_not_found");
});

Deno.test("text-to-speech: is a non-idempotent perform — every call bills characters", () => {
  assertEquals(textToSpeech.type, "perform");
  assertEquals(textToSpeech.idempotent, false);
});
