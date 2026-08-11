import type { AuthDefinition } from "@w6w/types";
import { apiBase, type DatadogSite, siteById, siteOptions } from "../lib/sites.ts";
import { datadogErrorMessages } from "../lib/client.ts";

/**
 * Datadog keys — `DD-API-KEY`, optionally plus `DD-APPLICATION-KEY`, against one
 * chosen site.
 *
 * Verified against Datadog's `components.securitySchemes` in both OpenAPI
 * documents and live probes against `api.datadoghq.com`, 2026-08-11.
 *
 * ## Why one method with an optional second key, and not two methods
 *
 * Datadog's two keys are not two ways of authenticating. They are one
 * credential with two halves, and each *operation* declares which halves it
 * needs, in the vendor's own `security` block:
 *
 *  - `[{apiKeyAuth: []}]`              — API key alone. `GET /api/v1/validate`,
 *    `POST /api/v2/series`, `POST /api/v1/events`.
 *  - `[{apiKeyAuth, appKeyAuth}, …]`   — both. Every read in this app.
 *
 * An organization-wide API key is often all a deploy pipeline is given, and it
 * is genuinely enough to submit metrics and events. Demanding an application key
 * anyway would lock that user out of the two Actions they actually came for. So
 * the application key is **optional**, `sign` stamps it only when present, and
 * `test` reports exactly what the Connection can do. `index.ts` groups the two
 * submission Actions apart from the reads for the same reason.
 *
 * ## The site is part of the credential
 *
 * A key pair exists in exactly one site's organization. There is no discovery
 * endpoint that reveals which, and no redirect between sites — a US1 key
 * presented to `api.datadoghq.eu` is simply unknown there, and comes back as a
 * `403` indistinguishable from a revoked key. That is why `site` is a required
 * field here rather than an Action param, and why `afterConnect` republishes it
 * on `connection.display.site` for `lib/sites.ts` to read.
 *
 * ## Header, never the query parameter
 *
 * Datadog still documents `?api_key=` and `?application_key=` as
 * `apiKeyAuthQuery` / `appKeyAuthQuery`, both labelled **"Deprecated"** in the
 * spec. This app only ever uses the headers. A workflow host logs request URLs;
 * it does not log request headers, and a key in a URL ends up in every proxy log
 * between here and Datadog.
 */

export interface DatadogCredential {
  site: string;
  apiKey: string;
  appKey?: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 *
 * `DD-APPLICATION-KEY` is omitted rather than sent empty when the Connection has
 * no application key: Datadog treats a present-but-empty application key as a
 * rejected one (`403`), where an absent one correctly falls through to the
 * API-key-only endpoints.
 */
export function authHeaders(credential: Partial<DatadogCredential>): Record<string, string> {
  const headers: Record<string, string> = { "dd-api-key": (credential.apiKey ?? "").trim() };
  const appKey = (credential.appKey ?? "").trim();
  if (appKey) headers["dd-application-key"] = appKey;
  return headers;
}

/**
 * The API-key probe.
 *
 * `GET /api/v1/validate` is Datadog's own purpose-built credential check — the
 * whole endpoint is "Check if the API key (not the APP key) is valid" — and it
 * clears every bar this pack sets for a probe:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `403 {"errors":["Forbidden"]}`, measured on all nine site hosts.
 *
 * **(b) It echoes nothing.** Its entire response schema is
 * `{"valid": boolean}` — one field. Compare the traps this pack has already
 * hit: Mailjet's `/apikey`, Follow Up Boss's `/me` and ElevenLabs' `/v1/user`
 * all hand the caller's own credential back. Datadog has endpoints of exactly
 * that kind — `GET /api/v1/api_key`, `GET /api/v1/application_key` and
 * `GET /api/v2/current_user/application_keys` all return key material — and none
 * of them is reachable from this app at all.
 *
 * **(c) It needs no permission.** Application keys can be scoped
 * (`AuthZ` authorization scopes) and roles restrict what a user may read, so any
 * resource read is something a correctly-configured key may legitimately be
 * refused. `/api/v1/validate` is not a resource.
 *
 * **The verdict comes from the body, never the status.** See the table in
 * `lib/client.ts`: this endpoint answers a byte-identical `403` for a missing
 * key, a well-formed fake key and a garbage key, while every other Datadog
 * endpoint answers `401` for a missing credential. Only `200 {"valid": true}` is
 * informative, so only `200 {"valid": true}` is treated as a pass.
 */
export const VALIDATE_PATH = "/api/v1/validate";

/**
 * The application-key probe, run only when the Connection has one.
 *
 * `GET /api/v2/current_user` is the only endpoint in the covered surface whose
 * own documentation states "No additional permissions are required beyond valid
 * authentication", and its `security` block offers no `AuthZ` scope alternative
 * — meaning it is reachable by *any* valid key pair, including the most narrowly
 * scoped one. Every alternative (`GET /api/v2/users` needs `user_access_read`,
 * `GET /api/v1/monitor` needs `monitors_read`) would report a perfectly good,
 * deliberately-scoped application key as broken.
 *
 * It returns a user profile and role list. No key material: the endpoints that
 * return key material are `current_user/application_keys` and the two v1 key
 * endpoints, none of which this app touches.
 */
export const CURRENT_USER_PATH = "/api/v2/current_user";

/** What `test` reports back, so the shape is testable without the hook. */
export interface ProbeOutcome {
  ok: boolean;
  message?: string;
}

/** Turn a `/api/v1/validate` response into a verdict, from the body. */
export function readValidateResponse(
  status: number,
  body: unknown,
  site: DatadogSite,
): ProbeOutcome {
  const valid = (body as { valid?: unknown } | null)?.valid;
  if (status === 200 && valid === true) return { ok: true };
  if (status === 200) {
    // Documented but not observed: a 200 whose body says otherwise. Trusting the
    // status here is exactly the mistake this whole module is written against.
    return {
      ok: false,
      message: `${site.label} answered 200 but did not report the API key as valid.`,
    };
  }
  if (status === 403 || status === 401) {
    return {
      ok: false,
      message:
        `Datadog refused the API key at ${site.label} (${status}). Datadog answers an identical ` +
        "403 for a missing key and a wrong one, so check both: that the key was copied whole " +
        `from Organization Settings → API Keys, and that it belongs to ${site.label} rather ` +
        "than another Datadog site.",
    };
  }
  if (status === 429) {
    return {
      ok: false,
      message: `Datadog rate-limited the validation call at ${site.label} (429).`,
    };
  }
  return { ok: false, message: `Datadog returned HTTP ${status} for ${VALIDATE_PATH}.` };
}

/** Turn a `/api/v2/current_user` response into a verdict, from the body. */
export function readCurrentUserResponse(
  status: number,
  body: unknown,
  site: DatadogSite,
): ProbeOutcome {
  if (status === 200) {
    const type = (body as { data?: { type?: unknown } } | null)?.data?.type;
    if (type === "users") return { ok: true };
    return {
      ok: false,
      message: "Datadog answered 200 but did not return a user record — is this really Datadog?",
    };
  }
  const detail = datadogErrorMessages(typeof body === "string" ? body : JSON.stringify(body ?? ""));
  if (status === 401) {
    return {
      ok: false,
      message:
        "Datadog saw no credential on the application-key probe (401). The keys did not reach " +
        "the request — reconnect this connection.",
    };
  }
  if (status === 403) {
    return {
      ok: false,
      message:
        `Datadog refused the application key at ${site.label} (403${
          detail.length ? `: ${detail.join("; ")}` : ""
        }). An application key is bound to the user who created it and to one site — check it ` +
        `belongs to a user in your ${site.label} organization and has not been revoked in ` +
        "Organization Settings → Application Keys.",
    };
  }
  return { ok: false, message: `Datadog returned HTTP ${status} for ${CURRENT_USER_PATH}.` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  // `custom` rather than `apiKey`: `ApiKeyConfig` describes ONE header, and this
  // credential is two headers plus a site. Declaring `apiKey: {name: …}` would
  // have to name one of the two and would be a lie about the other.
  type: "custom",
  displayName: "API Key",
  description:
    "Paste an API key from Organization Settings → API Keys, and pick the Datadog site your " +
    "organization is on. Add an application key (Organization Settings → Application Keys) to " +
    "read monitors, dashboards, logs and metrics — without one, this connection can submit " +
    "metrics and events but cannot read anything.",
  connectionLabel: "Datadog {{org.name}} ({{site}})",
  fields: [
    {
      key: "site",
      label: "Datadog site",
      type: "select",
      required: true,
      default: "us1",
      options: siteOptions,
      hint: "The Datadog deployment your organization lives on. It is the domain in your Datadog " +
        "URL — `app.datadoghq.com` is US1, `app.datadoghq.eu` is EU1 — and it is the same value " +
        "as the `DD_SITE` environment variable. Keys from one site do not work on another.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Organization Settings → API Keys. Belongs to the organization, not to a person, and " +
        "authorizes metric, event and log submission.",
    },
    {
      key: "appKey",
      label: "Application Key",
      type: "secret",
      hint: "Organization Settings → Application Keys. Optional, and required for every read: " +
        "monitors, dashboards, logs, hosts, users and metric queries all need one. It carries " +
        "the permissions of the user who created it, so scope it to what these workflows read.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the two headers onto the outbound request and returns it. Neither key ever
   * enters a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<DatadogCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Two probes, because the credential has two halves and they fail
   * independently — a valid API key with a revoked application key is a
   * Connection that submits fine and cannot read a thing, and reporting it as
   * simply "connected" would send the user hunting through their workflow for a
   * fault that is in their credential.
   *
   * See {@link VALIDATE_PATH} and {@link CURRENT_USER_PATH} for why these two
   * endpoints, and `lib/client.ts` for why the verdict never comes from the
   * status code alone.
   */
  async test({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<DatadogCredential>;
    const site = siteById(cred.site);
    if (!site) {
      return {
        ok: false,
        message: cred.site
          ? `\`${cred.site}\` is not a Datadog site. Pick one of: ${
            siteOptions.map((o) => o.value).join(", ")
          }.`
          : "credential missing site",
      };
    }
    if (!(cred.apiKey ?? "").trim()) return { ok: false, message: "credential missing apiKey" };

    const base = apiBase(site);
    const headers = { accept: "application/json", ...authHeaders(cred) };

    const validateRes = await ctx.fetch(`${base}${VALIDATE_PATH}`, { headers });
    const validateBody = await validateRes.json().catch(() => null);
    const validated = readValidateResponse(validateRes.status, validateBody, site);
    if (!validated.ok) return validated;

    if (!(cred.appKey ?? "").trim()) {
      return {
        ok: true,
        message:
          "API key valid. No application key on this connection, so it can submit metrics and " +
          "events but every read action will be refused.",
      };
    }

    const userRes = await ctx.fetch(`${base}${CURRENT_USER_PATH}`, { headers });
    const userBody = await userRes.json().catch(() => null);
    return readCurrentUserResponse(userRes.status, userBody, site);
  },

  /**
   * Publish the site and the organization name — the two things a reader needs
   * to tell one Datadog Connection from another, and the site is additionally
   * load-bearing: it is how `lib/sites.ts` learns which host to address without
   * any Action seeing a credential.
   *
   * The site is published unconditionally and first, from the credential field
   * itself, so it survives even when the network call below fails. Getting that
   * backwards would leave a working EU1 connection quietly addressing US1.
   *
   * The org name comes from `GET /api/v2/current_user`'s `included` array. The
   * user's own name, email and MFA state are deliberately dropped: this labels
   * an integration, not a person, and a display block is rendered wherever the
   * Connection appears.
   */
  async afterConnect({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<DatadogCredential>;
    const site = siteById(cred.site);
    if (!site) return {};

    const display: Record<string, unknown> = { site: site.id, apiHost: site.apiHost };
    if (!(cred.appKey ?? "").trim()) return display;

    try {
      const res = await ctx.fetch(`${apiBase(site)}${CURRENT_USER_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return display;
      const body = await res.json() as {
        included?: Array<{ type?: string; id?: string; attributes?: { name?: string } }>;
      };
      const org = body?.included?.find((entry) => entry?.type === "orgs");
      if (org?.attributes?.name) {
        display.org = { name: org.attributes.name, publicId: org.id };
      }
    } catch {
      // A missing label must never fail a Connection whose keys `test` has
      // already proved live.
    }
    return display;
  },
};

export default apiKey;
