import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`apiKey`) — the only auth mode Brevo supports.
 *
 * The user pastes a key minted at brevo.com → SMTP & API → API Keys. Every
 * request signs by attaching an `api-key: <key>` header (Brevo's own scheme —
 * NOT `Authorization: Bearer`).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from brevo.com → SMTP & API → API Keys. Sent verbatim as an `api-key` header.",
  connectionLabel: "{{account.email}}",
  apiKey: {
    in: "header",
    name: "api-key",
    prefix: "",
  },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "brevo.com → SMTP & API → API Keys → Create a new API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["api-key"] = key;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { "api-key": key, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Brevo returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/account`, {
      headers: { "api-key": key, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
    } | null;
    if (!body) return {};
    return {
      account: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        companyName: body.companyName,
      },
    };
  },
};

export default apiKey;
