import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, toList, WhopClient } from "../lib/client.ts";
import { webhookEventOptions } from "../lib/params.ts";

/**
 * `POST /webhooks`.
 *
 * ## The response carries a live signing secret — treat the output as sensitive
 *
 * The create response's `webhook_secret` field is "returned on the create
 * response ... `null` for API-key and OAuth callers on later reads" — this is
 * the ONE place this app hands back a value the caller must keep secret to
 * verify inbound deliveries. Unlike a leaked read-only credential (which this
 * pack strips), this secret is the whole point of the call and cannot be
 * dropped without breaking the reason to call this action at all — so it is
 * returned, and the caller is responsible for storing it in something the
 * runtime does not log in plain view (a Document or Var, not a workflow
 * output that gets echoed into a chat message).
 */
interface Input {
  url: string;
  events: string[] | string;
  resourceId?: string;
  enabled?: boolean;
  childResourceEvents?: boolean;
  apiVersionDate?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook endpoint that receives event notifications via HTTP POST. The response " +
    "includes a signing secret — treat it as sensitive.",
  idempotent: true,
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
    },
    {
      key: "resourceId",
      label: "Account or app ID",
      type: "string",
      hint: "The account (biz_) or app (app_) this webhook is attached to. Defaults to the " +
        "current account.",
    },
    { key: "enabled", label: "Enabled", type: "boolean", default: true },
    {
      key: "childResourceEvents",
      label: "Include child resource events",
      type: "boolean",
      hint: "For a webhook on an account, also send events from its connected accounts.",
    },
    {
      key: "apiVersionDate",
      label: "Pin payload version",
      type: "string",
      placeholder: "2026-08-25-2",
      hint: "Dated API version this webhook's payloads are pinned to. Omit to track the current " +
        "payload shape.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created webhook, including webhook_secret" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      "/webhooks",
      {
        url: input.url,
        events: toList(input.events),
        resource_id: input.resourceId,
        enabled: input.enabled,
        child_resource_events: input.childResourceEvents,
        api_version_date: input.apiVersionDate,
      },
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default webhookCreate;
