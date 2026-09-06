import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client } from "../lib/client.ts";
import { CONFIRM_DELETE_PARAM, idParam } from "../lib/params.ts";

interface Input {
  id: number;
  confirm: boolean;
}

/**
 * `crm.contact.delete` — verified against
 * `api-reference/crm/contacts/crm-contact-delete.html`. DEPRECATED by the
 * vendor in favor of `crm.item.delete` (see `README.md`).
 *
 * Cascades to the contact's own history and linked-only objects. Gated
 * behind an explicit confirmation.
 */
const action: ActionDefinition<Input, { id: number; deleted: boolean }> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact and its history.",
  idempotent: true,
  params: [idParam("Contact"), CONFIRM_DELETE_PARAM],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");
    if (input.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a contact cannot be undone");
    }

    ctx.log("warn", "deleting a Bitrix24 contact", { id });
    const deleted = await new Bitrix24Client(ctx).call<boolean>("crm.contact.delete", { id });
    return { id, deleted };
  },
};

export default action;
