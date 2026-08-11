import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact, encodeId } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  information?: string;
}

/**
 * `POST /v1/contacts/:id` — update a shared Contact's scalar fields.
 *
 * **It is a POST, not a PUT**, and Aircall flags this itself: "This request is a
 * POST method, and not a PUT method!" Every other update in this API (Tag,
 * Webhook, Number) is a PUT, so this is the one that gets written wrong.
 *
 * It also updates **only** the four scalar fields. Phone numbers and emails have
 * their own add/update/delete endpoints — "To update a Contact's phone numbers
 * or emails, please use the appropriate endpoints described below" — which this
 * app does not expose today; see the README.
 *
 * A field that is present must not be blank ("Can't be blank if defined"), so
 * empty values are dropped rather than sent as `""`. Clearing a field is
 * therefore not expressible, which is the API's constraint, not this action's.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a shared Contact's name, company or information. Phone numbers and emails have their " +
    "own endpoints and are not touched here.",
  // Safe to retry: this sets named fields to given values, so replaying it
  // reaches the same state. It is not a merge of list fields and creates
  // nothing.
  idempotent: true,
  params: [
    contactIdParam,
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "companyName", label: "Company", type: "string" },
    {
      key: "information",
      label: "Information",
      type: "text",
      hint:
        "Blank values are dropped, not sent — Aircall rejects a field that is defined but empty.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "company_name", type: "string", label: "Company" },
  ],

  async execute(input, ctx) {
    const body = compact({
      first_name: input.firstName,
      last_name: input.lastName,
      company_name: input.companyName,
      information: input.information,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Update Contact needs at least one field to change");
    }
    const client = new AircallClient(ctx);
    return await client.entity(`/contacts/${encodeId(input.contactId)}`, "contact", {
      // POST, not PUT. See the module comment.
      method: "POST",
      body,
    });
  },
};

export default contactUpdate;
