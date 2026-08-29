import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/** `GET /contacts/{contactIds}` — one or more contacts (users/groups) by ID. */
interface Input {
  contactIds: string | string[];
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contacts by ID",
  description: "Fetch one or more contacts (users or groups) by ID.",
  params: [
    {
      key: "contactIds",
      label: "Contact ID(s)",
      type: "string",
      required: true,
      hint: "One contact ID, or several comma-separated.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(`/contacts/${joinIds(input.contactIds)}`);
    return { items };
  },
};

export default contactGet;
