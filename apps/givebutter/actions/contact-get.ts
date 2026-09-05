import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by its numeric id.",
  params: [numericIdParam("Contact")],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "primary_email", type: "string", label: "Primary email" },
    { key: "primary_phone", type: "string", label: "Primary phone" },
    { key: "tags", type: "string", label: "Tags" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/contacts/${encodeURIComponent(input.id)}`);
  },
};

export default contactGet;
