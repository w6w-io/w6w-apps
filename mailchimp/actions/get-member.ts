import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";
import { subscriberHash } from "../lib/subscriber-hash.ts";

interface Input {
  listId: string;
  email: string;
  fields?: string;
  excludeFields?: string;
}

const getMember: ActionDefinition<Input> = {
  key: "get-member",
  type: "read",
  resource: "member",
  title: "Get Member",
  description: "Fetch a single subscriber by email address.",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "fields", label: "Fields (comma-separated)", type: "string" },
    { key: "excludeFields", label: "Exclude fields (comma-separated)", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const hash = subscriberHash(input.email);
    return client.request(`/lists/${input.listId}/members/${hash}`, {
      query: {
        fields: input.fields,
        exclude_fields: input.excludeFields,
      },
    });
  },
};

export default getMember;
