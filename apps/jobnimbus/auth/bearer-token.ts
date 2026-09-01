import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * JobNimbus API Key — `Authorization: Bearer <token>`.
 *
 * Verified against JobNimbus's own Postman collection ("Getting Started" ->
 * "Authentication") and live probes against `app.jobnimbus.com` on 2026-09-01.
 *
 * ## Minting the key
 *
 * JobNimbus's own docs: log into JobNimbus, Settings > Integration Settings >
 * API tab > New API Key, pick or type an integration name, assign an "Access
 * Profile," and save — the token appears once under the Key column. There is
 * no OAuth surface; this static key is the entire authentication story, the
 * same mechanism JobNimbus's own catalogued integrations (BirdEye, CompanyCam,
 * Zapier, ...) use.
 *
 * ## Access Profiles scope the token, and that shapes the health probe
 *
 * A token's Access Profile decides which record types and settings it can
 * reach; JobNimbus's own support docs recommend "Full and Settings access"
 * for a token but do not require it. That is why {@link PROBE_PATH} reads
 * `/contacts` rather than an account/settings endpoint: Contacts is this
 * app's most basic CRM object and the one an integration's Access Profile is
 * least likely to have been scoped away from, where an account-settings read
 * would report a correctly-scoped but Contacts-only-denied token as broken.
 *
 * ## The literal casing in the vendor's own example
 *
 * JobNimbus's Postman collection writes the header value as `bearer <token>`
 * (lowercase scheme). This app sends `Bearer <token>` — the conventional
 * capitalization used elsewhere in this pack — because HTTP authentication
 * schemes are registered case-insensitively (RFC 7235 §2.1); both forms are
 * the same wire value to a spec-conformant server.
 */

export interface JobNimbusCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` share it exactly. */
export function authHeaders(credential: Partial<JobNimbusCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * `GET /contacts?size=1` — see the class doc above for why Contacts and not
 * an account/settings endpoint. `size=1` keeps the probe cheap; the response
 * is `{"count", "results"}`, which carries no credential material of any
 * kind — unlike, say, an endpoint that echoes account/profile fields back.
 */
export const PROBE_PATH = "/contacts";

const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API Key from JobNimbus Settings > Integration Settings > API. Assign it an " +
    "Access Profile that covers the record types this connection needs (Contacts, Jobs, " +
    "Tasks, Notes).",
  connectionLabel: "JobNimbus",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "JobNimbus > profile icon > Settings > Integration Settings > API > New API Key.",
    },
  ],

  /** The only hook handed the raw credential; runs network-less. */
  sign({ request, credential }) {
    const cred = credential as Partial<JobNimbusCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<JobNimbusCredential>;
    const apiKey = (cred?.apiKey ?? "").trim();
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?size=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey }) },
    });
    if (res.ok) return { ok: true };

    // JobNimbus's documented 401 shape is {"status":401,"body":"..."}, and it is
    // byte-identical whether the token is missing or merely wrong — there is no
    // finer-grained code to distinguish those cases from the response.
    const body = await res.json().catch(() => null) as { status?: number; body?: string } | null;
    const detail = body?.body;

    if (res.status === 401) {
      return {
        ok: false,
        message: `JobNimbus rejected the API Key (401${detail ? `: ${detail}` : ""}). Check it ` +
          "was copied exactly and has not been deleted in Settings > Integration Settings > API.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `JobNimbus refused the Contacts read (403${detail ? `: ${detail}` : ""}). The ` +
          "API Key's Access Profile may not include Contacts.",
      };
    }
    return {
      ok: false,
      message: `JobNimbus returned HTTP ${res.status} for ${PROBE_PATH}${
        detail ? `: ${detail}` : ""
      }`,
    };
  },
};

export default bearerToken;
