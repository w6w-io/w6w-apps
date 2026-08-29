import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";

/**
 * `POST /emailer_campaigns/{sequence_id}/add_contact_ids` — enroll contacts (not raw
 * `people-search` results — see `contact-create`) into a sequence.
 *
 * Apollo's own path AND body both name the sequence (`{sequence_id}` in the URL,
 * `emailer_campaign_id` in the body) and require them to match — this action fills the
 * body field from the path param automatically so a caller only names the sequence once.
 */
interface Input {
  sequence_id: string;
  contact_ids: string[] | string;
  send_email_from_email_account_id: string;
  label_names?: string[] | string;
  status?: "active" | "paused";
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sequenceAddContacts: ActionDefinition<Input> = {
  key: "sequence-add-contacts",
  type: "perform",
  resource: "sequence",
  title: "Add Contacts to Sequence",
  description: "Enroll one or more contacts into a sequence.",
  idempotent: false,
  params: [
    { key: "sequence_id", label: "Sequence", type: "string", required: true },
    {
      key: "contact_ids",
      label: "Contacts",
      type: "string",
      required: true,
      hint: "Comma-separated Apollo contact IDs.",
    },
    {
      key: "send_email_from_email_account_id",
      label: "Send from email account",
      type: "string",
      required: true,
      hint: "The Apollo email account ID emails will be sent from. From `email-account-list`.",
    },
    { key: "label_names", label: "Also add to lists", type: "string", advanced: true },
    {
      key: "status",
      label: "Initial status",
      type: "select",
      advanced: true,
      options: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
      ],
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "The enrolled contacts" },
    { key: "skipped_contact_ids", type: "array", label: "Contact IDs Apollo could not enroll" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<
      { contacts?: unknown[]; skipped_contact_ids?: unknown[] }
    >(`/emailer_campaigns/${encodeId(input.sequence_id)}/add_contact_ids`, {
      query: compact({
        emailer_campaign_id: input.sequence_id,
        contact_ids: toArr(input.contact_ids),
        send_email_from_email_account_id: input.send_email_from_email_account_id,
        label_names: toArr(input.label_names),
        status: input.status,
      }),
    });
    return { contacts: body.contacts ?? [], skipped_contact_ids: body.skipped_contact_ids ?? [] };
  },
};

export default sequenceAddContacts;
