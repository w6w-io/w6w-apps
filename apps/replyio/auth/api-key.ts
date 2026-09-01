import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, WHOAMI_PATH } from "../lib/client.ts";

/**
 * Reply.io API key — `Authorization: Bearer <api key>`.
 *
 * Verified against `docs.reply.io/api-reference/authentication` and
 * `components.securitySchemes.bearerAuth` in the bundled OpenAPI document
 * (fetched 2026-09-01), plus live probes against `api.reply.io` the same day.
 *
 * ## Bearer, not a custom header
 *
 * Despite the field being called "API Key" in the Reply UI (Settings > API Key),
 * the wire format is a standard `Authorization: Bearer <key>` header — there is
 * no `X-Api-Key` alternative documented or observed.
 *
 * ## Scopes
 *
 * Every key carries a set of `domain:verb` scopes (`contacts:read`,
 * `sequences:operate`, …); `write` and `operate` each also satisfy a `read`
 * requirement in the same domain, and `domain:*` / `*:*` are wildcards. A key
 * scoped narrowly is a normal, supported configuration — this app must treat one
 * as healthy, not broken, which is why the probe below needs no scope at all.
 *
 * ## The probe is `/v3/whoami`, and it is safe by construction
 *
 * Reply's own docs single this endpoint out: "No scope required — any valid API
 * key can call this endpoint" and its response is documented as exactly
 * `{userId, username, teamId}` — account identifiers, never the key. Unlike
 * Follow Up Boss's `/me` or Mailjet's `/apikey`, there is no whoami-shaped trap
 * here: this really is the narrowest, safest possible liveness probe, and it
 * doubles as the `whoami-get` Action for the same reason.
 */

export interface ReplyCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<ReplyCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

interface WhoamiBody {
  userId?: number;
  username?: string;
  teamId?: number;
}

interface ProblemBody {
  title?: string;
  detail?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key from Reply.io > Settings > API Key. A key scoped to only the " +
    "domains this connection needs is fine, and recommended.",
  connectionLabel: "Reply.io ({{username}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Reply.io > Settings > API Key.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<ReplyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * See the module doc for why `/v3/whoami` is safe here.
   *
   * Reply's docs describe a 401 as an empty body with a `WWW-Authenticate`
   * header; a live probe on 2026-09-01 showed the API actually also returns an
   * `application/problem+json` body on 401. Both are handled: the body is
   * preferred when present, and the header is the fallback when it genuinely
   * isn't.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<ReplyCredential>;
    const token = (cred?.apiKey ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${WHOAMI_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: token }) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    const body = raw ? (JSON.parse(raw) as ProblemBody) : null;

    if (res.status === 401) {
      return {
        ok: false,
        message: body?.detail ?? body?.title ??
          (res.headers.get("www-authenticate")
            ? "Reply rejected the key (401, empty body, WWW-Authenticate: Bearer). Check it was " +
              "copied exactly and has not been revoked in Reply.io > Settings > API Key."
            : `Reply returned HTTP 401 for ${WHOAMI_PATH}`),
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "Reply rate-limited the credential check (429). Try again shortly.",
      };
    }
    return {
      ok: false,
      message: body?.detail ?? body?.title ??
        `Reply returned HTTP ${res.status} for ${WHOAMI_PATH}`,
    };
  },

  /**
   * Publish the account's username, so Connections list as more than "Reply.io".
   * `userId`/`teamId` are numeric account identifiers, not credential material —
   * safe to keep, unlike a proxy password or API key.
   *
   * Failure here is deliberately silent: `test` has already established the key
   * is live, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ReplyCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${WHOAMI_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as WhoamiBody;
      if (!body?.username) return {};
      return { username: body.username, userId: body.userId, teamId: body.teamId };
    } catch {
      return {};
    }
  },
};

export default apiKey;
