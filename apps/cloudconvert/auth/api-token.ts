import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * CloudConvert API key — `Authorization: Bearer <key>`.
 *
 * Verified against CloudConvert's own "Authentication" section
 * (`cloudconvert.com/docs/getting-started/introduction`, fetched 2026-08-29) and live
 * probes against `api.cloudconvert.com` the same day.
 *
 * ## Scoped keys are the documented norm, not an edge case
 *
 * A CloudConvert API key can be created with a subset of six independent scopes —
 * `user.read`, `user.write`, `task.read`, `task.write`, `webhook.read`, `webhook.write` —
 * and CloudConvert's own dashboard defaults to letting you pick them at creation time.
 * There is no "give me everything" ability distinct from checking all six, and critically
 * **no endpoint that works under every scope combination**: `/v2/users/me` needs
 * `user.read`, every job/task endpoint needs `task.read` or `task.write`, and every
 * webhook endpoint needs `webhook.read` or `webhook.write`. Unlike Apify (whose
 * `/v2/users/me/limits` sits outside every resource scope), CloudConvert has no
 * scope-agnostic ping.
 *
 * `task.read`/`task.write` is what nearly every action in this app actually needs — every
 * job and task action does, and `convert-url` (the app's centre of gravity) needs
 * `task.write` — so {@link PROBE_PATH} tests `task.read`. A key scoped to *only*
 * `webhook.*` or `user.*` will report broken here even though it may be doing exactly
 * what its owner intended; `test`'s message says so rather than presenting a bare
 * failure, per the guidance in `packages/apps/HEALTHCHECKS.md` "probe an endpoint the
 * narrowest usable credential can still reach" — there is no such endpoint here, so the
 * best available choice is disclosed rather than hidden.
 */

export interface CloudConvertCredential {
  apiKey: string;
}

/** The one place the wire format is built — `test` and `afterConnect` reuse it. */
export function authHeaders(credential: Partial<CloudConvertCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/jobs?per_page=1`.
 *
 * Chosen over the alternatives by reading the response, not the name:
 *
 *  - **`GET /v2/users/me`** needs `user.read`, which most task-oriented keys never grant,
 *    and this app's own `user-get` action is the only thing that needs it.
 *  - **`GET /v2/operations`** answers `200` with **no credential at all** — measured live
 *    on 2026-08-29 — so a Connection whose key never got attached would sail through a
 *    probe against it. The same trap as Apify's `/v2/store`.
 *  - **`GET /v2/jobs?per_page=1`** needs `task.read`, the scope nearly every action in
 *    this app depends on, and its response (a job list) carries no secret — a job's own
 *    fields are `id`, `tag`, `status` and timestamps, never a credential.
 *
 * `per_page=1` keeps the probe cheap on an account with a long job history; CloudConvert
 * does not rate-limit reads, only job/task *creation*, so this costs nothing against that
 * budget either.
 */
export const PROBE_PATH = "/jobs";

/**
 * Measured live on 2026-08-29: an unauthenticated `GET /v2/jobs` and one carrying a
 * syntactically-plausible but fake bearer token both answer the **identical**
 * `401 {"message":"Unauthenticated.","code":"UNAUTHENTICATED"}`. Unlike Apify's
 * `token-not-provided` vs `user-or-token-not-found`, CloudConvert does not tell a missing
 * credential apart from a wrong one, so `test` below does not try to either.
 */
export const UNAUTHENTICATED_CODE = "UNAUTHENTICATED";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from CloudConvert Dashboard > API Keys. A key scoped to only the " +
    "capabilities you need is fine — see the connection test message if a scoped key reports " +
    "as broken; it may simply lack task.read.",
  connectionLabel: "CloudConvert ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "CloudConvert Dashboard > API Keys > Create new API key. Grant task.read + " +
        "task.write for job/task actions, user.read for the account action, and webhook.read + " +
        "webhook.write for the webhook actions.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<CloudConvertCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint, and its documented limits. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CloudConvertCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?per_page=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey }) } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { message?: string; code?: string }
      | null;
    const code = body?.code;

    if (code === UNAUTHENTICATED_CODE || res.status === 401) {
      return {
        ok: false,
        message: "CloudConvert rejected the API key (401 UNAUTHENTICATED). Check it was copied " +
          "exactly and has not been revoked in Dashboard > API Keys.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `CloudConvert refused GET /v2/jobs (403${code ? ` ${code}` : ""}). This key may be ` +
          "valid but scoped away from task.read — most actions in this app need task.read " +
          "and/or task.write.",
      };
    }
    return {
      ok: false,
      message: `CloudConvert returned HTTP ${res.status} for ${PROBE_PATH}${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },

  /**
   * Publish the account's email for the connection label, and nothing else.
   *
   * `GET /v2/users/me` needs `user.read`, which a task-only key will not have — so a
   * failure here is deliberately silent: `test` already established the key works for
   * whatever it is scoped to, and a missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<CloudConvertCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/users/me`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { data?: { email?: string; username?: string } };
      const email = body?.data?.email;
      const username = body?.data?.username;
      if (!email) return {};
      return username ? { email, username } : { email };
    } catch {
      return {};
    }
  },
};

export default apiToken;
