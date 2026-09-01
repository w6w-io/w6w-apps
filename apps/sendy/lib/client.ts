import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Sendy's API — verified against the vendor's own reference at
 * https://sendy.co/api (fetched 2026-09-01, page states "currently version
 * 7.1.4"). Sendy's API is "based on simple HTTP POST": every call is a
 * `POST` with `application/x-www-form-urlencoded` fields, and every
 * documented response is **plain text**, except `get-lists.php` and
 * `get-brands.php`, which answer JSON.
 *
 * **There is no vendor host.** Sendy is self-hosted software the operator
 * runs on their own Amazon SES account — `sendy.co` is the vendor's
 * marketing site and license portal, not an API host. The installation's
 * origin (and, unlike most self-hosted apps in this pack, its own path
 * prefix — an install can live at a domain root or in a subdirectory such as
 * `https://example.com/sendy`) is a connection field, and the app's egress
 * allowlist is `["*"]` — the posture this pack already uses for `gitea`,
 * `ghost`, `grafana` and `jenkins`.
 *
 * **Every documented response is plain text, and success is not a fixed
 * literal.** Unlike a JSON API with an envelope, each endpoint defines its
 * own small set of exact success strings (`"true"`, `"Campaign created"`, a
 * bare integer, …) and its own set of exact error strings — verified line by
 * line against the page above. A response outside the documented success
 * set is treated as a failure, using the vendor's own text as the message,
 * per the pack rule against guessing "is this working?" from an HTTP status
 * code: **Sendy answers every one of these calls with HTTP 200 whether it
 * succeeded or not**, so the body is the only signal there is.
 */

/** `POST /subscribe` — undocumented path prefix; always relative to the install root. */
export const SUBSCRIBE_PATH = "/subscribe";
export const UNSUBSCRIBE_PATH = "/unsubscribe";
export const DELETE_SUBSCRIBER_PATH = "/api/subscribers/delete.php";
export const SUBSCRIPTION_STATUS_PATH = "/api/subscribers/subscription-status.php";
export const ACTIVE_SUBSCRIBER_COUNT_PATH = "/api/subscribers/active-subscriber-count.php";
export const GET_LISTS_PATH = "/api/lists/get-lists.php";
export const GET_BRANDS_PATH = "/api/brands/get-brands.php";
export const CREATE_CAMPAIGN_PATH = "/api/campaigns/create.php";

/** Public (redacted-safe) connection metadata. */
export interface SendyConnectionDisplay {
  /** The installation's origin plus any path prefix it is served under. */
  baseUrl?: string;
}

/**
 * Normalise a user-typed installation URL.
 *
 * Unlike an API that always lives at a fixed sub-path (Gitea's `/api/v1`),
 * a Sendy install can sit at a domain root OR a subdirectory the operator
 * chose — every documented path above is relative to wherever THAT is. So,
 * unlike `gitea`'s `normalizeBaseUrl`, this one keeps the URL's path rather
 * than collapsing to a bare origin; it only trims a trailing slash and
 * supplies a scheme when the operator pasted a bare host.
 *
 * A missing scheme defaults to `https`: an API key in flight deserves TLS,
 * and silently downgrading to `http://` would weaken the credential's
 * transport without being asked. An operator on a private network can still
 * type `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Sendy installation URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Sendy installation URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Sendy installation URL has no host: ${trimmed}`);
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

/** Read the installation origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as SendyConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Sendy connection records no installation URL — reconnect it so the URL can be stored",
  );
}

export type FormFields = Record<string, string | number | boolean | undefined | null>;

/**
 * Build an `application/x-www-form-urlencoded` body from an action's own
 * fields. `api_key` is never set here — the auth `sign` hook adds it to
 * whatever body the action already built, exactly as this pack's `mandrill`
 * app does for a JSON-body key (see `auth/api-key.ts`).
 */
export function buildForm(fields: FormFields): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    body.set(k, String(v));
  }
  return body.toString();
}

/**
 * POST to this connection's Sendy install and return the trimmed plain-text
 * body. Never sets `api_key` — the `sign` hook does that.
 */
export async function sendyPost(
  ctx: HookContext,
  path: string,
  fields: FormFields,
): Promise<string> {
  const base = baseUrlFromConnection(ctx.connection);
  const res = await ctx.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: buildForm(fields),
  });
  const text = (await res.text()).trim();
  if (!res.ok) {
    throw new Error(`Sendy ${path} returned HTTP ${res.status}: ${text}`);
  }
  return text;
}

/**
 * Same as {@link sendyPost}, for the two endpoints (`get-lists.php`,
 * `get-brands.php`) documented as answering JSON on success. A body that
 * fails to parse is one of Sendy's documented plain-text errors instead.
 */
export async function sendyPostJson<T>(
  ctx: HookContext,
  path: string,
  fields: FormFields,
): Promise<T> {
  const text = await sendyPost(ctx, path, fields);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Sendy ${path} did not return the documented JSON: ${text}`);
  }
}

/** Throw unless `text` is exactly one of the endpoint's documented success strings. */
export function expectSuccess(path: string, text: string, successValues: readonly string[]): void {
  if (!successValues.includes(text)) {
    throw new Error(`Sendy ${path} failed: ${text}`);
  }
}
