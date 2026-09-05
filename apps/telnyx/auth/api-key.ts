import type { AuthDefinition } from "@w6w/types";
import { API_BASE, describeTelnyxErrors } from "../lib/client.ts";

/**
 * Telnyx v2 API key — `Authorization: Bearer <key>`. The OpenAPI document
 * declares `security: [{ bearerAuth: [] }]` globally and the `BearerAuth`
 * scheme's own description is explicit: "Telnyx API key supplied as
 * `Authorization: Bearer <token>`." There is no separate secret/signature
 * component the way Twilio pairs an Account SID with an Auth Token — one key
 * is the whole credential.
 *
 * A v2 key (created in the Telnyx portal under API Keys) is required; the
 * older v1 key format this API does not accept.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Authenticate with a Telnyx v2 API key, sent as `Authorization: Bearer <key>`.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Telnyx Portal → API Keys. Must be a v2 key — v1 keys are rejected by this API version.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /phone_numbers/slim?page[size]=1` — the OpenAPI doc calls this route
   * "a lighter version of the /phone_numbers endpoint having higher
   * performance and rate limit", and any working key can list its own
   * numbers even when it owns zero of them, so this never fails for a live
   * key that simply has no inventory. It also returns nothing the credential
   * holder shouldn't see back — no key material, no billing data.
   *
   * Classified from the response BODY, not the status code: Telnyx's
   * `numbers_Errors` / `call-control_Errors` / `messaging_Errors` schemas all
   * shape an authentication failure the same way —
   * `{"errors":[{"code":"10009","title":"Authentication failed", ...}]}` —
   * across every namespace in the spec, so a bad key is read from that
   * structure rather than trusted to a specific HTTP status.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_BASE}/phone_numbers/slim?page%5Bsize%5D=1`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    if (!res.ok) {
      return { ok: false, message: describeTelnyxErrors(body) ?? `Telnyx returned ${res.status}` };
    }
    return { ok: true };
  },
};

export default apiKey;
