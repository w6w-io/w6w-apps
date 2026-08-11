import type { ActionDefinition } from "@w6w/types";
import { GetResponseClient } from "../lib/client.ts";

/** `GET /contacts/{contactId}` — one contact. */
interface Input {
  contactId: string;
  fields?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by its GetResponse id.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "From List Contacts. To look one up by email address, use that action instead.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated. Returns only these fields.",
    },
  ],
  output: [{ key: "contactId", type: "string", label: "Contact id" }],

  execute(input, ctx) {
    return new GetResponseClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}`,
      { query: { fields: input.fields } },
    );
  },
};

export default contactGet;
