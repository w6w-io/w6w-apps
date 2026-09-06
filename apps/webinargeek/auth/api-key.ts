import type { AuthDefinition } from "@w6w/types";
import { API_URL, formatWebinarGeekError } from "../lib/client.ts";

/**
 * API Key (`apiKey`) — the only auth mode WebinarGeek's v2 API documents.
 *
 * The user copies a key from **WebinarGeek → account settings → Advanced → API**
 * (`https://app.webinargeek.com/admin/integrations/api`). Every request signs by attaching it
 * verbatim as an `Api-Token` header — WebinarGeek's own scheme, NOT `Authorization: Bearer`.
 *
 * ## The probe cannot tell "missing" from "wrong" apart, and says so
 *
 * `GET /account` — "Request information about the account linked to the API. The information is
 * derived from your API key" — is the narrowest usable probe: it needs no scope beyond the key
 * existing, and its response, `{"company": "...", "email": "..."}`, carries no credential
 * material of its own (unlike a `/me`-shaped endpoint elsewhere in this pack that echoes the
 * caller's own key back).
 *
 * Verified live 2026-09-06: an ABSENT `Api-Token` header and a syntactically well-formed but
 * WRONG one both answer the identical body —
 *
 * ```
 * HTTP 401 {"code":"unauthorized","message":"Key is not provided or does not exists"}
 * ```
 *
 * — so `test` classifies by the vendor's own `code` field (`unauthorized`) rather than by
 * status alone, and its message says plainly that WebinarGeek itself cannot distinguish a typo
 * from an empty field, rather than implying this app could.
 */
export interface WebinarGeekCredential {
  apiKey: string;
}

/** The probe. Pinned here and asserted in `tests/auth/api-key.test.ts`. */
export const PROBE_PATH = "/account";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from WebinarGeek → account settings → Advanced → API. Sent verbatim as " +
    "an `Api-Token` header.",
  connectionLabel: "{{account.company}} ({{account.email}})",
  apiKey: {
    in: "header",
    name: "Api-Token",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "account settings → Advanced → API. The key gives access to critical parts of the " +
        "account — rotate it periodically and never share it.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps the header
   * onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<WebinarGeekCredential>;
    request.headers["api-token"] = key ?? "";
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<WebinarGeekCredential>;
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", "api-token": cred.apiKey },
    });

    if (res.ok) {
      const account = await res.json().catch(() => null) as { email?: string } | null;
      if (!account || typeof account.email !== "string") {
        return { ok: false, message: "Host answered but did not return a WebinarGeek account." };
      }
      return { ok: true };
    }

    const body = await res.json().catch(() => null) as { code?: string; message?: string } | null;
    if (body?.code === "unauthorized" || res.status === 401) {
      return {
        ok: false,
        message:
          `WebinarGeek rejected the credential (${res.status}${body?.code ? ` ${body.code}` : ""})${
            body?.message ? `: ${body.message}` : ""
          }. WebinarGeek's own error does not ` +
          "distinguish a missing key from a wrong one — check the value was copied in full.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message: "WebinarGeek is rate-limiting this key right now. Try again shortly.",
      };
    }
    return {
      ok: false,
      message: formatWebinarGeekError(res.status, "GET", PROBE_PATH, JSON.stringify(body ?? {})),
    };
  },

  /**
   * Records the account so a Connection is recognisable by more than an opaque key. `/account`'s
   * response is exactly `{company, email}` — nothing else exists to publish, and nothing here
   * is the key itself.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<WebinarGeekCredential>;
    if (!cred?.apiKey) return {};
    const res = await ctx.fetch(`${API_URL}${PROBE_PATH}`, {
      headers: { accept: "application/json", "api-token": cred.apiKey },
    });
    if (!res.ok) return {};
    const account = await res.json().catch(() => ({})) as { company?: string; email?: string };
    return { account: { company: account.company, email: account.email } };
  },
};

export default apiKey;
