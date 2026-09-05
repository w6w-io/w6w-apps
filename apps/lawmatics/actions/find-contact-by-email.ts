import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";

interface Input {
  email: string;
}

/**
 * `GET /v1/contacts/find_by_email/:email_address` — the vendor's dedicated
 * lookup rather than a `filter_by=email` list call, matching the docs'
 * "Contact Finders" folder.
 */
const findContactByEmail: ActionDefinition<Input> = {
  key: "find-contact-by-email",
  type: "search",
  resource: "contact",
  title: "Find Contact by Email",
  description: "Look up a Contact by exact email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Contact attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>(
      `/contacts/find_by_email/${encodeURIComponent(input.email)}`,
    );
    return res.data;
  },
};

export default findContactByEmail;
