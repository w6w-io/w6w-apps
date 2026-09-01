import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Mollie API key — `Authorization: Bearer <key>`.
 *
 * Verified against `docs.mollie.com/reference/authentication` (the security
 * scheme embedded there is `{"type": "http", "scheme": "bearer"}`) and live
 * probes against `api.mollie.com` on 2026-09-01.
 *
 * Mollie's own docs describe **four** authentication methods: API keys
 * (default, per website-profile), Advanced Access Tokens (organization-wide,
 * optionally scoped to a mode/profile), App Access Tokens via OAuth (acting
 * on behalf of a connected merchant), and HTTP Basic for the OAuth token
 * endpoint itself. All three of the first are presented the same wire way —
 * `Authorization: Bearer <token>` — so one `bearer` Auth method covers a
 * plain API key, an Advanced Access Token, or a hand-obtained OAuth access
 * token; this app does not implement the OAuth authorization-code dance
 * itself. Mollie's own guidance is to start with an API key.
 *
 * ## `live_`/`test_` prefix, one API host
 *
 * An API key is either `live_...` (real money) or `test_...` (Mollie's test
 * mode, simulated payments only) — both against the *same* `api.mollie.com`
 * host; there is no separate sandbox origin. `afterConnect` below labels the
 * connection from this prefix alone (no network call needed) so a workflow
 * builder can tell at a glance which mode a connection is wired to.
 *
 * ## The docs promise 401; live traffic answers 400 — see `lib/client.ts`
 *
 * Every credential failure this app could provoke from the outside (missing
 * header, malformed header, syntactically-plausible-but-wrong key) answered
 * `400 Bad Request` / `"Invalid Authorization header"` on live probes against
 * `api.mollie.com/v2/profiles/me`, not the `401 Unauthorized Request` /
 * `"Missing authentication, or failed to authenticate"` the
 * `overview/handling-errors` guide page shows as its worked example. `test`
 * below classifies by the response body's `title`/`detail`, never by
 * assuming a fixed status code means one specific thing.
 */

export interface MollieCredential {
  apiKey: string;
}

/** The one place the wire format is built — `test` and `sign` share it. */
export function authHeader(credential: Partial<MollieCredential>): string {
  return `Bearer ${credential.apiKey ?? ""}`;
}

/**
 * `GET /v2/profiles/me` — the cheapest documented read that needs no
 * resource-level scope: it names the profile itself (id, name, status,
 * website, email) rather than any resource an Advanced Access Token might be
 * scoped away from, and — unlike a `GET /v2/payments?limit=1` list probe —
 * returns no payment data at all, so the health surface never stores a
 * customer's payment history just to answer "is this key live?".
 *
 * A standard API key is already scoped to exactly one profile, so this
 * always resolves without a `profileId` query param; an Advanced Access
 * Token spanning several profiles still resolves it to "the profile this
 * token defaults to".
 */
export const PROBE_PATH = "/profiles/me";

interface MollieErrorBody {
  status?: number;
  title?: string;
  detail?: string;
}

interface MollieProfile {
  id?: string;
  name?: string;
  status?: string;
  email?: string;
  website?: string;
}

const bearer: AuthDefinition = {
  key: "bearer",
  type: "bearer",
  displayName: "API Key",
  description:
    "Mollie Dashboard > Developers > API keys. Live keys (live_…) move real money; Test keys " +
    "(test_…) hit the same API host in Mollie's simulated test mode. An Advanced Access Token " +
    "or a hand-obtained OAuth access token also works here — all three present the same way, " +
    "as a bearer token.",
  connectionLabel: "Mollie ({{profileName}}, {{mode}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "live_… or test_…",
      hint: "Dashboard > Developers > API keys. Use a Test key while building a workflow.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    request.headers["authorization"] = authHeader(credential as Partial<MollieCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<MollieCredential>;
    if (!cred?.apiKey) {
      return { ok: false, message: "credential missing apiKey" };
    }

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: authHeader(cred) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as MollieErrorBody | null;
    const title = body?.title ?? "";
    const detail = body?.detail ?? "";

    if (res.status === 400 && /invalid authorization header/i.test(detail)) {
      return {
        ok: false,
        message: "Mollie rejected the Authorization header's shape (400 Invalid Authorization " +
          "header). This is what a missing, malformed, or plainly wrong-format key looks like " +
          "on live traffic, despite the docs describing this case as a 401 — reconnect this " +
          "connection with a key copied exactly from the Dashboard.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Mollie rejected the API key (401${
          title ? ` ${title}` : ""
        }). Check it has not been revoked or regenerated on the Dashboard.`,
      };
    }
    return {
      ok: false,
      message: `Mollie returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : title ? `: ${title}` : ""
      }`,
    };
  },

  /**
   * Label the connection from the key's own `live_`/`test_` prefix (no
   * network call) plus the profile name/status `test` already proved live.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MollieCredential>;
    const mode = cred?.apiKey?.startsWith("live_")
      ? "live"
      : cred?.apiKey?.startsWith("test_")
      ? "test"
      : "unknown mode";

    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", authorization: authHeader(cred ?? {}) },
      });
      if (!res.ok) return { mode, profileName: "unknown profile" };
      const profile = await res.json() as MollieProfile;
      return {
        mode,
        profileName: profile.name ?? "unknown profile",
        profileId: profile.id,
        profileStatus: profile.status,
      };
    } catch {
      return { mode, profileName: "unknown profile" };
    }
  },
};

export default bearer;
