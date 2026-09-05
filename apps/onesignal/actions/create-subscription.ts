import type { ActionDefinition } from "@w6w/types";
import { compact, OneSignalClient, resolveAppId } from "../lib/client.ts";
import { ALIAS_PARAMS, aliasPath } from "../lib/alias.ts";

interface Input {
  aliasLabel?: string;
  aliasId: string;
  type: string;
  token: string;
  enabled?: boolean;
}

const SUBSCRIPTION_TYPES = [
  "Email",
  "SMS",
  "iOSPush",
  "AndroidPush",
  "HuaweiPush",
  "FireOSPush",
  "WindowsPush",
  "macOSPush",
  "ChromeExtensionPush",
  "ChromePush",
  "FirefoxPush",
  "SafariPush",
];

/**
 * `POST /apps/{app_id}/users/by/{alias_label}/{alias_id}/subscriptions` —
 * attaches a new Subscription (an email address, phone number, or push
 * token) to an existing user, creating the user if the alias doesn't yet
 * exist. Verified against the OpenAPI document, whose `type` enum is
 * reproduced verbatim in {@link SUBSCRIPTION_TYPES}.
 */
const createSubscription: ActionDefinition<Input> = {
  key: "create-subscription",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Attach an email, phone number, or push token to a user.",
  idempotent: false,
  params: [
    ...ALIAS_PARAMS,
    {
      key: "type",
      label: "Subscription Type",
      type: "select",
      required: true,
      options: SUBSCRIPTION_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      key: "token",
      label: "Token",
      type: "string",
      required: true,
      hint: "Email address, E.164 phone number, or push token — must match the chosen type.",
    },
    { key: "enabled", label: "Enabled", type: "boolean", default: true, advanced: true },
  ],
  output: [
    { key: "identity", type: "object", label: "Identity" },
    { key: "subscription", type: "object", label: "Subscription" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = {
      subscription: compact({ type: input.type, token: input.token, enabled: input.enabled }),
    };
    return new OneSignalClient(ctx).json(
      `/apps/${encodeURIComponent(appId)}/users${
        aliasPath(input.aliasLabel, input.aliasId)
      }/subscriptions`,
      { method: "POST", body },
    );
  },
};

export default createSubscription;
