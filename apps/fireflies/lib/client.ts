/**
 * GraphQL client for the Fireflies.ai API.
 *
 * Fireflies has exactly ONE endpoint — every read and every write is a POST to
 * `https://api.fireflies.ai/graphql` (docs: `fundamentals/authorization`). There
 * is no REST surface, so this file is a GraphQL client rather than a REST
 * wrapper and each action owns its own query/mutation document.
 *
 * Two vendor behaviours drive the shape of `query()` below, and both were
 * measured against the live endpoint on 2026-08-11 rather than inferred:
 *
 *  1. **Failures do not use failure status codes.** An unauthenticated or
 *     bad-key request answers `HTTP 500` with a perfectly well-formed GraphQL
 *     envelope:
 *
 *     ```
 *     $ curl -sD- -X POST -H 'content-type: application/json' \
 *         --data '{"query":"{ user { name } }"}' https://api.fireflies.ai/graphql
 *     HTTP/2 500
 *     {"errors":[{"friendly":true,"code":"auth_failed","message":"An error occurred
 *      while authenticating your request...","extensions":{"code":"auth_failed"}}]}
 *     ```
 *
 *     So `res.ok` is worse than useless here: checking it first turns "your API
 *     key is wrong" into "Fireflies is down". `errors[]` is checked BEFORE the
 *     status, and the status is only consulted once the body has proven it is
 *     not a GraphQL answer at all.
 *
 *  2. **Errors carry a machine-readable `code`.** Fireflies puts it both at the
 *     top level of the error and under `extensions.code`, with the HTTP status
 *     it *meant* under `extensions.status` (docs: `fundamentals/errors`). The
 *     code is what a workflow author can branch on — `paid_required`,
 *     `too_many_requests`, `require_elevated_privilege` — so it is lifted into
 *     the thrown message rather than discarded.
 */
import type { HookContext } from "@w6w/types";

/** The whole API. There is no other path and no per-tenant host. */
export const API_URL = "https://api.fireflies.ai/graphql";

/** One entry of a Fireflies `errors[]` array. See docs `fundamentals/errors`. */
export interface FirefliesError {
  message?: string;
  /** e.g. `auth_failed`, `paid_required`, `too_many_requests`. */
  code?: string;
  /** `true` when the message is safe to show a user verbatim. */
  friendly?: boolean;
  extensions?: {
    code?: string;
    /** The HTTP status the vendor *meant*, which is not the one it sent. */
    status?: number;
    metadata?: Record<string, unknown>;
    helpUrls?: string[];
  };
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: FirefliesError[];
}

/** The error code, wherever the vendor happened to put it on this response. */
export function errorCode(err: FirefliesError): string | undefined {
  return err.code ?? err.extensions?.code;
}

/** Render `errors[]` into one line, keeping the codes a caller can branch on. */
export function formatErrors(errors: FirefliesError[]): string {
  return errors
    .map((e) => {
      const code = errorCode(e);
      const msg = e.message ?? "unspecified error";
      return code ? `${msg} [${code}]` : msg;
    })
    .join("; ");
}

/**
 * Drop values the caller left unset so an empty form field does not reach
 * Fireflies as an explicit `null` (which several arguments treat differently
 * from "absent"). `false` and `0` are meaningful and are kept.
 */
export function compact(vars: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Render an optional integer argument as an INLINE literal, e.g. `, limit: 25`.
 *
 * This exists because Fireflies' docs contradict themselves on the scalar type
 * of the pagination arguments, and a GraphQL variable declaration has to name
 * the type exactly. `graphql-api/query/apps` documents `skip` / `limit` as
 * `Int` in its Arguments table but declares `$skip: Float, $limit: Float` in
 * its own usage example — and a variable of type `Int` used where the schema
 * says `Float` is a hard validation error (a variable's type must be the same
 * as, or a subtype of, the argument's; `Int` is not a subtype of `Float`).
 * Guessing wrong breaks the query outright.
 *
 * An integer *literal* is accepted as input by both `Int` and `Float`, so
 * inlining sidesteps the ambiguity entirely. It is injection-safe because a
 * non-integer is rejected here rather than interpolated.
 */
export function intArg(name: string, value: number | undefined | null): string {
  if (value === undefined || value === null) return "";
  if (!Number.isInteger(value)) {
    throw new Error(`Fireflies: ${name} must be an integer, got ${value}`);
  }
  return `, ${name}: ${value}`;
}

/**
 * Thin GraphQL client over `ctx.fetch`.
 *
 * It never sets `Authorization` — the runtime routes every request through the
 * auth `sign` hook, which is the only code handed the credential.
 */
export class FirefliesClient {
  constructor(private ctx: HookContext) {}

  async query<T = unknown>(
    document: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query: document, variables: compact(variables) }),
    });

    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      // Not a GraphQL answer at all — now the status is the only signal there is.
      throw new Error(`Fireflies ${res.status} ${res.statusText}: non-JSON response`);
    }

    // Deliberately BEFORE `res.ok`: a bad credential is an HTTP 500 here, and
    // reading the status first would report the vendor as broken instead.
    if (payload.errors?.length) {
      throw new Error(`Fireflies GraphQL error: ${formatErrors(payload.errors)}`);
    }
    if (!res.ok) throw new Error(`Fireflies ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined || payload.data === null) {
      throw new Error("Fireflies returned no data");
    }
    return payload.data;
  }
}

// --------------------------------------------------------------- fragments --
//
// Selection sets are shared so every operation returning the same object hands
// back the same shape. They are deliberately CONSERVATIVE: three groups of
// Transcript fields are gated behind a paid plan (`audio_url`, `video_url` and
// `analytics` all say "You need to be subscribed to a Pro or higher plan" in
// `schema/transcript`), so requesting them by default would make every read
// fail for a Free-plan connection. Those live behind opt-in booleans on the
// actions that can return them.

/** Cheap identifying fields, safe on every plan. */
export const TRANSCRIPT_CORE = `
  id
  title
  date
  dateString
  duration
  organizer_email
  participants
  transcript_url
  meeting_link
  is_live
`;

/** Everything in `TRANSCRIPT_CORE` plus the free-plan-safe nested objects. */
export const TRANSCRIPT_DETAIL = `
  ${TRANSCRIPT_CORE}
  calendar_id
  cal_id
  calendar_type
  fireflies_users
  speakers { id name }
  user { user_id email name }
  meeting_attendees { displayName email name location }
  channels { id }
`;

export const SUMMARY_FIELDS = `
  summary {
    gist
    overview
    short_summary
    short_overview
    bullet_gist
    shorthand_bullet
    outline
    keywords
    action_items
    topics_discussed
    meeting_type
    transcript_chapters
  }
`;

export const SENTENCE_FIELDS = `
  sentences {
    index
    speaker_id
    speaker_name
    text
    raw_text
    start_time
    end_time
  }
`;

/** Pro-plan only. See `schema/transcript` — gated behind an opt-in param. */
export const MEDIA_FIELDS = `
  audio_url
  video_url
`;

/** Pro-plan only. See `schema/transcript` — gated behind an opt-in param. */
export const ANALYTICS_FIELDS = `
  analytics {
    sentiments { negative_pct neutral_pct positive_pct }
    categories { questions date_times metrics tasks }
    speakers {
      speaker_id
      name
      duration
      word_count
      longest_monologue
      monologues_count
      filler_words
      questions
      duration_pct
      words_per_minute
    }
  }
`;

export const USER_FIELDS = `
  user_id
  email
  name
  num_transcripts
  minutes_consumed
  is_admin
  is_calendar_in_sync
`;

export const BITE_FIELDS = `
  id
  transcript_id
  name
  status
  summary
  summary_status
  user_id
  start_time
  end_time
  media_type
  privacies
  thumbnail
  preview
  created_at
`;
