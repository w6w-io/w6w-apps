import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

/**
 * Access Token (`bearer`).
 *
 * Booqable's static-credential scheme: `Authorization: Bearer <token>`.
 * Verified against developers.booqable.com's Authentication section, whose
 * every worked example sends exactly this header
 * (`--header 'Authorization: Bearer 9bcabeaa8278...'`) against a
 * company-specific host (`https://example.booqable.com/api/4/...`). The docs
 * also describe a second, "Request signing" scheme (client-generated
 * ES256/RS256/HS256 single-use JWTs) — deliberately not implemented here: it
 * is documented as the advanced/optional path, and Booqable's own docs create
 * it the same way a static Access Token is created (Account Settings →
 * Authentication methods), so a user who wants it can still generate a plain
 * Access Token from the same screen.
 *
 * The company slug is collected here rather than per-action: it identifies
 * the account/host, so it belongs to the Connection. `afterConnect` echoes it
 * onto the connection's display data, which is where the client reads it
 * from (`lib/client.ts`'s `companySlugFromConnection`).
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description: "Go to your account settings (Settings → Employees → your name, or " +
    "{company}.booqable.com/employees/current), then Authentication methods → Create new " +
    "authentication method, and choose Access Token.",
  connectionLabel: "{{company.name}} ({{companySlug}})",
  fields: [
    {
      key: "companySlug",
      label: "Company slug",
      type: "string",
      required: true,
      placeholder: "example",
      hint: "Just the subdomain from `example.booqable.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Account settings → Authentication methods → Create new authentication method.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /companies/current` needs no scope and echoes only the company's own
   * metadata (name, slug, address, subscription) — never the caller's
   * credential. A 401/403 is classified from Booqable's own
   * `{ errors: [{ title, detail }] }` body rather than the bare status code,
   * per developers.booqable.com's documented error shape.
   */
  async test({ credential }, ctx) {
    const { companySlug, accessToken } = credential as {
      companySlug?: string;
      accessToken?: string;
    };
    if (!companySlug || !accessToken) {
      return { ok: false, message: "credential missing companySlug or accessToken" };
    }
    const res = await ctx.fetch(`${baseUrl(companySlug)}/companies/current`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) {
      const message = errorMessage(await res.text().catch(() => ""));
      return { ok: false, message: message || `Booqable returned ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Records the company slug on the connection so the client can build URLs
   * without ever seeing the credential, and publishes the company's display
   * name for `connectionLabel`.
   */
  async afterConnect({ credential }, ctx) {
    const { companySlug, accessToken } = credential as {
      companySlug?: string;
      accessToken?: string;
    };
    if (!companySlug) return {};
    const res = await ctx.fetch(`${baseUrl(companySlug)}/companies/current`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { companySlug };
    const body = await res.json().catch(() => ({})) as {
      data?: { attributes?: Record<string, unknown> };
    };
    return { companySlug, company: body.data?.attributes ?? {} };
  },
};

export default accessToken;
