import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact } from "../lib/client.ts";

interface ContactChannel {
  label?: string;
  value?: string;
}

interface Input {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  information?: string;
  phoneNumbers: ContactChannel[] | string;
  emails?: ContactChannel[] | string;
}

/**
 * `POST /v1/contacts` — create a shared Contact. Answers **201**.
 *
 * `phone_numbers` is mandatory and each entry needs **both** a `label` and a
 * `value`; so does each email. Aircall caps each list at 20 entries and returns
 * 400 beyond that. Every Contact created here is shared across the company —
 * that is not configurable through the API.
 *
 * The `information` field is free text and is where an external system's own id
 * belongs; Aircall's own example writes `"external_custom_id:87123"` into it.
 * There is no dedicated external-id field and no upsert.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a shared Contact with at least one phone number. Every Contact created via the API is " +
    "shared company-wide.",
  // The vendor states the failure mode outright: "Duplicate calls to
  // POST /v1/contacts with the same payload will create duplicate contacts."
  // There is no idempotency key and no upsert, so a retry after an ambiguous
  // failure leaves two Contacts.
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "companyName", label: "Company", type: "string" },
    {
      key: "information",
      label: "Information",
      type: "text",
      hint:
        "Free text. This is the only place to keep a foreign key — Aircall's own example stores " +
        "`external_custom_id:87123` here. There is no dedicated external-ID field.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "label", label: "Label", type: "string", required: true, placeholder: "Work" },
          {
            key: "value",
            label: "Number",
            type: "string",
            required: true,
            placeholder: "+19001112222",
          },
        ],
      },
      hint: "At least one is required. Both label and value must be set on each. Maximum 20.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "label", label: "Label", type: "string", required: true, placeholder: "Office" },
          { key: "value", label: "Email", type: "string", required: true },
        ],
      },
      hint: "Both label and value must be set on each. Maximum 20.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "phone_numbers", type: "array", label: "Stored numbers, each with its own id" },
    { key: "emails", type: "array", label: "Stored emails, each with its own id" },
  ],

  async execute(input, ctx) {
    const phoneNumbers = normalizeChannels(input.phoneNumbers, "Phone numbers");
    if (!phoneNumbers.length) {
      throw new Error("Create Contact needs at least one phone number with a label and a value");
    }
    const emails = normalizeChannels(input.emails, "Emails");

    const client = new AircallClient(ctx);
    return await client.entity("/contacts", "contact", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        company_name: input.companyName,
        information: input.information,
        phone_numbers: phoneNumbers,
        emails: emails.length ? emails : undefined,
      }),
    });
  },
};

export default contactCreate;

/**
 * Accept the channel lists as either structured rows or the JSON text a user
 * pasted, and reject a row missing either half here rather than letting Aircall
 * answer 400 with no indication of which row was wrong.
 */
function normalizeChannels(
  value: ContactChannel[] | string | undefined,
  label: string,
): ContactChannel[] {
  if (value === undefined || value === null || value === "") return [];
  let rows: unknown = value;
  if (typeof value === "string") {
    try {
      rows = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  if (!Array.isArray(rows)) throw new Error(`${label} must be a list`);
  return rows.map((row, i) => {
    const entry = row as ContactChannel;
    if (!entry?.label || !entry?.value) {
      throw new Error(`${label}[${i}] needs both a label and a value`);
    }
    return { label: String(entry.label), value: String(entry.value) };
  });
}
