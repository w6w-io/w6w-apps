import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SenderClient } from "../lib/client.ts";
import { subscriberIdentifierParam, subscriberStatusOptions } from "../lib/params.ts";

/**
 * `PATCH /v2/subscribers/{email}or{phone}or{ID}` — updates a subscriber's
 * information, custom fields, groups or channel status.
 */
interface Input {
  identifier: string;
  firstname?: string;
  lastname?: string;
  groups?: string[];
  fields?: unknown;
  subscriberStatus?: string;
  phone?: string;
  triggerAutomation?: boolean;
  smsStatus?: string;
  transactionalEmailStatus?: string;
}

const subscriberUpdate: ActionDefinition<Input> = {
  key: "subscriber-update",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber",
  description: "Update a subscriber's information, custom fields, groups or status.",
  idempotent: true,
  params: [
    subscriberIdentifierParam,
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    {
      key: "groups",
      label: "Group IDs",
      type: "multiselect",
      hint: "Replaces the subscriber's group membership with these group IDs.",
    },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint: 'Keyed by the field\'s placeholder name, e.g. {"{$test_text}": "value"}.',
    },
    {
      key: "subscriberStatus",
      label: "Email status",
      type: "select",
      options: subscriberStatusOptions,
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Must include the country code, e.g. +370XXXXXXXX or 00370XXXXXXXX.",
    },
    {
      key: "triggerAutomation",
      label: "Trigger automation",
      type: "boolean",
      default: true,
      hint: "Sender's own default is true. Set to false to skip activating an automation.",
    },
    { key: "smsStatus", label: "SMS status", type: "select", options: subscriberStatusOptions },
    {
      key: "transactionalEmailStatus",
      label: "Transactional email status",
      type: "select",
      options: subscriberStatusOptions,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/subscribers/${encodeURIComponent(input.identifier)}`, {
      method: "PATCH",
      body: compact({
        firstname: input.firstname,
        lastname: input.lastname,
        groups: input.groups,
        fields: asOptionalJson<Record<string, unknown>>(input.fields, "fields"),
        subscriber_status: input.subscriberStatus,
        phone: input.phone,
        trigger_automation: input.triggerAutomation,
        sms_status: input.smsStatus,
        transactional_email_status: input.transactionalEmailStatus,
      }),
    });
  },
};

export default subscriberUpdate;
