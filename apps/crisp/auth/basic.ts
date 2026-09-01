import type { AuthDefinition } from "@w6w/types";
import { API_V1, type CrispEnvelope, formatError, TIER_HEADER_VALUE } from "../lib/client.ts";

/**
 * Website Token — HTTP Basic with a token keypair, PLUS a required
 * `X-Crisp-Tier: website` header. Confirmed against
 * `docs.crisp.chat/guides/rest-api/authentication/website-token/` (fetched
 * 2026-09-01), whose own worked cURL example is:
 *
 *     curl https://api.crisp.chat/v1/website/{website_id} \
 *       --get \
 *       --user "{token_id}:{token_key}" \
 *       --header "X-Crisp-Tier: website"
 *
 * and whose prose is explicit that BOTH headers are required together:
 * "Authorization: Basic BASE64(token_id:token_key)" and "X-Crisp-Tier:
 * website" — "this lets the REST API know that the token you are using is a
 * website token." Sending Basic auth alone (no tier header) is exactly the
 * kind of thing that looks right, 401s, and costs an integrator a debugging
 * session, because nothing about a bare 401 says which header is missing.
 *
 * Crisp also offers a "Plugin Token" scheme (Marketplace-issued, multi-
 * workspace, `X-Crisp-Tier: plugin`) for public integrations — out of scope
 * here, same as this pack's other apps that expose only the private/single-
 * workspace credential (see e.g. `apps/gorgias`).
 *
 * ## Why `websiteId` lives in `fields`, typed as plain `string`
 *
 * A Website Token is scoped to exactly one workspace, and that workspace's
 * `website_id` is a required path segment on every v1 resource
 * (`/v1/website/{website_id}/...`). It is not secret (it is visible in the
 * dashboard URL and the docs use it as a generic path example), but it is
 * also not optional — every Action needs it, and Actions never see the
 * credential. So it is collected once here and echoed by `afterConnect` onto
 * the Connection's display data, where `lib/client.ts` reads it from. Same
 * pattern as `apps/gorgias`'s `domain` field.
 *
 * `identifier` and `key` are both typed `secret`, even though Crisp's own UI
 * shows the identifier unmasked — HTTP Basic has no notion of a public
 * username; half of `base64(identifier:key)` is still credential material
 * (same rule this pack's auditor applies elsewhere, see `apps/mailjet`).
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Website Token",
  description:
    "From the Crisp dashboard: Settings → Workspace Settings → Advanced configuration → API " +
    "Token → Generate Token. Sent as HTTP Basic plus the required X-Crisp-Tier header.",
  connectionLabel: "{{name}} ({{websiteId}})",
  fields: [
    {
      key: "websiteId",
      label: "Website ID",
      type: "string",
      required: true,
      hint: "Settings → Workspace Settings → Setup Instructions. A UUID identifying the workspace.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "identifier",
      label: "Token Identifier",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The `token_id` half of the generated keypair.",
    },
    {
      key: "key",
      label: "Token Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "The `token_key` half of the generated keypair.",
    },
  ],

  sign({ request, credential }) {
    const { identifier, key } = credential as { identifier: string; key: string };
    request.headers["authorization"] = `Basic ${btoa(`${identifier}:${key}`)}`;
    request.headers["x-crisp-tier"] = TIER_HEADER_VALUE;
    return request;
  },

  /**
   * `GET /v1/website/{website_id}` — the cheapest read a Website Token is
   * guaranteed to reach (it is the "Get Website Information" example the
   * docs themselves use to demonstrate a valid token). Confirmed on the wire
   * via the reference's embedded response sample:
   * `{"error": false, "reason": "resolved", "data": {"website_id": ...,
   * "name": ..., "domain": ..., ...}}`.
   *
   * Classified from the envelope's own `error` field (and `reason` on
   * failure), never from the bare status code — Crisp's error responses
   * (`403 not_allowed`, `404 not_subscribed`, `406 domain_restricted`) all
   * carry the same JSON shape as success.
   */
  async test({ credential }, ctx) {
    const { websiteId, identifier, key } = credential as {
      websiteId?: string;
      identifier?: string;
      key?: string;
    };
    if (!websiteId || !identifier || !key) {
      return { ok: false, message: "credential missing websiteId, identifier or key" };
    }
    const res = await ctx.fetch(`${API_V1}/website/${encodeURIComponent(websiteId)}`, {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(`${identifier}:${key}`)}`,
        "x-crisp-tier": TIER_HEADER_VALUE,
      },
    });
    const body = await res.json().catch(() => undefined) as CrispEnvelope | undefined;
    if (res.ok && body && body.error === false) return { ok: true };
    return { ok: false, message: `Crisp returned ${formatError(res.status, body)}` };
  },

  /**
   * Echoes `websiteId` onto the Connection's display data (read by
   * `lib/client.ts`) and, best-effort, the workspace's own `name` for a
   * readable `connectionLabel` — reusing the same `test` probe rather than
   * inventing a second endpoint. Never echoes `identifier` or `key`.
   */
  async afterConnect({ credential }, ctx) {
    const { websiteId, identifier, key } = credential as {
      websiteId?: string;
      identifier?: string;
      key?: string;
    };
    if (!websiteId || !identifier || !key) return { websiteId };
    const res = await ctx.fetch(`${API_V1}/website/${encodeURIComponent(websiteId)}`, {
      headers: {
        accept: "application/json",
        authorization: `Basic ${btoa(`${identifier}:${key}`)}`,
        "x-crisp-tier": TIER_HEADER_VALUE,
      },
    });
    if (!res.ok) return { websiteId };
    const body = await res.json().catch(() => undefined) as
      | CrispEnvelope<{ name?: string }>
      | undefined;
    return { websiteId, name: body?.data?.name };
  },
};

export default basic;
