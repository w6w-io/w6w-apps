import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId, stripSignatureSecret } from "../lib/client.ts";
import { targetTypeOptions } from "../lib/params.ts";

/**
 * `PATCH /api/v2/callrouters/{id}` — update fields on an existing API call
 * router.
 *
 * **Redacted.** See `lib/client.ts` for why `signature.secret` is stripped.
 *
 * The vendor's own note on `resetErrorCount`: routers auto-disable after 10
 * routing errors within an hour, and setting `enabled: true` does NOT reset
 * that counter — so a router fixed after an outage will likely disable itself
 * again after one more error unless this flag is also set.
 */
interface Input {
  callRouterId: string;
  name?: string;
  officeId?: string;
  routingUrl?: string;
  defaultTargetId?: string;
  defaultTargetType?: string;
  secret?: string;
  enabled?: boolean;
  resetErrorCount?: boolean;
}

const callroutersUpdate: ActionDefinition<Input> = {
  key: "callrouters-update",
  type: "perform",
  resource: "callrouter",
  title: "Update Call Router",
  description: "Update the provided fields for an existing API call router.",
  idempotent: true,
  params: [
    { key: "callRouterId", label: "Call Router ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "officeId", label: "Office ID", type: "string" },
    { key: "routingUrl", label: "Routing URL", type: "string" },
    { key: "defaultTargetId", label: "Default target ID", type: "string" },
    {
      key: "defaultTargetType",
      label: "Default target type",
      type: "select",
      options: targetTypeOptions,
    },
    {
      key: "secret",
      label: "Signature secret",
      type: "secret",
      hint: "Plain-text string, minimum 32 characters.",
    },
    { key: "enabled", label: "Enabled", type: "boolean" },
    {
      key: "resetErrorCount",
      label: "Reset auto-disablement error count",
      type: "boolean",
      hint: "Setting Enabled to true does NOT reset the hourly error count on its own — set this " +
        "too, or the router likely disables itself again after one more error.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call router ID" },
    { key: "enabled", type: "boolean", label: "Enabled" },
  ],

  async execute(input, ctx) {
    const router = await new DialpadClient(ctx).json(
      `/callrouters/${encodeId(input.callRouterId)}`,
      {
        method: "PATCH",
        body: {
          name: input.name,
          office_id: input.officeId ? Number(input.officeId) : undefined,
          routing_url: input.routingUrl,
          default_target_id: input.defaultTargetId ? Number(input.defaultTargetId) : undefined,
          default_target_type: input.defaultTargetType,
          secret: input.secret,
          enabled: input.enabled,
          reset_error_count: input.resetErrorCount,
        },
      },
    );
    return stripSignatureSecret(router);
  },
};

export default callroutersUpdate;
