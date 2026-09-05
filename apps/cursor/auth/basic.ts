import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * A Cursor Admin API key, sent as HTTP Basic with the key as the **username**
 * and an **empty password** — verified against `cursor.com/docs/api#basic-authentication`
 * (2026-09-05): `curl https://api.cursor.com/teams/members -u YOUR_API_KEY:`.
 *
 * ## Scoped keys, and why `admin:*` is the one this app needs
 *
 * Cursor API keys carry scopes (`admin:*`, `models:read`, `models:*`, generic
 * `read:*`, …). The doc states the requirement explicitly only for the
 * model-access routes ("Reads require `models:read`/`models:*`. Writes
 * require `models:*`. Keys with `admin:*` work for both. Generic `read:*`
 * keys cannot call these routes") and separately names `admin:*` as the
 * "Required scope" for the Admin API and AI Code Tracking API in the key-setup
 * walkthrough. Every action in this app therefore expects an `admin:*` key —
 * a narrower `models:*` key will authenticate but be refused (403) on every
 * non-model-access action.
 *
 * ## Key format
 *
 * Documented as `crsr_` followed by a long hex string. Not enforced with a
 * `pattern` here: the doc gives one example, not a stated invariant, and a
 * wrong regex would reject a legitimately-formatted future key.
 */

export interface CursorCredential {
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` cannot drift apart. */
export function authHeader(apiKey: string): string {
  // The key is the username; the password is empty — a colon with nothing
  // after it, easy to get wrong by omitting the colon entirely.
  return `Basic ${btoa(`${apiKey}:`)}`;
}

const basicAuth: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "A Cursor Admin API key, sent as the Basic-auth username with an empty password. Create one " +
    "from Cursor Dashboard → API Keys with the admin:* scope.",
  connectionLabel: "Cursor ({{memberCount}} members)",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Cursor Dashboard → API Keys. Team administrators can create and manage keys there. " +
        "Give it the admin:* scope — every action in this app needs it.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<CursorCredential>;
    request.headers["authorization"] = authHeader(apiKey ?? "");
    return request;
  },

  /**
   * `GET /teams/members` — the doc's own first example, requires a credential,
   * and returns nothing secret: an array of `{id, name, email, role,
   * isRemoved}`.
   *
   * The doc's general error taxonomy (`docs/api#common-error-responses`)
   * documents `401 {"error": "Unauthorized", "message": "Invalid API key"}`
   * and `403 {"error": "Forbidden", "message": "..."}` — a valid key on the
   * wrong plan or with an insufficient scope. Both are classified from the
   * response body's own field, never guessed from the status code alone.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<CursorCredential>;
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/teams/members`, {
      headers: { accept: "application/json", authorization: authHeader(apiKey) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: string; message?: string; code?: string }
      | null;
    const detail = body?.message ?? body?.error ?? body?.code;

    if (res.status === 401) {
      return {
        ok: false,
        message: detail ??
          "Cursor rejected the API key. Check it was copied exactly and has not been revoked " +
            "from Cursor Dashboard → API Keys.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Cursor refused this key (403${detail ? `: ${detail}` : ""}). It may lack the ` +
          "admin:* scope, or the team may not be on a plan that includes the Admin API " +
          "(Business or Enterprise).",
      };
    }
    return { ok: false, message: `Cursor returned HTTP ${res.status} for GET /teams/members` };
  },

  /**
   * Publish only the team's member count, for `connectionLabel` — enough to
   * tell two Cursor connections apart without publishing anyone's name or
   * email into a display label.
   *
   * Silent on failure: `test` already established the key is live, and a
   * missing count must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as Partial<CursorCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/teams/members`, {
        headers: { accept: "application/json", authorization: authHeader(apiKey ?? "") },
      });
      if (!res.ok) return {};
      const body = await res.json() as { teamMembers?: unknown[] };
      const count = Array.isArray(body?.teamMembers) ? body.teamMembers.length : undefined;
      return count === undefined ? {} : { memberCount: count };
    } catch {
      return {};
    }
  },
};

export default basicAuth;
