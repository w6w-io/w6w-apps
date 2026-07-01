import type { ActionDefinition } from "@w6w/types";

/**
 * Create or update a contact. Maps camelCase params to SendGrid's snake_case
 * body (`first_name`, `address_line_1`, `custom_fields`, …). Optionally adds
 * the contact to one or more lists via `list_ids`.
 * Wraps `PUT /v3/marketing/contacts`.
 */
const action: ActionDefinition = {
  key: "contact-upsert",
  type: "perform",
  resource: "contact",
  title: "Create or update a contact",
  description: "Create a new contact, or update the current one if it already exists (upsert)",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      hint: "Primary email for the contact",
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "addressUi",
          label: "Address",
          type: "group",
          default: {},
          children: [
            { key: "address1", label: "Address Line 1", type: "string", default: "" },
            { key: "address2", label: "Address Line 2", type: "string", default: "" },
          ],
        },
        { key: "alternateEmails", label: "Alternate Emails", type: "string", default: "" },
        { key: "city", label: "City", type: "string", default: "" },
        { key: "country", label: "Country", type: "string", default: "" },
        { key: "firstName", label: "First Name", type: "string", default: "" },
        { key: "lastName", label: "Last Name", type: "string", default: "" },
        { key: "postalCode", label: "Postal Code", type: "string", default: "" },
        { key: "stateProvinceRegion", label: "State/Province/Region", type: "string", default: "" },
        {
          key: "listIds",
          label: "List IDs",
          type: "multiselect",
          default: [],
          hint: "IDs of lists this contact should be added to",
        },
        {
          key: "customFields",
          label: "Custom Fields",
          type: "group",
          default: {},
          hint: "Custom field key/value pairs",
          children: [
            { key: "fieldId", label: "Field ID", type: "string", default: "" },
            { key: "fieldValue", label: "Field Value", type: "string", default: "" },
          ],
        },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const add = (p.additionalFields ?? {}) as Record<string, unknown>;
    const contact: Record<string, unknown> = { email };

    const address = (add.addressUi ?? {}) as Record<string, unknown>;
    if (address.address1) contact.address_line_1 = String(address.address1);
    if (address.address2) contact.address_line_2 = String(address.address2);

    if (add.city) contact.city = String(add.city);
    if (add.country) contact.country = String(add.country);
    if (add.firstName) contact.first_name = String(add.firstName);
    if (add.lastName) contact.last_name = String(add.lastName);
    if (add.postalCode) contact.postal_code = String(add.postalCode);
    if (add.stateProvinceRegion) contact.state_province_region = String(add.stateProvinceRegion);

    if (typeof add.alternateEmails === "string" && add.alternateEmails.length) {
      const alts = add.alternateEmails.split(",").map((s) => s.trim()).filter(Boolean);
      if (alts.length) contact.alternate_emails = alts;
    }

    const customFieldsRaw = add.customFields;
    if (customFieldsRaw) {
      const rows = Array.isArray(customFieldsRaw) ? customFieldsRaw : [customFieldsRaw];
      const custom: Record<string, unknown> = {};
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        if (r && r.fieldId) custom[String(r.fieldId)] = r.fieldValue;
      }
      if (Object.keys(custom).length) contact.custom_fields = custom;
    }

    const body: Record<string, unknown> = { contacts: [contact] };
    const listIdsRaw = add.listIds;
    if (Array.isArray(listIdsRaw) && listIdsRaw.length) {
      body.list_ids = listIdsRaw.map((v) => String(v));
    }

    ctx.log("info", "upserting SendGrid contact", { email });

    const res = await ctx.fetch("https://api.sendgrid.com/v3/marketing/contacts", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SendGrid /v3/marketing/contacts returned ${res.status}: ${errText}`);
    }

    return await res.json();
  },
};

export default action;
