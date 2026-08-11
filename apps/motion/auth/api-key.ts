import type { AuthDefinition } from "@w6w/types";
import { API_BASE, messageText, V1 } from "../lib/client.ts";

/**
 * Motion API key — the `X-API-Key` header.
 *
 * Verified against Motion's own "Getting started" page ("Pass in your API key as
 * a `X-API-Key` header") and against live probes of `api.usemotion.com` on
 * 2026-08-11.
 *
 * ## A header, and only a header
 *
 * The reference documents exactly one authentication mechanism, on every one of
 * its 27 endpoint pages, in identical words: a required `X-API-Key` header. There
 * is no OAuth surface, no bearer form, no `?apiKey=` query parameter and no
 * refresh flow. The header name is sent lowercase because HTTP/2 — which
 * `api.usemotion.com` speaks — requires lowercase field names on the wire, and
 * HTTP field names are case-insensitive regardless.
 *
 * The key is created in Motion under Settings, and the vendor's own warning is
 * worth repeating in the field hint: **it is shown once**.
 *
 * ## Motion's 401 is the same 401 for four different problems
 *
 * This is the finding that shapes {@link testMessageFor401}, and it is the
 * reason this hook does not try to name a cause. All four of these, measured
 * live on 2026-08-11 against `GET /v1/users/me`, returned a **byte-identical**
 * response — same 43-byte body, same `etag: W/"2b-dGnJzt6gv1nJjX6DJ9RztDWptng"`:
 *
 *   | what was sent                              | status | body                                          |
 *   | ------------------------------------------ | ------ | --------------------------------------------- |
 *   | no header at all                           | 401    | `{"message":"Unauthorized","statusCode":401}` |
 *   | `X-API-Key:` (empty value)                 | 401    | `{"message":"Unauthorized","statusCode":401}` |
 *   | `X-API-Key: <syntactically plausible key>` | 401    | `{"message":"Unauthorized","statusCode":401}` |
 *   | `Authorization: Bearer <key>` (wrong name) | 401    | `{"message":"Unauthorized","statusCode":401}` |
 *
 * The pack's rule is to classify a credential from the response *body*, never
 * from the status code — and here the body carries no discriminator either. The
 * correct response is to say so: the message lists what it could be instead of
 * asserting "your key is invalid", which would send someone to regenerate a
 * perfectly good key when the real fault was that the credential never reached
 * the request.
 *
 * ## The probe, and why it is `GET /v1/users/me`
 *
 * **(a) It requires a credential.** Unauthenticated it answers 401, measured. That
 * rules out the failure mode where a Connection whose key never attached sails
 * through a probe against a public endpoint.
 *
 * **(b) It returns no credential material.** Its documented response is
 * `{id, name, email}` — three identity fields and nothing else. This is the trap
 * that caught Mailjet's `/apikey`, Follow Up Boss's `/me`, ElevenLabs' `/v1/user`
 * and Podio's `/app/{id}`, all of which hand back a live secret to any caller
 * that already has one; Motion's whoami does not, and its schema was read to
 * confirm that rather than assumed from the name.
 *
 * **(c) Nothing narrower exists, and nothing wider is needed.** Motion publishes
 * no scoped or restricted keys — a key is account-wide — so there is no
 * permission a legitimate credential might lack here. The obvious alternative is
 * `GET /v1/workspaces`, which the vendor's own getting-started page suggests;
 * it is a paginated collection where this is a single object, and it tells you
 * nothing extra.
 */

export interface MotionCredential {
  apiKey: string;
}

/** The header this app sends, built in exactly one place so `test` and `sign` cannot drift apart. */
export const AUTH_HEADER = "x-api-key";

/** `GET /v1/users/me` — see the module comment for why this endpoint. */
export const PROBE_PATH = `${V1}/users/me`;

export function authHeaders(credential: Partial<MotionCredential>): Record<string, string> {
  return { [AUTH_HEADER]: credential.apiKey ?? "" };
}

/**
 * The message for a 401.
 *
 * Exported so the wording is testable: it is the one place this app tells a user
 * what to do about a credential, and Motion's undifferentiated 401 means the
 * honest answer is a list rather than a diagnosis.
 */
export function testMessageFor401(): string {
  return "Motion rejected the request (401 Unauthorized). Motion returns this identical body " +
    "whether the key is missing, empty, revoked, or sent under the wrong header name, so it " +
    "cannot say which — check the key was copied exactly from Motion > Settings (it is shown " +
    "only once, so a partially-copied key is common) and that it has not been regenerated.";
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Motion > Settings. Motion shows a key once, at creation, and cannot " +
    "show it again — generate a new one if you no longer have it.",
  apiKey: { in: "header", name: "X-API-Key" },
  connectionLabel: "Motion ({{name}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Motion > Settings > API. Copy it immediately: Motion displays a new key exactly " +
        "once for security reasons.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header and returns. The key never enters a URL — Motion offers no query
   * form, and a workflow host logs request URLs while it does not log headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<MotionCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH}. Classification is from the body; the status only selects the wording. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MotionCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });

    if (res.ok) {
      // The whoami answers `{id, name, email}`. A 200 whose body is not that
      // object means something is answering for Motion that is not Motion —
      // report it rather than passing on the status code alone.
      const body = await res.json().catch(() => null) as { id?: string } | null;
      if (body && typeof body.id === "string") return { ok: true };
      return {
        ok: false,
        message: "Motion answered 200 for GET /v1/users/me but the body was not a user object",
      };
    }

    const body = await res.json().catch(() => null) as
      | { message?: string | string[]; error?: string }
      | null;
    const detail = messageText(body?.message);

    if (res.status === 401) return { ok: false, message: testMessageFor401() };

    if (res.status === 429) {
      return {
        ok: false,
        message:
          "Motion throttled the check (429), so the key could not be verified — this is a rate " +
          "limit, not a verdict on the credential. Motion allows 12 requests/minute on the " +
          "individual tier and up to 120/minute for teams.",
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        message: `Motion refused the whoami read (403)${detail ? `: ${detail}` : ""}`,
      };
    }

    return {
      ok: false,
      message: `Motion returned HTTP ${res.status} for ${PROBE_PATH}${detail ? `: ${detail}` : ""}`,
    };
  },

  /**
   * Publish the account holder's name and user id, and nothing else.
   *
   * The user id is worth having — it is the value `assigneeId` takes on every
   * task action, and it appears nowhere in the Motion UI. The name makes a list
   * of Connections readable.
   *
   * The response's third field, `email`, is deliberately dropped. Connection
   * display data is rendered in shared UI and copied into run records; the
   * account's email address buys nothing here that the name does not, so it does
   * not leave this function.
   *
   * A failure is silent: `test` has already established the key is live, and a
   * missing display label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MotionCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: string; name?: string };
      const display: Record<string, string> = {};
      if (body?.id) display.userId = body.id;
      if (body?.name) display.name = body.name;
      return display;
    } catch {
      return {};
    }
  },
};

export default apiKey;
