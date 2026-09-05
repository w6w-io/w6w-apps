import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OntraportClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /1/Contacts` — create a new contact.
 *
 * This endpoint allows duplicates. To avoid creating a second contact for the
 * same email, use `contact-merge` instead.
 */
interface Input {
  firstname?: string;
  lastname?: string;
  email?: string;
  companyName?: string;
  officePhone?: string;
  extraFields?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact. Allows duplicate emails — use Merge or Create Contact " +
    "to avoid duplicates.",
  idempotent: false,
  params: [
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "companyName", label: "Company", type: "string", advanced: true },
    { key: "officePhone", label: "Office phone", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    return new OntraportClient(ctx).data("/Contacts", {
      form: compact({
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

export default contactCreate;
