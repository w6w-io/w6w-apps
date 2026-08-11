import type { AuthDefinition } from "@w6w/types";
import { type AircallErrorBody, API_BASE, V1 } from "../lib/client.ts";

/**
 * API ID + API Token (`basic`) — the scheme an Aircall **customer** uses against
 * their own account.
 *
 * Verified against Aircall's reference ("Basic Auth ﹣ Aircall customers",
 * fetched 2026-08-11) and confirmed on the wire the same day.
 *
 * The reference is explicit about the wire format: "Public API requests must be
 * authenticated using HTTP Basic Authentication. The `api_id` is the username
 * and the `api_token` is the password... The `api_id` and `api_token` are
 * concatenated with a single colon `:`. The resulting string is encoded using
 * Base64. The authorization header results in `Authorization: Basic
 * YOUR_ENCODED_STRING`."
 *
 * It is equally explicit about the form this app must NOT use: Aircall also
 * accepts `https://api_id:api_token@api.aircall.io`, and warns "It is not
 * recommended to authenticate requests passing the api_id and api_token in the
 * URL for security reasons". A workflow host logs request URLs; it does not log
 * request headers. So the credential only ever reaches the wire as a header,
 * built in exactly one place — {@link basicHeader} — and no Action can express
 * the URL form because no Action gets to build a host.
 *
 * ## Why both halves are `type: "secret"`
 *
 * Basic auth has no notion of a public username: `base64(api_id:api_token)` is
 * one credential and half of it is still credential material. Aircall
 * underlines this for the other half — "Do not forget to copy/paste your
 * api_token somewhere safe, we won't be able to retrieve it for you as Aircall
 * does not store it in plain text!" — so a lost token cannot be recovered, only
 * replaced.
 *
 * ## OAuth is deliberately absent
 *
 * Aircall's other scheme, OAuth 2.0 (`dashboard.aircall.io/oauth/authorize` →
 * `POST /v1/oauth/token`, single scope `public_api`, non-expiring bearer), is
 * fully documented but is **not implementable from here**: it needs a
 * `client_id`/`client_secret` that Aircall issues by hand after a partner
 * application ("Click the start building button on top of the page and fill in
 * the form. We will get back to you shortly"), and that application requires an
 * `install_uri` — a partner-hosted page Aircall opens inside the Dashboard —
 * which is a hosting commitment, not a config value. Declaring an `oauth2`
 * method with placeholder client credentials would produce a Connection that
 * cannot complete. See the README.
 *
 * Both schemes hit the same endpoints, so nothing in `actions/` would change if
 * OAuth is added later; only this directory would grow a file.
 */

export interface AircallCredential {
  apiId: string;
  apiToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is how a probe ends up
 * sending a header the real requests do not.
 */
export function basicHeader(credential: Partial<AircallCredential>): string {
  return `Basic ${btoa(`${credential.apiId ?? ""}:${credential.apiToken ?? ""}`)}`;
}

/**
 * The credential-liveness probe: `GET /v1/ping`.
 *
 * Chosen by measuring the wire on 2026-08-11, not by its name — a purpose-built
 * ping is exactly the endpoint most likely to be a public liveness check that
 * proves nothing about a credential.
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `401 {"message":"Unauthorized"}`; with a syntactically plausible but fake
 * `api_id`/`api_token` pair it answers `403 {"message":"Forbidden"}`. Both
 * measured live. So a Connection whose credential never got attached fails here
 * rather than sailing through — the failure mode that makes ElevenLabs'
 * `/v1/voices` and Apify's `/v2/store` unusable as probes.
 *
 * **(b) It returns no credential material.** The documented — and only —
 * success body is `{"ping": "pong"}`. Compare the two obvious alternatives:
 * `GET /v1/webhooks` returns every webhook's `token`, the shared secret a
 * receiver verifies deliveries with, and `GET /v1/company` returns the
 * company's name and headcount. Neither belongs in a health record that is
 * stored and re-rendered on every check.
 *
 * **(c) There is no scope it could be short of.** Aircall's OAuth surface has
 * exactly one scope, `public_api`, and a Basic API key is company-wide with no
 * per-resource restriction documented anywhere in the reference. So unlike
 * Shopify's `/products.json` or HubSpot's contacts read, this probe cannot
 * report a legitimately-narrow credential as broken.
 *
 * It also costs one of the company's 120 requests/minute, which is why
 * `health/quota.ts` reads its rate-limit headers rather than spending a second
 * call.
 */
export const PROBE_PATH = "/ping";

/**
 * Why `GET /v1/webhooks` is not the probe — kept as an exported constant so the
 * reason survives the next person who wants a probe that also proves list
 * access works.
 */
export const WHY_NOT_WEBHOOKS =
  "GET /v1/webhooks returns each webhook's `token`, the shared secret a receiver " +
  "authenticates Aircall's deliveries with";

/**
 * Classify a failed probe from the **body**, never from the status code alone.
 *
 * Aircall makes the distinction unusually cheap and unusually easy to invert:
 *
 *  - **401** comes from the AWS edge and means *no `Authorization` header
 *    arrived*. The credential did not reach the request.
 *  - **403** means *the `api_id`/`api_token` pair was rejected*. Aircall's own
 *    per-endpoint status tables say so in as many words — "Forbidden. Invalid
 *    API key or Bearer access token" — and the global error table glosses 403 as
 *    "Lack of valid authentication credentials for the target resource". Reading
 *    it the conventional way ("authenticated, but not permitted") would report a
 *    dead credential as a working one with a scope problem.
 *
 * Exported and pure so both readings are pinned by a test rather than by a
 * comment.
 */
export function classifyProbe(status: number, body: AircallErrorBody | null): string {
  const vendor = [body?.error, body?.troubleshoot, body?.message]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join(": ");
  if (status === 401) {
    return "Aircall received no Authorization header (401 " +
      `${vendor || "Unauthorized"}). The credential did not reach the request — reconnect this ` +
      "connection.";
  }
  if (status === 403) {
    return `Aircall rejected the API ID / API token pair (403 ${vendor || "Forbidden"}). ` +
      "Aircall answers 403 for an invalid credential, not for a missing permission — re-copy " +
      "both halves from Dashboard > Company Settings > API Keys, or issue a new key.";
  }
  if (status === 429) {
    return "Aircall rate-limited the check (429). The limit is 120 requests/minute per company " +
      "and is shared with every other integration on this account, so this says nothing about " +
      "the credential itself.";
  }
  if (status >= 500) {
    return `Aircall returned ${status} for ${PROBE_PATH}${vendor ? `: ${vendor}` : ""}. ` +
      "That is a server-side failure, not a verdict on the credential.";
  }
  return `Aircall returned ${status} for ${PROBE_PATH}${vendor ? `: ${vendor}` : ""}.`;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API ID & API Token",
  description:
    "Both halves of an API key from Dashboard > Company Settings > API Keys. Sent as the HTTP " +
    "Basic username and password.",
  fields: [
    {
      key: "apiId",
      label: "API ID",
      type: "secret",
      required: true,
      row: "creds",
      hint:
        "The `api_id` half, used as the Basic username. Aircall shows it beside the token when the " +
        "key is created.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint:
        "The `api_token` half, used as the Basic password. Aircall does not store it in plain " +
        "text and cannot show it again — if it was not copied at creation time, issue a new key.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns. The credential never appears in a URL.
   */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<AircallCredential>);
    return request;
  },

  /** See {@link PROBE_PATH} for why `/v1/ping` and not a whoami or a list. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<AircallCredential>;
    const apiId = (cred?.apiId ?? "").trim();
    const apiToken = (cred?.apiToken ?? "").trim();
    if (!apiId || !apiToken) return { ok: false, message: "credential missing apiId or apiToken" };

    const res = await ctx.fetch(`${API_BASE}${V1}${PROBE_PATH}`, {
      headers: {
        accept: "application/json",
        authorization: basicHeader({ apiId, apiToken }),
      },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as AircallErrorBody | null;
    return { ok: false, message: classifyProbe(res.status, body) };
  },
  /**
   * There is no `afterConnect`, and that is deliberate.
   *
   * The natural label for an Aircall connection is the company name, from
   * `GET /v1/company` — which also returns `users_count` and `numbers_count`.
   * That is headcount and infrastructure size for the customer's whole
   * organisation, published into Connection display metadata that every Action
   * can read and every UI renders. It is not credential material, so this is a
   * softer call than Mailjet's, but it is a lot of information to copy out of an
   * account just to avoid a list of Connections all reading "Aircall".
   *
   * Aircall exposes no narrower identity read: there is no `/v1/me`, and
   * `/v1/ping` returns `{"ping": "pong"}` with nothing to name a connection by.
   * Given the choice between an unlabelled Connection and publishing an org's
   * headcount, this app takes the unlabelled one; a user who wants the company
   * name can call the `company-get` Action, where it is a step's explicit output
   * rather than ambient metadata.
   */
};

export default basic;
