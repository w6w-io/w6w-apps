import type { HookContext } from "@w6w/types";

/**
 * Pushover API client.
 *
 * Every endpoint, parameter and limit here was verified on 2026-08-11 against
 * Pushover's own API documentation (`pushover.net/api`, a server-rendered page)
 * plus live probes against `api.pushover.net`.
 *
 * ## One fixed host, and only four endpoints
 *
 * Everything is under `https://api.pushover.net/1/`. Pushover is SaaS-only —
 * there is no self-hosted Pushover — so unlike most of the sibling apps in this
 * pack the manifest can name the single real host rather than widening to a
 * wildcard.
 *
 * ## Parameters go in the request BODY, not in headers
 *
 * This is the shape that makes Pushover unusual here. There is no
 * `Authorization` header: the application token and the user key are ordinary
 * form fields alongside `message`, posted as
 * `application/x-www-form-urlencoded`. The vendor is explicit about it — "No
 * complicated authentication mechanisms like OAuth are required".
 *
 * That would normally put the credential inside the Action, which this pack
 * forbids. It does not, because `SignableRequest` carries `body` as well as
 * `url` and `headers`: `auth/app-token.ts`'s `sign` hook parses the
 * form-encoded body the action built, injects `token` and `user`, and re-encodes
 * it. The actions never see either value, and the guard tests in
 * `tests/index.test.ts` enforce that.
 *
 * ## A failure can arrive as a 200, and a 4xx must never be retried
 *
 * Every response carries a `status` field: `1` means accepted, anything else
 * means rejected, with an `errors` array naming the offending parameters. The
 * vendor's guidance on retries is unusually direct and is worth quoting, because
 * it decides how the actions declare idempotency:
 *
 *   - 200 with `status: 1` — "your notification has been received and queued".
 *   - 4xx, or `status` other than 1 — "**repeating your same request will not
 *     work, no matter how many times you retry it**. Your input needs to be
 *     changed, you need to purchase additional message capacity … or you need to
 *     stop retrying."
 *   - 5xx — temporary; may be repeated, "but no sooner than 5 seconds from your
 *     last request".
 *
 * So a 4xx is a permanent, caller-fixable error and this client surfaces it as
 * such rather than as something worth another attempt.
 */

export const BASE_URL = "https://api.pushover.net";

/** Pushover's response envelope. Present on success and on failure alike. */
export interface PushoverResponse {
  status?: number;
  request?: string;
  errors?: string[];
  receipt?: string;
  [k: string]: unknown;
}

/**
 * The rate-limit headers Pushover puts on every message response.
 *
 * The vendor's note, kept because the names are misleading: "for historical
 * reasons, the headers refer to 'app' limits but this is now representing the
 * limit for the entire user or team."
 */
export interface PushoverLimits {
  limit?: number;
  remaining?: number;
  reset?: number;
}

export function limitsFromHeaders(headers: Headers): PushoverLimits {
  const num = (name: string) => {
    const raw = headers.get(name);
    if (raw === null) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    limit: num("x-limit-app-limit"),
    remaining: num("x-limit-app-remaining"),
    reset: num("x-limit-app-reset"),
  };
}

/** Keep an error message readable. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Render a Pushover failure as one actionable line.
 *
 * The `errors` array is the useful half — it names the parameters that were
 * wrong — and `request` is the id the vendor asks for when you contact them
 * ("please include this `request` parameter that our API returned so we can look
 * up your original request in our logs").
 *
 * The retry advice is included in the message because it is the vendor's own,
 * and because a 4xx here genuinely is permanent: repeating it cannot help.
 */
export function formatPushoverError(
  status: number,
  path: string,
  body: PushoverResponse | null,
  raw: string,
): string {
  if (!body) return `Pushover ${status} for ${path}: ${truncate(raw)}`;
  const errors = (body.errors ?? []).join("; ");
  const parts = [
    `Pushover ${status} for ${path}`,
    errors || "request rejected",
    body.request && `request ${body.request}`,
  ].filter(Boolean);
  const suffix = status >= 400 && status < 500
    ? " — Pushover rejects this permanently; retrying the same request cannot succeed."
    : "";
  return truncate(`${parts.join(": ")}${suffix}`, 1000);
}

/** Drop unset values and stringify the rest, ready for form encoding. */
export function toForm(fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
  }
  return out;
}

export interface RequestOptions {
  method?: "GET" | "POST";
  /** Form fields. Always sent url-encoded — as a body on POST, as a query on GET. */
  form?: Record<string, string>;
}

export class PushoverClient {
  constructor(private ctx: HookContext) {}

  /**
   * Make a request and return the parsed body.
   *
   * `sign` adds `token` (and, where the endpoint needs it, `user`) to whatever
   * this builds, so the actions supply everything *except* the credential.
   *
   * A GET carries its parameters in the query string and a POST in the body;
   * the credential lands in whichever of the two the request uses, which is why
   * `sign` has to look at both.
   */
  async request(path: string, options: RequestOptions = {}): Promise<PushoverResponse> {
    const method = options.method ?? "POST";
    const encoded = new URLSearchParams(options.form ?? {}).toString();

    const url = method === "GET" && encoded
      ? `${BASE_URL}${path}?${encoded}`
      : `${BASE_URL}${path}`;
    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (method === "POST") {
      headers["content-type"] = "application/x-www-form-urlencoded";
      init.body = encoded;
    }

    const res = await this.ctx.fetch(url, init);
    const text = await res.text();
    let body: PushoverResponse | null = null;
    try {
      body = text ? JSON.parse(text) as PushoverResponse : null;
    } catch { /* Pushover answers HTML for a few transport-level failures */ }

    if (!res.ok) throw new Error(formatPushoverError(res.status, path, body, text));

    // The 200 that means failure. Pushover's own guidance: "If we issue a 200
    // HTTP response and the status parameter in the JSON body is 1, your
    // notification has been received and queued." Anything else is a rejection,
    // whatever the status line said.
    if (body && body.status !== 1) {
      throw new Error(formatPushoverError(res.status, path, body, text));
    }
    if (!body) throw new Error(`Pushover returned an unreadable body for ${path}`);

    const limits = limitsFromHeaders(res.headers);
    return limits.remaining === undefined ? body : { ...body, limits };
  }
}
