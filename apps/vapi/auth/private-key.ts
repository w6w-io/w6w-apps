import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Vapi Private Key — `Authorization: Bearer <key>`.
 *
 * Verified against `components.securitySchemes.bearer` in Vapi's OpenAPI
 * document (`{"scheme": "bearer", "type": "http"}` — a plain bearer header,
 * no custom scheme name) and live probes against `api.vapi.ai` on 2026-09-06.
 *
 * ## Private key, not public key
 *
 * Every Vapi project has **two** keys, visible side by side in
 * Dashboard > API Keys:
 *
 *  - **Private key** — full server-side access. This is the one this app
 *    needs, because every action here calls the REST API directly.
 *  - **Public key** — meant for the client-side `@vapi-ai/web` SDK to start a
 *    browser call. It is scoped to call-initiation and is rejected by most of
 *    this app's surface.
 *
 * Presenting the public key is not a silent partial failure — Vapi's own 401
 * body names the mistake outright, confirmed live:
 *
 *     $ curl -H "Authorization: Bearer <public key>" https://api.vapi.ai/assistant
 *     401 {"message":"Invalid Key. Hot tip, you may be using the private key
 *          instead of the public key, or vice versa.","error":"Unauthorized",
 *          "statusCode":401}
 *
 * `test` below reads that message verbatim into its own failure text rather
 * than flattening it to a bare "401 Unauthorized", because the vendor already
 * did the diagnosis.
 *
 * ## No scoped keys, no whoami
 *
 * Vapi's key model has no notion of a narrower, resource-scoped token (unlike
 * Apify or Stripe), so there is no "least privilege" tradeoff in choosing a
 * probe. There is also no `/me`, `/org` or `/account` endpoint of any kind in
 * the OpenAPI document — nothing to read for a connection label — so
 * `afterConnect` is omitted rather than faked.
 */

export interface VapiCredential {
  privateKey: string;
}

/** The one place the wire format is built — reused by `sign` and `test`. */
export function authHeaders(credential: Partial<VapiCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.privateKey ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /assistant?limit=1` was chosen because it requires a credential
 * (confirmed live: no `Authorization` header answers `401 "Missing
 * Authorization Header."`), needs no scope beyond an ordinary private key, and
 * its response is a bare array of the caller's own Assistants — no credential
 * material, and Vapi's own OpenAPI document states the one field that could
 * carry one (`credentials[].apiKey`) is "not returned in the API".
 */
export const PROBE_PATH = "/assistant";

interface VapiAuthErrorBody {
  message?: string;
  error?: string;
  statusCode?: number;
}

const privateKey: AuthDefinition = {
  key: "private-key",
  type: "bearer",
  displayName: "Private Key",
  description:
    "Paste the Private Key from Vapi Dashboard > API Keys — NOT the Public Key, which is scoped " +
    "for the client-side web/mobile SDK and is rejected by this app's actions.",
  fields: [
    {
      key: "privateKey",
      label: "Private Key",
      type: "secret",
      required: true,
      hint: "Dashboard > API Keys > Private Key. Do not use the Public Key here.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<VapiCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<VapiCredential>;
    const key = (cred?.privateKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing privateKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?limit=1`, {
      headers: { accept: "application/json", ...authHeaders({ privateKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as VapiAuthErrorBody | null;
    const message = body?.message;

    if (res.status === 401 && message) {
      return {
        ok: false,
        message: `Vapi rejected the key (401): ${message}`,
      };
    }
    if (res.status === 401) {
      return { ok: false, message: "Vapi rejected the key (401 Unauthorized)." };
    }
    return {
      ok: false,
      message: `Vapi returned HTTP ${res.status} for ${PROBE_PATH}${message ? `: ${message}` : ""}`,
    };
  },
};

export default privateKey;
