import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PATCH /contacts/{id}.json`. See `contact-create.ts` for why email/phone
 * are written as arrays rather than the flat `primary_*` fields a GET returns.
 */
interface Input {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fields?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing contact. Only the fields you set are changed.",
  idempotent: true,
  params: [
    idParam("Contact ID"),
    { key: "name", label: "Full name", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Replaces the default entry of email_addresses with this one.",
    },
    { key: "phone", label: "Phone", type: "string", hint: "Replaces the default phone number." },
    fieldsParam("id,etag,name,type,primary_email_address,primary_phone_number"),
  ],
  output: [{ key: "data", type: "object", label: "The updated contact" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/contacts/${input.id}.json`, {
      method: "PATCH",
      query: { fields: input.fields },
      body: compact({
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        email_addresses: input.email ? [{ address: input.email, default_email: true }] : undefined,
        phone_numbers: input.phone ? [{ number: input.phone, default_number: true }] : undefined,
      }),
    });
  },
};

export default contactUpdate;
