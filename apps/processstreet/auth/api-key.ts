import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header `X-API-Key`) — the spec's `apiKeyAuth` security scheme, generated
 * from organization settings in the Process Street app. "Each key carries the permissions of the
 * user that created it" (spec prose).
 *
 * A second, beta `httpAuth` bearer scheme also exists in the spec but is documented only as
 * "Bearer token (beta)" with no further detail — not implemented here.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Generate a key from your organization settings in the Process Street app.",
  connectionLabel: "{{apiKeyLabel}}",
  apiKey: { in: "header", name: "X-API-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Organization Settings → API Keys in the Process Street app.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  /**
   * `GET /testAuth` — returns only `{ apiKeyLabel }`, the human-readable label the key was given
   * at creation time. Never echoes the key itself, so this is safe to use as the liveness probe.
   *
   * Verified live 2026-09-06: a missing or invalid key answers `401` with a body of just
   * `{"error": "..."}` — no `errorCode` (see `lib/client.ts`'s doc comment on the spec's own gap
   * here) — so classification reads the `error` text rather than assuming a machine-parsable code.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_URL}/testAuth`, {
      headers: { accept: "application/json", "x-api-key": apiKey },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Process Street rejected the key (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). Check Organization Settings → API Keys, or that it wasn't revoked.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Process Street returned ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }.`,
      };
    }
    return { ok: true };
  },

  /** Records the key's own label. Never the key itself. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/testAuth`, {
        headers: { accept: "application/json", "x-api-key": apiKey },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as { apiKeyLabel?: string } | null;
      if (!body?.apiKeyLabel) return {};
      return { apiKeyLabel: body.apiKeyLabel };
    } catch {
      return {};
    }
  },
  // No `revoke`: the public API exposes no endpoint to invalidate a key from the outside —
  // revocation happens in Organization Settings → API Keys, same as rotating any other
  // dashboard-issued credential in this pack.
};

export default apiKey;
