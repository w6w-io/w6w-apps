import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  NutshellClient,
  type NutshellEntity,
  parseJsonObject,
  VALUES_PARAM,
} from "../lib/client.ts";

interface Input {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  accountId?: string | number;
  values?: unknown;
}

/**
 * `newContact(contact)` — create a Contact (person).
 *
 * Nutshell will NOT create a totally empty Contact: "you must include a
 * name, phone number, or email address." `name` may also be a structured
 * `{salutation, givenName, familyName}` object per the reference — expressed
 * here only as a plain string for the common case; use Additional fields
 * for the structured form.
 */
const createContact: ActionDefinition<Input, NutshellEntity> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new Contact (person). Nutshell requires at least a name, phone, or " +
    "email — a totally empty Contact is rejected.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "phone",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated phone numbers.",
    },
    { key: "email", label: "Emails", type: "string", hint: "Comma-separated email addresses." },
    { key: "description", label: "Description", type: "text" },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Associates this Contact with an existing Account (company).",
    },
    { ...VALUES_PARAM },
  ],
  output: [
    { key: "id", type: "number", label: "New Contact ID" },
    { key: "rev", type: "string", label: "Rev (needed to later update this Contact)" },
  ],

  execute(input, ctx) {
    const contact = {
      ...compact({ name: input.name, description: input.description }),
      ...(input.phone
        ? { phone: input.phone.split(",").map((p) => p.trim()).filter(Boolean) }
        : {}),
      ...(input.email
        ? { email: input.email.split(",").map((e) => e.trim()).filter(Boolean) }
        : {}),
      ...(input.accountId ? { accounts: [{ id: input.accountId }] } : {}),
      ...parseJsonObject(input.values, "Additional fields"),
    };

    return new NutshellClient(ctx).call<NutshellEntity>("newContact", { contact });
  },
};

export default createContact;
