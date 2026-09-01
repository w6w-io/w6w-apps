import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Account ID + API Key (`basic`) — the only auth method YouCanBookMe
 * documents.
 *
 * YCBM authenticates every request with HTTP Basic Auth:
 * `Authorization: Basic base64("<accountId>:<apiKey>")`. The account id is a
 * UUID and the API key is a long string starting `ak_`; both are found at
 * https://app.youcanbook.me/#/account/security. Verified 2026-09-01 against
 * the vendor's own current Stoplight project description (the live
 * server-rendered `homeContent` of https://ycbm.stoplight.io/, under
 * "Authentication": "For the username, use your accountId. The password will
 * be your API key").
 *
 * `test` and `afterConnect` both request only `fields=id,email` explicitly
 * (never the account endpoint's full default field set, which includes
 * `oneTimeToken` and `sessionToken` — live, sensitive credential-adjacent
 * material this app has no reason to pull into a response it stores or
 * displays).
 *
 * `btoa` is used directly (not a UTF-8-safe encoder) because both credential
 * parts are vendor-issued ASCII (a UUID, an alphanumeric key prefixed `ak_`),
 * so Latin1-only `btoa` cannot mis-encode them.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Account ID & API Key",
  description:
    "app.youcanbook.me/#/account/security. Used as HTTP Basic username (Account ID) and password (API Key).",
  connectionLabel: "{{account.email}}",
  fields: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      row: "creds",
      hint:
        "UUID — Account settings → Security. Also required as the accountId param on every action.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Account settings → Security → API Key (starts 'ak_').",
    },
  ],

  sign({ request, credential }) {
    const { accountId, apiKey } = credential as { accountId: string; apiKey: string };
    request.headers["authorization"] = `Basic ${btoa(`${accountId}:${apiKey}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accountId, apiKey } = credential as { accountId?: string; apiKey?: string };
    if (!accountId || !apiKey) {
      return { ok: false, message: "credential missing accountId or apiKey" };
    }
    const res = await ctx.fetch(`${API_URL}/${accountId}?fields=id,email`, {
      headers: { authorization: `Basic ${btoa(`${accountId}:${apiKey}`)}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string; code?: string };
      return { ok: false, message: body.message ?? `YouCanBookMe returned ${res.status}` };
    }
    const body = await res.json().catch(() => ({})) as { id?: string };
    if (!body.id) return { ok: false, message: "unexpected response shape from YouCanBookMe" };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accountId } = credential as { accountId?: string };
    if (!accountId) return {};
    const res = await ctx.fetch(`${API_URL}/${accountId}?fields=id,email`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { email?: string };
    return { account: { email: body.email } };
  },
};

export default basic;
