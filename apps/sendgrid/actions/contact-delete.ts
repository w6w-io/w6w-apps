import type { ActionDefinition } from "@w6w/types";

/**
 * Delete one or more contacts, or every contact in the account.
 * Wraps SendGrid `DELETE /v3/marketing/contacts`.
 */
const action: ActionDefinition = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete a contact",
  description: "Delete one or more contacts, optionally all contacts",
  params: [
    {
      key: "ids",
      label: "Contact IDs",
      type: "string",
      default: "",
      hint: "ID of the contact. Multiple can be added separated by comma.",
    },
    {
      key: "deleteAll",
      label: "Delete All",
      type: "boolean",
      default: false,
      hint: "Whether all contacts will be deleted",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deleteAll = p.deleteAll === true;
    const ids = String(p.ids ?? "").replace(/\s/g, "");

    const qs = new URLSearchParams();
    if (deleteAll) qs.set("delete_all_contacts", "true");
    if (ids) qs.set("ids", ids);

    const url = `https://api.sendgrid.com/v3/marketing/contacts${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    ctx.log("info", "deleting SendGrid contacts", { ids, deleteAll });

    const res = await ctx.fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/marketing/contacts returned ${res.status}: ${errText}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : { success: true };
  },
};

export default action;
