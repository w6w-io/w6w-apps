/**
 * Fireflies API key — a plain bearer token.
 *
 * `Authorization: Bearer <key>` against the single GraphQL endpoint
 * (docs: `fundamentals/authorization`). The key is minted per user at
 * app.fireflies.ai → Integrations → Fireflies API; it is not scoped, so
 * anything the owning user can do in the dashboard, the key can do.
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL, type FirefliesError, formatErrors } from "../lib/client.ts";

/**
 * The whoami probe, used by both `test` and `afterConnect`.
 *
 * `user` with no `id` argument returns the API key OWNER (docs:
 * `graphql-api/query/user`), so it needs no user id and no admin privilege —
 * the narrowest possible credential can still run it.
 *
 * The selection set is chosen by what the response BODY contains, not by the
 * endpoint's name: every field here (`user_id`, `email`, `name`) is account
 * metadata. Nothing on the `User` type echoes the caller's own API key — the
 * failure mode that makes Mailjet's `/apikey` and Follow Up Boss's `/me`
 * unusable as probes. `integrations` is deliberately NOT selected: it is a list
 * of connected-integration names, which is more than a liveness check needs.
 */
const WHOAMI = "{ user { user_id name email } }";

interface WhoamiResponse {
  data?: { user?: { user_id?: string; name?: string; email?: string } };
  errors?: FirefliesError[];
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste the API key from app.fireflies.ai → Integrations → Fireflies API. It acts as the user who created it.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.fireflies.ai → Integrations → Fireflies API → copy your API key.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header and returns, so the credential-holder cannot reach the
   * network and the network-caller never sees the credential.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ query: WHOAMI }),
    });

    // A rejected key answers HTTP 500 with a GraphQL `auth_failed` envelope
    // (measured 2026-08-11), so the body is read first and the status is only
    // a fallback. Judging by `res.ok` alone would report every bad key as a
    // Fireflies outage — and, worse, report a *good* key as broken on any
    // vendor-side 5xx that still carried valid data.
    const body = await res.json().catch(() => ({})) as WhoamiResponse;
    if (body.errors?.length) return { ok: false, message: formatErrors(body.errors) };
    if (body.data?.user?.user_id) return { ok: true };
    return { ok: false, message: `Fireflies returned ${res.status} with no user` };
  },

  async afterConnect(_input, ctx) {
    // Unsigned here in the same sense as every other hook: the runtime routes
    // this through `sign`, which supplies the credential.
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: WHOAMI }),
    });
    const body = await res.json().catch(() => ({})) as WhoamiResponse;
    if (!body.data?.user) return {};
    return { user: body.data.user };
  },
};

export default apiKey;
