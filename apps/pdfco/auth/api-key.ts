import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatPdfCoError } from "../lib/client.ts";

/**
 * PDF.co API key — `x-api-key: <key>` header.
 *
 * Verified against `components.securitySchemes.ApiKeyAuth` in PDF.co's own
 * OpenAPI document (`{"type": "apiKey", "in": "header", "name": "x-api-key"}`,
 * fetched 2026-08-24) and live probes against `api.pdf.co` the same day.
 *
 * ## The probe: `GET /v1/account/credit/balance`
 *
 * Chosen by reading the response shape, not the name:
 *
 * - **Requires a credential.** A live probe with no `x-api-key` header
 *   returned `401` with `{"status":"error","errorCode":401,"error":true,
 *   "message":"Please provide your API key as \"x-api-key\" header
 *   parameter…"}`.
 * - **Returns no credential material.** Its documented success body is
 *   `{"remainingCredits": 99795868}` — a running credit counter, nothing
 *   that could authenticate a second call. Compare `/v1/account/credit/balance`
 *   favorably against `/v1/file/upload/get-presigned-url`, which hands back a
 *   live, pre-signed S3 write URL — a much bigger blast radius to park in a
 *   health surface that is stored and displayed on every check.
 * - **Needs no resource-level scope.** PDF.co does not document scoped API
 *   keys (unlike, say, Apify) — every key an account can generate carries the
 *   same permissions — so there is no "narrowest usable key" concern here.
 *
 * ## Live 401 body does not match the OpenAPI-documented shape
 *
 * The generated `Unauthorized` response schema claims
 * `{"error": true, "status": 401, "message": "…"}` (status as an integer).
 * The ACTUAL response observed live is
 * `{"status": "error", "errorCode": 401, "error": true, "message": "…"}` —
 * `status` is the string `"error"`, and the numeric code is under a
 * different key, `errorCode`, entirely. `test` below keys off `error`/`message`
 * only, exactly like `lib/client.ts`'s general error formatter, for this
 * reason: `status`/`errorCode` are not reliable enough to branch on.
 */

export interface PdfCoCredential {
  apiKey: string;
}

/** The one place the wire header is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<PdfCoCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

export const BALANCE_PATH = "/v1/account/credit/balance";

interface BalanceBody {
  remainingCredits?: number;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from PDF.co Dashboard > API Key. PDF.co does not offer scoped keys — " +
    "any key an account generates has full access to that account.",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From https://app.pdf.co/ under Account > API Key.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header and returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<PdfCoCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link BALANCE_PATH} for why this endpoint. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PdfCoCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${BALANCE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text();

    if (!res.ok) {
      return { ok: false, message: formatPdfCoError(res.status, "GET", BALANCE_PATH, text) };
    }

    const body = (() => {
      try {
        return JSON.parse(text) as BalanceBody;
      } catch {
        return null;
      }
    })();
    if (!body || typeof body.remainingCredits !== "number") {
      return {
        ok: false,
        message: "PDF.co returned 200 for the balance check but no remainingCredits field",
      };
    }
    return { ok: true };
  },
};

export default apiKey;
