import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  identifier: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  unlinkListIds?: number[];
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  smtpBlacklistSender?: string[];
}

const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact by email, ID, or SMS attribute value.",
  params: [
    {
      key: "identifier",
      label: "Contact Identifier",
      type: "string",
      required: true,
      hint: "Email (URL-encoded), contact ID, or SMS attribute value.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      hint: "JSON object of contact attributes to set.",
    },
    { key: "listIds", label: "Add to Lists", type: "json" },
    { key: "unlinkListIds", label: "Remove from Lists", type: "json" },
    { key: "emailBlacklisted", label: "Email blacklisted", type: "boolean" },
    { key: "smsBlacklisted", label: "SMS blacklisted", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.attributes) body.attributes = input.attributes;
    if (input.listIds) body.listIds = input.listIds;
    if (input.unlinkListIds) body.unlinkListIds = input.unlinkListIds;
    if (input.emailBlacklisted !== undefined) body.emailBlacklisted = input.emailBlacklisted;
    if (input.smsBlacklisted !== undefined) body.smsBlacklisted = input.smsBlacklisted;
    if (input.smtpBlacklistSender) body.smtpBlacklistSender = input.smtpBlacklistSender;
    await client.request(`/contacts/${encodeURIComponent(input.identifier)}`, {
      method: "PUT",
      body,
    });
    return { success: true };
  },
};

export default updateContact;
