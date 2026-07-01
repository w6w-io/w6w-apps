import type { ActionDefinition } from "@w6w/types";

/**
 * Rename a Marketing Campaigns list.
 * Wraps `PATCH /v3/marketing/lists/{id}`.
 */
const action: ActionDefinition = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Update a list",
  description: "Rename a list",
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
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "New name of the list",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = String(p.listId ?? "").trim();
    const name = String(p.name ?? "").trim();
    if (!listId) throw new Error("`listId` is required");
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "updating SendGrid list", { listId, name });

    const url = `https://api.sendgrid.com/v3/marketing/lists/${encodeURIComponent(listId)}`;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid list update returned ${res.status}: ${errText}`);
    }

    return await res.json();
  },
};

export default action;
