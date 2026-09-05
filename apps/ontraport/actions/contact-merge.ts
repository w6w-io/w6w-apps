import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OntraportClient } from "../lib/client.ts";
import { extraFieldsParam } from "../lib/params.ts";

/**
 * `POST /1/Contacts/saveorupdate` — create a contact, or merge into the
 * existing one matched by email (or `uniqueId`), whichever applies.
 *
 * This is the endpoint to use instead of `contact-create` whenever the
 * workflow should not produce duplicate contacts for the same email.
 */
interface Input {
  email?: string;
  uniqueId?: string;
  ignoreBlanks?: boolean;
  firstname?: string;
  lastname?: string;
  companyName?: string;
  officePhone?: string;
  extraFields?: unknown;
}

const contactMerge: ActionDefinition<Input> = {
  key: "contact-merge",
  type: "perform",
  resource: "contact",
  title: "Merge or Create Contact",
  description: "Update the contact matching the given email (or unique ID), or create a new " +
    "one if no match exists.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", hint: "Matched against existing contacts." },
    {
      key: "uniqueId",
      label: "Unique ID",
      type: "string",
      advanced: true,
      hint: "Takes precedence over Email when both are sent.",
    },
    {
      key: "ignoreBlanks",
      label: "Ignore blank values",
      type: "boolean",
      advanced: true,
      hint: "Off by default, matching the API: a blank string overwrites the existing value. " +
        "Does not apply to 0 or false.",
    },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "companyName", label: "Company", type: "string", advanced: true },
    { key: "officePhone", label: "Office phone", type: "string", advanced: true },
    extraFieldsParam,
  ],
  output: [{ key: "data", type: "object", label: "The merged/created fields" }],

  execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    return new OntraportClient(ctx).data("/Contacts/saveorupdate", {
      form: compact({
        email: input.email,
        unique_id: input.uniqueId,
        ignore_blanks: input.ignoreBlanks ? "1" : undefined,
        firstname: input.firstname,
        lastname: input.lastname,
        company: input.companyName,
        office_phone: input.officePhone,
        ...(extra ?? {}),
      }),
    });
  },
};

export default contactMerge;
