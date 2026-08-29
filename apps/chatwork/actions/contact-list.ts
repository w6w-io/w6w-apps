import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";

/**
 * `GET /contacts` — every contact of the connected account.
 *
 * Documents a `204 No Content` for the empty case; {@link ChatworkClient.list}
 * normalises that to `[]`.
 */
const contactList: ActionDefinition<Record<string, never>> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List every contact of the connected account.",
  params: [],
  output: [
    { key: "account_id", type: "number", label: "Account ID" },
    { key: "room_id", type: "number", label: "Direct-chat room ID" },
    { key: "name", type: "string", label: "Display name" },
    { key: "chatwork_id", type: "string", label: "Chatwork ID" },
    { key: "organization_id", type: "number", label: "Organization ID" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "department", type: "string", label: "Department" },
    { key: "avatar_image_url", type: "string", label: "Avatar image URL" },
  ],

  execute(_input, ctx) {
    return new ChatworkClient(ctx).list("/contacts");
  },
};

export default contactList;
