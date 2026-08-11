import type { HookContext } from "@w6w/types";

/**
 * ElevenLabs API client.
 *
 * Everything in this module was verified on 2026-08-11 against ElevenLabs' own
 * machine-readable OpenAPI 3.1 document (`https://api.elevenlabs.io/openapi.json`,
 * 1,952,556 bytes, md5 `78ec1a2a31e9ff37bda5104b64b9b2b1`, `info.version` `1.0`,
 * 285 paths) plus live unauthenticated probes against `api.elevenlabs.io` and
 * the vendor's own docs pages (`/docs/api-reference/authentication.md`,
 * `/docs/eleven-api/resources/errors.md`,
 * `/docs/overview/administration/workspaces/api-keys.md`). Nothing here came
 * from a third-party integration directory.
 *
 * ## One host, one prefix
 *
 * The document declares **no** `servers` block at all, so the base URL comes
 * from the vendor's own documentation instead: every example in the
 * authentication reference calls `https://api.elevenlabs.io`, and every path in
 * the document carries a `/v1` or `/v2` prefix as part of the path itself. That
 * is why {@link API_BASE} carries no version — the version belongs to the path,
 * and this app calls both (`/v1/models`, `/v2/voices`).
 *
 * There is no regional host and no sandbox environment; nothing about the host
 * is derived from the credential.
 *
 * ## Three response shapes, not one
 *
 * Getting this wrong is the single most expensive mistake in an ElevenLabs
 * integration, because the interesting endpoints are the ones that are *not*
 * JSON:
 *
 *  - **Audio endpoints answer raw bytes.** `POST /v1/text-to-speech/{voice_id}`,
 *    `POST /v1/sound-generation` and `GET /v1/history/{id}/audio` all declare a
 *    single `200` response with content type `audio/mpeg` and schema
 *    `{"type": "string", "format": "binary"}`. Calling `res.json()` on one of
 *    those throws on the first byte. {@link ElevenLabsClient.binary} reads them
 *    as bytes and base64-encodes them, which is the only lossless projection
 *    into a workflow step's JSON result.
 *  - **The `/with-timestamps` variants answer JSON** carrying the same audio as
 *    `audio_base64` plus per-character alignment. Where one exists it is
 *    strictly more informative than the binary form.
 *  - **Speech-to-text takes `multipart/form-data`, not JSON.** Its request body
 *    has exactly one declared content type, and posting JSON to it fails
 *    validation. See {@link ElevenLabsClient.form}.
 *
 * ## Errors: read the body, never the status
 *
 * Every error is `{"detail": …}`, but `detail` has **two** shapes and the app
 * has to handle both:
 *
 *  - An **object** `{type, code, message, status, request_id, param?}` for
 *    anything the API itself rejected. `type` is one of the documented families
 *    (`authentication_error`, `authorization_error`, `validation_error`,
 *    `not_found`, `payment_required`, `rate_limit_error`, …) and `code` is the
 *    specific cause (`invalid_api_key`, `rate_limit_exceeded`,
 *    `concurrent_limit_exceeded`, `voice_not_found`, …).
 *  - A bare **string** `"Not Found"` for a path the router does not know at all.
 *    Measured live: `GET /v1/definitely-not-real-zzz` → `404`,
 *    `{"detail":"Not Found"}`, 22 bytes.
 *
 * **And the status code lies about authentication.** The vendor's own error
 * table documents `authentication_error` as HTTP `401`, and a request with *no*
 * credential does answer `401`. But a request carrying a **wrong** key answers
 * **`400`** — measured on 2026-08-11 against `/v1/user/subscription`,
 * `/v1/models` and `/v2/voices`, all three returning
 * `400 {"detail":{"type":"authentication_error","code":"invalid_api_key", …}}`.
 * Any code that decides "is this credential bad?" from `res.status === 401`
 * therefore reports a mistyped key as a generic bad request. {@link classify}
 * exists so that decision is made from `detail.type` / `detail.code`, and
 * `auth/api-key.ts` uses it.
 */

/** The one and only API origin. See the module note on the missing `servers` block. */
export const API_BASE = "https://api.elevenlabs.io";

export type QueryValue = string | number | boolean | undefined | null | string[];

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
  /**
   * Sent as `multipart/form-data`, for the endpoints whose request body
   * declares only that content type. The browser/Deno `FormData` encoder sets
   * the boundary, so `content-type` is deliberately NOT set by hand here.
   */
  form?: Record<string, string | undefined>;
  /** Sent as `accept`. Defaults to `application/json`. */
  accept?: string;
}

/** The object arm of ElevenLabs' `detail` error. */
export interface ElevenLabsErrorDetail {
  type?: string;
  code?: string;
  message?: string;
  status?: string;
  request_id?: string;
  param?: string;
}

interface ElevenLabsErrorBody {
  detail?: ElevenLabsErrorDetail | string;
}

/**
 * What an error body actually says, independent of the HTTP status.
 *
 * `authentication` and `authorization` are kept apart on purpose: a key that is
 * wrong or revoked and a key that is merely scoped away from one endpoint are
 * different problems with different fixes, and the API distinguishes them in
 * the body even when the status does not.
 */
export type ErrorClass =
  | "authentication"
  | "authorization"
  | "not-found"
  | "validation"
  | "payment"
  | "rate-limit"
  | "server"
  | "unknown";

/** Parse an error body into `{ detail, class }`, tolerating both `detail` shapes. */
export function classify(status: number, raw: string): {
  detail?: ElevenLabsErrorDetail;
  message?: string;
  errorClass: ErrorClass;
} {
  let parsed: ElevenLabsErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as ElevenLabsErrorBody;
  } catch { /* not JSON — fall through */ }

  const detail = parsed?.detail;

  // The bare-string arm: an unrouted path answers `{"detail": "Not Found"}`.
  if (typeof detail === "string") {
    return { message: detail, errorClass: status === 404 ? "not-found" : fromStatus(status) };
  }
  if (!detail || typeof detail !== "object") {
    return { message: raw || undefined, errorClass: fromStatus(status) };
  }

  return { detail, message: detail.message, errorClass: fromDetail(detail, status) };
}

/**
 * Classify from the documented `type` family, falling back to the status.
 *
 * The `type` is trusted over the status because of the 400-for-a-bad-key case
 * described in the module note: the body is right and the status is not.
 */
function fromDetail(detail: ElevenLabsErrorDetail, status: number): ErrorClass {
  switch (detail.type) {
    case "authentication_error":
      return "authentication";
    case "authorization_error":
      return "authorization";
    case "not_found":
      return "not-found";
    case "validation_error":
    case "invalid_request":
      return "validation";
    case "payment_required":
      return "payment";
    case "rate_limit_error":
      return "rate-limit";
    case "internal_error":
    case "service_unavailable":
      return "server";
    default:
      return fromStatus(status);
  }
}

function fromStatus(status: number): ErrorClass {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 404) return "not-found";
  if (status === 402) return "payment";
  if (status === 429) return "rate-limit";
  if (status >= 500) return "server";
  if (status >= 400) return "validation";
  return "unknown";
}

/** Keep an error message readable — a validation body can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  // The number printed is the ORIGINAL length, so the wording says so: a
  // "N bytes truncated" phrasing next to the total is how a reader concludes the
  // body was ten times bigger than it was.
  return `${text.slice(0, max)}… (truncated from ${text.length} bytes)`;
}

/**
 * Turn an ElevenLabs error body into one actionable line.
 *
 * `code` and `request_id` are both kept: the vendor's support process asks for
 * the `request_id` verbatim, and `code` is what its troubleshooting tables are
 * written against. A flattened "HTTP 400" hides both.
 *
 * The message can carry only ElevenLabs' own prose and the caller's own input;
 * the credential never enters this module.
 */
export function formatError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  const { detail, message, errorClass } = classify(status, raw);
  const parts: string[] = [
    `ElevenLabs ${status}${detail?.code ? ` ${detail.code}` : ""} for ${method} ${path}`,
    message,
    detail?.param ? `parameter: ${detail.param}` : undefined,
    errorClass === "rate-limit"
      ? "ElevenLabs answers 429 for both request-rate and concurrency limits (code " +
        "`rate_limit_exceeded` vs `concurrent_limit_exceeded`); retry with exponential backoff"
      : undefined,
    detail?.request_id ? `request_id: ${detail.request_id}` : undefined,
  ].filter(Boolean) as string[];
  return truncate(parts.join(": "), 1000);
}

/**
 * Path-escape a caller-supplied id.
 *
 * ElevenLabs ids are opaque alphanumeric strings (`21m00Tcm4TlvDq8ikWAM`), so
 * escaping never changes a legitimate value — it only neutralises a `/` or `?`
 * someone pastes into an id field.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * `GET /v1/user` returns the caller's own API key.
 *
 * `UserResponseModel.xi_api_key` is documented as "The API key of the user" and
 * the vendor's own schema example carries a full key
 * (`"xi_api_key": "8so27l7327189x0h939ekx293380l920"`). A workflow step's
 * result is persisted in the run record and routinely echoed into logs,
 * previews and downstream steps, so returning it would copy a working
 * credential into durable storage on every call.
 *
 * `xi_api_key_preview` is the vendor's own masked form and is deliberately
 * *kept*: it is what makes "which key is this connection using?" answerable
 * without handing out the key.
 *
 * This is also why `GET /v1/user` is not the health probe — see
 * {@link WHY_NOT_USER} in `auth/api-key.ts`. Follow Up Boss's `/me` and
 * Mailjet's `/apikey` are the same trap and are banned pack-wide.
 */
export const REDACTED_FIELDS = ["xi_api_key"] as const;

/**
 * Remove {@link REDACTED_FIELDS} from an entity, returning a shallow copy.
 *
 * Deliberately narrow: it deletes the one exact documented field rather than
 * scrubbing anything that *looks* secret, because a heuristic that ate a user's
 * own field named `key` would corrupt legitimate payloads.
 */
export function stripSecrets<T>(entity: T): T {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  delete out.xi_api_key;
  return out as T;
}

/**
 * The ceiling on an audio body this app will materialise as base64.
 *
 * Base64 inflates by 4/3, and an action's return value is persisted in the run
 * record, so a 30-minute mp3 would put ~40 MB of text into the database on
 * every run. Twenty mebibytes of audio (~27 MB encoded) is roughly 20 minutes
 * at the default `mp3_44100_128`, which is far past any reasonable single
 * workflow step. Beyond it the action fails with an actionable message rather
 * than quietly writing a payload nothing downstream can handle.
 */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/**
 * Base64-encode bytes without pulling in a dependency.
 *
 * `btoa` takes a *binary string*, and building that string one character at a
 * time is unusably slow for a multi-megabyte body, while
 * `String.fromCharCode(...bytes)` in one shot overflows the argument limit on
 * anything past a few hundred kilobytes. Chunking is the standard resolution of
 * those two constraints; 0x8000 is the conventional safe chunk.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** What an audio-returning action gives the next workflow step. */
export interface AudioResult {
  /** The audio bytes, base64-encoded. */
  audio_base64: string;
  /** The content type ElevenLabs served, verbatim (`audio/mpeg`, `audio/wav`, …). */
  content_type: string;
  /** Size of the decoded audio in bytes — the honest measure, not the base64 length. */
  byte_length: number;
}

export class ElevenLabsClient {
  constructor(private ctx: HookContext) {}

  /** Parse a JSON response. The shape of every endpoint except the audio ones. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Read an `audio/*` body and hand it back base64-encoded.
   *
   * See the module note: these endpoints declare `audio/mpeg` with a binary
   * schema and nothing else. There is no JSON projection of them, and
   * `res.json()` throws.
   */
  async binary(path: string, options: RequestOptions = {}): Promise<AudioResult> {
    const res = await this.send(path, { ...options, accept: options.accept ?? "audio/*" });
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length > MAX_AUDIO_BYTES) {
      throw new Error(
        `ElevenLabs returned ${bytes.length} bytes of audio, over this app's ${MAX_AUDIO_BYTES}-` +
          "byte ceiling for inlining audio into a workflow result. Shorten the text, or request a " +
          "smaller output_format (e.g. mp3_22050_32).",
      );
    }
    return {
      audio_base64: bytesToBase64(bytes),
      content_type: res.headers.get("content-type") ?? "",
      byte_length: bytes.length,
    };
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      // Multi-valued filters on `/v2/voices` (`voice_ids`, `language`,
      // `use_cases`) are documented as repeated keys, not comma-joined values.
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: options.accept ?? "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };

    if (options.form) {
      const form = new FormData();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        form.append(k, v);
      }
      // No `content-type` header: the encoder owns the multipart boundary, and
      // setting it by hand produces a body the server cannot parse.
      init.body = form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(formatError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}

/**
 * Drop keys the caller left unset.
 *
 * `false` and `0` survive: `tag_audio_events=false` and `seed=0` are both
 * meaningful, and silently dropping them would make them impossible to express.
 */
export function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** Render a form field value for a `multipart/form-data` body. */
export function formValue(v: string | number | boolean | undefined | null): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return String(v);
}
