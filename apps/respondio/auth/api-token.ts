import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * respond.io personal API access token — `Authorization: Bearer <token>`.
 *
 * Verified against `respond-io/typescript-sdk`'s `HTTPClient` constructor
 * (`Authorization: Bearer ${config.apiToken}`) and live probes against
 * `api.respond.io` on 2026-09-05.
 *
 * A token is minted per-workspace in **Settings > Integrations > Developer
 * API > Add Access Token** (documented in the SDK's own README) — there is no
 * OAuth surface for third-party apps, so the token is the entire
 * authentication story.
 *
 * ## A CloudFront edge rule, not a respond.io one
 *
 * `api.respond.io` sits behind CloudFront, and the edge itself — not
 * respond.io's application layer — refuses any request whose `Authorization`
 * header is missing or is not shaped `Bearer <anything>`. That request never
 * reaches respond.io's own code: it gets a **CloudFront HTML block page**
 * (`403`, `<TITLE>ERROR: The request could not be satisfied</TITLE>`), not the
 * vendor's own JSON error envelope. Measured live 2026-09-05:
 *
 * | Header sent                    | Result                                          |
 * | ------------------------------- | ------------------------------------------------ |
 * | *(none)*                        | CloudFront `403` HTML block page                  |
 * | `Authorization: xyz123`         | CloudFront `403` HTML block page (no `Bearer`)    |
 * | `Authorization: Bearer ` (empty) | respond.io `401` JSON `{"code":401,"status":"AuthorizationError","message":"Token not found"}` |
 * | `Authorization: Bearer garbage`  | Same JSON `401` as above                          |
 *
 * So a syntactically-empty-but-`Bearer`-shaped header reaches the real API and
 * gets a real, structured answer; a header that is absent or malformed gets an
 * opaque edge block that looks nothing like a respond.io error. This app's
 * `sign` always emits the `Bearer ` prefix (even for an empty credential), and
 * `test` below short-circuits locally when the credential is empty — both to
 * avoid ever depending on the WAF page's shape, and because a network call
 * with a known-empty credential answers nothing `test` doesn't already know.
 */

export interface RespondioCredential {
  apiToken: string;
}

/** The one place the wire format is built — `sign` and `test` both call this. */
export function authHeaders(credential: Partial<RespondioCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/space/user?limit=1`.
 *
 * Chosen for the same reason respond.io's own `respond-io/mcp-server` uses it
 * as its client health check (`SdkClientManager.performHealthCheck`, "list
 * users with limit 1"): there is no dedicated `/whoami` or `/me` endpoint in
 * the documented v2 surface (confirmed against the full official SDK — its
 * five clients expose no such method), so the cheapest **workspace-scoped**
 * read that requires a credential is respond.io's own precedent, not a guess.
 * The response is a list of the workspace's own users — no credential
 * material, no accidental echo of the token itself.
 */
export const PROBE_PATH = "/space/user";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Access Token",
  description: "Paste a personal API access token from your respond.io workspace: Settings > " +
    "Integrations > Developer API > Add Access Token.",
  connectionLabel: "respond.io",
  fields: [
    {
      key: "apiToken",
      label: "API Access Token",
      type: "secret",
      required: true,
      hint: "Settings > Integrations > Developer API > Add Access Token, inside the respond.io " +
        "workspace this connection should act as.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. Always emits `Bearer `, even for an
   * empty credential — see the module doc for why that matters here more than
   * for most vendors.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<RespondioCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<RespondioCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      // The CloudFront block page (or any other non-JSON edge response) — not
      // a respond.io auth verdict at all. See the module doc's table.
      return {
        ok: false,
        message: `respond.io's edge returned a non-JSON ${res.status} response — the request ` +
          "was blocked before reaching the API, not rejected by it",
      };
    }

    const body = await res.json().catch(() => null) as
      | { code?: number; status?: string; message?: string }
      | null;

    if (res.status === 401) {
      return {
        ok: false,
        message: `respond.io rejected the token (401${body?.status ? ` ${body.status}` : ""}` +
          `${body?.message ? `: ${body.message}` : ""}). Check it was copied exactly and has ` +
          "not been revoked in Settings > Integrations > Developer API.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `respond.io refused the workspace-users read (403${
          body?.status ? ` ${body.status}` : ""
        }${body?.message ? `: ${body.message}` : ""})`,
      };
    }
    return {
      ok: false,
      message: `respond.io returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${body?.message ? `: ${body.message}` : ""}`,
    };
  },
};

export default apiToken;
