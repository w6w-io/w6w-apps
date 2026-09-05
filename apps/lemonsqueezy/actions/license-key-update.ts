import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient } from "../lib/client.ts";

/** `PATCH /v1/license-keys/:id`. */
interface Input {
  licenseKeyId: string;
  activationLimit?: number;
  unlimitedActivations?: boolean;
  expiresAt?: string;
  disabled?: boolean;
}

const licenseKeyUpdate: ActionDefinition<Input> = {
  key: "license-key-update",
  type: "perform",
  resource: "license-key",
  title: "Update License Key",
  description: "Change a license key's activation limit, expiry, or disable it.",
  idempotent: true,
  params: [
    { key: "licenseKeyId", label: "License Key ID", type: "string", required: true },
    {
      key: "activationLimit",
      label: "Activation limit",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "unlimitedActivations",
      label: "Unlimited activations",
      type: "boolean",
      hint: "Sets the activation limit to unlimited (`null`). Overrides Activation limit.",
    },
    { key: "expiresAt", label: "Expires at", type: "datetime", hint: "Leave blank for perpetual." },
    { key: "disabled", label: "Disabled", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The updated License Key object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/license-keys/${encodeURIComponent(input.licenseKeyId)}`,
      {
        method: "PATCH",
        body: jsonApiBody(
          "license-keys",
          {
            activation_limit: input.unlimitedActivations ? null : input.activationLimit,
            expires_at: input.expiresAt,
            disabled: input.disabled,
          },
          undefined,
          input.licenseKeyId,
        ),
      },
    );
  },
};

export default licenseKeyUpdate;
