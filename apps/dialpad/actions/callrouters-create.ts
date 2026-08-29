import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, stripSignatureSecret } from "../lib/client.ts";
import { targetTypeOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/callrouters` — create a new API-based call router: Dialpad
 * calls `routingUrl` to decide where an inbound call should go.
 *
 * **Redacted.** The response echoes `signature.secret` — the exact secret
 * string the caller may have just supplied, or one Dialpad generated — see
 * `lib/client.ts`. Stripped before this action returns; the value is still
 * visible in the Dialpad admin console.
 *
 * No idempotency key is documented, so calling this twice creates two routers.
 */
interface Input {
  name: string;
  officeId: string;
  routingUrl: string;
  defaultTargetId: string;
  defaultTargetType: string;
  secret?: string;
  enabled?: boolean;
}

const callroutersCreate: ActionDefinition<Input> = {
  key: "callrouters-create",
  type: "perform",
  resource: "callrouter",
  title: "Create Call Router",
  description:
    "Create a new API-based call router. Dialpad calls Routing URL with a signed request to " +
    "decide where an inbound call to this router's numbers should go.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "officeId", label: "Office ID", type: "string", required: true },
    {
      key: "routingUrl",
      label: "Routing URL",
      type: "string",
      required: true,
      hint: "The URL Dialpad calls to drive routing decisions for this router.",
    },
    {
      key: "defaultTargetId",
      label: "Default target ID",
      type: "string",
      required: true,
      hint: "Fallback destination if the router is disabled or the routing call fails.",
    },
    {
      key: "defaultTargetType",
      label: "Default target type",
      type: "select",
      options: targetTypeOptions,
      required: true,
    },
    {
      key: "secret",
      label: "Signature secret",
      type: "secret",
      hint: "A plain-text string, minimum 32 characters, used to sign requests to Routing URL. " +
        "Leave empty to let Dialpad generate one.",
    },
    {
      key: "enabled",
      label: "Enabled",
      type: "boolean",
      hint: "When false, calls skip Routing URL and go straight to the default target.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Call router ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const router = await new DialpadClient(ctx).json("/callrouters", {
      method: "POST",
      body: {
        name: input.name,
        office_id: Number(input.officeId),
        routing_url: input.routingUrl,
        default_target_id: Number(input.defaultTargetId),
        default_target_type: input.defaultTargetType,
        secret: input.secret,
        enabled: input.enabled,
      },
    });
    return stripSignatureSecret(router);
  },
};

export default callroutersCreate;
