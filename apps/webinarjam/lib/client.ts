import type { HookContext } from "@w6w/types";
import type { Option } from "@w6w/types";

/**
 * WebinarJam / EverWebinar API client.
 *
 * Every host, path, request field and response shape here was verified on
 * 2026-09-05 against the vendor's own Help Center — the "Developer API"
 * collection at `support.webinarjam.com/en/collections/19655423-developer-api`,
 * which is a narrow, hand-written 17-article set (not an OpenAPI spec) — plus
 * live, unauthenticated probes against `api.webinarjam.com` confirming the host,
 * the path shape and the error envelope. Nothing here came from a marketing page
 * or a third-party integration directory.
 *
 * ## One host, two product prefixes, one credential
 *
 * WebinarJam (live webinars) and EverWebinar (automated, scheduled replays) are
 * the same vendor's two products, and the docs are explicit that **API access
 * is approved once and shared**: "Once approved, your API access is valid for
 * both WebinarJam and EverWebinar. Only one set of API keys is generated per
 * account." Both products expose the identical five endpoints, verified
 * field-for-field against the docs' own example requests/responses — only the
 * path prefix differs (`/webinarjam/…` vs `/everwebinar/…`), both under the
 * single host `https://api.webinarjam.com`. That is why this app is one
 * Connection with a `product` selector per action rather than two apps or ten
 * near-duplicate actions.
 *
 * ## Every call is POST, and the credential lives in the form body
 *
 * The docs state `Method: POST` for every one of the five endpoints, including
 * the two that only *read* data — there is no GET in this API at all. The
 * credential is an ordinary `api_key` form field, sent
 * `application/x-www-form-urlencoded` (the docs' own curl examples use
 * `--data`, curl's default encoding) — never a header, never a query
 * parameter. `auth/api-key.ts`'s `sign` hook merges `api_key` into whatever
 * form body the action already built, exactly the shape this pack already uses
 * for Pushover's body-carried token (`../pushover/auth/app-token.ts`).
 *
 * ## The error envelope, confirmed LIVE (the docs never show one)
 *
 * The Help Center articles document success responses in detail but never show
 * a failure body. Probed live 2026-09-05 with no credential and with an
 * obviously invalid one:
 *
 * ```
 * POST /webinarjam/webinars  (no api_key)      -> 400 {"status":"error","errors":{"api_key":["The api key field is required."]}}
 * POST /webinarjam/webinars  (api_key=deadbeef…) -> 401 {"status":"error","errors":{"api_key":"You must specify a valid API key"}}
 * POST /webinarjam/webinar   (api_key=deadbeef…) -> 401 {"status":"error","errors":{"api_key":"You must specify a valid API key"}}
 * POST /everwebinar/webinars (api_key=deadbeef…) -> 401 {"status":"error","errors":{"api_key":"You must specify a valid API key"}}
 * ```
 *
 * Same envelope on both products and both failure paths: `{"status":"error",
 * "errors":{field: string | string[]}}`. `errors.api_key`'s value shape is
 * inconsistent (a bare string on one call, a one-element array on another) —
 * both are handled rather than assumed. This is the shape `formatWebinarJamError`
 * and the auth `test`/`sign` hooks classify against; no credential material
 * appears in either observed body.
 *
 * ## A documented endpoint that could not be confirmed, and was left out
 *
 * "Get a list of countries and states/provinces" (article 15370147) gives
 * **two different, mutually inconsistent URLs**: the prose says
 * `https://api.webinarjam.com/api/webinarjam/countries` (an extra `/api/`
 * segment none of the other five endpoints have), while its own curl example
 * uses `https://api.webinarjamdev.com/api/webinarjam/countries` — a `dev` host
 * that answers nothing live and does not match the confirmed production host.
 * Per this app's own hard rule ("if a detail can't be confirmed, leave the
 * action out"), there is no `countries` action here.
 *
 * ## The registrants list's real shape is NOT what its own field table says
 *
 * The "Get a list of registrants and attendees" article's field table describes
 * a flat object (`webinar`/`schedule`/`signup_date`/`attended_live`/… all typed
 * as `integer`). The article's own "Example return" is a screenshot, not text,
 * and it shows something structurally different: a Laravel-style paginator
 * (`{"registrants":{"current_page":1,"data":[…]}}`), with `webinar` and
 * `schedule` as formatted STRINGS ("WebinarJam Test Webinar", "Fri, 31 Oct
 * 2025, 12:00 PM") rather than integers, extra fields the table never lists
 * (`id`, `lead_id`, `event_id`, `event`, `links.{live_room,replay_room,
 * unsubscribe}`), and boolean-shaped fields rendered as `"Yes"`/`"No"` strings.
 * The EverWebinar equivalent (article 15370157) shows the identical shape.
 * `RegistrantRow` below is modelled on the screenshot, the only example that is
 * an actual captured response rather than a stale hand-written table.
 */

export const BASE_URL = "https://api.webinarjam.com";

/** The two products this API serves, sharing one host and one credential. */
export type Product = "webinarjam" | "everwebinar";

export const PRODUCT_OPTIONS: Option[] = [
  { value: "webinarjam", label: "WebinarJam (live)" },
  { value: "everwebinar", label: "EverWebinar (automated replay)" },
];

/** The vendor's envelope. `errors` values are inconsistently a string or a one-element array. */
export interface WebinarJamEnvelope {
  status?: "success" | "error";
  errors?: Record<string, string | string[]>;
  [key: string]: unknown;
}

/**
 * Encode a form body the way this API reads one.
 *
 * Arrays are sent PHP/Laravel-bracket style (`key[]=a&key[]=b`) — the shape the
 * "pass custom field values" article documents for a Dropdown field with
 * multiple selected answers (`"whereDidYouHearAboutUs": ["id_1","id_2"]`), and
 * consistent with the registrants list's own Laravel-paginator response shape.
 * Booleans render as `"1"`/`"0"`, matching `twilio_consent`'s documented values.
 */
export function encodeForm(fields: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        params.append(`${key}[]`, String(item));
      }
    } else if (typeof value === "boolean") {
      params.append(key, value ? "1" : "0");
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

/** Keep an error message readable — a validation body can carry several fields. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/**
 * Turn the vendor's error envelope into one actionable line.
 *
 * `errors` is field -> message(s); both the bare-string and array shapes
 * observed live are handled. A 429 gets the vendor's own documented ceiling
 * appended, because "back off and retry" is the one thing worth adding that
 * the envelope itself never states.
 */
export function formatWebinarJamError(
  status: number,
  path: string,
  body: WebinarJamEnvelope | null,
  raw: string,
): string {
  if (!body?.errors) return `WebinarJam ${status} for ${path}: ${truncate(raw)}`;
  const parts = Object.entries(body.errors).map(([field, message]) =>
    `${field}: ${Array.isArray(message) ? message.join(", ") : message}`
  );
  const suffix = status === 429
    ? " — WebinarJam allows at most 20 API calls/second per account; back off and retry."
    : "";
  return truncate(`WebinarJam ${status} for ${path}: ${parts.join("; ")}${suffix}`, 1000);
}

export class WebinarJamClient {
  constructor(private ctx: HookContext) {}

  /**
   * POST `https://api.webinarjam.com/{product}{path}`, form-urlencoded.
   *
   * `unsubscribe` answers `204 No Content` on success (the docs state this
   * explicitly), which this returns as `undefined` rather than trying to parse
   * an empty body as JSON.
   */
  async request<T = WebinarJamEnvelope>(
    product: Product,
    path: string,
    form: Record<string, unknown> = {},
  ): Promise<T> {
    const url = `${BASE_URL}/${product}${path}`;
    const res = await this.ctx.fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: encodeForm(form),
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let body: WebinarJamEnvelope | null = null;
    try {
      body = text ? JSON.parse(text) as WebinarJamEnvelope : null;
    } catch { /* not JSON — formatWebinarJamError falls back to the raw text */ }

    if (!res.ok) throw new Error(formatWebinarJamError(res.status, url, body, text));
    if (body?.status === "error") {
      throw new Error(formatWebinarJamError(res.status, url, body, text));
    }
    if (!body) throw new Error(`WebinarJam returned an unreadable body for ${url}`);
    return body as T;
  }
}
