import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GetResponseClient } from "../lib/client.ts";

/**
 * `POST /contacts/{contactId}` — update a contact.
 *
 * Note the verb: **POST**, not PUT or PATCH. GetResponse uses POST for both
 * create and update across the API, which means the method tells you nothing
 * about which one you are doing — the presence of an id in the path does.
 *
 * It behaves as a partial update: only the fields present are applied, so this
 * action sends only what the caller filled in.
 *
 * Unlike create, this one answers **200** and returns the updated contact
 * synchronously.
 *
 * Idempotent: re-sending the same update converges on the same contact.
 */
interface Input {
  contactId: string;
  email?: string;
  name?: string;
  campaignId?: string;
  dayOfCycle?: number;
  customFieldValues?: unknown;
  scoring?: number;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact's details, or move them to another campaign. Only the fields you set are " +
    "changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "Setting this moves the contact to another campaign (list).",
    },
    {
      key: "dayOfCycle",
      label: "Day of cycle",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "customFieldValues",
      label: "Custom field values",
      type: "json",
      hint:
        'An array of `{"customFieldId": "…", "value": ["…"]}`. Replaces the values of the fields ' +
        "named; fields you omit are untouched.",
    },
    { key: "scoring", label: "Scoring", type: "number" },
  ],
  output: [{ key: "contactId", type: "string", label: "The updated contact" }],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}`,
      {
        method: "POST",
        body: compact({
          email: input.email,
          name: input.name,
          campaign: input.campaignId ? { campaignId: input.campaignId } : undefined,
          dayOfCycle: input.dayOfCycle,
          customFieldValues: asOptionalJson(input.customFieldValues, "Custom field values"),
          scoring: input.scoring,
        }),
      },
    );
  },
};

export default contactUpdate;
