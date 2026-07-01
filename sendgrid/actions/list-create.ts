import type { ActionDefinition } from "@w6w/types";

/**
 * Create a new Marketing Campaigns list.
 * Wraps `POST /v3/marketing/lists`.
 */
const action: ActionDefinition = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create a list",
  description: "Create a list",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Name of the list",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating SendGrid list", { name });

    const res = await ctx.fetch("https://api.sendgrid.com/v3/marketing/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/marketing/lists returned ${res.status}: ${errText}`);
    }

    return await res.json();
  },
};

export default action;
