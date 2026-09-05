import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SenderClient } from "../lib/client.ts";

/**
 * `POST /v2/subscribers` — creates a new subscriber.
 *
 * `fields` is Sender's custom-field map, keyed by the field's `{$placeholder}`
 * name (not its id) per the vendor's own worked example:
 * `"fields": {"{$test_text}": "Documentation example", "{$test_num}": 8}`.
 */
interface Input {
  email: string;
  firstname?: string;
  lastname?: string;
  groups?: string[];
  fields?: unknown;
  phone?: string;
  triggerAutomation?: boolean;
}

const subscriberCreate: ActionDefinition<Input> = {
  key: "subscriber-create",
  type: "perform",
  resource: "subscriber",
  title: "Create Subscriber",
  description: "Create a new subscriber, providing basic information, custom fields and groups.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    {
      key: "groups",
      label: "Group IDs",
      type: "multiselect",
      hint: "Group IDs to add this subscriber to.",
    },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint:
        'Keyed by the field\'s placeholder name, e.g. {"{$test_text}": "value"} — not the field id.',
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
  ],
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/subscribers", {
      method: "POST",
      body: compact({
        email: input.email,
        firstname: input.firstname,
        lastname: input.lastname,
        groups: input.groups,
        fields: asOptionalJson<Record<string, unknown>>(input.fields, "fields"),
        phone: input.phone,
        trigger_automation: input.triggerAutomation,
      }),
    });
  },
};

export default subscriberCreate;
