import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Workable Access Token — `Authorization: Bearer <token>`.
 *
 * Verified against the "Getting started" guide's own curl example
 * (`workable.readme.io/reference/generate-an-access-token`, read 2026-09-05):
 * generated from Settings → Integrations → API, shown once, revocable
 * anytime. There is no OAuth 2.0 authorization-code flow for a general
 * integration — a separate "Partner Token" exists, but it requires applying
 * to Workable's official partner program and is out of scope for this app.
 *
 * ## The subdomain identifies the account
 *
 * Workable has no fixed API host — every account is `https://<subdomain>
 * .workable.com/spi/v3/...` — so the subdomain is collected here, once, at
 * connect time, the same posture `apps/zendesk` and `apps/gorgias` already
 * use. `afterConnect` echoes it onto the connection's display data, which is
 * where `lib/client.ts` reads it from.
 *
 * ## No scope-free probe exists
 *
 * Every documented endpoint requires a scope — there is no whoami analogous
 * to Zendesk's `/users/me.json` that needs none. `GET /accounts/:subdomain`
 * needs only `r_jobs`, the scope effectively every recruiting token carries
 * (`/jobs`, `/candidates`, `/stages` and `/members` all require it too), and
 * doubles as proof that the token actually belongs to the subdomain entered
 * — it returns 404 for a subdomain the token's account cannot see. That is
 * the cheapest available read, not a scope-free one; a token deliberately
 * issued without `r_jobs` will fail this probe even if it is otherwise live.
 */

export interface WorkableCredential {
  subdomain: string;
  accessToken: string;
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Generate at Settings → Integrations → API in your Workable account. Shown once — store it " +
    "somewhere safe.",
  connectionLabel: "{{account.name}} ({{subdomain}})",
  fields: [
    {
      key: "subdomain",
      label: "Subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.workable.com` — not the full URL. Find it under " +
        "Settings → Company profile.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Settings → Integrations → API → Generate new token. Grant it at least the `r_jobs` " +
        "scope, which most read actions here require.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<WorkableCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { subdomain, accessToken } = credential as Partial<WorkableCredential>;
    if (!subdomain || !accessToken) {
      return { ok: false, message: "credential missing subdomain or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(subdomain)}/accounts/${subdomain}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 404) {
      return {
        ok: false,
        message: "Workable returned 404 — the subdomain and token don't belong to the same account",
      };
    }
    if (!res.ok) return { ok: false, message: `Workable returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the subdomain (and account name, if the probe succeeds) on the
   * connection so the client can build URLs without ever seeing the token.
   */
  async afterConnect({ credential }, ctx) {
    const { subdomain, accessToken } = credential as Partial<WorkableCredential>;
    if (!subdomain) return {};
    const res = await ctx.fetch(`${baseUrl(subdomain)}/accounts/${subdomain}`, {
      headers: { authorization: `Bearer ${accessToken ?? ""}`, accept: "application/json" },
    });
    if (!res.ok) return { subdomain };
    const body = await res.json().catch(() => ({})) as { name?: string; id?: string };
    return { subdomain, account: { name: body.name, id: body.id } };
  },
};

export default accessToken;
