import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Bitrix24's CRM REST API — verified against `apidocs.bitrix24.com` 2026-09-06:
 * `api-reference/crm/leads/*`, `api-reference/crm/contacts/*`,
 * `api-reference/crm/deals/*`, `api-reference/common/users/profile.html`,
 * `api-reference/common/system/method-get.html` and `error-codes.html`.
 *
 * ## There is no fixed API host
 *
 * Bitrix24 is sold both as a shared SaaS product (`https://<company>.bitrix24.com`)
 * and as on-premise/enterprise software ("Bitrix24 Box") on a fully custom domain.
 * Every customer's install — "portal" in Bitrix24's own terminology — is its own
 * address with its own database, exactly like `gitea`, `mautic`, `tableau` and
 * `bubble` in this pack. So the portal URL is a connection field, not a fixed
 * hostname, and the egress allowlist is `["*"]`.
 *
 * ## Auth is a URL, not a header
 *
 * The simplest way in — an "inbound webhook" created from a portal's own
 * Settings → Developer resources → Other → Inbound webhook (or newer UIs'
 * Applications → Webhooks) — is not a token you attach to a request. It IS a
 * URL: `https://<portal>/rest/<user_id>/<webhook_code>/`, and calling a method
 * means appending its name (`.../crm.lead.add`). The `<user_id>/<webhook_code>`
 * segment carries the same authority a bearer token would — whoever has it can
 * act as the user who created it, scoped to whatever permissions were granted
 * at creation — so it is handled exactly like a secret: **only `sign` ever
 * assembles the full URL.** Actions build a public, secret-free URL against
 * the portal's own address (`{base}/rest/{method}`), and `sign` splices the
 * `<user_id>/<webhook_code>` segment into the path — the same "auth lives in
 * the URL, not a header" shape as an `apiKey` field with `in: "query"`, just
 * one path segment deeper. This is verified against every method page's own
 * "cURL (Webhook)" example, which is identical across `crm.lead.add`,
 * `crm.contact.add`, `crm.deal.add`, `profile`, and every list/get/update/
 * delete method checked while building this app.
 *
 * OAuth2 (the alternative Bitrix24 documents — "cURL (OAuth)": the same
 * `{base}/rest/{method}` URL, with the access token passed as `"auth"` in the
 * JSON body instead of the path) is NOT implemented here. It requires
 * registering a local application in the portal's Developer Resources and
 * running a full authorization-code exchange per portal; the webhook method
 * needs none of that and covers the same CRM surface, so only it is built.
 *
 * ## HTTP 200 is not proof of success
 *
 * Bitrix24's own error-codes page states the rule directly: "it is necessary
 * to analyze the HTTP status of the response OR the presence of a specific
 * JSON structure in the response" — `{"error": "...", "error_description":
 * "..."}`. Every method page's documented statuses (`NO_AUTH_FOUND` → 401,
 * `INVALID_REQUEST` → 400, etc.) suggest the error body normally rides a
 * matching non-2xx status, but the vendor's own docs name the JSON shape as
 * the thing to check, not the status code, so `Bitrix24Client.call` inspects
 * the body on every response — including a 200 — before trusting it.
 */

/** Public (redacted-safe) connection metadata. */
export interface Bitrix24ConnectionDisplay {
  /** The portal's own root, e.g. `https://mycompany.bitrix24.com`. */
  portalUrl?: string;
}

/**
 * Normalise a user-typed Bitrix24 portal URL: a bare hostname, a full
 * `.../rest/1/xxxx/` webhook URL pasted by mistake, or a trailing slash should
 * all resolve to the bare origin Bitrix24's own docs show as `**put_your_
 * bitrix24_address**`.
 */
export function normalizePortalUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Bitrix24 portal URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Bitrix24 portal URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Bitrix24 portal URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the portal's own root off the redacted Connection. Never touches the credential. */
export function portalUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as Bitrix24ConnectionDisplay;
  if (display.portalUrl) return normalizePortalUrl(display.portalUrl);
  throw new Error(
    "this Bitrix24 connection records no portal URL — reconnect it so the URL can be stored",
  );
}

/**
 * Bitrix24's one documented error shape (`error-codes.html`), used both for
 * system errors (bad auth, rate limit) and per-method "possible errors".
 * Neither field has ever been observed echoing the webhook code or any other
 * credential material — unlike, say, Bubble's undocumented `translation`
 * field — but responses are still read defensively: `error_description` is
 * vendor prose, never something this app constructs from the request.
 */
export interface Bitrix24ErrorBody {
  error?: string;
  error_description?: string;
}

/** Extracts a safe-to-display message from a parsed Bitrix24 error body. */
export function safeErrorMessage(body: Bitrix24ErrorBody | null | undefined): string | undefined {
  if (!body || typeof body !== "object" || typeof body.error !== "string") return undefined;
  return body.error_description ? `${body.error}: ${body.error_description}` : body.error;
}

/** Parse a response body as JSON, returning `undefined` (not `null`) when it is not JSON. */
async function parseBody(res: Response): Promise<{ text: string; parsed: unknown }> {
  const text = await res.text().catch(() => "");
  if (!text) return { text, parsed: null };
  try {
    return { text, parsed: JSON.parse(text) };
  } catch {
    return { text, parsed: undefined };
  }
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function parseJson(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Bitrix24's "multiple" field shape (`crm_multifield` — `PHONE`, `EMAIL`,
 * `WEB`, `IM`): an array of `{VALUE, VALUE_TYPE}`, confirmed against
 * `crm.lead.add`'s own example (`"PHONE":[{"VALUE":"555888","VALUE_TYPE":
 * "WORK"}]`). Wraps a single convenience string param into that shape;
 * returns `undefined` when the value is empty so it is dropped by `compact`.
 */
export function toMultifield(
  value: string | undefined,
  valueType = "WORK",
): Array<{ VALUE: string; VALUE_TYPE: string }> | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed ? [{ VALUE: trimmed, VALUE_TYPE: valueType }] : undefined;
}

/** The parsed shape of a `crm.*.list` response. */
export interface ListResult<T> {
  result: T[];
  total: number;
  next?: number;
}

/**
 * Thin wrapper over `ctx.fetch`, scoped to one connection's portal. Every
 * call is a `POST` with a JSON body, per every method page's own example —
 * Bitrix24 accepts GET for some methods too, but POST works uniformly and
 * avoids URL length limits on a large `fields`/`filter` payload. Never sets
 * the webhook's `user_id`/`webhook_code` segment — the runtime routes every
 * request through the auth `sign` hook, which splices it into the path.
 */
export class Bitrix24Client {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = portalUrlFromConnection(ctx.connection);
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.base}/rest/${method}`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const { text, parsed } = await parseBody(res);

    // Bitrix24 can answer any status — including 200 — with an {error, error_description}
    // body instead of {result}. Check the body shape first, never trust the status alone.
    const errBody = parsed && typeof parsed === "object" && "error" in (parsed as object)
      ? (parsed as Bitrix24ErrorBody)
      : null;
    if (errBody) {
      throw new Error(
        `Bitrix24 ${method} failed: ${safeErrorMessage(errBody) ?? "unknown error"}`,
      );
    }
    if (!res.ok) {
      throw new Error(
        `Bitrix24 ${res.status} for ${method}: ${text ? text.slice(0, 500) : res.statusText}`,
      );
    }
    if (parsed === undefined || parsed === null || typeof parsed !== "object") {
      throw new Error(`Bitrix24 ${method} returned an unexpected body`);
    }
    return parsed as T;
  }

  /** A method whose response is `{result: T, time: {...}}`. Returns `result` directly. */
  async call<T = unknown>(method: string, body: Record<string, unknown> = {}): Promise<T> {
    const { result } = await this.request<{ result: T }>(method, body);
    return result;
  }

  /** A `crm.*.list` method — response also carries `total` and, when paged, `next`. */
  async callList<T = unknown>(
    method: string,
    body: Record<string, unknown> = {},
  ): Promise<ListResult<T>> {
    return await this.request<ListResult<T>>(method, body);
  }
}
