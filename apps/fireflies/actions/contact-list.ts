import type { ActionDefinition } from "@w6w/types";
import { FirefliesClient } from "../lib/client.ts";

/** `contacts` takes no arguments and has no pagination in the documented API. */
const QUERY = `
  query Contacts {
    contacts {
      email
      name
      picture
      last_meeting_date
    }
  }
`;

const contactList: ActionDefinition<Record<string, never>> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List everyone the API key's owner has met with, and when they last met. No arguments — Fireflies returns the whole list.",
  params: [],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
  ],

  execute(_input, ctx) {
    return new FirefliesClient(ctx).query(QUERY);
  },
};

export default contactList;
