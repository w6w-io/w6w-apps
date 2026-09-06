import type { AuthDefinition } from "@w6w/types";
import { normalizePortalUrl, safeErrorMessage } from "../lib/client.ts";
import type { Bitrix24ErrorBody } from "../lib/client.ts";

/**
 * A Bitrix24 portal's own "inbound webhook" — created from Settings →
 * Developer resources → Other → Inbound webhook (older UIs) or Applications →
 * Webhooks (current UI). Bitrix24 hands back a ready-made URL of the shape
 * `https://<portal>/rest/<user_id>/<webhook_code>/`, and every method is
 * called by appending its name to it — verified against every method page's
 * own "cURL (Webhook)" example.
 *
 * ## Webhook vs OAuth
 *
 * Bitrix24 documents two ways in (`profile.html`'s own two cURL tabs are
 * typical): this inbound webhook, and full OAuth2 (registering a local
 * application per portal, then an authorization-code exchange). The webhook
 * needs none of that — one URL, generated once, scoped to whatever
 * permissions the creating admin grants it — so only it is implemented here.
 *
 * ## The URL segment IS the credential
 *
 * Unlike a bearer token in a header, this auth method's secret lives IN the
 * request path: `<user_id>/<webhook_code>`. The portal address itself
 * (`https://mycompany.bitrix24.com`) is not sensitive — it is stored on the
 * Connection's display metadata via `afterConnect`, exactly like `bubble`'s
 * `baseUrl` — but the `<user_id>/<webhook_code>` segment is, so it lives only
 * in the credential and is spliced into the request path by `sign`, never
 * built by an Action.
 */
const webhook: AuthDefinition = {
  key: "webhook",
  type: "custom",
  displayName: "Inbound Webhook",
  description: "A Bitrix24 portal's own inbound webhook URL, split into its three parts. " +
    "Grants exactly the permissions selected when the webhook was created in that portal's " +
    "Settings → Developer resources → Other → Inbound webhook (or Applications → Webhooks).",
  connectionLabel: "{{portalUrl}}",
  fields: [
    {
      key: "portalUrl",
      label: "Portal URL",
      type: "string",
      required: true,
      placeholder: "https://mycompany.bitrix24.com",
      hint: "The Bitrix24 portal's own address — the part of the webhook URL before `/rest/`. " +
        "A bare hostname is assumed to be https.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      default: "1",
      hint: "The numeric segment right after `/rest/` in the webhook URL Bitrix24 generated " +
        '(e.g. the "1" in `.../rest/1/xxxxxxxxxxxxxxxx/`) — the id of the user the webhook acts ' +
        "as.",
    },
    {
      key: "webhookCode",
      label: "Webhook Code",
      type: "secret",
      required: true,
      hint: "The long alphanumeric segment after the user id in the generated webhook URL. This " +
        "is the actual secret — create one webhook per system connecting to this portal so it " +
        "can be revoked on its own.",
    },
  ],

  /**
   * Splices `<user_id>/<webhook_code>` into the request path. Actions build
   * `{portalUrl}/rest/{method}`; this turns it into `{portalUrl}/rest/{user_id}/
   * {webhook_code}/{method}` — the shape every method page's own example uses.
   * Network-less: only rewrites `request.url`, never calls `ctx.fetch`.
   */
  sign({ request, credential }) {
    const { userId, webhookCode } = credential as { userId: string; webhookCode: string };
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/rest/")) {
      throw new Error(`bitrix24 sign: expected a /rest/ path, got ${url.pathname}`);
    }
    url.pathname = url.pathname.replace(
      /^\/rest\//,
      `/rest/${encodeURIComponent(userId)}/${encodeURIComponent(webhookCode)}/`,
    );
    request.url = url.toString();
    return request;
  },

  /**
   * Bitrix24 publishes no dedicated whoami/ping method, but `profile`
   * (`api-reference/common/users/profile.html`) is scoped `basic` — it "allows
   * you to retrieve basic information about the current user without any
   * scopes, unlike `user.current`" — so it works no matter which permissions
   * the webhook was granted, and it returns only `ID`/`NAME`/`LAST_NAME`/
   * `ADMIN`/`PERSONAL_GENDER`/`TIME_ZONE`/`PERSONAL_PHOTO`: nothing that
   * echoes the webhook code back.
   *
   * Bitrix24's own error-codes page says to check the HTTP status OR the
   * `{error, error_description}` JSON shape — never the status alone — so
   * both are read here rather than trusting a 200.
   */
  async test({ credential }, ctx) {
    const { portalUrl, userId, webhookCode } = credential as {
      portalUrl?: string;
      userId?: string;
      webhookCode?: string;
    };
    if (!portalUrl) return { ok: false, message: "credential missing portalUrl" };
    if (!userId) return { ok: false, message: "credential missing userId" };
    if (!webhookCode) return { ok: false, message: "credential missing webhookCode" };

    let base: string;
    try {
      base = normalizePortalUrl(portalUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(
        `${base}/rest/${encodeURIComponent(userId)}/${encodeURIComponent(webhookCode)}/profile`,
        {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: "{}",
        },
      );
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = undefined;
    }

    const errBody = parsed && typeof parsed === "object" && "error" in (parsed as object)
      ? (parsed as Bitrix24ErrorBody)
      : null;
    if (errBody) {
      const detail = safeErrorMessage(errBody);
      return {
        ok: false,
        message: detail
          ? `Bitrix24 rejected the webhook: ${detail}`
          : "Bitrix24 rejected the webhook",
      };
    }
    if (res.ok && parsed && typeof parsed === "object" && "result" in (parsed as object)) {
      return { ok: true };
    }
    if (parsed === undefined) {
      return {
        ok: false,
        message: `${base} did not answer with Bitrix24's JSON shape (status ${res.status}) — ` +
          "check the portal URL",
      };
    }
    return { ok: false, message: `Bitrix24 answered ${res.status} with an unexpected body` };
  },

  /**
   * Persists the normalised portal URL onto the Connection's display metadata
   * — every action's `Bitrix24Client` and the `portal` health check read it
   * from there. Never touches `userId`/`webhookCode`.
   */
  afterConnect({ credential }) {
    const { portalUrl } = credential as { portalUrl?: string };
    if (!portalUrl) return {};
    try {
      return { portalUrl: normalizePortalUrl(portalUrl) };
    } catch {
      return { portalUrl };
    }
  },
};

export default webhook;
