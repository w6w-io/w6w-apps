import type { ActionDefinition } from "@w6w/types";

/**
 * Fetch a single contact by ID or email.
 * ID: `GET /v3/marketing/contacts/{id}`
 * Email: `POST /v3/marketing/contacts/search` with an SGQL query.
 */
const action: ActionDefinition = {
  key: "contact-get",
  type: "perform",
  resource: "contact",
  title: "Get a contact",
  description: "Get a contact by ID or email",
  params: [
    {
      key: "by",
      label: "By",
      type: "select",
      required: true,
      default: "id",
      hint: "Search the contact by ID or email",
      options: [
        { value: "id", label: "ID" },
        { value: "email", label: "Email" },
      ],
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      default: "",
      hint: "ID of the contact",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "Email of the contact",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const by = String(p.by ?? "id");

    let url: string;
    let method: string;
    let body: string | undefined;
    const headers: Record<string, string> = {};

    if (by === "id") {
      const contactId = String(p.contactId ?? "").trim();
      if (!contactId) throw new Error("`contactId` is required when searching by ID");
      url = `https://api.sendgrid.com/v3/marketing/contacts/${encodeURIComponent(contactId)}`;
      method = "GET";
    } else {
      const email = String(p.email ?? "").trim();
      if (!email) throw new Error("`email` is required when searching by email");
      url = "https://api.sendgrid.com/v3/marketing/contacts/search";
      method = "POST";
      body = JSON.stringify({ query: `email LIKE '${email}' ` });
      headers["content-type"] = "application/json";
    }

    ctx.log("info", "fetching SendGrid contact", { by });

    const res = await ctx.fetch(url, { method, headers, body });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid contact lookup returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    // Search returns { result: [...] }; ID lookup returns the contact directly.
    const result = Array.isArray(data.result) ? data.result[0] : (data.result ?? data);
    return result;
  },
};

export default action;
