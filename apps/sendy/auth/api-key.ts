import type { AuthDefinition } from "@w6w/types";
import { GET_BRANDS_PATH, normalizeBaseUrl } from "../lib/client.ts";

/**
 * API Key (`apiKey`, body-located) plus the installation URL — the only auth
 * Sendy's API documents.
 *
 * ## The key travels in the POST body, never a header
 *
 * Every endpoint at https://sendy.co/api lists `api_key` as a form field,
 * never as an `Authorization` header or a query parameter. `apiKey: { in:
 * "body", name: "api_key" }` records that location declaratively (as with
 * `mandrill` in this pack, for a JSON body instead of a form-urlencoded
 * one) — the runtime never auto-signs from that metadata, so `sign` below
 * does the actual work by hand: it parses the form body the action already
 * built, sets `api_key` on top, and re-serializes.
 *
 * ## The installation URL is half the credential
 *
 * Sendy is self-hosted: an API key means nothing without the address of the
 * install that issued it, and — unlike most self-hosted apps in this pack —
 * that address can include a path prefix the operator chose (a subdirectory
 * install), which `normalizeBaseUrl` preserves rather than stripping.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Your Sendy installation's URL plus an API key from Settings. Sent as an `api_key` field " +
    "in the POST body — never a header.",
  connectionLabel: "Sendy @ {{baseUrl}}",
  apiKey: { in: "body", name: "api_key" },
  fields: [
    {
      key: "baseUrl",
      label: "Installation URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/sendy",
      hint: "Your Sendy installation's address, including any subdirectory it's installed in. " +
        "A URL without a scheme is assumed to be https.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Sendy → Settings → your API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const params = new URLSearchParams(request.body ?? "");
    params.set("api_key", apiKey);
    request.body = params.toString();
    request.headers["content-type"] = "application/x-www-form-urlencoded";
    return request;
  },

  /**
   * `POST /api/brands/get-brands.php` with only `api_key` is the narrowest
   * documented call that needs nothing else — `get-lists.php` also needs a
   * `brand_id` the connection does not have yet, and every subscriber
   * endpoint needs a list id. The credential is classified from the
   * response BODY, never the HTTP status (Sendy answers every one of these
   * calls with 200 whether it succeeded or not), and the body never echoes
   * the key back, so nothing sensitive is read to make the call.
   */
  async test({ credential }, ctx) {
    const { apiKey, baseUrl } = credential as { apiKey?: string; baseUrl?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${GET_BRANDS_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ api_key: apiKey }).toString(),
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    const text = (await res.text().catch(() => "")).trim();
    if (text === "Invalid API key") {
      return { ok: false, message: "Sendy rejected the API key (Invalid API key)" };
    }
    if (text === "API key not passed") {
      return { ok: false, message: "Sendy did not receive the API key" };
    }
    if (text === "No data passed") {
      return {
        ok: false,
        message: `no data reached Sendy at ${base}${GET_BRANDS_PATH} — check the installation URL`,
      };
    }
    // A valid key with zero brands still documents this exact string — it is
    // a working credential, just an install with nothing in it yet.
    if (text === "No brands found") return { ok: true };
    try {
      JSON.parse(text);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: `unexpected response from ${base}${GET_BRANDS_PATH} — is this a Sendy ` +
          `installation? (${text.slice(0, 200)})`,
      };
    }
  },

  afterConnect({ credential }, _ctx) {
    const { baseUrl } = credential as { baseUrl?: string };
    return { baseUrl: baseUrl ? normalizeBaseUrl(baseUrl) : undefined };
  },
};

export default apiKey;
