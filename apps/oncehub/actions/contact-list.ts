import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  email?: string;
  creationTimeGt?: string;
  creationTimeLt?: string;
  lastUpdatedTimeGt?: string;
  lastUpdatedTimeLt?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /contacts — cursor-paginated. */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List all contacts in the account (GET /contacts).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "Contacts" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "creationTimeGt", label: "Created after", type: "string", advanced: true },
    { key: "creationTimeLt", label: "Created before", type: "string", advanced: true },
    { key: "lastUpdatedTimeGt", label: "Last updated after", type: "string", advanced: true },
    { key: "lastUpdatedTimeLt", label: "Last updated before", type: "string", advanced: true },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/contacts", {
      query: {
        email: input.email,
        "creation_time.gt": input.creationTimeGt,
        "creation_time.lt": input.creationTimeLt,
        "last_updated_time.gt": input.lastUpdatedTimeGt,
        "last_updated_time.lt": input.lastUpdatedTimeLt,
        before: input.before,
        after: input.after,
        limit: input.limit,
      },
    });
  },
};

export default contactList;
