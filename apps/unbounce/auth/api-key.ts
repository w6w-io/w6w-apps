import type { AuthDefinition } from "@w6w/types";
import { ACCEPT_HEADER, API_BASE } from "../lib/client.ts";

/**
 * Unbounce API Key (`basic`) — HTTP Basic with the key as the **username** and
 * an **empty password**.
 *
 * Verified against the vendor's own getting-started guide
 * (`developer.unbounce.com/getting_started/#Authorization`, fetched 2026-08-30):
 * `curl -u API_KEY: -H "Accept: application/vnd.unbounce.api.v0.4+json" -X GET
 * https://api.unbounce.com`. A key is requested through Unbounce support and
 * then created in the app; once issued it authenticates as an **account
 * administrator** — the docs say plainly that "API keys currently act like
 * Unbounce account administrators", so there is no per-key scoping to reflect
 * here the way Apify or Ashby's tokens have.
 *
 * ## Two endpoints refuse this credential outright
 *
 * `DELETE /pages/{page_id}/leads/{lead_id}` and
 * `POST /pages/{page_id}/lead_deletion_request` are documented "NOTE: this
 * endpoint cannot be used with API keys (OAuth only)". Both actions still
 * exist in this app (see `../auth/oauth2.ts` for the credential that can
 * reach them) and say so in their own `description`, because failing that way
 * only at request time — with no scope system to explain it in advance — is
 * confusing without the warning up front.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "An Unbounce API key, sent as the Basic-auth username with an empty password. Acts as an " +
    "account administrator — Unbounce keys are not scoped to a narrower role. Two lead-deletion " +
    "endpoints are OAuth-only and will refuse this credential.",
  connectionLabel: "Unbounce ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Request API access with the email you use to log in, then create the key under " +
        "Manage Account → API Access.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps Basic auth and returns. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey?: string };
    request.headers["authorization"] = `Basic ${btoa(`${apiKey ?? ""}:`)}`;
    request.headers["accept"] ??= ACCEPT_HEADER;
    return request;
  },

  /**
   * `GET /users/self` — the documented "retrieve the current user" endpoint.
   * It requires a credential (measured unauthenticated: `401` plain text), it
   * is not resource-scoped (a key is never scoped narrower than admin anyway),
   * and its response — id, name, email, and the account/sub-account URLs the
   * key can see — carries the caller's own profile, never the key itself.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/users/self`, {
      headers: { accept: ACCEPT_HEADER, authorization: `Basic ${btoa(`${apiKey}:`)}` },
    });
    if (res.ok) return { ok: true };

    // Unbounce answers an auth failure as plain text, not the JSON shape the
    // rest of the reference implies — see lib/client.ts for why.
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: "Unbounce rejected this API key (401). Check it was copied exactly from " +
          "Manage Account → API Access and has not been revoked.",
      };
    }
    if (res.status === 403) {
      return { ok: false, message: "Unbounce refused this API key (403) for /users/self." };
    }
    return {
      ok: false,
      message: `Unbounce returned HTTP ${res.status} for /users/self` +
        (body ? `: ${body.slice(0, 200)}` : ""),
    };
  },

  /** Publishes the user's email for the connection label. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    try {
      const res = await ctx.fetch(`${API_BASE}/users/self`, {
        headers: { accept: ACCEPT_HEADER, authorization: `Basic ${btoa(`${apiKey ?? ""}:`)}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as { email?: string; first_name?: string; id?: string };
      if (!body?.email) return {};
      return { email: body.email, userId: body.id };
    } catch {
      return {};
    }
  },
};

export default apiKey;
