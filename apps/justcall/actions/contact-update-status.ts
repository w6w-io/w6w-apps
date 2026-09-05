import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient, toList } from "../lib/client.ts";
import { CONTACT_LISTS } from "../lib/params.ts";

/**
 * `PUT /v2.1/contacts/status` — verified against `update_contact_status_v21`'s
 * OpenAPI fragment, 2026-09-05.
 *
 * Adds and/or removes a contact from JustCall's DND (Do Not Disturb), DNM (Do
 * Not Market) and Blacklist lists — separate from `contact-update`, which does
 * not touch these.
 */
interface Input {
  id?: number;
  contact_number?: string;
  across_team?: boolean;
  add_to?: string[] | string;
  remove_from?: string[] | string;
}

const contactUpdateStatus: ActionDefinition<Input> = {
  key: "contact-update-status",
  type: "perform",
  resource: "contact",
  title: "Update Contact Status",
  description: "Add and/or remove a contact from the DND, DNM and Blacklist lists.",
  // Re-adding to or re-removing from a list is a no-op on JustCall's end.
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number" },
    { key: "contact_number", label: "Contact number", type: "string" },
    {
      key: "across_team",
      label: "Across team",
      type: "boolean",
      hint: "true: update for all agents. false (default): only the account owner.",
    },
    {
      key: "add_to",
      label: "Add to",
      type: "multiselect",
      options: CONTACT_LISTS.map((v) => ({ label: v, value: v })),
    },
    {
      key: "remove_from",
      label: "Remove from",
      type: "multiselect",
      options: CONTACT_LISTS.map((v) => ({ label: v, value: v })),
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "contact_number", type: "string", label: "Contact number" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/contacts/status", {
      method: "PUT",
      body: compact({
        id: input.id,
        contact_number: input.contact_number,
        across_team: input.across_team,
        add_to: toList(input.add_to),
        remove_from: toList(input.remove_from),
      }),
    });
  },
};

export default contactUpdateStatus;
