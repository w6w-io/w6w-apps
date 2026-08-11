import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

/**
 * `PATCH /rest/v2/contacts/{contact_id}` — Update a Contact.
 *
 * ## This endpoint deletes data you did not mention, and `update_mask` is the
 * ## only thing that stops it
 *
 * Keap's own schema note, repeated on every collection property of
 * `CreateUpdateContactRequest` — `addresses`, `email_addresses`,
 * `phone_numbers`, `fax_numbers`, `social_accounts`, `custom_fields`:
 *
 *   "Any item not listed here will be removed if it already exists. If an empty
 *    array is specified, all existing values will be removed."
 *
 * So sending `{"email_addresses":[{"email":"new@x.com","field":"EMAIL1"}]}`
 * does not add an address — it makes that the *only* address, silently
 * discarding EMAIL2 and EMAIL3. `update_mask` narrows the blast radius: "If
 * set, only the provided properties will be updated and others will be
 * skipped."
 *
 * **So this action always sends one.** When the caller does not name the
 * properties explicitly, the mask is derived from the top-level keys actually
 * present in the request body — see {@link deriveUpdateMask}. That makes the
 * default behaviour "touch exactly what I filled in", which is what a partial
 * update is supposed to mean, and turns the destructive case into something a
 * caller has to ask for by name.
 *
 * Note this cannot rescue the *within*-property case: naming `email_addresses`
 * in the mask still replaces the whole list. Read the contact first and send
 * the full list back if you mean to add one.
 */
interface Input {
  contactId: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  emailField?: string;
  phone?: string;
  phoneField?: string;
  companyId?: string;
  jobTitle?: string;
  ownerId?: string;
  contactType?: string;
  customFields?: unknown;
  extra?: unknown;
  updateMask?: string;
  fields?: string;
}

/**
 * The properties this request actually sets, in the order Keap names them.
 *
 * Exported because it is the safety mechanism, not a formatting detail: an
 * empty derivation would send no mask and re-open the destructive path, so a
 * caller who supplies only a contact id is refused rather than defaulted.
 */
export function deriveUpdateMask(body: Record<string, unknown>): string[] {
  return Object.keys(body);
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  title: "Update Contact",
  resource: "contact",
  description:
    "Update a contact. Only the properties you fill in are touched — an update mask is always " +
    "sent, because Keap otherwise clears collection properties you omit.",
  // Re-sending the same PATCH produces the same contact, so a retry after a
  // dropped connection is safe.
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "givenName", label: "First name", type: "string" },
    { key: "familyName", label: "Last name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      row: "email",
      hint: "Replaces the contact's whole email list with this single address. Read the contact " +
        "first if you mean to add one.",
    },
    {
      key: "emailField",
      label: "Email slot",
      type: "select",
      row: "email",
      default: "EMAIL1",
      options: [
        { value: "EMAIL1", label: "EMAIL1 (primary)" },
        { value: "EMAIL2", label: "EMAIL2" },
        { value: "EMAIL3", label: "EMAIL3" },
      ],
    },
    { key: "phone", label: "Phone", type: "string", row: "phone" },
    {
      key: "phoneField",
      label: "Phone slot",
      type: "select",
      row: "phone",
      default: "PHONE1",
      options: [
        { value: "PHONE1", label: "PHONE1 (primary)" },
        { value: "PHONE2", label: "PHONE2" },
        { value: "PHONE3", label: "PHONE3" },
        { value: "PHONE4", label: "PHONE4" },
        { value: "PHONE5", label: "PHONE5" },
      ],
    },
    { key: "companyId", label: "Company ID", type: "string", advanced: true },
    { key: "jobTitle", label: "Job title", type: "string", advanced: true },
    { key: "ownerId", label: "Owner user ID", type: "string", advanced: true },
    { key: "contactType", label: "Contact type", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}`. Sending this replaces every custom field ' +
        "value; an empty array resets them all to their defaults.",
    },
    {
      key: "extra",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint: "Merged into the request body and added to the update mask automatically.",
    },
    {
      key: "updateMask",
      label: "Update mask",
      type: "string",
      advanced: true,
      placeholder: "given_name,job_title",
      hint: "Comma-separated list of properties Keap may touch. Leave empty and it is derived " +
        "from the properties you filled in, which is almost always what you want.",
    },
    { key: "fields", label: "Fields to return", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "update_time", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    const customFields = asOptionalJson<unknown[]>(input.customFields, "Custom fields");
    const extra = asOptionalJson<Record<string, unknown>>(input.extra, "Additional properties");

    const body = compact({
      given_name: input.givenName,
      family_name: input.familyName,
      email_addresses: input.email
        ? [{ email: input.email, field: input.emailField || "EMAIL1" }]
        : undefined,
      phone_numbers: input.phone
        ? [{ number: input.phone, field: input.phoneField || "PHONE1" }]
        : undefined,
      custom_fields: customFields,
      company: input.companyId ? { id: input.companyId } : undefined,
      job_title: input.jobTitle,
      owner_id: input.ownerId,
      contact_type: input.contactType,
      ...(extra ?? {}),
    });

    const mask = input.updateMask
      ? input.updateMask.split(",").map((s) => s.trim()).filter(Boolean)
      : deriveUpdateMask(body);

    if (mask.length === 0) {
      throw new Error(
        "Nothing to update: fill in at least one property, or name one explicitly in the update " +
          "mask. Sending an empty PATCH without a mask would let Keap clear the contact's " +
          "collection properties.",
      );
    }

    const client = new KeapClient(ctx);
    return client.json(`${V2}/contacts/${encodeId(input.contactId)}`, {
      method: "PATCH",
      // A repeated key, not a comma-joined one: `update_mask`'s enum members
      // are bare property names. See `QueryValue` in lib/client.ts.
      query: { update_mask: mask, fields: input.fields },
      body,
    });
  },
};

export default contactUpdate;
