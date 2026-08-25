import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { asOptionalJson, toList } from "../lib/params.ts";

interface Input {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  assignedToEmail?: string;
  sendblueNumber?: string;
  tags?: string[] | string;
  customVariables?: unknown;
  optOut?: boolean;
}

/**
 * `PUT /api/v2/contacts/{phone_number}`. `custom_variables` is MERGED with the
 * existing map (not replaced) — the vendor's own docs say so explicitly, so
 * this is not a way to remove a variable. `opt_out` here updates the SAME
 * recipient record inbound keyword opt-outs write to; `contact-opt-out.ts`
 * exists as a dedicated action for the common case of toggling just this
 * field.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact. custom_variables merges into the existing map; it does not " +
    "replace it.",
  idempotent: true,
  params: [
    { key: "phoneNumber", label: "Phone number", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "assignedToEmail", label: "Assigned to (email)", type: "string" },
    { key: "sendblueNumber", label: "Sendblue number to send with", type: "string" },
    { key: "tags", label: "Tags", type: "multiselect" },
    {
      key: "customVariables",
      label: "Custom variables (JSON, merged)",
      type: "json",
    },
    {
      key: "optOut",
      label: "Opted out",
      type: "boolean",
      advanced: true,
      hint: "Updates the same recipient record inbound keyword opt-outs write to.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.put(
      `/api/v2/contacts/${encodeURIComponent(input.phoneNumber)}`,
      compact({
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        assigned_to_email: input.assignedToEmail,
        sendblue_number: input.sendblueNumber,
        tags: toList(input.tags),
        custom_variables: asOptionalJson(input.customVariables, "customVariables"),
        opt_out: input.optOut,
      }),
    );
  },
};

export default contactUpdate;
