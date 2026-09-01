import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ReplyClient } from "../lib/client.ts";
import { companySizeRequestOptions, contactIdParam } from "../lib/params.ts";

/**
 * `PATCH /v3/contacts/{id}` — change specific fields on a contact. Omitted
 * fields stay as they are; `null` clears one. Requires `contacts:write`.
 *
 * Idempotent: re-applying the same patch produces the same record.
 *
 * **`customFields` here is shaped differently from `contact-create`'s.**
 * Reply's OpenAPI document says so explicitly: create/read use `{key, value}`;
 * this PATCH model accepts `{id, name, value}` instead — a field can be
 * identified by its numeric id OR its name, but never by `key`.
 */
interface Input {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedInUrl?: string;
  notes?: string;
  isOptedOut?: boolean;
  callStatus?: string;
  meetingStatus?: string;
  ownerUserId?: number;
  accountId?: number;
  customFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Change specific fields on a contact without resending the whole record.",
  idempotent: true,
  params: [
    contactIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "company", label: "Company", type: "string" },
    {
      key: "companySize",
      label: "Company size",
      type: "select",
      options: companySizeRequestOptions,
      hint:
        'Spelled PascalCase on write (e.g. "SelfEmployed") — Reply reads it back lowerCamelCase.',
    },
    { key: "industry", label: "Industry", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State/province", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "linkedInUrl", label: "LinkedIn profile URL", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "isOptedOut",
      label: "Opted out",
      type: "boolean",
    },
    {
      key: "callStatus",
      label: "Call status",
      type: "select",
      options: [
        { value: "none", label: "None (clears it)" },
        { value: "toCall", label: "To call" },
        { value: "called", label: "Called" },
      ],
    },
    {
      key: "meetingStatus",
      label: "Meeting status",
      type: "select",
      options: [
        { value: "none", label: "None (clears it)" },
        { value: "meetingBooked", label: "Meeting booked" },
      ],
    },
    { key: "ownerUserId", label: "Owner user ID", type: "number" },
    { key: "accountId", label: "Account ID", type: "number" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Array of `{"id": <field id>, "value": "<text>"}` or `{"name": "<field name>", ' +
        '"value": "<text>"}` — NOT `{"key": ...}` (that shape is create/read only).',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const body = compact({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      title: input.title,
      company: input.company,
      companySize: input.companySize,
      industry: input.industry,
      city: input.city,
      state: input.state,
      country: input.country,
      linkedInUrl: input.linkedInUrl,
      notes: input.notes,
      isOptedOut: input.isOptedOut,
      callStatus: input.callStatus,
      meetingStatus: input.meetingStatus,
      ownerUserId: input.ownerUserId,
      accountId: input.accountId,
      customFields: asOptionalJson(input.customFields, "Custom fields"),
    });
    return new ReplyClient(ctx).json(`/contacts/${input.id}`, { method: "PATCH", body });
  },
};

export default contactUpdate;
