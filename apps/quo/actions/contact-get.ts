import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/contacts/{id}` — get a contact by its unique identifier. */
interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Get a contact by its unique identifier.",
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The contact's unique identifier.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Contact (id, externalId, source, sourceUrl, defaultFields, customFields, " +
        "createdAt, updatedAt, createdByUserId)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/contacts/${encodeURIComponent(input.id)}`);
  },
};

export default contactGet;
