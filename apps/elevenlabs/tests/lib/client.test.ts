import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  API_BASE,
  asOptionalJson,
  bytesToBase64,
  classify,
  compact,
  ElevenLabsClient,
  encodeId,
  formatError,
  formValue,
  MAX_AUDIO_BYTES,
  stripSecrets,
  truncate,
} from "../../lib/client.ts";
import { audioResponse, bareDetailBody, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: the API base is the vendor's documented origin, with no version", () => {
  assertEquals(API_BASE, "https://api.elevenlabs.io");
  // The version belongs to the path — this app calls both /v1 and /v2.
  assert(!/\/v\d/.test(API_BASE));
});

// --- error classification ---------------------------------------------------

/**
 * The finding this whole module exists for: a WRONG key answers 400, not 401.
 * Measured live on 2026-08-11 against /v1/user/subscription, /v1/models and
 * /v2/voices, all three returning the body below with HTTP 400.
 */
Deno.test("client: a 400 invalid_api_key classifies as authentication, not validation", () => {
  const raw = JSON.stringify(
    errorBody("authentication_error", "invalid_api_key", "API key is invalid.", {
      param: "api_key",
    }),
  );
  const { errorClass, detail } = classify(400, raw);
  assertEquals(errorClass, "authentication");
  assertEquals(detail?.code, "invalid_api_key");
});

Deno.test("client: a 401 with no credential also classifies as authentication", () => {
  const raw = JSON.stringify(
    errorBody(
      "authentication_error",
      "unauthorized",
      "Neither authorization header nor xi-api-key received, please provide one.",
    ),
  );
  assertEquals(classify(401, raw).errorClass, "authentication");
});

Deno.test("client: a 403 authorization_error is kept distinct from an authentication error", () => {
  const raw = JSON.stringify(
    errorBody("authorization_error", "missing_permissions", "Missing permission."),
  );
  assertEquals(classify(403, raw).errorClass, "authorization");
});

/** The other `detail` arm: an unrouted path answers a bare string. */
Deno.test("client: a bare-string detail is parsed rather than crashing the classifier", () => {
  const { errorClass, message, detail } = classify(404, JSON.stringify(bareDetailBody()));
  assertEquals(errorClass, "not-found");
  assertEquals(message, "Not Found");
  assertEquals(detail, undefined);
});

Deno.test("client: a non-JSON body falls back to the status", () => {
  assertEquals(classify(502, "<html>bad gateway</html>").errorClass, "server");
  assertEquals(classify(429, "").errorClass, "rate-limit");
  assertEquals(classify(402, "").errorClass, "payment");
});

Deno.test("client: an unknown detail.type falls back to the status, not to `unknown`", () => {
  const raw = JSON.stringify(errorBody("some_future_error", "whatever", "hmm"));
  assertEquals(classify(404, raw).errorClass, "not-found");
});

Deno.test("client: formatError keeps the vendor code, param and request_id", () => {
  const raw = JSON.stringify(
    errorBody("validation_error", "invalid_parameters", "The 'keyterms' parameter is…", {
      param: "keyterms",
    }),
  );
  const line = formatError(422, "POST", "/v1/speech-to-text", raw);
  assertStringIncludes(line, "invalid_parameters");
  assertStringIncludes(line, "POST /v1/speech-to-text");
  assertStringIncludes(line, "parameter: keyterms");
  assertStringIncludes(line, "request_id: 0123456789abcdef0123456789abcdef");
});

Deno.test("client: a 429 message names both limits the vendor multiplexes onto it", () => {
  const raw = JSON.stringify(errorBody("rate_limit_error", "concurrent_limit_exceeded", "slow"));
  const line = formatError(429, "POST", "/v1/text-to-speech/x", raw);
  assertStringIncludes(line, "concurrent_limit_exceeded");
  assertStringIncludes(line, "exponential backoff");
});

/**
 * The number in the suffix is the ORIGINAL length, not the dropped count — the
 * wording has to match, or a reader sizes the body wrong by an order of
 * magnitude.
 */
Deno.test("client: truncate reports the original length, and says so", () => {
  assertEquals(truncate("short", 10), "short");
  const long = truncate("x".repeat(50), 10);
  assertEquals(long, `${"x".repeat(10)}… (truncated from 50 bytes)`);
});

// --- redaction --------------------------------------------------------------

Deno.test("client: stripSecrets removes xi_api_key and keeps the masked preview", () => {
  const user = {
    user_id: "u1",
    xi_api_key: "sk_live_do_not_leak",
    xi_api_key_preview: "sk_l…eak",
    is_api_key_hashed: false,
    first_name: "Ada",
  };
  const out = stripSecrets(user) as Record<string, unknown>;
  assertEquals("xi_api_key" in out, false, "the live key survived");
  assertEquals(out.xi_api_key_preview, "sk_l…eak");
  assertEquals(out.is_api_key_hashed, false);
  assertEquals(out.user_id, "u1");
  // The input is not mutated — the caller may still hold a reference.
  assertEquals(user.xi_api_key, "sk_live_do_not_leak");
});

Deno.test("client: stripSecrets leaves non-objects alone", () => {
  assertEquals(stripSecrets(null), null);
  assertEquals(stripSecrets("x"), "x");
  assertEquals(stripSecrets([1, 2]), [1, 2]);
});

// --- helpers ----------------------------------------------------------------

Deno.test("client: compact drops empty values but keeps false and zero", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("client: encodeId neutralises path separators", () => {
  assertEquals(encodeId(" 21m00Tcm4TlvDq8ikWAM "), "21m00Tcm4TlvDq8ikWAM");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("client: asOptionalJson accepts both a parsed value and a typed string", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  try {
    asOptionalJson("{oops", "Voice settings");
    throw new Error("should have thrown");
  } catch (e) {
    assertStringIncludes(String(e), "Voice settings is not valid JSON");
  }
});

Deno.test("client: formValue stringifies scalars and drops empties", () => {
  assertEquals(formValue(3), "3");
  assertEquals(formValue(false), "false");
  assertEquals(formValue(undefined), undefined);
  assertEquals(formValue(""), undefined);
});

// --- base64 -----------------------------------------------------------------

Deno.test("client: bytesToBase64 matches the reference encoding", () => {
  assertEquals(bytesToBase64(new Uint8Array([104, 105])), "aGk=");
  assertEquals(bytesToBase64(new Uint8Array()), "");
  // Bytes above 0x7f must survive — an mp3 is full of them.
  assertEquals(bytesToBase64(new Uint8Array([0xff, 0xfb, 0x90])), "//uQ");
});

/**
 * The chunking exists because `String.fromCharCode(...bytes)` overflows the
 * argument limit on a large body. A payload past one chunk (0x8000) is the case
 * that would break a naive implementation.
 */
Deno.test("client: bytesToBase64 handles a body larger than one chunk", () => {
  const bytes = new Uint8Array(0x8000 * 2 + 7).map((_, i) => i % 251);
  const encoded = bytesToBase64(bytes);
  const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  assertEquals(decoded.length, bytes.length);
  assertEquals(decoded[0], bytes[0]);
  assertEquals(decoded[decoded.length - 1], bytes[bytes.length - 1]);
});

// --- request building -------------------------------------------------------

Deno.test("client: a GET builds the path and skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { voices: [] } }]);
  await new ElevenLabsClient(ctx).json("/v2/voices", {
    query: { page_size: 30, search: "", missing: undefined, flag: false },
  });
  assertEquals(pathOf(calls[0].url), "/v2/voices");
  assertEquals(queryOf(calls[0].url), { page_size: "30", flag: "false" });
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: an array query value is sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ElevenLabsClient(ctx).json("/v2/voices", { query: { voice_ids: ["a", "b"] } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("voice_ids"), ["a", "b"]);
});

Deno.test("client: a JSON body sets content-type and serialises", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new ElevenLabsClient(ctx).json("/v1/sound-generation", {
    method: "POST",
    body: { text: "door" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"text":"door"}');
});

/**
 * Speech-to-text declares only `multipart/form-data`. The encoder owns the
 * boundary, so the client must NOT set `content-type` itself — doing so
 * produces a body the server cannot parse.
 */
Deno.test("client: a form body is multipart and carries no hand-set content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { text: "hello" } }]);
  await new ElevenLabsClient(ctx).json("/v1/speech-to-text", {
    method: "POST",
    form: { model_id: "scribe_v1", source_url: "https://example.com/a.mp3", skipped: undefined },
  });
  assertEquals(calls[0].form, {
    model_id: "scribe_v1",
    source_url: "https://example.com/a.mp3",
  });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a 204 answers undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(
    await new ElevenLabsClient(ctx).json("/v1/history/x", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a non-2xx throws with the vendor's own code in the message", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody("authentication_error", "invalid_api_key", "API key is invalid."),
    },
  ]);
  const err = await assertRejects(
    () => new ElevenLabsClient(ctx).json("/v1/user/subscription"),
    Error,
  );
  assertStringIncludes(err.message, "invalid_api_key");
  assertStringIncludes(err.message, "API key is invalid.");
});

// --- binary responses -------------------------------------------------------

Deno.test("client: binary base64-encodes the body and reports the served content type", async () => {
  const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
  const { ctx, calls } = mockCtx([audioResponse(bytes, "audio/wav")]);
  const out = await new ElevenLabsClient(ctx).binary("/v1/text-to-speech/v1", { method: "POST" });
  assertEquals(out.audio_base64, bytesToBase64(bytes));
  assertEquals(out.content_type, "audio/wav");
  assertEquals(out.byte_length, 4);
  // Audio endpoints are asked for audio, not JSON.
  assertEquals(calls[0].headers.accept, "audio/*");
});

Deno.test("client: binary refuses a body past the inlining ceiling", async () => {
  const bytes = new Uint8Array(MAX_AUDIO_BYTES + 1);
  const { ctx } = mockCtx([audioResponse(bytes)]);
  const err = await assertRejects(() => new ElevenLabsClient(ctx).binary("/v1/x"), Error);
  assertStringIncludes(err.message, "over this app's");
  assertStringIncludes(err.message, "smaller output_format");
});
