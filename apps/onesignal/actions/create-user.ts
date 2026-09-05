import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  externalId?: string;
  tags?: unknown;
  language?: string;
  timezoneId?: string;
  subscriptions?: unknown;
}

/**
 * `POST /apps/{app_id}/users` — verified against OneSignal's OpenAPI document
 * (`identity`, `properties`, `subscriptions`, all optional but at least an
 * identity is needed to address the user afterwards).
 *
 * `tags`/`subscriptions` are raw `json` params rather than fully typed
 * sub-forms: `properties.tags` is an open string→string map by design, and
 * `subscriptions` items carry a 12-way `type` enum (`iOSPush`, `AndroidPush`,
 * `Email`, `SMS`, …) whose validity depends on the platform being sent — see
 * the vendor's [Subscriptions](https://documentation.onesignal.com/docs/en/subscriptions)
 * guide for the field-by-field shape.
 */
const createUser: ActionDefinition<Input> = {
  key: "create-user",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a user, optionally with an External ID, tags, and subscriptions.",
  idempotent: false,
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "Your own unique ID for this user. Strongly recommended — without one this user " +
        "can only be addressed by the OneSignal ID this call returns.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      hint: 'Flat string key/value pairs, e.g. {"plan": "pro"}.',
    },
    { key: "language", label: "Language", type: "string", default: "", advanced: true },
    { key: "timezoneId", label: "Timezone", type: "string", default: "", advanced: true },
    {
      key: "subscriptions",
      label: "Subscriptions",
      type: "json",
      default: "",
      hint: 'e.g. [{"type": "Email", "token": "a@example.com"}]',
      advanced: true,
    },
  ],
  output: [
    { key: "identity", type: "object", label: "Identity (incl. onesignal_id)" },
    { key: "properties", type: "object", label: "Properties" },
    { key: "subscriptions", type: "array", label: "Subscriptions" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      identity: input.externalId ? { external_id: input.externalId } : undefined,
      properties: compact({
        tags: asOptionalJson(input.tags, "tags"),
        language: input.language,
        timezone_id: input.timezoneId,
      }),
      subscriptions: asOptionalJson(input.subscriptions, "subscriptions"),
    });
    return new OneSignalClient(ctx).json(`/apps/${encodeURIComponent(appId)}/users`, {
      method: "POST",
      body,
    });
  },
};

export default createUser;
