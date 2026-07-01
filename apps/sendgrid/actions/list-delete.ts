import type { ActionDefinition } from "@w6w/types";

/**
 * Delete a Marketing Campaigns list. Optionally also delete every contact on
 * that list.
 * Wraps `DELETE /v3/marketing/lists/{id}`.
 */
const action: ActionDefinition = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  title: "Delete a list",
  description: "Delete a list, optionally deleting its contacts",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      default: "",
      hint: "ID of the list",
    },
    {
      key: "deleteContacts",
      label: "Delete Contacts",
      type: "boolean",
      default: false,
      hint: "Whether to delete all contacts on the list",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = String(p.listId ?? "").trim();
    if (!listId) throw new Error("`listId` is required");

    const deleteContacts = p.deleteContacts === true;
    const qs = new URLSearchParams();
    qs.set("delete_contacts", deleteContacts ? "true" : "false");

    const url = `https://api.sendgrid.com/v3/marketing/lists/${
      encodeURIComponent(listId)
    }?${qs.toString()}`;

    ctx.log("info", "deleting SendGrid list", { listId, deleteContacts });

    const res = await ctx.fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid list delete returned ${res.status}: ${errText}`);
    }

    return { success: true };
  },
};

export default action;
