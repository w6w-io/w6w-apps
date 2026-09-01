import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/contacts` — browse contacts, or look one up by exact email or
 * LinkedIn URL. Requires `contacts:read`.
 */
interface Input {
  top?: number;
  skip?: number;
  email?: string;
  linkedIn?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "Browse contacts, or look one up by exact email or LinkedIn profile URL.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact match." },
    {
      key: "linkedIn",
      label: "LinkedIn profile URL",
      type: "string",
      hint: "Exact match.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "hasMore", type: "boolean", label: "Whether more contacts exist past this page" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).list("/contacts", {
      query: { top: input.top, skip: input.skip, email: input.email, linkedIn: input.linkedIn },
    });
  },
};

export default contactList;
