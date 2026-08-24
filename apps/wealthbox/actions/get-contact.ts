import type { ActionDefinition } from "@w6w/types";
import { WealthboxClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

/** `GET /v1/contacts/{id}` — retrieve one Contact by id. */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single Contact by its id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "id", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`);
  },
};

export default getContact;
