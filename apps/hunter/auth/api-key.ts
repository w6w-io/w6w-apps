import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Hunter API key (`apiKey`, `in: "query"`).
 *
 * Hunter's docs document three equally-supported ways to send the key: the
 * `api_key` query parameter, an `X-API-KEY` header, or `Authorization: Bearer
 * <key>`. This app signs with the query parameter — every single request
 * example in Hunter's own reference uses it, and it means one `sign` covers
 * every verb without a header-vs-query branch.
 *
 * ## The probe: `GET /v2/account`
 *
 * Chosen because it needs a credential, is reachable by any plan (Free
 * included — Account Information is explicitly a free call), and returns
 * nothing that is itself a working credential: `first_name`, `last_name`,
 * `email`, `plan_name` and usage counters, never the API key. Hunter's own
 * dashboard shows several keys per account, and none of them round-trips
 * through this response.
 *
 * Liveness is read from the **body**, not the status code alone: a malformed
 * or revoked key still gets a `200` from some proxies fronting a 401 upstream
 * in rare misconfigurations, so `test` requires `data.email` to actually be
 * present before calling the credential live.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Your Hunter API key, from Account Settings → API. Travels as the `api_key` query parameter " +
    "on every request.",
  connectionLabel: "{{user.email}} ({{company.plan}})",
  apiKey: { in: "query", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "hunter.io → Account Settings → API. A special value, `test-api-key`, validates " +
        "parameters and always returns the same dummy response — useful for testing a workflow " +
        "without spending real credits.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    url.searchParams.set("api_key", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const url = new URL(`${API_BASE}/account`);
    url.searchParams.set("api_key", apiKey);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return { ok: false, message: `Hunter returned ${res.status}` };
    const body = await res.json().catch(() => null) as { data?: { email?: string } } | null;
    if (!body?.data?.email) {
      return { ok: false, message: "Hunter returned 200 but no account data — key not accepted" };
    }
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return {};
    const url = new URL(`${API_BASE}/account`);
    url.searchParams.set("api_key", apiKey);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { first_name?: string; last_name?: string; email?: string; plan_name?: string };
    };
    const me = body.data ?? {};
    const name = [me.first_name, me.last_name].filter(Boolean).join(" ");
    return {
      user: { name: name || me.email || "Hunter user", email: me.email },
      company: { plan: me.plan_name ?? "Free" },
    };
  },
};

export default apiKey;
