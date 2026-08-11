import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GetResponseClient, toList } from "../lib/client.ts";

/**
 * `POST /contacts` — add a contact to a campaign.
 *
 * ## It answers **202**, not 201, and the contact does not exist yet
 *
 * This is the thing to know about this endpoint. GetResponse's spec declares
 * `202` as the success response: the add is **queued**, not performed. There is
 * no contact id in the reply, and a List Contacts immediately afterwards may not
 * find it. A workflow that creates a contact and then reads it back has to
 * tolerate that gap — polling `contact-list` by email is the way, not assuming.
 *
 * A duplicate address is a `409`, so "create or update" is two calls: try this,
 * and on 409 look the contact up and use Update Contact.
 *
 * ## `campaign` is an object, not an id
 *
 * The field is `campaign: { campaignId }` — the spec types it as an object with
 * `campaignId`, `href` and `name`. Sending a bare string is a validation error.
 * This action takes the plain id and wraps it, so the shape cannot be got wrong.
 *
 * Not idempotent: GetResponse has no idempotency key, and a repeat is a 409
 * rather than a no-op.
 */
interface Input {
  email: string;
  campaignId: string;
  name?: string;
  dayOfCycle?: number;
  tags?: string[] | string;
  customFieldValues?: unknown;
  ipAddress?: string;
  scoring?: number;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Add a contact to a campaign. GetResponse queues the add and answers 202 — the contact may " +
    "not be readable immediately, and a duplicate address is a 409.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "The list to add them to. List Campaigns returns the ids.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "dayOfCycle",
      label: "Day of cycle",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Where to place them in the campaign's autoresponder cycle. 0 is the first day.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint:
        "Comma-separated tag **ids**, not names — List Tags returns them. Sending a name is a " +
        "validation error.",
    },
    {
      key: "customFieldValues",
      label: "Custom field values",
      type: "json",
      hint:
        'An array of `{"customFieldId": "…", "value": ["…"]}`. `value` is an array even for a ' +
        "single value. List Custom Fields returns the ids.",
    },
    {
      key: "ipAddress",
      label: "IP address",
      type: "string",
      hint:
        "The subscriber's IP, for consent records. Required by some GetResponse configurations.",
    },
    {
      key: "scoring",
      label: "Scoring",
      type: "number",
      hint: "Initial lead score.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "202 — queued. There is no contact id in the reply." },
  ],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request("/contacts", {
      method: "POST",
      body: compact({
        email: input.email,
        // The spec types this as an object; a bare id is rejected.
        campaign: { campaignId: input.campaignId },
        name: input.name,
        dayOfCycle: input.dayOfCycle,
        tags: toList(input.tags)?.map((tagId) => ({ tagId })),
        customFieldValues: asOptionalJson(input.customFieldValues, "Custom field values"),
        ipAddress: input.ipAddress,
        scoring: input.scoring,
      }),
    });
  },
};

export default contactCreate;
