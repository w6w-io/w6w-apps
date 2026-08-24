import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single Contact resource by id.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "registeredAt", type: "string", label: "Registered at" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "sourceURL", type: "string", label: "Source URL" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
    { key: "bounced", type: "boolean", label: "Bounced" },
    { key: "needsConfirmation", type: "boolean", label: "Needs confirmation" },
    { key: "fields", type: "array", label: "Custom fields" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(`/api/contacts/${encodeURIComponent(input.id)}`);
  },
};

export default contactGet;
