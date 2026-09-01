import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single contact by ID.",
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new SellClient(ctx).get(`/contacts/${encodeURIComponent(String(input.id))}`);
  },
};

export default contactGet;
