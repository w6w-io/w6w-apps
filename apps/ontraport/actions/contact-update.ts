import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OntraportClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `PUT /1/Contacts` — update an existing contact.
 *
 * Either `id` or `uniqueId` is required; `id` takes precedence when both are
 * sent. Only the fields supplied are changed.
 */
interface Input {
  id?: string;
  uniqueId?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  companyName?: string;
  officePhone?: string;
  extraFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update an existing contact by ID or unique ID. Only supplied fields change.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", hint: "Either ID or Unique ID is required." },
    { key: "uniqueId", label: "Unique ID", type: "string", advanced: true },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "companyName", label: "Company", type: "string", advanced: true },
    { key: "officePhone", label: "Office phone", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated fields" }],

  execute(input, ctx) {
    if (!input.id && !input.uniqueId) {
      throw new Error("Either Contact ID or Unique ID is required to update a contact.");
    }
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    return new OntraportClient(ctx).data("/Contacts", {
      method: "PUT",
      form: compact({
        id: input.id,
        unique_id: input.id ? undefined : input.uniqueId,
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email,
        company: input.companyName,
        office_phone: input.officePhone,
        ...(extra ?? {}),
      }),
    });
  },
};

export default contactUpdate;
