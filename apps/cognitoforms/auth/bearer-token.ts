import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Bearer Token (`bearer`).
 *
 * Cognito Forms' API key setup ("Organization -> Settings -> Integrations -> + New API Key")
 * mints a per-integration token you paste in here — it is called an "API Key" in the product UI
 * but travels as a standard OAuth bearer token, exactly as the OpenAPI spec's `securitySchemes`
 * declares (`type: http, scheme: bearer`). The spec's description also documents a
 * `?access_token=` query-string fallback for systems that can't send custom headers, but the header
 * form is used here — it's what the vendor's own setup guide tells integrators to do ("Use this
 * bearer token in the Authorization header when making API requests"), and it keeps the token out
 * of URLs and request logs.
 *
 * Each integration is independently scoped along two axes — a **Form Scope** (No Scopes / Read /
 * Read-Write) and an **Entry Scope** (No Scopes / Read / Read-Write / Read-Write-Delete) — and is
 * further restricted to specific forms/folders ("Can Access"). A working, correctly-scoped token can
 * therefore legitimately fail an action that needs a scope it wasn't granted; that is not the same
 * question as "is this token even valid", which is what `test` answers.
 */
const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste the API key from Organization -> Settings -> Integrations -> + New API Key. Despite the " +
    "name, it's a bearer token: sent as `Authorization: Bearer <key>` on every request.",
  fields: [
    {
      key: "accessToken",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Organization -> Settings -> Integrations -> + New API Key. Cannot be retrieved after " +
        "creation, so copy it immediately.",
    },
  ],

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /forms` — the cheapest read available, and the one every integration with any Form
   * access at all can reach (`Form Scope: Read` covers Get Forms per the vendor's own setup guide).
   *
   * A `MissingScope` response is deliberately NOT treated as a dead credential: it means the token
   * authenticated fine and was merely refused for lacking `Form:Read`, which is a legitimate
   * configuration for an integration scoped to entries only. An actually invalid or absent token
   * gets its own distinct `Type` (`AccessTokenInvalid` / `AccessTokenNotProvided`, confirmed live),
   * and those are what fail this check.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_URL}/forms`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { Type?: string; Message?: string } | null;
    if (body?.Type === "MissingScope") {
      return {
        ok: true,
        message: `Token is valid but lacks ${
          (body as { Data?: { MissingScope?: string } }).Data?.MissingScope ?? "Form:Read"
        } scope; liveness confirmed, form access not.`,
      };
    }
    return { ok: false, message: body?.Message ?? `Cognito Forms returned HTTP ${res.status}` };
  },
};

export default bearerToken;
