import type { ActionDefinition } from "@w6w/types";
import { KommoClient } from "../lib/client.ts";

interface Input {
  id: number;
  withEmbed?: string[];
}

interface Output {
  contact: unknown;
}

/** `GET /api/v4/contacts/{id}` — verified against `get-contact`. */
const contactGet: ActionDefinition<Input, Output> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get a Contact",
  description: "Read a single contact by ID.",
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
    {
      key: "withEmbed",
      label: "Embed",
      type: "multiselect",
      options: [
        { value: "leads", label: "Leads" },
        { value: "catalog_elements", label: "Catalog elements" },
      ],
      hint: "Adds this related data to the response.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "The contact" }],

  async execute(input, ctx) {
    const contact = await new KommoClient(ctx).request(`/contacts/${input.id}`, {
      query: { with: input.withEmbed?.length ? input.withEmbed.join(",") : undefined },
    });
    return { contact };
  },
};

export default contactGet;
