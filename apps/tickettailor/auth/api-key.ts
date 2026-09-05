/**
 * Ticket Tailor API key, sent as HTTP Basic with the key as the username and
 * an empty password. See `lib/client.ts` for why this is `base64("key:")`
 * rather than `base64("key")` — the reference page's two tabs disagree, and
 * the OpenAPI security scheme (`type: http, scheme: basic`) is what settles
 * it.
 *
 * ## `/v1/ping` is not the credential probe, even though it looks like one
 *
 * `GET /v1/ping` is the obvious first guess for a liveness probe — it is
 * short, cheap, and named for exactly this job. Live probes on 2026-09-05
 * rule it out on the one fact that matters: it answers `200 {"version":"1.0"}`
 * with **no** `Authorization` header at all, and again with an
 * `Authorization: Basic` header built from a syntactically-plausible but
 * fake key. Ticket Tailor's own OpenAPI document confirms this by omission —
 * every other operation lists `security: [{BasicAuth: []}]`; `ping`'s
 * operation object has no `security` key at all. A probe against it would
 * report every disconnected or revoked credential as healthy.
 *
 * (Also note the live body is `{"version":"1.0"}`, not the `{"version":"pong"}`
 * the OpenAPI document's own `example` shows — a mismatch between the spec's
 * example and the live wire, so nothing here depends on the literal string.)
 *
 * ## The probe: `GET /v1/overview`
 *
 * `overview` is chosen instead because it (a) is declared `security:
 * [{BasicAuth: []}]` and was confirmed live to need it — an unauthenticated
 * or wrongly-authenticated request answers `403 FORBIDDEN` — and (b) is
 * box-office-wide aggregate statistics (`box_office_name`, revenue, counts;
 * see `health/quota.ts` and `actions/overview-get.ts`), not a specific
 * event/order/ticket resource a narrowly-scoped key could be legitimately
 * refused. It returns no credential material.
 *
 * ## One error code covers every kind of "no": stated, not guessed around
 *
 * Ticket Tailor collapses "no `Authorization` header", "malformed Basic
 * value", "well-formed but wrong/deleted key", and "valid key correctly
 * scoped away from this resource" into the SAME response: `403
 * {"error_code":"FORBIDDEN", "message":"You do not have permission to
 * perform the request.", "hint": "Check if API key is not deleted, is in
 * correct format, ..."}` — verified identical byte-for-byte across all three
 * cases against both `/v1/overview` and `/v1/orders` live. There is no
 * `401` anywhere in this API's documented responses. So `test` cannot tell
 * "your key is wrong" from "your key can't see box-office stats" apart, and
 * says so rather than inventing a distinction the API does not make; the
 * vendor's own `hint` string is surfaced verbatim because it is the only
 * troubleshooting text that exists.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, basicAuthHeader } from "../lib/client.ts";

export interface TicketTailorCredential {
  apiKey: string;
}

export const OVERVIEW_URL = `${API_BASE}${API_PREFIX}/overview`;

interface OverviewErrorBody {
  status?: number;
  error_code?: string;
  message?: string;
  hint?: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste an API key from Ticket Tailor > Box Office Settings > API. Sent as HTTP Basic with " +
    "the key as the username and an empty password.",
  connectionLabel: "Ticket Tailor ({{boxOfficeName}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.tickettailor.com/box-office/api — API keys are per box office and can be scoped " +
        "to specific permissions when you create them.",
    },
  ],

  /** The only hook handed the raw credential; network-less. See module docs. */
  sign({ request, credential }) {
    const cred = credential as Partial<TicketTailorCredential>;
    request.headers["authorization"] = basicAuthHeader(cred.apiKey ?? "");
    return request;
  },

  /** See the module docs for why `overview`, not `ping`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TicketTailorCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(OVERVIEW_URL, {
      headers: { accept: "application/json", authorization: basicAuthHeader(key) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as OverviewErrorBody | null;
    if (body?.error_code === "FORBIDDEN" || res.status === 403) {
      return {
        ok: false,
        message: `Ticket Tailor rejected the API key (${res.status} ${body?.error_code ?? ""}). ${
          body?.hint ??
            "Check the key was copied exactly and has not been deleted in Box Office Settings > API."
        }`,
      };
    }
    return {
      ok: false,
      message: `Ticket Tailor returned HTTP ${res.status} for GET /overview${
        body?.message ? `: ${body.message}` : ""
      }`,
    };
  },

  /**
   * Label the Connection with the box office's own name.
   *
   * `overview` is the same endpoint `test` just proved reachable, so this is a
   * second call rather than reused output only because hooks run in separate
   * invocations with no shared state. A failure here is swallowed — `test`
   * already established the key works, and a missing display label must not
   * fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<TicketTailorCredential>;
    try {
      const res = await ctx.fetch(OVERVIEW_URL, {
        headers: { accept: "application/json", authorization: basicAuthHeader(cred.apiKey ?? "") },
      });
      if (!res.ok) return {};
      const body = await res.json() as { box_office_name?: string };
      return body?.box_office_name ? { boxOfficeName: body.box_office_name } : {};
    } catch {
      return {};
    }
  },
};

export default apiKey;
