import type { AuthDefinition } from "@w6w/types";
import { baseUrl, basicHeader } from "../lib/client.ts";

/**
 * API key (`basic`).
 *
 * Gorgias's private-app scheme is HTTP Basic with the account's email as the
 * username and a REST API key as the password. Verified against
 * developers.gorgias.com/reference/authentication ("Use your email (username)
 * and your API key") and against the OpenAPI spec embedded in the reference
 * docs, whose every operation declares `security: [{ basicAuth: [] }]`.
 * OAuth2 is documented as the separate, mandatory scheme for *public* apps
 * (reference/authentication) — out of scope here, same as this pack's other
 * apps that expose only their private-app credential.
 *
 * The domain is collected here rather than per-action: it identifies the
 * account, so it belongs to the Connection. `afterConnect` echoes it onto the
 * connection's display data, which is where the client reads it from.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Key",
  description: "Find your REST API key under Settings → REST API in your Gorgias account.",
  connectionLabel: "{{domain}}.gorgias.com",
  fields: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "green-garden",
      hint: "Just the subdomain from `green-garden.gorgias.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The email address of the Gorgias user the API key belongs to.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → REST API → API Keys.",
    },
  ],

  sign({ request, credential }) {
    const { email, apiKey } = credential as { email: string; apiKey: string };
    request.headers["authorization"] = basicHeader(email, apiKey);
    return request;
  },

  /**
   * `GET /account` needs no scope and echoes only the account's own metadata
   * (domain, settings, status) — never the caller's credential. A 401 is
   * classified from Gorgias's own `{ error: { msg } }` body rather than the
   * bare status code, per developers.gorgias.com/reference/errors.
   */
  async test({ credential }, ctx) {
    const { domain, email, apiKey } = credential as {
      domain?: string;
      email?: string;
      apiKey?: string;
    };
    if (!domain || !email || !apiKey) {
      return { ok: false, message: "credential missing domain, email or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/account`, {
      headers: { authorization: basicHeader(email, apiKey) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: { msg?: string } };
      return { ok: false, message: body.error?.msg ?? `Gorgias returned ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the domain on the connection so the client can build URLs
   * without ever seeing the credential.
   */
  async afterConnect({ credential }, ctx) {
    const { domain, email, apiKey } = credential as {
      domain?: string;
      email?: string;
      apiKey?: string;
    };
    if (!domain) return {};
    const res = await ctx.fetch(`${baseUrl(domain)}/account`, {
      headers: { authorization: basicHeader(email!, apiKey!) },
    });
    if (!res.ok) return { domain };
    const account = await res.json().catch(() => ({})) as Record<string, unknown>;
    return { domain, account };
  },
};

export default basic;
