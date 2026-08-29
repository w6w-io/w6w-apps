import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";

/**
 * `POST /recipients` — create a reusable recipient.
 *
 * `phone` is the recipient's unique identifier in Onfleet — creating a
 * second recipient with the same phone number updates rather than
 * duplicates. It cannot be changed after creation (see `recipient-update`).
 */
const action: ActionDefinition = {
  key: "recipient-create",
  type: "perform",
  resource: "recipient",
  title: "Create recipient",
  description:
    "Create a reusable recipient. `phone` is the unique identifier and unset afterwards.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      required: true,
      hint: "A leading `+` overrides the organization's country setting for validation.",
    },
    { key: "notes", label: "Notes", type: "text", default: "" },
    {
      key: "skipSMSNotifications",
      label: "Skip SMS notifications",
      type: "boolean",
      default: false,
    },
    {
      key: "skipPhoneNumberValidation",
      label: "Skip phone number validation",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "The number must still start with `+`; country-specific rules are just not enforced.",
    },
    {
      key: "useLongCodeForText",
      label: "Use long code for text",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Canadian organizations only — use a toll-free long code for non-Canadian recipients.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Recipient ID" },
    { key: "phone", type: "string", label: "Phone" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.name) throw new Error("`name` is required");
    if (!p.phone) throw new Error("`phone` is required");

    const recipient = await new OnfleetClient(ctx).request<{ id?: string }>("/recipients", {
      method: "POST",
      body: compact({
        name: p.name,
        phone: p.phone,
        notes: p.notes,
        skipSMSNotifications: p.skipSMSNotifications === true ? true : undefined,
        skipPhoneNumberValidation: p.skipPhoneNumberValidation === true ? true : undefined,
        useLongCodeForText: p.useLongCodeForText === true ? true : undefined,
      }),
    });

    ctx.log("info", "created an Onfleet recipient", { recipientId: recipient?.id });
    return recipient;
  },
};

export default action;
