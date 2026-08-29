import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/**
 * `POST /emailer_campaigns/remove_or_stop_contact_ids` — change contacts' status across
 * one or more sequences at once: mark finished, remove entirely, or stop progress.
 */
interface Input {
  emailer_campaign_ids: string[] | string;
  contact_ids: string[] | string;
  mode: "mark_as_finished" | "remove" | "stop";
}

function toArr(v: string[] | string): string[] {
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const sequenceRemoveContacts: ActionDefinition<Input> = {
  key: "sequence-remove-contacts",
  type: "perform",
  resource: "sequence",
  title: "Update Contact Sequence Status",
  description: "Mark contacts finished, remove them, or stop their progress across one or more " +
    "sequences.",
  // The end state (finished/removed/stopped) is the same however many times this runs.
  idempotent: true,
  params: [
    {
      key: "emailer_campaign_ids",
      label: "Sequences",
      type: "string",
      required: true,
      hint: "Comma-separated Apollo sequence IDs.",
    },
    {
      key: "contact_ids",
      label: "Contacts",
      type: "string",
      required: true,
      hint: "Comma-separated Apollo contact IDs.",
    },
    {
      key: "mode",
      label: "Action",
      type: "select",
      required: true,
      options: [
        { value: "mark_as_finished", label: "Mark as finished" },
        { value: "remove", label: "Remove from sequence" },
        { value: "stop", label: "Stop progress" },
      ],
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "The affected contacts" },
    { key: "num_contacts", type: "number", label: "Number of contacts affected" },
  ],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ contacts?: unknown[]; num_contacts?: number }>(
      "/emailer_campaigns/remove_or_stop_contact_ids",
      {
        query: {
          emailer_campaign_ids: toArr(input.emailer_campaign_ids),
          contact_ids: toArr(input.contact_ids),
          mode: input.mode,
        },
      },
    );
    return { contacts: body.contacts ?? [], num_contacts: body.num_contacts ?? 0 };
  },
};

export default sequenceRemoveContacts;
