import type { AuthDefinition } from "@w6w/types";
import { apiRoot, normalizeBaseUrl, safeErrorMessage } from "../lib/client.ts";
import type { KintoneErrorBody } from "../lib/client.ts";

/**
 * A Kintone App's own per-App API Token, sent as `X-Cybozu-API-Token` — verified
 * against `docs/common/authentication` 2026-09-05.
 *
 * ## Why API Token, not Password Authentication
 *
 * Kintone documents four ways to authenticate: Password (`X-Cybozu-Authorization`,
 * BASE64 `login:password`), API Token (`X-Cybozu-API-Token`), Session (cookie,
 * browser-only) and OAuth 2.0. Password Authentication runs with the full
 * privileges of a real user account across the whole tenant — every App, every
 * Space — which is a poor fit for an unattended integration credential. An API
 * Token is generated **inside one App's own Advanced Settings**, cannot see any
 * other App, is capped at 20 per App, and every call it makes is attributed to
 * the built-in "Administrator" user in Kintone's own audit log — the
 * least-privilege, purpose-built option for this kind of connection.
 *
 * There is also a legacy, unrelated feature actually named "Basic Authentication"
 * in Kintone's docs — a network-perimeter `Authorization: Basic` header some
 * older environments required in front of everything else. It has been
 * deprecated and unavailable since June 2020 and is not implemented here; it is
 * a different mechanism from the still-current `X-Cybozu-Authorization` header
 * Password Authentication uses, and the two are easy to conflate by name alone.
 *
 * ## What an API Token cannot do
 *
 * Kintone's authentication reference enumerates exactly which REST APIs accept
 * API Token authentication, and it is a real allowlist, not "everything except
 * admin APIs": notably **Get Apps** (list every App in the tenant) is NOT on
 * it — only the singular **Get App** is. Password, Session or OAuth 2.0 is
 * required to list Apps, and this app has no such method, so no "list apps"
 * action exists here — see the README for what that means in practice (you
 * supply the App ID; nothing here discovers it for you).
 *
 * ## Multiple tokens, one header
 *
 * A request touching a Lookup or Related Records field that pulls from a
 * *different* App needs that App's token too. Kintone accepts this as a single
 * comma-separated header value (`token1,token2`) or two separate headers with
 * the same name; this field is sent verbatim, so a comma-separated value the
 * user pastes in already works without this app needing to parse it.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "custom",
  displayName: "API Token",
  description: "A Kintone App's own API Token (Advanced Settings → API Token), sent as " +
    "`X-Cybozu-API-Token`. Scoped to the one App it was generated in.",
  connectionLabel: "{{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Tenant URL",
      type: "string",
      required: true,
      placeholder: "https://mycompany.cybozu.com",
      hint: "Your Kintone tenant's own root — `https://{subdomain}.cybozu.com` or " +
        "`https://{subdomain}.kintone.com`. Every Kintone customer has their own tenant; there " +
        "is no shared API host.",
    },
    {
      key: "guestSpaceId",
      label: "Guest Space ID",
      type: "string",
      advanced: true,
      hint: "Only set this if the Apps you are connecting to live inside a Guest Space — it " +
        "changes every request's path from `/k/v1/...` to `/k/guest/{id}/v1/...`. Leave blank " +
        "for a normal (non-guest) App.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Generated in the App's own Settings → API Token. Up to 20 tokens per App; create " +
        "one per system connecting to it so it can be revoked on its own. Comma-separate two " +
        "tokens if this connection needs to resolve a Lookup/Related Records field from another App.",
    },
    {
      key: "testAppId",
      label: "App ID To Verify With",
      type: "string",
      required: true,
      hint: "Any App ID this token can access. Kintone has no whoami for API Token " +
        "authentication, so the connection is tested with Get App against this App ID instead — " +
        "it must be the same App the token was generated in (or one the token's App-to-App " +
        "sharing reaches).",
    },
  ],

  sign({ request, credential }) {
    const { apiToken: token } = credential as { apiToken: string };
    request.headers["x-cybozu-api-token"] = token;
    return request;
  },

  /**
   * `GET /k/v1/app.json?id={testAppId}` — the narrowest read the auth
   * reference lists as API-Token-authenticated that both takes no other setup
   * and proves the token against a specific App the way it is actually scoped.
   *
   * Classified from the response BODY, not the status code: Kintone's REST API
   * returns the same `{code, id, message}` JSON shape for every failure
   * (documented in the REST API Overview), so a structured error body — even a
   * "wrong App ID" one — proves the tenant URL and token reached a real
   * Kintone environment; only a non-JSON response (Cybozu's edge answering an
   * unrelated page) is treated as unreachable rather than merely rejected.
   */
  async test({ credential }, ctx) {
    const { apiToken: token, baseUrl, guestSpaceId, testAppId } = credential as {
      apiToken?: string;
      baseUrl?: string;
      guestSpaceId?: string;
      testAppId?: string;
    };
    if (!token) return { ok: false, message: "credential missing apiToken" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };
    if (!testAppId) return { ok: false, message: "credential missing testAppId" };

    let root: string;
    try {
      root = apiRoot({ baseUrl: normalizeBaseUrl(baseUrl), guestSpaceId });
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${root}/v1/app.json?id=${encodeURIComponent(testAppId)}`, {
        headers: { "x-cybozu-api-token": token, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${root}: ${String(err)}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) as KintoneErrorBody | null : null;

    if (res.status === 200) {
      return body && typeof body === "object" && "appId" in body
        ? { ok: true }
        : { ok: false, message: "Kintone answered 200 with an unexpected body shape" };
    }
    if (!isJson || !body) {
      return {
        ok: false,
        message: `no Kintone tenant at ${root} answered the API — check the Tenant URL and ` +
          "Guest Space ID (got a non-JSON response, which Kintone's REST API never returns)",
      };
    }
    const detail = safeErrorMessage(body);
    return {
      ok: false,
      message: detail
        ? `Kintone rejected the request: ${detail}`
        : `Kintone returned ${res.status}`,
    };
  },

  afterConnect({ credential }) {
    const { baseUrl, guestSpaceId } = credential as { baseUrl?: string; guestSpaceId?: string };
    if (!baseUrl) return {};
    try {
      const display: Record<string, unknown> = { baseUrl: normalizeBaseUrl(baseUrl) };
      if (guestSpaceId) display.guestSpaceId = guestSpaceId;
      return display;
    } catch {
      return { baseUrl };
    }
  },
};

export default apiToken;
