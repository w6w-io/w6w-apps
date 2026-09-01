import type { AuthDefinition } from "@w6w/types";
import { formatTypeName, normalizeBaseUrl, safeErrorMessage } from "../lib/client.ts";
import type { BubbleErrorBody } from "../lib/client.ts";

/**
 * A Bubble app's own URL plus an **admin API token**, generated in that app's
 * Settings → API → "Generate a new API token".
 *
 * ## Admin token, not user token
 *
 * Bubble's docs describe two ways an external client authenticates
 * (`the-bubble-api/authentication/{as-an-admin,as-a-user}`):
 *
 *   - **Admin token** — a static token created once in the editor, giving
 *     "the same privileges as an admin would get in the Bubble editor": full
 *     read/write across every Data Type exposed to the Data API, and every
 *     API Workflow whose access level is Admin-only or looser. This is what
 *     this app implements.
 *   - **User token** — logging a specific end-user in through the client's
 *     own `Log the User in` API Workflow, which hands back a per-user token
 *     scoped by that app's own Privacy Rules. This is a bespoke flow the app
 *     builder has to design themselves (there is no fixed endpoint for it —
 *     it lives inside whichever API Workflow they build it into), so it is
 *     left out here rather than guessed at. A workflow that needs it can call
 *     the app's own login workflow directly via the "Trigger API workflow"
 *     action and reuse the returned token as this connection's token by
 *     reconnecting with it.
 *
 * Both methods send the token the same way — `Authorization: Bearer <token>` —
 * confirmed in `the-bubble-api/authentication/how-to-authenticate`.
 *
 * ## Every app is its own host
 *
 * Bubble is a no-code app *builder*: there is no shared API host, only each
 * builder's own `https://<appname>.bubbleapps.io` (or connected custom
 * domain). So, like `gitea`, `mautic` and `tableau` in this pack, the app URL
 * is a connection field and egress is `["*"]`.
 */
const adminToken: AuthDefinition = {
  key: "admin-token",
  type: "custom",
  displayName: "Admin API Token",
  description: "A Bubble app's own API root plus an admin token from Settings → API. Sent as " +
    "`Authorization: Bearer …`. This grants the same access as the app's own editor — full " +
    "read/write on every Data Type exposed to the Data API and every Admin-only API Workflow.",
  connectionLabel: "{{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "App URL",
      type: "string",
      required: true,
      placeholder: "https://myapp.bubbleapps.io/version-test",
      hint: "Copied from Settings → API once the Data API or Workflow API is enabled. Include " +
        "`/version-test` for the app's development version, a branch id for a custom " +
        "development branch, or neither for Live. A bare hostname is assumed to be https.",
    },
    {
      key: "apiToken",
      label: "Admin API Token",
      type: "secret",
      required: true,
      hint: 'Settings → API → "Generate a new API token". This grants full admin-level access ' +
        "— create one token per system connecting to this app so it can be revoked on its own.",
    },
    {
      key: "testDataType",
      label: "Data Type To Verify With",
      type: "string",
      default: "user",
      advanced: true,
      hint: "Bubble has no account/whoami endpoint — every Data API request needs a Data Type " +
        "that has been checked on in Settings → API → Data API Settings. This app probes that " +
        'type (formatted per Bubble\'s rules, e.g. "Rental Unit" → "rentalunit") to confirm ' +
        "the connection at connect time. Defaults to Bubble's built-in User type; change it if " +
        "User is not exposed to the Data API.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${apiToken}`;
    return request;
  },

  /**
   * Bubble publishes no admin/whoami endpoint of any kind — the Data API only
   * answers for Data Types the app builder has explicitly exposed, and the
   * Workflow API only for API Workflows they have named, so nothing about a
   * fresh connection is guessable across every Bubble app. `GET /obj/{type}`
   * against `testDataType` (Bubble's built-in `user` type by default) is the
   * narrowest thing this app can probe without asking the user to name one of
   * their own custom types.
   *
   * Confirmed live against a real (if empty) Bubble app 2026-09-01: an
   * invalid token gets **401 before Bubble even checks whether the Data API
   * is enabled** — a bad token against a Data-API-disabled app still answers
   * 401, not 404 — so 401 here reliably means the token itself is bad. A 404
   * is the ambiguous case: Bubble answers it identically whether the Data API
   * is off, the type is not exposed, or the app URL is simply wrong, so it is
   * reported as a failure with that ambiguity spelled out rather than guessed
   * at either way.
   *
   * The 401 body is an undocumented shape — `{"error_class":"Unauthorized",
   * "message":null,"translation":"Invalid or expired token: <token>"}` — that
   * echoes the token it just rejected. `translation` is never read here;
   * `safeErrorMessage` refuses any body carrying `error_class` for exactly
   * that reason.
   */
  async test({ credential }, ctx) {
    const { apiToken, baseUrl, testDataType } = credential as {
      apiToken?: string;
      baseUrl?: string;
      testDataType?: string;
    };
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }
    const type = formatTypeName(testDataType || "user");

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/1.1/obj/${type}?limit=1`, {
        headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) as BubbleErrorBody | null : null;
    const detail = safeErrorMessage(body); // never the token-echoing `translation` field

    if (res.status === 200) {
      return (body && typeof body === "object" && "response" in body)
        ? { ok: true }
        : { ok: false, message: "Bubble answered 200 with an unexpected body shape" };
    }
    if (res.status === 401) {
      return { ok: false, message: "Bubble rejected the token — invalid or expired (401)" };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `Bubble answered 404 for Data Type "${type}" — this can mean the app URL is ` +
          "wrong, the Data API is disabled (Settings → API), or that type is not checked on in " +
          'Data API Settings. Point "Data Type To Verify With" at one you have exposed, or check ' +
          `Settings → API on ${base}.` + (detail ? ` (${detail})` : ""),
      };
    }
    return {
      ok: false,
      message: detail
        ? `Bubble returned ${res.status}: ${detail}`
        : `Bubble returned ${res.status}`,
    };
  },

  /**
   * Persists the normalised app URL onto the Connection's display metadata —
   * `connectionLabel` and every action's `BubbleClient` read `baseUrl` from
   * there, never from the raw field. Never touches the token.
   */
  afterConnect({ credential }) {
    const { baseUrl } = credential as { baseUrl?: string };
    if (!baseUrl) return {};
    try {
      return { baseUrl: normalizeBaseUrl(baseUrl) };
    } catch {
      return { baseUrl };
    }
  },
};

export default adminToken;
