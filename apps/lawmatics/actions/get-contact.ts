import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";

interface Input {
  contactId: string;
  fields?: string;
}

/** `GET /v1/contacts/:contact_id` — a single Contact by id. */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single Contact by id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        'Comma-separated attribute/relationship names, or "all". Leave blank for the default set.',
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Contact attributes" },
    { key: "relationships", type: "object", label: "Related records" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>(
      `/contacts/${encodeURIComponent(input.contactId)}`,
      { query: { fields: input.fields } },
    );
    return res.data;
  },
};

export default getContact;
