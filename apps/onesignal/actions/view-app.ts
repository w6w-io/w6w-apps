import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId, stripAppSecrets } from "../lib/client.ts";

/**
 * `GET /apps/{app_id}?view=config` — verified against the OpenAPI document.
 * `view=config` is requested explicitly to omit the `players`/`messageable_players`
 * counts this action has no use for, per the vendor's own documented meaning
 * of that parameter.
 *
 * **The raw response carries live push credentials** —
 * `fcm_v1_service_account_json` (a full Firebase service-account private
 * key), `apns_p8`/`apns_certificates`/`safari_apns_certificate` (APNs signing
 * material), and the legacy `gcm_key`. Every one of those is stripped before
 * this action returns anything; see `lib/client.ts` for the full accounting
 * of why. This is also why the credential-liveness probe in
 * `auth/api-key.ts` reads `/segments` instead of this endpoint.
 */
const viewApp: ActionDefinition<Record<string, never>> = {
  key: "view-app",
  type: "read",
  resource: "app",
  title: "Get App",
  description: "Read this app's non-secret configuration and channel settings.",
  params: [],
  output: [
    { key: "id", type: "string", label: "App ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "channels", type: "array", label: "Enabled channels" },
  ],

  async execute(_input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const app = await new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}`,
      { query: { view: "config" } },
    );
    return stripAppSecrets(app);
  },
};

export default viewApp;
