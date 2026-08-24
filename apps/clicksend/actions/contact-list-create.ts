import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient } from "../lib/client.ts";

interface Input {
  listName: string;
}

interface ContactListResponse {
  list_id?: number;
  list_name?: string;
  list_email_id?: string;
  _contacts_count?: number;
}

/** `POST /lists` — create a new Contact List. */
const contactListCreate: ActionDefinition<Input> = {
  key: "contact-list-create",
  type: "perform",
  idempotent: false,
  resource: "contact-list",
  title: "Create Contact List",
  description: "Create a new Contact List (POST /lists).",
  params: [{ key: "listName", label: "List name", type: "string", required: true }],
  output: [
    { key: "listId", type: "number", label: "List ID" },
    { key: "listName", type: "string", label: "List name" },
    { key: "contactsCount", type: "number", label: "Contacts in list" },
  ],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const data = await client.data<ContactListResponse>("/lists", {
      method: "POST",
      body: { list_name: input.listName },
    });
    return {
      listId: data.list_id,
      listName: data.list_name,
      contactsCount: data._contacts_count,
    };
  },
};

export default contactListCreate;
