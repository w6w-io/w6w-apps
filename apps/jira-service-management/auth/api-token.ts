import type { AuthDefinition } from "@w6w/types";
import { readErrorDetail } from "../lib/client.ts";

/**
 * Email + API token (`basic`) — identical shape to the sibling `jira` app's
 * `api-token` method, because it is the same Atlassian Cloud site: JSM has no
 * auth of its own, only a different REST prefix on the same host.
 *
 * `test` probes `GET /rest/servicedeskapi/servicedesk?limit=1` — documented
 * "Permissions required: Any", so it works for an agent OR a customer-only
 * license, the narrowest credential this app can be connected with.
 *
 * Never classified from the HTTP status alone: a bad credential measured live
 * (2026-09-05, `ecosystem.atlassian.net`) comes back HTTP 401 with a
 * PLAIN-TEXT body ("Client must be authenticated to access this resource.")
 * mislabeled `content-type: text/html` — not the documented JSON
 * `ErrorResponse` shape. `readErrorDetail` handles both.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "basic",
  displayName: "Email & API Token",
  description:
    "Create a token at id.atlassian.com → Security → API tokens, then pair it with your account email.",
  connectionLabel: "{{email}} ({{site}})",
  fields: [
    {
      key: "site",
      label: "Site",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the name from `acme.atlassian.net` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    { key: "email", label: "Email", type: "string", required: true, row: "creds" },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      row: "creds",
      hint: "id.atlassian.com → Security → Create and manage API tokens.",
    },
  ],

  sign({ request, credential }) {
    const { email, apiToken } = credential as { email: string; apiToken: string };
    request.headers["authorization"] = `Basic ${btoa(`${email}:${apiToken}`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { site, email, apiToken } = credential as {
      site?: string;
      email?: string;
      apiToken?: string;
    };
    if (!site || !email || !apiToken) {
      return { ok: false, message: "credential missing site, email or apiToken" };
    }
    const res = await ctx.fetch(
      `https://${site}.atlassian.net/rest/servicedeskapi/servicedesk?limit=1`,
      {
        headers: {
          authorization: `Basic ${btoa(`${email}:${apiToken}`)}`,
          accept: "application/json",
        },
      },
    );
    if (!res.ok) return { ok: false, message: await readErrorDetail(res) };
    return { ok: true };
  },

  /**
   * Records the site so the client can build URLs without the credential.
   * `email` isn't secret — it's a plain-text form field — so it's safe to
   * echo into `display` for `connectionLabel`. No network call: JSM's own
   * API publishes no "who am I" endpoint (Jira Software's `/myself` lives on
   * a different REST surface this app doesn't otherwise call).
   */
  afterConnect({ credential }) {
    const { site, email } = credential as { site?: string; email?: string };
    return { site, email };
  },
};

export default apiToken;
