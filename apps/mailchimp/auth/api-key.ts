import type { AuthDefinition } from "@w6w/types";
import { API_HOST_SUFFIX, datacenterFromApiKey } from "../lib/client.ts";

/**
 * Mailchimp API Key auth. The key looks like `abcdef0123456789-us14` — the
 * suffix after the last `-` is the account's datacenter and drives every URL
 * we build. We parse it here (both to sign & to `test`) and stash it on the
 * connection's `display` so the client can read it without touching the
 * credential again.
 *
 * Mailchimp accepts anything as the HTTP-Basic username; the docs suggest
 * `anystring` — the API key is the password. It also accepts
 * `Authorization: apikey <key>` (what n8n uses). We use Basic because it's the
 * canonical form in the Mailchimp docs and easier to reason about.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from Account → Extras → API keys. The datacenter suffix (`-us14`) is required.",
  connectionLabel: "{{account.email}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Ends with the datacenter, e.g. `abcdef0123456789-us14`.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    // HTTP Basic; username is arbitrary per Mailchimp docs.
    const encoded = btoa(`anystring:${key}`);
    request.headers["authorization"] = `Basic ${encoded}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };
    let dc: string;
    try {
      dc = datacenterFromApiKey(key);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
    const url = `https://${dc}.${API_HOST_SUFFIX}/ping`;
    const res = await ctx.fetch(url, {
      headers: { authorization: `Basic ${btoa(`anystring:${key}`)}` },
    });
    if (!res.ok) return { ok: false, message: `Mailchimp returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const datacenter = datacenterFromApiKey(key);
    // Best-effort profile lookup — /3.0/ root exposes account_name, email, etc.
    let account: Record<string, unknown> = {};
    try {
      const res = await ctx.fetch(`https://${datacenter}.${API_HOST_SUFFIX}/`, {
        headers: { authorization: `Basic ${btoa(`anystring:${key}`)}` },
      });
      if (res.ok) {
        const body = await res.json() as {
          account_name?: string;
          email?: string;
          login_id?: string;
        };
        account = {
          name: body.account_name,
          email: body.email,
          id: body.login_id,
        };
      }
    } catch { /* ignore — we still return the datacenter */ }
    return { datacenter, account };
  },
};

export default apiKey;
