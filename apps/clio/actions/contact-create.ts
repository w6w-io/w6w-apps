import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact } from "../lib/client.ts";
import { contactTypeOptions, fieldsParam } from "../lib/params.ts";

/**
 * `POST /contacts.json` — the OpenAPI document's create schema requires
 * `name` and `type` for BOTH Person and Company contacts. `first_name` /
 * `last_name` are separate, optional convenience fields on a Person; sending
 * only those without `name` fails validation, per the schema's own
 * `required` array (verified 2026-08-24) — this app follows that literal
 * requirement rather than the vendor's prose "Contact Name" reference page,
 * which is a client-rendered page this app could not read structurally. Set
 * `name` explicitly for a Person too (e.g. "Jane Doe"), even though Clio's UI
 * composes it from first/last name for you.
 *
 * **`primary_email_address` / `primary_phone_number` are read-only.** They
 * appear on a GET response as flat, derived strings, but the create/update
 * schema has no field of either name — email and phone are written as
 * `email_addresses[]` / `phone_numbers[]` arrays of `{name, address|number,
 * default_email|default_number}`, and the "primary" flat fields are Clio's
 * own projection of whichever array entry has `default_email`/
 * `default_number` set. Writing a single address/number here sets it as the
 * default automatically, which is what makes it show up as "primary" on the
 * next read.
 */
interface Input {
  type: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fields?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new person or company contact.",
  idempotent: false,
  params: [
    { key: "type", label: "Type", type: "select", options: contactTypeOptions, required: true },
    {
      key: "name",
      label: "Full name",
      type: "string",
      required: true,
      hint: "Required by Clio regardless of type — the person's full name, or the company's name.",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      hint: "Person contacts only. Does not by itself satisfy the Full name requirement above.",
    },
    { key: "lastName", label: "Last name", type: "string", hint: "Person contacts only." },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Written as the default entry of the email_addresses list — see this file's own " +
        'doc comment for why there is no plain "primary email" field to set.',
    },
    { key: "phone", label: "Phone", type: "string", hint: "Written as the default phone number." },
    fieldsParam("id,etag,name,type,primary_email_address,primary_phone_number"),
  ],
  output: [{ key: "data", type: "object", label: "The created contact" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/contacts.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        type: input.type,
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        email_addresses: input.email ? [{ address: input.email, default_email: true }] : undefined,
        phone_numbers: input.phone ? [{ number: input.phone, default_number: true }] : undefined,
      }),
    });
  },
};

export default contactCreate;
