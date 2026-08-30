import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, flattenMessage } from "../lib/client.ts";

/**
 * Teachable API key — a literal `apiKey` header, no prefix.
 *
 * Verified 2026-08-30 against `docs.teachable.com/docs/authentication` and live
 * probes against `developers.teachable.com`. The guide's own curl example is
 * `curl --header 'apiKey: YOURKEYHERE'` — not `Authorization`, not
 * `Bearer <token>`. A single key is scoped to the whole school; Teachable
 * documents no per-key permission scoping, so there is no "narrowest usable
 * key" concern the way Apify's scoped tokens raise one.
 *
 * ## The probe: `GET /v1/courses`, and why it is safe
 *
 * Requires a credential (measured live — see below), needs no special scope
 * (the school-wide key can always list its own courses), and its documented
 * response (`ListCoursesResponse`: course id/name/heading/description/
 * is_published/image_url, plus pagination `meta`) carries no credential
 * material. `per=1` keeps it cheap. Teachable has no whoami/`/me` endpoint in
 * this API at all, so there is no leaky-profile trap to avoid here the way
 * Apify's `/users/me` or Follow Up Boss's `/me` are.
 *
 * ## Two 401s, two different bodies — measured live
 *
 * No `apiKey` header at all:
 * `{"message": "No API key found in request", "request_id": "…"}`
 *
 * A syntactically-present but wrong key:
 * `{"message": "Invalid authentication credentials", "request_id": "…"}`
 *
 * Both are HTTP 401. The `message` text is what actually distinguishes "the
 * credential never reached the request" from "the credential is wrong", so
 * `test` reads it rather than trusting the status code alone.
 */

export interface TeachableCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` share it exactly. */
export function authHeaders(credential: Partial<TeachableCredential>): Record<string, string> {
  return { apikey: credential.apiKey ?? "" };
}

/** See the module doc for why this endpoint is the probe. */
export const PROBE_PATH = "/courses";

interface CoursesBody {
  courses?: Array<{ id?: number; name?: string }>;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste the API key from your Teachable school's Settings > API tab (school owners only). " +
    "The key grants full access to the school — Teachable does not offer scoped keys.",
  connectionLabel: "Teachable ({{schoolExample}})",
  apiKey: { in: "header", name: "apiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "School admin > Settings > API > Create API Key.",
    },
  ],

  /** The only hook handed the raw credential. Network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<TeachableCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and the two-body 401 note above. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TeachableCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}${API_PREFIX}${PROBE_PATH}?per=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: key }) } },
    );
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    let message: string | undefined;
    try {
      message = flattenMessage((JSON.parse(raw) as { message?: string | string[] }).message);
    } catch { /* not JSON */ }

    if (res.status === 401 && /no api key/i.test(message ?? "")) {
      return {
        ok: false,
        message:
          "Teachable received no apiKey header. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Teachable rejected the key (401${message ? `: ${message}` : ""}). Check it ` +
          "was copied exactly and has not been revoked in the school's Settings > API tab.",
      };
    }
    return {
      ok: false,
      message: `Teachable returned HTTP ${res.status} for ${PROBE_PATH}${
        message ? `: ${message}` : ""
      }`,
    };
  },

  /**
   * Teachable has no whoami endpoint, so there is nothing to label the
   * Connection with beyond a course name — read from the same probe response
   * rather than a second call. Silent on failure: `test` already established
   * the key is live, and a missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TeachableCredential>;
    try {
      const res = await ctx.fetch(
        `${API_BASE}${API_PREFIX}${PROBE_PATH}?per=1`,
        { headers: { accept: "application/json", ...authHeaders(cred) } },
      );
      if (!res.ok) return {};
      const body = await res.json() as CoursesBody;
      const first = body?.courses?.[0]?.name;
      return first ? { schoolExample: first } : { schoolExample: "connected" };
    } catch {
      return {};
    }
  },
};

export default apiKey;
