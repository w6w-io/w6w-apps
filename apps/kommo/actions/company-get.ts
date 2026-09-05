import type { ActionDefinition } from "@w6w/types";
import { KommoClient } from "../lib/client.ts";

interface Input {
  id: number;
  withEmbed?: string[];
}

interface Output {
  company: unknown;
}

/** `GET /api/v4/companies/{id}` — verified against `get-company`. */
const companyGet: ActionDefinition<Input, Output> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get a Company",
  description: "Read a single company by ID.",
  params: [
    { key: "id", label: "Company ID", type: "number", required: true },
    {
      key: "withEmbed",
      label: "Embed",
      type: "multiselect",
      options: [
        { value: "leads", label: "Leads" },
        { value: "contacts", label: "Contacts" },
        { value: "catalog_elements", label: "Catalog elements" },
      ],
      hint: "Adds this related data to the response.",
    },
  ],
  output: [{ key: "company", type: "object", label: "The company" }],

  async execute(input, ctx) {
    const company = await new KommoClient(ctx).request(`/companies/${input.id}`, {
      query: { with: input.withEmbed?.length ? input.withEmbed.join(",") : undefined },
    });
    return { company };
  },
};

export default companyGet;
