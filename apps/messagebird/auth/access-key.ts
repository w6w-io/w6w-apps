import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * MessageBird authenticates with a single API "access key" sent as
 * `Authorization: AccessKey {accessKey}` — not Bearer, not Basic. Test keys are
 * prefixed `test_`; live keys carry no prefix. Verified against
 * developers.messagebird.com/api/#authentication.
 *
 * `test` probes `GET /balance`, which returns the account's own prepaid/
 * postpaid balance — never the caller's own key — so it cannot leak the
 * credential back into a log or UI. Per the hard rule against classifying a
 * credential from the HTTP status alone, this reads the response BODY: a
 * balance object (`payment`/`type`/`amount`) means the key is live; an
 * `errors` envelope (MessageBird's documented error shape) means it isn't,
 * and its `description` is surfaced rather than a bare status code.
 */
const accessKey: AuthDefinition = {
  key: "access-key",
  type: "apiKey",
  displayName: "Access Key",
  description: "Authenticate with a MessageBird API access key from the dashboard.",
  apiKey: { in: "header", name: "Authorization", prefix: "AccessKey " },
  fields: [
    {
      key: "accessKey",
      label: "Access Key",
      type: "secret",
      required: true,
      hint:
        "MessageBird Dashboard → Developers → API access (dashboard.bird.com). Live keys have no prefix; test keys start with `test_`.",
    },
  ],

  sign({ request, credential }) {
    const { accessKey } = credential as { accessKey: string };
    request.headers["authorization"] = `AccessKey ${accessKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessKey } = credential as { accessKey: string };
    const res = await ctx.fetch(`${API_BASE}/balance`, {
      headers: { authorization: `AccessKey ${accessKey}`, accept: "application/json" },
    });
    const body = await res.json().catch(() => undefined) as
      | { payment?: string; type?: string; amount?: number }
      | { errors?: Array<{ code?: number; description?: string }> }
      | undefined;

    // Classify from the response BODY, never the status code alone.
    if (body && typeof body === "object" && "amount" in body && typeof body.amount === "number") {
      return { ok: true };
    }
    const errors = (body as { errors?: Array<{ description?: string }> } | undefined)?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return { ok: false, message: errors.map((e) => e.description).filter(Boolean).join("; ") };
    }
    return { ok: false, message: `Unexpected response from MessageBird (HTTP ${res.status})` };
  },
};

export default accessKey;
