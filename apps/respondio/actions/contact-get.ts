import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `GET /contact/{identifier}` — `ContactClient.get` in the official SDK.
 * Answers the `Contact` object directly (no envelope).
 */
interface Input {
  identifier: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Look up a contact by id, email, or phone.",
  params: [
    {
      key: "identifier",
      label: "Contact identifier",
      type: "string",
      required: true,
      hint: 'One of "id:123", "email:user@example.com", or "phone:+60123456789".',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "email", type: "string", label: "Email" },
    { key: "language", type: "string", label: "Language" },
    { key: "profilePic", type: "string", label: "Profile picture URL" },
    { key: "countryCode", type: "string", label: "Country code" },
    { key: "custom_fields", type: "array", label: "Custom fields" },
    { key: "status", type: "string", label: "Conversation status" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "assignee", type: "object", label: "Assignee" },
    { key: "lifecycle", type: "string", label: "Lifecycle stage" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).get(`/contact/${identifier}`);
  },
};

export default contactGet;
